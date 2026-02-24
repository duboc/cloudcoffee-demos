import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const IMAGES_DIR = path.join(DATA_DIR, 'images');
const STORE_FILE = path.join(DATA_DIR, 'store.json');

const router = Router();

interface StoreData {
  version: number;
  generatedImages: any[];
  visionAnalyses: any[];
  chatSessions: any[];
  sustainabilityReports: any[];
  dashboardSnapshots: any[];
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(IMAGES_DIR)) fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

function readStore(): StoreData {
  ensureDataDir();
  if (!fs.existsSync(STORE_FILE)) {
    const empty: StoreData = {
      version: 1,
      generatedImages: [],
      visionAnalyses: [],
      chatSessions: [],
      sustainabilityReports: [],
      dashboardSnapshots: [],
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(empty, null, 2));
    return empty;
  }
  const store = JSON.parse(fs.readFileSync(STORE_FILE, 'utf-8'));
  // Migrate: add generatedImages if missing (existing stores created before this field)
  if (!store.generatedImages) store.generatedImages = [];
  return store;
}

function writeStore(data: StoreData) {
  ensureDataDir();
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2));
}

// GET /api/data — load entire store
router.get('/data', (_req: Request, res: Response) => {
  try {
    const store = readStore();
    res.json(store);
  } catch (error: any) {
    console.error('load store error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/data/generated-image — save a generated image (no analysis)
router.post('/data/generated-image', (req: Request, res: Response) => {
  try {
    const { cameraName, imageData } = req.body;
    const store = readStore();

    const id = `genimg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    let imageFile: string | null = null;

    if (imageData) {
      const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
      if (base64Match) {
        imageFile = `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`;
        const buffer = Buffer.from(base64Match[1], 'base64');
        fs.writeFileSync(path.join(IMAGES_DIR, imageFile), buffer);
      }
    }

    if (!imageFile) {
      res.status(400).json({ error: 'No valid image data provided' });
      return;
    }

    const entry = {
      id,
      cameraName,
      imageFile,
      timestamp: new Date().toISOString(),
    };

    store.generatedImages.unshift(entry);
    writeStore(store);
    res.json(entry);
  } catch (error: any) {
    console.error('save generated image error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/data/vision — save analysis + image file
router.post('/data/vision', (req: Request, res: Response) => {
  try {
    const { cameraName, imageData, task, result } = req.body;
    const store = readStore();

    const id = `vision_${Date.now()}`;
    let imageFile: string | null = null;

    // Save image as file if provided
    if (imageData) {
      const base64Match = imageData.match(/^data:image\/\w+;base64,(.+)$/);
      if (base64Match) {
        imageFile = `img_${Date.now()}.png`;
        const buffer = Buffer.from(base64Match[1], 'base64');
        fs.writeFileSync(path.join(IMAGES_DIR, imageFile), buffer);
      }
    }

    const entry = {
      id,
      cameraName,
      imageFile,
      task,
      result,
      timestamp: new Date().toISOString(),
    };

    store.visionAnalyses.unshift(entry);
    writeStore(store);
    res.json(entry);
  } catch (error: any) {
    console.error('save vision error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/data/chat — save/update chat session
router.post('/data/chat', (req: Request, res: Response) => {
  try {
    const { id, messages } = req.body;
    const store = readStore();

    const existingIndex = store.chatSessions.findIndex((s: any) => s.id === id);
    const session = {
      id: id || `chat_${Date.now()}`,
      messages,
      startedAt: existingIndex >= 0 ? store.chatSessions[existingIndex].startedAt : new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      store.chatSessions[existingIndex] = session;
    } else {
      store.chatSessions.unshift(session);
    }

    writeStore(store);
    res.json(session);
  } catch (error: any) {
    console.error('save chat error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/data/sustainability — save report
router.post('/data/sustainability', (req: Request, res: Response) => {
  try {
    const { inputData, report, charts } = req.body;
    const store = readStore();

    const entry = {
      id: `sust_${Date.now()}`,
      inputData,
      report,
      charts: charts || [],
      timestamp: new Date().toISOString(),
    };

    store.sustainabilityReports.unshift(entry);
    writeStore(store);
    res.json(entry);
  } catch (error: any) {
    console.error('save sustainability error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/data/dashboard — save snapshot
router.post('/data/dashboard', (req: Request, res: Response) => {
  try {
    const { insights, charts, stats, text } = req.body;
    const store = readStore();

    const entry = {
      id: `dash_${Date.now()}`,
      insights,
      charts: charts || [],
      stats: stats || {},
      text: text || '',
      timestamp: new Date().toISOString(),
    };

    store.dashboardSnapshots.unshift(entry);
    writeStore(store);
    res.json(entry);
  } catch (error: any) {
    console.error('save dashboard error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/data/:collection/:id — delete entry
router.delete('/data/:collection/:id', (req: Request, res: Response) => {
  try {
    const { collection, id } = req.params;
    const store = readStore();

    const collectionMap: Record<string, keyof StoreData> = {
      'generated-images': 'generatedImages',
      vision: 'visionAnalyses',
      chat: 'chatSessions',
      sustainability: 'sustainabilityReports',
      dashboard: 'dashboardSnapshots',
    };

    const key = collectionMap[collection];
    if (!key) {
      res.status(400).json({ error: 'Invalid collection' });
      return;
    }

    const arr = store[key] as any[];
    const idx = arr.findIndex((item: any) => item.id === id);
    if (idx === -1) {
      res.status(404).json({ error: 'Entry not found' });
      return;
    }

    // Delete associated image file
    if ((key === 'visionAnalyses' || key === 'generatedImages') && arr[idx].imageFile) {
      const imagePath = path.join(IMAGES_DIR, arr[idx].imageFile);
      if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    arr.splice(idx, 1);
    writeStore(store);
    res.json({ success: true });
  } catch (error: any) {
    console.error('delete entry error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/data/images/:filename — serve saved images
router.get('/data/images/:filename', (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(IMAGES_DIR, filename);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Image not found' });
      return;
    }

    res.sendFile(filePath);
  } catch (error: any) {
    console.error('serve image error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

export default router;
