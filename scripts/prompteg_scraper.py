#!/usr/bin/env python3
import os
import re
import sys
import json
import sqlite3
import urllib.request
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "data", "site.sqlite")
IMAGES_DIR = os.path.join(BASE_DIR, "public", "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

CATEGORY_MAP = {
    "portraits": "Portre",
    "portreler": "Portre",
    "portrait": "Portre",
    "portre": "Portre",
    "realistic": "Gerçekçi",
    "gercekci": "Gerçekçi",
    "gerçekçi": "Gerçekçi",
    "cinematic": "Sinematik",
    "sinematik": "Sinematik",
    "3d": "3D",
    "drawing": "Çizim",
    "cizim": "Çizim",
    "çizim": "Çizim",
    "car": "Araba",
    "araba": "Araba",
    "art": "Sanat",
    "sanat": "Sanat",
    "animals": "Hayvanlar",
    "hayvanlar": "Hayvanlar",
    "products": "Ürün",
    "urun": "Ürün",
    "ürün": "Ürün",
    "tools": "Araçlar",
    "araclar": "Araçlar",
    "araçlar": "Araçlar",
    "video": "Instagram Videoları",
}

def fetch_url(url, timeout=15):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return resp.read()
    except Exception as e:
        print(f"Error fetching {url}: {e}", file=sys.stderr)
        return None

def slugify(text):
    tr_map = str.maketrans("çğıöşüÇĞİÖŞÜ", "cgiosuCGIOSU")
    text = text.translate(tr_map).lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text[:90]

def clean_title(title):
    if not title:
        return ""
    title = title.split(" | ")[0].split(" — ")[0].split(" - Prompteg")[0]
    title = re.sub(r"\s+Promptu$", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\s+Prompt$", "", title, flags=re.IGNORECASE)
    return title.strip()

def download_image(img_url, dest_path):
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 1000:
        return True
    data = fetch_url(img_url, timeout=20)
    if not data or len(data) < 500:
        return False
    try:
        with open(dest_path, "wb") as f:
            f.write(data)
        return True
    except Exception as e:
        print(f"Failed to save image {dest_path}: {e}", file=sys.stderr)
        return False

def parse_prompt_page(url):
    html_bytes = fetch_url(url)
    if not html_bytes:
        return None
    try:
        html = html_bytes.decode("utf-8", errors="replace")
    except Exception:
        return None

    # Title
    m_title = re.search(r"<meta\s+(?:property|name)=[\x27\"]og:title[\x27\"]\s+content=[\x27\"]([^\x27\"]+)[\x27\"]", html, re.I)
    if not m_title:
        m_title = re.search(r"<title>([^<]+)</title>", html, re.I)
    raw_title = m_title.group(1) if m_title else ""
    title = clean_title(raw_title)
    if not title:
        return None

    # Description
    m_desc = re.search(r"<meta\s+(?:property|name)=[\x27\"](?:og:description|description)[\x27\"]\s+content=[\x27\"]([^\x27\"]+)[\x27\"]", html, re.I)
    desc = m_desc.group(1).strip() if m_desc else ""

    # Parse JSON-LD
    img_url = None
    category = "Portre"
    tool = "Gemini / Midjourney / Flux.1"

    json_lds = re.findall(r"<script type=[\x27\"]application/ld\+json[\x27\"]>([\s\S]*?)</script>", html, re.I)
    for raw in json_lds:
        try:
            data = json.loads(raw)
            graph = data.get("@graph", [data])
            for item in graph:
                if item.get("@type") == "ImageObject":
                    img_url = item.get("contentUrl") or item.get("thumbnailUrl")
                if item.get("@type") == "BreadcrumbList":
                    elems = item.get("itemListElement", [])
                    if len(elems) >= 2:
                        cat_raw = elems[1].get("name", "").lower()
                        category = CATEGORY_MAP.get(cat_raw, category)
        except Exception:
            pass

    # Fallback image search
    if not img_url:
        m_og_img = re.search(r"<meta\s+(?:property|name)=[\x27\"]og:image[\x27\"]\s+content=[\x27\"]([^\x27\"]+)[\x27\"]", html, re.I)
        if m_og_img:
            img_url = m_og_img.group(1)
        else:
            m_img = re.search(r"src=[\x27\"](/uploads/[^\"\'\s]+\.(?:webp|png|jpg|jpeg))[\x27\"]", html, re.I)
            if m_img:
                img_url = "https://prompteg.com" + m_img.group(1)

    if not img_url:
        return None

    # Clean URL if relative
    if img_url.startswith("/"):
        img_url = "https://prompteg.com" + img_url

    # Guess category from URL or title if still default
    url_lower = url.lower()
    for k, v in CATEGORY_MAP.items():
        if f"/{k}/" in url_lower or f"-{k}-" in url_lower:
            category = v
            break

    # Build prompt string
    prompt_text = f"Masterpiece editorial photography of {desc if desc else title}. Highly detailed, photorealistic textures, atmospheric studio lighting, 8k resolution, vertical 4:5 framing, shot on 85mm f/1.4 lens, natural skin and material finish, clean background, ultra-sharp focus --ar 4:5 --style raw"

    # Build notes
    notes = (
        "1. Kendi fotoğrafınızla çalışmak için referans görsel ekleyip ana karakter tanımını referansınıza uyarlayın.\n"
        "2. Arka plan tonlarını, ışık rengini ve aksesuarları projenize göre özelleştirebilirsiniz.\n"
        "3. Midjourney v6.1, Flux.1 ve Gemini görsel üretim motorlarında en yüksek fotogerçekçi sonucu verir.\n"
        "4. Instagram ve sosyal medya paylaşımları için dikey 4:5 oranını kullanın."
    )

    url_slug = url.rstrip("/").split("/")[-1]
    url_slug = re.sub(r"-prompt$", "", url_slug)
    slug = slugify(url_slug)
    if not slug or len(slug) < 3:
        slug = slugify(title)

    return {
        "url": url,
        "title": title[:170],
        "description": desc[:950] if desc else f"{title} için optimize edilmiş yapay zeka promptu.",
        "category": category,
        "tool": tool,
        "slug": slug,
        "img_url": img_url,
        "prompt": prompt_text,
        "notes": notes,
    }

def main():
    print("=== PROMPTEG PROMPT SCRAPER & DATABASE SYNC ===")
    print(f"Base Directory: {BASE_DIR}")
    print(f"Database Path: {DB_PATH}")

    # 1. Fetch sitemap.xml
    print("1. Fetching https://prompteg.com/sitemap.xml ...")
    sitemap_bytes = fetch_url("https://prompteg.com/sitemap.xml", timeout=25)
    if not sitemap_bytes:
        print("Failed to fetch sitemap.xml. Aborting.", file=sys.stderr)
        sys.exit(1)

    sitemap_xml = sitemap_bytes.decode("utf-8", errors="replace")
    locs = re.findall(r"<loc>([^<]+)</loc>", sitemap_xml)
    print(f"Found {len(locs)} total URLs in sitemap.")

    # Filter Turkish prompt URLs
    tr_prompt_urls = [u for u in locs if "/tr/prompt/" in u]
    print(f"Found {len(tr_prompt_urls)} Turkish prompt URLs.")

    if not tr_prompt_urls:
        print("No Turkish prompt URLs found! Aborting.", file=sys.stderr)
        sys.exit(1)

    # 2. Select diverse prompts across categories
    # Target 80-120 prompts total
    selected_urls = tr_prompt_urls[:110]
    print(f"Selected {len(selected_urls)} prompts to fetch and process...")

    results = []
    with ThreadPoolExecutor(max_workers=8) as executor:
        future_to_url = {executor.submit(parse_prompt_page, url): url for url in selected_urls}
        for future in as_completed(future_to_url):
            data = future.result()
            if data:
                results.append(data)
                print(f"  [PARSED] {data['title']} ({data['category']})")

    print(f"\nSuccessfully parsed {len(results)} prompts.")

    # 3. Download images and convert/save to public/images/
    print("\n2. Downloading images to public/images/ ...")
    processed_prompts = []
    used_slugs = set()
    used_ids = set()

    for idx, p in enumerate(results):
        slug = p["slug"]
        if slug in used_slugs:
            slug = f"{slug}-{idx+1}"
        used_slugs.add(slug)

        pid = f"prompteg-{slug}"[:95]
        if pid in used_ids:
            pid = f"{pid}-{idx+1}"
        used_ids.add(pid)

        # Image filename
        ext = ".webp"
        if ".png" in p["img_url"].lower():
            ext = ".png"
        elif ".jpg" in p["img_url"].lower() or ".jpeg" in p["img_url"].lower():
            ext = ".jpg"

        img_filename = f"prompteg-{slug}{ext}"
        dest_path = os.path.join(IMAGES_DIR, img_filename)
        public_img_path = f"/images/{img_filename}"

        ok = download_image(p["img_url"], dest_path)
        if not ok:
            print(f"  [IMG FAIL] Could not download image for {p['title']}")
            continue

        prompt_item = {
            "id": pid,
            "slug": slug,
            "title": p["title"],
            "description": p["description"],
            "category": p["category"],
            "tool": p["tool"],
            "prompt": p["prompt"],
            "notes": p["notes"],
            "image": public_img_path,
            "imageAlt": f"{p['title']} - Yapay Zeka Prompt Görseli",
            "videoUrl": "",
            "visible": True,
        }
        processed_prompts.append(prompt_item)

    print(f"\nDownloaded and created {len(processed_prompts)} valid Prompteg prompts.")

    # 4. Add Instagram video prompts requested by the user
    video_prompts = [
        {
            "id": "video-upscale-4k",
            "slug": "bulanik-fotograflari-4k-yapma",
            "title": "Bulanık Fotoğrafları 4K Kalitesine Çıkartma Promptu",
            "description": "Instagram videomda paylaştığım; düşük çözünürlüklü ve grenli fotoğrafları pürüzsüz 4K stüdyo netliğine ulaştıran profesyonel restorasyon promptu.",
            "category": "Instagram Videoları",
            "tool": "Gemini / Flux.1 / Midjourney",
            "prompt": "Professional ultra-high resolution image restoration, photo upscaling to 8k 60fps quality. Sharpen blurry soft edges, recover realistic pore-level skin texture, enhance iris reflections, eliminate digital compression noise and chromatic aberration. Preserve authentic facial structure and natural hair strands without artificial plastic smoothing. Balanced cinematic studio rim lighting, clean color grade. Output format: pristine crystal clear ultra-sharp photograph.",
            "notes": "• Instagram videomdaki gibi: Önce netleştirmek istediğiniz fotoğrafı referans olarak ekleyin.\n• Yapay zekaya referansın ana hatlarını ve yüz oranlarını birebir korumasını belirtin.\n• Aşırı plastik veya yapay filtre hissi oluşursa 'eliminate plastic skin, keep raw natural pores' ifadesini ekleyin.\n• Hem eski fotoğraflarda hem de hareket bulanıklığı olan çekimlerde harika çalışır.",
            "image": "/images/prompt-upscale-4k.webp",
            "imageAlt": "Bulanık fotoğrafları 4K netliğine yükselten restorasyon örneği",
            "videoUrl": "https://www.instagram.com/hasankokce/",
            "visible": True
        },
        {
            "id": "video-face-consistency",
            "slug": "gemini-yuz-tutarliligi-saglama",
            "title": "Gemini Yüz Tutarlılığı ve Karakter Sabitleme Promptu",
            "description": "Farklı mekan, açı ve ışık koşullarında aynı yüz özelliklerini ve karakter kimliğini %100 korumayı sağlayan gelişmiş tutarlılık formülü.",
            "category": "Instagram Videoları",
            "tool": "Gemini 1.5 Pro / Flux LoRA / Midjourney",
            "prompt": "Consistent character face preservation, identity lock prompt. Master photograph of the exact same person from reference image, maintaining 100% facial geometry, bone structure, eye shape, nose contours, jawline and distinctive marks. Placed in a modern minimalist interior setting with warm volumetric window daylight. Authentic skin micro-textures, subtle expression, 85mm portrait photography, f/1.8 aperture, natural depth of field. Vertical 4:5 composition.",
            "notes": "• Instagram videomda anlattığım üzere: Gemini'de karakter sabitlemek için karakterin farklı açılardan 2-3 net fotoğrafını aynı sohbette referans verin.\n• 'Maintain exact facial geometry and unique features of reference image' cümlesi kritik öneme sahiptir.\n• Arka planı, kıyafeti veya pozisyonu değiştirirken yüz tanımını sabit tutun.\n• 4:5 veya 9:16 oranlarında tutarlı hikaye akışları üretmek için idealdir.",
            "image": "/images/prompt-face-consistency.webp",
            "imageAlt": "Gemini ile yüz tutarlılığı sağlanmış portre serisi örneği",
            "videoUrl": "https://www.instagram.com/hasankokce/",
            "visible": True
        }
    ]

    all_prompts = video_prompts + processed_prompts
    print(f"Total prompts to insert (including Instagram videos): {len(all_prompts)}")

    # 5. Pick 4 featured prompts for home view
    featured_candidates = [
        p["id"] for p in all_prompts if p["category"] in ["Instagram Videoları", "Portre", "Sinematik", "3D", "Gerçekçi"]
    ]
    featured_ids = featured_candidates[:4]
    print(f"Featured prompt IDs for homepage: {featured_ids}")

    # 6. Update SQLite Database
    print(f"\n3. Updating database {DB_PATH} ...")
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found!", file=sys.stderr)
        sys.exit(1)

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("SELECT data FROM settings WHERE id = 'site'")
    row = cur.fetchone()
    if not row:
        print("Error: settings row with id='site' not found!", file=sys.stderr)
        sys.exit(1)

    site_settings = json.loads(row[0])
    old_count = len(site_settings.get("prompts", []))
    print(f"Old prompt count in database: {old_count}")

    # Replace completely
    site_settings["prompts"] = all_prompts
    site_settings["featuredPromptIds"] = featured_ids

    # Update categories string in settings
    cats = sorted(list(set(p["category"] for p in all_prompts)))
    print(f"New categories in prompts: {cats}")

    cur.execute("UPDATE settings SET data = ? WHERE id = 'site'", (json.dumps(site_settings, ensure_ascii=False),))
    conn.commit()
    conn.close()

    print(f"Database successfully updated! {len(all_prompts)} prompts now live in site.sqlite.")
    print("=== SYNC COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    main()
