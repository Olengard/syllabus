import { describe, it, expect } from "vitest";
import {
  VITALI_FIELDS, ADMIN_FIELDS, MASTER_ONLY_FIELDS,
  pickVitali, pickAdmin, stableStringify,
  diffAdmin, applyAccepted, adminHash, hasPendingAdmin,
  applyVitaliToCombatant, publicPrestige, diffPrestige, mergePlayerPrestige,
} from "./sharedChar.js";

// Char minimale coi campi reali di defaultChar che ci servono nei test.
const baseChar = () => ({
  id: 1, name: "Aldric", player: "Stefano",
  race: "Umano", class: "Guerriero", subclass: "", level: 3, background: "Soldato",
  alignment: "LB", languages: "Comune", xp: 900,
  maxHp: 28, currentHp: 20, tempHp: 0,
  armorClass: 16, acAuto: true, speed: 30, initiative: 2, passivePerception: 12,
  inspiration: false, hitDiceUsed: 0, conditions: [], deathSaves: { successes: 0, failures: 0 },
  abilities: { STR: 16, DEX: 12, CON: 14, INT: 10, WIS: 11, CHA: 8 },
  savingThrows: { STR: true, DEX: false, CON: true, INT: false, WIS: false, CHA: false },
  skills: { athletics: true },
  equipment: [{ name: "Spada lunga" }], pinnedFeatures: ["x"],
  spells: [], spellSlots: {}, usedSpellSlots: {},
  currency: { cp: 0, sp: 0, ep: 0, gp: 15, pp: 0 },
  reputation: [], prestige: [{ id: 1, name: "Flint", value: 0 }],
  notes: "", traits: "", ideals: "", bonds: "", flaws: "",
  attacks: [], choices: {},
});

describe("partizione dei campi", () => {
  it("vitali e amministrativo non si sovrappongono", () => {
    for (const f of VITALI_FIELDS) expect(ADMIN_FIELDS).not.toContain(f);
    for (const f of MASTER_ONLY_FIELDS) expect(ADMIN_FIELDS).not.toContain(f);
  });

  it("pickVitali prende solo i vitali presenti", () => {
    const v = pickVitali(baseChar());
    expect(Object.keys(v).sort()).toEqual([...VITALI_FIELDS].sort());
    expect(v.currentHp).toBe(20);
  });

  it("pickAdmin esclude vitali, master-only, identità e viste locali", () => {
    const a = pickAdmin(baseChar());
    expect(a).not.toHaveProperty("currentHp");
    expect(a).not.toHaveProperty("prestige");
    expect(a).not.toHaveProperty("id");
    expect(a).not.toHaveProperty("player");
    expect(a).not.toHaveProperty("initiative");
    expect(a).not.toHaveProperty("pinnedFeatures");
    expect(a).not.toHaveProperty("acAuto");     // viaggia con armorClass
    expect(a.name).toBe("Aldric");
  });

  it("pickVitali su char nullo → oggetto vuoto", () => {
    expect(pickVitali(null)).toEqual({});
  });
});

describe("stableStringify", () => {
  it("stessa struttura, ordine chiavi diverso → stessa stringa", () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
  });
  it("nested e array preservati", () => {
    expect(stableStringify({ x: [1, { q: 2, p: 3 }] })).toBe('{"x":[1,{"p":3,"q":2}]}');
  });
});

describe("diffAdmin", () => {
  it("schede identiche → nessuna differenza", () => {
    expect(diffAdmin(baseChar(), baseChar())).toEqual([]);
  });

  it("i vitali divergenti NON entrano nel diff amministrativo", () => {
    const m = baseChar();
    const s = { ...baseChar(), currentHp: 3, inspiration: true, deathSaves: { successes: 2, failures: 0 } };
    expect(diffAdmin(m, s)).toEqual([]);
  });

  it("i campi master-only non entrano nel diff", () => {
    const m = baseChar();
    const s = { ...baseChar(), prestige: [{ id: 1, name: "Flint", value: 5 }], reputation: [{ x: 1 }] };
    expect(diffAdmin(m, s)).toEqual([]);
  });

  it("scalare: livello 3 → 4 come entry scalar con before/after", () => {
    const d = diffAdmin(baseChar(), { ...baseChar(), level: 4 });
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ field: "level", kind: "scalar", before: 3, after: 4 });
  });

  it("armorClass produce una sola entry (acAuto non è una entry separata)", () => {
    const d = diffAdmin(baseChar(), { ...baseChar(), armorClass: 18, acAuto: false });
    expect(d.map((e) => e.field)).toEqual(["armorClass"]);
  });

  it("array equipment: entry di tipo array con sintesi dei conteggi", () => {
    const s = { ...baseChar(), equipment: [{ name: "Spada lunga" }, { name: "Scudo" }] };
    const d = diffAdmin(baseChar(), s);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ field: "equipment", kind: "array", summary: "1 → 2" });
    expect(d[0].after).toEqual({ count: 2 });
  });

  it("oggetto abilities: entry di tipo object", () => {
    const s = { ...baseChar(), abilities: { ...baseChar().abilities, STR: 18 } };
    const d = diffAdmin(baseChar(), s);
    expect(d).toHaveLength(1);
    expect(d[0]).toMatchObject({ field: "abilities", kind: "object" });
  });

  it("ritratto cambiato → entry portrait senza base64", () => {
    const m = { ...baseChar(), portrait: "data:image/jpeg;base64,AAA" };
    const s = { ...baseChar(), portrait: "data:image/jpeg;base64,BBB" };
    const d = diffAdmin(m, s);
    expect(d).toHaveLength(1);
    expect(d[0].field).toBe("portrait");
    expect(d[0].before).toBeNull();
    expect(d[0].after).toBeNull();
  });
});

