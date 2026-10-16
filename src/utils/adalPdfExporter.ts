import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FormField, GuestEntry, PdfDocumentOption } from '../types';

export async function generateAndDownloadPdf(
  entry: GuestEntry,
  fields: FormField[],
  docOption: PdfDocumentOption
): Promise<void> {
  let pdfDoc: PDFDocument;
  let useExistingTemplate = false;

  // Try loading real original PDF template from local / public or raw GitHub
  if (docOption.pdfFileName) {
    const candidates = [
      `./${docOption.pdfFileName}`,
      `/${docOption.pdfFileName}`,
      `https://raw.githubusercontent.com/sebslom/Adal-PerfectLight-guest-book-/main/${docOption.pdfFileName}`
    ];

    for (const url of candidates) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const buffer = await res.arrayBuffer();
          pdfDoc = await PDFDocument.load(buffer);
          useExistingTemplate = true;
          break;
        }
      } catch {
        // try next candidate
      }
    }
  }

  // Fallback: create fresh PDF document if template not loaded
  if (!useExistingTemplate) {
    pdfDoc = await PDFDocument.create();
  }

  const fontRegular = await pdfDoc!.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc!.embedFont(StandardFonts.HelveticaBold);

  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;

  // Ensure 2 pages exist
  if (!useExistingTemplate) {
    pdfDoc!.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pdfDoc!.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  }

  const pages = pdfDoc!.getPages();

  // Draw fields on Page 1 and Page 2
  for (let pageNum = 1; pageNum <= Math.min(2, pages.length); pageNum++) {
    const page = pages[pageNum - 1];
    const { width, height } = page.getSize();

    const pageFields = fields.filter((f) => f.page === pageNum);

    for (const field of pageFields) {
      const fieldX = (field.x / 100) * width;
      const fieldW = (field.width / 100) * width;
      const fieldH = (field.height / 100) * height;
      const fieldY = height - ((field.y / 100) * height) - fieldH;

      const value = entry.data[field.name];

      if (field.type === 'checkbox') {
        const isChecked = value === true || value === 'true';
        if (isChecked) {
          page.drawText('X', {
            x: fieldX + 1.5,
            y: fieldY + (fieldH / 2) - 3,
            size: 9,
            font: fontBold,
            color: rgb(0.1, 0.4, 0.85),
          });
        }
      } else if (field.type === 'signature') {
        if (entry.signatureDataUrl && entry.signatureDataUrl.startsWith('data:image/png')) {
          try {
            const base64Data = entry.signatureDataUrl.split(',')[1];
            const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const embeddedImage = await pdfDoc!.embedPng(signatureBytes);

            const scale = Math.min((fieldW - 6) / embeddedImage.width, (fieldH - 6) / embeddedImage.height, 1);
            page.drawImage(embeddedImage, {
              x: fieldX + 3,
              y: fieldY + 3,
              width: embeddedImage.width * scale,
              height: embeddedImage.height * scale,
            });
          } catch (e) {
            console.error('Signature embed error', e);
          }
        }
      } else {
        const textVal = value !== undefined && value !== null ? String(value) : '';
        if (textVal) {
          const cleanText = textVal
            .replace(/ą/g, 'a').replace(/Ą/g, 'A')
            .replace(/ć/g, 'c').replace(/Ć/g, 'C')
            .replace(/ę/g, 'e').replace(/Ę/g, 'E')
            .replace(/ł/g, 'l').replace(/Ł/g, 'L')
            .replace(/ń/g, 'n').replace(/Ń/g, 'N')
            .replace(/ó/g, 'o').replace(/Ó/g, 'O')
            .replace(/ś/g, 's').replace(/Ś/g, 'S')
            .replace(/ź/g, 'z').replace(/Ź/g, 'Z')
            .replace(/ż/g, 'z').replace(/Ż/g, 'Z');

          if (field.type === 'textarea') {
            const lines = cleanText.split('\n');
            let curY = fieldY + fieldH - 12;
            for (const line of lines) {
              if (curY < fieldY + 2) break;
              page.drawText(line.substring(0, 85), {
                x: fieldX + 2,
                y: curY,
                size: 8.5,
                font: fontRegular,
                color: rgb(0.1, 0.15, 0.2),
              });
              curY -= 11;
            }
          } else {
            page.drawText(cleanText.substring(0, 60), {
              x: fieldX + 2,
              y: fieldY + 3,
              size: 8.5,
              font: fontRegular,
              color: rgb(0.1, 0.15, 0.2),
            });
          }
        }
      }
    }
  }

  const pdfBytes = await pdfDoc!.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const guestName = (entry.data.contactPerson || entry.data.companyName || 'guest').replace(/\s+/g, '_');
  a.download = `${docOption.id}_${guestName}_${new Date().toISOString().split('T')[0]}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
