/**
 * Blog İçerik Ayrıştırıcı, Markdown/HTML Dönüştürücü ve XSS Sanitizer Modülü
 */

// İzin verilen güvenli HTML etiketleri
const ALLOWED_TAGS = new Set([
  'h2', 'h3', 'h4', 'p', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
  'a', 'ul', 'ol', 'li', 'blockquote', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr', 'br', 'code', 'pre', 'img', 'div', 'span', 'figure', 'figcaption'
]);

// İzin verilen öznitelikler (etiket -> attribute seti)
const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  img: new Set(['src', 'alt', 'title', 'width', 'height', 'loading']),
  th: new Set(['scope', 'colspan', 'rowspan', 'align']),
  td: new Set(['colspan', 'rowspan', 'align']),
  div: new Set(['class']),
  span: new Set(['class']),
  h2: new Set(['id', 'class']),
  h3: new Set(['id', 'class']),
  h4: new Set(['id', 'class']),
  p: new Set(['class']),
  section: new Set(['id', 'class'])
};

/**
 * Metnin HTML biçiminde zengin içerik içerip içermediğini kontrol eder.
 */
export function isHtml(text: string): boolean {
  if (!text) return false;
  // Paragraf, başlık, liste veya tablo gibi HTML blok etiketleri içeriyor mu?
  return /<\s*(p|h[1-6]|ul|ol|li|blockquote|table|hr|div|strong|em|a|br)\b[^>]*>/i.test(text);
}

/**
 * Güvenli bağlantı URL'si kontrolü (javascript: vb. XSS saldırılarını engeller).
 */
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  // Site içi göreceli bağlantılar veya https://, http://, mailto:, tel: izin verilir
  if (/^(\/(?!\/)[^\s]*|https?:\/\/[^\s]+|mailto:[^\s]+|tel:[^\s]+|#[^\s]*)$/i.test(trimmed)) {
    return trimmed;
  }
  return '';
}

/**
 * Türkçe başlıklar için benzersiz ve geçerli ID üretir.
 */
export function slugifyHeading(title: string, index: number): string {
  const clean = title
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return clean ? `${clean}-${index}` : `bolum-${index}`;
}

/**
 * HTML içeriği güvenli hale getirir (XSS Sanitizer).
 * İstemci ve sunucu (SSR) ortamlarında ek kütüphane gerektirmeden tam çalışır.
 */
export function sanitizeHtml(rawHtml: string): string {
  if (!rawHtml) return '';

  // 1. Zararlı etiketleri (script, style, iframe, object, embed, form vb.) ve içeriklerini tamamen yok et
  let html = rawHtml.replace(/<\s*(script|style|iframe|object|embed|form|svg|math|template|link|meta)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '');
  html = html.replace(/<\s*(script|style|iframe|object|embed|form|svg|math|template|link|meta)\b[^>]*\/?>/gi, '');

  // 2. HTML yorumlarını kaldır
  html = html.replace(/<!--[\s\S]*?-->/g, '');

  // 3. Etiketleri ve öznitelikleri ayrıştırıp temizle
  html = html.replace(/<\/?([a-zA-Z0-9]+)(\s+[^>]*)?\/?>/g, (match, tagNameRaw: string, attrsRaw?: string) => {
    const tagName = tagNameRaw.toLowerCase();
    const isClosing = match.startsWith('</');

    if (!ALLOWED_TAGS.has(tagName)) {
      return ''; // İzin verilmeyen etiketi kaldır
    }

    if (isClosing) {
      return `</${tagName}>`;
    }

    if (!attrsRaw) {
      return `<${tagName}>`;
    }

    // Öznitelikleri (attributes) ayrıştır
    const allowedForTag = ALLOWED_ATTRS[tagName] || new Set();
    const cleanedAttrs: string[] = [];

    // name="value" veya name='value' veya name=value eşleşmesi
    const attrRegex = /([a-zA-Z0-9_-]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrsRaw)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      const attrValue = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';

      // on* olay dinleyicilerini (onclick, onerror, onload vb.) engelle
      if (attrName.startsWith('on')) continue;

      // Sadece izin verilen öznitelikleri al
      if (allowedForTag.has(attrName)) {
        if (attrName === 'href' || attrName === 'src') {
          const safeUrl = sanitizeUrl(attrValue);
          if (safeUrl) {
            cleanedAttrs.push(`${attrName}="${escapeHtmlAttr(safeUrl)}"`);
          }
        } else if (attrName === 'target') {
          if (attrValue === '_blank') {
            cleanedAttrs.push('target="_blank"');
          }
        } else if (attrName === 'rel') {
          cleanedAttrs.push('rel="noopener noreferrer"');
        } else if (attrName === 'id') {
          const safeId = attrValue.replace(/[^a-zA-Z0-9_-]/g, '');
          if (safeId) cleanedAttrs.push(`id="${safeId}"`);
        } else {
          cleanedAttrs.push(`${attrName}="${escapeHtmlAttr(attrValue)}"`);
        }
      }
    }

    // target="_blank" varsa otomatik rel="noopener noreferrer" ekle
    if (tagName === 'a') {
      const hasBlank = cleanedAttrs.some(a => a.startsWith('target='));
      const hasRel = cleanedAttrs.some(a => a.startsWith('rel='));
      if (hasBlank && !hasRel) {
        cleanedAttrs.push('rel="noopener noreferrer"');
      }
    }

    const attrString = cleanedAttrs.length > 0 ? ' ' + cleanedAttrs.join(' ') : '';
    const selfClosing = ['hr', 'br', 'img'].includes(tagName) ? ' />' : '>';
    return `<${tagName}${attrString}${selfClosing}`;
  });

  return html;
}