describe("applyAccepted", () => {
  it("copia i soli campi spuntati, immutabile sull'originale", () => {
    const m = baseChar();
    const s = { ...baseChar(), level: 5, xp: 6500, notes: "salito di livello" };
    const out = applyAccepted(m, s, ["level"]);
    expect(out.level).toBe(5);
    expect(out.xp).toBe(900);          // non accettato → resta del master
    expect(m.level).toBe(3);           // originale intatto
  });

  it("armorClass trascina acAuto", () => {
    const m = baseChar();                       // acAuto true
    const s = { ...baseChar(), armorClass: 18, acAuto: false };
    const out = applyAccepted(m, s, ["armorClass"]);
    expect(out.armorClass).toBe(18);
    expect(out.acAuto).toBe(false);
  });

  it("array accettato a blocco, deep-clone (niente aliasing con la riga condivisa)", () => {
    const m = baseChar();
    const s = { ...baseChar(), equipment: [{ name: "Ascia" }] };
    const out = applyAccepted(m, s, ["equipment"]);
    expect(out.equipment).toEqual([{ name: "Ascia" }]);
    out.equipment[0].name = "Martello";
    expect(s.equipment[0].name).toBe("Ascia");   // la sorgente non è mutata
  });

  it("portrait accettato copia il base64", () => {
    const s = { ...baseChar(), portrait: "data:image/jpeg;base64,ZZZ" };
    const out = applyAccepted(baseChar(), s, ["portrait"]);
    expect(out.portrait).toBe("data:image/jpeg;base64,ZZZ");
  });

  it("nessun campo spuntato → copia identica del master", () => {
    const m = baseChar();
    expect(applyAccepted(m, { ...m, level: 9 }, [])).toEqual(m);
  });
});

describe("adminHash & hasPendingAdmin (badge 📬)", () => {
  it("stesso amministrativo → stesso hash; vitali diversi → hash invariato", () => {
    const a = baseChar();
    const b = { ...baseChar(), currentHp: 1, inspiration: true };
    expect(adminHash(a)).toBe(adminHash(b));
  });

  it("un campo amministrativo diverso → hash diverso", () => {
    expect(adminHash(baseChar())).not.toBe(adminHash({ ...baseChar(), level: 4 }));
  });

  it("ritratto diverso → hash diverso (senza confrontare il base64 crudo)", () => {
    const a = { ...baseChar(), portrait: "data:image/jpeg;base64,AAA" };
    const b = { ...baseChar(), portrait: "data:image/jpeg;base64,BBB" };
    expect(adminHash(a)).not.toBe(adminHash(b));
  });

  it("nessuna divergenza → nessun badge", () => {
    expect(hasPendingAdmin(baseChar(), baseChar(), null)).toBe(false);
  });

  it("divergenza mai vista → badge", () => {
    const s = { ...baseChar(), level: 4 };
    expect(hasPendingAdmin(baseChar(), s, null)).toBe(true);
  });

  it("divergenza già 'ignorata' (lastSeenHash = snapshot corrente) → niente badge", () => {
    const s = { ...baseChar(), level: 4 };
    expect(hasPendingAdmin(baseChar(), s, adminHash(s))).toBe(false);
  });

  it("dopo un 'ignora', una nuova modifica del giocatore fa ricomparire il badge", () => {
    const s1 = { ...baseChar(), level: 4 };
    const seen = adminHash(s1);                 // il master ignora s1
    const s2 = { ...baseChar(), level: 4, xp: 8000 };  // il giocatore rimodifica
    expect(hasPendingAdmin(baseChar(), s2, seen)).toBe(true);
  });
});

