// ─── Generatore di nomi fantasy procedurale ──────────────────────────────────
// Tabelle fonetiche per razza: combinazione prefisso (+ infisso) + suffisso,
// calibrate sullo stile di ogni razza. Genera nomi fantasy "su stile" infiniti,
// indipendenti dalle liste curate (che restano la minoranza "italianità").
//
// Versione campione: 4 razze chiave per validare la qualità prima di estendere.

const TABLES = {
  // ── Umano: anglo-germanico con forte vena nordica ──
  "Umano": {
    m: {
      pre: ["Al","Bran","Cael","Ed","Gar","Hald","Rod","Wil","Theo","Bern","Os","Rein","God","Ald","Cor","Bjor","Sig","Rag","Ulf","Gunn","Hak","Sven","Erik","Ivar","Leif","Tor","Knut","Harald"],
      suf: ["ric","mund","win","dan","mar","gar","ward","bert","red","ulf","wald","helm","nar","stein","valdr","geir","björn"],
    },
    f: {
      pre: ["Ade","Bri","Cae","Eli","Gwen","Isa","Rowe","Eda","Mira","Rosa","Alda","Brun","Ger","Ele","Ast","Sig","Frey","Ing","Hel","Sol","Run","Yrs","Thyr","Gunn"],
      suf: ["lyn","wen","beth","ra","na","wyn","dis","run","linde","hild","mae","wina","rid","veig","unn","borg","gerd","a","ja"],
    },
  },
  // ── Elfo Alto: fluido, vocalico, aulico ──
  "Elfo Alto": {
    m: {
      pre: ["Ae","Cael","Thal","El","Fae","Lor","Aer","Sil","Vand","Gal","Ithi","Ner","Aly","Mael","Cor","Faen","Erev"],
      mid: ["la","ri","le","na","da","si","va","ne"],
      suf: ["ion","ar","las","dor","ith","uil","ael","ren","oth","ian","eth","amar","ond","aith"],
    },
    f: {
      pre: ["Ae","Cael","Thal","El","Fae","Lor","Aer","Sil","Gal","Ithi","Ner","Aly","Mael","Lia","Shava","Yael"],
      mid: ["la","ri","le","na","ly","va","ne","se"],
      suf: ["wen","iel","ynn","eth","ara","wë","lia","riel","anna","ithil","ae","wyn","sia"],
    },
  },
  // ── Elfo del Bosco: silvano, più terragno e selvatico ──
  "Elfo del Bosco": {
    m: {
      pre: ["Syl","Fae","Cor","Lael","Ara","Tani","Wyn","Lir","Ren","Thal","Eryn","Aval","Cael","Bryn"],
      mid: ["da","ri","la","ne","va"],
      suf: ["dir","ael","las","wyn","thir","loth","ven","ndil","ar","ras"],
    },
    f: {
      pre: ["Syl","Fae","Eily","Ara","Tani","Wyn","Lir","Mira","Eryn","Aval","Cael","Lael","Nim"],
      mid: ["la","ri","we","na","ly"],
      suf: ["wen","riel","wyn","thra","ndra","loth","ara","ia","eth"],
    },
  },
  // ── Halfling: caloroso, campagnolo, un po' comico ──
  "Halfling": {
    m: {
      pre: ["Mil","Ros","Per","Mer","Tob","Pip","Wil","Sam","Drog","Mar","Hob","And","Bunce","Fink","Dod"],
      suf: ["o","by","kin","wise","et","ric","ello","ous","ander","ow"],
    },
    f: {
      pre: ["Ros","Dais","Lil","Mar","Pip","Til","Bell","Poppy","Hild","Wil","Pru","Cora","Nib"],
      suf: ["a","by","ina","et","wyn","ella","y","ow"],
    },
  },
  // ── Nano: norreno, robusto ──
  "Nano": {
    m: {
      pre: ["Thror","Dur","Bof","Khaz","Grim","Bal","Thor","Dwal","Nar","Gim","Brok","Dain","Fund","Kraz","Mor","Bram","Hjal"],
      suf: ["in","ur","ain","gar","li","rim","din","nar","grim","bek","dur","mund","gon","stein"],
    },
    f: {
      pre: ["Thror","Dur","Bof","Khaz","Grim","Bal","Thor","Dwal","Nar","Gim","Brok","Dain","Fund","Hel","Vist"],
      suf: ["a","hild","dis","unn","ra","bera","run","gunn","da","wyn","lin","na","grith"],
    },
  },
  // ── Nano delle Montagne: ancora più duro e norreno ──
  "Nano delle Montagne": {
    m: {
      pre: ["Thor","Dur","Bal","Grun","Kaz","Bryn","Dval","Hrun","Sten","Bof","Throm","Karr","Gund","Drun"],
      suf: ["in","gar","grim","valdr","stein","din","ur","mund","bek","rik","dran","gon"],
    },
    f: {
      pre: ["Thor","Dur","Bal","Grun","Bryn","Dval","Hrun","Sten","Throm","Gund","Hel","Frid","Sif"],
      suf: ["a","hild","dis","unn","run","gunn","rid","grith","veig","na","borg"],
    },
  },
  // ── Tiefling: infernale, esotico ──
  "Tiefling": {
    m: {
      pre: ["Ka","Mor","Zar","Bel","Akm","Dami","Meph","Ron","Vex","Nyx","Zeph","Kor","Mal","Sere","Tha","Iss"],
      suf: ["os","uk","ax","ir","oth","aar","ux","en","akar","ion","esh","ous"],
    },
    f: {
      pre: ["Ka","Mor","Zar","Bel","Akm","Dami","Meph","Ron","Vex","Nyx","Lil","Kor","Mal","Sere","Aza","Rie"],
      suf: ["aia","eth","is","en","ara","ael","ia","une","esh","ixa","yra"],
    },
  },
  // ── Mezzorco: gutturale, aspro ──
  "Mezzorco": {
    m: {
      pre: ["Grok","Thok","Ush","Mog","Karg","Rok","Dur","Gor","Brak","Zug","Murg","Hrak","Krul","Gnar"],
      suf: ["ash","gar","nak","tuk","mog","rok","grim","ul","dush","mak"],
    },
    f: {
      pre: ["Gro","Tho","Ush","Mog","Karg","Rok","Gor","Brak","Zug","Murg","Hrak","Yev","Shum"],
      suf: ["sha","ga","na","ka","yara","gana","ush","ra"],
    },
  },
  // ── Mezz'Elfo: melodico ma accessibile (umano + elfico) ──
  "Mezz'Elfo": {
    m: {
      pre: ["Aer","Cael","Ela","Ari","Ren","Theo","Rho","Fael","Ada","Lyr","Bran","Sil"],
      suf: ["ion","wen","ric","iel","mar","dan","eth","lyn","dor","win"],
    },
    f: {
      pre: ["Aer","Cael","Ela","Ari","Sere","Mira","Lia","Rho","Fael","Ada","Lyr","Eli"],
      suf: ["wen","iel","ara","lyn","eth","ria","na","wyn","sa","mae"],
    },
  },
  // ── Dragonide: draconico, da clan ──
  "Dragonide": {
    m: {
      pre: ["Baha","Rhog","Kriv","Arja","Bala","Sora","Tora","Verth","Khel","Drak","Med","Pand","Ghesh","Nadar"],
      suf: ["ash","rix","kan","mash","thar","var","esh","akk","ax","mir","sar","inn"],
    },
    f: {
      pre: ["Akra","Bira","Daar","Farn","Harr","Kava","Mish","Nala","Sora","Thava","Uadj","Raed"],
      suf: ["a","ra","xa","kan","esh","ira","yth","ann","ava","ixi"],
    },
  },
  // ── Gnomo: bizzarro, da rigattiere/inventore ──
  "Gnomo": {
    m: {
      pre: ["Fizz","Bim","Glim","Nim","Wobb","Zook","Dabb","Jeb","Quill","Bod","Fim","Roon","Tink","Zan"],
      suf: ["wocket","ble","in","ick","led","top","bit","gle","der","kins","nock"],
    },
    f: {
      pre: ["Bim","Nim","Wobb","Dabb","Quill","Loop","Pock","Tana","Elly","Fim","Roon","Zilla","Breena"],
      suf: ["a","ette","ina","bell","ick","gle","ie","wyn","tine","la"],
    },
  },
  // ── Tabaxi: felino, esotico e melodico ──
  "Tabaxi": {
    m: {
      pre: ["Cha","Nei","Tsa","Kee","Mre","Sira","Oba","Pao","Jin","Kit","Raa","Mee","Sha"],
      mid: ["te","li","na","sa"],
      suf: ["tli","na","ra","sha","wa","li","ka","ssi","ro","mi"],
    },
    f: {
      pre: ["Cha","Nei","Tsa","Kee","Mre","Sira","Oba","Pao","Mee","Sha","Lia","Nyx"],
      mid: ["te","li","na","sa"],
      suf: ["tli","na","ra","sha","wa","li","mi","ssa","ya","ki"],
    },
  },
  // ── Genasi: elementale, planare, vagamente orientale ──
  "Genasi": {
    m: {
      pre: ["Zah","Aql","Emb","Cind","Vael","Pyr","Aer","Sol","Khal","Zef","Bahr","Ign"],
      suf: ["ir","ah","een","ix","oth","an","el","ust","ar","im"],
    },
    f: {
      pre: ["Zah","Aql","Emb","Cind","Vael","Pyr","Sol","Mira","Khal","Zef","Nuru","Sael"],
      suf: ["ah","ara","een","ya","ix","ira","elle","una","is","eth"],
    },
  },
  // ── Aarakocra: aviano, suoni acuti ──
  "Aarakocra": {
    m: {
      pre: ["Aer","Kree","Skri","Aki","Quor","Ssa","Iri","Avi","Kil","Tuk","Ree","Cra"],
      suf: ["ka","ree","ish","aa","kik","ek","ira","aw","ki","ek"],
    },
    f: {
      pre: ["Aer","Kree","Skri","Aki","Quor","Iri","Avi","Kil","Sia","Ree","Lyr"],
      suf: ["ka","ree","ish","aa","ira","ek","wee","ya","ki","ee"],
    },
  },
  // ── Kenku: onomatopeico, versi imitati ──
  "Kenku": {
    m: {
      pre: ["Kaa","Cree","Tik","Shri","Clik","Raak","Skree","Crak","Pip","Tok"],
      suf: ["aw","ek","ik","ree","ack","ix","oo","er","aa"],
    },
    f: {
      pre: ["Kaa","Cree","Tik","Shri","Clik","Raak","Skree","Crak","Pip","Tok"],
      suf: ["aw","ek","ik","ree","ack","ix","oo","er","aa"],
    },
  },
  // ── Tortle: terragno, semplice e saggio ──
  "Tortle": {
    m: {
      pre: ["Krra","Quit","Dama","Bask","Gor","Sho","Mog","Tuk","Lum","Wur","Bol","Gron"],
      suf: ["dok","su","xa","ba","go","ta","mok","ka","ron","un"],
    },
    f: {
      pre: ["Krra","Quit","Dama","Bask","Sho","Lum","Wur","Bol","Una","Mee","Sel"],
      suf: ["su","xa","ba","ta","ka","na","ra","mi","wa","la"],
    },
  },
};

