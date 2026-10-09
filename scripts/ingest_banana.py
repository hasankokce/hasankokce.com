#!/usr/bin/env python3
import os
import re
import sys
import json
import sqlite3
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "site.sqlite")
IMAGES_DIR = os.path.join(BASE_DIR, "public", "images")
JSON_PATH = os.path.join(BASE_DIR, "scripts", "banana_prompts.json")

os.makedirs(IMAGES_DIR, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def replace_site_mentions(text):
    if not text:
        return ""
    replacements = [
        (r'https?://(?:www\.)?bananaprompts\.org/?', 'https://hasankokce.com/'),
        (r'https?://(?:www\.)?prompteg\.com/?', 'https://hasankokce.com/'),
        (r'\bbananaprompts\.org\b', 'hasankokce.com'),
        (r'\bprompteg\.com\b', 'hasankokce.com'),
        (r'\bBanana\s*Prompts\b', 'hasankokce.com'),
        (r'\bbananaprompts\b', 'hasankokce.com'),
        (r'\bPrompteg\b', 'hasankokce.com'),
        (r'\bprompteg\b', 'hasankokce.com'),
        (r'@NanoBanana_labs', '@hasankokce'),
        (r'\bNanoBanana\b', 'hasankokce'),
        (r'\bnanobanana\b', 'hasankokce'),
    ]
    for pattern, repl in replacements:
        text = re.sub(pattern, repl, text, flags=re.IGNORECASE)
    return text

import urllib.parse

def download_image(url, dest_path):
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        return True
    try:
        parts = urllib.parse.urlsplit(url)
        quoted_path = urllib.parse.quote(parts.path)
        clean_url = urllib.parse.urlunsplit((parts.scheme, parts.netloc, quoted_path, parts.query, parts.fragment))
        req = urllib.request.Request(clean_url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=20) as resp:
            data = resp.read()
        if len(data) > 500:
            with open(dest_path, "wb") as f:
                f.write(data)
            return True
    except Exception as e:
        print(f"Failed to download {url}: {e}", file=sys.stderr)
    return False

def main():
    print("=== BANANAPROMTS INGESTION & DATABASE SYNC ===")
    print(f"Base Directory: {BASE_DIR}")
    print(f"Database Path: {DB_PATH}")

    if not os.path.exists(JSON_PATH):
        print(f"Error: {JSON_PATH} not found!", file=sys.stderr)
        sys.exit(1)

    with open(JSON_PATH, "r", encoding="utf-8") as f:
        new_prompts_raw = json.load(f)

    print(f"Loaded {len(new_prompts_raw)} Banana prompts to ingest.")

    # 1. Download images concurrently
    print("1. Downloading images to public/images/ ...")
    success_items = []
    
    def handle_item(item):
        remote_url = item.get("_remote_img_url")
        local_img = item.get("image")
        filename = os.path.basename(local_img)
        dest_path = os.path.join(IMAGES_DIR, filename)

        ok = download_image(remote_url, dest_path)
        if ok:
            clean_item = dict(item)
            clean_item.pop("_remote_img_url", None)
            clean_item["title"] = replace_site_mentions(clean_item["title"])
            clean_item["description"] = replace_site_mentions(clean_item["description"])
            clean_item["prompt"] = replace_site_mentions(clean_item["prompt"])
            clean_item["notes"] = replace_site_mentions(clean_item.get("notes", ""))
            return clean_item
        else:
            print(f"Image download failed for {item['title']}: {remote_url}")
            return None

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(handle_item, it) for it in new_prompts_raw]
        for f in as_completed(futures):
            res = f.result()
            if res:
                success_items.append(res)

    print(f"Successfully downloaded images for {len(success_items)} prompts.")

    # 2. Update SQLite Database
    print(f"2. Updating database {DB_PATH} ...")
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM settings WHERE id = 'site'")
    row = cur.fetchone()
    if not row:
        print("Error: settings row with id='site' not found!", file=sys.stderr)
        sys.exit(1)

    site_settings = json.loads(row[0])
    existing_prompts = site_settings.get("prompts", [])
    print(f"Existing prompts in database: {len(existing_prompts)}")

    # Sanitize existing prompts as well (replace any site mentions)
    for p in existing_prompts:
        p["title"] = replace_site_mentions(p.get("title", ""))
        p["description"] = replace_site_mentions(p.get("description", ""))
        p["prompt"] = replace_site_mentions(p.get("prompt", ""))
        p["notes"] = replace_site_mentions(p.get("notes", ""))

    existing_slugs = set(p["slug"] for p in existing_prompts)
    existing_ids = set(p["id"] for p in existing_prompts)
    existing_prompts_text = set(p.get("prompt", "").strip() for p in existing_prompts)

    added_count = 0
    for p in success_items:
        prompt_txt = p.get("prompt", "").strip()
        if p["id"] in existing_ids or prompt_txt in existing_prompts_text or (p["slug"] in existing_slugs and f"{p['slug']}-bp" in existing_slugs):
            continue

        slug = p["slug"]
        if slug in existing_slugs:
            slug = f"{slug}-bp"
            p["slug"] = slug
        existing_slugs.add(slug)

        pid = p["id"]
        if pid in existing_ids:
            pid = f"{pid}-bp"
            p["id"] = pid
        existing_ids.add(pid)
        existing_prompts_text.add(prompt_txt)

        existing_prompts.append(p)
        added_count += 1

    print(f"Added {added_count} new Banana prompts. Total prompts now: {len(existing_prompts)}")
    site_settings["prompts"] = existing_prompts

    # Save to SQLite and flush WAL
    cur.execute("UPDATE settings SET data = ? WHERE id = 'site'", (json.dumps(site_settings, ensure_ascii=False),))
    conn.commit()

    # Flush WAL so that site.sqlite file is completely up-to-date and self-contained
    print("Flushing SQLite WAL checkpoint...")
    cur.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.commit()
    conn.close()

    print(f"Database successfully updated and WAL flushed! {len(existing_prompts)} prompts active.")
    print("=== BANANA INGESTION COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