describe("applyVitaliToCombatant (auto-popolamento Combat Tracker)", () => {
  const pc = () => ({
    id: "pc-1", kind: "pc", name: "Alaric", currentHp: 30, maxHp: 30,
    ac: 16, conditions: [], effects: [], dead: false, note: "",
  });

  it("versa PF correnti, condizioni e TS morte del giocatore", () => {
    const out = applyVitaliToCombatant(pc(), {
      currentHp: 12, conditions: ["Avvelenato"],
      deathSaves: { successes: 1, failures: 2 },
    });
    expect(out.currentHp).toBe(12);
    expect(out.conditions).toEqual(["Avvelenato"]);
    expect(out.deathSaves).toEqual({ successes: 1, failures: 2 });
  });

  it("non tocca i campi del master (maxHp, ac, note, effects)", () => {
    const out = applyVitaliToCombatant(
      { ...pc(), note: "concentrato", effects: [{ id: "e1" }] },
      { currentHp: 5, maxHp: 999, ac: 1, note: "hackerata" },
    );
    expect(out.maxHp).toBe(30);
    expect(out.ac).toBe(16);
    expect(out.note).toBe("concentrato");
    expect(out.effects).toEqual([{ id: "e1" }]);
  });

  it("non dichiara mai morto un PG: 'dead' resta del master", () => {
    // Il giocatore va a 0 PF, ma decidere il KO al tavolo spetta al master.
    const out = applyVitaliToCombatant(pc(), { currentHp: 0 });
    expect(out.currentHp).toBe(0);
    expect(out.dead).toBe(false);
  });

  it("PF a 0 sono un valore valido, non un campo assente", () => {
    // Regressione: un `if (shared.currentHp)` ignorerebbe lo 0.
    expect(applyVitaliToCombatant(pc(), { currentHp: 0 }).currentHp).toBe(0);
  });

  it("senza riga condivisa il combattente resta identico", () => {
    expect(applyVitaliToCombatant(pc(), null)).toEqual(pc());
    expect(applyVitaliToCombatant(pc(), undefined)).toEqual(pc());
  });

  it("ignora i campi vitali assenti invece di azzerarli", () => {
    const base = { ...pc(), currentHp: 20, conditions: ["Prono"] };
    const out = applyVitaliToCombatant(base, { inspiration: true });
    expect(out.currentHp).toBe(20);
    expect(out.conditions).toEqual(["Prono"]);
  });

  it("e' immutabile: non modifica il combattente originale", () => {
    const base = pc();
    applyVitaliToCombatant(base, { currentHp: 1, conditions: ["Stordito"] });
    expect(base.currentHp).toBe(30);
    expect(base.conditions).toEqual([]);
  });

  it("clona l'array condizioni (niente aliasing con la riga condivisa)", () => {
    const shared = { conditions: ["Prono"] };
    const out = applyVitaliToCombatant(pc(), shared);
    out.conditions.push("Cieco");
    expect(shared.conditions).toEqual(["Prono"]);
  });
});

