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
