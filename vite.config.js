import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ── Config: Default AI model ───────────────────────────────────────────────
// Available models: gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-5 (when available)
// Note: GPT-5 requires API access - check OpenAI dashboard for availability
const DEFAULT_MODEL = 'gpt-5-nano'; // Change to 'gpt-5' when available

function createApiProxy(openAiApiKey) {
  // ── helpers ──────────────────────────────────────────────────────────────
  function notAllowed(res) {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
  }
  function serverError(res, msg) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: msg }));
  }
  function readBody(req) {
    return new Promise((resolve) => {
      let buf = '';
      req.on('data', (c) => (buf += c));
      req.on('end', () => resolve(buf));
    });
  }
  function readBinaryBody(req) {
    return new Promise((resolve) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  // ── /api/chat-stream (streaming) ─────────────────────────────────────────
  async function handleChatStream(req, res) {
    if (req.method !== 'POST') return notAllowed(res);
    if (!openAiApiKey) return serverError(res, 'Missing OPENAI_API_KEY on server.');

    const raw = await readBody(req);
    let payload;
    try { payload = JSON.parse(raw || '{}'); }
    catch { res.statusCode = 400; res.end('Invalid JSON'); return; }

    const { messages, base64Image } = payload;
    if (!messages) return serverError(res, 'Missing messages');

    // Inject camera frame into last user message if provided
    const augmented = [...messages];
    if (base64Image) {
      const last = augmented[augmented.length - 1];
      if (last?.role === 'user') {
        const textContent = typeof last.content === 'string' ? last.content : '';
        augmented[augmented.length - 1] = {
          role: 'user',
          content: [
            { type: 'text', text: textContent },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        };
      }
    }

    try {
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openAiApiKey}`
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: augmented,
          max_tokens: 150,
          stream: true
        })
      });

      if (!upstream.ok) {
        const t = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(t);
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
      res.end();
    } catch (err) {
      if (!res.headersSent) serverError(res, 'Chat stream failed.');
      else res.end();
    }
  }

  // ── /api/chat (non-streaming, kept for compatibility) ────────────────────
  async function handleChat(req, res) {
    if (req.method !== 'POST') return notAllowed(res);
    if (!openAiApiKey) return serverError(res, 'Missing OPENAI_API_KEY on server.');

    const raw = await readBody(req);
    let payload;
    try { payload = JSON.parse(raw || '{}'); }
    catch { res.statusCode = 400; res.end('Invalid JSON'); return; }

    const { messages, base64Image } = payload;
    if (!messages) return serverError(res, 'Missing messages');

    const augmented = [...messages];
    if (base64Image) {
      const last = augmented[augmented.length - 1];
      if (last?.role === 'user') {
        const textContent = typeof last.content === 'string' ? last.content : '';
        augmented[augmented.length - 1] = {
          role: 'user',
          content: [
            { type: 'text', text: textContent },
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        };
      }
    }

    try {
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiApiKey}` },
        body: JSON.stringify({ model: DEFAULT_MODEL, messages: augmented, max_tokens: 150 })
      });
      const responseText = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(responseText);
    } catch { serverError(res, 'Chat proxy failed.'); }
  }

  // ── /api/whisper ─────────────────────────────────────────────────────────
  async function handleWhisper(req, res) {
    if (req.method !== 'POST') return notAllowed(res);
    if (!openAiApiKey) return serverError(res, 'Missing OPENAI_API_KEY on server.');
    try {
      const body = await readBinaryBody(req);
      const contentType = req.headers['content-type'] || 'multipart/form-data';
      const upstream = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openAiApiKey}`, 'Content-Type': contentType },
        body
      });
      const responseText = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(responseText);
    } catch { serverError(res, 'Whisper proxy failed.'); }
  }

  // ── /api/tts ─────────────────────────────────────────────────────────────
  async function handleTts(req, res) {
    if (req.method !== 'POST') return notAllowed(res);
    if (!openAiApiKey) return serverError(res, 'Missing OPENAI_API_KEY on server.');

    const raw = await readBody(req);
    let payload;
    try { payload = JSON.parse(raw || '{}'); }
    catch { res.statusCode = 400; res.end('Invalid JSON'); return; }

    try {
      const upstream = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiApiKey}` },
        body: JSON.stringify({
          model: 'tts-1',
          voice: payload.voice || 'nova',
          input: payload.text || '',
          speed: payload.speed || 1.05
        })
      });
      if (!upstream.ok) {
        const t = await upstream.text();
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(t);
        return;
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/mpeg');
      res.end(buf);
    } catch { serverError(res, 'TTS proxy failed.'); }
  }

  // ── /api/vision (legacy) ─────────────────────────────────────────────────
  async function handleVision(req, res) {
    if (req.method !== 'POST') return notAllowed(res);
    if (!openAiApiKey) return serverError(res, 'Missing OPENAI_API_KEY on server.');
    const raw = await readBody(req);
    let payload;
    try { payload = JSON.parse(raw || '{}'); } catch { payload = {}; }
    const { base64Image, prompt } = payload;
    if (!base64Image) return serverError(res, 'Missing base64Image');
    try {
      const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAiApiKey}` },
        body: JSON.stringify({ model: DEFAULT_MODEL, messages: [{ role: 'user', content: [{ type: 'text', text: prompt || 'Describe this image.' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } }] }], max_tokens: 500 })
      });
      const responseText = await upstream.text();
      res.statusCode = upstream.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(responseText);
    } catch { serverError(res, 'Vision proxy failed.'); }
  }

  return {
    name: 'api-proxy',
    configureServer(server) {
      server.middlewares.use('/api/chat-stream', handleChatStream);
      server.middlewares.use('/api/chat', handleChat);
      server.middlewares.use('/api/whisper', handleWhisper);
      server.middlewares.use('/api/tts', handleTts);
      server.middlewares.use('/api/vision', handleVision);
    },
    configurePreviewServer(server) {
      server.middlewares.use('/api/chat-stream', handleChatStream);
      server.middlewares.use('/api/chat', handleChat);
      server.middlewares.use('/api/whisper', handleWhisper);
      server.middlewares.use('/api/tts', handleTts);
      server.middlewares.use('/api/vision', handleVision);
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    server: { allowedHosts: true },
    plugins: [
      createApiProxy(env.OPENAI_API_KEY),
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['icons/pwa-192.png', 'icons/pwa-512.png'],
        manifest: {
          name: 'Jia - AI Visual Assistant',
          short_name: 'Jia',
          description: 'AI-powered visual assistant for accessibility',
          start_url: '/',
          display: 'standalone',
          orientation: 'portrait',
          theme_color: '#0a0e1a',
          background_color: '#0a0e1a',
          icons: [
            { src: '/icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: '/icons/pwa-512.png', sizes: '512x512', type: 'image/png' }
          ]
        }
      })
    ]
  };
});
