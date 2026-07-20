import { describe, it, expect } from "vitest";
import {
  TUTTE, filterByCampaign, countByCampaign,
  addCampaign, renameCampaign, removeCampaign,
  filterAfterRemoval, activeAfterFilter,
} from "./roster.js";

const campagne = () => [
  { id: "rc_zeit", name: "Zeitgeist" },
  { id: "rc_altra", name: "Altra storia" },
];

const pg = () => [
  { id: 1, name: "Teofilo", campaignId: "rc_zeit" },
  { id: 2, name: "Bruna", campaignId: "rc_zeit" },
  { id: 3, name: "Corvo", campaignId: "rc_altra" },
  { id: 4, name: "Vecchio PG" },                      // mai assegnato
];

describe("filterByCampaign", () => {
  it("TUTTE mostra ogni PG, non assegnati inclusi", () => {
    expect(filterByCampaign(pg(), TUTTE)).toHaveLength(4);
  });

  it("una campagna mostra solo i suoi PG", () => {
    expect(filterByCampaign(pg(), "rc_zeit").map((c) => c.name)).toEqual(["Teofilo", "Bruna"]);
  });

  it("i PG non assegnati NON compaiono sotto una campagna", () => {
    // Scelta di Stefano: il filtro e' rigoroso.
    expect(filterByCampaign(pg(), "rc_altra").map((c) => c.name)).toEqual(["Corvo"]);
  });

  it("campagna senza PG → lista vuota, non un errore", () => {
    expect(filterByCampaign(pg(), "rc_inesistente")).toEqual([]);
  });

  it("preserva l'ordine ricevuto", () => {
    const inv = [...pg()].reverse();
    expect(filterByCampaign(inv, "rc_zeit").map((c) => c.name)).toEqual(["Bruna", "Teofilo"]);
  });

  it("lista vuota o assente", () => {
    expect(filterByCampaign([], "rc_zeit")).toEqual([]);
    expect(filterByCampaign(null, TUTTE)).toEqual([]);
  });
});

describe("countByCampaign", () => {
  it("conta per campagna e i non assegnati", () => {
    expect(countByCampaign(pg(), campagne())).toEqual({
      perCampagna: { rc_zeit: 2, rc_altra: 1 },
      nonAssegnati: 1,
    });
  });

  it("un PG con campagna cancellata risulta NON ASSEGNATO, non sparisce", () => {
    const orfano = [...pg(), { id: 5, name: "Orfano", campaignId: "rc_sparita" }];
    expect(countByCampaign(orfano, campagne()).nonAssegnati).toBe(2);
  });

  it("nessuna campagna → tutti non assegnati", () => {
    expect(countByCampaign(pg(), []).nonAssegnati).toBe(4);
  });
});

describe("gestione della lista campagne", () => {
  it("addCampaign aggiunge in coda con id univoco", () => {
    const out = addCampaign(campagne(), "Terza");
    expect(out).toHaveLength(3);
    expect(out[2].name).toBe("Terza");
    expect(out.map((c) => c.id)).toHaveLength(new Set(out.map((c) => c.id)).size);
  });

  it("addCampaign ignora nome vuoto o solo spazi", () => {
    expect(addCampaign(campagne(), "   ")).toHaveLength(2);
    expect(addCampaign(campagne(), "")).toHaveLength(2);
  });

  it("addCampaign taglia gli spazi ai bordi", () => {
    expect(addCampaign([], "  Zeitgeist  ")[0].name).toBe("Zeitgeist");
  });

  it("renameCampaign cambia solo quella giusta", () => {
    const out = renameCampaign(campagne(), "rc_altra", "Rinominata");
    expect(out[0].name).toBe("Zeitgeist");
    expect(out[1].name).toBe("Rinominata");
  });

  it("renameCampaign ignora il nome vuoto", () => {
    expect(renameCampaign(campagne(), "rc_zeit", "  ")[0].name).toBe("Zeitgeist");
  });

  it("removeCampaign toglie solo quella, immutabile", () => {
    const base = campagne();
    const out = removeCampaign(base, "rc_zeit");
    expect(out.map((c) => c.id)).toEqual(["rc_altra"]);
    expect(base).toHaveLength(2);
  });
});

describe("conseguenze sul filtro e sulla selezione", () => {
  it("cancellare la campagna che stai guardando riporta a TUTTE", () => {
    expect(filterAfterRemoval("rc_zeit", "rc_zeit")).toBe(TUTTE);
  });

  it("cancellarne un'altra non tocca il filtro", () => {
    expect(filterAfterRemoval("rc_zeit", "rc_altra")).toBe("rc_zeit");
  });

  it("il PG attivo resta selezionato se il filtro lo mostra ancora", () => {
    expect(activeAfterFilter(pg(), "rc_zeit", 2)).toBe(2);
  });

  it("se il PG attivo non e' piu' visibile si passa al primo della campagna", () => {
    // Stavi su Corvo (altra storia) e filtri Zeitgeist.
    expect(activeAfterFilter(pg(), "rc_zeit", 3)).toBe(1);
  });

  it("filtro su una campagna vuota → nessun PG attivo", () => {
    expect(activeAfterFilter(pg(), "rc_vuota", 1)).toBeNull();
  });

  it("con TUTTE il PG attivo non cambia mai", () => {
    expect(activeAfterFilter(pg(), TUTTE, 4)).toBe(4);
  });
});
