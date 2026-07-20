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
// ① Vitali: contatori che si consumano in gioco (giocatore autoritativo, live).
//    `conditions` e `hitDiceUsed` sono campi persistenti della scheda (blocco A):
//    condizioni attive e dadi vita spesi — vanno mostrati live al master.
export const VITALI_FIELDS = ["currentHp", "tempHp", "usedSpellSlots", "deathSaves", "inspiration", "conditions", "hitDiceUsed"];

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
// `prestige` NON è più qui (2026-07-20): viaggia al giocatore in forma PUBBLICA
// (vedi publicPrestige) perché ha senso che tracci la propria reputazione, ma
// con alias e voci nascoste decisi dal master. `reputation` resta master-only:
// è dichiarato in defaultChar ma non usato da nessuna UI (lista sempre vuota).
export const MASTER_ONLY_FIELDS = ["reputation"];

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
  // Il prestigio entra nell'hash (id+valore, non i nomi: quelli sono del
  // master e non cambiano mai dal giocatore). Senza, dopo un "Ignora" una
  // nuova modifica al solo prestigio non farebbe più ricomparire il badge.
  snap.__prestige = ((char && char.prestige) || []).map((e) => [e.id, e.value || 0]);
  return strHash(stableStringify(snap));
}

// Il badge compare se: c'è divergenza ② col master E il giocatore ha modificato
// qualcosa da quando il master ha premuto "Ignora"/accettato parziale (lastSeenHash).
// Se il master accetta tutto, il diff si azzera → niente badge comunque.
export function hasPendingAdmin(masterChar, sharedChar, lastSeenHash) {
  const nienteDaVedere =
    diffAdmin(masterChar, sharedChar).length === 0 &&
    diffPrestige(masterChar && masterChar.prestige, sharedChar && sharedChar.prestige).length === 0;
  if (nienteDaVedere) return false;
  return adminHash(sharedChar) !== lastSeenHash;
}

// ── Prestigio: visibilità per-voce (2026-07-20) ──────────────────────────────
// Il giocatore traccia la propria reputazione, ma il master decide COSA vede.
// Due metadati opzionali sulla singola voce di `prestige` (`{id, name, value}`):
//   • `hidden: true`  → la voce non lascia mai il device del master (fazione di
//     cui il PG non sospetta nemmeno l'esistenza).
//   • `alias: "..."`  → il giocatore la vede sotto un altro nome. Caso reale:
//     il master sa che il 2 di Teofilo è col «Clero», Teofilo crede sia con la
//     «Famiglia» perché le connessioni non sono ancora emerse.
// Gli `id` sono stabili: sono LORO a riconciliare le due copie, mai i nomi.

// Forma pubblica di `prestige` da mettere nella riga condivisa: niente voci
// nascoste, niente metadati del master (alias/hidden non devono trapelare —
// sapere che una voce HA un alias è già mezzo segreto svelato).
export function publicPrestige(list) {
  return (list || [])
    .filter((e) => e && !e.hidden)
    .map((e) => ({ id: e.id, name: e.alias || e.name, value: e.value || 0 }));
}

// Le variazioni proposte dal giocatore, etichettate col nome VERO (il master
// deve leggere «Clero», non l'alias). Solo voci visibili e solo il `value`:
// una voce nascosta non può essere toccata, e i nomi restano del master.
export function diffPrestige(masterList, playerList) {
  const daGiocatore = new Map((playerList || []).map((e) => [e.id, e]));
  const out = [];
  for (const m of masterList || []) {
    if (!m || m.hidden) continue;
    const p = daGiocatore.get(m.id);
    if (!p) continue;
    const before = m.value || 0;
    const after = p.value || 0;
    if (before !== after) out.push({ id: m.id, name: m.name, before, after });
  }
  return out;
}

// Riconciliazione: copia SOLO i valori proposti, per id. Le voci nascoste, i
// nomi veri, gli alias e le voci che il giocatore non conosce restano intatti;
// le voci che lui avesse aggiunto di suo sono ignorate (la lista è del master).
// Immutabile. Questa funzione è ciò che impedisce a un accept di distruggere le
// voci segrete: la lista del giocatore non sostituisce MAI quella del master.
export function mergePlayerPrestige(masterList, playerList) {
  const daGiocatore = new Map((playerList || []).map((e) => [e.id, e]));
  return (masterList || []).map((m) => {
    if (!m || m.hidden) return m;
    const p = daGiocatore.get(m.id);
    if (!p || (p.value || 0) === (m.value || 0)) return m;
    return { ...m, value: p.value || 0 };
  });
}

// ── Vitali → Combat Tracker (auto-popolamento, 2026-07-20) ───────────────────
// Versa i vitali riportati dal giocatore dentro un combattente del tracker.
// SNAPSHOT, non live: si applica all'avvio del combattimento e sul refresh ↻ del
// master — durante lo scontro il tracker resta la copia di lavoro del master
// ("in sessione fa fede lo schermo del Master"), quindi nulla lo sovrascrive a
// sorpresa. Immutabile; se non c'è riga condivisa il combattente torna identico.
// `dead` NON viene toccato: dichiarare un PG fuori combattimento è del master.
export function applyVitaliToCombatant(combatant, sharedChar) {
  if (!combatant || !sharedChar) return combatant;
  const out = { ...combatant };
  if (typeof sharedChar.currentHp === "number") out.currentHp = sharedChar.currentHp;
  if (Array.isArray(sharedChar.conditions)) out.conditions = [...sharedChar.conditions];
  if (sharedChar.deathSaves) {
    out.deathSaves = {
      successes: sharedChar.deathSaves.successes || 0,
      failures: sharedChar.deathSaves.failures || 0,
    };
  }
  return out;
}
