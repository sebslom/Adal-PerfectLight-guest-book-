import React, { useState } from 'react';
import { DocumentTemplate, FormField, Language, PdfDocumentOption } from '../types';
import { translations } from '../utils/translations';
import { AdalFormBackground } from './AdalFormBackground';
import { SignatureModal } from './SignatureModal';
import { PenLine } from 'lucide-react';

interface TabletFillerProps {
  template: DocumentTemplate;
  docOption: PdfDocumentOption;
  customPdfUrl?: string | null;
  formData: Record<string, any>;
  onFormDataChange: (fieldName: string, value: any) => void;
  signatureUrl: string | null;
  onSignatureChange: (url: string | null) => void;
  language: Language;
  activePage: 1 | 2;
}

export const TabletFiller: React.FC<TabletFillerProps> = ({
  template,
  docOption,
  customPdfUrl,
  formData,
  onFormDataChange,
  signatureUrl,
  onSignatureChange,
  language,
  activePage,
}) => {
  const t = translations[language];
  const [isSignatureModalOpen, setIsSignatureModalOpen] = useState(false);

  // Filter fields for current page
  const pageFields = template.fields.filter((f) => f.page === activePage);

  return (
    <div className="flex flex-col items-center justify-start bg-slate-200/70 min-h-[calc(100vh-3.5rem)] py-6 px-3">
      {/* Main Document Canvas: ONLY the PDF Sheet with inputs on top */}
      <div className="relative w-full max-w-4xl bg-white shadow-2xl rounded-xs overflow-hidden border border-slate-300 aspect-1/1.414 select-none">
        {/* Layer 1: Authentic Printed Document Background */}
        <div className="absolute inset-0">
          <AdalFormBackground
            docOption={docOption}
            page={activePage}
            customBackgroundUrl={
              activePage === 1
                ? template.backgroundImagePage1 || customPdfUrl
                : template.backgroundImagePage2 || customPdfUrl
            }
          />
        </div>

        {/* Layer 2: Form Input Fields aligned over background lines */}
        <div className="absolute inset-0">
          {pageFields.map((field) => {
            const value = formData[field.name];
            const placeholder = language === 'en' ? field.placeholderEn : field.placeholderPl;

            return (
              <div
                key={field.id}
                style={{
                  left: `${field.x}%`,
                  top: `${field.y}%`,
                  width: `${field.width}%`,
                  height: `${field.height}%`,
                }}
                className="absolute flex items-center z-10 p-0.5"
              >
                {field.type === 'checkbox' ? (
                  <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-blue-50/50 rounded transition">
                    <input
                      type="checkbox"
                      checked={value === true || value === 'true'}
                      onChange={(e) => onFormDataChange(field.name, e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                    />
                  </label>
                ) : field.type === 'textarea' ? (
                  <div className="w-full h-full flex flex-col">
                    <textarea
                      value={value || ''}
                      onChange={(e) => onFormDataChange(field.name, e.target.value)}
                      placeholder={placeholder}
                      className="w-full h-full bg-white/70 hover:bg-white focus:bg-white text-slate-900 text-xs p-2.5 border border-slate-300 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded focus:outline-hidden transition resize-none font-sans leading-relaxed shadow-2xs"
                    />
                  </div>
                ) : field.type === 'signature' ? (
                  <div
                    onClick={() => setIsSignatureModalOpen(true)}
                    className="w-full h-full border border-dashed border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 rounded cursor-pointer flex items-center justify-center p-1 transition"
                  >
                    {signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="Signature"
                        className="max-h-full max-w-full object-contain filter contrast-125"
                      />
                    ) : (
                      <div className="flex items-center gap-1.5 text-blue-700 text-xs font-semibold">
                        <PenLine className="w-3.5 h-3.5" />
                        <span>{t.noSignature}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <input
                    type={field.type === 'date' ? 'date' : field.type === 'email' ? 'email' : field.type === 'phone' ? 'tel' : 'text'}
                    value={value || ''}
                    onChange={(e) => onFormDataChange(field.name, e.target.value)}
                    placeholder={placeholder}
                    className="w-full h-full bg-white/40 hover:bg-white focus:bg-white text-slate-900 text-xs px-2 border-b-2 border-slate-300 hover:border-slate-400 focus:border-blue-600 focus:outline-hidden transition font-sans font-medium"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={isSignatureModalOpen}
        onClose={() => setIsSignatureModalOpen(false)}
        onSave={(dataUrl) => onSignatureChange(dataUrl)}
        language={language}
      />
    </div>
  );
};
