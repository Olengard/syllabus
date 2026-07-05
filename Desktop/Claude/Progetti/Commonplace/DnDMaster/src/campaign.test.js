import { describe, it, expect } from "vitest";
import { stripWiki, parseFrontmatter, parseWikiPage, mergeCampaignEntries, fieldLabel, IMPORT_TIPI } from "./campaign.js";

const GRAPPA = `---
tipo: png
nome: Alexander Grappa
alias: ["The Mindmaker"]
razza: umano
ruolo: alleato
affiliazione: ["ex [[Obscurati]]", "ex [[Colossus Cell]]"]
status: vivo (nel corpo di Leone Quital dall'Avv. 7)
player_safe: false
livello_spoiler: alto
tags: [png, obscurati, traditore]
---

# Alexander Grappa

> **"The Mindmaker"**: incantatore riluttante, uno dei tre creatori del colosso [[Borne]]. Finì per **tradire la cospirazione**.

## Cronologia delle apparizioni
- **[[05 - Cauldron-Born|Avv. 5]]** — guida il party nel [[The Bleak Gate]]; **perisce**.
- **[[07 - Schism|Avv. 7]]** — prende il corpo di Quital.

## Relazioni
- Co-creatore del colosso con [[Tinker Oddcog]].

## Fonti
- \`_fonti/ZG_Campaign_guide.pdf\` (pp. 9, 20-21)
`;

describe("stripWiki", () => {
  it("risolve i wikilink con e senza etichetta", () => {
    expect(stripWiki("[[Borne]] e [[05 - Cauldron-Born|Avv. 5]]")).toBe("Borne e Avv. 5");
  });
  it("rimuove grassetto e code inline", () => {
    expect(stripWiki("**forte** e `codice`")).toBe("forte e codice");
  });
  it("tollera input vuoti", () => {
    expect(stripWiki("")).toBe("");
    expect(stripWiki(null)).toBe("");
  });
});

describe("parseFrontmatter", () => {
  it("estrae scalari, liste quotate e liste semplici", () => {
    const fm = parseFrontmatter(GRAPPA);
    expect(fm.fields.tipo).toBe("png");
    expect(fm.fields.nome).toBe("Alexander Grappa");
    expect(fm.fields.alias).toEqual(["The Mindmaker"]);
    expect(fm.fields.tags).toEqual(["png", "obscurati", "traditore"]);
  });

  it("gestisce le virgole dentro [[...]] nelle liste", () => {
    const fm = parseFrontmatter('---\nmembri: ["[[A, il Grande]]", "[[B]]"]\n---\ncorpo');
    expect(fm.fields.membri).toEqual(["A, il Grande", "B"]);
  });

  it("ritorna null senza frontmatter", () => {
    expect(parseFrontmatter("# Solo un titolo\ntesto")).toBeNull();
    expect(parseFrontmatter("")).toBeNull();
  });

  it("tollera CRLF", () => {
    const fm = parseFrontmatter("---\r\ntipo: png\r\nnome: X\r\n---\r\ncorpo");
    expect(fm.fields.tipo).toBe("png");
  });
});

describe("parseWikiPage", () => {
  it("costruisce la voce completa da una scheda PNG", () => {
    const e = parseWikiPage("Alexander Grappa.md", GRAPPA);
    expect(e.kind).toBe("png");
    expect(e.nome).toBe("Alexander Grappa");
    expect(e.alias).toEqual(["The Mindmaker"]);
    expect(e.summary).toContain("incantatore riluttante");
    expect(e.summary).toContain("Borne");          // wikilink risolto
    expect(e.summary).not.toContain("[[");
    expect(e.fields.razza).toBe("umano");
    expect(e.fields.ruolo).toBe("alleato");
    expect(e.fields.affiliazione).toEqual(["ex Obscurati", "ex Colossus Cell"]);
  });

  it("esclude i campi di servizio dai dettagli", () => {
    const e = parseWikiPage("x.md", GRAPPA);
    expect(e.fields.player_safe).toBeUndefined();
    expect(e.fields.livello_spoiler).toBeUndefined();
    expect(e.fields.tipo).toBeUndefined();
  });

  it("estrae le sezioni saltando Fonti", () => {
    const e = parseWikiPage("x.md", GRAPPA);
    const titles = e.sections.map(s => s.title);
    expect(titles).toEqual(["Cronologia delle apparizioni", "Relazioni"]);
    expect(e.sections[0].text).toContain("• Avv. 5");
    expect(e.sections[0].text).not.toContain("[[");
  });

  it("mappa i tipi secondari sul gruppo campagna", () => {
    const page = "---\ntipo: oggetto\nnome: Lanterna\n---\n> Una lanterna.";
    expect(parseWikiPage("x.md", page).kind).toBe("campagna");
    expect(IMPORT_TIPI.mistero).toBe("campagna");
  });

  it("scarta pagine senza frontmatter o con tipo fuori whitelist", () => {
    expect(parseWikiPage("x.md", "# Titolo\ntesto")).toBeNull();
    expect(parseWikiPage("x.md", "---\ntipo: indice\nnome: X\n---\ncorpo")).toBeNull();
    expect(parseWikiPage("x.md", "---\ntipo: avventura\nnome: X\n---\ncorpo")).toBeNull();
  });

  it("usa il nome file se manca `nome`", () => {
    const e = parseWikiPage("Beshela.md", "---\ntipo: png\n---\n> Sirena.");
    expect(e.nome).toBe("Beshela");
  });
});

describe("mergeCampaignEntries", () => {
  const a = { kind: "png", nome: "Grappa", summary: "vecchia" };
  const b = { kind: "png", nome: "Grappa", summary: "nuova" };

  it("il nuovo import sostituisce la voce omonima", () => {
    const merged = mergeCampaignEntries([a], [b]);
    expect(merged).toHaveLength(1);
    expect(merged[0].summary).toBe("nuova");
  });

  it("stesso nome ma kind diverso: convivono", () => {
    const luogo = { kind: "luogo", nome: "Grappa", summary: "posto" };
    expect(mergeCampaignEntries([a], [luogo])).toHaveLength(2);
  });

  it("le voci manuali non vengono sovrascritte dall'import", () => {
    const manual = { ...a, manual: true };
    const merged = mergeCampaignEntries([manual], [b]);
    expect(merged[0].summary).toBe("vecchia");
    expect(merged[0].manual).toBe(true);
  });

  it("il confronto nome è case-insensitive", () => {
    const upper = { kind: "png", nome: "GRAPPA", summary: "nuova" };
    expect(mergeCampaignEntries([a], [upper])).toHaveLength(1);
  });
});

describe("fieldLabel", () => {
  it("prettifica le chiavi frontmatter", () => {
    expect(fieldLabel("ruolo")).toBe("Ruolo");
    expect(fieldLabel("parte_di")).toBe("Parte di");
    expect(fieldLabel("obiettivo_reale")).toBe("Obiettivo reale");
  });
});
