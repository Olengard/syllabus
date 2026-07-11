/* global process */
// Proxy riassunti articolo — restituisce { text } come il vecchio endpoint Render
import { getUser } from "./_lib.js";

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurata" });

  const { messages = [], system = "", max_tokens = 1500, model = "claude-sonnet-4-6" } = req.body || {};
  const payload = { model, max_tokens: Math.min(parseInt(max_tokens) || 1500, 8000), messages };
  if (system) payload.system = system;

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data.error?.message || `HTTP ${r.status}` });
    return res.json({ text: data.content?.[0]?.text || "" });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
