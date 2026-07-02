// Helper di persistenza (localStorage per-utente).
// Questo modulo è il seme del futuro layer di persistenza (Supabase):
// ogni lettura/scrittura passerà da qui.
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
