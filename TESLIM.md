# Hasan Kökçe — bağımsız hosting paketi

Bu sürüm Node.js 24 üzerinde Next.js + SQLite ile çalışır. PHP-only/public_html hosting paketi değildir. Cloudflare D1, R2 veya ChatGPT oturumu gerektirmez. Kurulum sihirbazı yoktur.

## İçerik
- Admin paneli, yazılar, promptlar, site metinleri, marka ve sayfa düzeni, SEO ve reklam ayarları.
- E-posta ve şifre ile yönetici girişi; HttpOnly oturum, süre sınırı, giriş denemesi sınırı ve aynı-kaynak kontrolü.
- SQLite veritabanı ve yüklenen görseller `DATA_DIR` altında kalıcı tutulur. Bu dizin webden erişilebilir bir dizine taşınmamalıdır.
- Dört hazırlanmış yazı, on prompt, yerel teslim ayarları ve public/images görselleri başlangıç içeriğidir. Veritabanı ilk açılışta oluşturulur; sonraki ayarlar başlangıç içeriğinin üstüne yazılmaz.
- Mevcut canlı site veritabanının tam yedeği değildir. Canlı taslak geçmişi veya canlı panelde sonradan yapılmış farklı düzenlemelerin eksiksiz aktarımı bu pakette doğrulanmamıştır. Canlı ortam değiştirilmemiştir. Özel mesaj ve test verileri dahil edilmemiştir.

## Sunucuya verilecek bilgiler
- Çalışma ortamı: Node.js 24.14 veya üzeri 24.x, tek uygulama örneği, kalıcı yazılabilir disk.
- Hazırlama komutları: `npm ci`, `npm run build`.
- Başlatma: `npm start`; giriş noktası `scripts/start.mjs`.
- Alternatif: verilen Dockerfile, Linux ortamında paketi derleyip çalıştırır.
- HTTPS sağlayan bir ters vekil gerekir. İstek boyutu sınırı 6 MB olarak ayarlanabilir. `TRUST_PROXY=1` yalnızca güvenilen vekil X-Forwarded-For başlığını kendisi yeniden yazıyorsa kullanılmalıdır; varsayılan 0'dır.
- `SITE_ORIGIN`: gerçek HTTPS alan adı; sonda / bulunmaz. Değişince uygulama yeniden başlatılır. Sitemap ve robots çalışma anında doğru alan adını kullanır.
- `ADMIN_EMAIL`: yönetici e-postası.
- `ADMIN_PASSWORD_HASH`: scrypt şifre özeti (salt:hash). `npm run admin:password --silent` komutu şifreyi standart girdiden alır; şifreyi ekrana veya kaynak koduna yazmaz.
- `SESSION_SECRET`: en az 32 karakterli rastgele gizli değer.
- `DATA_DIR`: kalıcı verilerin tam dizin yolu. `PORT`: uygulama portu.

`.env.example` boş gizli alanlarla teslim edilmiştir. Varsayılan yönetici şifresi yoktur. Eksik gizli ayarlarla üretim başlatması durdurulur. `.env` ve data dizini ZIP paylaşımına veya herkese açık dizine eklenmemelidir.

## Yayın ve veri davranışı
Zamanı gelen planlanmış yazılar ilk site isteğinde yayınlanır; dakika hassasiyetinde bağımsız bir cron görevi bu sürümde yoktur. Tek sunucu/tek uygulama örneği içindir. Yedek için uygulama durdurulup DATA_DIR dizini bütün olarak alınabilir. Kod güncellenirken DATA_DIR korunur. Alan adı sahipliği, SSL, DNS, Search Console ve AdSense hesabı dış hizmet ayarlarıdır.

## Doğrulama sonucu — 18 Eylül 2026
Node.js 24.14.1 üzerinde bağımsız npm ci ve üretim derlemesi geçti. Yönetici girişi, sahte platform kimlik başlıklarının reddi, CSRF, ayar kaydı, dosya yükleme/okuma, taslak-yayın-arşiv işlemleri ve public sayfalar test edildi. Üretim bağımlılıkları npm audit kontrolünde bildirilen açık bulunmadı. Docker imajı ayrıca çalıştırılmadı; hosting firmanın özel paneli test edilmedi.

Arşivde `.next` üretim derlemesi vardır. Hedef sunucuda bağımlılıklar kurulduktan sonra yeniden derlemeden `npm start` kullanılabilir; farklı platform gereksinimlerinde kaynak üzerinden yeniden derleme yapılabilir. Gizli ortam değerleri kullanıcıya/hostinge özeldir ve boş bırakılmıştır.

