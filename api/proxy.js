module.exports = async function (req, res) {
  try {
    const { action, prompt } = req.query;

    if (action === "create") {
      // test response
      return res.status(200).json({ message: `Prompt received: ${prompt}` });
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server crashed" });
  }
};};
