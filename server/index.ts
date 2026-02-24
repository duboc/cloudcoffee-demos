import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import geminiRoutes from './routes/gemini.js';
import persistenceRoutes from './routes/persistence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON bodies up to 50MB (base64 images are large)
app.use(express.json({ limit: '50mb' }));

// API routes
app.use('/api', geminiRoutes);
app.use('/api', persistenceRoutes);

// In production, serve the built frontend
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
