# Hasan Kökçe — teknoloji ve içerik sitesi

Next.js, React ve TypeScript ile geliştirilen; Node.js 24 ve SQLite kullanan web sitesi.

## Özellikler

- Yazılar, prompt kütüphanesi, araç kutusu ve ürünler
- İçerik, görsel, sayfa metni ve görünüm yönetimi
- Taslaklar, sürümler ve zamanlanmış yayınlar
- İçerik istatistikleri ve CSV raporları
- E-posta bülteni ve marka tasarımlı e-postalar
- SEO ayarları, site haritası ve yapılandırılmış veriler

## Yerel çalıştırma

Node.js 24.14 veya üzeri bir 24.x sürümü gerekir.

```sh
npm ci
cp .env.example .env
npm run admin:password
```

`.env` içinde `ADMIN_PASSWORD_HASH` ve en az 32 karakterlik rastgele `SESSION_SECRET` tanımlayın. Yerel kullanımda `SITE_ORIGIN=http://localhost:3000` ayarlayın.

```sh
npm run build
npm start
```

Yönetim paneli `/admin` adresindedir. E-posta gönderimi için SMTP ayarlarını sunucuda tanımlayın.

## Doğrulama

```sh
npm run build
npm run test:analytics
```

İstatistik testi ayrı geçici veritabanı kullanır ve e-posta göndermez.

## Yayın ve veri kalıcılığı

Kalıcı disk destekli Node.js sunucusu gerekir. `DATA_DIR` içindeki SQLite veritabanını ve yüklenen görselleri güncellemeler sırasında koruyun; düzenli yedekleyin. Şema güncellemeleri otomatik uygulanır. Ayrıntılar için [TESLIM.md](TESLIM.md).

`.env`, şifreler, yerel veritabanları, aboneler ve istatistik verileri Git deposuna dahil edilmez. Depodaki `content/` dosyaları başlangıç içerikleridir; canlı veritabanı yedeği değildir.
