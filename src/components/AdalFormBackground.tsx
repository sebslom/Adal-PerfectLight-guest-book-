import React, { useState, useEffect } from 'react';
import { PdfDocumentOption } from '../types';
import { renderPdfToImageUrls } from '../utils/pdfRenderer';

interface AdalFormBackgroundProps {
  docOption: PdfDocumentOption;
  page: 1 | 2;
  customBackgroundUrl?: string | null;
}

// Global cache for rendered PDF page images so we only render each PDF once
const renderedPdfCache: Record<string, { page1: string; page2?: string }> = {};

export const AdalFormBackground: React.FC<AdalFormBackgroundProps> = ({
  docOption,
  page,
  customBackgroundUrl,
}) => {
  const [renderedImage, setRenderedImage] = useState<string | null>(null);

  useEffect(() => {
    // If a custom background image is explicitly provided, use that
    if (customBackgroundUrl) {
      setRenderedImage(customBackgroundUrl);
      return;
    }

    // If docOption has a pdfFileName, try rendering the actual PDF
    if (docOption.pdfFileName) {
      const cacheKey = docOption.pdfFileName;
      if (renderedPdfCache[cacheKey]) {
        const cached = renderedPdfCache[cacheKey];
        setRenderedImage(page === 1 ? cached.page1 : (cached.page2 || cached.page1));
        return;
      }

      // Try fetching the local file or raw GitHub file
      const fetchAndRender = async () => {
        try {
          const candidates = [
            `./${docOption.pdfFileName}`,
            `/${docOption.pdfFileName}`,
            `https://raw.githubusercontent.com/sebslom/Adal-PerfectLight-guest-book-/main/${docOption.pdfFileName}`
          ];

          let buffer: ArrayBuffer | null = null;
          for (const url of candidates) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                buffer = await res.arrayBuffer();
                break;
              }
            } catch {
              // try next
            }
          }

          if (buffer) {
            const { page1, page2 } = await renderPdfToImageUrls(buffer);
            renderedPdfCache[cacheKey] = { page1, page2 };
            setRenderedImage(page === 1 ? page1 : (page2 || page1));
          }
        } catch (err) {
          console.warn('Could not render PDF via PDF.js, using SVG template fallback:', err);
        }
      };

      fetchAndRender();
    }
  }, [docOption.pdfFileName, customBackgroundUrl, page]);

  // If a rendered real PDF page image is available, render it with 100% fidelity
  if (renderedImage) {
    return (
      <div className="w-full h-full relative select-none pointer-events-none bg-white overflow-hidden flex items-center justify-center">
        <img
          src={renderedImage}
          alt={`PDF Sheet Page ${page}`}
          className="w-full h-full object-contain pointer-events-none"
        />
      </div>
    );
  }

  // Fallback: high-contrast SVG template
  const isEn = docOption.language === 'en';
  const isPerfectLight = docOption.brand === 'perfect_light';
  const brandGold = isPerfectLight ? '#d97706' : '#b49c68';
  const brandGoldDark = isPerfectLight ? '#b45309' : '#9b8450';

  return (
    <div className="w-full h-full relative select-none pointer-events-none bg-white text-slate-800 font-sans p-8 flex flex-col justify-between overflow-hidden shadow-inner">
      {page === 1 ? (
        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            <div className="pt-2">
              {isPerfectLight ? (
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 relative">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                      <circle cx="50" cy="50" r="11" fill="#f59e0b" />
                      <circle cx="36" cy="38" r="7.5" fill="#d97706" />
                      <circle cx="64" cy="38" r="6.5" fill="#f59e0b" />
                      <circle cx="34" cy="58" r="8.5" fill="#ea580c" />
                      <circle cx="63" cy="58" r="7.5" fill="#f59e0b" />
                      <circle cx="50" cy="27" r="5.5" fill="#f97316" />
                      <circle cx="50" cy="73" r="6.5" fill="#d97706" />
                      <circle cx="23" cy="48" r="5.5" fill="#f59e0b" />
                      <circle cx="77" cy="48" r="6" fill="#f97316" />
                      <circle cx="27" cy="31" r="5" fill="#fbbf24" />
                      <circle cx="73" cy="31" r="4.5" fill="#f59e0b" />
                      <circle cx="27" cy="67" r="4.5" fill="#ea580c" />
                      <circle cx="73" cy="67" r="5" fill="#d97706" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-slate-900 tracking-tight font-sans">
                      perfect light.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  <span 
                    className="text-5xl font-black tracking-wide"
                    style={{ color: brandGold, fontFamily: 'serif' }}
                  >
                    Adal
                  </span>
                  <span 
                    className="text-[11px] uppercase tracking-widest font-medium -mt-1 ml-1"
                    style={{ color: brandGold }}
                  >
                    decorations
                  </span>
                </div>
              )}
            </div>

            <div className="mt-4">
              <h1 
                className="text-2xl font-normal tracking-wide"
                style={{ color: brandGoldDark }}
              >
                GUEST BOOK 2026
              </h1>
              <p className="text-xs text-slate-500 font-normal mt-0.5">
                MAPIC 3 - 4.11.2026
              </p>
            </div>
          </div>

          <div className="relative flex-1 mt-6 text-[13px] text-slate-800 space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-2 w-[45%]">
                <span className="font-semibold text-slate-900">{isEn ? 'Date:' : 'Data:'}</span>
                <div className="flex-1 border-b border-slate-300 pb-0.5" />
              </div>
              <div className="flex items-end gap-2 w-[52%]">
                <span className="font-semibold text-slate-900">{isEn ? 'Contact Person:' : 'Osoba kontaktowa:'}</span>
                <div className="flex-1 border-b border-slate-300 pb-0.5" />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex items-end gap-2 w-[45%]">
                <span className="font-semibold text-slate-900">{isEn ? 'Country:' : 'Kraj:'}</span>
                <div className="flex-1 border-b border-slate-300 pb-0.5" />
              </div>
              <div className="flex items-end gap-2 w-[52%]">
                <span className="font-semibold text-slate-900">{isEn ? 'Company Name:' : 'Nazwa firmy:'}</span>
                <div className="flex-1 border-b border-slate-300 pb-0.5" />
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div className="flex items-end gap-2 w-[45%]">
                <span className="font-semibold text-slate-900">{isEn ? 'Email:' : 'Email:'}</span>
                <div className="flex-1 border-b border-slate-300 pb-0.5" />
              </div>
              <div className="flex items-end gap-2 w-[52%]">
                <span className="font-semibold text-slate-900">{isEn ? 'Phone:' : 'Telefon:'}</span>
                <div className="flex-1 border-b border-slate-300 pb-0.5" />
              </div>
            </div>

            <div className="pt-2 flex items-center text-xs gap-4 text-slate-700">
              <span className="font-semibold text-slate-900">
                {isEn ? 'Catalogue to send:' : 'Katalog do wysłania:'}
              </span>
              <div className="flex items-center gap-1.5 ml-2">
                <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                <span>{isEn ? 'Digital' : 'Cyfrowy'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                <span>{isEn ? 'Printed' : 'Drukowany'}</span>
              </div>
              <span className="text-slate-300 mx-1">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                <span>{isEn ? 'Christmas trees & greenery products' : 'Choinki i produkty z zieleni'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                <span>{isEn ? 'Decor products' : 'Produkty dekoracyjne'}</span>
              </div>
            </div>

            <div className="flex items-end gap-2">
              <span className="font-semibold text-slate-900">{isEn ? 'Adress line 1:' : 'Adres 1:'}</span>
              <div className="flex-1 border-b border-slate-300 pb-0.5" />
            </div>
            <div className="flex items-end gap-2">
              <span className="font-semibold text-slate-900">{isEn ? 'Adress line 2:' : 'Adres 2:'}</span>
              <div className="flex-1 border-b border-slate-300 pb-0.5" />
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between text-xs text-slate-800">
                <span>{isEn ? 'Are you insterested in seasonal decorations?' : 'Czy interesują Cię dekoracje sezonowe?'}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Yes' : 'Tak'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'No' : 'Nie'}</span>
                  </div>
                </div>
                <span className="text-[11px] text-slate-500">
                  {isEn ? 'If yes, please specify which' : 'Jeśli tak, proszę podać, które'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2 text-[11px] text-slate-600 px-4">
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                  <span>{isEn ? "Valentine's Day" : 'Walentynki'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                  <span>{isEn ? 'Easter' : 'Wielkanoc'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                  <span>{isEn ? 'Spring' : 'Wiosna'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                  <span>{isEn ? 'Summer' : 'Lato'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                  <span>Halloween</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                  <span>{isEn ? 'Autumn' : 'Jesień'}</span>
                </div>
              </div>
            </div>

            <div className="pt-1">
              <div className="flex items-center justify-between text-xs text-slate-800">
                <span>{isEn ? 'Would you like to visit our ofice and showroom?' : 'Czy chcieliby Państwo odwiedzić nasze biuro i salon wystawowy?'}</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Yes' : 'Tak'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'No' : 'Nie'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-end gap-2 text-xs mt-2">
                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                  {isEn ? 'If yes, please specify a preferred time period:' : 'Jeśli tak, proszę podać preferowany okres:'}
                </span>
                <div className="flex-1 border-b border-slate-300 pb-0.5" />
              </div>
            </div>

            <div className="pt-4 text-center">
              <h3 
                className="text-lg font-normal tracking-wide"
                style={{ color: brandGoldDark }}
              >
                {isEn ? 'Notes / Project Ideas' : 'Notatki / Pomysły na projekty'}
              </h3>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex-1 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 
                  className="text-2xl font-normal tracking-wide"
                  style={{ color: brandGoldDark }}
                >
                  GUEST BOOK 2026
                </h1>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  MAPIC 3 - 4.11.2026
                </p>
              </div>

              <div>
                {isPerfectLight ? (
                  <div className="flex items-center gap-2">
                    <div className="w-12 h-12">
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        <circle cx="50" cy="50" r="11" fill="#f59e0b" />
                        <circle cx="36" cy="38" r="7.5" fill="#d97706" />
                        <circle cx="64" cy="38" r="6.5" fill="#f59e0b" />
                        <circle cx="34" cy="58" r="8.5" fill="#ea580c" />
                        <circle cx="63" cy="58" r="7.5" fill="#f59e0b" />
                        <circle cx="50" cy="27" r="5.5" fill="#f97316" />
                        <circle cx="50" cy="73" r="6.5" fill="#d97706" />
                      </svg>
                    </div>
                    <span className="text-xl font-black text-slate-900 tracking-tight">
                      perfect light.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col items-end">
                    <span 
                      className="text-4xl font-black tracking-wide"
                      style={{ color: brandGold, fontFamily: 'serif' }}
                    >
                      Adal
                    </span>
                    <span 
                      className="text-[10px] uppercase tracking-widest font-medium -mt-1"
                      style={{ color: brandGold }}
                    >
                      decorations
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-center">
              <h3 
                className="text-lg font-normal tracking-wide"
                style={{ color: brandGoldDark }}
              >
                {isEn ? 'Notes / Project Ideas' : 'Notatki / Pomysły na projekty'}
              </h3>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <h4 
                className="text-base font-normal mb-2"
                style={{ color: brandGoldDark }}
              >
                {isEn ? 'Summary' : 'Podsumowanie'}
              </h4>

              <div className="space-y-3">
                <div className="flex items-end gap-2">
                  <span className="font-semibold text-slate-900">{isEn ? 'Project Budget:' : 'Budżet projektu:'}</span>
                  <div className="flex-1 border-b border-slate-300 pb-0.5" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="font-semibold text-slate-900">{isEn ? 'Deadline:' : 'Termin:'}</span>
                  <div className="flex-1 border-b border-slate-300 pb-0.5" />
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <span className="font-semibold text-slate-900">{isEn ? 'Sales Season:' : 'Sezon wyprzedaży:'}</span>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                      <span>Q1</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                      <span>Q2</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                      <span>Q3</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                      <span>Q4</span>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-slate-900 w-24">{isEn ? 'Project Type:' : 'Rodzaj projektu:'}</span>
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                        <span>{isEn ? 'City' : 'Miasto'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                        <span>{isEn ? 'Shopping Center' : 'Centrum handlowe'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                        <span>{isEn ? 'Other' : 'Inny'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="w-24" />
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                        <span>{isEn ? 'Event' : 'Wydarzenie'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                        <span>{isEn ? 'Hotel / Resort' : 'Hotel / Ośrodek wypoczynkowy'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                        <span>{isEn ? 'Retail Chain' : 'Sieć handlowa'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-baseline justify-between mb-2">
                <h4 
                  className="text-base font-normal"
                  style={{ color: brandGoldDark }}
                >
                  {isEn ? 'Survey' : 'Ankieta'}
                </h4>
                <p className="text-[10px] text-slate-500 italic max-w-xs text-right">
                  {isEn 
                    ? 'Please select only two boxes, specifying which is more important to you (1, 2).'
                    : 'Proszę zaznaczyć tylko dwa pola, podając co jest dla Ciebie ważniejsze (1, 2).'}
                </p>
              </div>

              <div className="space-y-1 mt-2">
                <p className="text-[11px] text-slate-700 font-medium">
                  {isEn ? 'What is most important to you as our bussines partner?' : 'Co jest dla Ciebie najważniejsze jako naszego partnera biznesowego?'}
                </p>
                <div className="flex items-center gap-5 text-[11px] text-slate-600 pl-2">
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Price' : 'Cena'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Quality' : 'Jakość'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Production speed' : 'Prędkość produkcji'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>Design</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Other' : 'Inne'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1 mt-3">
                <p className="text-[11px] text-slate-700 font-medium">
                  {isEn ? 'What do you value ADAL for?' : 'Za co cenisz firmę ADAL?'}
                </p>
                <div className="flex items-center gap-5 text-[11px] text-slate-600 pl-2">
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Price' : 'Cena'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Quality' : 'Jakość'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Production speed' : 'Prędkość produkcji'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>Design</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-3.5 h-3.5 border border-slate-400 rounded-2xs inline-block bg-white" />
                    <span>{isEn ? 'Other' : 'Inne'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 pt-4 mt-2 border-t border-slate-200 text-center text-[10px] text-slate-400">
        {isPerfectLight ? (
          <p>
            Perfect Light Sp. z o.o. • Kraków, ul. Poznańska 10/130 • 30-012 Kraków • POLAND • perfect-light.pl
          </p>
        ) : (
          <p>
            ADAL Sp. z o.o. • Koziegłówki, ul. Lipowa 72 • 42-350 Koziegłowy • POLAND • adal-decorations.pl
          </p>
        )}
      </div>
    </div>
  );
};
