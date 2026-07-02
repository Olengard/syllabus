import { describe, it, expect, vi, afterEach } from "vitest";
import { parseDice, rollDice, rollAdvantage } from "./DiceTray.jsx";

afterEach(() => vi.restoreAllMocks());

describe("parseDice", () => {
  it.each([
    "d20", "3d6+2", "2d8+1d6-1", "2D6 + 3", "1d1000", "-2d6+10", "d4+d4",
  ])("accetta %s", (expr) => {
    expect(parseDice(expr)).not.toBeNull();
  });

  it.each([
    "5",        // numero secco: non è un tiro
    "+3",
    "3d6+",     // termine mancante
    "d",
    "abc",
    "fireball", // testo (la palette la usa per distinguere ricerca da tiro)
    "d0",       // meno di 2 facce
    "d1",
    "101d6",    // oltre 100 dadi
    "1d1001",   // oltre 1000 facce
    "",
    null,
  ])("rifiuta %s", (expr) => {
    expect(parseDice(expr)).toBeNull();
  });

  it("scompone 2d8+1d6-3 in termini con segno", () => {
    const terms = parseDice("2d8+1d6-3");
    expect(terms).toEqual([
      { kind: "dice", sign: 1, n: 2, sides: 8 },
      { kind: "dice", sign: 1, n: 1, sides: 6 },
      { kind: "flat", sign: -1, value: 3 },
    ]);
  });

  it("d20 implica 1 dado", () => {
    expect(parseDice("d20")).toEqual([{ kind: "dice", sign: 1, n: 1, sides: 20 }]);
  });
});

describe("rollDice", () => {
  it("con Math.random()=0 ogni dado vale 1 (minimo)", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollDice("3d6+2").total).toBe(5);   // 1+1+1+2
    expect(rollDice("2d8-1").total).toBe(1);   // 1+1-1
    expect(rollDice("-2d6+10").total).toBe(8); // -(1+1)+10
  });

  it("con Math.random()≈1 ogni dado vale il massimo", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.999999);
    expect(rollDice("3d6+2").total).toBe(20);  // 6+6+6+2
    expect(rollDice("d20").total).toBe(20);
    expect(rollDice("2d10+1d4").total).toBe(24);
  });

  it("il totale resta nei limiti teorici su molti tiri reali", () => {
    for (let i = 0; i < 200; i++) {
      const r = rollDice("3d6+2");
      expect(r.total).toBeGreaterThanOrEqual(5);
      expect(r.total).toBeLessThanOrEqual(20);
    }
  });

  it("breakdown riporta i singoli dadi e il modificatore", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const r = rollDice("2d6+3");
    expect(r.breakdown).toBe("2d6 [1, 1] +3");
    expect(r.expr).toBe("2d6+3");
  });

  it("normalizza spazi e maiuscole nell'espressione", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(rollDice("2D6 + 3").expr).toBe("2d6+3");
  });

  it("ritorna null per espressioni non valide", () => {
    expect(rollDice("fireball")).toBeNull();
  });
});

describe("rollAdvantage", () => {
  it("vantaggio tiene il d20 più alto", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0)        // 1
      .mockReturnValueOnce(0.999999); // 20
    const r = rollAdvantage("adv");
    expect(r.total).toBe(20);
    expect(r.breakdown).toContain("[1, 20]");
  });

  it("svantaggio tiene il d20 più basso", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.999999) // 20
      .mockReturnValueOnce(0);       // 1
    const r = rollAdvantage("dis");
    expect(r.total).toBe(1);
  });

  it("applica il bonus al dado tenuto", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // 11 e 11
    expect(rollAdvantage("adv", 3).total).toBe(14);
  });
});