describe("prestigio: visibilita' per-voce (alias / hidden)", () => {
  // Caso reale: Teofilo crede di avere prestigio con la «Famiglia»; il master
  // sa che quel valore e' del «Clero». Gli Obscurati non esistono, per lui.
  const masterPrestige = () => [
    { id: 1, name: "Flint", value: 3 },
    { id: 4, name: "Clero", value: 2, alias: "Famiglia" },
    { id: 5, name: "Obscurati", value: 1, hidden: true },
  ];

  describe("publicPrestige (cio' che parte verso il giocatore)", () => {
    it("sostituisce il nome con l'alias e omette le voci nascoste", () => {
      expect(publicPrestige(masterPrestige())).toEqual([
        { id: 1, name: "Flint", value: 3 },
        { id: 4, name: "Famiglia", value: 2 },
      ]);
    });

    it("non fa trapelare i metadati del master", () => {
      // Sapere che una voce HA un alias e' gia' meta' segreto svelato.
      for (const v of publicPrestige(masterPrestige())) {
        expect(v).not.toHaveProperty("alias");
        expect(v).not.toHaveProperty("hidden");
      }
    });

    it("il nome vero di una voce aliasata non compare da nessuna parte", () => {
      expect(JSON.stringify(publicPrestige(masterPrestige()))).not.toContain("Clero");
      expect(JSON.stringify(publicPrestige(masterPrestige()))).not.toContain("Obscurati");
    });

    it("lista vuota o assente → array vuoto", () => {
      expect(publicPrestige([])).toEqual([]);
      expect(publicPrestige(null)).toEqual([]);
    });
  });

  describe("diffPrestige (cosa vede il master nel pannello)", () => {
    it("etichetta le variazioni col nome VERO, non con l'alias", () => {
      const dal = [{ id: 4, name: "Famiglia", value: 5 }];
      expect(diffPrestige(masterPrestige(), dal)).toEqual([
        { id: 4, name: "Clero", before: 2, after: 5 },
      ]);
    });

    it("nessuna variazione → diff vuoto", () => {
      expect(diffPrestige(masterPrestige(), publicPrestige(masterPrestige()))).toEqual([]);
    });

    it("le voci nascoste non entrano mai nel diff", () => {
      // Anche se il giocatore inventasse una riga con l'id di una voce nascosta.
      const malevolo = [{ id: 5, name: "Obscurati", value: 10 }];
      expect(diffPrestige(masterPrestige(), malevolo)).toEqual([]);
    });

    it("le voci che il giocatore non ha rimandato non risultano azzerate", () => {
      expect(diffPrestige(masterPrestige(), [])).toEqual([]);
    });
  });

  describe("mergePlayerPrestige (accept)", () => {
    it("applica il valore proposto conservando il nome vero e l'alias", () => {
      const out = mergePlayerPrestige(masterPrestige(), [{ id: 4, name: "Famiglia", value: 5 }]);
      expect(out[1]).toEqual({ id: 4, name: "Clero", value: 5, alias: "Famiglia" });
    });

    it("REGRESSIONE: un accept non distrugge le voci segrete", () => {
      // Il giocatore rimanda 2 voci su 3: senza merge per id, un accept
      // sostituirebbe la lista e cancellerebbe gli Obscurati.
      const out = mergePlayerPrestige(masterPrestige(), publicPrestige(masterPrestige()));
      expect(out).toHaveLength(3);
      expect(out[2]).toEqual({ id: 5, name: "Obscurati", value: 1, hidden: true });
    });

    it("una voce nascosta non e' modificabile dal giocatore", () => {
      const out = mergePlayerPrestige(masterPrestige(), [{ id: 5, name: "Obscurati", value: 99 }]);
      expect(out[2].value).toBe(1);
    });

    it("ignora le voci inventate dal giocatore (la lista e' del master)", () => {
      const out = mergePlayerPrestige(masterPrestige(), [{ id: 99, name: "Corona", value: 7 }]);
      expect(out).toHaveLength(3);
      expect(out.find((e) => e.id === 99)).toBeUndefined();
    });

    it("il giocatore non puo' rinominare una voce", () => {
      const out = mergePlayerPrestige(masterPrestige(), [{ id: 1, name: "Pizzeria", value: 3 }]);
      expect(out[0].name).toBe("Flint");
    });

    it("e' immutabile: la lista del master non viene toccata", () => {
      const base = masterPrestige();
      mergePlayerPrestige(base, [{ id: 4, name: "Famiglia", value: 9 }]);
      expect(base[1].value).toBe(2);
    });

    it("giro completo: seed → il giocatore segna +1 → accept", () => {
      const master = masterPrestige();
      const alGiocatore = publicPrestige(master);
      const modificato = alGiocatore.map((e) => e.id === 4 ? { ...e, value: e.value + 1 } : e);
      const d = diffPrestige(master, modificato);
      expect(d).toEqual([{ id: 4, name: "Clero", before: 2, after: 3 }]);
      const out = mergePlayerPrestige(master, modificato);
      expect(out[1].value).toBe(3);
      expect(out[1].name).toBe("Clero");
      expect(out[2].hidden).toBe(true);
    });
  });
});

describe("badge 📬 e prestigio", () => {
  const master = () => ({
    ...baseChar(),
    prestige: [
      { id: 1, name: "Flint", value: 3 },
      { id: 4, name: "Clero", value: 2, alias: "Famiglia" },
      { id: 5, name: "Obscurati", value: 1, hidden: true },
    ],
  });
  const dalGiocatore = (v) => ({
    ...baseChar(),
    prestige: [{ id: 1, name: "Flint", value: 3 }, { id: 4, name: "Famiglia", value: v }],
  });

  it("una modifica al SOLO prestigio accende il badge", () => {
    expect(hasPendingAdmin(master(), dalGiocatore(5), null)).toBe(true);
  });

  it("il prestigio invariato non accende il badge", () => {
    expect(hasPendingAdmin(master(), dalGiocatore(2), null)).toBe(false);
  });

  it("dopo un 'Ignora', una nuova modifica al prestigio lo fa ricomparire", () => {
    const primo = dalGiocatore(5);
    const seen = adminHash(primo);                    // il master ignora
    expect(hasPendingAdmin(master(), primo, seen)).toBe(false);
    expect(hasPendingAdmin(master(), dalGiocatore(6), seen)).toBe(true);
  });

  it("l'alias non conta come modifica (i nomi sono del master)", () => {
    // La riga del giocatore porta «Famiglia», il master ha «Clero»: stesso valore.
    expect(hasPendingAdmin(master(), dalGiocatore(2), null)).toBe(false);
  });
});
