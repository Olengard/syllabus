/* global process */
// Generazione digest AI — port del prompt v2 dal server Flask
import { getUser, db, fetchFeed } from "./_lib.js";

const TYPES = {
  general: { label: "Generalista",        hours: 48,  cat: null,      focus: "notizie generali di attualità, politica, economia, mondo", instruction: "Copri le principali notizie del giorno in modo equilibrato." },
  culture: { label: "Arte e Cultura",     hours: 168, cat: "culture", focus: "letteratura, arte, musica, cinema, mostre, cultura, libri, recensioni", instruction: "Concentrati esclusivamente su notizie culturali: libri, mostre, musica, cinema, teatro." },
  science: { label: "Scienza e Tecnologia", hours: 168, cat: "tech",  focus: "scienza, tecnologia, intelligenza artificiale, ricerca, innovazione, spazio, medicina", instruction: "Concentrati esclusivamente su notizie scientifiche e tecnologiche, con particolare attenzione all'intelligenza artificiale." },
  italy:   { label: "Notizie Italiane",   hours: 48,  cat: null,      focus: "notizie italiane, politica italiana, economia italiana, cronaca italiana", instruction: "Concentrati esclusivamente su notizie che riguardano l'Italia." },
};
const IT_DAYS = ["lunedì","martedì","mercoledì","giovedì","venerdì","sabato","domenica"];
const IT_MONTHS = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];

export default async function handler(req, res) {
  const user = await getUser(req);
  if (!user) return res.status(401).json({ error: "Non autenticato" });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY non configurata su Vercel" });

  const { digest_type = "general", priority_feeds = [] } = req.body || {};
  const t = TYPES[digest_type] || TYPES.general;
  const now = new Date();
  const cutoff = new Date(now - t.hours * 3600e3);
  const fallbackCutoff = new Date(now - 14 * 86400e3);

  let feeds = (await db("GET", `dg_feeds?select=*&user_id=eq.${user.id}`)).data || [];
  if (t.cat) {
    const themed = feeds.filter((f) => f.category === t.cat);
    if (themed.length) feeds = themed;
  }
  if (!feeds.length) return res.status(400).json({ error: "Nessun feed disponibile" });

  const all = [];
  const results = await Promise.allSettled(feeds.map(async (f) => ({ f, parsed: await fetchFeed(f.url) })));
  for (const r of results) {
    if (r.status === "rejected") continue;
    const { f, parsed } = r.value;
    const arts = parsed.items.slice(0, 30).map((it) => ({
      source: f.name, title: it.title, desc: it.desc, link: it.link,
      priority: priority_feeds.includes(f.name),
      date: it.date ? new Date(it.date) : null,
    })).filter((a) => a.title);
    const recent = arts.filter((a) => a.date && a.date >= cutoff);
    if (recent.length) all.push(...recent.slice(0, 10));
    else {
      const fb = arts.filter((a) => a.date && a.date >= fallbackCutoff);
      all.push(...(fb.length ? fb : arts).slice(0, 2));
    }
  }
  if (!all.length) return res.status(500).json({ error: "Nessun articolo trovato" });
  all.sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0));

  const fmt = (a, i) => {
    const ds = a.date ? `${String(a.date.getDate()).padStart(2,"0")}/${String(a.date.getMonth()+1).padStart(2,"0")} ${String(a.date.getHours()).padStart(2,"0")}:${String(a.date.getMinutes()).padStart(2,"0")}` : "?";
    return `${i}. [${a.source} — ${ds}] ${a.title}` + (a.desc ? `\n   ${a.desc.slice(0,150)}` : "") + `\n   Link: ${a.link}\n`;
  };
  const prio = all.filter((a) => a.priority).slice(0, 30);
  const normal = all.filter((a) => !a.priority).slice(0, 50);
  const lines = [];
  if (prio.length) { lines.push("=== FEED PRIORITARI ===\n", ...prio.map((a,i)=>fmt(a,i+1)), "=== ALTRI FEED ===\n"); }
  lines.push(...normal.map((a,i)=>fmt(a,prio.length+i+1)));

  const todayStr = `${IT_DAYS[(now.getDay()+6)%7]} ${now.getDate()} ${IT_MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  const periodStr = t.hours <= 48 ? `ultime ${t.hours} ore` : "ultima settimana";
  const prompt = [
    `Sei il curatore di un digest '${t.label}' per un lettore italiano colto, curioso e con poco tempo.`,
    `Oggi è ${todayStr}. Il digest copre le notizie delle ${periodStr}.`,
    `\nTEMA: ${t.focus}`, `ISTRUZIONI: ${t.instruction}`,
    "\nEcco gli articoli disponibili (con fonte e data):\n", lines.join("\n"),
    "\nScrivi un digest discorsivo in italiano, da leggere in 5-7 minuti:",
    "- Inizia con un paragrafo introduttivo che colga il filo della giornata/settimana, non un elenco",
    "- Dividi in 3-5 sezioni tematiche con titolo breve ed evocativo",
    "- Per ogni sezione scrivi 3-5 frasi discorsive che COLLEGHINO le notizie tra loro,",
    "  ne spieghino il contesto e perché contano — non limitarti a riassumerle in sequenza",
    "- Cita gli articoli con il formato [Titolo](URL), integrandoli nel discorso",
    "- Se più fonti coprono la stessa notizia, trattala una volta sola citando la fonte migliore",
    "- Concludi con 'Da seguire': 1-2 sviluppi attesi nei prossimi giorni e perché",
    "- Tono: intelligente, asciutto, con un'opinione implicita ma mai gridata; mai frasi fatte",
    "- SELEZIONA con gusto: meglio approfondire 12 notizie che elencarne 40;",
    "  ignora del tutto gli articoli non pertinenti al tema",
    "\nRispondi SOLO con il testo del digest in Markdown, senza preamboli.",
  ].join("\n");

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!resp.ok) {
    const e = await resp.json().catch(() => ({}));
    return res.status(500).json({ error: `Errore API Anthropic: ${resp.status} — ${e.error?.message || ""}` });
  }
  const rj = await resp.json();
  const usage = rj.usage || {};
  const cost = Math.round((usage.input_tokens * 3 / 1e6 + usage.output_tokens * 15 / 1e6) * 1e4) / 1e4;
  const result = {
    digest: rj.content?.[0]?.text || "", article_count: all.length, label: t.label,
    generated_at: now.toISOString(), usage, cost_usd: cost,
  };
  await db("POST", "dg_preferences", { user_id: user.id, key: `digest_last_${digest_type}`, value: result, updated_at: now.toISOString() }, "resolution=merge-duplicates");
  return res.json(result);
}
