# Canlı site son kontrolü — 2 Ekim 2026

Değişiklikler https://hasankokce.com üzerinde yayımlandı. Mevcut içerik, ayarlar ve veritabanı korundu; yayın öncesi sunucu yedeği alındı.

| İstenen özellik | Son durum |
|---|---|
| 1. Gizlilik politikası | Mevcut sayfaya gerçek çerez ve veri işleme açıklamaları eklendi. |
| 2. Kullanım şartları | /kullanim-sartlari yayımlandı; admin üzerinden düzenlenebilir. |
| 3. Çerez onayı | Reddet, tercihleri kaydet, tümüne izin ver ve sonradan tercih değiştirme eklendi. Analitik/reklam başlangıçta kapalı. |
| 4. Net CTA | Yazıları keşfet ve iletişim yönlendirmeleri kontrol edildi; SSS iletişim çağrısı eklendi. |
| 5. Mobil | 390×844 görünüm, menü, SSS ve çerez paneli kontrol edildi; yatay taşma görülmedi. |
| 6. Formlar | Canlı iletişim mesajı kaydedildi ve yalnızca test kaydı temizlendi. Bülten SMTP ayarı bekliyor. |
| 7. Kırık bağlantılar | 25 sayfa ve 58 iç bağlantı/görsel tarandı. Cloudflare e-posta maskelemesinin ham bağlantısı 404 döndü, tarayıcıda doğru mailto bağlantısına dönüştüğü doğrulandı. |
| 8. Hız | Yeni ağır bağımlılık eklenmedi. HTTP kontrolleri tamamlandı; gerçek kullanıcı Core Web Vitals/Lighthouse ölçümü bu raporda yok. |
| 9. Erişilebilirlik | Odak stilleri, form etiketleri, yerel SSS açılır alanları, 404 içerik atlama hedefi ve hareket azaltma kontrol edildi. Tam WCAG sertifikasyonu değildir. |
| 10. Analytics | İzin öncesi kayıt yapılmadığı, izin sonrası kayıt ve içerik kimliklerinin korunması test edildi. İzin vermeyen ziyaretçiler ölçülmez. |
| 11. Meta başlık/açıklama | Taranan 25 sayfada eksik bulunmadı; sosyal görsel yedeği geliştirildi. |
| 12. Sitemap | Yeni sayfalar eklendi; canlı 200 yanıtı doğrulandı. |
| 13. Robots | Özel/admin ve abonelik işlem yolları güncellendi; canlı 200. |
| 14. Canonical | 25 sayfada mevcut; www adresinden ana alan adına 301 doğrulandı. |
| 15. Görsel alternatif metinleri | Portre ve prompt görseli yedek açıklamaları düzeltildi. |
| 16. SSS | /sss yayımlandı; admin metinlerinden düzenlenebilir. |
| 17. Özel 404 | Site tasarımı, arama ve yazılara dönüş; gerçek HTTP 404 doğrulandı. |
| 18. Sosyal paylaşım | Yazı/prompt sayfalarında paylaş, bağlantıyı kopyala, WhatsApp ve X bağlantıları eklendi. |
| 19. Favicon | Canlı favicon.svg 200 yanıtı doğrulandı. |
| 20. llms.txt | Yayındaki içerikleri listeleyen dinamik metin yayımlandı. |

## Doğrulama

- Üretim derlemesi ve TypeScript kontrolü geçti.
- İzole veritabanında otomatik test: taslak, sürüm geri yükleme, zamanlama/iptal/yayınlama, görsel yükleme ve aynı baytları okuma, ayar kaydı, analytics eşzamanlı tekrar önleme ve kalıcılık geçti.
- Canlı 7 admin servisi: oturumla 200, oturumsuz 403.
- Canlı SQLite bütünlük sonucu: ok.
- Uygulama yalnızca sunucunun yerel arayüzünde dinliyor; ters vekil başlıkları ve www yönlendirmesi düzenlendi.
- Admin arayüzünde yeni gizlilik/şartlar/çerezler ve SSS metin grupları görüldü.
- 26 dış bağlantının 18'i yanıt verdi; 7 iCloud bağlantısı ve Microsoft indirme adresi otomatik kontrolde doğrulanamadı. Bunlar kırık olarak sınıflandırılmadı.

## Hesap bilgisi veya ayrıca doğrulama gerektirenler

1. SMTP sunucusu, kullanıcı ve parola henüz tanımlı değil. Bu nedenle bülten gönderimi uçtan uca doğrulanamaz; ziyaretçiye çalışmayan abonelik formu gösterilmiyor. İletişim mesajları admin gelen kutusuna kaydoluyor.
2. Reklamlar kapalı. AdSense hesabı/onayı ve gerekiyorsa Google sertifikalı CMP yapılandırması tamamlanmadan reklam açılmamalı; mevcut tercih paneli sertifikalı CMP değildir.
3. Search Console mülk doğrulaması ve sitemap gönderimi bu çalışmada yapılmadı. SEO ve llms.txt arama sırası veya yapay zekâ kaynak gösterimi garantisi vermez.
4. Gizlilik/kullanım metinleri düzenlenebilir başlangıç metinleridir; işletmenin gerçek uygulamaları ve hizmet sağlayıcılarıyla uyumu ayrıca gözden geçirilmelidir.

Admin düzenleme yolu: **Menü ve site metinleri → Sayfa → Gizlilik, kullanım şartları ve çerezler / Sık sorulan sorular**.

Başvuru: [KVKK çerez rehberi](https://www.kvkk.gov.tr/Icerik/7353/Cerez-Uygulamalari-Hakkinda-Rehber), [Google yapay zekâ arama rehberi](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide?version=published).
