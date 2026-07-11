/* global process */
// Memoria — riemersioni deterministiche dal layer cp (port 1:1 dal Flask)
import { getUser, db, daydSeed } from "./_lib.js";

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });
  if (!process.env.SUPABASE_SERVICE_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY mancante" });

  const today = new Date();
  const dstr = today.toISOString().slice(0, 10);

  const cached = (await db("GET", `dg_preferences?select=value&user_id=eq.${user.id}&key=eq.memoria_cache`)).data?.[0]?.value;
  if (cached?.date === dstr) return res.json(cached.payload || {});

  const items = [];
  const quotes = (await db("GET", `cp_quotes?select=id,text,author,work_title,comment,favorite&user_id=eq.${user.id}&deleted_at=is.null&limit=1000`)).data || [];
  if (quotes.length) {
    let pool = daydSeed("fav:" + dstr) % 3 === 0 ? quotes.filter((q) => q.favorite) : quotes;
    pool = (pool.length ? pool : quotes).sort((a, b) => a.id.localeCompare(b.id));
    const q = pool[daydSeed("memoria-quote:" + dstr) % pool.length];
    items.push({ kind: "quote", text: q.text, author: q.author || "", work: q.work_title || "", comment: q.comment || "" });
  }

  const books = (await db("GET", `bs_books?select=title,author,rating,read_month,read_year,status,added_at&user_id=eq.${user.id}&deleted_at=is.null&limit=1000`)).data || [];
  const read = books.filter((b) => b.status === "letto");
  const month = today.getMonth() + 1, year = today.getFullYear();

  const annivs = read.filter((b) => parseInt(b.read_month) === month && parseInt(b.read_year) < year)
    .sort((a, b) => (a.read_year - b.read_year) || String(a.title).localeCompare(String(b.title)));
  if (annivs.length) {
    const b = annivs[daydSeed("anniv:" + dstr) % annivs.length];
    items.push({ kind: "anniversary", years_ago: year - parseInt(b.read_year), title: b.title, author: b.author || "", rating: b.rating || 0 });
  }

  const loved = read.filter((b) => (b.rating || 0) >= 4 && b.read_year && year - parseInt(b.read_year) >= 2)
    .sort((a, b) => String(a.title).localeCompare(String(b.title)));
  if (loved.length) {
    const b = loved[daydSeed("loved:" + dstr) % loved.length];
    items.push({ kind: "rediscover", title: b.title, author: b.author || "", rating: b.rating, read_year: b.read_year });
  }

  const wl = books.filter((b) => b.status === "wishlist" && b.added_at).sort((a, b) => a.added_at.localeCompare(b.added_at));
  if (wl.length) {
    const b = wl[0];
    const months = Math.max(0, Math.floor((today - new Date(b.added_at)) / 86400e3 / 30));
    items.push({ kind: "wishlist", title: b.title, author: b.author || "", months });
  }

  const start = new Date(today - 370 * 86400e3).toISOString();
  const end = new Date(today - 358 * 86400e3).toISOString();
  let evs = (await db("GET", `cp_log?select=event_type,event_at,item_id&event_at=gte.${start}&order=event_at.asc&limit=100`)).data || [];
  evs = evs.filter((e) => e.event_at <= end);
  if (evs.length) {
    const ids = [...new Set(evs.map((e) => e.item_id))].slice(0, 10);
    const idlist = ids.map((i) => `"${i}"`).join(",");
    const cpi = (await db("GET", `cp_items?select=id,title,creator,type&id=in.(${idlist})`)).data || [];
    const names = Object.fromEntries(cpi.map((c) => [c.id, c]));
    const yearAgo = evs.slice(0, 4).map((e) => names[e.item_id] && ({
      event: e.event_type, title: names[e.item_id].title,
      creator: names[e.item_id].creator || "", type: names[e.item_id].type || "",
    })).filter(Boolean);
    if (yearAgo.length) items.push({ kind: "year_ago", events: yearAgo });
  }

  const payload = { date: dstr, items };
  await db("POST", "dg_preferences",
    { user_id: user.id, key: "memoria_cache", value: { date: dstr, payload }, updated_at: today.toISOString() },
    "resolution=merge-duplicates");
  return res.json(payload);
}
