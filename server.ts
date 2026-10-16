import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const TEMPLATES_DIR = path.resolve(__dirname, 'templates');
const DATA_DIR = path.resolve(__dirname, 'data');

if (!fs.existsSync(TEMPLATES_DIR)) {
  fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
}
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '20mb' }));

  // API to list all saved templates
  app.get('/api/templates', (_req, res) => {
    try {
      const files = fs.readdirSync(TEMPLATES_DIR).filter(f => f.endsWith('.json'));
      const templates = files.map(filename => {
        try {
          const filePath = path.join(TEMPLATES_DIR, filename);
          const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          return { filename, ...content };
        } catch {
          return { filename, error: 'Invalid JSON' };
        }
      });
      res.json({ success: true, templates });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to get a single template by ID
  app.get('/api/templates/:id', (req, res) => {
    try {
      const { id } = req.params;
      const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '');
      const filePath = path.join(TEMPLATES_DIR, `${sanitizedId}.json`);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, error: 'Template file not found' });
      }
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      res.json({ success: true, template: content });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to save a template as a separate file on disk
  app.post('/api/templates/:id', (req, res) => {
    try {
      const { id } = req.params;
      const templateData = req.body;
      const sanitizedId = id.replace(/[^a-zA-Z0-9_-]/g, '');
      const filePath = path.join(TEMPLATES_DIR, `${sanitizedId}.json`);

      // Write pretty-printed JSON
      fs.writeFileSync(filePath, JSON.stringify(templateData, null, 2), 'utf-8');

      // Also copy to public/templates for static fetching if needed
      const publicTemplatesDir = path.resolve(__dirname, 'public', 'templates');
      if (!fs.existsSync(publicTemplatesDir)) {
        fs.mkdirSync(publicTemplatesDir, { recursive: true });
      }
      fs.writeFileSync(path.join(publicTemplatesDir, `${sanitizedId}.json`), JSON.stringify(templateData, null, 2), 'utf-8');

      console.log(`[API] Successfully saved template file: ${filePath}`);
      res.json({ 
        success: true, 
        message: `Template saved to ${sanitizedId}.json`, 
        filePath: `templates/${sanitizedId}.json`,
        updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.error('[API] Error saving template:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to save guest entry
  app.post('/api/entries', (req, res) => {
    try {
      const entry = req.body;
      const entriesFile = path.join(DATA_DIR, 'guestbook_entries.json');
      let entries: any[] = [];
      if (fs.existsSync(entriesFile)) {
        try {
          entries = JSON.parse(fs.readFileSync(entriesFile, 'utf-8'));
        } catch {
          entries = [];
        }
      }
      entries.unshift({
        ...entry,
        serverSavedAt: new Date().toISOString()
      });
      fs.writeFileSync(entriesFile, JSON.stringify(entries, null, 2), 'utf-8');
      res.json({ success: true, count: entries.length });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // API to get guest entries
  app.get('/api/entries', (_req, res) => {
    try {
      const entriesFile = path.join(DATA_DIR, 'guestbook_entries.json');
      if (!fs.existsSync(entriesFile)) {
        return res.json({ success: true, entries: [] });
      }
      const entries = JSON.parse(fs.readFileSync(entriesFile, 'utf-8'));
      res.json({ success: true, entries });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Mount Vite development server middlewares
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] Adal Guest Book running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
