// Registro Campagna: parser delle schede markdown della wiki Obsidian
// (Zeitgeist Wiki) → voci consultabili in-app (palette ⌘K, tab Campagna,
// pin di Sessione). Funzioni pure, testate in campaign.test.js.
//
// Formato atteso (vedi wiki): frontmatter YAML con `tipo`/`nome`/campi vari,
// primo blockquote dopo il titolo = riassunto, sezioni `## Titolo` con bullet.

// Quali `tipo:` importare, e in che gruppo dell'app finiscono.
export const IMPORT_TIPI = {
  png: "png",
  luogo: "luogo",
  fazione: "fazione",
  oggetto: "campagna",
  mistero: "campagna",
  concetto: "campagna",
};

// Campi frontmatter di servizio, esclusi dai dettagli mostrati.
const META_FIELDS = new Set(["tipo", "nome", "alias", "tags", "player_safe", "livello_spoiler"]);

// Rimuove la sintassi wiki/markdown per l'uso in-app:
// [[Pagina|Etichetta]] → Etichetta, [[Pagina]] → Pagina, **x** → x, `x` → x.
export function stripWiki(s) {
  return (s || "")
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .trim();
}

// Divide una lista YAML inline sul separatore "," ignorando le virgole
// dentro virgolette o dentro [[...]] (es. ["ex [[A]], capo", "[[B]]"]).
function splitYamlList(inner) {
  const out = [];
  let cur = "", depth = 0, quote = null;
  for (const ch of inner) {
    if (quote) { if (ch === quote) quote = null; cur += ch; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === "[") depth++;
    if (ch === "]") depth--;
    if (ch === "," && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map(x => unquote(x.trim())).filter(Boolean);
}

function unquote(s) {
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  return s;
}

// Parser YAML minimale per il frontmatter delle schede: solo `chiave: valore`
// scalare o lista inline [a, b]. Ritorna null se il frontmatter manca.
export function parseFrontmatter(text) {
  const norm = (text || "").replace(/\r\n/g, "\n");
  const m = norm.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const fields = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([\w][\w-]*)\s*:\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let value = kv[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      fields[key] = splitYamlList(value.slice(1, -1)).map(stripWiki);
    } else {
      fields[key] = stripWiki(unquote(value));
    }
  }
  return { fields, body: norm.slice(m[0].length) };
}

// Primo blockquote del corpo (righe `> ...` consecutive) → riassunto.
function extractSummary(body) {
  const m = body.match(/^> ?(.+(?:\n> ?.+)*)/m);
  if (!m) return "";
  return stripWiki(m[0].split("\n").map(l => l.replace(/^> ?/, "")).join(" "));
}

// Sezioni `## Titolo` → testo semplice (bullet appiattiti), per il dettaglio
// inline. "Fonti" è escluso (riferimenti ai PDF, inutili a tavolo).
const SKIP_SECTIONS = new Set(["fonti"]);
const MAX_SECTIONS = 6;
const MAX_SECTION_CHARS = 900;

function extractSections(body) {
  const sections = [];
  const re = /^## +(.+)$/gm;
  const heads = [];
  let m;
  while ((m = re.exec(body)) !== null) heads.push({ title: m[1].trim(), start: m.index, end: re.lastIndex });
  for (let i = 0; i < heads.length && sections.length < MAX_SECTIONS; i++) {
    const title = stripWiki(heads[i].title);
    if (SKIP_SECTIONS.has(title.toLowerCase())) continue;
    const chunk = body.slice(heads[i].end, i + 1 < heads.length ? heads[i + 1].start : undefined);
    const text = stripWiki(
      chunk
        .split("\n")
        .map(l => l.replace(/^\s*[-*] +/, "• ").replace(/^> ?/, "").trim())
        .filter(Boolean)
        .join("\n")
    ).slice(0, MAX_SECTION_CHARS);
    if (text) sections.push({ title, text });
  }
  return sections;
}

// Parsa una scheda wiki. Ritorna la voce del registro, o null se la pagina
// non è importabile (niente frontmatter, o `tipo` fuori whitelist).
export function parseWikiPage(filename, text) {
  const fm = parseFrontmatter(text);
  if (!fm) return null;
  const tipo = (fm.fields.tipo || "").toLowerCase();
  const kind = IMPORT_TIPI[tipo];
  if (!kind) return null;

  const nome = fm.fields.nome || (filename || "").replace(/\.md$/i, "").trim();
  if (!nome) return null;

  const extra = {};
  for (const [k, v] of Object.entries(fm.fields)) {
    if (!META_FIELDS.has(k) && v && v.length) extra[k] = v;
  }

  return {
    kind,                                   // gruppo in-app: png | luogo | fazione | campagna
    tipo,                                   // tipo originale wiki (per l'etichetta)
    nome,
    alias: Array.isArray(fm.fields.alias) ? fm.fields.alias : [],
    tags: Array.isArray(fm.fields.tags) ? fm.fields.tags : [],
    summary: extractSummary(fm.body),
    fields: extra,                          // campi liberi (ruolo, status, sede, ...)
    sections: extractSections(fm.body),
  };
}

// Etichetta leggibile per un campo frontmatter (ruolo → Ruolo, parte_di → Parte di).
export function fieldLabel(key) {
  const s = key.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Unione import nuovi + esistenti: chiave kind+nome, il nuovo vince.
// Le voci manuali (manual: true) non vengono mai sovrascritte da un import.
export function mergeCampaignEntries(existing, imported) {
  const key = (e) => `${e.kind}::${e.nome.toLowerCase()}`;
  const map = new Map();
  for (const e of existing) map.set(key(e), e);
  for (const e of imported) {
    const k = key(e);
    const prev = map.get(k);
    if (prev?.manual) continue;
    map.set(k, e);
  }
  return [...map.values()];
}
