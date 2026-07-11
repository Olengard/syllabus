/* global process */
// CRUD feed: GET lista | POST aggiungi (con autodiscovery) | PATCH categoria/nome | DELETE ?id=
import { getUser, db, md5, fetchFeed, BROWSER_HEADERS } from "./_lib.js";

const COLORS = ["#c8963e","#c0522a","#5a7a5a","#4a6a8a","#8a5a8a","#6a8a4a","#8a6a4a","#4a8a7a","#7a4a6a","#5a6a8a"];

async function discover(pageUrl) {
  try {
    const r = await fetch(pageUrl, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(8000) });
    const html = await r.text();
    const m = [...html.slice(0, 60000).matchAll(/<link[^>]+>/gi)]
      .map((x) => x[0])
      .find((tag) => /rel=["']?alternate/i.test(tag) && /application\/(rss|atom)\+xml/i.test(tag));
    if (m) {
      const href = m.match(/href=["']([^"']+)["']/i);
      if (href) return new URL(href[1], pageUrl).href;
    }
  } catch { /* prosegui coi percorsi convenzionali */ }
  for (const p of ["feed", "rss", "feed.xml", "rss.xml", "atom.xml", "index.xml"]) {
    const candidate = new URL(p, pageUrl.endsWith("/") ? pageUrl : pageUrl + "/").href;
    try { await fetchFeed(candidate, 6000); return candidate; } catch { /* prossimo */ }
  }
  return null;
}

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });

  if (req.method === "GET") {
    const r = await db("GET", `dg_feeds?select=*&user_id=eq.${user.id}&order=created_at`);
    return res.status(r.ok ? 200 : 500).json(r.ok ? r.data : { error: "DB error" });
  }

  if (req.method === "POST") {
    let { url, name, category } = req.body || {};
    url = (url || "").trim();
    if (!url) return res.status(400).json({ error: "URL mancante" });
    const existing = (await db("GET", `dg_feeds?select=id,url&user_id=eq.${user.id}`)).data || [];
    if (existing.find((f) => f.url === url)) return res.status(400).json({ error: "Feed già presente" });
    let parsed;
    try {
      parsed = await fetchFeed(url);
    } catch {
      const found = await discover(url);
      if (!found) return res.status(400).json({ error: "Non è un feed e non ho trovato feed collegati alla pagina" });
      url = found;
      if (existing.find((f) => f.url === url)) return res.status(400).json({ error: "Feed già presente" });
      try { parsed = await fetchFeed(url); }
      catch (e) { return res.status(400).json({ error: "Feed trovato ma illeggibile: " + e.message }); }
    }
    const row = {
      id: md5(url).slice(0, 12), user_id: user.id,
      name: (name || "").trim() || parsed.title || url,
      url, color: COLORS[existing.length % COLORS.length],
      category: ["news", "culture", "tech"].includes(category) ? category : "news",
    };
    const r = await db("POST", "dg_feeds", row, "resolution=merge-duplicates");
    if (!r.ok) return res.status(500).json({ error: "Salvataggio fallito" });
    return res.json({ ok: true, ...row });
  }

  if (req.method === "PATCH") {
    const { id, category, name } = req.body || {};
    if (!id) return res.status(400).json({ error: "id mancante" });
    const patch = {};
    if (category) patch.category = category;
    if (name) patch.name = name;
    const r = await db("PATCH", `dg_feeds?id=eq.${id}&user_id=eq.${user.id}`, patch);
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  }

  if (req.method === "DELETE") {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: "id mancante" });
    const r = await db("DELETE", `dg_feeds?id=eq.${id}&user_id=eq.${user.id}`);
    return res.status(r.ok ? 200 : 500).json({ ok: r.ok });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
