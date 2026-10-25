import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Version endpoint for PWA update checks
app.get('/api/version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json({
    name: 'Btt Music',
    version: '1.3.0',
    buildDate: '2026-10-25',
    releaseNotes:
      'Btt Music 1.3.0: iPhone lock screen Next/Previous buttons (replaces +10/-10), touch-friendly volume cursor fix with drag feedback, and new Volume Booster feature (amplifies up to 3x louder with zero-clipping dynamics limiter).',
    minSupportedVersion: '1.0.0',
  });
});

// ---------------- TELEGRAM PROXY ENDPOINTS ----------------
// Resolves browser CORS issues and streams audio files reliably

// 1. Verify Bot Token
app.get('/api/telegram/verify', async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    return res.status(400).json({ ok: false, description: 'Token is required' });
  }

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${token.trim()}/getMe`);
    const data = await telegramRes.json();
    return res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reach Telegram API';
    return res.status(502).json({ ok: false, description: msg });
  }
});

// 2. Get Updates (Messages & Channel Posts)
app.get('/api/telegram/updates', async (req, res) => {
  const token = req.query.token as string;
  const limit = req.query.limit || '100';
  if (!token) {
    return res.status(400).json({ ok: false, description: 'Token is required' });
  }

  try {
    const url = `https://api.telegram.org/bot${token.trim()}/getUpdates?limit=${limit}&allowed_updates=["message","channel_post"]`;
    const telegramRes = await fetch(url);
    const data = await telegramRes.json();
    return res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reach Telegram API';
    return res.status(502).json({ ok: false, description: msg });
  }
});

// 3. Get File Info (Path)
app.get('/api/telegram/file-info', async (req, res) => {
  const token = req.query.token as string;
  const fileId = req.query.file_id as string;
  if (!token || !fileId) {
    return res.status(400).json({ ok: false, description: 'Token and file_id are required' });
  }

  try {
    const url = `https://api.telegram.org/bot${token.trim()}/getFile?file_id=${encodeURIComponent(fileId)}`;
    const telegramRes = await fetch(url);
    const data = await telegramRes.json();
    return res.json(data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to reach Telegram API';
    return res.status(502).json({ ok: false, description: msg });
  }
});

// 4. Download Audio File Stream
app.get('/api/telegram/download', async (req, res) => {
  const token = req.query.token as string;
  const filePath = req.query.file_path as string;
  if (!token || !filePath) {
    return res.status(400).json({ ok: false, description: 'Token and file_path are required' });
  }

  try {
    const fileUrl = `https://api.telegram.org/file/bot${token.trim()}/${filePath}`;
    const telegramRes = await fetch(fileUrl);

    if (!telegramRes.ok) {
      return res.status(telegramRes.status).json({
        ok: false,
        description: `Telegram download failed: HTTP ${telegramRes.status}`,
      });
    }

    const contentType = telegramRes.headers.get('content-type') || 'audio/mpeg';
    const contentLength = telegramRes.headers.get('content-length');

    res.setHeader('Content-Type', contentType);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // Stream response to client
    if (telegramRes.body) {
      const { Readable } = await import('stream');
      const nodeStream = Readable.fromWeb(telegramRes.body as import('stream/web').ReadableStream);
      nodeStream.pipe(res);
    } else {
      const buffer = await telegramRes.arrayBuffer();
      res.send(Buffer.from(buffer));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to stream audio file';
    return res.status(502).json({ ok: false, description: msg });
  }
});

// ---------------- VITE / STATIC INTEGRATION ----------------
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode with Vite dev middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode with built assets
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