## E-posta bülteni — 18 Eylül 2026
Admin > E-posta bülteni: abonelik alanının başlık/açıklama/butonu ve görünürlüğü, abone listesi, abonelik durdurma, bülten taslağı, içerik önizlemesi, yönetici adresine test gönderimi ve onaylı abonelere beşerli gönderim.

Hostinger Email varsayılanları `.env.example` içinde: smtp.hostinger.com, SSL 465, info@hasankokce.com. SMTP_PASSWORD posta hesabının parolasıdır; yalnızca sunucudaki gizli ortam değişkenine yazılır. Gerçek parola pakette bulunmaz. Farklı Hostinger posta ürünü kullanılıyorsa hPanel Connect Apps & Devices değerleri esas alınır. SMTP bilgileri yokken form açıkça hizmetin henüz etkin olmadığını bildirir.

Aboneler 24 saat geçerli bağlantıyı açıp düğmeye basarak onay verir. Gönderim sırasında abonelik durumu tekrar kontrol edilir. Her mesajda ayrılma bağlantısı ve List-Unsubscribe başlıkları vardır. Bağlantının yalnızca açılması abonelik durumunu değiştirmez. Ham HTML kabul edilmez, metin güvenli biçimde e-posta şablonuna alınır.

Gönderim otomatik haftalık bir cron değildir: her hafta içerik hazırlanıp panelden gönderilir. Beşli grupları panelden ilerletmek gerekir. SMTP kabulü gelen kutusuna ulaşma garantisi değildir. Sonucu belirsiz/kesintiye uğramış gönderimler otomatik tekrar gönderilmez; posta kayıtları kontrol edilmelidir. Bounce/şikâyet işleme ve açılma takibi yoktur. Hostinger'ın hesap özelindeki limitleri hPanel'den kontrol edilir; büyük listeler için özel bülten hizmetine geçiş gerekir.

Node.js 24.14.1 üretim derlemesi ve gerçek TLS kullanan yerel sahte SMTP testi geçti: onaysız abonelik, doğrulama, test e-postası, kampanya gönderimi, tekrar gönderim engeli, ayrılma ve yönetici/CSRF kontrolleri. Hiçbir gerçek adrese e-posta gönderilmedi. Hostinger hesabı bağlantısı ve DNS doğrulaması yapılmadı. Bu paket Node.js ve kalıcı SQLite diski gerektirir; yalnızca PHP/statik dosya yükleme alanına kopyalamak yeterli değildir.

### Markalı e-posta şablonu
Bülten ve abonelik doğrulama e-postaları aynı markalı HTML şablonunu kullanır. Logo/monogram, marka adı, vurgu rengi ve sosyal bağlantılar site ayarlarından alınır. Özel logo URL'si alıcıların erişebildiği bir HTTPS görsel olmalıdır; PNG/JPEG önerilir. Logo tanımlı değilse sitedeki monogram gösterilir. Admin önizlemesi gönderimle aynı şablonu kullanır; ## başlık, boş satır paragraf, HTTPS bağlantıları tıklanabilir bağlantı oluşturur. E-posta istemcileri görselleri engelleyebilir; marka adı metin olarak da bulunur. Tarayıcı görsel kontrolü ve yerel TLS SMTP testi yapıldı; Gmail/Outlook gerçek gelen kutusu testi yapılmadı.

## İçerik istatistikleri — 21 Eylül 2026
Admin > İstatistikler (`/admin#analytics`) yazı ve prompt detay görüntülenmelerini, 30 saniyelik görünür sekme etkileşimini, yazıda %75 ilerlemeyi, başarılı prompt kopyalamalarını, ürün/araç kartı gösterimlerini ve bağlantı tıklamalarını gösterir. Tarih aralığı (en fazla 366 gün), önceki eşit dönem, içerik türü, arama/sıralama, günlük grafik, trafik kaynağı, cihaz dağılımı ve CSV raporu mevcuttur. Görüntülenmeler tekil kişi değildir; sayfa ve kart sayımları ayrı gösterilir.

İçerik türü + kalıcı kimlik esas alınır. Yeni içerik otomatik izlenir ve sıfır görüntülenmeyle rapora girer. Başlık veya slug düzenlemesi geçmişi sıfırlamaz. Silinen veya arşivlenen içeriklerin istatistik geçmişi korunur. Silip yeniden oluşturulan ya da kopyalanan içerik yeni kimlikle ayrı ölçülür. Mevcut içerik kimliklerini elle değiştirmeyin.

