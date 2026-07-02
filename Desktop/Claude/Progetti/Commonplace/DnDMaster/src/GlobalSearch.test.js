import { describe, it, expect } from "vitest";
import { norm, deSlug } from "./GlobalSearch.jsx";

describe("norm (normalizzazione per la ricerca)", () => {
  it("minuscolizza e rimuove gli accenti", () => {
    expect(norm("Palla di Fuoco")).toBe("palla di fuoco");
    expect(norm("città")).toBe("citta");
    expect(norm("Velocità ridotta è già")).toBe("velocita ridotta e gia");
  });

  it("collassa gli spazi multipli e trima", () => {
    expect(norm("  spada   lunga  ")).toBe("spada lunga");
  });

  it("gestisce input vuoti o non-stringa", () => {
    expect(norm("")).toBe("");
    expect(norm(null)).toBe("");
    expect(norm(undefined)).toBe("");
    expect(norm(42)).toBe("42");
  });
});

describe("deSlug (ponte EN↔IT: slug 5e.tools → nome inglese)", () => {
  it("trasforma i trattini in spazi", () => {
    expect(deSlug("acid-splash")).toBe("acid splash");
    expect(deSlug("fireball")).toBe("fireball");
  });

  it("rimuove i suffissi tecnici imported/custom", () => {
    expect(deSlug("barbaro-imported")).toBe("barbaro");
    expect(deSlug("custom-spada-magica")).toBe("spada magica");
  });

  it("gestisce slug vuoti o mancanti", () => {
    expect(deSlug("")).toBe("");
    expect(deSlug(null)).toBe("");
    expect(deSlug(undefined)).toBe("");
  });
});

describe("ponte EN↔IT (integrazione norm+deSlug come nei filtri)", () => {
  // Riproduce il pattern usato da SpellsPage/MonstersPage:
  //   searchNorm(`${name} ${deSlug(slug)}`).includes(searchNorm(query))
  const matches = (item, query) =>
    norm(`${item.name} ${deSlug(item.slug)}`).includes(norm(query));

  const pallaDiFuoco = { name: "Palla di Fuoco", slug: "fireball" };

  it("trova l'italiano cercando in inglese", () => {
    expect(matches(pallaDiFuoco, "fireball")).toBe(true);
    expect(matches(pallaDiFuoco, "Fireball")).toBe(true);
  });

  it("trova l'italiano cercando in italiano (accenti inclusi)", () => {
    expect(matches(pallaDiFuoco, "palla di fuoco")).toBe(true);
    expect(matches(pallaDiFuoco, "PALLA")).toBe(true);
  });

  it("non produce falsi positivi", () => {
    expect(matches(pallaDiFuoco, "lightning bolt")).toBe(false);
  });
});
