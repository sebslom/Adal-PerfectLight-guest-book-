import React, { useState, useRef } from 'react';
import { DocumentTemplate, FormField, FormFieldType, Language, PdfDocumentOption } from '../types';
import { translations } from '../utils/translations';
import { AdalFormBackground } from './AdalFormBackground';
import { renderPdfToImageUrls } from '../utils/pdfRenderer';
import { 
  Save, 
  Download, 
  Upload, 
  RotateCcw, 
  Plus, 
  Trash2, 
  ArrowLeft, 
  CheckCircle2, 
  FileUp, 
  Link,
  Sliders,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface TemplateDesignerProps {
  template: DocumentTemplate;
  docOption: PdfDocumentOption;
  customPdfUrl?: string | null;
  onSaveTemplate: (template: DocumentTemplate) => Promise<void>;
  onDownloadTemplateJson: (template: DocumentTemplate) => void;
  onUploadTemplateJson: (file: File) => void;
  onResetDefault: () => void;
  onExitDesigner: () => void;
  onAddNewCustomDoc?: (doc: PdfDocumentOption, tpl: DocumentTemplate) => void;
  language: Language;
}

export const TemplateDesigner: React.FC<TemplateDesignerProps> = ({
  template,
  docOption,
  customPdfUrl,
  onSaveTemplate,
  onDownloadTemplateJson,
  onUploadTemplateJson,
  onResetDefault,
  onExitDesigner,
  onAddNewCustomDoc,
  language,
}) => {
  const t = translations[language];
  const [fields, setFields] = useState<FormField[]>(template.fields);
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Background/PDF loader modal state
  const [isLoadModalOpen, setIsLoadModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [customDocTitle, setCustomDocTitle] = useState('');
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);

  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const diskFileInputRef = useRef<HTMLInputElement>(null);

  const pageFields = fields.filter((f) => f.page === activePage);
  const selectedField = fields.find((f) => f.id === selectedFieldId) || null;

  const handleFieldChange = (fieldId: string, updates: Partial<FormField>) => {
    setFields((prev) => prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
  };

  const handleAddField = () => {
    const newId = `field_${Date.now()}`;
    const newField: FormField = {
      id: newId,
      name: `custom_${pageFields.length + 1}`,
      labelPl: `Nowe pole ${pageFields.length + 1}`,
      labelEn: `New field ${pageFields.length + 1}`,
      type: 'text',
      page: activePage,
      x: 15,
      y: 20 + (pageFields.length % 6) * 5,
      width: 35,
      height: 3.2,
      required: false,
      placeholderPl: 'Wpisz dane...',
      placeholderEn: 'Enter details...',
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newId);
  };

  const handleDeleteField = (fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updatedTemplate: DocumentTemplate = {
        ...template,
        fields,
        updatedAt: new Date().toISOString(),
      };
      await onSaveTemplate(updatedTemplate);
      setSaveStatus(t.templateSavedSuccess);
      setTimeout(() => setSaveStatus(null), 3500);
    } catch {
      setSaveStatus('Błąd zapisu!');
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadTemplateJson(file);
    }
  };

  // Process uploaded PDF file or graphic from disk
  const handleDiskFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingPdf(true);
    try {
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        const arrayBuffer = await file.arrayBuffer();
        const { page1, page2 } = await renderPdfToImageUrls(arrayBuffer);

        const newDocId = `custom_${Date.now()}`;
        const newTitle = file.name.replace('.pdf', '');
        const newTemplate: DocumentTemplate = {
          id: newDocId,
          docId: newDocId,
          title: newTitle,
          version: '1.0.0',
          updatedAt: new Date().toISOString(),
          canvasWidth: 850,
          canvasHeight: 1200,
          backgroundImagePage1: page1,
          backgroundImagePage2: page2 || page1,
          fields,
        };

        const newDoc: PdfDocumentOption = {
          id: newDocId,
          name: newTitle,
          titlePl: newTitle,
          titleEn: newTitle,
          brand: 'custom',
          language,
          templateFile: `${newDocId}.json`,
        };

        if (onAddNewCustomDoc) {
          onAddNewCustomDoc(newDoc, newTemplate);
        } else {
          await onSaveTemplate(newTemplate);
        }
      } else {
        // Image / sketch file
        const url = URL.createObjectURL(file);
        const updated: DocumentTemplate = {
          ...template,
          fields,
          [activePage === 1 ? 'backgroundImagePage1' : 'backgroundImagePage2']: url,
        };
        await onSaveTemplate(updated);
      }
      setIsLoadModalOpen(false);
    } catch (err) {
      console.error('Error processing file:', err);
      alert('Nie udało się przetworzyć pliku PDF.');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  // Process URL or Google Drive link
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsProcessingPdf(true);
    try {
      let finalUrl = urlInput.trim();
      // Transform Google Drive links to direct preview or download
      const gdMatch1 = finalUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      const gdMatch2 = finalUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      const fileId = (gdMatch1 && gdMatch1[1]) || (gdMatch2 && gdMatch2[1]);
      if (fileId) {
        finalUrl = `https://drive.google.com/file/d/${fileId}/preview`;
      }

      // Check if it's an image or PDF
      if (finalUrl.toLowerCase().includes('.jpg') || finalUrl.toLowerCase().includes('.png')) {
        const updated: DocumentTemplate = {
          ...template,
          fields,
          [activePage === 1 ? 'backgroundImagePage1' : 'backgroundImagePage2']: finalUrl,
        };
        await onSaveTemplate(updated);
      } else {
        const newDocId = `url_${Date.now()}`;
        const title = customDocTitle.trim() || 'Dokument z URL / Google Drive';
        const newTemplate: DocumentTemplate = {
          ...template,
          id: newDocId,
          docId: newDocId,
          title,
          backgroundImagePage1: finalUrl,
          backgroundImagePage2: finalUrl,
        };
        const newDoc: PdfDocumentOption = {
          id: newDocId,
          name: title,
          titlePl: title,
          titleEn: title,
          brand: 'custom',
          language,
          templateFile: `${newDocId}.json`,
          customPdfUrl: finalUrl,
        };
        if (onAddNewCustomDoc) {
          onAddNewCustomDoc(newDoc, newTemplate);
        } else {
          await onSaveTemplate(newTemplate);
        }
      }
      setIsLoadModalOpen(false);
    } catch (err) {
      console.error('Error with URL:', err);
      alert('Nie udało się załadować dokumentu z URL.');
    } finally {
      setIsProcessingPdf(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-900 text-slate-100 overflow-hidden">
      {/* Top Designer Toolbar */}
      <div className="h-14 bg-slate-950 border-b border-slate-800 px-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onExitDesigner}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t.exitDesigner}</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          {/* Page Switcher in Designer */}
          <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActivePage(1)}
              className={`px-3 py-1 rounded text-xs font-bold transition ${
                activePage === 1 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Strona 1
            </button>
            <button
              onClick={() => setActivePage(2)}
              className={`px-3 py-1 rounded text-xs font-bold transition ${
                activePage === 2 ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Strona 2
            </button>
          </div>

          <span className="text-xs text-amber-400 font-semibold hidden md:inline">
            {docOption.titlePl}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Wczytaj PDF / Szkic (Dysk / URL / Google Drive) */}
          <button
            type="button"
            onClick={() => setIsLoadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold transition shadow-xs"
            title="Wgraj nowy plik PDF, grafikę lub link Google Drive"
          >
            <FileUp className="w-3.5 h-3.5" />
            <span>Wczytaj PDF / Szkic (Dysk / URL)</span>
          </button>

          {/* Dodaj pole */}
          <button
            onClick={handleAddField}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addField}</span>
          </button>

          {/* Zapisz szablon */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Zapisywanie...' : t.saveTemplateFile}</span>
          </button>

          {/* Pobierz .json */}
          <button
            onClick={() => onDownloadTemplateJson({ ...template, fields })}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title={t.downloadTemplateJson}
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Wczytaj .json */}
          <button
            onClick={() => jsonFileInputRef.current?.click()}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700"
            title={t.uploadTemplateJson}
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            ref={jsonFileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={handleJsonFileChange}
          />

          <button
            onClick={onResetDefault}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg"
            title={t.resetDefaultTemplate}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Save Notification Banner */}
      {saveStatus && (
        <div className="bg-emerald-900/90 text-emerald-200 px-4 py-1.5 text-xs font-semibold flex items-center justify-center gap-2 border-b border-emerald-700/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveStatus}</span>
          <span className="font-mono text-[11px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300">
            templates/{docOption.id}.json
          </span>
        </div>
      )}

      {/* Main Designer Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Canvas Area */}
        <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950/80">
          <div className="relative w-full max-w-4xl bg-white text-slate-900 shadow-2xl rounded-sm overflow-hidden select-none border border-slate-700 aspect-1/1.414">
            {/* Background Sheet */}
            <div className="absolute inset-0 pointer-events-none">
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

            {/* Editable Field Overlays for active page */}
            {pageFields.map((field) => {
              const isSelected = field.id === selectedFieldId;

              return (
                <div
                  key={field.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFieldId(field.id);
                  }}
                  style={{
                    left: `${field.x}%`,
                    top: `${field.y}%`,
                    width: `${field.width}%`,
                    height: `${field.height}%`,
                  }}
                  className={`absolute rounded transition-all flex items-center justify-between p-1 cursor-pointer text-xs font-sans ${
                    isSelected
                      ? 'border-2 border-blue-600 bg-blue-500/30 shadow-lg ring-2 ring-blue-500/40 z-30'
                      : 'border-2 border-dashed border-indigo-400/80 bg-indigo-50/20 hover:border-indigo-600 hover:bg-indigo-50/40 z-20'
                  }`}
                >
                  <span className="text-[10px] font-bold truncate bg-white/90 px-1 py-0.2 rounded text-slate-900 border border-slate-300">
                    {language === 'pl' ? field.labelPl : field.labelEn}
                  </span>
                  <span className="text-[8px] font-mono uppercase bg-slate-900 text-white px-1 rounded">
                    {field.type}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Field Inspector Sidebar */}
        <div className="w-80 bg-slate-950 border-l border-slate-800 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              {t.fieldProps}
            </span>
            {selectedField && (
              <button
                onClick={() => handleDeleteField(selectedField.id)}
                className="text-red-400 hover:text-red-300 p-1 hover:bg-slate-800 rounded transition"
                title={t.fieldDelete}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {selectedField ? (
              <>
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {t.fieldName}
                  </label>
                  <input
                    type="text"
                    value={selectedField.name}
                    onChange={(e) =>
                      handleFieldChange(selectedField.id, { name: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {t.fieldLabelPl}
                  </label>
                  <input
                    type="text"
                    value={selectedField.labelPl}
                    onChange={(e) =>
                      handleFieldChange(selectedField.id, { labelPl: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {t.fieldLabelEn}
                  </label>
                  <input
                    type="text"
                    value={selectedField.labelEn}
                    onChange={(e) =>
                      handleFieldChange(selectedField.id, { labelEn: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    Strona formularza
                  </label>
                  <select
                    value={selectedField.page}
                    onChange={(e) =>
                      handleFieldChange(selectedField.id, {
                        page: parseInt(e.target.value, 10) as 1 | 2,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                  >
                    <option value={1}>Strona 1 (Dane i Notatki)</option>
                    <option value={2}>Strona 2 (Podsumowanie i Ankieta)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">
                    {t.fieldType}
                  </label>
                  <select
                    value={selectedField.type}
                    onChange={(e) =>
                      handleFieldChange(selectedField.id, {
                        type: e.target.value as FormFieldType,
                      })
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-100"
                  >
                    <option value="text">Pole tekstowe (Text)</option>
                    <option value="checkbox">Pole wyboru (Checkbox)</option>
                    <option value="textarea">Pole wielowierszowe (Textarea)</option>
                    <option value="date">Data (Date)</option>
                    <option value="email">Email</option>
                    <option value="phone">Telefon</option>
                    <option value="signature">Podpis elektroniczny</option>
                  </select>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <span className="block text-slate-400 font-semibold mb-2">
                    Pozycja i rozmiar (%)
                  </span>
                  <div className="grid grid-cols-2 gap-2 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500">X (%)</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedField.x}
                        onChange={(e) =>
                          handleFieldChange(selectedField.id, {
                            x: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Y (%)</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedField.y}
                        onChange={(e) =>
                          handleFieldChange(selectedField.id, {
                            y: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Szerokość (%)</span>
                      <input
                        type="number"
                        step="0.5"
                        value={selectedField.width}
                        onChange={(e) =>
                          handleFieldChange(selectedField.id, {
                            width: parseFloat(e.target.value) || 5,
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500">Wysokość (%)</span>
                      <input
                        type="number"
                        step="0.2"
                        value={selectedField.height}
                        onChange={(e) =>
                          handleFieldChange(selectedField.id, {
                            height: parseFloat(e.target.value) || 2,
                          })
                        }
                        className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-100"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <input
                    type="checkbox"
                    id="des_chk_required"
                    checked={!!selectedField.required}
                    onChange={(e) =>
                      handleFieldChange(selectedField.id, { required: e.target.checked })
                    }
                    className="rounded border-slate-700 text-blue-600 focus:ring-0"
                  />
                  <label htmlFor="des_chk_required" className="text-slate-300">
                    {t.fieldRequired}
                  </label>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Sliders className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>Kliknij pole na formularzu, aby zmienić jego współrzędne lub właściwości.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PDF / Graphic / Sketch Load Modal (ONLY available inside Edit Mode) */}
      {isLoadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs"
            onClick={() => !isProcessingPdf && setIsLoadModalOpen(false)}
          />
          <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 p-6 z-10 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div>
                <h3 className="font-bold text-sm text-white">
                  Wczytaj plik PDF lub grafikę/szkic
                </h3>
                <p className="text-xs text-slate-400">
                  Dla każdego pliku zostanie automatycznie utworzony i zapisany osobny szablon.
                </p>
              </div>
              <button
                onClick={() => setIsLoadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isProcessingPdf ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-slate-300 font-semibold">
                  Renderowanie i przetwarzanie stron PDF...
                </p>
              </div>
            ) : (
              <>
                {/* Option 1: File from disk */}
                <div 
                  onClick={() => diskFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer mb-5 bg-slate-950/50 transition"
                >
                  <FileUp className="w-8 h-8 mx-auto mb-2 text-blue-400" />
                  <span className="text-xs font-bold block text-white">Wybierz plik PDF lub grafikę z dysku</span>
                  <span className="text-[11px] text-slate-400">Obsługiwane pliki: .pdf (wielostronicowe), .png, .jpg</span>
                  <input
                    ref={diskFileInputRef}
                    type="file"
                    accept="application/pdf,image/png,image/jpeg"
                    className="hidden"
                    onChange={handleDiskFileChange}
                  />
                </div>

                {/* Option 2: URL or Google Drive link */}
                <form onSubmit={handleUrlSubmit} className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-300 font-semibold block mb-1">
                      Lub wklej link do pliku PDF / Dysku Google:
                    </label>
                    <div className="relative">
                      <Link className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://drive.google.com/file/d/... lub https://.../plik.pdf"
                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-400 block mb-1">
                      Nazwa dokumentu (opcjonalnie):
                    </label>
                    <input
                      type="text"
                      value={customDocTitle}
                      onChange={(e) => setCustomDocTitle(e.target.value)}
                      placeholder="np. Nowy Formularz Targowy 2026"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-100 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setIsLoadModalOpen(false)}
                      className="px-4 py-2 rounded-lg border border-slate-700 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white shadow-xs"
                    >
                      Zastosuj URL
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
