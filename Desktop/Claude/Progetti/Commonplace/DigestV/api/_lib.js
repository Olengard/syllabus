/* global process */
// Utilità condivise delle funzioni DigestV (il prefisso _ esclude il file dagli endpoint)
import { createHash } from "node:crypto";

export const SB_URL = "https://pchldmiavycxzpkzochn.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaGxkbWlhdnljeHpwa3pvY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mjk5MDAsImV4cCI6MjA4NzIwNTkwMH0.bVhCJfeCMnPcR5Ub4hLqNSmVdST5P6cT6T_2kzdKGYM";

// Verifica il JWT del login suite e restituisce l'utente (o null)
export async function getUser(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  try {
    const r = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: ANON, Authorization: auth } });
    if (!r.ok) return null;
    const u = await r.json();
    return u?.id ? u : null;
  } catch { return null; }
}

// Operazioni DB con service key (sempre filtrate per user_id dai chiamanti!)
export async function db(method, path, body, prefer) {
  const key = process.env.SUPABASE_SERVICE_KEY;
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key, Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(prefer ? { Prefer: prefer } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let data = null;
  try { data = txt ? JSON.parse(txt) : null; } catch { data = txt; }
  return { ok: r.ok, status: r.status, data };
}

export function md5(s) {
  return createHash("md5").update(String(s), "utf-8").digest("hex");
}

export function daydSeed(s) {
  return parseInt(createHash("md5").update(s).digest("hex").slice(0, 12), 16);
}

export const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/rss+xml,application/atom+xml,application/xml;q=0.9,text/html;q=0.8,*/*;q=0.7",
  "Accept-Language": "it-IT,it;q=0.9,en-US;q=0.8",
};

export function cleanHtml(t) {
  if (!t) return "";
  return String(t).replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ").trim().slice(0, 300);
}

// Scarica e parsa un feed RSS/Atom → { title, items:[{title,link,desc,date}] }
export async function fetchFeed(url, timeoutMs = 8000) {
  const { XMLParser } = await import("fast-xml-parser");
  let r = await fetch(url, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  if (r.status === 403) {
    // Il sito blocca le richieste "fredde": come server.py, visita la homepage
    // (raccogliendo i cookie) e ritenta con Referer + Cookie.
    const origin = new URL(url).origin + "/";
    const extra = { Referer: origin };
    try {
      const hp = await fetch(origin, { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
      const cookies = (hp.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
      if (cookies) extra.Cookie = cookies;
    } catch { /* si ritenta comunque col solo Referer */ }
    r = await fetch(url, { headers: { ...BROWSER_HEADERS, ...extra }, signal: AbortSignal.timeout(timeoutMs), redirect: "follow" });
  }
  if (!r.ok) throw new Error(`HTTP ${r.status} — il sito blocca le richieste automatiche`);
  const xml = await r.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(xml)) throw new Error("HTML, non feed");
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
  const doc = parser.parse(xml);
  const arr = (x) => (Array.isArray(x) ? x : x ? [x] : []);
  let title = "", items = [];
  if (doc.rss?.channel) {
    title = cleanHtml(doc.rss.channel.title);
    items = arr(doc.rss.channel.item).map((i) => ({
      title: cleanHtml(i.title),
      link: typeof i.link === "string" ? i.link : i.link?.["@_href"] || i.guid?.["#text"] || String(i.guid || ""),
      desc: cleanHtml(i.description || i["content:encoded"] || ""),
      date: i.pubDate || i["dc:date"] || null,
    }));
  } else if (doc.feed) {
    title = cleanHtml(doc.feed.title?.["#text"] ?? doc.feed.title);
    items = arr(doc.feed.entry).map((i) => {
      const links = arr(i.link);
      const alt = links.find((l) => l["@_rel"] === "alternate") || links[0];
      return {
        title: cleanHtml(i.title?.["#text"] ?? i.title),
        link: alt?.["@_href"] || "",
        desc: cleanHtml(i.summary?.["#text"] ?? i.summary ?? i.content?.["#text"] ?? ""),
        date: i.published || i.updated || null,
      };
    });
  } else throw new Error("formato feed non riconosciuto");
  return { title, items: items.filter((i) => i.link) };
}
