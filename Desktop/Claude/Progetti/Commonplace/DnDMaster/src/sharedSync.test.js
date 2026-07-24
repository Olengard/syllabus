import { describe, it, expect, beforeEach } from "vitest";
import { createSharedSync } from "./sharedSync.js";

// Fake client Supabase per le tre tabelle del layer condiviso + rpc + Realtime.
// Modella SOLO le catene usate da sharedSync.js. auth.uid() è simulato da
// `_currentUid` (le policy RLS reali vivono nel DB, qui non le rifacciamo).
function makeFake() {
  const db = { campaigns: [], campaign_members: [], dnd_shared_chars: [] };
  const channels = [];
  const client = { _db: db, _channels: channels, _currentUid: "master1" };

  // Builder thenable: supporta .eq() concatenate ed è await-abile (then).
  function filterBuilder(table, mode) {
    const filters = [];
    const b = {
      eq(col, val) { filters.push([col, val]); return b; },
      then(resolve) {
        const rows = db[table].filter((r) => filters.every(([c, v]) => r[c] === v));
        if (mode === "delete") {
          for (const r of [...rows]) { const i = db[table].indexOf(r); if (i >= 0) db[table].splice(i, 1); }
          resolve({ data: null, error: null });
        } else {
          resolve({ data: rows.map((r) => ({ ...r })), error: null });
        }
      },
    };
    return b;
  }

  client.from = (table) => ({
    insert(row) {
      const inserted = { ...row };
      if (table === "campaigns") {
        inserted.id = inserted.id ?? `camp_${db.campaigns.length + 1}`;
        inserted.join_code = inserted.join_code ?? `CODE${db.campaigns.length + 1}`;
        inserted.master_uid = inserted.master_uid ?? client._currentUid;
      }
      return { select: () => ({ single: async () => { db[table].push(inserted); return { data: { ...inserted }, error: null }; } }) };
    },
    select: () => filterBuilder(table, "select"),
    delete: () => filterBuilder(table, "delete"),
    async upsert(row) {
      const pk = ["campaign_id", "player_uid", "char_id"];
      const i = db[table].findIndex((r) => pk.every((k) => r[k] === row[k]));
      if (i >= 0) db[table][i] = { ...row }; else db[table].push({ ...row });
      return { data: null, error: null };
    },
  });

  client.rpc = async (name, args) => {
    if (name !== "join_campaign") return { data: null, error: { message: "rpc sconosciuta" } };
    const camp = db.campaigns.find((c) => c.join_code === String(args.p_code).toUpperCase().trim());
    if (!camp) return { data: null, error: { message: "CODICE_NON_VALIDO" } };
    const uid = client._currentUid;
    const ex = db.campaign_members.find((m) => m.campaign_id === camp.id && m.player_uid === uid);
    if (!ex) db.campaign_members.push({ campaign_id: camp.id, player_uid: uid, display_name: args.p_display_name || "" });
    else if (args.p_display_name) ex.display_name = args.p_display_name;
    return { data: [{ campaign_id: camp.id, campaign_name: camp.name }], error: null };
  };

  client.channel = (nameCh) => {
    const ch = { nameCh, handlers: [], subscribed: false };
    const api = {
      on(_evt, _opts, cb) { ch.handlers.push(cb); return api; },
      subscribe() { ch.subscribed = true; channels.push(ch); return ch; },
    };
    return api;
  };
  client.removeChannel = (ch) => { const i = channels.indexOf(ch); if (i >= 0) channels.splice(i, 1); };

  return client;
}

let client, s;
beforeEach(() => { client = makeFake(); s = createSharedSync(client); });

