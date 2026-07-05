import { describe, it, expect } from "vitest";
import { advanceClock, clockTime } from "./SessionPage.jsx";

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

describe("clockTime", () => {
  it("formatta HH:MM con zeri", () => {
    expect(clockTime({ day: 1, minutes: 8 * 60 })).toBe("08:00");
    expect(clockTime({ day: 1, minutes: 14 * 60 + 5 })).toBe("14:05");
    expect(clockTime({ day: 1, minutes: 0 })).toBe("00:00");
  });
});
