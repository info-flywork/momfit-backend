const MAX_CHARS = 12000;

function truncate(text) {
  const cleaned = String(text || '')
    .replace(/\u0000/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (cleaned.length <= MAX_CHARS) return cleaned;
  return `${cleaned.slice(0, MAX_CHARS)}\n\n[…belge kısaltıldı…]`;
}

function looksLikeDocx(mimeType, fileName) {
  const name = (fileName || '').toLowerCase();
  return (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  );
}

function looksLikePdf(mimeType, fileName) {
  const name = (fileName || '').toLowerCase();
  return mimeType === 'application/pdf' || name.endsWith('.pdf');
}

function looksLikeText(mimeType, fileName) {
  const name = (fileName || '').toLowerCase();
  return (
    mimeType === 'text/plain' ||
    mimeType === 'text/csv' ||
    mimeType === 'text/markdown' ||
    name.endsWith('.txt') ||
    name.endsWith('.md') ||
    name.endsWith('.csv')
  );
}

/**
 * Belge buffer'ından okunabilir metin çıkarır.
 * @returns {Promise<string|null>}
 */
async function extractDocumentText({ base64, mimeType, fileName }) {
  if (!base64) return null;

  try {
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) return null;

    if (looksLikeText(mimeType, fileName)) {
      return truncate(buffer.toString('utf8'));
    }

    if (looksLikePdf(mimeType, fileName)) {
      const { PDFParse } = require('pdf-parse');
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        const text = truncate(result?.text || '');
        return text || null;
      } finally {
        await parser.destroy().catch(() => {});
      }
    }

    if (looksLikeDocx(mimeType, fileName)) {
      const mammoth = require('mammoth');
      const result = await mammoth.extractRawText({ buffer });
      const text = truncate(result?.value || '');
      return text || null;
    }

    // Son çare: UTF-8 metin gibi dene (bazı belgeler yanlış mime ile gelebilir).
    const asText = buffer.toString('utf8');
    if (asText && !asText.includes('\uFFFD') && /[A-Za-zÀ-ÿĞÜŞİÖÇğüşıöç0-9]/.test(asText)) {
      return truncate(asText);
    }

    return null;
  } catch (err) {
    console.warn('[document] extract failed:', err.message);
    return null;
  }
}

module.exports = { extractDocumentText };