export function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeHtmlAttr(str: string): string {
  return escapeHtml(str);
}

/**
 * Satır içi Markdown öğelerini HTML'e dönüştürür:
 * **bold**, *italic*, [text](url), `code`
 */
export function formatInlineMarkdown(text: string): string {
  if (!text) return '';

  let out = text;

  // HTML escape ilk önce yap (XSS koruması)
  out = out
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bağlantılar: [label](url)
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, url) => {
    const safe = sanitizeUrl(url);
    if (!safe) return label;
    const isInternal = safe.startsWith('/') && !safe.startsWith('//');
    const target = isInternal ? '' : ' target="_blank" rel="noopener noreferrer"';
    return `<a href="${safe}"${target}>${label}</a>`;
  });

  // Kalın: **text** veya __text__
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');

  // İtalik: *text* veya _text_
  out = out.replace(/(^|[^*])\*([^*]+)\*([^*]|$)/g, '$1<em>$2</em>$3');
  out = out.replace(/(^|[^_])_([^_]+)_([^_]|$)/g, '$1<em>$2</em>$3');

  // Satır içi kod: `code`
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');

  return out;
}

// Yerleşik Ürün Öneri Ön Tanımları (Affiliate / Tavsiye Edilen Ekipmanlar)
export const BUILTIN_GEAR_PRESETS: Record<string, {
  title: string;
  badge: string;
  desc: string;
  note: string;
  url: string;
  buttonLabel: string;
  image: string;
}> = {
  'anker-prime-67w': {
    title: 'Anker Prime 67W GaN Hızlı Şarj Cihazı',
    badge: 'Şarj & Adaptör',
    desc: "MacBook, iPad ve iPhone'u aynı anda tek prizden ultra kompakt ve ısınmadan şarj edebilen vazgeçilmez seyahat ve masa adaptörüm.",
    note: '⚡ 3 Portlu GaN Teknolojisi · F/P Lideri',
    url: 'https://www.amazon.com.tr/',
    buttonLabel: "Amazon'da İncele ↗",
    image: '/images/prompt-product.webp'
  },
  'anker-maggo-qi2': {
    title: 'Anker MagGo Qi2 Manyetik Kablosuz Powerbank (10.000 mAh)',
    badge: 'Telefon Aksesuarı',
    desc: "Yeni Qi2 standardı ile iPhone'u kablosuz 15W hızında şarj eden, arkasındaki katlanabilir standıyla masada video izlerken hayat kurtaran powerbank.",
    note: '📱 15W Hızlı Manyetik Şarj · Entegre Stand',
    url: 'https://www.hepsiburada.com/',
    buttonLabel: "Hepsiburada'da Gör ↗",
    image: '/images/prompt-smartwatch-titanium.webp'
  },
  'dji-mic-2': {
    title: 'DJI Mic 2 Kablosuz Yaka Mikrofonu',
    badge: 'Çekim & Ses',
    desc: 'Instagram Reels ve YouTube videolarımda kullandığım, dahili 32-bit float kayıt özelliğiyle sesi asla patlatmayan ve ortam gürültüsünü filtreleyen mikrofon.',
    note: '🎙️ 32-bit Float Dahili Kayıt · Akıllı Gürültü Engelleme',
    url: 'https://www.amazon.com.tr/',
    buttonLabel: 'Ürünü İncele ↗',
    image: '/images/prompt-companion-robot.webp'
  },
  'logitech-mx-master-3s': {
    title: 'Logitech MX Master 3S Ergonomik Kablosuz Mouse',
    badge: 'Masa Düzeni & Verimlilik',
    desc: 'Saatlerce kurgu ve yazı yazarken bile bileği yormayan, neredeyse tamamen sessiz tıklama mekanizmasına ve elektromanyetik MagSpeed tekerleğine sahip fare.',
    note: '🖱️ 8.000 DPI Camda Çalışır · Sessiz Tıklama',
    url: 'https://www.amazon.com.tr/',
    buttonLabel: "Amazon'da İncele ↗",
    image: '/images/prompt-desk.webp'
  },
  'keychron-k3-pro': {
    title: 'Keychron K3 Pro Ultra İnce Mekanik Klavye',
    badge: 'Masa Düzeni & Verimlilik',
    desc: 'Hem Mac hem Windows ile kusursuz uyumlu, düşük profilli Gateron switch\'leri ve QMK/VIA programlanabilirlik özelliğiyle yazı yazmayı keyifli kılan mekanik klavye.',
    note: '⌨️ Ultra-Slim Gövde · Bluetooth 5.1 & Kablolu',
    url: 'https://www.hepsiburada.com/',
    buttonLabel: "Hepsiburada'da Gör ↗",
    image: '/images/prompt-isometric-developer-desk.webp'
  },
  'ugreen-revodok-pro-hub': {
    title: 'Ugreen Revodok Pro 9-in-1 USB-C Çoklayıcı Hub',
    badge: 'Aksesuarlar & Kablolar',
    desc: 'MacBook ve Type-C dizüstü bilgisayarlar için çift 4K 60Hz HDMI çıkışı, 100W Power Delivery hızlı şarj ve gigabit ethernet sağlayan hepsi bir arada bağlantı istasyonu.',
    note: '🔌 Çift 4K 60Hz HDMI · 100W PD Şarj Destekli',
    url: 'https://www.amazon.com.tr/',
    buttonLabel: 'Ürünü İncele ↗',
    image: '/images/prompt-glass.webp'
  }
};

