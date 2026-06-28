// ─── Catalogo online 5e.tools ───────────────────────────────────────────────
// Recupera i dati di gioco direttamente dal mirror GitHub di 5e.tools (CORS
// aperto) e li mette in cache su IndexedDB, così non intacca la quota di
// localStorage dove vivono i dati dell'utente. I dati grezzi restituiti qui
// hanno lo stesso formato dei file scaricabili a mano, quindi vengono passati
// agli stessi parser dell'import da file (parse5eClass, parse5eSpell, …).

const MIRROR = "https://raw.githubusercontent.com/5etools-mirror-3/5etools-2014-src/main/data";

// ─── Cache IndexedDB (key/value) ─────────────────────────────────────────────
const DB_NAME = "dnd-catalog";
const STORE = "kv";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cacheGet(key) {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

export async function cacheSet(key, val) {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* cache best-effort */ }
}

export async function cacheClear() {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

// ─── Fetch ───────────────────────────────────────────────────────────────────
async function fetchJSON(path) {
  const res = await fetch(`${MIRROR}/${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${path}`);
  return res.json();
}

// Recupera+cache un file singolo, estraendone l'array indicato.
async function cachedList(cacheKey, path, pick) {
  const hit = await cacheGet(cacheKey);
  if (hit) return hit;
  const data = await fetchJSON(path);
  const list = pick(data) || [];
  await cacheSet(cacheKey, list);
  return list;
}

const titleCase = (s) => s.replace(/(^|[-\s])(\w)/g, (_, sep, c) => (sep === "-" ? " " : sep) + c.toUpperCase());

// ─── Classi ──────────────────────────────────────────────────────────────────
// Una voce per classe; l'import porta la classe + tutte le sue sottoclassi.
export async function getClassList() {
  const hit = await cacheGet("class-index");
  if (hit) return hit;
  const idx = await fetchJSON("class/index.json");
  const list = Object.entries(idx).map(([slug, file]) => ({ slug, file, name: titleCase(slug) }));
  await cacheSet("class-index", list);
  return list;
}

// Restituisce il JSON grezzo della classe: { class, subclass, classFeature, subclassFeature }
export async function getClassData(file) {
  const cacheKey = "class-file-" + file;
  const hit = await cacheGet(cacheKey);
  if (hit) return hit;
  const data = await fetchJSON("class/" + file);
  await cacheSet(cacheKey, data);
  return data;
}

// ─── Razze / Talenti / Background (file singoli) ──────────────────────────────
export const getRaces       = () => cachedList("races",       "races.json",       (d) => d.race);
export const getFeats       = () => cachedList("feats",       "feats.json",       (d) => d.feat);
export const getBackgrounds = () => cachedList("backgrounds", "backgrounds.json", (d) => d.background);

// ─── Incantesimi (uniti da tutti i manuali) ───────────────────────────────────
export async function getSpells(onProgress) {
  const hit = await cacheGet("spells-all");
  if (hit) return hit;
  const idx = await fetchJSON("spells/index.json");
  const files = Object.values(idx);
  let all = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const d = await fetchJSON("spells/" + files[i]);
      all = all.concat(d.spell || []);
    } catch { /* salta un manuale non raggiungibile */ }
    onProgress?.(i + 1, files.length);
  }
  await cacheSet("spells-all", all);
  return all;
}

// ─── Optional features (infusioni, invocazioni, manovre, metamagia, stili…) ───
// Un unico file con tutte le opzioni selezionabili, taggate per `featureType`.
export const getOptionalFeatures = () =>
  cachedList("optionalfeatures", "optionalfeatures.json", (d) => d.optionalfeature);

// Etichette leggibili per i codici featureType di 5e.tools.
export const FEATURE_TYPE_LABELS = {
  AI: "Infusione dell'Artefice",
  EI: "Invocazione Mistica",
  MM: "Metamagia",
  "MV:B": "Manovra",
  MV: "Manovra",
  "FS:F": "Stile di Combattimento",
  "FS:R": "Stile di Combattimento",
  "FS:P": "Stile di Combattimento",
  "FS:B": "Stile di Combattimento",
  PB: "Patto Ultraterreno",
  ED: "Disciplina Elementale",
  AS: "Tiro Arcano",
  RN: "Runa",
};

// ─── Mostri: indice globale snello + statblock on-demand ──────────────────────
const normCr = (cr) => (cr && typeof cr === "object" ? cr.cr : cr) ?? "0";
const normType = (t) => (t && typeof t === "object" ? t.type : t) || "?";

// Scarica i 96 file del bestiario UNA volta ed estrae solo i metadati leggeri.
// onProgress(done, total) per la barra di avanzamento.
export async function buildMonsterIndex(onProgress) {
  const hit = await cacheGet("monster-index");
  if (hit) return hit;
  const idx = await fetchJSON("bestiary/index.json");
  const files = Object.values(idx);
  const index = [];
  for (let i = 0; i < files.length; i++) {
    try {
      const d = await fetchJSON("bestiary/" + files[i]);
      for (const m of d.monster || []) {
        if (!m.name) continue;
        index.push({ name: m.name, source: m.source || "", cr: normCr(m.cr), type: normType(m.type), file: files[i] });
      }
    } catch { /* salta un manuale non raggiungibile */ }
    onProgress?.(i + 1, files.length);
  }
  index.sort((a, b) => a.name.localeCompare(b.name));
  await cacheSet("monster-index", index);
  return index;
}

// Ha già un indice mostri in cache? (per decidere se mostrare il pulsante "costruisci")
export async function hasMonsterIndex() {
  return !!(await cacheGet("monster-index"));
}

// Restituisce il blocco statistiche grezzo di un mostro (scaricando+cacheando il
// suo manuale). Risolve i riferimenti _copy interni allo stesso file.
export async function getMonsterStatblock(file, name, source) {
  const cacheKey = "bestiary-" + file;
  let list = await cacheGet(cacheKey);
  if (!list) {
    const d = await fetchJSON("bestiary/" + file);
    list = d.monster || [];
    await cacheSet(cacheKey, list);
  }
  const m = list.find((x) => x.name === name && (!source || x.source === source)) || list.find((x) => x.name === name);
  if (!m) return null;
  // Risoluzione base di _copy (template) dentro lo stesso manuale
  if (m._copy && m._copy.name) {
    const base = list.find((x) => x.name === m._copy.name && x.source === (m._copy.source || m.source));
    if (base) return { ...base, ...m, _copy: undefined };
  }
  return m;
}