describe("master: campagne e assegnazione", () => {
  it("createCampaign restituisce id, nome e join_code", async () => {
    const c = await s.createCampaign("Zeitgeist");
    expect(c.name).toBe("Zeitgeist");
    expect(c.id).toBeTruthy();
    expect(c.join_code).toBeTruthy();
  });

  it("listMyCampaigns filtra per master_uid", async () => {
    await s.createCampaign("Mia");
    client._currentUid = "master2";
    await s.createCampaign("Altrui");
    expect((await s.listMyCampaigns("master1")).map((c) => c.name)).toEqual(["Mia"]);
    expect((await s.listMyCampaigns("master2")).map((c) => c.name)).toEqual(["Altrui"]);
  });

  it("listVisibleCampaigns elenca tutte le campagne visibili (senza filtro master)", async () => {
    await s.createCampaign("A");
    client._currentUid = "master2";
    await s.createCampaign("B");
    const all = (await s.listVisibleCampaigns()).map((c) => c.name).sort();
    expect(all).toEqual(["A", "B"]);
  });

  it("seedSharedChar semina la riga col char_id del master (push-down)", async () => {
    const c = await s.createCampaign("C");
    await s.seedSharedChar(c.id, "player1", "char-7", { id: "char-7", name: "Scheletro" });
    const rows = await s.listSharedForMaster(c.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ player_uid: "player1", char_id: "char-7" });
    expect(rows[0].char.name).toBe("Scheletro");
  });

  it("seedSharedChar è un upsert: riseminare aggiorna, non duplica", async () => {
    const c = await s.createCampaign("C");
    await s.seedSharedChar(c.id, "player1", "char-7", { name: "v1" });
    await s.seedSharedChar(c.id, "player1", "char-7", { name: "v2" });
    const rows = await s.listSharedForMaster(c.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].char.name).toBe("v2");
  });

  it("refreshSharedPrestige ripropaga alias/visibilità preservando i valori del giocatore e il resto della scheda", async () => {
    const c = await s.createCampaign("C");
    // Seed con la reputazione VECCHIA del master (nessun alias su id:4).
    await s.seedSharedChar(c.id, "player1", "char-1", {
      name: "Teofilo",
      prestige: [{ id: 1, name: "Flint", value: 1 }, { id: 4, name: "Clero", value: 2 }],
    });
    // Il giocatore gioca: alza il valore del 4 (canale suo) e aggiorna i PF.
    client._currentUid = "player1";
    await s.upsertMySharedChar(c.id, "player1", "char-1", {
      name: "Teofilo", currentHp: 8,
      prestige: [{ id: 1, name: "Flint", value: 1 }, { id: 4, name: "Clero", value: 5 }],
    });
    // Il master ora aliasa il 4 e nasconde il 5 nella sua copia di roster, poi ripropaga.
    const rosterNow = {
      id: "char-1", name: "Teofilo",
      prestige: [
        { id: 1, name: "Flint", value: 0 },
        { id: 4, name: "Clero", value: 2, alias: "Famiglia" },
        { id: 5, name: "Obscurati", value: 3, hidden: true },
      ],
    };
    await s.refreshSharedPrestige(c.id, "player1", "char-1", rosterNow);
    const rows = await s.listSharedForMaster(c.id);
    expect(rows[0].char.currentHp).toBe(8);            // il resto della scheda è intatto
    expect(rows[0].char.prestige).toEqual([
      { id: 1, name: "Flint", value: 1 },              // valore del giocatore preservato (non lo 0 del master)
      { id: 4, name: "Famiglia", value: 5 },           // alias applicato, valore del giocatore (5) preservato
    ]);                                                 // Obscurati (hidden) non è mai stato inviato
  });

  it("refreshSharedPrestige su riga inesistente → errore leggibile", async () => {
    const c = await s.createCampaign("C");
    await expect(s.refreshSharedPrestige(c.id, "playerX", "nope", { prestige: [] }))
      .rejects.toThrow("Scheda condivisa non trovata");
  });

  it("deleteSharedChar rimuove solo la riga giusta", async () => {
    const c = await s.createCampaign("C");
    await s.seedSharedChar(c.id, "player1", "a", { name: "A" });
    await s.seedSharedChar(c.id, "player2", "b", { name: "B" });
    await s.deleteSharedChar(c.id, "player1", "a");
    const rows = await s.listSharedForMaster(c.id);
    expect(rows.map((r) => r.char_id)).toEqual(["b"]);
  });

  it("listMembers elenca i giocatori iscritti", async () => {
    const c = await s.createCampaign("C");
    client._currentUid = "player1";
    await s.joinCampaign(c.join_code, "Manu");
    const members = await s.listMembers(c.id);
    expect(members).toHaveLength(1);
    expect(members[0]).toMatchObject({ player_uid: "player1", display_name: "Manu" });
  });
});

