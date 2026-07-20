import { describe, it, expect } from "vitest";
import { advanceClock, clockTime, hitDiceAfterLongRest } from "./SessionPage.jsx";

describe("advanceClock (orologio di gioco)", () => {
  it("avanza dentro lo stesso giorno", () => {
    expect(advanceClock({ day: 1, minutes: 480 }, 10)).toEqual({ day: 1, minutes: 490 });
    expect(advanceClock({ day: 3, minutes: 0 }, 60)).toEqual({ day: 3, minutes: 60 });
  });

  it("gestisce il cambio giorno (riposo lungo notturno)", () => {
    // Giorno 1, 23:00 + 8h → Giorno 2, 07:00
    expect(advanceClock({ day: 1, minutes: 23 * 60 }, 8 * 60)).toEqual({ day: 2, minutes: 7 * 60 });
  });

  it("scavalca più giorni se serve", () => {
    expect(advanceClock({ day: 1, minutes: 0 }, 3 * 1440 + 30)).toEqual({ day: 4, minutes: 30 });
  });

  it("non scende mai sotto Giorno 1, 00:00", () => {
    expect(advanceClock({ day: 1, minutes: 30 }, -120)).toEqual({ day: 1, minutes: 0 });
  });
});

describe("hitDiceAfterLongRest (riposo lungo: metà dadi vita, minimo 1)", () => {
  it("recupera metà del livello, arrotondato per difetto", () => {
    // Lv 5, 4 dadi spesi → recupera 2 → ne restano 2 spesi
    expect(hitDiceAfterLongRest({ level: 5, hitDiceUsed: 4 })).toBe(2);
    expect(hitDiceAfterLongRest({ level: 20, hitDiceUsed: 20 })).toBe(10);
  });

  it("recupera almeno 1 dado ai livelli bassi", () => {
    // Lv 1-3: floor(level/2) sarebbe 0 o 1, ma il minimo di regola e' 1
    expect(hitDiceAfterLongRest({ level: 1, hitDiceUsed: 1 })).toBe(0);
    expect(hitDiceAfterLongRest({ level: 3, hitDiceUsed: 2 })).toBe(1);
  });

  it("non scende sotto zero se i dadi spesi sono meno di quelli recuperati", () => {
    expect(hitDiceAfterLongRest({ level: 10, hitDiceUsed: 2 })).toBe(0);
    expect(hitDiceAfterLongRest({ level: 8, hitDiceUsed: 0 })).toBe(0);
  });

  it("tollera i PG senza i campi (schede pre-blocco A)", () => {
    expect(hitDiceAfterLongRest({})).toBe(0);
    expect(hitDiceAfterLongRest({ hitDiceUsed: 3 })).toBe(2); // level assente → 1 → recupera 1
  });
});

describe("clockTime", () => {
  it("formatta HH:MM con zeri", () => {
    expect(clockTime({ day: 1, minutes: 8 * 60 })).toBe("08:00");
    expect(clockTime({ day: 1, minutes: 14 * 60 + 5 })).toBe("14:05");
    expect(clockTime({ day: 1, minutes: 0 })).toBe("00:00");
  });
});
