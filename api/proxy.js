export default async function handler(req, res) {
  const { action, prompt, taskId } = req.query;

  try {
    // Basic validation
    if (!action) return res.status(400).json({ error: "Missing 'action' parameter" });

    // Build API URL
    let apiUrl = "https://yabes-api.pages.dev/api/ai/video/v2";
    if (action === "create" && prompt) {
      apiUrl += `?action=create&prompt=${encodeURIComponent(prompt)}`;
    } else if (action === "status" && taskId) {
      apiUrl += `?action=status&taskId=${encodeURIComponent(taskId)}`;
    } else {
      return res.status(400).json({ error: "Invalid parameters" });
    }

    // Fetch request
    const response = await fetch(apiUrl, { method: "GET" });

    // Handle non-OK responses
    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: "API request failed", details: text });
    }

    // Try parsing JSON safely
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text }; // fallback if not valid JSON
    }

    res.status(200).json(data);

  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).json({ error: "Server crashed", details: error.message });
  }
}