describe("giocatore: join e scheda condivisa", () => {
  it("joinCampaign valido → { campaignId, campaignName } e membership registrata", async () => {
    const c = await s.createCampaign("Avventura");
    client._currentUid = "player1";
    const res = await s.joinCampaign(c.join_code, "Manu");
    expect(res).toEqual({ campaignId: c.id, campaignName: "Avventura" });
    expect(client._db.campaign_members).toHaveLength(1);
  });

  it("joinCampaign è idempotente e normalizza il code (minuscolo/spazi)", async () => {
    const c = await s.createCampaign("Avventura");
    client._currentUid = "player1";
    await s.joinCampaign(c.join_code, "Manu");
    await s.joinCampaign(`  ${c.join_code.toLowerCase()}  `, "Manu");
    expect(client._db.campaign_members).toHaveLength(1);
  });

  it("joinCampaign con codice errato → errore leggibile", async () => {
    await expect(s.joinCampaign("XXXXXX", "Manu")).rejects.toThrow("Codice campagna non valido");
  });

  it("upsertMySharedChar aggiorna la propria riga; listSharedForMe la ritrova", async () => {
    const c = await s.createCampaign("C");
    await s.seedSharedChar(c.id, "player1", "char-1", { name: "scheletro", currentHp: 10 });
    client._currentUid = "player1";
    await s.upsertMySharedChar(c.id, "player1", "char-1", { name: "Aldric", currentHp: 4 });
    const mine = await s.listSharedForMe("player1");
    expect(mine).toHaveLength(1);
    expect(mine[0].char).toMatchObject({ name: "Aldric", currentHp: 4 });
  });
});

describe("Realtime (vista master live)", () => {
  it("subscribeSharedForMaster apre un canale e ritorna la disiscrizione", () => {
    const unsub = s.subscribeSharedForMaster("camp_1", () => {});
    expect(client._channels).toHaveLength(1);
    unsub();
    expect(client._channels).toHaveLength(0);
  });

  it("il payload di un cambio arriva a onChange", () => {
    const seen = [];
    s.subscribeSharedForMaster("camp_1", (p) => seen.push(p));
    const payload = { eventType: "UPDATE", new: { char_id: "x" } };
    client._channels[0].handlers[0](payload);
    expect(seen).toEqual([payload]);
  });
});

describe("vitaliByCharId (auto-popolamento Combat Tracker)", () => {
  it("indicizza per char_id i vitali delle proprie campagne", async () => {
    const c = await s.createCampaign("Zeitgeist");
    await s.seedSharedChar(c.id, "player1", "7", { name: "Alaric", currentHp: 12 });
    await s.seedSharedChar(c.id, "player2", "9", { name: "Bruna", currentHp: 30 });
    const m = await s.vitaliByCharId("master1");
    expect(Object.keys(m).sort()).toEqual(["7", "9"]);
    expect(m["7"].currentHp).toBe(12);
    expect(m["9"].name).toBe("Bruna");
  });

  it("unisce le righe di piu' campagne dello stesso master", async () => {
    const a = await s.createCampaign("Campagna A");
    const b = await s.createCampaign("Campagna B");
    await s.seedSharedChar(a.id, "p1", "1", { currentHp: 5 });
    await s.seedSharedChar(b.id, "p2", "2", { currentHp: 6 });
    const m = await s.vitaliByCharId("master1");
    expect(Object.keys(m).sort()).toEqual(["1", "2"]);
  });

  it("non espone le schede delle campagne di un altro master", async () => {
    const mia = await s.createCampaign("Mia");
    await s.seedSharedChar(mia.id, "p1", "1", { currentHp: 5 });
    client._currentUid = "master2";
    const altrui = await s.createCampaign("Altrui");
    await s.seedSharedChar(altrui.id, "p9", "99", { currentHp: 1 });
    const m = await s.vitaliByCharId("master1");
    expect(Object.keys(m)).toEqual(["1"]);
  });

  it("master senza campagne → mappa vuota (nessun errore)", async () => {
    expect(await s.vitaliByCharId("nessuno")).toEqual({});
  });

  it("campagna senza schede assegnate → mappa vuota", async () => {
    await s.createCampaign("Vuota");
    expect(await s.vitaliByCharId("master1")).toEqual({});
  });

  it("le chiavi sono stringhe (char_id numerico del roster)", async () => {
    const c = await s.createCampaign("X");
    await s.seedSharedChar(c.id, "p1", 42, { currentHp: 3 });
    const m = await s.vitaliByCharId("master1");
    expect(m["42"].currentHp).toBe(3);
  });
});

