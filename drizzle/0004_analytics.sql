CREATE TABLE analytics_content(kind TEXT NOT NULL,content_id TEXT NOT NULL,title TEXT NOT NULL,path TEXT NOT NULL,status TEXT NOT NULL,PRIMARY KEY(kind,content_id));
CREATE TABLE analytics_daily(day TEXT NOT NULL,kind TEXT NOT NULL,content_id TEXT NOT NULL,event TEXT NOT NULL,source TEXT NOT NULL,device TEXT NOT NULL,total INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,kind,content_id,event,source,device));
CREATE INDEX analytics_daily_content ON analytics_daily(kind,content_id,day);
CREATE TABLE analytics_receipts(ticket TEXT NOT NULL,kind TEXT NOT NULL,content_id TEXT NOT NULL,event TEXT NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(ticket,kind,content_id,event));
CREATE INDEX analytics_receipts_expiry ON analytics_receipts(created_at);
CREATE TABLE analytics_meta(id TEXT PRIMARY KEY,value TEXT NOT NULL);
INSERT INTO analytics_meta VALUES ('installed_at',strftime('%Y-%m-%dT%H:%M:%fZ','now'));

UPDATE settings SET data=json_set(data,'$.privacy',COALESCE(json_extract(data,'$.privacy'),'')||'

## Site içi içerik istatistikleri
Yazı ve prompt görüntülenmeleri, prompt kopyalama ve ürün/araç kartı gösterimleri ile bağlantı tıklamaları kendi sunucumuzda toplu istatistiklere dönüştürülür. Çerez veya kalıcı ziyaretçi kimliği kullanılmaz; tam IP adresi, tam yönlendiren adres veya arama terimleri istatistik veritabanına kaydedilmez. Genel trafik kaynağı ve cihaz türü tutulur. Aynı sayfa yüklemesinden gelen tekrarları önlemek için rastgele bir sayfa anahtarı en fazla 72 saatlik pencere için tutulur; süresi geçen kayıtlar sonraki ölçüm isteğinde temizlenir. Günlük toplu sayımlar saklanır. Do Not Track ve Global Privacy Control tercihleri dikkate alınır. Yönetici oturumları ölçülmez. Hosting sunucusunun erişim günlükleri bu ölçüm sisteminden ayrıdır.') WHERE id='site' AND instr(COALESCE(json_extract(data,'$.privacy'),''),'Site içi içerik istatistikleri')=0;
