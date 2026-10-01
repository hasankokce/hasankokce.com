CREATE TABLE newsletter_subscribers(email TEXT PRIMARY KEY,status TEXT NOT NULL,token_hash TEXT NOT NULL,expires INTEGER NOT NULL,created_at TEXT NOT NULL,confirmed_at TEXT,requested_at INTEGER NOT NULL,consent TEXT NOT NULL);
CREATE TABLE newsletters(id TEXT PRIMARY KEY,subject TEXT NOT NULL,body TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'draft',created_at TEXT NOT NULL);
CREATE TABLE newsletter_deliveries(campaign TEXT NOT NULL,email TEXT NOT NULL,status TEXT NOT NULL,updated_at TEXT NOT NULL,PRIMARY KEY(campaign,email));
CREATE TABLE newsletter_unsubscribe(token_hash TEXT PRIMARY KEY,email TEXT NOT NULL);
