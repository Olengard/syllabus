// Tutti gli articoli dei feed dell'utente — fetch parallelo, ID stabili md5
import { getUser, db, md5, fetchFeed } from "./_lib.js";

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });

  const feeds = (await db("GET", `dg_feeds?select=*&user_id=eq.${user.id}`)).data || [];
  const errors = [];
  const all = [];

  const results = await Promise.allSettled(feeds.map(async (f) => ({ f, parsed: await fetchFeed(f.url) })));
  for (const r of results) {
    if (r.status === "rejected") continue;
    const { f, parsed } = r.value;
    if (!parsed.items.length) { errors.push(`${f.name}: nessun articolo`); continue; }
    for (const it of parsed.items.slice(0, 30)) {
      all.push({
        id: md5(it.link).slice(0, 16),
        title: it.title || "(senza titolo)",
        link: it.link, desc: it.desc,
        date: it.date ? new Date(it.date).toISOString() : new Date().toISOString(),
        feedId: f.id, feedName: f.name, feedColor: f.color, feedCategory: f.category,
      });
    }
  }
  results.forEach((r, i) => {
    if (r.status === "rejected") errors.push(`${feeds[i]?.name}: ${String(r.reason?.message || r.reason).slice(0, 120)}`);
  });

  all.sort((a, b) => (a.date < b.date ? 1 : -1));
  return res.json({ articles: all, errors });
}