/**
 * Markdown metnini temiz, semantik HTML'e dönüştürür.
 * Desteklenen yapılar:
 * - H1, H2, H3 (H1 otomatik H2'ye dönüştürülür)
 * - Sırasız liste (-, *)
 * - Sıralı liste (1., 2.)
 * - Tablolar (| Col 1 | Col 2 |)
 * - Blockquote (> Alıntı)
 * - Yatay çizgi (---)
 * - Paragraflar
 */
export function markdownToHtml(md: string): string {
  if (!md) return '';

  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const blocks: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Boş satırları atla
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Yatay çizgi: --- veya *** veya ___
    if (/^(\*{3,}|-{3,}|_{3,})$/.test(trimmed)) {
      blocks.push('<hr />');
      i++;
      continue;
    }

    // 3. Başlıklar: #, ##, ### (H1 içeriğe girerse H2 yapılır, böylece sayfada tek H1 kuralı korunur)
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const title = headingMatch[2].trim();
      const tag = level <= 2 ? 'h2' : level === 3 ? 'h3' : 'h4';
      blocks.push(`<${tag}>${formatInlineMarkdown(title)}</${tag}>`);
      i++;
      continue;
    }

    // 4. Tablolar: | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.includes('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      if (tableLines.length >= 2) {
        const headerRow = tableLines[0];
        const isDelimiter = /^\|(\s*:?-+:?\s*\|)+$/.test(tableLines[1]);
        const startDataIdx = isDelimiter ? 2 : 1;

        const parseRow = (r: string) =>
          r.slice(1, -1).split('|').map(cell => cell.trim());

        const headers = parseRow(headerRow);
        let tableHtml = '<div class="article-table-wrap"><table><thead><tr>';
        headers.forEach(h => {
          tableHtml += `<th>${formatInlineMarkdown(h)}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';

        for (let rowIdx = startDataIdx; rowIdx < tableLines.length; rowIdx++) {
          const rowData = parseRow(tableLines[rowIdx]);
          tableHtml += '<tr>';
          rowData.forEach(cell => {
            tableHtml += `<td>${formatInlineMarkdown(cell)}</td>`;
          });
          tableHtml += '</tr>';
        }

        tableHtml += '</tbody></table></div>';
        blocks.push(tableHtml);
        continue;
      }
    }

    // 4b. Özel Ürün Öneri Kutusu: :::urun veya :::product
    if (trimmed.startsWith(':::urun') || trimmed.startsWith(':::product')) {
      const inlinePreset = trimmed
        .replace(/^:::urun/i, '')
        .replace(/^:::product/i, '')
        .trim();
      i++;
      const fields: Record<string, string> = {};
      while (i < lines.length && !lines[i].trim().startsWith(':::')) {
        const itemLine = lines[i].trim();
        const colonIdx = itemLine.indexOf(':');
        if (colonIdx > 0) {
          const key = itemLine.slice(0, colonIdx).trim().toLowerCase();
          const val = itemLine.slice(colonIdx + 1).trim();
          fields[key] = val;
        }
        i++;
      }
      if (i < lines.length && lines[i].trim().startsWith(':::')) {
        i++; // skip closing :::
      }

      const presetKey = inlinePreset || fields.id || fields.preset || fields.urun || '';
      const preset = presetKey ? BUILTIN_GEAR_PRESETS[presetKey] : undefined;

      const title = fields.baslik || fields.title || fields.ad || fields.name || preset?.title || 'Tavsiye Edilen Ürün';
      const badge = fields.rozet || fields.badge || fields.etiket || preset?.badge || "Hasan'ın Önerisi";
      const desc = fields.aciklama || fields.desc || fields.description || preset?.desc || '';
      const note = fields.not || fields.note || fields.fiyat || fields.price || preset?.note || '';
      const url = sanitizeUrl(fields.url || fields.link || preset?.url || '');
      const buttonLabel = fields.buton || fields.button || preset?.buttonLabel || 'Ürünü İncele ↗';
      const image = fields.gorsel || fields.image || fields.resim || preset?.image || '';

      let cardHtml = '<div class="product-callout">';
      cardHtml += '<div class="product-callout-header">';
      cardHtml += `<span class="product-callout-badge">⭐ ${escapeHtml(badge)}</span>`;
      if (note) {
        cardHtml += `<span class="product-callout-note">${escapeHtml(note)}</span>`;
      }
      cardHtml += '</div>';

      cardHtml += '<div class="product-callout-body">';
      if (image) {
        cardHtml += `<div class="product-callout-media"><img src="${escapeHtml(image)}" alt="${escapeHtml(title)}" loading="lazy" /></div>`;
      }
      cardHtml += '<div class="product-callout-main">';
      cardHtml += `<h4 class="product-callout-title">${escapeHtml(title)}</h4>`;
      if (desc) {
        cardHtml += `<p class="product-callout-desc">${formatInlineMarkdown(desc)}</p>`;
      }
      if (url) {
        cardHtml += `<div class="product-callout-action"><a href="${url}" class="product-callout-btn" target="_blank" rel="sponsored noopener noreferrer">${escapeHtml(buttonLabel)}</a></div>`;
      }
      cardHtml += '</div></div></div>';

      blocks.push(cardHtml);
      continue;
    }

    // 5. Blockquote: > Alıntı
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const quoteContent = quoteLines.map(formatInlineMarkdown).join('<br />');
      blocks.push(`<blockquote><p>${quoteContent}</p></blockquote>`);
      continue;
    }

    // 6. Sırasız Liste: - item veya * item
    if (/^[-*]\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^[-*]\s+/, ''));
        i++;
      }
      const listHtml = '<ul>' + listItems.map(item => `<li>${formatInlineMarkdown(item)}</li>`).join('') + '</ul>';
      blocks.push(listHtml);
      continue;
    }

    // 7. Sıralı Liste: 1. item, 2. item
    if (/^\d+\.\s+/.test(trimmed)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      const listHtml = '<ol>' + listItems.map(item => `<li>${formatInlineMarkdown(item)}</li>`).join('') + '</ol>';
      blocks.push(listHtml);
      continue;
    }

    // 8. Normal Paragraf (bir sonraki boş satıra veya başka bir blok başlangıcına kadar)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i];
      const curTrimmed = cur.trim();
      if (!curTrimmed) break;
      if (/^(#{1,6}\s|[-*]\s|\d+\.\s|>|\||\*{3,}|-{3,})/.test(curTrimmed)) break;
      paraLines.push(curTrimmed);
      i++;
    }

    if (paraLines.length > 0) {
      const paraText = paraLines.map(formatInlineMarkdown).join(' ');
      blocks.push(`<p>${paraText}</p>`);
    }
  }

  return blocks.join('\n');
}

/**
 * Verilen içeriği (ister HTML ister Markdown) güvenli ve tutarlı bir HTML'e dönüştürür.
 * Eski veritabanı kayıtlarıyla %100 geriye uyumluluk sağlar.
 */
export function normalizeBlogContent(content: string): string {
  if (!content) return '';

  let html: string;
  if (isHtml(content)) {
    // İçerik zaten HTML
    html = sanitizeHtml(content);
  } else {
    // İçerik Markdown veya düz metin
    html = markdownToHtml(content);
  }

  return html;
}

export type HeadingItem = {
  id: string;
  title: string;
  level: number;
};

/**
 * İçindekiler tablosu (Table of Contents) için başlıklardan liste çıkarır.
 * Hem HTML hem de Markdown gövdelerinden H2 ve H3 başlıkları toplar.
 */
export function extractHeadings(content: string): HeadingItem[] {
  if (!content) return [];

  const headings: HeadingItem[] = [];

  if (isHtml(content)) {
    const headingRegex = /<h([23])(?:\s+[^>]*id="([^"]*)")?[^>]*>([\s\S]*?)<\/h\1>/gi;
    let match: RegExpExecArray | null;
    let idx = 0;

    while ((match = headingRegex.exec(content)) !== null) {
      const level = parseInt(match[1], 10);
      const existingId = match[2];
      const rawTitle = match[3].replace(/<[^>]+>/g, '').trim();
      if (rawTitle) {
        headings.push({
          id: existingId || slugifyHeading(rawTitle, idx),
          title: rawTitle,
          level
        });
        idx++;
      }
    }
  } else {
    // Markdown satırlarını tara
    const lines = content.split('\n');
    let idx = 0;
    for (const line of lines) {
      const m = line.match(/^(#{2,3})\s+(.+)$/);
      if (m) {
        const level = m[1].length;
        const rawTitle = m[2].replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').trim();
        if (rawTitle) {
          headings.push({
            id: slugifyHeading(rawTitle, idx),
            title: rawTitle,
            level
          });
          idx++;
        }
      }
    }
  }

  return headings;
}

/**
 * Render sırasında H2 ve H3 başlıklarına id özniteliği enjekte eder
 * (İçindekiler bağlantılarının çalışabilmesi için).
 */
export function injectHeadingAnchors(html: string): string {
  if (!html) return '';

  let idx = 0;
  return html.replace(/<(h[23])(\s+[^>]*)?>([\s\S]*?)<\/\1>/gi, (full, tag: string, attrs: string | undefined, inner: string) => {
    // Eğer zaten id varsa koru
    if (attrs && /\bid="[^"]*"/i.test(attrs)) {
      return full;
    }

    const plainText = inner.replace(/<[^>]+>/g, '').trim();
    const anchorId = slugifyHeading(plainText, idx++);
    const cleanAttrs = attrs ? attrs.trim() : '';

    return `<${tag} id="${anchorId}"${cleanAttrs ? ' ' + cleanAttrs : ''}>${inner}</${tag}>`;
  });
}
