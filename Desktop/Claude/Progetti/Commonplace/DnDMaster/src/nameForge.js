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
