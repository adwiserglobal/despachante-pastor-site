// Exportação do formulário de visto em PDF (impressão) e DOCX, na ordem original do questionário.

const FILE_FIELDS = new Set(['passport_file', 'previous_visa_file', 'other_nationality_file']);

function humanValue(value) {
  if (value === true || value === 'sim') return 'Sim';
  if (value === false || value === 'nao') return 'Não';
  if (Array.isArray(value)) return value.join(', ');
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value == null || value === '' ? '—' : String(value);
}

function isEmpty(value) {
  return value === undefined || value === null || value === '' || value === false;
}

function fieldVisible(field, data) {
  if (!field.showIf) return true;
  return Object.entries(field.showIf).every(([key, expected]) => (data[key] ?? false) === expected);
}

// Agrupa as respostas por etapa, seguindo a sequência de preenchimento do cliente.
export function buildVisaSections(formData = {}, fallbackLabels = {}) {
  const steps = window.VISA_STEPS || [];
  const known = new Set();
  const sections = [];

  steps.forEach((step) => {
    const items = [];
    step.fields.forEach((field) => {
      known.add(field.name);
      const value = formData[field.name];
      if (!fieldVisible(field, formData) && isEmpty(value)) return;
      const isFile = field.type === 'file' || FILE_FIELDS.has(field.name);
      items.push({
        key: field.name,
        label: field.label,
        isFile,
        hasFile: isFile && !!value,
        value: isFile ? (value ? 'Documento anexado' : 'Não anexado') : (field.type === 'checkbox' ? (value ? 'Aceita' : 'Não aceita') : humanValue(value)),
      });
    });
    if (items.length) sections.push({ title: step.title, items });
  });

  const extra = Object.keys(formData).filter((key) => !known.has(key) && !isEmpty(formData[key]));
  if (extra.length) {
    sections.push({
      title: 'Outras informações',
      items: extra.map((key) => ({
        key,
        label: fallbackLabels[key] || key.replaceAll('_', ' '),
        isFile: FILE_FIELDS.has(key),
        hasFile: FILE_FIELDS.has(key) && !!formData[key],
        value: FILE_FIELDS.has(key) ? 'Documento anexado' : humanValue(formData[key]),
      })),
    });
  }
  return sections;
}

const esc = (value) => String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function slug(text) {
  return String(text || 'visto').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'visto';
}

// ---------- PDF (via impressão do navegador: "Salvar como PDF") ----------
export function exportVisaPdf({ title, meta, sections }) {
  const body = sections.map((section) => `
    <section><h2>${esc(section.title)}</h2>
    <table>${section.items.map((item) => `<tr><th>${esc(item.label)}</th><td>${esc(item.value)}</td></tr>`).join('')}</table></section>`).join('');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(title)} - Formulário de visto</title>
