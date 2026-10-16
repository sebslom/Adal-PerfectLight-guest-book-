import { DocumentTemplate, GuestEntry, PredefinedDocId } from '../types';
import { defaultTemplatesMap } from './defaultTemplates';

const TEMPLATE_STORAGE_PREFIX = 'adal_template_';
const ENTRIES_STORAGE_KEY = 'adal_guest_entries';
const ADMIN_PIN_KEY = 'adal_admin_pin';
const DEFAULT_PIN = '1234';

// Get admin PIN
export function getAdminPin(): string {
  try {
    return localStorage.getItem(ADMIN_PIN_KEY) || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function setAdminPin(pin: string): void {
  try {
    localStorage.setItem(ADMIN_PIN_KEY, pin);
  } catch (e) {
    console.error('Failed to set admin pin', e);
  }
}

// Load template with server priority, localStorage fallback, and defaultTemplatesMap preset
export async function loadTemplate(docId: string): Promise<DocumentTemplate> {
  // 1. Try server API first
  try {
    const res = await fetch(`/api/templates/${docId}`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.template && json.template.fields) {
        // Cache to localStorage
        localStorage.setItem(TEMPLATE_STORAGE_PREFIX + docId, JSON.stringify(json.template));
        return json.template;
      }
    }
  } catch (err) {
    console.warn(`[Storage] Could not fetch template from API for ${docId}:`, err);
  }

  // 2. Try static public folder
  try {
    const staticRes = await fetch(`/templates/${docId}.json`);
    if (staticRes.ok) {
      const json = await staticRes.json();
      if (json && json.fields) {
        localStorage.setItem(TEMPLATE_STORAGE_PREFIX + docId, JSON.stringify(json));
        return json;
      }
    }
  } catch {
    // Continue
  }

  // 3. Try localStorage
  try {
    const cached = localStorage.getItem(TEMPLATE_STORAGE_PREFIX + docId);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.fields) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('[Storage] Error reading localStorage:', err);
  }

  // 4. Fallback to bundled default template
  if (defaultTemplatesMap[docId]) {
    return JSON.parse(JSON.stringify(defaultTemplatesMap[docId]));
  }

  // 5. Generic fallback if custom document
  return {
    id: docId,
    docId,
    title: `Szablon ${docId}`,
    version: '1.0.0',
    updatedAt: new Date().toISOString(),
    canvasWidth: 850,
    canvasHeight: 1200,
    fields: defaultTemplatesMap.adal_pl.fields,
  };
}

// Save template to server disk file and localStorage
export async function saveTemplate(template: DocumentTemplate): Promise<{ success: boolean; message: string; savedToFile?: boolean }> {
  const docId = template.docId || template.id;
  const updatedTemplate: DocumentTemplate = {
    ...template,
    updatedAt: new Date().toISOString(),
  };

  // 1. Save in localStorage
  try {
    localStorage.setItem(TEMPLATE_STORAGE_PREFIX + docId, JSON.stringify(updatedTemplate));
  } catch (err) {
    console.error('[Storage] Error saving to localStorage:', err);
  }

  // 2. Try saving to server file API (/templates/[docId].json)
  try {
    const res = await fetch(`/api/templates/${docId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTemplate),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        message: data.message || `Zapisano w templates/${docId}.json`,
        savedToFile: true,
      };
    }
  } catch (err) {
    console.warn('[Storage] Server file save unavailable, saved to browser storage:', err);
  }

  return {
    success: true,
    message: 'Zapisano w pamięci lokalnej przeglądarki.',
    savedToFile: false,
  };
}

// Reset template to default
export async function resetTemplateToDefault(docId: string): Promise<DocumentTemplate> {
  const defaultTpl = defaultTemplatesMap[docId] || defaultTemplatesMap.adal_pl;
  const cloned = JSON.parse(JSON.stringify(defaultTpl));
  await saveTemplate(cloned);
  return cloned;
}

// Download template directly as a .json file
export function downloadTemplateJsonFile(template: DocumentTemplate): void {
  const docId = template.docId || template.id;
  const filename = `szablon_${docId}_${new Date().toISOString().split('T')[0]}.json`;
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(template, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', filename);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

// Parse imported JSON file
export function parseTemplateJsonFile(file: File): Promise<DocumentTemplate> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (!parsed || !Array.isArray(parsed.fields)) {
          throw new Error('Nieprawidłowa struktura szablonu (brak tablicy fields).');
        }
        resolve(parsed);
      } catch (err: any) {
        reject(new Error(`Błąd parsowania pliku JSON: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('Nie udało się odczytać pliku.'));
    reader.readAsText(file);
  });
}

// Guest entries storage
export function loadGuestEntries(): GuestEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveGuestEntry(entry: GuestEntry): Promise<void> {
  const entries = loadGuestEntries();
  entries.unshift(entry);
  try {
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }

  // Also post to backend if available
  try {
    await fetch('/api/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
  } catch {
    // Offline or serverless mode
  }
}

export function clearAllGuestEntries(): void {
  try {
    localStorage.removeItem(ENTRIES_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear entries', e);
  }
}

// Export entries to CSV
export function exportEntriesToCsv(entries: GuestEntry[]): void {
  if (entries.length === 0) return;

  const headers = ['ID', 'Data i Czas', 'Formularz', 'Data z formularza', 'Osoba kontaktowa', 'Nazwa firmy', 'Kraj', 'Email', 'Telefon', 'Adres 1', 'Adres 2', 'Notatki', 'Budżet', 'Termin', 'Podpis obecny'];
  const rows = entries.map(e => [
    e.id,
    new Date(e.timestamp).toLocaleString('pl-PL'),
    e.docTitle,
    `"${(e.data.date || '').replace(/"/g, '""')}"`,
    `"${(e.data.contactPerson || e.data.fullName || '').replace(/"/g, '""')}"`,
    `"${(e.data.companyName || e.data.company || '').replace(/"/g, '""')}"`,
    `"${(e.data.country || '').replace(/"/g, '""')}"`,
    `"${(e.data.email || '').replace(/"/g, '""')}"`,
    `"${(e.data.phone || '').replace(/"/g, '""')}"`,
    `"${(e.data.addressLine1 || '').replace(/"/g, '""')}"`,
    `"${(e.data.addressLine2 || '').replace(/"/g, '""')}"`,
    `"${(e.data.notesPage1 || e.data.notes || '').replace(/"/g, '""')}"`,
    `"${(e.data.projectBudget || '').replace(/"/g, '""')}"`,
    `"${(e.data.deadline || '').replace(/"/g, '""')}"`,
    e.signatureDataUrl ? 'TAK' : 'NIE'
  ]);

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `goscie_mapic_2026_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