describe("seedSharedChar: sanificazione prima di partire verso il giocatore", () => {
  const charMaster = () => ({
    id: 7, name: "Teofilo", level: 3, currentHp: 20,
    reputation: [{ nota: "segreta" }],
    prestige: [
      { id: 1, name: "Flint", value: 3 },
      { id: 4, name: "Clero", value: 2, alias: "Famiglia" },
      { id: 5, name: "Obscurati", value: 1, hidden: true },
    ],
  });

  it("la riga condivisa non contiene i campi master-only", async () => {
    const c = await s.createCampaign("Zeitgeist");
    await s.seedSharedChar(c.id, "p1", 7, charMaster());
    const [riga] = await s.listSharedForMaster(c.id);
    expect(riga.char).not.toHaveProperty("reputation");
  });

  it("il prestigio parte in forma pubblica: alias applicato, voci nascoste assenti", async () => {
    const c = await s.createCampaign("Zeitgeist");
    await s.seedSharedChar(c.id, "p1", 7, charMaster());
    const [riga] = await s.listSharedForMaster(c.id);
    expect(riga.char.prestige).toEqual([
      { id: 1, name: "Flint", value: 3 },
      { id: 4, name: "Famiglia", value: 2 },
    ]);
  });

  it("nessun segreto del master finisce nel JSON che il giocatore puo' leggere", async () => {
    const c = await s.createCampaign("Zeitgeist");
    await s.seedSharedChar(c.id, "p1", 7, charMaster());
    const [riga] = await s.listSharedForMaster(c.id);
    const json = JSON.stringify(riga.char);
    expect(json).not.toContain("Clero");
    expect(json).not.toContain("Obscurati");
    expect(json).not.toContain("segreta");
    expect(json).not.toContain("alias");
    expect(json).not.toContain("hidden");
  });

  it("non muta il char del roster del master", async () => {
    const c = await s.createCampaign("Zeitgeist");
    const originale = charMaster();
    await s.seedSharedChar(c.id, "p1", 7, originale);
    expect(originale.prestige).toHaveLength(3);
    expect(originale.prestige[1].name).toBe("Clero");
    expect(originale).toHaveProperty("reputation");
  });

  it("i campi normali passano intatti", async () => {
    const c = await s.createCampaign("Zeitgeist");
    await s.seedSharedChar(c.id, "p1", 7, charMaster());
    const [riga] = await s.listSharedForMaster(c.id);
    expect(riga.char.name).toBe("Teofilo");
    expect(riga.char.level).toBe(3);
    expect(riga.char.currentHp).toBe(20);
  });

  it("char senza prestige non esplode", async () => {
    const c = await s.createCampaign("Zeitgeist");
    await s.seedSharedChar(c.id, "p1", 8, { id: 8, name: "Senza" });
    const righe = await s.listSharedForMaster(c.id);
    expect(righe.find((r) => r.char_id === "8").char.name).toBe("Senza");
  });
});
