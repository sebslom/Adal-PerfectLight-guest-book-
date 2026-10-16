import React, { useState, useEffect, useCallback } from 'react';
import { AppMode, DocumentTemplate, GuestEntry, Language, PdfDocumentOption } from './types';
import { predefinedDocuments } from './utils/defaultTemplates';
import { 
  loadTemplate, 
  saveTemplate, 
  resetTemplateToDefault, 
  downloadTemplateJsonFile, 
  parseTemplateJsonFile,
  loadGuestEntries, 
  saveGuestEntry 
} from './utils/storage';
import { generateAndDownloadPdf } from './utils/adalPdfExporter';
import { Navbar } from './components/Navbar';
import { TabletFiller } from './components/TabletFiller';
import { TemplateDesigner } from './components/TemplateDesigner';
import { HistoryModal } from './components/HistoryModal';
import confetti from 'canvas-confetti';

export default function App() {
  const [language, setLanguage] = useState<Language>('pl');
  const [mode, setMode] = useState<AppMode>('fill');
  
  // Active selected document
  const [selectedDocId, setSelectedDocId] = useState<string>('adal_pl');
  const [customDocs, setCustomDocs] = useState<Record<string, PdfDocumentOption>>({});
  
  // Active template
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [isLoadingTemplate, setIsLoadingTemplate] = useState(true);

  // Form state
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<1 | 2>(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Entries
  const [entries, setEntries] = useState<GuestEntry[]>([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Find active document option
  const activeDoc: PdfDocumentOption = 
    customDocs[selectedDocId] ||
    predefinedDocuments.find((d) => d.id === selectedDocId) ||
    predefinedDocuments[1]; // default: adal_pl

  // Load template whenever active document changes
  const refreshTemplate = useCallback(async (docId: string) => {
    setIsLoadingTemplate(true);
    try {
      const loaded = await loadTemplate(docId);
      setTemplate(loaded);

      // Pre-fill default values
      const initial: Record<string, any> = {};
      loaded.fields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          initial[f.name] = f.defaultValue;
        }
      });
      setFormData(initial);
      setSignatureUrl(null);
    } catch (err) {
      console.error('Failed to load template:', err);
    } finally {
      setIsLoadingTemplate(false);
    }
  }, []);

  useEffect(() => {
    refreshTemplate(selectedDocId);
  }, [selectedDocId, refreshTemplate]);

  // Load entries on mount
  useEffect(() => {
    setEntries(loadGuestEntries());
  }, []);

  const handleFormDataChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  const handleClearForm = () => {
    const isPl = language === 'pl';
    if (window.confirm(isPl ? 'Czy wyczyścić wszystkie wpisane dane?' : 'Clear all entered data?')) {
      const resetData: Record<string, any> = {};
      template?.fields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          resetData[f.name] = f.defaultValue;
        }
      });
      setFormData(resetData);
      setSignatureUrl(null);
    }
  };

  const handleSaveNewGuest = async () => {
    if (!template) return;

    // Validate minimum required fields (Contact Person or Company Name)
    const hasName = formData.contactPerson && String(formData.contactPerson).trim() !== '';
    const hasCompany = formData.companyName && String(formData.companyName).trim() !== '';

    if (!hasName && !hasCompany) {
      alert(language === 'pl' 
        ? 'Proszę podać przynajmniej Osobę kontaktową lub Nazwę firmy.' 
        : 'Please provide at least a Contact Person or Company Name.');
      return;
    }

    const newEntry: GuestEntry = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      docId: activeDoc.id,
      docTitle: language === 'pl' ? activeDoc.titlePl : activeDoc.titleEn,
      data: formData,
      signatureDataUrl: signatureUrl || undefined,
      synced: true,
    };

    await saveGuestEntry(newEntry);
    setEntries(loadGuestEntries());

    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // Ignore
    }

    // Reset form for next guest
    const resetData: Record<string, any> = {};
    template.fields.forEach((f) => {
      if (f.defaultValue !== undefined) {
        resetData[f.name] = f.defaultValue;
      }
    });
    setFormData(resetData);
    setSignatureUrl(null);
    setActivePage(1);
  };

  const handleDownloadPdf = async () => {
    if (!template) return;

    setIsGeneratingPdf(true);
    try {
      const entry: GuestEntry = {
        id: `guest_${Date.now()}`,
        timestamp: new Date().toISOString(),
        docId: activeDoc.id,
        docTitle: language === 'pl' ? activeDoc.titlePl : activeDoc.titleEn,
        data: formData,
        signatureDataUrl: signatureUrl || undefined,
      };
      await generateAndDownloadPdf(entry, template.fields, activeDoc);
    } catch (err) {
      console.error('Error generating PDF', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleSaveTemplate = async (updatedTemplate: DocumentTemplate) => {
    await saveTemplate(updatedTemplate);
    setTemplate(updatedTemplate);
  };

  const handleResetDefaultTemplate = async () => {
    const isPl = language === 'pl';
    if (window.confirm(isPl ? 'Przywrócić fabryczny szablon dla tego dokumentu?' : 'Reset template to factory preset?')) {
      const reset = await resetTemplateToDefault(activeDoc.id);
      setTemplate(reset);
    }
  };

  const handleDownloadTemplateJson = (currentTemplate: DocumentTemplate) => {
    downloadTemplateJsonFile(currentTemplate);
  };

  const handleUploadTemplateJson = async (file: File) => {
    try {
      const parsed = await parseTemplateJsonFile(file);
      await saveTemplate({ ...parsed, docId: activeDoc.id });
      setTemplate({ ...parsed, docId: activeDoc.id });
      alert(language === 'pl' ? 'Szablon został wczytany i zapisany!' : 'Template loaded and saved!');
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleAddNewCustomDoc = async (doc: PdfDocumentOption, tpl: DocumentTemplate) => {
    setCustomDocs((prev) => ({ ...prev, [doc.id]: doc }));
    setSelectedDocId(doc.id);
    await saveTemplate(tpl);
    setTemplate(tpl);
  };

  return (
    <div className="min-h-screen bg-slate-200/80 flex flex-col font-sans text-slate-900">
      {/* Top Navbar with Page Navigation next to PL/ENG and Stealth 10x Lock */}
      <Navbar
        mode={mode}
        language={language}
        onToggleLanguage={() => setLanguage((prev) => (prev === 'pl' ? 'en' : 'pl'))}
        selectedDocId={selectedDocId}
        onSelectDocId={(id) => setSelectedDocId(id)}
        customDocs={customDocs}
        activePage={activePage}
        onPageChange={(page) => setActivePage(page)}
        totalPages={2}
        onOpenHistory={() => setIsHistoryModalOpen(true)}
        entriesCount={entries.length}
        onClearForm={handleClearForm}
        onDownloadPdf={handleDownloadPdf}
        onSaveNewGuest={handleSaveNewGuest}
        isGeneratingPdf={isGeneratingPdf}
        onUnlockEditMode={() => setMode('designer')}
        onExitDesigner={() => setMode('fill')}
      />

      {/* Main View Area */}
      <main className="flex-1">
        {isLoadingTemplate || !template ? (
          <div className="flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-slate-500">
                {language === 'pl' ? 'Wczytywanie formularza...' : 'Loading document...'}
              </span>
            </div>
          </div>
        ) : mode === 'designer' ? (
          <TemplateDesigner
            template={template}
            docOption={activeDoc}
            customPdfUrl={activeDoc.customPdfUrl}
            onSaveTemplate={handleSaveTemplate}
            onDownloadTemplateJson={handleDownloadTemplateJson}
            onUploadTemplateJson={handleUploadTemplateJson}
            onResetDefault={handleResetDefaultTemplate}
            onExitDesigner={() => setMode('fill')}
            onAddNewCustomDoc={handleAddNewCustomDoc}
            language={language}
          />
        ) : (
          <TabletFiller
            template={template}
            docOption={activeDoc}
            customPdfUrl={activeDoc.customPdfUrl}
            formData={formData}
            onFormDataChange={handleFormDataChange}
            signatureUrl={signatureUrl}
            onSignatureChange={(url) => setSignatureUrl(url)}
            language={language}
            activePage={activePage}
          />
        )}
      </main>

      {/* Guest Entries History & Export Modal */}
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        entries={entries}
        onRefreshEntries={() => setEntries(loadGuestEntries())}
        language={language}
      />
    </div>
  );
}
