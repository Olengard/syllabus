// Coerenza tematica del generatore di incontri: tipi di mostro canonici
// (italiano inline + inglese 5e.tools), affinità "chi sta con chi" e
// filtri per terreno. Funzioni pure, testate in encounter.test.js.

// Tipo di mostro → chiave canonica (funziona con "Umanoide (goblinoide)",
// "humanoid (goblinoid)", "Non morto", "undead", ...).
const TYPE_PATTERNS = [
  [/undead|non morto/, "undead"],
  [/humanoid|umanoide/, "humanoid"],
  [/beast|bestia/, "beast"],
  [/fiend|demon|devil|demonio|diavolo|immondo/, "fiend"],
  [/dragon|drago/, "dragon"],
  [/giant|gigante/, "giant"],
  [/aberration|aberrazione/, "aberration"],
  [/construct|costrutto/, "construct"],
  [/elemental|elementale/, "elemental"],
  [/fey|fata|folletto/, "fey"],
  [/plant|pianta/, "plant"],
  [/ooze|melma/, "ooze"],
  [/monstrosity|mostruosit/, "monstrosity"],
  [/celestial|celestiale/, "celestial"],
];

export function canonMonsterType(t) {
  const s = (t || "").toLowerCase();
  for (const [re, key] of TYPE_PATTERNS) if (re.test(s)) return key;
  return "other";
}

// Chi può comparire nello stesso incontro (decide il tipo dell'àncora):
// branchi omogenei, oppure accoppiate classiche capo+gregari.
export const TYPE_AFFINITY = {
  humanoid:    ["humanoid", "beast"],            // banditi coi mastini, goblin coi lupi
  beast:       ["beast"],                        // branchi
  undead:      ["undead"],                       // orde necrotiche
  fiend:       ["fiend", "humanoid"],            // demoni + cultisti
  dragon:      ["dragon", "humanoid"],           // drago + servitori (coboldi...)
  giant:       ["giant", "humanoid"],            // giganti + tribù
  aberration:  ["aberration", "humanoid"],       // aberrazione + schiavi mentali
  construct:   ["construct", "humanoid"],        // costrutti + guardiani/creatore
  elemental:   ["elemental"],
  fey:         ["fey", "beast", "plant"],        // corte fatata del bosco
  plant:       ["plant", "beast"],
  ooze:        ["ooze"],
  monstrosity: ["monstrosity", "beast"],
  celestial:   ["celestial"],
  other:       ["other"],
};

// true se `otherType` può affiancare un'àncora di tipo `anchorType`.
export function coherentWith(anchorType, otherType) {
  const a = canonMonsterType(anchorType);
  return (TYPE_AFFINITY[a] || [a]).includes(canonMonsterType(otherType));
}

// Terreno → tipi canonici ammessi (null = tutti). Copre anche i tipi
// prima assenti (mostruosità, melme) e i mostri importati (tipi EN).
export const TERRAIN_CANON = {
  "Dungeon":        ["undead", "construct", "aberration", "humanoid", "fiend", "ooze", "monstrosity"],
  "Foresta":        ["beast", "fey", "humanoid", "plant", "dragon", "monstrosity"],
  "Pianura":        ["beast", "humanoid", "giant", "dragon"],
  "Montagna":       ["giant", "dragon", "humanoid", "beast", "elemental", "monstrosity"],
  "Palude":         ["undead", "beast", "humanoid", "fiend", "plant", "ooze", "monstrosity"],
  "Grotta":         ["beast", "aberration", "undead", "humanoid", "ooze", "monstrosity"],
  "Mare / Costa":   ["beast", "humanoid", "elemental", "monstrosity"],
  "Città":          ["humanoid", "construct", "undead"],
  "Sottosuolo":     ["aberration", "undead", "humanoid", "construct", "ooze", "monstrosity", "elemental"],
  "Deserto":        ["beast", "undead", "humanoid", "elemental", "dragon", "monstrosity"],
  "Tundra":         ["beast", "giant", "undead", "humanoid", "dragon"],
  "Piano Infernale":["fiend", "undead", "elemental"],
  "Qualsiasi":      null,
};

export function terrainAllows(terrain, monsterType) {
  const allowed = TERRAIN_CANON[terrain];
  if (!allowed) return true;
  return allowed.includes(canonMonsterType(monsterType));
}
