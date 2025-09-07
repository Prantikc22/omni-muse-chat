// src/services/websearch.ts
export interface WebSearchResult {
  id: number;
  title: string;
  url: string;
  snippet: string;
  meta?: any;
}

/**
 * If running in the browser we will use the app-level proxy (/api/search).
 * If running server-side, prefer process.env.SEARX_BASE (or fallback to the IP).
 */
function getSearxBaseForServer(): string {
  if (typeof process !== 'undefined' && process.env) {
    return (process.env.SEARX_BASE || process.env.NEXT_PUBLIC_SEARX_BASE || '');
  }
  return '';
}

const searxServerBase = getSearxBaseForServer();

export async function searxSearch(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  // If in browser -> use relative API proxy
  // new — always request JSON from the proxy
const url = (typeof window !== 'undefined')
? `/api/search?q=${encodeURIComponent(query)}&format=json`
: `${searxServerBase || 'http://157.151.249.125:8080'}/search?q=${encodeURIComponent(query)}&format=json&safesearch=1`;

  const res = await fetch(url, { credentials: 'omit' });
  if (!res.ok) {
    throw new Error(`SearxNG error: ${res.status}`);
  }

  const data = await res.json();
  const rawResults: any[] = (data && data.results) ? data.results : (Array.isArray(data) ? data : (data || []).results || []);

  const results = (rawResults || []).slice(0, maxResults).map((r: any, i: number) => {
    const rawSnippet = (r.content || r.title || r.description || '').replace(/\n+/g, ' ').trim();
    const snippet = rawSnippet.length > 400 ? rawSnippet.slice(0, 400) + '...' : rawSnippet;
    return {
      id: i + 1,
      title: r.title || r.url || `Result ${i + 1}`,
      url: r.url || r.link || '',
      snippet,
      meta: r,
    } as WebSearchResult;
  });

  return results;
}

function looksLikeWeatherQuery(q: string) {
  const s = q.toLowerCase();
  return /\b(weather|temperature|forecast|rain|sunny|wind|humidity)\b/.test(s);
}

export async function getWeatherForQuery(query: string) {
  const isKolkata = /kolkata|calcutta/i.test(query);
  if (!isKolkata) return null;

  try {
    const lat = 22.57;
    const lon = 88.36;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const cur = data.current_weather;
    if (!cur) return null;

    const summary = `Current: ${cur.temperature}°C, wind ${cur.windspeed} m/s, wind direction ${cur.winddirection}° (source: Open-Meteo).`;
    return {
      title: `Open-Meteo - Kolkata current weather`,
      url,
      snippet: summary,
      meta: data,
    } as any;
  } catch (err) {
    console.error('weather fetch error', err);
    return null;
  }
}

export async function webSearchSmart(query: string, maxResults = 5): Promise<WebSearchResult[]> {
  try {
    if (looksLikeWeatherQuery(query)) {
      const w = await getWeatherForQuery(query);
      if (w) return [{ id: 1, title: w.title, url: w.url, snippet: w.snippet, meta: w.meta }];
      // fall through to searx if weather lookup fails
    }
    const results = await searxSearch(query, maxResults);
    return results;
  } catch (err) {
    console.error('webSearchSmart error', err);
    return [];
  }
}
