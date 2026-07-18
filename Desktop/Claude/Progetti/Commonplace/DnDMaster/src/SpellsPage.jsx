import React from "react";
import { K, loadJSON } from "./storage.js";
import { SPELLS_DB } from "./data/spells.js";
import { norm as searchNorm, deSlug } from "./GlobalSearch.jsx";
import { spellItAlias } from "./data/spellNamesIT.js";

// ─── SpellsPage ────────────────────────────────────────────────────────────────
export default function SpellsPage() {
  const [query, setQuery]           = React.useState("");
  const [levelFilter, setLevelFilter] = React.useState("");
  const [schoolFilter, setSchoolFilter] = React.useState("");
  const [classFilter, setClassFilter] = React.useState("");
  const [selected, setSelected]     = React.useState(null);

  // Carica gli incantesimi importati UNA volta (non a ogni render: con "Importa
  // tutti" sono ~525, ri-parsare ~1MB a ogni tasto bloccava la ricerca).
  const importedSpells = React.useMemo(() => {
    try { return loadJSON(K.importedSpells, []); } catch { return []; }
  }, []);
  // Unisce inline (IT) + importati (EN) deduplicando per slug: la versione
  // italiana inline vince. Evita chiavi React duplicate (es. "fireball" =
  // "Palla di Fuoco" inline + "Fireball" importato) che rompevano la lista.
  const allSpells = React.useMemo(() => {
    const map = new Map();
    for (const s of [...SPELLS_DB, ...importedSpells]) {
      const k = s.slug || s.name;
      if (!map.has(k)) map.set(k, s);
    }
    return [...map.values()];
  }, [importedSpells]);

  const schools = React.useMemo(() => [...new Set(allSpells.map(s => s.school).filter(Boolean))].sort(), [allSpells]);
  const classes = React.useMemo(() => [...new Set(allSpells.flatMap(s => s.classes ? s.classes.split(",").map(c=>c.trim()) : []).filter(Boolean))].sort(), [allSpells]);

  const results = React.useMemo(() => allSpells.filter(sp => {
    // Ponte EN↔IT: cerca anche nello slug inglese (es. "fireball" → Palla di Fuoco)
    if (query) {
      const q = searchNorm(query);
      const hay = searchNorm(`${sp.name || ""} ${deSlug(sp.slug)} ${spellItAlias(sp.name) || spellItAlias(deSlug(sp.slug))}`);
      if (!hay.includes(q)) return false;
    }
    if (levelFilter !== "" && sp.level !== parseInt(levelFilter)) return false;
    if (schoolFilter && sp.school !== schoolFilter) return false;
    if (classFilter && !(sp.classes || "").toLowerCase().includes(classFilter.toLowerCase())) return false;
    return true;
  }), [allSpells, query, levelFilter, schoolFilter, classFilter]);
  const MAX_SHOWN = 200;
  const shown = results.slice(0, MAX_SHOWN);

  const schoolEmoji = { Evocation:"🔥", Abjuration:"🛡", Conjuration:"✨", Divination:"🔮",
    Enchantment:"💫", Illusion:"👁", Necromancy:"💀", Transmutation:"⚗" };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* filtri */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid var(--border)",display:"flex",gap:8,flexWrap:"wrap",flexShrink:0}}>
        <input placeholder="🔍 Cerca incantesimo..." value={query}
          onChange={e=>{setQuery(e.target.value);setSelected(null);}}
          style={{flex:"1 1 160px",minWidth:120}} />
        <select value={levelFilter} onChange={e=>{setLevelFilter(e.target.value);setSelected(null);}} style={{width:90}}>
          <option value="">Tutti i liv.</option>
          {[0,1,2,3,4,5,6,7,8,9].map(l=><option key={l} value={l}>{l===0?"Trucchi":`Liv. ${l}`}</option>)}
        </select>
        <select value={schoolFilter} onChange={e=>{setSchoolFilter(e.target.value);setSelected(null);}} style={{width:110}}>
          <option value="">Tutte le scuole</option>
          {schools.map(s=><option key={s} value={s}>{schoolEmoji[s]||"✦"} {s}</option>)}
        </select>
        <select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setSelected(null);}} style={{width:110}}>
          <option value="">Tutte le classi</option>
          {classes.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{fontSize:"0.7rem",color:"var(--text3)",alignSelf:"center",whiteSpace:"nowrap"}}>
          {results.length} / {allSpells.length}
          {results.length > MAX_SHOWN ? ` (mostro ${MAX_SHOWN})` : ""}
          {importedSpells.length > 0 ? ` · +${importedSpells.length} imp.` : ""}
        </span>
      </div>

      {/* lista + dettaglio */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* lista */}
        <div style={{flex:"0 0 280px",overflowY:"auto",borderRight:"1px solid var(--border)"}}>
          {results.length === 0 && (
            <div style={{padding:24,textAlign:"center",color:"var(--text3)",fontSize:"0.85rem"}}>
              Nessun incantesimo trovato
            </div>
          )}
          {shown.map(sp => (
            <div key={sp.slug || sp.name} onClick={()=>setSelected(selected?.slug===sp.slug ? null : sp)}
              style={{padding:"9px 12px",borderBottom:"1px solid var(--border)",cursor:"pointer",
                background: selected?.slug===sp.slug ? "var(--surface2)" : "transparent",
                borderLeft: selected?.slug===sp.slug ? "3px solid var(--gold)" : "3px solid transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                <span style={{fontWeight:600,fontSize:"0.85rem",color:"var(--gold2)",
                  fontFamily:"'Cinzel',serif",lineHeight:1.2}}>
                  {schoolEmoji[sp.school]||"✦"} {sp.name}
                </span>
                <span className="spell-level-badge" style={{flexShrink:0}}>
                  {sp.level===0?"Trucco":`${sp.level}°`}
                </span>
              </div>
              <div style={{fontSize:"0.7rem",color:"var(--text3)",marginTop:2}}>
                {sp.school}{sp.classes ? ` • ${sp.classes}` : ""}
              </div>
            </div>
          ))}
        </div>

        {/* dettaglio */}
        <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
          {!selected && (
            <div style={{textAlign:"center",color:"var(--text3)",fontSize:"0.85rem",marginTop:40}}>
              Seleziona un incantesimo per vedere i dettagli
            </div>
          )}
          {selected && (
            <div>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12,gap:8}}>
                <div>
                  <div style={{fontSize:"1.15rem",fontWeight:700,color:"var(--gold)",
                    fontFamily:"'Cinzel',serif",marginBottom:4}}>
                    {schoolEmoji[selected.school]||"✦"} {selected.name}
                  </div>
                  <div style={{fontSize:"0.78rem",color:"var(--text3)"}}>
                    {selected.level===0?"Trucco":selected.level===1?"Incantesimo di 1° livello":`Incantesimo di ${selected.level}° livello`}
                    {selected.school ? ` — ${selected.school}` : ""}
                  </div>
                </div>
                <span className="spell-level-badge" style={{fontSize:"0.8rem",padding:"4px 10px"}}>
                  {selected.level===0?"Trucco":`Liv. ${selected.level}`}
                </span>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 16px",
                background:"var(--surface2)",borderRadius:8,padding:"10px 12px",marginBottom:14,
                fontSize:"0.78rem"}}>
                {[
                  ["Tempo di lancio", selected.castingTime],
                  ["Gittata",         selected.range],
                  ["Componenti",      selected.components],
                  ["Durata",         selected.duration],
                  ...(selected.classes ? [["Classi", selected.classes]] : []),
                  ...(selected.source  ? [["Fonte",  selected.source]]  : []),
                ].map(([k,v]) => v ? (
                  <div key={k}>
                    <span style={{color:"var(--text3)",textTransform:"uppercase",
                      fontSize:"0.62rem",letterSpacing:"0.08em"}}>{k}</span>
                    <div style={{color:"var(--text)",fontWeight:600,marginTop:1}}>{v}</div>
                  </div>
                ) : null)}
              </div>

              {selected.desc && (
                <div style={{fontSize:"0.85rem",color:"var(--text2)",lineHeight:1.65,
                  whiteSpace:"pre-wrap",marginBottom:12}}>
                  {selected.desc}
                </div>
              )}
              {selected.higherLevel && (
                <div style={{fontSize:"0.82rem",color:"var(--blue2)",fontStyle:"italic",
                  borderTop:"1px solid var(--border)",paddingTop:10}}>
                  <strong style={{color:"var(--blue2)",fontStyle:"normal"}}>A livelli più alti: </strong>
                  {selected.higherLevel}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