<style>
@page{size:A4;margin:16mm 14mm}
*{box-sizing:border-box}
body{margin:0;font:12px/1.5 Arial,Helvetica,sans-serif;color:#14233b}
header{padding-bottom:12px;margin-bottom:14px;border-bottom:3px solid #c9a24d}
header small{color:#9a7430;font-weight:700;letter-spacing:.14em;font-size:10px}
header h1{margin:4px 0 4px;font-size:22px;color:#071b3a}
header p{margin:0;color:#5b6a80;font-size:11px}
section{margin-bottom:16px}
h2{margin:0 0 6px;padding:6px 10px;background:#071b3a;color:#fff;font-size:13px;border-radius:4px;break-after:avoid}
table{width:100%;border-collapse:collapse}
tr{break-inside:avoid}
th,td{padding:6px 8px;border:1px solid #dbe2ec;vertical-align:top;text-align:left}
th{width:38%;background:#f3f6fa;font-weight:700;color:#33465f}
td{white-space:pre-wrap;overflow-wrap:anywhere}
footer{margin-top:18px;color:#8a94a3;font-size:10px;text-align:center}
</style></head><body>
<header><small>DESPACHANTE PASTOR · FORMULÁRIO DE VISTO</small><h1>${esc(title)}</h1><p>${esc(meta)}</p></header>
${body}
<footer>Documento gerado pela área interna em ${esc(new Date().toLocaleString('pt-BR'))}</footer>
</body></html>`;
  const popup = window.open('', '_blank');
  if (!popup) throw new Error('Permita pop-ups para exportar o PDF.');
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  popup.focus();
  setTimeout(() => popup.print(), 350);
}

// ---------- DOCX ----------
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// ZIP sem compressão (método "store"), suficiente para um .docx válido.
function zipStore(files) {
  const encoder = new TextEncoder();
  const chunks = [];
  const central = [];
  let offset = 0;
  const now = new Date();
  const dosTime = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const dosDate = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();

  files.forEach(({ name, content }) => {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true);
    local.setUint16(8, 0, true);
    local.setUint16(10, dosTime, true);
    local.setUint16(12, dosDate, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, nameBytes.length, true);
    local.setUint16(28, 0, true);
    chunks.push(new Uint8Array(local.buffer), nameBytes, data);

    const entry = new DataView(new ArrayBuffer(46));
    entry.setUint32(0, 0x02014b50, true);
    entry.setUint16(4, 20, true);
    entry.setUint16(6, 20, true);
    entry.setUint16(8, 0x0800, true);
    entry.setUint16(10, 0, true);
    entry.setUint16(12, dosTime, true);
    entry.setUint16(14, dosDate, true);
    entry.setUint32(16, crc, true);
    entry.setUint32(20, data.length, true);
    entry.setUint32(24, data.length, true);
    entry.setUint16(28, nameBytes.length, true);
    entry.setUint32(42, offset, true);
    central.push(new Uint8Array(entry.buffer), nameBytes);
    offset += 30 + nameBytes.length + data.length;
  });

  const centralSize = central.reduce((sum, part) => sum + part.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, centralSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, new Uint8Array(end.buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

const x = (text) => String(text).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function run(text, { bold = false, size = 20, color = '14233B' } = {}) {
  const lines = String(text).split('\n');
  const inner = lines.map((line, i) => `${i ? '<w:br/>' : ''}<w:t xml:space="preserve">${x(line)}</w:t>`).join('');
  return `<w:r><w:rPr>${bold ? '<w:b/>' : ''}<w:color w:val="${color}"/><w:sz w:val="${size}"/></w:rPr>${inner}</w:r>`;
}

function paragraph(text, options = {}, props = '') {
  return `<w:p><w:pPr>${props}</w:pPr>${run(text, options)}</w:p>`;
}

function cell(width, content, fill) {
  return `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/>${fill ? `<w:shd w:val="clear" w:color="auto" w:fill="${fill}"/>` : ''}</w:tcPr>${content}</w:tc>`;
}

export function exportVisaDocx({ title, meta, sections }) {
  const border = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map((side) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="DBE2EC"/>`).join('');
  const spacing = (before, after) => `<w:spacing w:before="${before}" w:after="${after}"/>`;

  const parts = [
    paragraph('DESPACHANTE PASTOR · FORMULÁRIO DE VISTO', { bold: true, size: 16, color: '9A7430' }, spacing(0, 40)),
    paragraph(title, { bold: true, size: 40, color: '071B3A' }, spacing(0, 40)),
    paragraph(meta, { size: 18, color: '5B6A80' }, `${spacing(0, 240)}<w:pBdr><w:bottom w:val="single" w:sz="18" w:space="6" w:color="C9A24D"/></w:pBdr>`),
  ];

  sections.forEach((section) => {
    parts.push(`<w:p><w:pPr><w:keepNext/>${spacing(240, 100)}<w:shd w:val="clear" w:color="auto" w:fill="071B3A"/></w:pPr>${run(` ${section.title}`, { bold: true, size: 24, color: 'FFFFFF' })}</w:p>`);
    const rows = section.items.map((item) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${cell(3500, paragraph(item.label, { bold: true, size: 19, color: '33465F' }, spacing(40, 40)), 'F3F6FA')}${cell(5526, paragraph(item.value, { size: 20 }, spacing(40, 40)))}</w:tr>`).join('');
    parts.push(`<w:tbl><w:tblPr><w:tblW w:w="9026" w:type="dxa"/><w:tblBorders>${border}</w:tblBorders><w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid><w:gridCol w:w="3500"/><w:gridCol w:w="5526"/></w:tblGrid>${rows}</w:tbl>`);
  });
  parts.push(paragraph(`Documento gerado pela área interna em ${new Date().toLocaleString('pt-BR')}`, { size: 16, color: '8A94A3' }, `${spacing(300, 0)}<w:jc w:val="center"/>`));

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${parts.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1440" w:bottom="1134" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;

  const blob = zipStore([
    { name: '[Content_Types].xml', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>' },
    { name: '_rels/.rels', content: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>' },
    { name: 'word/document.xml', content: documentXml },
  ]);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `visto-${slug(title)}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
