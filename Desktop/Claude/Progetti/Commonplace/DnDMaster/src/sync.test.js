import { describe, it, expect, beforeEach } from "vitest";
import { createSyncEngine, markAllForPush } from "./sync.js";
import { K, saveJSON, loadJSON, storeUser, userKey, safeLsSet } from "./storage.js";

// Mock minimale di localStorage (ambiente node): Map + API Web Storage.
function makeLocalStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    get length() { return map.size; },
    key: (i) => [...map.keys()][i] ?? null,
    _map: map,
  };
}

// Client Supabase finto: 'rows' è il contenuto remoto di dnd_saves.
function makeClient({ rows = [], failUpsert = false, onUpsert = null } = {}) {
  const upserts = [];
  return {
    upserts,
    rows,
    from() {
      return {
        upsert: async (row) => {
          if (failUpsert) return { error: { message: "boom" } };
          onUpsert?.(row);
          upserts.push(row);
          const i = rows.findIndex((r) => r.key === row.key);
          if (i >= 0) rows[i] = row; else rows.push(row);
          return { error: null };
        },
        select: () => ({
          eq: async () => ({
            data: rows.map(({ key, value, updated_at }) => ({ key, value, updated_at })),
            error: null,
          }),
        }),
      };
    },
  };
}

const UID = "00000000-0000-0000-0000-000000000001";

beforeEach(() => {
  globalThis.localStorage = makeLocalStorage();
  storeUser("Olengard");
});

describe("push (saveJSON → dirty → flush)", () => {
  it("saveJSON marca la chiave e flush la pusha con user_id e valore", async () => {
    const client = makeClient();
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);

    saveJSON(K.sessionNotes, [{ id: 1, text: "nota" }]);
    expect(engine.pendingCount()).toBe(1);

    await engine.flush();
    expect(engine.pendingCount()).toBe(0);
    expect(client.upserts).toHaveLength(1);
    expect(client.upserts[0]).toMatchObject({
      user_id: UID,
      key: K.sessionNotes,
      value: [{ id: 1, text: "nota" }],
    });
    expect(engine.getStatus()).toBe("ok");
  });

  it("chiavi fuori dal registro K non vengono marcate", () => {
    const engine = createSyncEngine(makeClient(), { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);
    saveJSON("chiave_estranea", { x: 1 });
    expect(engine.pendingCount()).toBe(0);
  });

  it("senza utente il flush non pusha e la coda resta", async () => {
    const client = makeClient();
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    saveJSON(K.savedNames, ["Boblin"]);
    await engine.flush();
    expect(client.upserts).toHaveLength(0);
    expect(engine.pendingCount()).toBe(1);
  });

  it("push fallito → la chiave resta sporca, stato error", async () => {
    const client = makeClient({ failUpsert: true });
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);
    saveJSON(K.savedNames, ["Boblin"]);
    await engine.flush();
    expect(engine.pendingCount()).toBe(1);
    expect(engine.getStatus()).toBe("error");
  });

  it("modifica durante il push in volo → la chiave resta sporca", async () => {
    // onUpsert simula un'altra scrittura mentre l'upsert è in corso
    const client = makeClient({
      onUpsert: () => safeLsSet(userKey(K.savedNames), JSON.stringify(["Boblin", "Rugolo"])),
    });
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);
    saveJSON(K.savedNames, ["Boblin"]);
    await engine.flush();
    // il valore pushato era quello vecchio: la chiave deve restare in coda
    expect(engine.pendingCount()).toBe(1);
  });
});

describe("pullAll (avvio/login)", () => {
  it("remoto presente e mai visto → aggiorna la cache locale", async () => {
    const client = makeClient({
      rows: [{ key: K.encounters, value: [{ name: "Imboscata" }], updated_at: "2026-07-07T10:00:00Z" }],
    });
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);
    const { pulled } = await engine.pullAll();
    expect(pulled).toBe(1);
    expect(loadJSON(K.encounters)).toEqual([{ name: "Imboscata" }]);
  });

  it("remoto già sincronizzato (updated_at invariato) → nessuna riscrittura", async () => {
    const row = { key: K.encounters, value: ["remoto"], updated_at: "2026-07-07T10:00:00Z" };
    const client = makeClient({ rows: [row] });
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);
    await engine.pullAll();
    // seconda apertura: il locale è stato modificato solo da flushSave-style raw
    safeLsSet(userKey(K.encounters), JSON.stringify(["locale-non-sporco"]));
    const { pulled } = await engine.pullAll();
    expect(pulled).toBe(0);
    expect(loadJSON(K.encounters)).toEqual(["locale-non-sporco"]);
  });

  it("chiave sporca in locale → vince il locale e viene pushata", async () => {
    const client = makeClient({
      rows: [{ key: K.savedNames, value: ["remoto"], updated_at: "2026-07-07T10:00:00Z" }],
    });
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);
    saveJSON(K.savedNames, ["locale"]);
    await engine.pullAll();
    expect(loadJSON(K.savedNames)).toEqual(["locale"]);
    expect(client.upserts.map((u) => u.key)).toContain(K.savedNames);
    expect(client.rows.find((r) => r.key === K.savedNames).value).toEqual(["locale"]);
  });

  it("prima migrazione: dati solo locali → pushati tutti", async () => {
    // dati pre-2B già su disco, mai passati da saveJSON in questa sessione
    safeLsSet(userKey(K.characters), JSON.stringify({ characters: [{ name: "Aldric" }], activeId: 1 }));
    safeLsSet(userKey(K.sessionNotes), JSON.stringify([{ text: "vecchia nota" }]));
    const client = makeClient();
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);
    await engine.pullAll();
    const pushedKeys = client.upserts.map((u) => u.key).sort();
    expect(pushedKeys).toEqual([K.characters, K.sessionNotes].sort());
    expect(engine.pendingCount()).toBe(0);
  });
});

describe("markAllForPush (dopo un ripristino da backup)", () => {
  it("marca tutte le chiavi presenti e azzera la memoria di sync", async () => {
    const client = makeClient({
      rows: [{ key: K.savedNames, value: ["remoto"], updated_at: "2026-07-07T10:00:00Z" }],
    });
    const engine = createSyncEngine(client, { debounceMs: 999999 });
    engine.attach();
    engine.setUser(UID);
    await engine.pullAll(); // sync normale
    // "ripristino": scrittura raw + markAllForPush (come fa BackupRestore)
    safeLsSet(userKey(K.savedNames), JSON.stringify(["dal-backup"]));
    safeLsSet(userKey(K.sessionNotes), JSON.stringify([{ text: "dal-backup" }]));
    markAllForPush();
    expect(engine.pendingCount()).toBe(2);
    // al "reload": il pull non sovrascrive il restore, il push riallinea il remoto
    await engine.pullAll();
    expect(loadJSON(K.savedNames)).toEqual(["dal-backup"]);
    expect(client.rows.find((r) => r.key === K.savedNames).value).toEqual(["dal-backup"]);
  });
});
