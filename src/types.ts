export type Language = 'pl' | 'en';

export type FormFieldType = 
  | 'text' 
  | 'textarea' 
  | 'checkbox' 
  | 'signature' 
  | 'date' 
  | 'select' 
  | 'email' 
  | 'phone'
  | 'number';

export interface FormField {
  id: string;
  name: string;
  labelPl: string;
  labelEn: string;
  type: FormFieldType;
  page: 1 | 2; // page 1 or page 2 of the form
  // Coordinates in percentage of the page (0 - 100)
  x: number;
  y: number;
  width: number;
  height: number;
  required?: boolean;
  placeholderPl?: string;
  placeholderEn?: string;
  defaultValue?: string | boolean;
  options?: string[]; // for select type
  fontSize?: number; // in px
}

export interface DocumentTemplate {
  id: string;
  docId: string;
  title: string;
  version: string;
  updatedAt: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundImagePage1?: string; // custom image/sketch URL or dataURL
  backgroundImagePage2?: string;
  fields: FormField[];
}

export type PredefinedDocId = 'adal_en' | 'adal_pl' | 'perfect_light_pl';

export interface PdfDocumentOption {
  id: string;
  name: string;
  titlePl: string;
  titleEn: string;
  brand: 'adal' | 'perfect_light' | 'custom';
  language: Language;
  templateFile: string;
  pdfFileName?: string;
  customPdfUrl?: string;
}

export interface GuestEntry {
  id: string;
  timestamp: string;
  docId: string;
  docTitle: string;
  data: Record<string, any>;
  signatureDataUrl?: string;
  synced?: boolean;
}

export type AppMode = 'fill' | 'designer';
