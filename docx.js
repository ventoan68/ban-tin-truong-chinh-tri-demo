(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WordFile = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const utf8 = new TextEncoder();

  /* ---------- Nén ZIP (không nén dữ liệu) ---------- */

  const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosStamp(date) {
    const time = (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1);
    const day = ((Math.max(1980, date.getFullYear()) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
    return { time, day };
  }

  function zip(files, date = new Date()) {
    const { time, day } = dosStamp(date);
    const chunks = [];
    const central = [];
    let offset = 0;
    const push = bytes => { chunks.push(bytes); offset += bytes.length; };

    for (const file of files) {
      const name = utf8.encode(file.name);
      const data = typeof file.data === 'string' ? utf8.encode(file.data) : file.data;
      const crc = crc32(data);

      const local = new DataView(new ArrayBuffer(30));
      local.setUint32(0, 0x04034b50, true);
      local.setUint16(4, 20, true);
      local.setUint16(6, 0x0800, true);
      local.setUint16(8, 0, true);
      local.setUint16(10, time, true);
      local.setUint16(12, day, true);
      local.setUint32(14, crc, true);
      local.setUint32(18, data.length, true);
      local.setUint32(22, data.length, true);
      local.setUint16(26, name.length, true);
      local.setUint16(28, 0, true);

      const entry = new DataView(new ArrayBuffer(46));
      entry.setUint32(0, 0x02014b50, true);
      entry.setUint16(4, 20, true);
      entry.setUint16(6, 20, true);
      entry.setUint16(8, 0x0800, true);
      entry.setUint16(10, 0, true);
      entry.setUint16(12, time, true);
      entry.setUint16(14, day, true);
      entry.setUint32(16, crc, true);
      entry.setUint32(20, data.length, true);
      entry.setUint32(24, data.length, true);
      entry.setUint16(28, name.length, true);
      entry.setUint32(42, offset, true);
      central.push(new Uint8Array(entry.buffer), name);

      push(new Uint8Array(local.buffer));
      push(name);
      push(data);
    }

    const centralStart = offset;
    for (const part of central) push(part);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true);
    end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true);
    end.setUint32(12, offset - centralStart, true);
    end.setUint32(16, centralStart, true);
    push(new Uint8Array(end.buffer));

    const out = new Uint8Array(offset);
    let at = 0;
    for (const part of chunks) { out.set(part, at); at += part.length; }
    return out;
  }

  /* ---------- Thành phần của tài liệu Word ---------- */

  const NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
  const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const esc = value => String(value ?? '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const PAGE = { width: 11906, height: 16838, top: 1134, bottom: 1134, left: 1701, right: 1134 };
  const TEXT_WIDTH = PAGE.width - PAGE.left - PAGE.right;

  const styles = XML + `<w:styles ${NS}>
<w:docDefaults>
<w:rPrDefault><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/><w:lang w:val="vi-VN" w:eastAsia="vi-VN" w:bidi="ar-SA"/></w:rPr></w:rPrDefault>
<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="312" w:lineRule="auto"/></w:pPr></w:pPrDefault>
</w:docDefaults>
<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/><w:pPr><w:jc w:val="both"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Tieude"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:spacing w:before="240" w:after="200" w:line="288" w:lineRule="auto"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:bCs/><w:caps/><w:sz w:val="32"/><w:szCs w:val="32"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Chuyenmuc"><w:name w:val="Category"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:jc w:val="left"/></w:pPr><w:rPr><w:b/><w:bCs/><w:caps/><w:color w:val="404040"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Tacgia"><w:name w:val="Byline"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Tomtat"><w:name w:val="Abstract"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="120"/><w:ind w:left="567" w:right="567"/></w:pPr><w:rPr><w:i/><w:iCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="280" w:after="120"/><w:jc w:val="left"/><w:outlineLvl w:val="0"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="27"/><w:szCs w:val="27"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/><w:pPr><w:keepNext/><w:keepLines/><w:spacing w:before="200" w:after="100"/><w:jc w:val="left"/><w:outlineLvl w:val="1"/></w:pPr><w:rPr><w:b/><w:bCs/><w:i/><w:iCs/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Noidung"><w:name w:val="Body Text"/><w:basedOn w:val="Normal"/><w:qFormat/><w:pPr><w:ind w:firstLine="567"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Danhsach"><w:name w:val="List Item"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80"/><w:ind w:left="567" w:hanging="283"/></w:pPr></w:style>
<w:style w:type="paragraph" w:styleId="Trichdan"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567" w:right="284"/></w:pPr><w:rPr><w:i/><w:iCs/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Thamkhao"><w:name w:val="Reference"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="80" w:line="276" w:lineRule="auto"/><w:ind w:left="567" w:hanging="567"/></w:pPr><w:rPr><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Chuthich"><w:name w:val="Caption"/><w:basedOn w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="160" w:after="80"/><w:jc w:val="center"/></w:pPr><w:rPr><w:b/><w:bCs/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Odulieu"><w:name w:val="Table Text"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="40" w:after="40" w:line="264" w:lineRule="auto"/><w:jc w:val="left"/></w:pPr><w:rPr><w:sz w:val="23"/><w:szCs w:val="23"/></w:rPr></w:style>
<w:style w:type="paragraph" w:styleId="Footer"><w:name w:val="footer"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="0"/><w:jc w:val="center"/></w:pPr><w:rPr><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:style>
</w:styles>`;

  const footer = XML + `<w:ftr ${NS}><w:p><w:pPr><w:pStyle w:val="Footer"/></w:pPr><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText xml:space="preserve"> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="separate"/></w:r><w:r><w:t>1</w:t></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p></w:ftr>`;

  const run = (text, o = {}) => {
    const props = `${o.b ? '<w:b/><w:bCs/>' : ''}${o.i ? '<w:i/><w:iCs/>' : ''}`;
    return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>`;
  };

  const para = (style, content, extra = '') =>
    `<w:p><w:pPr><w:pStyle w:val="${style}"/>${extra}</w:pPr>${content}</w:p>`;

  /* Đoạn văn có thể chứa **chữ đậm** và _chữ nghiêng_ */
  function inline(text) {
    const parts = String(text).split(/(\*\*[^*]+\*\*|__[^_]+__)/g).filter(Boolean);
    return parts.map(part => {
      if (part.startsWith('**')) return run(part.slice(2, -2), { b: true });
      if (part.startsWith('__')) return run(part.slice(2, -2), { i: true });
      return run(part);
    }).join('');
  }

  function table(head, rows, widths) {
    const cols = head.length;
    const sizes = widths && widths.length === cols ? widths : head.map(() => 1);
    const total = sizes.reduce((a, b) => a + b, 0);
    const dxa = sizes.map(w => Math.floor(TEXT_WIDTH * w / total));
    const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(s => `<w:${s} w:val="single" w:sz="4" w:space="0" w:color="808080"/>`).join('');
    const cell = (text, i, header) =>
      `<w:tc><w:tcPr><w:tcW w:w="${dxa[i]}" w:type="dxa"/>${header ? '<w:shd w:val="clear" w:color="auto" w:fill="E7ECEF"/>' : ''}</w:tcPr>${para('Odulieu', inline(header ? `**${text}**` : text))}</w:tc>`;
    const line = (cells, header) =>
      `<w:tr>${header ? '<w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>' : '<w:trPr><w:cantSplit/></w:trPr>'}${cells.map((c, i) => cell(c, i, header)).join('')}</w:tr>`;
    return `<w:tbl><w:tblPr><w:tblW w:w="${TEXT_WIDTH}" w:type="dxa"/><w:tblBorders>${border}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${dxa.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>${line(head, true)}${rows.map(r => line(r, false)).join('')}</w:tbl>${para('Normal', '', '<w:spacing w:after="60"/>')}`;
  }

  /*
   * Khối nội dung:
   *   ['h', 'I. Đặt vấn đề']      tiêu đề mục
   *   ['h2', '1. Thực trạng']     tiêu đề mục nhỏ
   *   ['p', 'Đoạn văn…']          đoạn văn
   *   ['li', ['ý 1', 'ý 2']]      gạch đầu dòng
   *   ['q', 'Trích dẫn']          đoạn trích
   *   ['tbl', 'Bảng 1. …', ['Cột 1', 'Cột 2'], [['a', 'b']], [2, 3]]
   */
  function blocksToXml(blocks) {
    return (blocks || []).map(block => {
      const [kind, a, b, c, d] = block;
      if (kind === 'h') return para('Heading1', run(a));
      if (kind === 'h2') return para('Heading2', run(a));
      if (kind === 'p') return para('Noidung', inline(a));
      if (kind === 'q') return para('Trichdan', inline(a));
      if (kind === 'li') return a.map(item => para('Danhsach', run('\u2013\u00a0') + inline(item))).join('');
      if (kind === 'tbl') return para('Chuthich', run(a)) + table(b, c, d);
      return '';
    }).join('');
  }

  function documentXml(doc) {
    const out = [];
    if (doc.category) out.push(para('Chuyenmuc', run(doc.category)));
    out.push(para('Tieude', run(doc.title || '')));
    if (doc.author) {
      out.push(para('Tacgia', run(doc.author, { b: true })));
      if (doc.agency) out.push(para('Tacgia', run(doc.agency, { i: true }), '<w:spacing w:after="160"/>'));
    }
    if (doc.abstract) out.push(para('Tomtat', run('Tóm tắt: ', { b: true, i: true }) + run(doc.abstract, { i: true })));
    if (doc.keywords) out.push(para('Tomtat', run('Từ khóa: ', { b: true, i: true }) + run(doc.keywords, { i: true }), '<w:spacing w:before="0" w:after="200"/>'));
    out.push(blocksToXml(doc.blocks));
    if (doc.refs && doc.refs.length) {
      out.push(para('Heading1', run('TÀI LIỆU THAM KHẢO')));
      doc.refs.forEach((ref, i) => out.push(para('Thamkhao', run(`[${i + 1}]\u00a0`) + run(ref))));
    }
    const section = `<w:sectPr><w:footerReference w:type="default" r:id="rId2"/><w:pgSz w:w="${PAGE.width}" w:h="${PAGE.height}"/><w:pgMar w:top="${PAGE.top}" w:right="${PAGE.right}" w:bottom="${PAGE.bottom}" w:left="${PAGE.left}" w:header="567" w:footer="567" w:gutter="0"/></w:sectPr>`;
    return XML + `<w:document ${NS}><w:body>${out.join('')}${section}</w:body></w:document>`;
  }

  const isoDate = value => {
    const d = value ? new Date(value) : new Date();
    return (isNaN(d) ? new Date() : d).toISOString().replace(/\.\d+Z$/, 'Z');
  };

  function coreXml(doc) {
    const stamp = isoDate(doc.created);
    return XML + `<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${esc(doc.title || '')}</dc:title><dc:creator>${esc(doc.author || '')}</dc:creator><cp:lastModifiedBy>${esc(doc.author || '')}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${stamp}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${stamp}</dcterms:modified></cp:coreProperties>`;
  }

  /*
   * Tạo tệp Word.
   * doc: { title, category, author, agency, abstract, keywords, blocks, refs, created }
   * Bản ẩn danh: không truyền author và agency, thuộc tính tệp cũng để trống tên người tạo.
   */
  function build(doc) {
    return zip([
      { name: '[Content_Types].xml', data: XML + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/><Override PartName="/word/footer1.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>' },
      { name: '_rels/.rels', data: XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>' },
      { name: 'word/document.xml', data: documentXml(doc) },
      { name: 'word/styles.xml', data: styles },
      { name: 'word/footer1.xml', data: footer },
      { name: 'word/_rels/document.xml.rels', data: XML + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer" Target="footer1.xml"/></Relationships>' },
      { name: 'docProps/core.xml', data: coreXml(doc) }
    ]);
  }

  /* Bài viết có thể chỉ có tên và tóm tắt (do người nộp nhập): tạo phần thân từ đoạn tóm tắt */
  function fromText(text) {
    return String(text || '').split(/\n{1,}/).map(s => s.trim()).filter(Boolean).map(s => ['p', s]);
  }

  function blob(doc) {
    return new Blob([build(doc)], { type: MIME });
  }

  return { MIME, build, blob, zip, crc32, fromText };
});
