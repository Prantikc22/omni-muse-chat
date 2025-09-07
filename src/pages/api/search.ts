// pages/api/search.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const SEARX_BASE = process.env.SEARX_BASE || process.env.NEXT_PUBLIC_SEARX_BASE || 'http://157.151.249.125:8080';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const q = (req.query.q as string) || (req.body && req.body.q);
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }

    // Optional: simple server-side rate limiting / API key (example)
    // const apiKey = req.headers['x-api-key'];
    // if (process.env.SEARCH_API_KEY && apiKey !== process.env.SEARCH_API_KEY) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }

    // sanitize query (strip dangerous characters)
    const safeQ = String(q).slice(0, 500);

    // typical searx query params: format=json, safesearch, language, etc.
    const url = new URL('/search', SEARX_BASE);
    url.searchParams.set('q', safeQ);
    url.searchParams.set('format', 'json');
    // tune these flags for your searx instance
    url.searchParams.set('safesearch', '1');
    url.searchParams.set('language', 'en');
    url.searchParams.set('pageno', '1');

    const r = await fetch(url.toString(), { method: 'GET' /*, signal: abortSignal */});
    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'Searx error', status: r.status, body: text });
    }

    const data = await r.json();
    // Optionally re-shape results for client: keep results and engines
    return res.status(200).json(data);
  } catch (err: any) {
    console.error('search proxy error', err);
    return res.status(500).json({ error: 'Internal Server Error', message: err.message });
  }
}
