// Preferenze utente — GET tutte | POST bulk (stessa shape del vecchio /api/preferences Flask)
import { getUser, db } from "./_lib.js";

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });

  if (req.method === "GET") {
    const r = await db("GET", `dg_preferences?select=key,value&user_id=eq.${user.id}`);
    if (!r.ok) return res.status(500).json({ error: "DB error" });
    return res.json(Object.fromEntries((r.data || []).map((p) => [p.key, p.value])));
  }

  if (req.method === "POST") {
    const data = req.body || {};
    const keys = Object.keys(data);
    if (!keys.length) return res.status(400).json({ error: "Nessun dato" });
    const now = new Date().toISOString();
    const rows = keys.map((key) => ({ user_id: user.id, key, value: data[key], updated_at: now }));
    const r = await db("POST", "dg_preferences", rows, "resolution=merge-duplicates");
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
