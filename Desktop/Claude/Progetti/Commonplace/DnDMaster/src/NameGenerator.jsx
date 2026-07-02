import React from "react";
import { NAMES_DB } from "./data/names.js";
import { userKey, safeLsSet } from "./storage.js";
import { hasFantasy, generateFantasyNames, generateSurname, generateSurnamesMixed, generateHouses, EXTRA_CATEGORIES } from "./nameForge.js";

// ─── Name Generator ───────────────────────────────────────────────────────────
export default function NameGenerator() {
  const MOOD_LABELS = ["Eroico","Neutro","Ironico"];
  const MOOD_KEYS   = ["eroico","neutro","ironico"];

  // Categories
  const CATS = [
    { key:"races",    label:"🧬 Personaggi per Razza" },
    { key:"locali",   label:"🏠 Locali & Negozi" },
    { key:"luoghi",   label:"🗺 Luoghi" },
    { key:"epiteti",  label:"⚔ Epiteti & Soprannomi" },
    { key:"cognomi",  label:"🏰 Cognomi & Casate" },
    { key:"oggetti",  label:"✨ Oggetti Magici" },
    { key:"divinita", label:"🌟 Divinità & Culti" },
    { key:"gilde",    label:"🛡 Gilde & Organizzazioni" },
    { key:"navi",     label:"⛵ Navi" },
    { key:"cibi",     label:"🍺 Cibi & Bevande" },
  ];

  const [cat, setCat]         = React.useState("races");
  const [sub, setSub]         = React.useState(null);
  const [gender, setGender]   = React.useState("m");
  const [mood, setMood]       = React.useState(1); // 0=Eroico 1=Neutro 2=Ironico
  const [italianPct, setItalianPct] = React.useState(20); // % di nomi "italiani" nel mix
  const [fullName, setFullName] = React.useState(false);  // razze: aggiunge il cognome
  const [results, setResults] = React.useState([]);

  // Catalogo curato = NAMES_DB inline + categorie extra (navi, cibi)
  const NAMEDATA = React.useMemo(() => ({ ...NAMES_DB, ...EXTRA_CATEGORIES }), []);
  const [saved, setSaved]     = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_saved_names")) || "[]"); } catch { return []; }
  });

  // Persist saved names
  React.useEffect(() => {
    try { safeLsSet(userKey("dnd_saved_names"), JSON.stringify(saved)); } catch {}
  }, [saved]);

  // Mescola in modo uniforme (Fisher-Yates)
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Conteggio reale dei nomi curati (per l'header)
  const totalCurated = React.useMemo(() => {
    let n = 0;
    const walk = (o) => { for (const v of Object.values(o)) { if (Array.isArray(v)) n += v.length; else if (v && typeof v === "object") walk(v); } };
    walk(NAMEDATA);
    return n;
  }, [NAMEDATA]);

  // Sub-options per category
  const subOptions = React.useMemo(() => {
    const data = NAMEDATA[cat];
    if (!data) return [];
    return Object.keys(data);
  }, [cat, NAMEDATA]);

  // Auto-select first sub when category changes
  React.useEffect(() => {
    if (subOptions.length > 0) setSub(subOptions[0]);
  }, [cat, subOptions.join(",")]);

  // Check if this category has gender
  const hasGender = React.useMemo(() => {
    if (!sub) return false;
    const entry = NAMEDATA[cat]?.[sub];
    if (!entry) return false;
    return "m" in entry || "f" in entry;
  }, [cat, sub]);

  // Check if has neutral gender (n)
  const hasNeutral = React.useMemo(() => {
    if (!sub) return false;
    const entry = NAMEDATA[cat]?.[sub];
    return entry && "n" in entry;
  }, [cat, sub]);

  // La razza selezionata ha il generatore fantasy procedurale?
  const fantasyOn = cat === "races" && !!sub && hasFantasy(sub);

  const generate = () => {
    const moodKey = MOOD_KEYS[mood];
    const moodLabel = MOOD_LABELS[mood];
    const subLabel = sub || cat;

    let items = []; // { name, sub }

    // Cognomi & casate: procedurale, niente liste curate
    if (cat === "cognomi") {
      const list = shuffle([
        ...generateSurnamesMixed(7).map(name => ({ name, sub: "cognome" })),
        ...generateHouses(3).map(name => ({ name, sub: "casata" })),
      ]);
      setResults(list.map((it, i) => ({ id: `${Date.now()}-${i}`, name: it.name, sub: it.sub })));
      return;
    }

    const catData = NAMEDATA[cat];
    if (!catData) return;

    if (cat === "races") {
      const raceData = catData[sub];
      if (!raceData) return;
      const gKey = hasNeutral ? "n" : gender;
      const gData = raceData[gKey];
      const italianPool = gData ? (gData[moodKey] || gData["neutro"] || Object.values(gData)[0] || []) : [];
      const gLabel = hasNeutral ? "neutro" : (gender === "m" ? "maschile" : "femminile");

      if (fantasyOn) {
        // Mix fantasy (maggioranza) + italiano (minoranza) secondo il dosaggio
        const nItalian = Math.round(10 * italianPct / 100);
        const nFantasy = 10 - nItalian;
        const fGender = hasNeutral ? (Math.random() < 0.5 ? "m" : "f") : gender;
        const fantasyNames = generateFantasyNames(sub, fGender, nFantasy);
        const italianNames = shuffle(italianPool).slice(0, Math.min(nItalian, italianPool.length));
        items = shuffle([
          ...fantasyNames.map(name => ({ name, sub: `${subLabel} · ${gLabel} · fantasy` })),
          ...italianNames.map(name => ({ name, sub: `${subLabel} · ${gLabel} · italiano` })),
        ]);
      } else {
        items = shuffle(italianPool).slice(0, 10).map(name => ({ name, sub: `${subLabel} · ${gLabel} · ${moodLabel}` }));
      }

      // Nome completo: aggiunge un cognome adatto alla razza
      if (fullName) items = items.map(it => ({ ...it, name: `${it.name} ${generateSurname(sub)}` }));
    } else if (cat === "epiteti" || cat === "oggetti" || cat === "divinita" || cat === "gilde" || cat === "navi") {
      const pool = catData[moodKey] || catData["neutro"] || [];
      items = shuffle(pool).slice(0, 10).map(name => ({ name, sub: `${subLabel} · ${moodLabel}` }));
    } else {
      const subData = catData[sub];
      if (!subData) return;
      const pool = subData[moodKey] || subData["neutro"] || [];
      items = shuffle(pool).slice(0, 10).map(name => ({ name, sub: `${subLabel} · ${moodLabel}` }));
    }

    if (!items.length) return;

    setResults(items.map((it, i) => ({ id: `${Date.now()}-${i}`, name: it.name, sub: it.sub })));
  };

  const toggleSave = (item) => {
    setSaved(s => s.find(x => x.name === item.name)
      ? s.filter(x => x.name !== item.name)
      : [...s, item]);
  };

  const isSaved = (name) => saved.some(x => x.name === name);

  const catLabel = CATS.find(c => c.key === cat)?.label || cat;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div className="section-header" style={{marginBottom:0}}>
        <span>GENERATORE DI NOMI</span>
        <span style={{fontSize:"0.65rem",color:"var(--text3)"}}>
          {saved.length > 0 ? `${saved.length} nomi salvati` : (fantasyOn ? "∞ generatore fantasy" : `${totalCurated} nomi`)}
        </span>
      </div>

      <div className="namegen-layout" style={{flex:1}}>
        {/* ── LEFT: Controls ── */}
        <div className="namegen-controls">

          {/* Category */}
          <div className="namegen-section">
            <div className="namegen-section-title">CATEGORIA</div>
            {CATS.map(c => (
              <button key={c.key}
                className={`namegen-cat-btn ${cat === c.key ? "active" : ""}`}
                onClick={() => setCat(c.key)}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Sub-category */}
          {subOptions.length > 1 && (
            <div className="namegen-section">
              <div className="namegen-section-title">
                {cat === "races" ? "RAZZA" : "TIPO"}
              </div>
              <div>
                {subOptions.map(s => (
                  <button key={s}
                    className={`namegen-sub-btn ${sub === s ? "active" : ""}`}
                    onClick={() => setSub(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gender (only for races) */}
          {cat === "races" && !hasNeutral && (
            <div className="namegen-section">
              <div className="namegen-section-title">GENERE</div>
              <div className="namegen-gender-row">
                {[["m","♂ Maschile"],["f","♀ Femminile"]].map(([g,lbl]) => (
                  <button key={g}
                    className={`namegen-gender-btn ${gender === g ? "active" : ""}`}
                    onClick={() => setGender(g)}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Style dosing (solo razze col generatore fantasy) */}
          {fantasyOn && (
            <div className="namegen-section">
              <div className="namegen-section-title">STILE</div>
              <div className="namegen-mood-wrap">
                <div className="namegen-mood-labels">
                  <span>✨ Fantasy</span>
                  <span>🍝 Italiano</span>
                </div>
                <input type="range" min={0} max={100} step={10} value={italianPct}
                  className="namegen-mood-slider"
                  onChange={e => setItalianPct(+e.target.value)} />
                <div className="namegen-mood-current">{100 - italianPct}% fantasy · {italianPct}% italiano</div>
              </div>
            </div>
          )}

          {/* Nome completo (con cognome) — solo razze */}
          {cat === "races" && (
            <div className="namegen-section">
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"0.8rem",color:"var(--text2)"}}>
                <input type="checkbox" checked={fullName} onChange={e => setFullName(e.target.checked)} />
                Nome completo (con cognome)
              </label>
            </div>
          )}

          {/* Mood slider */}
          <div className="namegen-section">
            <div className="namegen-section-title">TONO</div>
            <div className="namegen-mood-wrap">
              <div className="namegen-mood-labels">
                <span>⚔ Eroico</span>
                <span>😏 Ironico</span>
              </div>
              <input type="range" min={0} max={2} value={mood}
                className="namegen-mood-slider"
                onChange={e => setMood(+e.target.value)} />
              <div className="namegen-mood-current">{MOOD_LABELS[mood]}</div>
            </div>
          </div>

          {/* Generate button */}
          <button className="namegen-generate-btn" onClick={generate}>
            ✦ Genera 10 Nomi
          </button>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="namegen-results">
          {results.length === 0 && saved.length === 0 && (
            <div className="namegen-empty">
              Seleziona una categoria e premi<br />
              <strong>✦ Genera 10 Nomi</strong>
            </div>
          )}

          {results.length > 0 && (<>
            <div className="namegen-results-header">
              <span className="namegen-results-title">RISULTATI · {catLabel}</span>
              <button className="btn btn-sm" onClick={generate} title="Rigenera">↻ Rigenera</button>
            </div>
            <div className="namegen-names-grid">
              {results.map(item => (
                <div key={item.id}
                  className={`namegen-name-card ${isSaved(item.name) ? "starred" : ""}`}
                  onClick={() => toggleSave(item)}>
                  <div>
                    <div className="namegen-name-text">{item.name}</div>
                    <div className="namegen-name-sub">{item.sub}</div>
                  </div>
                  <button className={`namegen-star-btn ${isSaved(item.name) ? "on" : ""}`}
                    onClick={e => { e.stopPropagation(); toggleSave(item); }}>
                    {isSaved(item.name) ? "★" : "☆"}
                  </button>
                </div>
              ))}
            </div>
          </>)}

          {/* Saved names */}
          {saved.length > 0 && (
            <div className="namegen-saved-section">
              <div className="namegen-saved-title">NOMI SALVATI ({saved.length})</div>
              <div>
                {saved.map((item, i) => (
                  <span key={i} className="namegen-saved-item">
                    {item.name}
                    <button className="namegen-saved-remove"
                      onClick={() => setSaved(s => s.filter(x => x.name !== item.name))}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <button className="btn btn-sm btn-danger" style={{marginTop:10}}
                onClick={() => { if(window.confirm ? window.confirm("Cancellare tutti i nomi salvati?") : true) setSaved([]); }}>
                Cancella tutti
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
