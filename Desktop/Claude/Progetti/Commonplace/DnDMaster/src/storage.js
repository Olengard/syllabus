// Layer di persistenza (localStorage per-utente).
// OGNI lettura/scrittura dati dell'app passa da qui (loadJSON/saveJSON + K):
// in fase 2B questo modulo diventa il punto unico di aggancio a Supabase.
// Non aggiungere accessi localStorage diretti nei componenti.

// ─── Registro delle chiavi dati ──────────────────────────────────────────────
export const K = {
  characters:          "dnd5e-master-v1",
  customMonsters:      "dnd_custom_monsters_v1",
  importedSpells:      "dnd_imported_spells",
  importedClasses:     "dnd_imported_classes",
  importedRaces:       "dnd_imported_races",
  importedFeats:       "dnd_imported_feats",
  importedBackgrounds: "dnd_imported_backgrounds",
  importedItems:       "dnd_imported_items",
  combat:              "dnd_combat_v2",
  encounters:          "dnd_encounters_v2",
  sessionNotes:        "dnd_session_notes",
  sessionCurrent:      "dnd_session_current",
  savedNames:          "dnd_saved_names",
  sessionPins:         "dnd_session_pins_v1",
  diceHistory:         "dnd_dice_history_v1",
  campaign:            "dnd_campaign_v1",
  gameClock:           "dnd_game_clock_v1",
  charIndex:           "dnd_char_index_v1",  // ordine PG + activeId (schede per-PG)
  sharedSeen:          "dnd_shared_seen_v1", // master: hash amministrativo "già visto" per riga condivisa (badge 📬)
};

// ─── API JSON per-utente ─────────────────────────────────────────────────────
// Il listener (registrato dal motore di sync, vedi sync.js) è avvisato a ogni
// saveJSON: così ogni scrittura locale diventa una chiave "da pushare" senza
// che i componenti sappiano nulla del backend.
let _onSave = null;
export function setSaveListener(fn) { _onSave = fn; }

export function loadJSON(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(userKey(key)) || "null") ?? fallback; }
  catch { return fallback; }
}
export function saveJSON(key, value) {
  try { safeLsSet(userKey(key), JSON.stringify(value)); } catch {}
  try { _onSave?.(key); } catch {}
}

// Accesso raw (stringa JSON) per il motore di sync: il pull scrive con
// writeRaw per NON ri-marcare la chiave come sporca, readRaw serve a
// confrontare il valore prima/dopo un push in volo.
export function readRaw(key) {
  try { return localStorage.getItem(userKey(key)); } catch { return null; }
}
export function writeRaw(key, str) {
  safeLsSet(userKey(key), str);
}
// Rimuove una chiave dalla cache locale (usata dal motore di sync quando un PG
// viene cancellato: la riga remota la toglie il tombstone in sync.js).
export function removeRaw(key) {
  try { localStorage.removeItem(userKey(key)); } catch {}
}
// Elenca le char-key ("char:<id>", SENZA prefisso utente) presenti in localStorage
// per l'utente corrente. Le schede per-PG sono chiavi DINAMICHE, fuori dal registro
// K: il motore di sync le enumera per scoprire i PG solo-locali e, nel restore da
// backup, per ri-marcarle tutte da pushare.
export function charKeysLocal() {
  const out = [];
  try {
    const u = getStoredUser();
    const full = u ? `${u}__char:` : "char:";
    const cut = u ? u.length + 2 : 0;   // "__" = 2 caratteri
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(full)) out.push(k.slice(cut));
    }
  } catch {}
  return out;
}
export function getStoredUser() {
  try { return JSON.parse(localStorage.getItem("dnd_auth_user") || "null"); } catch { return null; }
}
export function storeUser(username) {
  safeLsSet("dnd_auth_user", JSON.stringify(username));
}
export function clearUser() {
  localStorage.removeItem("dnd_auth_user");
}
// Prefisso per tutte le chiavi localStorage — isola i dati per utente
export function userKey(key) {
  const u = getStoredUser();
  return u ? `${u}__${key}` : key;
}

