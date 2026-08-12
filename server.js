import express from 'express';
import { createServer as createViteServer } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const port = process.env.PORT || 3000;

async function start() {
  const app = express();

  // ═══ MND NEWS PROXY ═══
  app.get('/api/news', async (req, res) => {
    try {
      const response = await fetch('https://www.mortgagenewsdaily.com/aroundtheweb');
      const html = await response.text();
      const items = [];

      // Parse article links from the Around the Web page
      const linkRegex = /<a[^>]*href="(https?:\/\/(?!www\.mortgagenewsdaily)[^"]+)"[^>]*>\s*([^<]+)<\/a>\s*([^<]*)/gi;
      let m;
      while ((m = linkRegex.exec(html)) !== null && items.length < 50) {
        const link = m[1].trim();
        const title = m[2].replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
        const after = m[3].trim();
        if (title.length < 15) continue;
        if (/share|facebook|twitter|linkedin|subscribe|newsletter|load more|close|sign up|download|mobile app/i.test(title)) continue;
        if (/\.(png|jpg|svg|gif|css|js)$/i.test(link)) continue;
        const parts = after.split(/\s*-\s*/);
        const source = parts[0]?.trim() || '';
        const time = parts.slice(1).join(' - ').trim();
        if (source) items.push({ title, link, source, time });
      }

      // Also try to get MND's own top headlines
      const headlineRegex = /<a[^>]*href="(\/[^"]*(?:markets|news|opinion)[^"]*)"[^>]*title="([^"]*)"[^>]*>/gi;
      const mndItems = [];
      while ((m = headlineRegex.exec(html)) !== null && mndItems.length < 10) {
        const title = m[2].replace(/&amp;/g, '&').replace(/&#x27;/g, "'").trim();
        if (title.length > 15 && !mndItems.find(x => x.title === title)) {
          mndItems.push({
            title,
            link: 'https://www.mortgagenewsdaily.com' + m[1],
            source: 'MND',
            time: '',
          });
        }
      }

      res.json({ items, mndItems, fetched: new Date().toISOString() });
    } catch (e) {
      console.error('MND fetch error:', e.message);
      res.status(500).json({ items: [], mndItems: [], error: e.message });
    }
  });

  if (isProduction) {
    app.use(express.static(resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start();
