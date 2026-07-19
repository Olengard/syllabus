// Schede condivise coi giocatori — LOGICA PURA del layer condiviso (blocco 3b).
// Nessuna dipendenza da Supabase né da localStorage: qui vivono solo la partizione
// dei campi in canali, il diff amministrativo e la logica di accept/badge.
// Il trasporto (Supabase, Realtime) sta in sharedSync.js; la UI nel blocco 3c.
//
// Principio: "la copia del Master è la verità". Una sola RIGA per PG contiene
// l'intero char; i "due canali" sono due SEMANTICHE di consumo sulla stessa riga:
//  ① VITALI  — live, LWW, il giocatore è autoritativo, il master li VEDE (no accept).
//  ② ADMIN   — propose→accept: il master diffa la riga condivisa contro la sua
//              copia di roster e accetta i campi che vuole.
//  ④ MASTER  — fuori dallo scope del giocatore (anti-cheat), non viaggia nel diff.

// ── Partizione dei campi (sui campi reali di defaultChar) ────────────────────
// ① Vitali: contatori che si consumano in gioco. In v1 conditions/hitDice NON
//    esistono ancora come campi persistenti sul PG: entreranno qui con una riga
//    quando verranno aggiunti alla scheda (pickVitali prende solo i campi presenti).
export const VITALI_FIELDS = ["currentHp", "tempHp", "usedSpellSlots", "deathSaves", "inspiration"];

// ② Amministrativo: struttura/roster. Accept per-CAMPO (top-level); gli array e
//    gli oggetti sono un blocco unico (accetti/rifiuti l'intero campo). `armorClass`
//    porta con sé `acAuto` (viaggiano insieme). `portrait` è trattato a parte
//    (solo flag "ritratto cambiato", mai il base64 nel diff): vedi diffAdmin.
export const ADMIN_FIELDS = [
  "name", "race", "class", "subclass", "level", "background", "alignment", "languages", "xp",
  "maxHp", "armorClass", "speed", "passivePerception",
  "abilities", "savingThrows", "skills",
  "equipment", "spells", "spellSlots", "currency", "attacks", "choices",
  "traits", "ideals", "bonds", "flaws", "notes",
];

// ④ Del master: anti-cheat, non condivisi col giocatore.
export const MASTER_ONLY_FIELDS = ["prestige", "reputation"];

// Esclusi da OGNI diff/canale (identità, metadati, viste locali, combattimento).
export const EXCLUDED_FIELDS = ["id", "player", "initiative", "pinnedFeatures", "acAuto", "updated_at", "created_at"];

// Array trattati come blocco unico nel diff (sintesi, non per-elemento).
const ARRAY_FIELDS = new Set(["equipment", "spells", "attacks", "prestige", "reputation"]);

// ── Estrattori dei bucket ────────────────────────────────────────────────────
const pick = (char, fields) => {
  const out = {};
  if (!char) return out;
  for (const f of fields) if (f in char) out[f] = char[f];
  return out;
};
export const pickVitali = (char) => pick(char, VITALI_FIELDS);
export const pickAdmin  = (char) => pick(char, ADMIN_FIELDS);

// ── Utility pure ─────────────────────────────────────────────────────────────
// Serializzazione STABILE (chiavi ordinate ricorsivamente): stesso contenuto →
// stessa stringa, per confronti di uguaglianza e per l'hash dello snapshot.
export function stableStringify(v) {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return "[" + v.map(stableStringify).join(",") + "]";
  const keys = Object.keys(v).sort();
  return "{" + keys.map((k) => JSON.stringify(k) + ":" + stableStringify(v[k])).join(",") + "}";
}

const eq = (a, b) => stableStringify(a) === stableStringify(b);
const clone = (v) => (v === null || typeof v !== "object" ? v : JSON.parse(JSON.stringify(v)));

// Hash compatto (djb2) di una stringa: usato per NON trascinare il base64 del
// ritratto (decine di KB) dentro l'hash dello snapshot amministrativo.
function strHash(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ── Diff amministrativo (master ← proposta del giocatore) ────────────────────
// Ritorna una entry per ogni campo ② che diverge tra la copia di roster del
// master e la riga condivisa. Unità di accept = il CAMPO top-level.
//   { field, kind: 'scalar'|'object'|'array'|'portrait', before, after, summary }
// - scalar  → before/after grezzi (per il rendering old→new).
// - array   → before/after = { count } (sintesi; il blocco intero si accetta/rifiuta).
// - object  → before/after grezzi ma l'unità resta il campo intero.
// - portrait→ solo flag: mai il base64 nel diff.
export function diffAdmin(masterChar, sharedChar) {
  const m = masterChar || {};
  const s = sharedChar || {};
  const out = [];
  for (const field of ADMIN_FIELDS) {
    const a = m[field];
    const b = s[field];
    if (eq(a, b)) continue;
    if (ARRAY_FIELDS.has(field)) {
      out.push({
        field, kind: "array",
        before: { count: Array.isArray(a) ? a.length : 0 },
        after:  { count: Array.isArray(b) ? b.length : 0 },
        summary: `${Array.isArray(a) ? a.length : 0} → ${Array.isArray(b) ? b.length : 0}`,
      });
    } else if (b !== null && typeof b === "object") {
      out.push({ field, kind: "object", before: a, after: b, summary: "modificato" });
    } else {
      out.push({ field, kind: "scalar", before: a, after: b, summary: `${a ?? "—"} → ${b ?? "—"}` });
    }
  }
  // Ritratto: solo flag "cambiato", niente base64 nel diff.
  if ((m.portrait || null) !== (s.portrait || null)) {
    out.push({ field: "portrait", kind: "portrait", before: null, after: null, summary: "ritratto cambiato" });
  }
  return out;
}

// Applica i soli campi spuntati alla copia del master (immutabile, deep-clone dei
// valori strutturati). `armorClass` trascina `acAuto`; `portrait` copia il base64.
export function applyAccepted(masterChar, sharedChar, acceptedFields) {
  const out = { ...(masterChar || {}) };
  const s = sharedChar || {};
  const accepted = new Set(acceptedFields || []);
  for (const field of accepted) {
    if (field === "portrait") { out.portrait = s.portrait; continue; }
    if (field === "armorClass") { out.armorClass = s.armorClass; out.acAuto = s.acAuto; continue; }
    if (ADMIN_FIELDS.includes(field)) out[field] = clone(s[field]);
  }
  return out;
}

// ── Snapshot amministrativo & badge 📬 ───────────────────────────────────────
// Hash dello snapshot ② della riga condivisa: il ritratto entra come hash breve
// (così un ritratto diverso cambia lo snapshot senza trascinarne il base64).
export function adminHash(char) {
  const snap = pickAdmin(char);
  const p = char && char.portrait;
  snap.__portrait = p ? strHash(String(p)) : null;
  return strHash(stableStringify(snap));
}

// Il badge compare se: c'è divergenza ② col master E il giocatore ha modificato
// qualcosa da quando il master ha premuto "Ignora"/accettato parziale (lastSeenHash).
// Se il master accetta tutto, il diff si azzera → niente badge comunque.
export function hasPendingAdmin(masterChar, sharedChar, lastSeenHash) {
  if (diffAdmin(masterChar, sharedChar).length === 0) return false;
  return adminHash(sharedChar) !== lastSeenHash;
}