export function safeLsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch(e) {
    console.error('[localStorage] quota exceeded for key:', key, e);
    if (!document.getElementById('__ls-toast')) {
      const t = document.createElement('div');
      t.id = '__ls-toast';
      t.textContent = '\u26a0\ufe0f Spazio locale esaurito \u2014 alcuni dati potrebbero non essere salvati.';
      t.style.cssText = [
        'position:fixed','bottom:1.2rem','left:50%','transform:translateX(-50%)',
        'background:#c8903a','color:#0f0e0b','padding:.6rem 1.4rem',
        'border-radius:6px','font-size:.85rem','z-index:99999',
        'font-family:Georgia,serif','box-shadow:0 2px 8px rgba(0,0,0,.5)',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 7000);
    }
  }
}

// Migrazione one-time: sposta le vecchie chiavi NON prefissate nello spazio
// dell'utente corrente. Necessaria perché in passato personaggi (STORAGE_KEY) e
// mostri custom (MONSTERS_STORAGE_KEY) venivano salvati senza prefisso utente.
export function migrateLegacyKey(plainKey, { merge = false } = {}) {
  try {
    const legacy = localStorage.getItem(plainKey);
    if (legacy == null) return;                 // niente da migrare
    const prefixedK = userKey(plainKey);
    if (prefixedK === plainKey) return;         // nessun utente → nessun prefisso
    const existing = localStorage.getItem(prefixedK);
    if (existing == null) {
      safeLsSet(prefixedK, legacy);             // copia diretta
    } else if (merge) {
      // unione di array deduplicando per id/slug (i dati già nello spazio utente vincono)
      try {
        const a = JSON.parse(existing) || [];
        const b = JSON.parse(legacy) || [];
        const byKey = {};
        for (const x of [...b, ...a]) byKey[x.id ?? x.slug ?? JSON.stringify(x)] = x;
        safeLsSet(prefixedK, JSON.stringify(Object.values(byKey)));
      } catch { /* formati non-array: tengo i dati utente esistenti */ }
    }
    localStorage.removeItem(plainKey);          // pulizia: la migrazione avviene una volta sola
  } catch {}
}

// ─── Schede personaggio: una chiave per PG + indice ──────────────────────────
// Le schede vivono una-per-riga sotto "char:<id>" (sync per-PG: modificarne una
// non tocca le altre). L'ordine di visualizzazione e il PG attivo stanno
// nell'indice K.charIndex — chiave normale del registro, si sincronizza come le
// altre. Le char-key sono invece dinamiche: le gestisce sync.js per prefisso.
export const charKey = (id) => `char:${id}`;

export function loadChar(id)       { return loadJSON(charKey(id), null); }
export function saveChar(id, char) { saveJSON(charKey(id), char); }   // marca la chiave dirty
export function loadCharIndex()    { return loadJSON(K.charIndex, null); }
export function saveCharIndex(idx) { saveJSON(K.charIndex, idx); }    // marca la chiave dirty

// Ricompone { characters, activeId } dall'indice + le righe per-PG.
// L'indice è la fonte dell'ordine; un id senza riga viene saltato.
export function loadAllChars() {
  const idx = loadCharIndex();
  if (!idx || !Array.isArray(idx.order)) return null;
  const characters = [];
  for (const id of idx.order) {
    const c = loadChar(id);
    if (c) characters.push(c);
  }
  return { characters, activeId: idx.activeId ?? characters[0]?.id ?? null };
}

// Migrazione one-time NON distruttiva dal vecchio blob unico (K.characters =
// { characters, activeId }) allo schema per-PG. Il blob resta INTATTO come
// rollback; le nuove char-key + l'indice li scopre e pusha pullAll
// (charKeysLocal per le char-key, chiave fissa per l'indice). Idempotente:
// se l'indice esiste già, no-op.
export function migrateCharsToPerPG() {
  try {
    if (loadCharIndex()) return { migrated: 0 };              // già migrato
    const blob = loadJSON(K.characters, null);
    if (!blob || !Array.isArray(blob.characters) || !blob.characters.length) {
      return { migrated: 0 };
    }
    const order = [];
    for (let i = 0; i < blob.characters.length; i++) {
      const c = blob.characters[i];
      if (!c) continue;
      const id = c.id != null ? c.id : `mig_${Date.now().toString(36)}_${i}`;
      if (c.id == null) c.id = id;
      writeRaw(charKey(id), JSON.stringify(c));               // raw: il push lo fa pullAll
      order.push(id);
    }
    const activeId = blob.activeId ?? order[0] ?? null;
    writeRaw(K.charIndex, JSON.stringify({ order, activeId }));
    return { migrated: order.length };
  } catch { return { migrated: 0 }; }
}
