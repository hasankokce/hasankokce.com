CREATE TABLE IF NOT EXISTS translations (
  kind TEXT NOT NULL,
  item_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  data TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL,
  PRIMARY KEY (kind, item_id, lang)
);
