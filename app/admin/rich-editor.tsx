'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Heading2,
  Heading3,
  Pilcrow,
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  Table as TableIcon,
  Minus,
  Undo2,
  Redo2,
  Link as LinkIcon,
  FileCode2,
  Eye,
  Rows,
  Columns,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  markdownToHtml,
  sanitizeHtml,
  normalizeBlogContent
} from '../content-parser';

interface RichEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function RichEditor({ value, onChange, placeholder }: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    h2: false,
    h3: false,
    p: false,
    ul: false,
    ol: false,
    blockquote: false,
    inTable: false
  });

  const [mode, setMode] = useState<'visual' | 'code'>('visual');
  const [sourceCode, setSourceCode] = useState(value);
  const [showTableMenu, setShowTableMenu] = useState(false);
  const isUpdatingFromProp = useRef(false);

  // İlk yüklemede veya mod değişiminde içeriği yükle
  useEffect(() => {
    if (!editorRef.current) return;

    const currentHtml = editorRef.current.innerHTML;
    // Eğer prop değeri mevcut HTML'den farklıysa güncelle (geriye uyumluluk: markdown ise html'e çevir)
    const normalizedProp = normalizeBlogContent(value);

    if (normalizedProp !== currentHtml && !isUpdatingFromProp.current) {
      editorRef.current.innerHTML = normalizedProp;
    }
    setSourceCode(value);
  }, [value, mode]);

  // Format durumunu (selection) takip et
  const updateActiveFormats = useCallback(() => {
    if (typeof window === 'undefined') return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount || !editorRef.current) return;

    let node = sel.anchorNode;
    if (!node) return;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    const formats = {
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      h2: false,
      h3: false,
      p: false,
      ul: false,
      ol: false,
      blockquote: false,
      inTable: false
    };

    let curr: Node | null = node;
    while (curr && curr !== editorRef.current) {
      const tag = (curr as HTMLElement).tagName?.toLowerCase();
      if (tag === 'h2') formats.h2 = true;
      if (tag === 'h3') formats.h3 = true;
      if (tag === 'p') formats.p = true;
      if (tag === 'ul') formats.ul = true;
      if (tag === 'ol') formats.ol = true;
      if (tag === 'blockquote') formats.blockquote = true;
      if (tag === 'table' || tag === 'td' || tag === 'th') formats.inTable = true;
      curr = curr.parentNode;
    }

    setActiveFormats(formats);
  }, []);

  useEffect(() => {
    document.addEventListener('selectionchange', updateActiveFormats);
    return () => document.removeEventListener('selectionchange', updateActiveFormats);
  }, [updateActiveFormats]);

  const handleInput = () => {
    if (!editorRef.current) return;
    isUpdatingFromProp.current = true;
    const html = editorRef.current.innerHTML;
    onChange(html);
    setSourceCode(html);
    updateActiveFormats();
    setTimeout(() => {
      isUpdatingFromProp.current = false;
    }, 50);
  };

  const exec = (command: string, arg: string | undefined = undefined) => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    document.execCommand(command, false, arg);
    handleInput();
  };

  const formatBlock = (tagName: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    // Seçilen bloğu kontrol et
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    // Eğer zaten o bloktaysa paragrafa geri dön
    if (
      (tagName === 'h2' && activeFormats.h2) ||
      (tagName === 'h3' && activeFormats.h3) ||
      (tagName === 'blockquote' && activeFormats.blockquote)
    ) {
      document.execCommand('formatBlock', false, '<p>');
    } else {
      document.execCommand('formatBlock', false, `<${tagName}>`);
    }
    handleInput();
  };

  // Akıllı Yapıştırma (Smart Paste)
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();

    const clipboard = e.clipboardData;
    const htmlData = clipboard.getData('text/html');
    const plainText = clipboard.getData('text/plain');

    let toInsert = '';

    if (plainText) {
      // 1. Düz metin içinde HTML etiketleri var mı? (ör. <h2>...</h2>)
      if (/<(h[1-6]|p|ul|ol|li|table|blockquote|strong|em|a|br)\b[^>]*>/i.test(plainText)) {
        toInsert = sanitizeHtml(plainText);
      }
      // 2. Düz metin Markdown biçiminde mi? (##, ###, -, 1., **, |...|)
      else if (
        /(^|\n)(#{1,6}\s|[-*]\s|\d+\.\s|>|\||\*\*)/.test(plainText) ||
        plainText.includes('\n\n')
      ) {
        toInsert = sanitizeHtml(markdownToHtml(plainText));
      }
      // 3. Normal düz metin: Satır sonlarını koruyarak paragraflara böl
      else if (!htmlData) {
        const paragraphs = plainText
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(Boolean);

        if (paragraphs.length > 1) {
          toInsert = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br />')}</p>`).join('');
        } else {
          toInsert = plainText.replace(/\n/g, '<br />');
        }
      }
    }

    // 4. Eğer zengin metin (HTML) olarak kopyalandıysa ve yukarıdaki özel durumlara girmediyse
    if (!toInsert && htmlData) {
      toInsert = sanitizeHtml(htmlData);
    }

    if (!toInsert && plainText) {
      toInsert = plainText;
    }

    if (toInsert) {
      document.execCommand('insertHTML', false, toInsert);
      handleInput();
    }
  };

  // Bağlantı ekleme / düzenleme
  const insertLink = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    let currentUrl = '';
    let selectedText = '';

    if (sel && sel.rangeCount > 0) {
      selectedText = sel.toString();
      let node: Node | null = sel.anchorNode;
      if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;
      while (node && node !== editorRef.current) {
        if ((node as HTMLElement).tagName?.toLowerCase() === 'a') {
          currentUrl = (node as HTMLAnchorElement).getAttribute('href') || '';
          break;
        }
        node = node.parentNode;
      }
    }

    const url = window.prompt('Bağlantı adresi (URL):', currentUrl || 'https://');
    if (url === null) return;

    if (url.trim() === '') {
      document.execCommand('unlink', false);
    } else {
      let finalUrl = url.trim();
      if (!/^https?:\/\//i.test(finalUrl) && !finalUrl.startsWith('/') && !finalUrl.startsWith('#')) {
        finalUrl = 'https://' + finalUrl;
      }

      if (!selectedText && !currentUrl) {
        // Seçim yoksa URL metni olarak ekle
        document.execCommand('insertHTML', false, `<a href="${finalUrl}" target="_blank" rel="noopener noreferrer">${finalUrl}</a>`);
      } else {
        document.execCommand('createLink', false, finalUrl);
        // target ve rel ekle
        setTimeout(() => {
          if (!editorRef.current) return;
          const links = editorRef.current.querySelectorAll('a[href="' + finalUrl + '"]');
          links.forEach(l => {
            if (!finalUrl.startsWith('/')) {
              l.setAttribute('target', '_blank');
              l.setAttribute('rel', 'noopener noreferrer');
            }
          });
          handleInput();
        }, 10);
      }
    }
    handleInput();
  };

  // Tablo ekleme
  const insertTable = (rows = 3, cols = 2) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    let tableHtml = '<div class="article-table-wrap"><table><thead><tr>';
    for (let c = 0; c < cols; c++) {
      tableHtml += `<th>Başlık ${c + 1}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    for (let r = 0; r < rows - 1; r++) {
      tableHtml += '<tr>';
      for (let c = 0; c < cols; c++) {
        tableHtml += `<td>Veri ${r + 1}-${c + 1}</td>`;
      }
      tableHtml += '</tr>';
    }

    tableHtml += '</tbody></table></div><p><br /></p>';
    document.execCommand('insertHTML', false, tableHtml);
    handleInput();
  };

  // Tablo satır/sütun işlemleri
  const modifyTable = (action: 'addRow' | 'delRow' | 'addCol' | 'delCol' | 'delTable') => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;

    let node: Node | null = sel.anchorNode;
    if (node?.nodeType === Node.TEXT_NODE) node = node.parentNode;

    let cell: HTMLTableCellElement | null = null;
    let row: HTMLTableRowElement | null = null;
    let table: HTMLTableElement | null = null;

    while (node && node !== editorRef.current) {
      const tag = (node as HTMLElement).tagName?.toLowerCase();
      if (tag === 'td' || tag === 'th') cell = node as HTMLTableCellElement;
      if (tag === 'tr') row = node as HTMLTableRowElement;
      if (tag === 'table') table = node as HTMLTableElement;
      node = node.parentNode;
    }

    if (!table) return;

    if (action === 'delTable') {
      const wrap = table.closest('.article-table-wrap') || table;
      wrap.remove();
      handleInput();
      return;
    }

    if (!row || !cell) return;

    const colIndex = cell.cellIndex;

    if (action === 'addRow') {
      const newRow = table.insertRow(row.rowIndex + 1);
      const cellCount = row.cells.length;
      for (let i = 0; i < cellCount; i++) {
        const newCell = newRow.insertCell(i);
        newCell.innerHTML = 'Metin';
      }
    } else if (action === 'delRow') {
      table.deleteRow(row.rowIndex);
    } else if (action === 'addCol') {
      const allRows = table.rows;
      for (let i = 0; i < allRows.length; i++) {
        const isHeader = allRows[i].parentNode?.nodeName.toLowerCase() === 'thead';
        if (isHeader) {
          const th = document.createElement('th');
          th.innerHTML = 'Yeni Başlık';
          allRows[i].appendChild(th);
        } else {
          const newCell = allRows[i].insertCell(colIndex + 1);
          newCell.innerHTML = 'Veri';
        }
      }
    } else if (action === 'delCol') {
      const allRows = table.rows;
      for (let i = 0; i < allRows.length; i++) {
        if (allRows[i].cells[colIndex]) {
          allRows[i].deleteCell(colIndex);
        }
      }
    }

    handleInput();
  };

  // Kaynak modu güncellemesi
  const handleSourceChange = (newSource: string) => {
    setSourceCode(newSource);
    onChange(newSource);
  };

  return (
    <div className="rich-editor-container">
      {/* Üst Araç Çubuğu (Toolbar) */}
      <div className="rich-editor-toolbar" role="toolbar" aria-label="Metin biçimlendirme">
        <div className="rich-toolbar-group">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.p ? 'active' : ''}`}
            onClick={() => formatBlock('p')}
            title="Normal Paragraf"
            aria-label="Normal Paragraf"
          >
            <Pilcrow size={16} />
            <span className="rich-btn-label">P</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.h2 ? 'active' : ''}`}
            onClick={() => formatBlock('h2')}
            title="Bölüm Başlığı (H2)"
            aria-label="Bölüm Başlığı (H2)"
          >
            <Heading2 size={17} />
            <span className="rich-btn-label">H2</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.h3 ? 'active' : ''}`}
            onClick={() => formatBlock('h3')}
            title="Alt Başlık (H3)"
            aria-label="Alt Başlık (H3)"
          >
            <Heading3 size={17} />
            <span className="rich-btn-label">H3</span>
          </Button>
        </div>

        <div className="rich-toolbar-divider" />

        <div className="rich-toolbar-group">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.bold ? 'active' : ''}`}
            onClick={() => exec('bold')}
            title="Kalın (Ctrl+B)"
            aria-label="Kalın"
          >
            <Bold size={16} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.italic ? 'active' : ''}`}
            onClick={() => exec('italic')}
            title="Eğik (Ctrl+I)"
            aria-label="Eğik"
          >
            <Italic size={16} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rich-btn"
            onClick={insertLink}
            title="Bağlantı ekle / düzenle"
            aria-label="Bağlantı ekle"
          >
            <LinkIcon size={16} />
          </Button>
        </div>

        <div className="rich-toolbar-divider" />

        <div className="rich-toolbar-group">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.ul ? 'active' : ''}`}
            onClick={() => exec('insertUnorderedList')}
            title="Madde İşaretli Liste"
            aria-label="Madde İşaretli Liste"
          >
            <List size={16} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.ol ? 'active' : ''}`}
            onClick={() => exec('insertOrderedList')}
            title="Numaralı Liste"
            aria-label="Numaralı Liste"
          >
            <ListOrdered size={16} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.blockquote ? 'active' : ''}`}
            onClick={() => formatBlock('blockquote')}
            title="Alıntı (Blockquote)"
            aria-label="Alıntı"
          >
            <Quote size={16} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rich-btn"
            onClick={() => exec('insertHorizontalRule')}
            title="Yatay Çizgi (Ayraç)"
            aria-label="Yatay Çizgi"
          >
            <Minus size={16} />
          </Button>
        </div>

        <div className="rich-toolbar-divider" />

        {/* Tablo Araçları */}
        <div className="rich-toolbar-group table-toolbar-group">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={`rich-btn ${activeFormats.inTable ? 'active' : ''}`}
            onClick={() => {
              if (activeFormats.inTable) {
                setShowTableMenu(!showTableMenu);
              } else {
                insertTable(3, 2);
              }
            }}
            title={activeFormats.inTable ? 'Tablo Seçenekleri' : 'Tablo Ekle'}
            aria-label="Tablo"
          >
            <TableIcon size={16} />
            <span className="rich-btn-label">Tablo</span>
          </Button>

          {activeFormats.inTable && (
            <div className="table-quick-actions">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => modifyTable('addRow')}
                title="Alta Satır Ekle"
              >
                <Rows size={13} /> +Satır
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => modifyTable('addCol')}
                title="Sağa Sütun Ekle"
              >
                <Columns size={13} /> +Sütun
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => modifyTable('delTable')}
                title="Tabloyu Sil"
              >
                <Trash2 size={13} />
              </Button>
            </div>
          )}
        </div>

        <div className="rich-toolbar-spacer" />

        {/* Geri Al / İleri Al */}
        <div className="rich-toolbar-group">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rich-btn"
            onClick={() => exec('undo')}
            title="Geri Al (Ctrl+Z)"
            aria-label="Geri Al"
          >
            <Undo2 size={15} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rich-btn"
            onClick={() => exec('redo')}
            title="Yinele (Ctrl+Y)"
            aria-label="Yinele"
          >
            <Redo2 size={15} />
          </Button>
        </div>

        <div className="rich-toolbar-divider" />

        {/* Görsel / Kaynak Kodu Geçişi */}
        <div className="rich-toolbar-group">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rich-btn mode-switch"
            onClick={() => {
              if (mode === 'visual') {
                if (editorRef.current) {
                  setSourceCode(editorRef.current.innerHTML);
                }
                setMode('code');
              } else {
                setMode('visual');
              }
            }}
            title={mode === 'visual' ? 'Kaynak Kodu Göster' : 'Görsel Editöre Dön'}
          >
            {mode === 'visual' ? (
              <>
                <FileCode2 size={15} /> <span className="rich-btn-label">Kaynak</span>
              </>
            ) : (
              <>
                <Eye size={15} /> <span className="rich-btn-label">Görsel</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Editör Gövdesi */}
      {mode === 'visual' ? (
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="rich-editor-content article-content"
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyUp={updateActiveFormats}
          onMouseUp={updateActiveFormats}
          data-placeholder={placeholder || 'Yazınızı buraya yazın veya ChatGPT içeriğini yapıştırın…'}
          role="textbox"
          aria-multiline="true"
        />
      ) : (
        <div className="rich-editor-source-wrap">
          <textarea
            className="rich-editor-source"
            value={sourceCode}
            onChange={e => handleSourceChange(e.target.value)}
            rows={18}
            placeholder="HTML veya Markdown içeriği..."
            spellCheck={false}
          />
          <small className="rich-editor-hint">
            Burada doğrudan HTML veya Markdown formatında düzenleme yapabilirsiniz. Görsel moda döndüğünüzde biçimlendirilecektir.
          </small>
        </div>
      )}
    </div>
  );
}
