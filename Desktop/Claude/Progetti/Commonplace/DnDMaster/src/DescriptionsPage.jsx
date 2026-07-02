// Estratto da App.jsx (scorporo monolite).
import React from "react";
import { DETAILS_DB } from "./data/details.js";
import { DETAILS_EXTRA } from "./detailsExtra.js";

export default function DescriptionsPage() {
  const [tone, setTone] = React.useState("classic");
  const [activeCategory, setActiveCategory] = React.useState("luoghi");
  const [activeSub, setActiveSub] = React.useState("foresta");
  const [picks, setPicks] = React.useState([]);
  const [scene, setScene] = React.useState([]);
  const [copied, setCopied] = React.useState(null);

  // DETAILS_DB inline + toni extra (sfarzoso/inquietante) mergiati per sotto-categoria
  const DETAILS = React.useMemo(() => {
    const out = {};
    for (const [ck, cat] of Object.entries(DETAILS_DB)) {
      out[ck] = { ...cat, sub: {} };
      for (const [sk, sub] of Object.entries(cat.sub)) {
        out[ck].sub[sk] = { ...sub, ...(DETAILS_EXTRA[ck]?.[sk] || {}) };
      }
    }
    return out;
  }, []);

  const TONES = [
    ["classic", "☀ Classico"],
    ["dark", "🌑 Cupo"],
    ["sfarzoso", "👑 Sfarzoso"],
    ["steampunk", "⚙ Steampunk"],
  ];
  const TONE_COLORS = {
    classic:   { accent: "var(--gold)", bg: "rgba(180,140,50,0.10)", border: "var(--gold)",            label: "classico" },
    dark:      { accent: "#d46060",     bg: "rgba(120,20,20,0.18)",  border: "rgba(200,60,60,0.45)",   label: "cupo" },
    sfarzoso:  { accent: "#c9a13b",     bg: "rgba(150,110,30,0.16)", border: "rgba(210,170,70,0.55)",  label: "sfarzoso" },
    steampunk: { accent: "#c98a3a",     bg: "rgba(150,95,40,0.18)",  border: "rgba(190,130,70,0.55)",  label: "steampunk" },
  };

  // Lista dei dettagli per un tono. Il tono "Cupo" unisce dark (DETAILS_DB) + inquietante (extra).
  const listFor = (sub, t) => {
    if (!sub) return [];
    if (t === "dark") return [...(sub.dark || []), ...(sub.inquietante || [])];
    return sub[t] || [];
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  React.useEffect(() => {
    const subs = Object.keys(DETAILS[activeCategory]?.sub || {});
    if (subs.length > 0) setActiveSub(subs[0]);
    setPicks([]); setScene([]);
  }, [activeCategory, DETAILS]);

  const currentSub = DETAILS[activeCategory]?.sub[activeSub];
  const currentList = listFor(currentSub, tone);

  const rollRandom = () => {
    if (currentList.length === 0) return;
    setScene([]);
    setPicks(shuffle(currentList).slice(0, 3));
  };

  // Componi scena: un dettaglio da ogni categoria ambientale, nel tono corrente
  // (fallback su 'classic' dove il tono non è ancora disponibile).
  const SCENE_CATS = ["luoghi", "architettura", "meteo", "suoni", "oggetti"];
  const composeScene = () => {
    setPicks([]);
    const parts = [];
    for (const ck of SCENE_CATS) {
      const cat = DETAILS[ck]; if (!cat) continue;
      const subKeys = Object.keys(cat.sub);
      const sk = subKeys[Math.floor(Math.random() * subKeys.length)];
      let list = listFor(cat.sub[sk], tone);
      if (!list.length) list = cat.sub[sk].classic || [];
      if (!list.length) continue;
      const it = list[Math.floor(Math.random() * list.length)];
      parts.push({ catLabel: cat.label, subLabel: cat.sub[sk].label, key: it.key, note: it.note });
    }
    setScene(parts);
  };

  const copyText = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const isDark = tone === "dark";
  const accentColor = TONE_COLORS[tone].accent;
  const cardBg = TONE_COLORS[tone].bg;
  const cardBorder = TONE_COLORS[tone].border;

  return (
    <div style={{display:"flex",height:"calc(100vh - 120px)",gap:0,overflow:"hidden"}}>

      {/* ── Sidebar ── */}
      <div style={{
        width:200, flexShrink:0,
        borderRight:"1px solid var(--border)",
        overflowY:"auto",
        background:"var(--surface)",
        padding:"10px 0",
      }}>
        {/* Tone toggle */}
        <div style={{padding:"10px 14px 14px",borderBottom:"1px solid var(--border)",marginBottom:6}}>
          <div style={{
            fontSize:"0.72rem",fontFamily:"'Cinzel',serif",
            color:"var(--text3)",letterSpacing:"0.1em",marginBottom:8
          }}>TONO</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {TONES.map(([t,label]) => (
              <button key={t}
                onClick={()=>setTone(t)}
                style={{
                  flex:"1 1 calc(50% - 3px)", padding:"5px 4px",
                  fontSize:"0.78rem", fontFamily:"'Cinzel',serif",
                  cursor:"pointer", borderRadius:4,
                  border: `1px solid ${tone===t ? TONE_COLORS[t].accent : "var(--border)"}`,
                  background: tone===t ? TONE_COLORS[t].accent : "var(--surface2)",
                  color: tone===t ? "#1a1208" : "var(--text2)",
                  fontWeight: tone===t ? 700 : 400,
                  transition:"all 0.15s",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Category tree */}
        {Object.entries(DETAILS).map(([catKey, cat]) => (
          <div key={catKey}>
            <div
              onClick={()=>setActiveCategory(catKey)}
              style={{
                padding:"9px 14px", cursor:"pointer",
                fontSize:"0.85rem", fontWeight:700,
                fontFamily:"'Cinzel',serif", letterSpacing:"0.03em",
                background: activeCategory===catKey ? "var(--surface3)" : "transparent",
                color: activeCategory===catKey ? "var(--gold)" : "var(--text)",
                borderLeft: `3px solid ${activeCategory===catKey ? "var(--gold)" : "transparent"}`,
                transition:"all 0.12s",
              }}>
              {cat.label}
            </div>
            {activeCategory===catKey && Object.entries(cat.sub).map(([subKey, sub]) => (
              <div key={subKey}
                onClick={()=>{ setActiveSub(subKey); setPicks([]); }}
                style={{
                  padding:"7px 14px 7px 26px", cursor:"pointer",
                  fontSize:"0.82rem",
                  background: activeSub===subKey ? "var(--surface2)" : "transparent",
                  color: activeSub===subKey ? "var(--text)" : "var(--text2)",
                  borderLeft: `3px solid ${activeSub===subKey ? "var(--gold)" : "transparent"}`,
                  transition:"all 0.12s",
                }}>
                {sub.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Main area ── */}
      <div style={{flex:1, overflowY:"auto", padding:"20px 24px"}}>

        {/* Header row */}
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
          <div>
            <div style={{
              fontFamily:"'Cinzel',serif", fontSize:"1.1rem",
              color:"var(--gold)", fontWeight:700, letterSpacing:"0.03em"
            }}>
              {DETAILS[activeCategory]?.label}
              <span style={{color:"var(--text3)",margin:"0 8px",fontWeight:400}}>·</span>
              {currentSub?.label}
            </div>
            <div style={{fontSize:"0.82rem",color:"var(--text3)",marginTop:4}}>
              {currentList.length} dettagli · tono <em style={{color:"var(--text2)"}}>{TONE_COLORS[tone].label}</em>
            </div>
          </div>
          <button
            onClick={composeScene}
            style={{
              marginLeft:"auto", padding:"9px 18px",
              fontSize:"0.9rem", fontFamily:"'Cinzel',serif",
              fontWeight:700, letterSpacing:"0.04em",
              cursor:"pointer", borderRadius:6,
              background:"transparent", color:accentColor,
              border:`1px solid ${accentColor}`, transition:"opacity 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}
            title="Compone una scena pescando da luogo, architettura, meteo, suoni/odori, oggetti">
            🎬 Componi scena
          </button>
          <button
            onClick={rollRandom}
            style={{
              marginLeft:10, padding:"9px 20px",
              fontSize:"0.9rem", fontFamily:"'Cinzel',serif",
              fontWeight:700, letterSpacing:"0.04em",
              cursor:"pointer", borderRadius:6,
              background:"var(--gold)", color:"#1a1208",
              border:"none", transition:"opacity 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            🎲 3 spunti casuali
          </button>
        </div>

        {/* Scena composta */}
        {scene.length > 0 && (
          <div style={{marginBottom:28}}>
            <div style={{fontSize:"0.72rem",fontFamily:"'Cinzel',serif",color:"var(--text3)",letterSpacing:"0.12em",marginBottom:12}}>
              SCENA COMPOSTA · tono {TONE_COLORS[tone].label}
            </div>
            <div onClick={()=>copyText(scene.map(p=>`${p.subLabel}: ${p.key} — ${p.note}`).join("\n"))}
              style={{padding:"16px 18px",borderRadius:8,cursor:"pointer",background:cardBg,border:`1px solid ${cardBorder}`,boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
              {scene.map((p,i)=>(
                <div key={i} style={{marginBottom: i<scene.length-1?10:0}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.68rem",color:accentColor,letterSpacing:"0.06em"}}>{p.subLabel.toUpperCase()}</span>
                  <div style={{fontSize:"0.9rem",color:"var(--text)",lineHeight:1.5}}>
                    <strong style={{color:accentColor}}>{p.key}</strong> — {p.note}
                  </div>
                </div>
              ))}
              <div style={{fontSize:"0.72rem",color:"var(--text3)",marginTop:10}}>tocca per copiare l'intera scena</div>
            </div>
          </div>
        )}

        {/* Random picks */}
        {picks.length > 0 && (
          <div style={{marginBottom:28}}>
            <div style={{
              fontSize:"0.72rem", fontFamily:"'Cinzel',serif",
              color:"var(--text3)", letterSpacing:"0.12em", marginBottom:12
            }}>
              SPUNTI CASUALI
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {picks.map((p,i) => {
                const key = `${p.key} — ${p.note}`;
                const isCopied = copied === key;
                return (
                  <div key={i}
                    onClick={() => copyText(key)}
                    style={{
                      flex:"1 1 220px", padding:"14px 18px",
                      borderRadius:8, cursor:"pointer",
                      background: cardBg,
                      border:`1px solid ${isCopied ? "var(--gold2)" : cardBorder}`,
                      opacity: isCopied ? 0.7 : 1,
                      transition:"all 0.15s",
                      boxShadow: isCopied ? "none" : "0 2px 12px rgba(0,0,0,0.3)",
                    }}>
                    <div style={{
                      fontFamily:"'Cinzel',serif", fontSize:"0.95rem",
                      fontWeight:700, color:accentColor, marginBottom:6
                    }}>
                      {p.key}
                    </div>
                    <div style={{fontSize:"0.88rem",color:"var(--text)",lineHeight:1.6}}>
                      {p.note}
                    </div>
                    <div style={{fontSize:"0.72rem",color:"var(--text3)",marginTop:8}}>
                      {isCopied ? "✓ copiato" : "tocca per copiare"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full list */}
        <div style={{
          fontSize:"0.72rem", fontFamily:"'Cinzel',serif",
          color:"var(--text3)", letterSpacing:"0.12em", marginBottom:12
        }}>
          LISTA COMPLETA
        </div>
        {currentList.length === 0 && (
          <div style={{color:"var(--text3)",fontStyle:"italic",fontSize:"0.85rem",padding:"6px 0",lineHeight:1.5}}>
            Nessun dettaglio per il tono <em>{TONE_COLORS[tone].label}</em> in questa sotto-categoria.
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
          {currentList.map((item, i) => {
            const key = `${item.key} — ${item.note}`;
            const isCopied = copied === key;
            return (
              <div key={i}
                onClick={() => copyText(key)}
                onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
                onMouseLeave={e => e.currentTarget.style.borderColor = isCopied ? accentColor : "var(--border)"}
                style={{
                  padding:"11px 14px", borderRadius:6, cursor:"pointer",
                  background:"var(--surface2)",
                  border:`1px solid ${isCopied ? accentColor : "var(--border)"}`,
                  transition:"border-color 0.15s",
                  lineHeight:1.5,
                }}>
                <span style={{
                  fontFamily:"'Cinzel',serif", fontSize:"0.85rem",
                  fontWeight:700, color:accentColor
                }}>
                  {item.key}
                </span>
                <span style={{color:"var(--border2)",margin:"0 8px",fontSize:"0.8rem"}}>·</span>
                <span style={{fontSize:"0.85rem",color:"var(--text2)"}}>
                  {item.note}
                </span>
                {isCopied && (
                  <span style={{fontSize:"0.72rem",color:"var(--gold2)",marginLeft:10}}>✓</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
