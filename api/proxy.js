// api/proxy.js
// Simple proxy for Yabes API to avoid browser CORS issues.
// It forwards query string and body to target endpoint and returns JSON.

const TARGET = 'https://yabes-api.pages.dev/api/ai/video/v2';

export default async function handler(req, res) {
  try {
    // Build target URL with query string forwarded
    const url = new URL(TARGET);
    // copy incoming query params (action, prompt, taskId, etc.)
    for (const [k, v] of Object.entries(req.query || {})) {
      url.searchParams.set(k, v);
    }

    // Setup fetch options
    const fetchOptions = {
      method: req.method || 'GET',
      headers: {
        // Forward content-type if present
        ...(req.headers['content-type'] ? { 'content-type': req.headers['content-type'] } : {}),
        // Some APIs need an origin/host header; we don't override others
      },
      // body only for non-GET
      body: ['GET','HEAD'].includes(req.method) ? undefined : req.body && JSON.stringify(req.body),
      // set redirect: 'follow' to follow any redirects
      redirect: 'follow'
    };

    // If req.method is POST and body already parsed by Vercel, stringify appropriately
    if (req.method === 'POST' && req.body && typeof req.body === 'object') {
      fetchOptions.body = JSON.stringify(req.body);
      fetchOptions.headers['content-type'] = 'application/json';
    }

    const r = await fetch(url.toString(), fetchOptions);

    // try to forward response as JSON if possible
    const contentType = r.headers.get('content-type') || '';
    const text = await r.text();

    // Set safe CORS headers for browser to call /api/proxy
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // forward status
    res.status(r.status || 200);

    // If JSON, parse and send json
    if (contentType.includes('application/json')) {
      try {
        const json = JSON.parse(text);
        return res.json(json);
      } catch (e) {
        // fallback to text
        return res.send(text);
      }
    } else {
      // other types (text/html etc.)
      res.setHeader('content-type', contentType || 'text/plain');
      return res.send(text);
    }

  } catch (err) {
    console.error('Proxy error', err);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(500).json({ error: 'Proxy error', details: (err && err.message) || String(err) });
  }
}
