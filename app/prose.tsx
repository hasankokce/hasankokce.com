import {
  extractHeadings,
  injectHeadingAnchors,
  normalizeBlogContent,
  sanitizeHtml
} from './content-parser';

export { extractHeadings };

/**
 * Geriye uyumluluk için eski proseHeadings API'sini destekler
 */
export function proseHeadings(body: string) {
  return extractHeadings(body);
}

/**
 * Makale İçindekiler Tablosu (Table of Contents)
 */
export function TableOfContents({
  body,
  title = 'Bu yazıda'
}: {
  body: string;
  title?: string;
}) {
  const headings = extractHeadings(body);
  if (headings.length < 2) return null;

  return (
    <nav className="article-toc" aria-label="İçindekiler">
      <h2 className="toc-title">{title}</h2>
      <ol className="toc-list">
        {headings.map(h => (
          <li
            key={h.id}
            className={`toc-item ${h.level === 3 ? 'toc-sub-item' : 'toc-main-item'}`}
          >
            <a href={'#' + h.id}>{h.title}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * Zengin Metin ve Blog İçerik Render Bileşeni
 * Hem yeni semantik HTML içerikleri hem de eski Markdown / düz metin içerikleri
 * güvenli bir şekilde sanitize ederek ve doğru tipografiyle render eder.
 */
export function Prose({
  body,
  anchors = false,
  className = ''
}: {
  body: string;
  anchors?: boolean;
  className?: string;
}) {
  if (!body) return null;

  // 1. İçeriği normalize et (Markdown ise HTML'e çevir, HTML ise sanitize et)
  let html = normalizeBlogContent(body);

  // 2. Çapa (anchor) bağlantıları ekle
  if (anchors) {
    html = injectHeadingAnchors(html);
  }

  // 3. Son XSS sanitizasyon kontrolü
  const cleanHtml = sanitizeHtml(html);

  return (
    <div
      className={`article-content prose ${className}`.trim()}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
