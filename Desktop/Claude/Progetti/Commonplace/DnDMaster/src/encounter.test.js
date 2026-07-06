import { describe, it, expect } from "vitest";
import { canonMonsterType, coherentWith, terrainAllows, TYPE_AFFINITY, TERRAIN_CANON } from "./encounter.js";

describe("canonMonsterType (IT inline + EN 5e.tools)", () => {
  it.each([
    ["Umanoide", "humanoid"], ["humanoid", "humanoid"],
    ["Umanoide (goblinoide)", "humanoid"], ["humanoid (goblinoid)", "humanoid"],
    ["Non morto", "undead"], ["undead", "undead"],
    ["Bestia", "beast"], ["beast", "beast"],
    ["Demonio", "fiend"], ["fiend", "fiend"], ["Immondo (diavolo)", "fiend"],
    ["Drago", "dragon"], ["dragon", "dragon"],
    ["Mostruosità", "monstrosity"], ["monstrosity", "monstrosity"],
    ["Melma", "ooze"], ["ooze", "ooze"],
    ["Fata", "fey"], ["fey", "fey"],
  ])("%s → %s", (input, expected) => {
    expect(canonMonsterType(input)).toBe(expected);
  });

  it("tipo sconosciuto o vuoto → other", () => {
    expect(canonMonsterType("boh")).toBe("other");
    expect(canonMonsterType("")).toBe("other");
    expect(canonMonsterType(null)).toBe("other");
  });
});

describe("coherentWith (affinità tematiche)", () => {
  it("accoppiate classiche ammesse", () => {
    expect(coherentWith("Umanoide", "Bestia")).toBe(true);       // banditi coi lupi
    expect(coherentWith("Demonio", "Umanoide")).toBe(true);      // demone + cultisti
    expect(coherentWith("Drago", "humanoid")).toBe(true);        // drago + coboldi (EN/IT misti)
    expect(coherentWith("Gigante", "Umanoide")).toBe(true);
    expect(coherentWith("Non morto", "undead")).toBe(true);      // orda omogenea
    expect(coherentWith("Fata", "Pianta")).toBe(true);
  });

  it("accoppiate incoerenti escluse", () => {
    expect(coherentWith("Non morto", "Bestia")).toBe(false);     // fantasma + lupo: no
    expect(coherentWith("Bestia", "Umanoide")).toBe(false);      // branco puro (asimmetrico voluto)
    expect(coherentWith("Elementale", "Umanoide")).toBe(false);
    expect(coherentWith("Melma", "Non morto")).toBe(false);
  });

  it("ogni tipo è coerente con sé stesso", () => {
    for (const key of Object.keys(TYPE_AFFINITY)) {
      expect(TYPE_AFFINITY[key]).toContain(key);
    }
  });
});

describe("terrainAllows", () => {
  it("filtra per terreno con tipi IT e EN", () => {
    expect(terrainAllows("Foresta", "Bestia")).toBe(true);
    expect(terrainAllows("Foresta", "beast")).toBe(true);        // importati EN: prima non matchavano mai
    expect(terrainAllows("Foresta", "Non morto")).toBe(false);
    expect(terrainAllows("Città", "undead")).toBe(true);
    expect(terrainAllows("Piano Infernale", "Bestia")).toBe(false);
  });

  it("Qualsiasi ammette tutto", () => {
    expect(terrainAllows("Qualsiasi", "Melma")).toBe(true);
    expect(terrainAllows("Qualsiasi", "qualunque cosa")).toBe(true);
  });

  it("le mostruosità ora compaiono nei terreni giusti (prima mai)", () => {
    expect(terrainAllows("Foresta", "Mostruosità")).toBe(true);  // es. guforso
    expect(terrainAllows("Grotta", "monstrosity")).toBe(true);
  });

  it("ogni terreno (tranne Qualsiasi) ha una lista valida", () => {
    for (const [terrain, types] of Object.entries(TERRAIN_CANON)) {
      if (terrain === "Qualsiasi") { expect(types).toBeNull(); continue; }
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    }
  });
});
