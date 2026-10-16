import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export async function renderPdfToImageUrls(
  source: string | ArrayBuffer | Uint8Array
): Promise<{ page1: string; page2?: string; totalPages: number }> {
  try {
    let loadingTask;
    if (typeof source === 'string') {
      loadingTask = pdfjsLib.getDocument({ url: source });
    } else {
      loadingTask = pdfjsLib.getDocument({ data: source });
    }

    const pdf = await loadingTask.promise;
    const totalPages = pdf.numPages;

    const renderPage = async (pageNumber: number): Promise<string> => {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2.0 }); // high resolution

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      if (!context) throw new Error('Could not get canvas context');

      await page.render({
        canvasContext: context,
        viewport,
        canvas,
      } as any).promise;

      return canvas.toDataURL('image/png');
    };

    const page1 = await renderPage(1);
    let page2: string | undefined;
    if (totalPages >= 2) {
      page2 = await renderPage(2);
    }

    return { page1, page2, totalPages };
  } catch (err) {
    console.error('Error rendering PDF to images with pdfjs:', err);
    throw err;
  }
}
