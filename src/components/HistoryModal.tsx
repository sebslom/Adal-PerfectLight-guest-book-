import React, { useState } from 'react';
import { GuestEntry, Language, PdfDocumentOption } from '../types';
import { translations } from '../utils/translations';
import { exportEntriesToCsv, clearAllGuestEntries } from '../utils/storage';
import { generateAndDownloadPdf } from '../utils/adalPdfExporter';
import { predefinedDocuments, defaultTemplatesMap } from '../utils/defaultTemplates';
import { History, Download, Trash2, Search, X, FileSpreadsheet, FileJson, CheckCircle2 } from 'lucide-react';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: GuestEntry[];
  onRefreshEntries: () => void;
  language: Language;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  entries,
  onRefreshEntries,
  language,
}) => {
  const t = translations[language];
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredEntries = entries.filter((e) => {
    const term = searchTerm.toLowerCase();
    const name = (e.data.contactPerson || e.data.fullName || '').toLowerCase();
    const company = (e.data.companyName || e.data.company || '').toLowerCase();
    const email = (e.data.email || '').toLowerCase();
    const doc = (e.docTitle || '').toLowerCase();
    return name.includes(term) || company.includes(term) || email.includes(term) || doc.includes(term);
  });

  const handleDownloadSinglePdf = async (entry: GuestEntry) => {
    setDownloadingId(entry.id);
    try {
      // Find matching document option
      const docOption = predefinedDocuments.find(d => d.id === entry.docId) || predefinedDocuments[0];
      const template = defaultTemplatesMap[entry.docId] || defaultTemplatesMap.adal_pl;
      await generateAndDownloadPdf(entry, template.fields, docOption);
    } catch (err) {
      console.error('Failed to generate PDF', err);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(entries, null, 2));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `adal_mapic_2026_goscie_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDeleteAll = () => {
    if (window.confirm(t.confirmDeleteHistory)) {
      clearAllGuestEntries();
      onRefreshEntries();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl flex flex-col max-h-[85vh] border border-slate-200 z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{t.history}</h3>
              <p className="text-xs text-slate-300">
                {t.historyCount.replace('{count}', String(entries.length))}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {entries.length > 0 && (
              <>
                <button
                  onClick={() => exportEntriesToCsv(entries)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV</span>
                </button>
                <button
                  onClick={handleExportJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold shadow-xs border border-slate-700"
                >
                  <FileJson className="w-4 h-4" />
                  <span>JSON</span>
                </button>
                <button
                  onClick={handleDeleteAll}
                  className="p-1.5 text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg"
                  title={t.deleteAllHistory}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={language === 'pl' ? 'Szukaj po nazwisku, firmie, emailu...' : 'Search by name, company, email...'}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 bg-white"
            />
          </div>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-100">
          {filteredEntries.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t.historyEmpty}</p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div
                key={entry.id}
                className="py-3 px-2 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/80 rounded-xl transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {entry.data.contactPerson || entry.data.fullName || (language === 'pl' ? 'Brak osoby kontaktowej' : 'Anonymous')}
                    </span>
                    {(entry.data.companyName || entry.data.company) && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {entry.data.companyName || entry.data.company}
                      </span>
                    )}
                    {entry.signatureDataUrl && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{language === 'pl' ? 'Podpisano' : 'Signed'}</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {entry.data.email && <span>📧 {entry.data.email}</span>}
                    {entry.data.phone && <span>📞 {entry.data.phone}</span>}
                    {entry.data.position && <span>💼 {entry.data.position}</span>}
                    {entry.data.location && <span>📍 {entry.data.location}</span>}
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-2">
                    <span className="font-mono">{new Date(entry.timestamp).toLocaleString('pl-PL')}</span>
                    <span>•</span>
                    <span className="text-blue-700 font-medium">{entry.docTitle}</span>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadSinglePdf(entry)}
                    disabled={downloadingId === entry.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 text-xs font-bold transition shadow-2xs disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{downloadingId === entry.id ? 'PDF...' : 'Pobierz PDF'}</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {language === 'pl' ? 'Dane zapisane w pamięci lokalnej stoiska' : 'Stored in local tablet database'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition"
          >
            {t.close}
          </button>
        </div>
      </div>
    </div>
  );
};