export function hasFantasy(race) {
  return !!TABLES[race];
}

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const VOWELS = "aeiouyàèéìòùäöüÿë";
const isVowel = (c) => VOWELS.includes((c || "").toLowerCase());

function buildName(t) {
  let name = pick(t.pre);
  const suf = pick(t.suf);
  // Infisso solo se il suffisso inizia per consonante → evita pile di vocali
  if (t.mid && !isVowel(suf[0]) && Math.random() < 0.5) name += pick(t.mid);
  name += suf;
  // Collassa 3+ vocali consecutive in 2, e tripli caratteri uguali in 2
  name = name.replace(/[aeiouyàèéìòùäöüÿë]{3,}/gi, (m) => m.slice(0, 2));
  name = name.replace(/(.)\1\1+/gi, "$1$1");
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// ─── Cognomi & casate ─────────────────────────────────────────────────────────
// Due stili: "ruvido" (verbo+nome → Tagliagole) per razze marziali, "lirico"
// (nome+elemento → Cantodargento) per elfi/gnomi/esotici. Senza problemi di
// accordo grammaticale.
const SURNAME = {
  gritty: {
    pre: ["Taglia","Ammazza","Spacca","Ruba","Caccia","Doma","Scaccia","Brucia","Frantuma","Sfida","Morde","Schiaccia","Stritola","Sventra","Spezza","Affonda"],
    suf: ["gole","draghi","ossa","cuori","ombre","lupi","pietre","fiamme","corvi","teschi","catene","scudi","troll","orchi","mura","venti"],
  },
  lyric: {
    pre: ["Canto","Chioma","Occhi","Vello","Manto","Velo","Soffio","Passo","Voce","Sguardo","Ala","Cuore","Filo","Sogno"],
    suf: ["dargento","doro","diluna","dalba","distelle","disole","dombra","divento","dirugiada","dicristallo","dibrina","difiamma","diluce","dautunno"],
  },
};
// Stile dell'epiteto descrittivo (quando si usa quel registro)
const GRITTY_RACES = new Set(["Umano","Nano","Nano delle Montagne","Mezzorco","Halfling","Tortle","Dragonide","Kenku","Aarakocra"]);
// Razze in cui il cognome tende all'epiteto descrittivo (clan/soprannome) anziché
// a un cognome "proprio" fonetico.
const DESCRIPTIVE_LEAN = new Set(["Nano","Nano delle Montagne","Mezzorco","Halfling","Tortle","Kenku"]);
// Razze "nobili" da cui derivare casate dal suono proprio
const NOBLE_RACES = ["Umano","Elfo Alto","Tiefling","Mezz'Elfo","Elfo del Bosco"];
// Casate curate dal suono proprio (no compound descrittivi)
const HOUSE_NAMES = ["Valdoria","Mornaheim","Aldebrand","Grimmaldi","Valenholt","Morvenna","Caldoria","Brennar","Veladin","Soltane","Aldovrandi","Castelmare","Lindenwald","Mornhal","Corvano","Belmonte","Falconieri","Drachenfeld","Saltieri","Veraldi"];

function makeSurname(style) {
  const t = SURNAME[style];
  return cap(pick(t.pre)) + pick(t.suf);
}

// Cognome "proprio" generato dalla fonetica della razza (es. "Hakwald", "Caelaril").
function phoneticSurname(race) {
  const table = TABLES[race] || TABLES["Umano"];
  const t = table[Math.random() < 0.5 ? "m" : "f"] || table.m || table.f;
  return buildName(t);
}

// Cognome adatto alla razza: per lo più "proprio" (fonetico), a volte descrittivo.
// Le razze marziali/clan tendono di più all'epiteto descrittivo.
export function generateSurname(race) {
  const descrLean = DESCRIPTIVE_LEAN.has(race) ? 0.55 : 0.25;
  if (Math.random() < descrLean) return makeSurname(GRITTY_RACES.has(race) ? "gritty" : "lyric");
  return phoneticSurname(race);
}

// Lista mista per la categoria: cognomi propri + qualche epiteto descrittivo.
export function generateSurnamesMixed(count) {
  const races = Object.keys(TABLES);
  const out = new Set();
  let a = 0;
  while (out.size < count && a < count * 25) {
    a++;
    if (Math.random() < 0.55) out.add(phoneticSurname(pick(races)));
    else out.add(makeSurname(Math.random() < 0.55 ? "gritty" : "lyric"));
  }
  return [...out];
}

// Casate nobiliari: per lo più cognomi propri ("Casa Morvayn", "Casa Valdoria"),
// di rado un epiteto descrittivo.
export function generateHouses(count) {
  const out = new Set();
  let a = 0;
  while (out.size < count && a < count * 25) {
    a++;
    const r = Math.random();
    const base = r < 0.45 ? pick(HOUSE_NAMES)
               : r < 0.85 ? phoneticSurname(pick(NOBLE_RACES))
               : makeSurname("lyric");
    out.add(Math.random() < 0.7 ? `Casa ${base}` : `i ${base}`);
  }
  return [...out];
}

// ─── Categorie curate extra (navi, cibi & bevande) ────────────────────────────
export const EXTRA_CATEGORIES = {
  navi: {
    eroico: ["Furia di Tempesta","Falco del Nord","Lama del Mare","Vendetta di Ferro","Aurora Ardente","Corona d'Onda","Sentinella d'Acciaio","Artiglio del Drago","Tuono d'Argento","Stella del Mattino","Cuore di Quercia","Lancia delle Maree"],
    neutro: ["Onda Vagante","Vento del Sud","Gabbiano Grigio","Rotta Lunga","Marea Calma","Stella Polare","Vela Bianca","Corrente Fredda","Pesce Volante","Albatro","Brezza del Largo","Scogliera"],
    ironico: ["Sirena Ubriaca","Secchio Galleggiante","Granchio Pigro","Vecchia Bagnarola","Aringa Salata","Salpa o Affonda","Naufragio Annunciato","Polena Storta","Barile Bucato","Gabbiano Strabico","Sgombro Felice","Tappo di Sughero"],
  },
  cibi: {
    piatto: {
      eroico: ["Arrosto del Cacciatore","Cinghiale alle Brace","Costata del Drago","Stufato del Re","Selvaggina Reale","Spiedo del Campione","Brasato di Montagna","Zuppa del Guerriero"],
      neutro: ["Zuppa d'Orzo","Pane Nero","Stufato di Coniglio","Formaggio Stagionato","Torta di Carne","Polenta e Funghi","Pesce Affumicato","Pasticcio di Verdure"],
      ironico: ["Misterioso Stufato","Sorpresa del Cuoco","Pasticcio del Lunedì","Spiedino Incerto","Avanzi Reali","Zuppa di Ieri","Carne Coraggiosa","Tocco del Guarito"],
    },
    bevanda: {
      eroico: ["Idromele del Tuono","Rossa di Barbacorta","Birra del Campione","Sidro di Fuoco","Nettare degli Eroi","Distillato del Drago","Riserva del Re","Brindisi di Vittoria"],
      neutro: ["Birra Chiara","Vino della Casa","Sidro di Mele","Acquavite","Tè alle Erbe","Birra Scura","Vino Speziato","Latte di Capra"],
      ironico: ["Piscio di Drago","Rovina del Nano","Acquaragia di Locanda","Sbronza Garantita","Veleno del Mugnaio","Lacrime di Goblin","Brodaglia dell'Oste","Coraggio Liquido"],
    },
  },
};

// Genera fino a `count` nomi fantasy unici per razza+genere.
export function generateFantasyNames(race, gender, count) {
  const table = TABLES[race];
  if (!table) return [];
  const t = table[gender] || table.m || table.f;
  if (!t) return [];
  const out = new Set();
  let attempts = 0;
  while (out.size < count && attempts < count * 30) {
    attempts++;
    const n = buildName(t);
    if (n.length >= 3 && n.length <= 11) out.add(n);
  }
  return [...out];
}
