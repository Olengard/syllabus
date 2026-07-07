import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { getStoredUser, storeUser, clearUser, userKey, safeLsSet, migrateLegacyKey, K, loadJSON, saveJSON } from "./storage.js";

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

beforeEach(() => {
  globalThis.localStorage = makeLocalStorage();
});
afterEach(() => vi.restoreAllMocks());

describe("auth utente (getStoredUser/storeUser/clearUser)", () => {
  it("roundtrip: store → get → clear", () => {
    expect(getStoredUser()).toBeNull();
    storeUser("Olengard");
    expect(getStoredUser()).toBe("Olengard");
    clearUser();
    expect(getStoredUser()).toBeNull();
  });

  it("JSON corrotto in dnd_auth_user → null, senza lanciare", () => {
    localStorage.setItem("dnd_auth_user", "{non-json");
    expect(getStoredUser()).toBeNull();
  });
});

describe("userKey (prefisso per-utente)", () => {
  it("prefissa con l'utente loggato", () => {
    storeUser("Olengard");
    expect(userKey("dnd5e-master-v1")).toBe("Olengard__dnd5e-master-v1");
  });

  it("senza utente ritorna la chiave nuda", () => {
    expect(userKey("dnd5e-master-v1")).toBe("dnd5e-master-v1");
  });
});

describe("safeLsSet", () => {
  it("scrive normalmente", () => {
    safeLsSet("k", "v");
    expect(localStorage.getItem("k")).toBe("v");
  });

  it("quota exceeded → non lancia e mostra il toast una sola volta", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem = () => { throw new Error("QuotaExceededError"); };
    const created = [];
    globalThis.document = {
      getElementById: (id) => created.find(el => el.id === id) || null,
      createElement: () => {
        const el = { style: {}, remove: () => {} };
        created.push(el);
        return el;
      },
      body: { appendChild: () => {} },
    };
    vi.useFakeTimers();
    expect(() => safeLsSet("k", "v")).not.toThrow();
    expect(() => safeLsSet("k2", "v2")).not.toThrow(); // toast già presente
    expect(created.length).toBe(1);
    vi.runAllTimers();
    vi.useRealTimers();
    delete globalThis.document;
  });
});

describe("loadJSON/saveJSON (API del layer, fase 2A)", () => {
  it("roundtrip con prefisso utente", () => {
    storeUser("Olengard");
    saveJSON(K.diceHistory, [{ total: 12 }]);
    expect(localStorage.getItem("Olengard__dnd_dice_history_v1")).toBe('[{"total":12}]');
    expect(loadJSON(K.diceHistory, [])).toEqual([{ total: 12 }]);
  });

  it("fallback su chiave assente e su JSON corrotto", () => {
    expect(loadJSON(K.campaign, [])).toEqual([]);
    expect(loadJSON(K.gameClock, null)).toBeNull();
    localStorage.setItem(userKey(K.campaign), "{rotto");
    expect(loadJSON(K.campaign, [])).toEqual([]);
  });

  it("i valori falsy validi non cadono sul fallback", () => {
    saveJSON(K.sessionCurrent, 0);
    expect(loadJSON(K.sessionCurrent, 1)).toBe(0);
    saveJSON(K.sessionCurrent, false);
    expect(loadJSON(K.sessionCurrent, true)).toBe(false);
  });

  it("compat wire-format: numeri salvati come stringa dal vecchio codice", () => {
    // il vecchio SessionNotesPage salvava String(3) → "3"
    localStorage.setItem(userKey(K.sessionCurrent), "3");
    expect(loadJSON(K.sessionCurrent, 1)).toBe(3);
  });

  it("il registro K è coerente (chiavi uniche, prefisso dnd_ o storica)", () => {
    const values = Object.values(K);
    expect(new Set(values).size).toBe(values.length);
    for (const v of values) expect(/^dnd/.test(v) || v === "dnd5e-master-v1").toBe(true);
  });
});

describe("migrateLegacyKey (chiave legacy → spazio utente)", () => {
  it("copia la chiave legacy nello spazio utente e la rimuove", () => {
    storeUser("Olengard");
    localStorage.setItem("dnd5e-master-v1", '{"characters":[1]}');
    migrateLegacyKey("dnd5e-master-v1");
    expect(localStorage.getItem("Olengard__dnd5e-master-v1")).toBe('{"characters":[1]}');
    expect(localStorage.getItem("dnd5e-master-v1")).toBeNull();
  });

  it("non fa nulla se non c'è chiave legacy", () => {
    storeUser("Olengard");
    migrateLegacyKey("inesistente");
    expect(localStorage.getItem("Olengard__inesistente")).toBeNull();
  });

  it("non fa nulla senza utente loggato (nessun prefisso)", () => {
    localStorage.setItem("dnd5e-master-v1", "dati");
    migrateLegacyKey("dnd5e-master-v1");
    expect(localStorage.getItem("dnd5e-master-v1")).toBe("dati"); // intatta
  });

  it("senza merge: se la chiave utente esiste già, i dati utente vincono", () => {
    storeUser("Olengard");
    localStorage.setItem("k", "legacy");
    localStorage.setItem("Olengard__k", "utente");
    migrateLegacyKey("k");
    expect(localStorage.getItem("Olengard__k")).toBe("utente");
    expect(localStorage.getItem("k")).toBeNull(); // legacy comunque pulita
  });

  it("con merge: unisce array deduplicando per id, i dati utente vincono", () => {
    storeUser("Olengard");
    localStorage.setItem("mostri", JSON.stringify([
      { id: "goblin", hp: 7 },    // legacy
      { id: "orco", hp: 15 },     // solo legacy
    ]));
    localStorage.setItem("Olengard__mostri", JSON.stringify([
      { id: "goblin", hp: 99 },   // versione utente (vince)
    ]));
    migrateLegacyKey("mostri", { merge: true });
    const merged = JSON.parse(localStorage.getItem("Olengard__mostri"));
    expect(merged).toHaveLength(2);
    expect(merged.find(m => m.id === "goblin").hp).toBe(99);
    expect(merged.find(m => m.id === "orco").hp).toBe(15);
  });

  it("con merge ma formati non-array: tiene i dati utente", () => {
    storeUser("Olengard");
    localStorage.setItem("k", "{non-json");
    localStorage.setItem("Olengard__k", '"utente"');
    migrateLegacyKey("k", { merge: true });
    expect(localStorage.getItem("Olengard__k")).toBe('"utente"');
  });
});
