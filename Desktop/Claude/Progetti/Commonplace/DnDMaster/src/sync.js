// Motore di sync con Supabase (fase 2B).
// La persistenza dell'app resta sincrona su localStorage (storage.js); questo
// modulo aggiunge il livello remoto: pull all'avvio (prima del mount di App),
// push debounced delle chiavi modificate. Offline-first: senza rete l'app
// funziona come prima — la coda delle chiavi "sporche" è persistita per-utente
// e viene ripresa al ritorno online o al riavvio.
// Conflitti: last-write-wins PER CHIAVE; una chiave sporca in locale vince
// sempre sul remoto (verrà pushata).
import { K, loadJSON, userKey, safeLsSet, setSaveListener, readRaw, writeRaw } from "./storage.js";

const META_KEY  = "dnd_sync_meta_v1";   // { [key]: updated_at remoto dell'ultimo sync }
const DIRTY_KEY = "dnd_sync_dirty_v1";  // [key, ...] in attesa di push
export const SYNC_STATE_KEYS = [META_KEY, DIRTY_KEY]; // escluse dal backup

const SYNCED_KEYS = new Set(Object.values(K));
const TABLE = "dnd_saves";
const RETRY_MS = 15000;

// ── Stato di sync su localStorage (per-utente, via storage.js) ──────────────
const readMeta   = () => loadJSON(META_KEY, {});
const readDirty  = () => new Set(loadJSON(DIRTY_KEY, []));
const writeMeta  = (m) => safeLsSet(userKey(META_KEY), JSON.stringify(m));
const writeDirty = (d) => safeLsSet(userKey(DIRTY_KEY), JSON.stringify([...d]));

// Dopo un ripristino da backup: tutto il locale va ri-pushato e la memoria
// dell'ultimo sync azzerata (il pull al reload NON deve sovrascrivere il
// restore appena fatto). Chiamata da BackupRestore prima del reload.
export function markAllForPush() {
  const dirty = readDirty();
  for (const key of SYNCED_KEYS) if (readRaw(key) != null) dirty.add(key);
  writeDirty(dirty);
  writeMeta({});
}

export function createSyncEngine(client, { debounceMs = 2500 } = {}) {
  let uid = null;
  let timer = null;
  let pushing = false;
  let status = "idle"; // idle | pending | syncing | ok | offline | error
  const listeners = new Set();

  const online = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false);
  const notify = (s) => { status = s; for (const fn of listeners) fn(s); };

  function schedule(ms = debounceMs) {
    if (typeof setTimeout === "undefined") return;
    clearTimeout(timer);
    timer = setTimeout(() => { flush(); }, ms);
  }

  function markDirty(key) {
    if (!SYNCED_KEYS.has(key)) return;
    const dirty = readDirty();
    dirty.add(key);
    writeDirty(dirty);
    notify("pending");
    schedule();
  }

  // Pusha le chiavi sporche una alla volta (blob anche grossi: niente batch).
  // Se durante l'await la chiave viene rimodificata, resta sporca e verrà
  // ripushata al giro dopo (confronto sul valore raw).
  async function flush() {
    if (!uid || pushing) return;
    let dirty = readDirty();
    if (!dirty.size) { notify("ok"); return; }
    if (!online()) { notify("offline"); return; }
    pushing = true;
    notify("syncing");
    let failed = false;
    for (const key of [...dirty]) {
      const raw = readRaw(key);
      let value = null;
      try { value = JSON.parse(raw ?? "null"); } catch { continue; }
      const updated_at = new Date().toISOString();
      try {
        const { error } = await client.from(TABLE).upsert({ user_id: uid, key, value, updated_at });
        if (error) { failed = true; break; }
      } catch { failed = true; break; }
      const after = readDirty();               // può essere cambiata durante l'await
      if (readRaw(key) === raw) after.delete(key);
      writeDirty(after);
      const meta = readMeta();
      meta[key] = updated_at;
      writeMeta(meta);
    }
    pushing = false;
    dirty = readDirty();
    if (failed) { notify(online() ? "error" : "offline"); schedule(RETRY_MS); }
    else if (dirty.size) schedule();
    else notify("ok");
  }

  // Pull completo: da chiamare al login, PRIMA che App legga localStorage.
  // Remoto più recente → aggiorna la cache locale; chiave sporca → vince il
  // locale; presente solo in locale → prima migrazione, va pushata.
  async function pullAll() {
    if (!uid) return { pulled: 0 };
    const { data, error } = await client
      .from(TABLE).select("key,value,updated_at").eq("user_id", uid);
    if (error) throw error;
    const remote = new Map((data || []).map((r) => [r.key, r]));
    const dirty = readDirty();
    const meta = readMeta();
    let pulled = 0;
    for (const key of SYNCED_KEYS) {
      const row = remote.get(key);
      if (row) {
        if (dirty.has(key)) continue;
        if (meta[key] !== row.updated_at) {
          writeRaw(key, JSON.stringify(row.value));
          meta[key] = row.updated_at;
          pulled++;
        }
      } else if (readRaw(key) != null) {
        dirty.add(key);
      }
    }
    writeMeta(meta);
    writeDirty(dirty);
    if (dirty.size) await flush();
    else notify("ok");
    return { pulled };
  }

  // Aggancia il motore: ogni saveJSON marca la chiave, il ritorno online e la
  // chiusura pagina tentano un flush (la coda persistita copre i flush persi).
  function attach() {
    setSaveListener(markDirty);
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => flush());
      window.addEventListener("pagehide", () => { if (readDirty().size) flush(); });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden" && readDirty().size) flush();
      });
    }
  }

  return {
    attach,
    setUser: (id) => { uid = id; },
    clearUser: () => { uid = null; },
    pullAll,
    flush,
    markDirty,
    getStatus: () => status,
    pendingCount: () => readDirty().size,
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
  };
}
