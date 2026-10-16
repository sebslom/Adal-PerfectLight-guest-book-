import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { FormField, GuestEntry, PdfDocumentOption } from '../types';

export async function generateAndDownloadPdf(
  entry: GuestEntry,
  fields: FormField[],
  docOption: PdfDocumentOption
): Promise<void> {
  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const isEn = docOption.language === 'en';
  const isPerfectLight = docOption.brand === 'perfect_light';

  // Standard A4 dimensions in points: 595.28 x 841.89
  const PAGE_WIDTH = 595.28;
  const PAGE_HEIGHT = 841.89;

  // Render a specific page
  const renderPage = async (pageNum: 1 | 2) => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const { width, height } = page.getSize();

    // Background
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(1, 1, 1),
    });

    // Brand color
    const brandGold = isPerfectLight ? rgb(0.95, 0.60, 0.05) : rgb(0.72, 0.62, 0.42);
    const textDark = rgb(0.15, 0.18, 0.22);
    const lineGray = rgb(0.80, 0.82, 0.86);

    // Header on Page 1 or Page 2
    if (pageNum === 1) {
      if (isPerfectLight) {
        page.drawText('perfect light.', {
          x: 40,
          y: height - 60,
          size: 24,
          font: fontBold,
          color: textDark,
        });
      } else {
        page.drawText('Adal', {
          x: 40,
          y: height - 55,
          size: 32,
          font: fontBold,
          color: brandGold,
        });
        page.drawText('DECORATIONS', {
          x: 42,
          y: height - 68,
          size: 7.5,
          font: fontRegular,
          color: brandGold,
        });
      }

      page.drawText('GUEST BOOK 2026', {
        x: 40,
        y: height - 100,
        size: 16,
        font: fontBold,
        color: isPerfectLight ? rgb(0.9, 0.5, 0.1) : brandGold,
      });
      page.drawText('MAPIC 3 - 4.11.2026', {
        x: 40,
        y: height - 114,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.5),
      });
    } else {
      // Header Page 2
      page.drawText('GUEST BOOK 2026', {
        x: 40,
        y: height - 48,
        size: 16,
        font: fontBold,
        color: isPerfectLight ? rgb(0.9, 0.5, 0.1) : brandGold,
      });
      page.drawText('MAPIC 3 - 4.11.2026', {
        x: 40,
        y: height - 62,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.4, 0.45, 0.5),
      });

      if (isPerfectLight) {
        page.drawText('perfect light.', {
          x: width - 150,
          y: height - 52,
          size: 18,
          font: fontBold,
          color: textDark,
        });
      } else {
        page.drawText('Adal', {
          x: width - 120,
          y: height - 52,
          size: 24,
          font: fontBold,
          color: brandGold,
        });
      }
    }

    // Filter fields for this page
    const pageFields = fields.filter((f) => f.page === pageNum);

    for (const field of pageFields) {
      const fieldX = (field.x / 100) * width;
      const fieldW = (field.width / 100) * width;
      const fieldH = (field.height / 100) * height;
      const fieldY = height - ((field.y / 100) * height) - fieldH;

      const value = entry.data[field.name];

      if (field.type === 'checkbox') {
        const isChecked = value === true || value === 'true';
        page.drawRectangle({
          x: fieldX,
          y: fieldY + (fieldH / 2) - 5,
          width: 10,
          height: 10,
          borderColor: rgb(0.3, 0.35, 0.4),
          borderWidth: 1,
          color: isChecked ? rgb(0.15, 0.45, 0.85) : rgb(1, 1, 1),
        });

        if (isChecked) {
          page.drawText('X', {
            x: fieldX + 2,
            y: fieldY + (fieldH / 2) - 3,
            size: 7.5,
            font: fontBold,
            color: rgb(1, 1, 1),
          });
        }
      } else if (field.type === 'signature') {
        page.drawRectangle({
          x: fieldX,
          y: fieldY,
          width: fieldW,
          height: fieldH,
          borderColor: lineGray,
          borderWidth: 1,
          color: rgb(0.99, 0.99, 1),
        });

        if (entry.signatureDataUrl && entry.signatureDataUrl.startsWith('data:image/png')) {
          try {
            const base64Data = entry.signatureDataUrl.split(',')[1];
            const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
            const embeddedImage = await pdfDoc.embedPng(signatureBytes);

            const scale = Math.min((fieldW - 8) / embeddedImage.width, (fieldH - 8) / embeddedImage.height, 1);
            page.drawImage(embeddedImage, {
              x: fieldX + 4,
              y: fieldY + 4,
              width: embeddedImage.width * scale,
              height: embeddedImage.height * scale,
            });
          } catch (e) {
            console.error('Signature embed error', e);
          }
        }
      } else {
        // Text / Textarea / Date / Email
        const textVal = value !== undefined && value !== null ? String(value) : '';
        if (textVal) {
          // Clean accented chars for Standard Helvetica font
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
                x: fieldX + 3,
                y: curY,
                size: 8.5,
                font: fontRegular,
                color: textDark,
              });
              curY -= 11;
            }
          } else {
            page.drawText(cleanText.substring(0, 60), {
              x: fieldX + 3,
              y: fieldY + 4,
              size: 8.5,
              font: fontRegular,
              color: textDark,
            });
          }
        }
      }
    }

    // Bottom footer text
    const footerText = isPerfectLight
      ? 'Perfect Light Sp. z o.o. • Krakow, ul. Poznanska 10/130 • 30-012 Krakow • POLAND • perfect-light.pl'
      : 'ADAL Sp. z o.o. • Kozieglowki, ul. Lipowa 72 • 42-350 Kozieglowy • POLAND • adal-decorations.pl';

    page.drawText(footerText, {
      x: 35,
      y: 22,
      size: 7,
      font: fontRegular,
      color: rgb(0.5, 0.55, 0.6),
    });
  };

  // Render Page 1 and Page 2
  await renderPage(1);
  await renderPage(2);

  const pdfBytes = await pdfDoc.save();
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