Veriler DATA_DIR/site.sqlite içindeki analytics_* tablolarında saklanır. Güncellemede DATA_DIR ve gizli ortam değişkenlerini koruyun; yeni ZIP veri klasörü içermez. Uygulamayı durdurup DATA_DIR klasörünün tamamını yedekleyin, kodu güncelleyip aynı DATA_DIR ile başlatın. 0004_analytics.sql ilk açılışta bir kez atomik uygulanır. Eski kayıtları sıfırlayan reset işlemi yoktur. Tek Node uygulaması + kalıcı disk gerekir; çoklu sunucu/sunucusuz geçici dosya sistemi için bu SQLite sürümü uygun değildir.

Sayfa bileti sunucuda imzalanır; tekrar bildirimler benzersiz veritabanı anahtarı ve atomik işlemle tek sayılır. Biletler 48 saat geçerlidir. Tekrar kontrol kayıtları 72 saatlik pencere dışında ilk sonraki ölçüm isteğinde temizlenir, günlük toplu veriler tutulur. Tarihler Europe/Istanbul (+03:00) günlerine göre hesaplanır; aksiyonlar görüntülenme gününe bağlanır. Yalnızca aktif içerik ve izin verilen olay türleri kabul edilir. Yönetici, bilinen bot ve DNT/GPC istekleri sayılmaz. Çerez/kalıcı ziyaretçi kimliği, tam IP, ham referrer veya arama sorgusu saklanmaz. JavaScript/izleme engelleyicilerinden veya gelişmiş botlardan kaynaklı sapmalar olabilir. Görünür süre aktif okuma kanıtı, tıklama da satın alma kanıtı değildir.

Ölçüm bu sürümün yayına alınmasıyla başlar; geçmiş görüntülenmeler geriye dönük oluşturulamaz. Yeni ve mevcut gizlilik metnine ölçüm açıklaması eklenir. Gerçek kişi/oturum ölçümü, coğrafi konum, gelir, satış dönüşümü veya harici GA4/Search Console bağlantısı bu modüle dahil değildir.

Doğrulama: üretim derlemesi; `npm run test:analytics` ile izole geçici DB üzerinde yeni içerik, 16 eşzamanlı yinelenen kayıt, imzalı bilet, yetki/CSRF, DNT/GPC/bot hariç tutma, kopyalama, kart tıklaması, yeniden adlandırma, kaldırılan içerik geçmişi, tarih aralığı, CSV ve yeniden başlatmada veri korunması testleri. Safari'de gerçek görüntülenme, panoya kopyalama ve kart görünürlüğü kayıtları ayrıca doğrulandı; panel görünümü kontrol edildi. Test verileri teslim paketine eklenmez.

## Portre ve hafif görsel iyileştirmeler — 21 Eylül 2026
Kullanıcının yeni fotoğrafı Hakkımda ve ana sayfa imzasında kullanılır. Orijinal kişi yeniden üretilmedi; yalnızca WebP sıkıştırma/boyutlandırma yapıldı. Beyaz fon sayfa zeminine CSS multiply ile karıştırılır; bu gerçek alfa dekupe değildir ve çok koyu zeminlerde uygun görünmeyebilir. Varsayılan #f7f8f5 zeminde Safari görsel kontrolü yapıldı. 160/480/800/1120 genişlikli türevler sırasıyla yaklaşık 2,6/12,3/26,6/42,5 KB. Mobil/masaüstü srcSet seçimi ve sabit en-boy oranı mevcut.

Marka ve tasarım > Hafif ışık ve hareket efektleri üzerinden açılıp kapatılabilir. Efektler tek seferlik 0,48/0,9 saniye giriş, hover transform/opacity ve statik renk geçişlerinden oluşur. Ek animasyon kütüphanesi, video veya animasyon zamanlayıcısı yoktur. Reduced-motion tercihi desteklenir. Yeni 0005 migration mevcut kayıtlı profil fotoğrafını bir kez yeni fotoğrafa geçirir; sonrasında fotoğraf admin üzerinden değiştirilebilir. Node üretim derlemesi, mevcut istatistik entegrasyon testleri, admin efekt aç/kapa kaydı ve Safari portre görünümü kontrol edildi. Canlı hosting üzerinde Lighthouse/Core Web Vitals testi yapılmadı.
