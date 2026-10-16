import React, { useState, useRef, useEffect } from 'react';
import { AppMode, Language, PdfDocumentOption } from '../types';
import { translations } from '../utils/translations';
import { predefinedDocuments } from '../utils/defaultTemplates';
import { 
  Lock, 
  RotateCcw, 
  Download, 
  Save, 
  History, 
  Languages, 
  ChevronLeft, 
  ChevronRight,
  Sliders
} from 'lucide-react';

interface NavbarProps {
  mode: AppMode;
  language: Language;
  onToggleLanguage: () => void;
  selectedDocId: string;
  onSelectDocId: (id: string) => void;
  customDocs: Record<string, PdfDocumentOption>;
  activePage: 1 | 2;
  onPageChange: (page: 1 | 2) => void;
  totalPages?: number;
  onOpenHistory: () => void;
  entriesCount: number;
  onClearForm: () => void;
  onDownloadPdf: () => void;
  onSaveNewGuest: () => void;
  isGeneratingPdf?: boolean;
  onUnlockEditMode: () => void;
  onExitDesigner: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  mode,
  language,
  onToggleLanguage,
  selectedDocId,
  onSelectDocId,
  customDocs,
  activePage,
  onPageChange,
  totalPages = 2,
  onOpenHistory,
  entriesCount,
  onClearForm,
  onDownloadPdf,
  onSaveNewGuest,
  isGeneratingPdf,
  onUnlockEditMode,
  onExitDesigner,
}) => {
  const t = translations[language];

  // Stealth 10-clicks within 3 seconds logic
  const [clickCount, setClickCount] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSecretLockClick = () => {
    if (mode === 'designer') {
      onExitDesigner();
      return;
    }

    if (clickCount === 0) {
      // First click: start strict 3000ms window
      setClickCount(1);
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        setClickCount(0);
      }, 3000);
    } else {
      const next = clickCount + 1;
      if (next >= 10) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setClickCount(0);
        onUnlockEditMode();
      } else {
        setClickCount(next);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-3 md:px-5 flex items-center justify-between text-slate-800 shrink-0 shadow-2xs select-none">
      {/* LEFT: Simple Select Dropdown for PDF Selection */}
      <div className="flex items-center gap-2">
        <select
          value={selectedDocId}
          onChange={(e) => onSelectDocId(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 focus:outline-hidden focus:border-blue-600 focus:ring-1 focus:ring-blue-500 cursor-pointer transition shadow-2xs"
        >
          {predefinedDocuments.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {language === 'pl' ? doc.titlePl : doc.titleEn}
            </option>
          ))}
          {/* Custom docs created in Edit Mode */}
          {Object.values(customDocs).map((doc) => (
            <option key={doc.id} value={doc.id}>
              {language === 'pl' ? doc.titlePl : doc.titleEn}
            </option>
          ))}
        </select>
      </div>

      {/* CENTER: Main action buttons (Wyczyść pola, Pobierz wypełniony PDF, Zapis nowego gościa, Historia) */}
      {mode === 'fill' ? (
        <div className="flex items-center gap-2">
          {/* Wyczyść pola */}
          <button
            type="button"
            onClick={onClearForm}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">{t.clearForm}</span>
          </button>

          {/* Pobierz wypełniony PDF */}
          <button
            type="button"
            onClick={onDownloadPdf}
            disabled={isGeneratingPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold transition shadow-2xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span>{isGeneratingPdf ? t.pdfGenerating : t.downloadPdf}</span>
          </button>

          {/* Zapis nowego gościa */}
          <button
            type="button"
            onClick={onSaveNewGuest}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs active:scale-98"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{t.saveAndNewGuest}</span>
          </button>

          {/* Historia */}
          <button
            type="button"
            onClick={onOpenHistory}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition"
          >
            <History className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden md:inline">{t.history}</span>
            {entriesCount > 0 && (
              <span className="px-1.5 py-0.2 bg-slate-800 text-white font-bold text-[10px] rounded-full">
                {entriesCount}
              </span>
            )}
          </button>
        </div>
      ) : (
        /* Designer Toolbar Indicator when in Edit Mode */
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold">
            <Sliders className="w-3.5 h-3.5" />
            <span>{language === 'pl' ? 'Tryb edycji pól aktywny' : 'Field Designer Mode Active'}</span>
          </span>
          <button
            onClick={onExitDesigner}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition"
          >
            {t.exitDesigner}
          </button>
        </div>
      )}

      {/* RIGHT: Page switcher [< Strona 1 z 2 >], PL/ENG toggle, and stealth Lock */}
      <div className="flex items-center gap-2.5">
        {/* Przeklikiwanie stron strzałkami obok pl/eng: [< Strona 1 z 2 >] */}
        <div className="flex items-center bg-slate-100 border border-slate-300 rounded-lg p-0.5 text-xs font-bold text-slate-700 shadow-2xs">
          <button
            type="button"
            disabled={activePage === 1}
            onClick={() => onPageChange(1)}
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            title={language === 'pl' ? 'Poprzednia strona' : 'Previous page'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-2 min-w-[85px] text-center font-semibold text-[11px] whitespace-nowrap">
            {language === 'pl' 
              ? `Strona ${activePage} z ${totalPages}` 
              : `Page ${activePage} of ${totalPages}`}
          </span>

          <button
            type="button"
            disabled={activePage === totalPages}
            onClick={() => onPageChange(2)}
            className="p-1 rounded text-slate-600 hover:text-slate-900 hover:bg-white disabled:opacity-30 disabled:hover:bg-transparent transition"
            title={language === 'pl' ? 'Następna strona' : 'Next page'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Przycisk PL / ENG */}
        <button
          type="button"
          onClick={onToggleLanguage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 transition shadow-2xs"
        >
          <Languages className="w-3.5 h-3.5 text-blue-600" />
          <span className={language === 'pl' ? 'text-blue-700 font-black' : 'text-slate-400'}>PL</span>
          <span className="text-slate-400">/</span>
          <span className={language === 'en' ? 'text-blue-700 font-black' : 'text-slate-400'}>ENG</span>
        </button>

        {/* Niepozorna, nieinteraktywna kłódka (10x kliknięcie w ciągu 3s odpala tryb edycji) */}
        <div
          onClick={handleSecretLockClick}
          className="w-6 h-6 flex items-center justify-center text-slate-400 select-none cursor-default ml-1"
          style={{ userSelect: 'none' }}
        >
          <Lock className="w-3.5 h-3.5 opacity-60" />
        </div>
      </div>
    </header>
  );
};
