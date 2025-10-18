export default async function handler(req, res) {
  const { action, prompt, taskId } = req.query;

  let apiUrl = "https://yabes-api.pages.dev/api/ai/video/v2";

  if (action === "create" && prompt) {
    apiUrl += `?action=create&prompt=${encodeURIComponent(prompt)}`;
  } else if (action === "status" && taskId) {
    apiUrl += `?action=status&taskId=${encodeURIComponent(taskId)}`;
  } else {
    return res.status(400).json({ error: "Missing parameters" });
  }

  try {
    const response = await fetch(apiUrl);
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({ error: "Proxy error", details: error.message });
  }
}
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
