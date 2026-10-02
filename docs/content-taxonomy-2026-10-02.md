# İçerik temizliği ve etiket yönetimi

- Canlıdaki dört başlangıç yazısı ve Deneme yazısı arşivlendi; 10 örnek prompt görünmez yapıldı. Kalıcı silme yapılmadı; kimlikler ve geçmiş istatistikler korundu. Boş, yayında olmayan taslağa dokunulmadı.
- Admin → Yazılar → Yazı kategorileri: ekleme/çıkarma ve aynı bölümde kaydetme.
- Yazı editörü: kategori seçimi ve 20 adede kadar etiket ekleme/çıkarma. Etiketler otomatik taslak, sürüm geri yükleme, planlama ve yayın akışında saklanır.
- Kategori kaldırma genel menüyü değiştirir; eski yazının kategori bilgisi korunur ve editörden değiştirilebilir.
- Yayındaki etiketler yazı sayfasında ve arşivde bağlantılı filtre olarak gösterilir; Article yapılandırılmış verisinde keywords alanına eklenir. Filtre sayfaları tekrar indekslenmemek için noindex kullanır.
- Sunucuda oluşturulan içerik, yazar, tarihler, kaynaklar, canonical, sitemap, RSS ve llms.txt altyapısı korunur. Yeni yayınlar otomatik olarak genel listelere girer; arşivler ve gizli promptlar girmez.
- Testler: üretim derlemesi, TypeScript, otomatik workflow/analytics testleri; etiket geri yükleme, yayın, filtre ve kaldırma. Canlı listeler/sitemap/llms kontrol edildi.

Etiketler ve llms.txt tek başına sıralama veya yapay zekâlarda kaynak gösterilme garantisi vermez. Özgün, kaynaklı ve güncel içerikler yayımlanmalı. Google için indekslenebilirlik ve snippet uygunluğu temel gerekliliklerdir: https://developers.google.com/search/docs/appearance/ai-features
