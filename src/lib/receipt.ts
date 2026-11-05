export interface ReceiptRow {
  label: string;
  value: string;
}

export interface ReceiptContent {
  title: string;
  amount: string;
  status: string;
  rows: ReceiptRow[];
  footer: string;
}

const WIDTH = 720;
const PADDING = 48;
const ROW_HEIGHT = 64;
const HEADER_HEIGHT = 300;
const FOOTER_HEIGHT = 96;
const FONT = '"Geist Variable", system-ui, -apple-system, sans-serif';

const RENDER_SCALE = 2;
const PDF_PAGE_WIDTH = 595.28;
const PDF_PAGE_HEIGHT = 841.89;
const PDF_MARGIN = 40;

export function receiptFileName(reference: string): string {
  const safe = reference.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return `comprobante-${safe || 'bloque'}.pdf`;
}

function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let end = text.length;
  while (end > 0 && ctx.measureText(`${text.slice(0, end)}…`).width > maxWidth)
    end -= 1;
  return `${text.slice(0, end)}…`;
}

export function drawReceipt(
  canvas: HTMLCanvasElement,
  content: ReceiptContent,
  scale = 1,
): void {
  const height =
    HEADER_HEIGHT + content.rows.length * ROW_HEIGHT + FOOTER_HEIGHT;
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.scale(scale, scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, WIDTH, height);

  ctx.fillStyle = '#0a0a0a';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText('Bloque', PADDING, 84);

  ctx.fillStyle = '#6b7280';
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(content.title, PADDING, 128);

  ctx.fillStyle = '#0a0a0a';
  ctx.textAlign = 'center';
  ctx.font = `700 52px ${FONT}`;
  ctx.fillText(
    fitText(ctx, content.amount, WIDTH - PADDING * 2),
    WIDTH / 2,
    214,
  );
  ctx.fillStyle = '#6b7280';
  ctx.font = `500 22px ${FONT}`;
  ctx.fillText(content.status, WIDTH / 2, 256);

  content.rows.forEach((row, index) => {
    const top = HEADER_HEIGHT + index * ROW_HEIGHT;
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(PADDING, top);
    ctx.lineTo(WIDTH - PADDING, top);
    ctx.stroke();

    const baseline = top + 40;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#6b7280';
    ctx.font = `500 20px ${FONT}`;
    ctx.fillText(row.label, PADDING, baseline);
    const labelWidth = ctx.measureText(row.label).width;

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0a0a0a';
    ctx.font = `600 20px ${FONT}`;
    ctx.fillText(
      fitText(ctx, row.value, WIDTH - PADDING * 2 - labelWidth - 24),
      WIDTH - PADDING,
      baseline,
    );
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#9ca3af';
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText(content.footer, WIDTH / 2, height - 40);
}

/**
 * Wraps a JPEG in a one-page A4 PDF. PDF viewers decode JPEG natively
 * (`/DCTDecode`), so the image bytes are embedded as-is.
 */
export function buildReceiptPdf(
  jpeg: Uint8Array,
  imageWidth: number,
  imageHeight: number,
): Uint8Array {
  const maxWidth = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
  const maxHeight = PDF_PAGE_HEIGHT - PDF_MARGIN * 2;
  const ratio = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
  const drawWidth = imageWidth * ratio;
  const drawHeight = imageHeight * ratio;
  const x = (PDF_PAGE_WIDTH - drawWidth) / 2;
  const y = PDF_PAGE_HEIGHT - PDF_MARGIN - drawHeight;
  const n = (value: number) => value.toFixed(2);

  const encoder = new TextEncoder();
  const content = `q ${n(drawWidth)} 0 0 ${n(drawHeight)} ${n(x)} ${n(y)} cm /Im0 Do Q`;
  const objects: Array<Array<string | Uint8Array>> = [
    ['<< /Type /Catalog /Pages 2 0 R >>'],
    ['<< /Type /Pages /Kids [3 0 R] /Count 1 >>'],
    [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(PDF_PAGE_WIDTH)} ${n(PDF_PAGE_HEIGHT)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
    ],
    [
      `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`,
      jpeg,
      '\nendstream',
    ],
    [`<< /Length ${content.length} >>\nstream\n${content}\nendstream`],
  ];

  const chunks: Uint8Array[] = [];
  let length = 0;
  const push = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    chunks.push(bytes);
    length += bytes.length;
  };

  push('%PDF-1.4\n');
  const offsets = objects.map((parts, index) => {
    const offset = length;
    push(`${index + 1} 0 obj\n`);
    for (const part of parts) push(part);
    push('\nendobj\n');
    return offset;
  });

  const xrefOffset = length;
  push(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`);
  for (const offset of offsets) {
    push(`${String(offset).padStart(10, '0')} 00000 n \n`);
  }
  push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  const pdf = new Uint8Array(length);
  let cursor = 0;
  for (const chunk of chunks) {
    pdf.set(chunk, cursor);
    cursor += chunk.length;
  }
  return pdf;
}

export async function downloadReceipt(
  content: ReceiptContent,
  fileName: string,
): Promise<void> {
  const canvas = document.createElement('canvas');
  drawReceipt(canvas, content, RENDER_SCALE);
  const jpegBlob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', 0.92),
  );
  if (!jpegBlob) throw new Error('Could not encode receipt image');

  const jpeg = new Uint8Array(await jpegBlob.arrayBuffer());
  const pdf = buildReceiptPdf(jpeg, canvas.width, canvas.height);
  const url = URL.createObjectURL(
    new Blob([pdf.buffer as ArrayBuffer], { type: 'application/pdf' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
