import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pchldmiavycxzpkzochn.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjaGxkbWlhdnljeHpwa3pvY2huIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE2Mjk5MDAsImV4cCI6MjA4NzIwNTkwMH0.bVhCJfeCMnPcR5Ub4hLqNSmVdST5P6cT6T_2kzdKGYM";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const STORAGE_KEY     = "libreria-personale-v1";
const GOALS_KEY       = "libreria-goals-v1";
const COLLECTIONS_KEY = "libreria-collections-v1";

// ─── Storage (localStorage) ───────────────────────────────────────────
const store = {
  get: (key) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : null; } catch { return null; } },
  set: (key, val) => { try { safeLsSet(key, JSON.stringify(val)); } catch {} },
};

const palette = {
  bg: "#F5F0E8", paper: "#FDFAF4", ink: "#1A1208", inkLight: "#6B5E4A",
  accent: "#C8421A", gold: "#D4A853", border: "#D9CDB8", tagBg: "#EDE6D6",
  green: "#4A7C59", blue: "#3A6186",
};

const fonts = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:ital,wght@0,400;0,500;1,400&family=DM+Mono:wght@400;500&display=swap');`;

const MONTHS = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
                "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];

const STATUS_CONFIG = {
  letto:        { label: "Letto",       color: palette.green,    dot: "●" },
  "in corso":   { label: "In corso",    color: palette.blue,     dot: "◐" },
  "da leggere": { label: "Da leggere",  color: palette.inkLight, dot: "○" },
  wishlist:     { label: "Wishlist",    color: "#9B59B6",        dot: "✦" },
  abbandonato:  { label: "Abbandonato", color: "#E67E22",        dot: "✕" },
};

const COLLECTION_COLORS = [
  "#8B4513","#2F4F4F","#4B0082","#8B0000","#006400",
  "#191970","#8B6914","#5F4F3A","#3A4A5F","#5A3A5A",
];

// ─── Open Library search ──────────────────────────────────────────────
async function searchOpenLibrary(query) {
  if (!query.trim()) return [];
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=key,title,author_name,publisher,first_publish_year,isbn,cover_i`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.docs || []).map(doc => ({
    title:     doc.title || "",
    author:    (doc.author_name || []).join(", "),
    publisher: (doc.publisher || [])[0] || "",
    year:      doc.first_publish_year ? String(doc.first_publish_year) : "",
    isbn:      (doc.isbn || [])[0] || "",
    cover:     doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : "",
  }));
}

// ─── Shared UI ────────────────────────────────────────────────────────

function StarRating({ value, onChange, readOnly }) {
  const [hover, setHover] = useState(0);
  const active = hover || value;
  function mm(e, s) {
    if (readOnly) return;
    const half = e.clientX < e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2;
    setHover(half ? s - 0.5 : s);
  }
  function click(e, s) {
    if (readOnly) return;
    const half = e.clientX < e.currentTarget.getBoundingClientRect().left + e.currentTarget.getBoundingClientRect().width / 2;
    const v = half ? s - 0.5 : s; onChange(v === value ? 0 : v);
  }
  return (
    <div style={{ display:"flex", gap:1 }} onMouseLeave={() => setHover(0)}>
      {[1,2,3,4,5].map(s => {
        const filled = active >= s, half = !filled && active >= s - 0.5;
        return (
          <span key={s} onMouseMove={e => mm(e,s)} onClick={e => click(e,s)}
            style={{ cursor: readOnly?"default":"pointer", fontSize: readOnly?14:20,
              position:"relative", userSelect:"none", display:"inline-block", width: readOnly?16:22 }}>
            <span style={{ color: palette.border }}>★</span>
            {(filled||half) && <span style={{ position:"absolute",left:0,top:0,color:palette.gold,
              overflow:"hidden", width:filled?"100%":"50%", display:"block", whiteSpace:"nowrap" }}>★</span>}
          </span>
        );
      })}
      {!readOnly && value > 0 && (
        <span onClick={() => onChange(0)} style={{ marginLeft:4, fontSize:11, color:palette.inkLight,
          cursor:"pointer", fontFamily:"'DM Mono', monospace", alignSelf:"center", opacity:0.6 }}>✕</span>
      )}
    </div>
  );
}

function Tag({ label, onRemove, onClick, active }) {
  return (
    <span onClick={onClick} style={{
      display:"inline-flex", alignItems:"center", gap:4, padding:"3px 10px", borderRadius:2,
      background: active ? palette.ink : palette.tagBg,
      color: active ? palette.paper : palette.inkLight,
      fontFamily:"'DM Mono', monospace", fontSize:11, letterSpacing:"0.05em",
      cursor: onClick ? "pointer" : "default",
      border:`1px solid ${active ? palette.ink : palette.border}`,
      transition:"all 0.15s", userSelect:"none",
    }}>
      {label}
      {onRemove && <span onClick={e=>{e.stopPropagation();onRemove();}}
        style={{opacity:0.6, marginLeft:2, cursor:"pointer", lineHeight:1}}>×</span>}
    </span>
  );
}

function btnStyle(variant) {
  const base = { border:"none", cursor:"pointer", borderRadius:2, transition:"all 0.15s", fontFamily:"'DM Mono', monospace", fontSize:12 };
  if (variant==="primary") return {...base, background:palette.ink, color:palette.paper, padding:"9px 20px", fontWeight:500};
  if (variant==="ghost")   return {...base, background:"transparent", color:palette.inkLight, padding:"4px 8px", border:`1px solid ${palette.border}`};
  if (variant==="danger")  return {...base, background:"transparent", color:"#C8421A", padding:"4px 8px", border:"1px solid #f0c4b8"};
  if (variant==="outline") return {...base, background:"transparent", color:palette.ink, padding:"9px 20px", border:`1px solid ${palette.border}`};
  return base;
}

function inputStyle(extra={}) {
  return { width:"100%", padding:"9px 12px", border:`1px solid ${palette.border}`,
    background:palette.paper, color:palette.ink, fontFamily:"'Lora', serif",
    fontSize:14, outline:"none", borderRadius:2, boxSizing:"border-box", ...extra };
}

const tagSuggestionStyle = {
  display:"inline-flex", alignItems:"center", padding:"3px 10px", borderRadius:2,
  background:"transparent", color:palette.inkLight, fontFamily:"'DM Mono', monospace",
  fontSize:11, letterSpacing:"0.05em", cursor:"pointer",
  border:`1px dashed ${palette.border}`, userSelect:"none",
};

function fieldLabel(label, sub) {
  return (
    <label style={{fontFamily:"'DM Mono', monospace", fontSize:11, letterSpacing:"0.08em",
      color:palette.inkLight, display:"block", marginBottom:4}}>
      {label}
      {sub && <span style={{opacity:0.6, marginLeft:6, textTransform:"none", letterSpacing:0,
        fontFamily:"'Lora', serif", fontStyle:"italic"}}>{sub}</span>}
    </label>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────

function GoalInput({ label, value, onChange }) {
  const goalInputStyle = {
    width:"80px", padding:"4px 0", background:"transparent",
    border:"none", borderBottom:"1px solid rgba(255,255,255,0.3)",
    color:palette.paper, fontFamily:"'Playfair Display', serif",
    fontSize:22, fontWeight:700, outline:"none", textAlign:"center",
    MozAppearance:"textfield",
  };
  return (
    <div style={{textAlign:"center"}}>
      <input type="text" inputMode="numeric" pattern="[0-9]*"
        value={value||""}
        onChange={e=>{ const v=e.target.value.replace(/\D/g,""); onChange(v?parseInt(v):0); }}
        placeholder="—"
        style={goalInputStyle}
      />
      <div style={{fontFamily:"'DM Mono', monospace", fontSize:10, opacity:0.45, letterSpacing:"0.1em", marginTop:4}}>{label}</div>
    </div>
  );
}

function ProgressBar({ current, goal, label, color }) {
  if (!goal) return null;
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const done = pct >= 100;
  return (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:5}}>
        <span style={{fontFamily:"'DM Mono', monospace", fontSize:10, opacity:0.5, letterSpacing:"0.08em"}}>{label}</span>
        <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color: done ? palette.gold : "rgba(255,255,255,0.7)"}}>
          {current.toLocaleString("it-IT")} / {goal.toLocaleString("it-IT")}
          <span style={{opacity:0.5, marginLeft:6}}>{pct}%</span>
          {done && <span style={{marginLeft:6}}>✓</span>}
        </span>
      </div>
      <div style={{height:5, background:"rgba(255,255,255,0.12)", borderRadius:3, overflow:"hidden"}}>
        <div style={{height:"100%", width:`${pct}%`, borderRadius:3,
          background: done ? palette.gold : color, transition:"width 0.6s ease"}}/>
      </div>
    </div>
  );
}

function StatsBar({ books, filterYear, setFilterYear, goals, setGoals, onEditBook, onGoToStats }) {
  const [statsOpen, setStatsOpen] = useState(false);
  const years = [...new Set(books.map(b=>b.readYear).filter(Boolean))].sort((a,b)=>b-a);
  const currentYear = new Date().getFullYear();
  const scopeYear = filterYear || currentYear;
  const readScope = books.filter(b => b.readYear===scopeYear && (b.status==="letto"||!b.status));
  const allRead   = filterYear ? readScope : books.filter(b => b.status==="letto"||!b.status);
  const count = allRead.length, scopeCount = readScope.length;
  const totalPages = allRead.reduce((s,b) => s+(parseInt(b.pages)||0), 0);
  const scopePages = readScope.reduce((s,b) => s+(parseInt(b.pages)||0), 0);
  const rated = allRead.filter(b => b.rating > 0);
  const avg = rated.length ? (rated.reduce((s,b)=>s+b.rating,0)/rated.length).toFixed(1) : null;
  const scopeGoals = goals[scopeYear] || {};
  const goalBooks = scopeGoals.books || 0;
  const goalPages = scopeGoals.pages || 0;
  const hasGoal = goalBooks > 0 || goalPages > 0;

  const inProgress = books.filter(b => b.status==="in corso");

  function updateGoal(key, val) {
    setGoals(p => {
      const yearGoals = { ...(p[scopeYear]||{}) };
      if (val > 0) yearGoals[key] = val;
      else delete yearGoals[key];
      return { ...p, [scopeYear]: yearGoals };
    });
  }

  const monoSm = {fontFamily:"'DM Mono', monospace", fontSize:10, opacity:0.5, letterSpacing:"0.1em", marginTop:4};

  return (
    <div style={{background:palette.ink, color:palette.paper, padding:"20px 40px"}}>
      <div style={{maxWidth:900, margin:"0 auto"}}>
        <div style={{display:"flex", gap:6, alignItems:"center", marginBottom:16, flexWrap:"wrap"}}>
          <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, letterSpacing:"0.1em", opacity:0.5}}>ANNO:</span>
          {["tutti",...[...new Set([currentYear,...years])].sort((a,b)=>b-a)].map(y=>(
            <span key={y} onClick={()=>setFilterYear(y==="tutti"?null:(filterYear===y?null:y))}
              style={{fontFamily:"'DM Mono', monospace", fontSize:11, cursor:"pointer", userSelect:"none",
                color:(y==="tutti"&&!filterYear)||(filterYear===y)?palette.gold:"rgba(255,255,255,0.45)",
                textDecoration:(y==="tutti"&&!filterYear)||(filterYear===y)?"underline":"none"}}>{y}</span>
          ))}
        </div>
        <div style={{display:"flex", gap:0, flexWrap:"wrap", alignItems:"flex-start"}}>

          {/* Colonna sinistra: statistiche + libri in corso */}
          <div style={{flex:1, display:"flex", flexDirection:"column", gap:0}}>
            <div style={{display:"flex", gap:36, flexWrap:"wrap", alignItems:"flex-end"}}>
              <div>
                <div style={{fontFamily:"'Playfair Display', serif", fontSize:34, fontWeight:700, lineHeight:1}}>{filterYear?scopeCount:count}</div>
                <div style={monoSm}>LIBRI LETTI{filterYear?` NEL ${filterYear}`:" IN TOTALE"}</div>
              </div>
              {(filterYear?scopePages:totalPages)>0 && <div>
                <div style={{fontFamily:"'Playfair Display', serif", fontSize:34, fontWeight:700, lineHeight:1}}>{(filterYear?scopePages:totalPages).toLocaleString("it-IT")}</div>
                <div style={monoSm}>PAGINE TOTALI</div>
              </div>}
              {avg && <div>
                <div style={{fontFamily:"'Playfair Display', serif", fontSize:34, fontWeight:700, lineHeight:1, color:palette.gold}}>{avg} <span style={{fontSize:18}}>★</span></div>
                <div style={monoSm}>MEDIA VOTI</div>
              </div>}
            </div>

            <button onClick={e=>{e.stopPropagation();setStatsOpen(o=>!o);}}
              style={{alignSelf:"flex-start", marginTop:10, fontFamily:"'DM Mono',monospace", fontSize:10,
                padding:"3px 10px", cursor:"pointer", background:"transparent", letterSpacing:"0.06em",
                color:"rgba(255,255,255,0.45)", border:"1px solid rgba(255,255,255,0.2)"}}>
              {statsOpen ? "▲ CHIUDI" : "▼ IN LETTURA E OBIETTIVI"}
            </button>

            {/* Libri in corso */}
            {statsOpen && inProgress.length>0 && (
              <div style={{marginTop:20, paddingTop:16, borderTop:"1px solid rgba(255,255,255,0.08)"}}>
                <div style={{fontFamily:"'DM Mono', monospace", fontSize:10, opacity:0.4, letterSpacing:"0.12em", marginBottom:12}}>
                  IN LETTURA
                </div>
                <div style={{display:"flex", flexDirection:"column", gap:12}}>
                  {inProgress.map(b => {
                    const cur  = parseInt(b.currentPage)||0;
                    const tot  = parseInt(b.pages)||0;
                    const pct  = cur&&tot ? Math.min(100, Math.round(cur/tot*100)) : null;
                    return (
                      <div key={b.id} style={{display:"flex", gap:12, alignItems:"center"}}>
                        {b.cover ? (
                          <img src={b.cover} alt={b.title}
                            style={{width:32, height:46, objectFit:"cover", borderRadius:1,
                              border:"1px solid rgba(255,255,255,0.1)", flexShrink:0}}/>
                        ) : (
                          <div style={{width:32, height:46, flexShrink:0, background:"rgba(255,255,255,0.06)",
                            display:"flex", alignItems:"center", justifyContent:"center", borderRadius:1}}>
                            <span style={{fontSize:14, opacity:0.3}}>📖</span>
                          </div>
                        )}
                        <div style={{flex:1, minWidth:0}}>
                          <div style={{fontFamily:"'Playfair Display', serif", fontSize:14, fontWeight:600,
                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{b.title}</div>
                          <div style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:12,
                            opacity:0.5, marginBottom: pct!==null ? 6 : 0,
                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{b.author}</div>
                          {pct!==null && <>
                            <div style={{height:3, background:"rgba(255,255,255,0.1)", borderRadius:2, overflow:"hidden"}}>
                              <div style={{height:"100%", width:`${pct}%`, background:palette.blue, borderRadius:2, transition:"width 0.4s ease"}}/>
                            </div>
                            <div style={{fontFamily:"'DM Mono', monospace", fontSize:10, opacity:0.4, marginTop:3}}>
                              {cur.toLocaleString("it-IT")} / {tot.toLocaleString("it-IT")} pp. · {pct}%
                            </div>
                          </>}
                        </div>
                        <button onClick={()=>onEditBook?.(b)}
                          style={{...btnStyle("ghost"), padding:"3px 7px", fontSize:11,
                            opacity:0.5, flexShrink:0, color:palette.paper,
                            border:"1px solid rgba(255,255,255,0.15)"}}>✎</button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Colonna destra: obiettivi */}
          {statsOpen && <div style={{borderLeft:"1px solid rgba(255,255,255,0.1)", paddingLeft:32, marginLeft:32, minWidth:280}}>
            <div style={{fontFamily:"'DM Mono', monospace", fontSize:10, opacity:0.4, letterSpacing:"0.12em", marginBottom:14}}>
              OBIETTIVO {scopeYear}
            </div>
            <div style={{display:"flex", gap:24, marginBottom:16, alignItems:"flex-end"}}>
              <GoalInput label="LIBRI" value={goalBooks} onChange={v=>updateGoal("books",v)}/>
              <span style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:13, opacity:0.3, paddingBottom:20}}>e/o</span>
              <GoalInput label="PAGINE" value={goalPages} onChange={v=>updateGoal("pages",v)}/>
            </div>
            {hasGoal && <>
              <ProgressBar current={filterYear?scopeCount:count} goal={goalBooks} label="LIBRI LETTI" color={palette.green}/>
              <ProgressBar current={filterYear?scopePages:totalPages} goal={goalPages} label="PAGINE LETTE" color={palette.blue}/>
            </>}
            {!hasGoal && (
              <div style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:12, opacity:0.3, marginTop:4}}>
                Scrivi un numero per impostare l'obiettivo.
              </div>
            )}
            {onGoToStats && (
              <div style={{marginTop:16, paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.08)"}}>
                <span onClick={onGoToStats} style={{fontFamily:"'DM Mono', monospace", fontSize:10,
                  opacity:0.4, letterSpacing:"0.08em", cursor:"pointer",
                  textDecoration:"underline", userSelect:"none"}}
                  onMouseEnter={e=>e.currentTarget.style.opacity="0.7"}
                  onMouseLeave={e=>e.currentTarget.style.opacity="0.4"}>
                  → statistiche dettagliate
                </span>
              </div>
            )}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── Stats view ───────────────────────────────────────────────────────

function StatsView({ books, goals, initialYear }) {
  const currentYear  = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const years = [...new Set(books.map(b=>b.readYear).filter(Boolean))].sort((a,b)=>b-a);
  const [statsYear, setStatsYear] = useState(initialYear || currentYear);
  const scopeYear = statsYear;
  const isCurrentYear = scopeYear === currentYear;

  // [month filter, rating filter] for the drilldown panel
  const [drillMonth, setDrillMonth]   = useState(null); // 1-12 or null
  const [drillRating, setDrillRating] = useState(null); // number or null

  const readBooks = books.filter(b => (b.status==="letto"||!b.status) && b.readYear===scopeYear);
  const allRead   = books.filter(b => (b.status==="letto"||!b.status));

  // Goal pages for the year (for target line)
  const goalPages = goals?.[scopeYear]?.pages || 0;

  // ── Libri per mese ──
  const byMonth = Array.from({length:12},(_,i)=>({
    month: MONTHS[i].slice(0,3),
    monthNum: i+1,
    count: readBooks.filter(b=>b.readMonth===i+1).length,
    future: isCurrentYear && i+1 > currentMonth,
  }));
  const maxMonth = Math.max(...byMonth.map(m=>m.count), 1);

  // ── Distribuzione voti ──
  const ratingDist = [1,1.5,2,2.5,3,3.5,4,4.5,5].map(r=>({
    r, count: allRead.filter(b=>b.rating===r).length
  }));
  const maxRating = Math.max(...ratingDist.map(d=>d.count), 1);

  // ── Pagine cumulative ── (only up to current month if current year)
  const pagesCum = (() => {
    let cum = 0;
    return Array.from({length:12},(_,i)=>{
      const isFuture = isCurrentYear && i+1 > currentMonth;
      if(!isFuture){
        const mb = readBooks.filter(b=>b.readMonth===i+1);
        cum += mb.reduce((s,b)=>s+(parseInt(b.pages)||0),0);
      }
      return { month: MONTHS[i].slice(0,3), monthNum:i+1, pages: isFuture ? null : cum, future: isFuture };
    });
  })();
  const lastRealPages = Math.max(...pagesCum.filter(p=>p.pages!==null).map(p=>p.pages), 0);

  // Dynamic Y max: ceiling above max(lastRealPages, goalPages), rounded nicely
  const rawMax = Math.max(lastRealPages, goalPages || 0);
  const yMax = (() => {
    if(rawMax === 0) return 1000;
    const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
    const steps = [1,2,2.5,5,10];
    for(const s of steps){
      const candidate = Math.ceil(rawMax / (mag*s)) * mag*s;
      if(candidate >= rawMax * 1.15) return candidate;
    }
    return Math.ceil(rawMax / mag) * mag * 2;
  })();

  // ── Editori, Tag, Autori ──
  const publisherMap = {};
  allRead.forEach(b=>{ if(b.publisher) publisherMap[b.publisher]=(publisherMap[b.publisher]||0)+1; });
  const topPublishers = Object.entries(publisherMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxPub = Math.max(...topPublishers.map(p=>p[1]), 1);

  // Tag: escludi quelli troppo lunghi (note personali, non generi)
  const tagMap = {};
  allRead.forEach(b=>b.tags.forEach(t=>{ if(t.length<=40) tagMap[t]=(tagMap[t]||0)+1; }));
  const topTags = Object.entries(tagMap).sort((a,b)=>b[1]-a[1]).slice(0,10);
  const maxTag = Math.max(...topTags.map(t=>t[1]), 1);

  // Autori
  const authorMap = {};
  allRead.forEach(b=>{ if(b.author) authorMap[b.author]=(authorMap[b.author]||0)+1; });
  const topAuthors = Object.entries(authorMap).sort((a,b)=>b[1]-a[1]).slice(0,8);
  const maxAuthor = Math.max(...topAuthors.map(a=>a[1]), 1);

  // Libri per anno (tutti gli anni)
  const allYears = [...new Set(allRead.map(b=>b.readYear).filter(Boolean))].sort();
  const byYear = allYears.map(y=>({ year:y, count:allRead.filter(b=>b.readYear===y).length }));
  const maxYear = Math.max(...byYear.map(d=>d.count), 1);

  // KPI generali
  const totalPages = allRead.reduce((s,b)=>s+(parseInt(b.pages)||0),0);
  const ratedBooks = allRead.filter(b=>b.rating>0);
  const avgRating = ratedBooks.length ? (ratedBooks.reduce((s,b)=>s+b.rating,0)/ratedBooks.length).toFixed(1) : null;
  const uniqueAuthors = new Set(allRead.map(b=>b.author).filter(Boolean)).size;

  // ── Drilldown books ──
  const drillBooks = drillMonth !== null
    ? readBooks.filter(b=>b.readMonth===drillMonth)
    : drillRating !== null
      ? allRead.filter(b=>b.rating===drillRating)
      : [];

  // ── Helpers ──
  const sectionTitle = (t) => (
    <div style={{fontFamily:"'DM Mono', monospace", fontSize:11, letterSpacing:"0.1em",
      color:palette.inkLight, marginBottom:16}}>{t}</div>
  );
  const card = (children, style={}) => (
    <div style={{background:palette.paper, border:`1px solid ${palette.border}`, padding:"24px 28px", ...style}}>
      {children}
    </div>
  );

  // ── SVG helpers ──
  const H = 60, LEFT = 12, BOTTOM = 20;
  const H_LINE = 48; // height for line chart

  // Y axis labels (4 ticks)
  const yTicks = [0.25,0.5,0.75,1].map(f=>Math.round(yMax*f));
  const formatN = n => n>=1000 ? `${(n/1000).toFixed(n%1000===0?0:1)}k` : String(n);

  // ── Bar chart (months) — clickable ──
  const MonthBarChart = () => {
    const w = (100-LEFT) / 12;
    return (
      <svg viewBox={`0 0 100 ${H+BOTTOM}`} style={{width:"100%", overflow:"visible"}}>
        {/* Y grid + labels */}
        {[0,...yTicks.map(v=>v)].map((v,i,arr)=> {
          // repurpose for month chart: use maxMonth scale
          return null; // month chart uses its own scale below
        })}
        {/* Y axis ticks for month chart (0..maxMonth) */}
        {[0, Math.ceil(maxMonth/2), maxMonth].filter((v,i,a)=>a.indexOf(v)===i).map(v=>{
          const y = H - (v/maxMonth)*(H-4);
          return (
            <g key={v}>
              <line x1={LEFT} y1={y} x2="100" y2={y} stroke={palette.border} strokeWidth="0.3" strokeDasharray="1,1"/>
              <text x={LEFT-1} y={y+1.5} textAnchor="end"
                style={{fontFamily:"'DM Mono',monospace", fontSize:"3.5px", fill:palette.inkLight}}>{v}</text>
            </g>
          );
        })}
        {byMonth.map((d,i)=>{
          const barH = maxMonth>0 ? (d.count/maxMonth)*(H-4) : 0;
          const x = LEFT + i*w + w*0.1;
          const bw = w*0.8;
          const active = drillMonth===d.monthNum;
          return (
            <g key={i} style={{cursor:d.count>0?"pointer":"default"}}
               onClick={()=>{ if(d.count>0){ setDrillRating(null); setDrillMonth(drillMonth===d.monthNum?null:d.monthNum); }}}>
              <rect x={x} y={H-barH} width={bw} height={barH}
                fill={d.future?"transparent":active?palette.ink:palette.blue}
                opacity={d.future?0:1} rx="1"/>
              {d.count>0 && !d.future && (
                <text x={x+bw/2} y={H-barH-2.5} textAnchor="middle"
                  style={{fontFamily:"'DM Mono',monospace", fontSize:"3.5px",
                    fill:active?palette.ink:palette.inkLight, fontWeight:active?"bold":"normal"}}>
                  {d.count}
                </text>
              )}
              <text x={x+bw/2} y={H+7} textAnchor="middle"
                style={{fontFamily:"'DM Mono',monospace", fontSize:"3.5px",
                  fill:d.future?palette.border:palette.inkLight}}>
                {d.month}
              </text>
            </g>
          );
        })}
        <line x1={LEFT} y1={H} x2="100" y2={H} stroke={palette.border} strokeWidth="0.5"/>
        <line x1={LEFT} y1="0" x2={LEFT} y2={H} stroke={palette.border} strokeWidth="0.5"/>
      </svg>
    );
  };

  // ── Rating bar chart — clickable ──
  const RatingBarChart = () => {
    const w = (100-LEFT) / ratingDist.length;
    return (
      <svg viewBox={`0 0 100 ${H+BOTTOM}`} style={{width:"100%", overflow:"visible"}}>
        {[0, Math.ceil(maxRating/2), maxRating].filter((v,i,a)=>a.indexOf(v)===i).map(v=>{
          const y = H - (v/maxRating)*(H-4);
          return (
            <g key={v}>
              <line x1={LEFT} y1={y} x2="100" y2={y} stroke={palette.border} strokeWidth="0.3" strokeDasharray="1,1"/>
              <text x={LEFT-1} y={y+1.5} textAnchor="end"
                style={{fontFamily:"'DM Mono',monospace", fontSize:"3.5px", fill:palette.inkLight}}>{v}</text>
            </g>
          );
        })}
        {ratingDist.map((d,i)=>{
          const barH = maxRating>0 ? (d.count/maxRating)*(H-4) : 0;
          const x = LEFT + i*w + w*0.1;
          const bw = w*0.8;
          const active = drillRating===d.r;
          return (
            <g key={i} style={{cursor:d.count>0?"pointer":"default"}}
               onClick={()=>{ if(d.count>0){ setDrillMonth(null); setDrillRating(drillRating===d.r?null:d.r); }}}>
              <rect x={x} y={H-barH} width={bw} height={Math.max(barH,0)}
                fill={active?palette.ink:palette.gold} opacity={d.count>0?1:0.15} rx="1"/>
              {d.count>0 && (
                <text x={x+bw/2} y={H-barH-2.5} textAnchor="middle"
                  style={{fontFamily:"'DM Mono',monospace", fontSize:"3.5px",
                    fill:active?palette.ink:palette.inkLight, fontWeight:active?"bold":"normal"}}>
                  {d.count}
                </text>
              )}
              <text x={x+bw/2} y={H+7} textAnchor="middle"
                style={{fontFamily:"'DM Mono',monospace", fontSize:"3.5px", fill:palette.inkLight}}>
                {d.r}
              </text>
            </g>
          );
        })}
        <line x1={LEFT} y1={H} x2="100" y2={H} stroke={palette.border} strokeWidth="0.5"/>
        <line x1={LEFT} y1="0" x2={LEFT} y2={H} stroke={palette.border} strokeWidth="0.5"/>
      </svg>
    );
  };

  // ── Line chart (pages) ──
  const PagesLineChart = () => {
    const realPts = pagesCum.filter(p=>p.pages!==null);
    const w = (100-LEFT) / 11;
    const toY = (v) => H_LINE - (v/yMax)*(H_LINE-4);
    const pts = pagesCum.map((d,i)=>({
      x: LEFT + i*w,
      y: d.pages!==null ? toY(d.pages) : null,
    }));
    const realPath = pts.filter(p=>p.y!==null).map((p,i)=>`${i===0?"M":"L"}${p.x},${p.y}`).join(" ");
    const area = realPath + (realPts.length>0
      ? ` L${pts[realPts.length-1].x},${H_LINE} L${pts[0].x},${H_LINE} Z` : "");
    const targetY = goalPages>0 ? toY(goalPages) : null;

    return (
      <svg viewBox={`0 0 100 ${H_LINE+BOTTOM}`} style={{width:"100%", overflow:"visible"}}>
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={palette.accent} stopOpacity="0.12"/>
            <stop offset="100%" stopColor={palette.accent} stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Y grid + labels */}
        {yTicks.map(v=>{
          const y = toY(v);
          return (
            <g key={v}>
              <line x1={LEFT} y1={y} x2="100" y2={y} stroke={palette.border} strokeWidth="0.2" strokeDasharray="1,1"/>
              <text x={LEFT-1} y={y+1} textAnchor="end"
                style={{fontFamily:"'DM Mono',monospace", fontSize:"2.8px", fill:palette.inkLight}}>
                {formatN(v)}
              </text>
            </g>
          );
        })}

        {/* Target line */}
        {targetY!==null && (
          <g>
            <line x1={LEFT} y1={targetY} x2="100" y2={targetY}
              stroke={palette.gold} strokeWidth="0.4" strokeDasharray="2,1.5" opacity="0.8"/>
            <text x="100" y={targetY-1.2} textAnchor="end"
              style={{fontFamily:"'DM Mono',monospace", fontSize:"2.8px", fill:palette.gold, opacity:0.8}}>
              obiettivo {formatN(goalPages)}
            </text>
          </g>
        )}

        {/* Area + line */}
        {realPts.length>0 && <path d={area} fill="url(#lineGrad)"/>}
        {realPts.length>0 && <path d={realPath} fill="none" stroke={palette.accent} strokeWidth="0.5" strokeLinejoin="round"/>}

        {/* Dots */}
        {pts.filter(p=>p.y!==null).map((p,i)=>(
          <circle key={i} cx={p.x} cy={p.y} r="0.7" fill={palette.accent}/>
        ))}

        {/* Month labels */}
        {pagesCum.map((d,i)=>(
          <text key={i} x={pts[i].x} y={H_LINE+6} textAnchor="middle"
            style={{fontFamily:"'DM Mono',monospace", fontSize:"2.8px",
              fill:d.future?palette.border:palette.inkLight}}>
            {d.month}
          </text>
        ))}

        <line x1={LEFT} y1={H_LINE} x2="100" y2={H_LINE} stroke={palette.border} strokeWidth="0.4"/>
        <line x1={LEFT} y1="0" x2={LEFT} y2={H_LINE} stroke={palette.border} strokeWidth="0.4"/>
      </svg>
    );
  };

  // ── Horizontal bar ──
  const HBar = ({ label, value, maxVal, color }) => (
    <div style={{marginBottom:10}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
        <span style={{fontFamily:"'Lora', serif", fontSize:13, color:palette.ink,
          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"75%"}}>{label}</span>
        <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight, flexShrink:0}}>{value}</span>
      </div>
      <div style={{height:4, background:palette.tagBg, borderRadius:2}}>
        <div style={{height:"100%", width:`${Math.round(value/maxVal*100)}%`,
          background:color, borderRadius:2, transition:"width 0.4s"}}/>
      </div>
    </div>
  );

  // ── Grafico anni ──
  const YearBarChart = () => {
    if(byYear.length<2) return null;
    const w = (100-LEFT) / byYear.length;
    return (
      <svg viewBox={`0 0 100 ${H+BOTTOM}`} style={{width:"100%", overflow:"visible"}}>
        {[0, Math.ceil(maxYear/2), maxYear].filter((v,i,a)=>a.indexOf(v)===i).map(v=>{
          const y = H - (v/maxYear)*(H-4);
          return (
            <g key={v}>
              <line x1={LEFT} y1={y} x2="100" y2={y} stroke={palette.border} strokeWidth="0.3" strokeDasharray="1,1"/>
              <text x={LEFT-1} y={y+1.5} textAnchor="end"
                style={{fontFamily:"'DM Mono',monospace", fontSize:"3.5px", fill:palette.inkLight}}>{v}</text>
            </g>
          );
        })}
        {byYear.map((d,i)=>{
          const barH = (d.count/maxYear)*(H-4);
          const x = LEFT + i*w + w*0.1;
          const bw = w*0.8;
          return (
            <g key={i}>
              <rect x={x} y={H-barH} width={bw} height={barH} fill={palette.accent} opacity={0.85} rx="1"/>
              {d.count>0&&<text x={x+bw/2} y={H-barH-2.5} textAnchor="middle"
                style={{fontFamily:"'DM Mono',monospace", fontSize:"3.5px", fill:palette.inkLight}}>{d.count}</text>}
              <text x={x+bw/2} y={H+7} textAnchor="middle"
                style={{fontFamily:"'DM Mono',monospace", fontSize:"3px", fill:palette.inkLight}}>{d.year}</text>
            </g>
          );
        })}
        <line x1={LEFT} y1={H} x2="100" y2={H} stroke={palette.border} strokeWidth="0.5"/>
        <line x1={LEFT} y1="0" x2={LEFT} y2={H} stroke={palette.border} strokeWidth="0.5"/>
      </svg>
    );
  };

  // ── Drilldown panel ──
  const DrillPanel = () => {
    if(drillBooks.length===0) return null;
    const title = drillMonth!==null
      ? `${MONTHS[drillMonth-1]} ${scopeYear} — ${drillBooks.length} ${drillBooks.length===1?"libro":"libri"}`
      : `Voto ${drillRating}★ — ${drillBooks.length} ${drillBooks.length===1?"libro":"libri"}`;
    return (
      <div style={{background:palette.tagBg, border:`1px solid ${palette.border}`,
        padding:"20px 24px", borderRadius:2}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
          <div style={{fontFamily:"'DM Mono', monospace", fontSize:11, letterSpacing:"0.08em", color:palette.inkLight}}>
            {title}
          </div>
          <span onClick={()=>{setDrillMonth(null);setDrillRating(null);}}
            style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.accent,
              cursor:"pointer", opacity:0.7}}>✕ chiudi</span>
        </div>
        <div style={{display:"flex", flexDirection:"column", gap:8}}>
          {drillBooks.map(b=>(
            <div key={b.id} style={{display:"flex", gap:10, alignItems:"center",
              background:palette.paper, padding:"8px 12px", border:`1px solid ${palette.border}`}}>
              {b.cover && <img src={b.cover} alt={b.title}
                style={{width:28, height:40, objectFit:"cover", borderRadius:1, flexShrink:0}}/>}
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontFamily:"'Playfair Display', serif", fontSize:14, fontWeight:600,
                  color:palette.ink, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{b.title}</div>
                <div style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:12, color:palette.inkLight}}>
                  {b.author}{b.rating>0?` · ${b.rating}★`:""}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if(readBooks.length===0 && allRead.length===0) return (
    <div style={{textAlign:"center", padding:"80px 40px", fontFamily:"'Playfair Display', serif",
      fontStyle:"italic", color:palette.inkLight, fontSize:20}}>
      Aggiungi qualche libro letto per vedere le statistiche.
    </div>
  );

  return (
    <div style={{maxWidth:900, margin:"0 auto", padding:"32px 40px", display:"flex", flexDirection:"column", gap:20}}>

      {/* KPI riga in cima */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12}}>
        {[
          {label:"LIBRI LETTI", value:allRead.length},
          {label:"PAGINE TOTALI", value:totalPages>0?totalPages.toLocaleString("it-IT"):"—"},
          {label:"MEDIA VOTI", value:avgRating?`${avgRating} ★`:"—"},
          {label:"AUTORI DISTINTI", value:uniqueAuthors},
        ].map(({label,value})=>(
          <div key={label} style={{background:palette.paper, border:`1px solid ${palette.border}`, padding:"16px 20px"}}>
            <div style={{fontFamily:"'DM Mono',monospace", fontSize:9, color:palette.inkLight, letterSpacing:"0.1em", marginBottom:8}}>{label}</div>
            <div style={{fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:600, color:palette.ink}}>{value}</div>
          </div>
        ))}
      </div>

      {/* Selettore anno */}
      <div style={{display:"flex", alignItems:"center", gap:8}}>
        <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight, letterSpacing:"0.08em"}}>ANNO:</span>
        {[...new Set([currentYear,...years])].sort((a,b)=>b-a).map(y=>(
          <span key={y} onClick={()=>{ setStatsYear(y); setDrillMonth(null); setDrillRating(null); }}
            style={{fontFamily:"'DM Mono', monospace", fontSize:11, cursor:"pointer", userSelect:"none",
              color:statsYear===y?palette.ink:palette.inkLight,
              textDecoration:statsYear===y?"underline":"none"}}>{y}</span>
        ))}
        <span style={{fontFamily:"'DM Mono', monospace", fontSize:10, color:palette.inkLight, opacity:0.5, marginLeft:4}}>
          (clicca le barre per vedere i libri)
        </span>
      </div>

      {/* Riga 1: due grafici a barre */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
        {card(<>
          {sectionTitle(`LIBRI LETTI PER MESE — ${scopeYear}`)}
          {readBooks.length>0
            ? <MonthBarChart/>
            : <div style={{fontFamily:"'Lora',serif",fontStyle:"italic",fontSize:13,color:palette.inkLight,padding:"20px 0"}}>Nessun libro letto nel {scopeYear}.</div>}
        </>)}
        {card(<>
          {sectionTitle("DISTRIBUZIONE VOTI — TUTTI GLI ANNI")}
          {allRead.filter(b=>b.rating>0).length>0
            ? <RatingBarChart/>
            : <div style={{fontFamily:"'Lora',serif",fontStyle:"italic",fontSize:13,color:palette.inkLight,padding:"20px 0"}}>Nessun voto inserito.</div>}
        </>)}
      </div>

      {/* Drilldown panel */}
      <DrillPanel/>

      {/* Grafico anni — solo se ci sono almeno 2 anni */}
      {byYear.length>=2 && card(<>
        {sectionTitle("LIBRI LETTI PER ANNO")}
        <YearBarChart/>
      </>)}

      {/* Riga 2: linea cumulativa pagine */}
      {card(<>
        {sectionTitle(`PAGINE LETTE — PROGRESSIONE ${scopeYear}`)}
        {lastRealPages>0
          ? <PagesLineChart/>
          : <div style={{fontFamily:"'Lora',serif",fontStyle:"italic",fontSize:13,color:palette.inkLight,padding:"20px 0"}}>Nessuna pagina registrata nel {scopeYear}.</div>}
        {goalPages>0 && lastRealPages>0 && (
          <div style={{fontFamily:"'DM Mono', monospace", fontSize:10, color:palette.inkLight,
            marginTop:10, opacity:0.6}}>
            {lastRealPages.toLocaleString("it-IT")} / {goalPages.toLocaleString("it-IT")} pagine
            · {Math.round(lastRealPages/goalPages*100)}% dell'obiettivo
          </div>
        )}
      </>)}

      {/* Riga 3: classifiche */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
        {card(<>
          {sectionTitle("AUTORI PIÙ LETTI — TUTTI GLI ANNI")}
          {topAuthors.length>0
            ? topAuthors.map(([name,count])=><HBar key={name} label={name} value={count} maxVal={maxAuthor} color={palette.blue}/>)
            : <div style={{fontFamily:"'Lora',serif",fontStyle:"italic",fontSize:13,color:palette.inkLight}}>Nessun autore inserito.</div>}
        </>)}
        {card(<>
          {sectionTitle("GENERI & TEMI — TUTTI GLI ANNI")}
          {topTags.length>0
            ? topTags.map(([name,count])=><HBar key={name} label={name} value={count} maxVal={maxTag} color={palette.accent}/>)
            : <div style={{fontFamily:"'Lora',serif",fontStyle:"italic",fontSize:13,color:palette.inkLight}}>Nessun tag inserito.</div>}
        </>)}
      </div>

      {/* Riga 4: editori */}
      {topPublishers.length>0 && card(<>
        {sectionTitle("EDITORI PIÙ PRESENTI — TUTTI GLI ANNI")}
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 32px"}}>
          {topPublishers.map(([name,count])=><HBar key={name} label={name} value={count} maxVal={maxPub} color={palette.green}/>)}
        </div>
      </>)}

    </div>
  );
}

// ─── Book card ────────────────────────────────────────────────────────

function BookCard({ book, onEdit, onDelete, compact=false, collections=[], onGoToCollection }) {
  const [expanded, setExpanded] = useState(false);
  const status = book.status||"letto";
  const sc = STATUS_CONFIG[status];
  const borderColor = status==="letto"
    ? (book.rating>=4?palette.gold:book.rating>=2?palette.accent:palette.border)
    : status==="in corso" ? palette.blue : palette.border;
  const readDateStr = book.readMonth&&book.readYear
    ? `${MONTHS[book.readMonth-1]} ${book.readYear}`
    : book.readYear ? `${book.readYear}` : null;

  const bookCollections = collections.filter(c => c.bookIds?.includes(book.id));

  return (
    <div style={{background:palette.paper, border:`1px solid ${palette.border}`,
      borderLeft:`4px solid ${borderColor}`, cursor:"pointer", transition:"box-shadow 0.2s",
      boxShadow:expanded?"0 8px 32px rgba(26,18,8,0.12)":"0 1px 4px rgba(26,18,8,0.06)",
    }} onClick={()=>setExpanded(!expanded)}>

      {/* Collapsed row */}
      <div style={{display:"flex", gap:12, padding:"12px 16px", alignItems:"center"}}>
        {book.cover ? (
          <img src={book.cover} alt={book.title}
            style={{width:42, height:60, objectFit:"cover", borderRadius:1, flexShrink:0, border:`1px solid ${palette.border}`}}/>
        ) : (
          <div style={{width:42, height:60, flexShrink:0, background:palette.tagBg,
            display:"flex", alignItems:"center", justifyContent:"center", border:`1px solid ${palette.border}`, borderRadius:1}}>
            <span style={{fontSize:16, opacity:0.3}}>&#128214;</span>
          </div>
        )}
        <div style={{flex:1, minWidth:0}}>
          <div style={{fontFamily:"'Playfair Display', serif", fontSize:15, fontWeight:600, color:palette.ink, lineHeight:1.3,
            display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden", marginBottom:3}}>
            {book.title}
          </div>
          <div style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:12, color:palette.inkLight,
            overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", marginBottom:4}}>
            {book.author}
          </div>
          <div style={{display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
            <span style={{fontFamily:"'DM Mono', monospace", fontSize:10, color:sc.color,
              border:`1px solid ${sc.color}`, padding:"1px 5px", borderRadius:2, flexShrink:0, opacity:0.85}}>
              {sc.dot} {sc.label}
            </span>
            {status==="letto" && book.rating>0 && <StarRating value={book.rating} readOnly/>}
            {book.source?.type==='buddy' && <span title="Suggerito dal Buddy"
              style={{fontSize:11, color:"#9B59B6", flexShrink:0}}>&#128302;</span>}
          </div>
        </div>
        <span style={{fontSize:11, color:palette.inkLight, flexShrink:0, opacity:0.4, userSelect:"none"}}>
          {expanded ? "â–²" : "â–¼"}
        </span>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div style={{borderTop:`1px solid ${palette.border}`, padding:"12px 16px 16px"}}
          onClick={e=>e.stopPropagation()}>

          {/* Full details */}
          <div style={{marginBottom:12}}>
            {book.originalTitle && (
              <div style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight, marginBottom:4, opacity:0.7}}>
                {book.originalTitle}
              </div>
            )}
            <div style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:13, color:palette.inkLight, marginBottom:8}}>
              {book.author}{book.publisher?` \u2014 ${book.publisher}`:""}{book.year?` (${book.year})`:""}
            </div>
            <div style={{display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:6}}>
              {status==="letto" && <StarRating value={book.rating} readOnly/>}
              {status==="letto" && book.rating>0 && <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight}}>{book.rating}/5</span>}
              {book.pages && <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight}}>{parseInt(book.pages).toLocaleString("it-IT")} pp.</span>}
              {readDateStr && <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight}}>{readDateStr}</span>}
            </div>
            {book.tags.length>0 && <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:6}}>{book.tags.map(t=><Tag key={t} label={t}/>)}</div>}
            {bookCollections.length>0 && (
              <div style={{display:"flex", gap:4, flexWrap:"wrap"}}>
                {bookCollections.map(c=>(
                  <span key={c.id}
                    onClick={e=>{ e.stopPropagation(); onGoToCollection?.(c); }}
                    title={`Vai alla collezione: ${c.name}`}
                    style={{display:"inline-flex", alignItems:"center", gap:4,
                      padding:"2px 8px", borderRadius:2, cursor:"pointer",
                      fontFamily:"'DM Mono', monospace", fontSize:10, letterSpacing:"0.04em",
                      background:c.color+"22", color:c.color,
                      border:`1px solid ${c.color}66`, userSelect:"none"}}>
                    {c.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Buddy source info */}
          {book.source?.type==='buddy' && (
            <div style={{marginBottom:10, padding:"7px 11px", borderRadius:6,
              background:"#f5f0fa", border:"1px solid #d9c8f0",
              display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap"}}>
              <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:"#7D3C98"}}>
                &#128302; Suggerito da Footnote
                {book.source.bookTitle && ` \u2014 durante la lettura di "${book.source.bookTitle}"`}
              </span>
              {book.source.bookId && <button
                onClick={e=>{ e.stopPropagation(); window.open('https://footnote.commonplaceapp.org?book='+book.source.bookId,'_blank'); }}
                style={{...btnStyle("ghost"), fontSize:11, padding:"2px 8px", color:"#7D3C98", border:"1px solid #d9c8f0", whiteSpace:"nowrap"}}>
                Apri scheda
              </button>}
            </div>
          )}
          {book.source?.reason && <div style={{fontFamily:"'Lora', serif", fontSize:13, color:palette.inkLight,
            lineHeight:1.6, fontStyle:"italic", marginBottom:10}}>
            "{book.source.reason}"
          </div>}
          {book.notes && <div style={{fontFamily:"'Lora', serif", fontSize:14, color:palette.inkLight,
            lineHeight:1.7, fontStyle:"italic", marginBottom:12}}>
            "{book.notes}"
          </div>}

          {/* Action buttons */}
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            <button onClick={e=>{
              e.stopPropagation();
              try {
                const rbBooks = JSON.parse(localStorage.getItem('rb_books')||'[]');
                const already = rbBooks.find(b=>
                  b.title.toLowerCase()===book.title.toLowerCase()&&
                  b.author.toLowerCase()===book.author.toLowerCase()
                );
                if(!already){
                  const newEntry = {
                    id:'bs_'+book.id, title:book.title, author:book.author,
                    edition:book.publisher||'', language:'italiano',
                    addedAt:new Date().toISOString(), hasFile:false,
                    _fromBookShelf:true, _bsStatus:book.status,
                    data:null, chat:[], collectionIds:[]
                  };
                  safeLsSet('rb_books',JSON.stringify([newEntry,...rbBooks]));
                }
              } catch(err){}
              window.open('https://footnote.commonplaceapp.org?book='+book.id,'_blank');
            }} style={{...btnStyle("ghost"),fontSize:12,padding:"5px 12px"}}>Apri in FN</button>
            <button onClick={e=>{e.stopPropagation();onEdit(book);}}
              style={{...btnStyle("ghost"),fontSize:12,padding:"5px 12px"}}>Modifica</button>
            <button onClick={e=>{e.stopPropagation();onDelete(book.id);}}
              style={{...btnStyle("danger"),fontSize:12,padding:"5px 12px"}}>Elimina</button>
          </div>
          {book._readingBuddyId && <button
            onClick={e=>{ e.stopPropagation(); window.open('https://footnote.commonplaceapp.org?book='+book._readingBuddyId,'_blank'); }}
            style={{...btnStyle("outline"), fontSize:12, padding:"4px 12px", marginTop:8}}>
            + Apri scheda completa in Footnote
          </button>}
          {book.status==='wishlist' && <button
            onClick={e=>{ e.stopPropagation(); onEdit({...book, status:'da leggere'}); }}
            style={{...btnStyle("primary"), fontSize:12, padding:"5px 14px", marginTop:8}}>
            Ho il libro â€” sposta in "Da leggere"
          </button>}
        </div>
      )}
    </div>
  );
}

// ─── Book grid card ───────────────────────────────────────────────────

function BookGridCard({ book, onEdit, onDelete, collections=[], onGoToCollection }) {
  const [showNotes, setShowNotes] = useState(false);
  const status = book.status||"letto";
  const sc = STATUS_CONFIG[status];
  const borderColor = status==="letto"
    ? (book.rating>=4?palette.gold:book.rating>=2?palette.accent:palette.border)
    : status==="in corso" ? palette.blue : palette.border;
  const bookCollections = collections.filter(c => c.bookIds?.includes(book.id));

  return (
    <div style={{background:palette.paper, border:`1px solid ${palette.border}`,
      borderTop:`3px solid ${borderColor}`, display:"flex", flexDirection:"column",
      transition:"box-shadow 0.2s", boxShadow:"0 1px 4px rgba(26,18,8,0.06)",
      position:"relative", cursor: book.notes ? "pointer" : "default"}}
      onClick={()=>{ if(book.notes) setShowNotes(s=>!s); }}>

      {/* Copertina */}
      <div style={{position:"relative", paddingTop:"145%", background:palette.tagBg, flexShrink:0}}>
        {book.cover ? (
          <img src={book.cover} alt={book.title}
            style={{position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover"}}/>
        ) : (
          <div style={{position:"absolute", inset:0, display:"flex", alignItems:"center",
            justifyContent:"center", flexDirection:"column", gap:6}}>
            <span style={{fontSize:32, opacity:0.2}}>📖</span>
          </div>
        )}
        {/* Stato badge */}
        <span style={{position:"absolute", top:6, right:6,
          fontFamily:"'DM Mono', monospace", fontSize:9, color:"#fff",
          background:sc.color, padding:"2px 5px", borderRadius:2, opacity:0.92}}>
          {sc.dot}
        </span>
        {/* Badge Buddy suggerito */}
        {book.source?.type==='buddy' && (
          <span title={`Suggerito dal Buddy · ${book.source.bookTitle||''}`}
            style={{position:"absolute", top:6, left:6, fontSize:12, color:"#9B59B6",
              background:"rgba(255,255,255,0.92)", borderRadius:"50%", width:18, height:18,
              display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"0 1px 3px rgba(0,0,0,0.15)"}}>❧</span>
        )}
        {/* Note badge */}
        {book.notes && (
          <span style={{position:"absolute", bottom:6, right:6, fontSize:10, opacity:0.7}}
            title="Clicca per leggere le note">💬</span>
        )}
      </div>

      {/* Info */}
      <div style={{padding:"10px 10px 8px", flex:1, display:"flex", flexDirection:"column", gap:4}}>
        <div style={{fontFamily:"'Playfair Display', serif", fontSize:13, fontWeight:600,
          color:palette.ink, lineHeight:1.3,
          display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden"}}>
          {book.title}
        </div>
        <div style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:11,
          color:palette.inkLight, lineHeight:1.3,
          display:"-webkit-box", WebkitLineClamp:1, WebkitBoxOrient:"vertical", overflow:"hidden"}}>
          {book.author}
        </div>
        {status==="letto" && book.rating>0 && (
          <div style={{marginTop:2}}><StarRating value={book.rating} readOnly/></div>
        )}
        {bookCollections.length>0 && (
          <div style={{display:"flex", gap:4, flexWrap:"wrap", marginTop:2}}>
            {bookCollections.map(c=>(
              <span key={c.id} onClick={e=>{ e.stopPropagation(); onGoToCollection?.(c); }}
                title={c.name}
                style={{display:"inline-flex", alignItems:"center", gap:3, maxWidth:"100%",
                  cursor:"pointer", fontFamily:"'DM Mono', monospace", fontSize:9,
                  letterSpacing:"0.03em", color:c.color, userSelect:"none"}}>
                <span style={{width:7, height:7, borderRadius:"50%", background:c.color,
                  flexShrink:0, display:"inline-block"}}/>
                <span style={{overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:90}}>
                  {c.name}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Note overlay */}
      {showNotes && book.notes && (
        <div style={{position:"absolute", inset:0, background:"rgba(26,18,8,0.88)",
          display:"flex", flexDirection:"column", padding:12, zIndex:10}}
          onClick={e=>{ e.stopPropagation(); setShowNotes(false); }}>
          <div style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:11,
            color:"rgba(253,250,244,0.9)", lineHeight:1.6, overflow:"auto", flex:1}}>
            "{book.notes}"
          </div>
          <div style={{fontFamily:"'DM Mono', monospace", fontSize:9, color:"rgba(253,250,244,0.4)",
            marginTop:8, textAlign:"center"}}>clicca per chiudere</div>
        </div>
      )}

      {/* Azioni */}
      <div style={{position:"absolute", top:6, left:6, display:"flex", gap:4}}>
        <button onClick={e=>{e.stopPropagation();onEdit(book);}}
          style={{...btnStyle("ghost"), padding:"3px 6px", fontSize:11,
            background:"rgba(253,250,244,0.92)", backdropFilter:"blur(2px)"}}>✎</button>
        <button onClick={e=>{e.stopPropagation();onDelete(book.id);}}
          style={{...btnStyle("danger"), padding:"3px 6px", fontSize:11,
            background:"rgba(253,250,244,0.92)", backdropFilter:"blur(2px)"}}>✕</button>
      </div>
    </div>
  );
}

// ─── Book form ────────────────────────────────────────────────────────

const emptyBook = { title:"", originalTitle:"", author:"", publisher:"", year:"", pages:"",
  currentPage:"", readMonth:"", readYear:"", rating:0, tags:[], notes:"", cover:"", isbn:"", status:"da leggere" };

function BookForm({ initial, onSave, onCancel, allTags }) {
  const [form, setForm]       = useState(initial || emptyBook);
  const [tagInput, setTagInput]             = useState("");
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [tagWarnings, setTagWarnings]       = useState([]);
  const [coverErr, setCoverErr]             = useState(false);
  const [olQuery, setOlQuery]               = useState("");
  const [olResults, setOlResults]           = useState([]);
  const [olLoading, setOlLoading]           = useState(false);
  const olTimer = useRef(null);

  function set(k,v) { setForm(f=>({...f,[k]:v})); }

  // cp-tags: autocomplete + fuzzy warning mentre si digita
  useEffect(() => {
    const q = tagInput.trim();
    if (!q || !window.CpTags) { setTagSuggestions([]); setTagWarnings([]); return; }
    setTagSuggestions(window.CpTags.suggestTags(q, 6).filter(t => !form.tags.includes(t)));
    setTagWarnings(window.CpTags.warnSimilar(q).filter(t => !form.tags.includes(t)));
  }, [tagInput]);

  function addTags(raw) {
    const t = raw.split(",").map(t=>t.trim().toLowerCase()).filter(t=>t&&!form.tags.includes(t));
    if (t.length) set("tags",[...form.tags,...t]);
    setTagInput("");
    setTagSuggestions([]);
    setTagWarnings([]);
  }

  // Debounced Open Library search
  useEffect(()=>{
    clearTimeout(olTimer.current);
    if (!olQuery.trim()) { setOlResults([]); return; }
    olTimer.current = setTimeout(async ()=>{
      setOlLoading(true);
      try { setOlResults(await searchOpenLibrary(olQuery)); }
      catch { setOlResults([]); }
      setOlLoading(false);
    }, 500);
    return ()=>clearTimeout(olTimer.current);
  },[olQuery]);

  function applyOlResult(r) {
    setForm(f=>({...f, title:r.title||f.title, author:r.author||f.author,
      publisher:r.publisher||f.publisher, year:r.year||f.year,
      isbn:r.isbn||f.isbn, cover:r.cover||f.cover }));
    setOlQuery(""); setOlResults([]);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({length:30},(_,i)=>currentYear-i);

  return (
    <div style={{background:palette.paper, border:`1px solid ${palette.border}`, padding:28}}>
      <div style={{fontFamily:"'Playfair Display', serif", fontSize:20, fontWeight:700, color:palette.ink, marginBottom:20}}>
        {initial?.id ? "Modifica libro" : "Aggiungi un libro"}
      </div>

      {/* Status */}
      <div style={{marginBottom:20}}>
        {fieldLabel("STATO")}
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          {Object.entries(STATUS_CONFIG).map(([key,cfg])=>(
            <button key={key} onClick={()=>{
              set("status",key);
              if(key!=="in corso") set("currentPage","");
            }} style={{
              ...btnStyle("outline"), padding:"7px 16px",
              background:form.status===key?palette.ink:"transparent",
              color:form.status===key?palette.paper:palette.inkLight,
              borderColor:form.status===key?palette.ink:palette.border,
            }}>{cfg.dot} {cfg.label}</button>
          ))}
        </div>
      </div>

      {/* Open Library search — ATTIVO */}
      <div style={{marginBottom:20, padding:16, background:palette.tagBg, border:`1px solid ${palette.border}`}}>
        {fieldLabel("CERCA SU OPEN LIBRARY","cerca per titolo, autore o ISBN")}
        <input style={inputStyle({marginBottom:8})} value={olQuery}
          onChange={e=>setOlQuery(e.target.value)}
          placeholder="es. «Il nome della rosa» o «Umberto Eco»"/>
        {olLoading && <div style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight, padding:"4px 0"}}>Ricerca in corso…</div>}
        {olResults.length>0 && (
          <div style={{display:"flex", flexDirection:"column", gap:4, maxHeight:260, overflowY:"auto"}}>
            {olResults.map((r,i)=>(
              <div key={i} onClick={()=>applyOlResult(r)}
                style={{display:"flex", alignItems:"center", gap:10, padding:"8px 10px",
                  background:palette.paper, border:`1px solid ${palette.border}`, cursor:"pointer", borderRadius:1}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=palette.ink}
                onMouseLeave={e=>e.currentTarget.style.borderColor=palette.border}>
                {r.cover && <img src={r.cover} alt="" style={{width:28,height:40,objectFit:"cover",flexShrink:0,borderRadius:1}}/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Playfair Display', serif", fontSize:13, fontWeight:600, color:palette.ink}}>{r.title}</div>
                  <div style={{fontFamily:"'Lora', serif", fontStyle:"italic", fontSize:12, color:palette.inkLight}}>
                    {r.author}{r.year?` (${r.year})`:""}{r.publisher?` — ${r.publisher}`:""}
                  </div>
                </div>
                <span style={{fontFamily:"'DM Mono', monospace", fontSize:10, color:palette.inkLight, flexShrink:0}}>← usa</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main fields */}
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14}}>
        <div style={{gridColumn:"1/-1"}}>{fieldLabel("TITOLO *")}<input style={inputStyle()} value={form.title} onChange={e=>set("title",e.target.value)} placeholder="Titolo del libro"/></div>
        <div style={{gridColumn:"1/-1"}}>{fieldLabel("TITOLO ORIGINALE","facoltativo")}<input style={inputStyle()} value={form.originalTitle||""} onChange={e=>set("originalTitle",e.target.value)} placeholder="es. One Hundred Years of Solitude"/></div>
        <div>{fieldLabel("AUTORE *")}<input style={inputStyle()} value={form.author} onChange={e=>set("author",e.target.value)} placeholder="Nome Cognome"/></div>
        <div>{fieldLabel("EDITORE")}<input style={inputStyle()} value={form.publisher} onChange={e=>set("publisher",e.target.value)} placeholder="Casa editrice"/></div>
        <div>{fieldLabel("ANNO PUBBLICAZIONE")}<input style={inputStyle()} value={form.year} onChange={e=>set("year",e.target.value)} placeholder="2024"/></div>
        <div>{fieldLabel("PAGINE TOTALI","facoltativo")}<input style={inputStyle()} type="number" min="1" value={form.pages} onChange={e=>set("pages",e.target.value)} placeholder="es. 320"/></div>
        {form.status==="in corso" && (
          <div>{fieldLabel("PAGINA CORRENTE","per seguire il progresso")}<input style={inputStyle()} type="number" min="1" value={form.currentPage||""} onChange={e=>set("currentPage",e.target.value)} placeholder="es. 180"/></div>
        )}
        <div>{fieldLabel("MESE DI LETTURA","facoltativo")}
          <select style={inputStyle({cursor:"pointer"})} value={form.readMonth}
            onChange={e=>set("readMonth",e.target.value?parseInt(e.target.value):"")}>
            <option value="">— mese —</option>
            {MONTHS.map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>{fieldLabel("ANNO DI LETTURA","facoltativo")}
          <select style={inputStyle({cursor:"pointer"})} value={form.readYear}
            onChange={e=>set("readYear",e.target.value?parseInt(e.target.value):"")}>
            <option value="">— anno —</option>
            {yearOptions.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{gridColumn:"1/-1"}}>
          {fieldLabel("URL COPERTINA","facoltativo — o usa Open Library sopra")}
          <div style={{display:"flex", gap:10, alignItems:"flex-start"}}>
            <input style={inputStyle()} value={form.cover}
              onChange={e=>{set("cover",e.target.value);setCoverErr(false);}} placeholder="https://…"/>
            {form.cover&&!coverErr && <img src={form.cover} alt="preview" onError={()=>setCoverErr(true)}
              style={{width:44,height:63,objectFit:"cover",borderRadius:1,border:`1px solid ${palette.border}`,flexShrink:0}}/>}
            {coverErr && <div style={{width:44,height:63,flexShrink:0,background:palette.tagBg,display:"flex",alignItems:"center",
              justifyContent:"center",border:`1px solid ${palette.border}`,borderRadius:1,fontSize:10,
              fontFamily:"'DM Mono', monospace",color:palette.accent,textAlign:"center",padding:4}}>URL non valido</div>}
          </div>
        </div>
        {form.status==="letto" && <div style={{gridColumn:"1/-1"}}>
          {fieldLabel("VOTO")}
          <div style={{padding:"6px 0"}}><StarRating value={form.rating} onChange={v=>set("rating",v)}/></div>
        </div>}
      </div>

      {/* Tags */}
      <div style={{marginBottom:14}}>
        {fieldLabel("TAG","separali con virgola")}
        <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:6}}>
          {form.tags.map(t=><Tag key={t} label={t} onRemove={()=>set("tags",form.tags.filter(x=>x!==t))}/>)}
          {/* Suggerimenti cp-tags (quando si digita) o allTags fallback (quando campo vuoto) */}
          {tagInput.trim()
            ? tagSuggestions.map(t=>(
                <span key={t} onClick={()=>{ set("tags",[...form.tags,t]); setTagInput(""); }} style={tagSuggestionStyle}>↩ {t}</span>
              ))
            : allTags.filter(t=>!form.tags.includes(t)).map(t=>(
                <span key={t} onClick={()=>set("tags",[...form.tags,t])} style={tagSuggestionStyle}>+ {t}</span>
              ))
          }
        </div>
        <div style={{display:"flex", gap:6}}>
          <input style={inputStyle({flex:1})} value={tagInput} placeholder="es. narrativa, romanzo"
            onChange={e=>setTagInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addTags(tagInput);}}}/>
          <button style={btnStyle("outline")} onClick={()=>addTags(tagInput)}>Aggiungi</button>
        </div>
        {/* Fuzzy warning: tag simili già nel registry */}
        {tagWarnings.length > 0 && (
          <div style={{marginTop:6, fontSize:12, color:"#C8421A", fontFamily:"'DM Mono', monospace"}}>
            ⚠ simile a: {tagWarnings.map((w,i)=>(
              <span key={w}>
                <span style={{cursor:"pointer", textDecoration:"underline"}}
                  onClick={()=>{ set("tags",[...form.tags,w]); setTagInput(""); }}
                  title="Usa questo tag esistente">{w}</span>
                {i < tagWarnings.length-1 ? ", " : ""}
              </span>
            ))} — <span style={{opacity:0.7}}>clicca per usare quello esistente, o continua per crearne uno nuovo</span>
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{marginBottom:20}}>
        {fieldLabel("NOTE / RECENSIONE")}
        <textarea style={{...inputStyle(), resize:"vertical", minHeight:80}} value={form.notes}
          onChange={e=>set("notes",e.target.value)} placeholder="Impressioni, citazioni, pensieri…"/>
      </div>

      <div style={{display:"flex", gap:10, justifyContent:"flex-end"}}>
        <button style={btnStyle("outline")} onClick={onCancel}>Annulla</button>
        <button style={btnStyle("primary")}
          onClick={()=>{if(!form.title.trim()||!form.author.trim())return; onSave({...form,id:form.id||(Date.now().toString(36)+Math.random().toString(36).slice(2,6))})}}>          {initial?.id ? "Salva modifiche" : "Aggiungi libro"}
        </button>
      </div>
    </div>
  );
}

// ─── Collection components ────────────────────────────────────────────

function CollectionForm({ initial, onSave, onCancel }) {
  const [name, setName]   = useState(initial?.name||"");
  const [desc, setDesc]   = useState(initial?.description||"");
  const [color, setColor] = useState(initial?.color||COLLECTION_COLORS[0]);
  return (
    <div style={{background:palette.paper, border:`1px solid ${palette.border}`, padding:24, marginBottom:24}}>
      <div style={{fontFamily:"'Playfair Display', serif", fontSize:18, fontWeight:700, color:palette.ink, marginBottom:18}}>
        {initial?.id ? "Modifica collezione" : "Nuova collezione"}
      </div>
      <div style={{marginBottom:14}}>{fieldLabel("NOME *")}<input style={inputStyle()} value={name} onChange={e=>setName(e.target.value)} placeholder="es. Canone del Novecento Italiano"/></div>
      <div style={{marginBottom:14}}>{fieldLabel("DESCRIZIONE","facoltativo")}
        <textarea style={{...inputStyle(), resize:"vertical", minHeight:64}} value={desc}
          onChange={e=>setDesc(e.target.value)} placeholder="Una breve nota sulla collezione…"/>
      </div>
      <div style={{marginBottom:20}}>
        {fieldLabel("COLORE")}
        <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
          {COLLECTION_COLORS.map(c=>(
            <div key={c} onClick={()=>setColor(c)} style={{width:28,height:28,borderRadius:"50%",background:c,cursor:"pointer",
              boxShadow:color===c?`0 0 0 3px ${palette.paper}, 0 0 0 5px ${c}`:"none",transition:"box-shadow 0.15s"}}/>
          ))}
        </div>
      </div>
      <div style={{display:"flex", gap:10, justifyContent:"flex-end"}}>
        <button style={btnStyle("outline")} onClick={onCancel}>Annulla</button>
        <button style={btnStyle("primary")}
          onClick={()=>{if(!name.trim())return;onSave({name,description:desc,color,id:initial?.id||(Date.now().toString(36)+Math.random().toString(36).slice(2,6)),bookIds:initial?.bookIds||[]});}}>
          {initial?.id ? "Salva" : "Crea collezione"}
        </button>
      </div>
    </div>
  );
}

function CollectionCard({ col, books, onClick, onEdit, onDelete }) {
  const colBooks = books.filter(b=>col.bookIds?.includes(b.id));
  const covers   = colBooks.filter(b=>b.cover).slice(0,3).map(b=>b.cover);
  return (
    <div onClick={onClick} style={{background:palette.paper, border:`1px solid ${palette.border}`,
      borderLeft:`5px solid ${col.color}`, padding:"20px 24px", cursor:"pointer",
      transition:"box-shadow 0.2s", boxShadow:"0 1px 4px rgba(26,18,8,0.06)"}}>
      <div style={{display:"flex", alignItems:"flex-start", gap:16}}>
        <div style={{display:"flex", flexDirection:"row", flexShrink:0}}>
          {covers.length>0 ? covers.map((c,i)=>(
            <img key={i} src={c} alt="" style={{width:32,height:46,objectFit:"cover",borderRadius:1,
              border:`1px solid ${palette.border}`,marginLeft:i===0?0:-10,boxShadow:"1px 1px 3px rgba(0,0,0,0.15)"}}/>
          )) : (
            <div style={{width:32,height:46,background:palette.tagBg,borderRadius:1,border:`1px solid ${palette.border}`,
              display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontSize:14,opacity:0.3}}>📚</span>
            </div>
          )}
        </div>
        <div style={{flex:1}}>
          <div style={{fontFamily:"'Playfair Display', serif",fontSize:18,fontWeight:600,color:palette.ink,marginBottom:4}}>{col.name}</div>
          {col.description && <div style={{fontFamily:"'Lora', serif",fontStyle:"italic",fontSize:13,color:palette.inkLight,marginBottom:8}}>{col.description}</div>}
          <div style={{fontFamily:"'DM Mono', monospace",fontSize:11,color:palette.inkLight}}>
            {colBooks.length} {colBooks.length===1?"libro":"libri"}
          </div>
        </div>
        <div style={{display:"flex", gap:6, flexShrink:0}}>
          <button onClick={e=>{e.stopPropagation();onEdit(col);}} style={btnStyle("ghost")}>✎</button>
          <button onClick={e=>{e.stopPropagation();onDelete(col.id);}} style={btnStyle("danger")}>✕</button>
        </div>
      </div>
    </div>
  );
}

function CollectionDetail({ col, books, onBack, onEditCollection, onToggleBook, onEditBook, onDeleteBook }) {
  const colBooks = books.filter(b=>col.bookIds?.includes(b.id));
  const notInCol = books.filter(b=>!col.bookIds?.includes(b.id));
  const [addSearch, setAddSearch] = useState("");
  const filtered = notInCol.filter(b=>{
    const q=addSearch.toLowerCase();
    return !q||b.title.toLowerCase().includes(q)||b.author.toLowerCase().includes(q);
  });

  return (
    <div>
      <div style={{borderLeft:`6px solid ${col.color}`,paddingLeft:20,marginBottom:28}}>
        <button onClick={onBack} style={{...btnStyle("ghost"),marginBottom:12,fontSize:11}}>← Tutte le collezioni</button>
        <div style={{fontFamily:"'Playfair Display', serif",fontSize:26,fontWeight:700,color:palette.ink,marginBottom:4}}>{col.name}</div>
        {col.description&&<div style={{fontFamily:"'Lora', serif",fontStyle:"italic",fontSize:15,color:palette.inkLight,marginBottom:8}}>{col.description}</div>}
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          <span style={{fontFamily:"'DM Mono', monospace",fontSize:11,color:palette.inkLight}}>
            {colBooks.length} {colBooks.length===1?"libro":"libri"}
            {colBooks.filter(b=>b.status==="letto"||!b.status).length>0 &&
              ` · ${colBooks.filter(b=>b.status==="letto"||!b.status).length} letti`}
          </span>
          <button onClick={()=>onEditCollection(col)} style={{...btnStyle("ghost"),fontSize:11}}>✎ Modifica</button>
        </div>
      </div>

      {colBooks.length>0 ? (
        <div style={{marginBottom:32}}>
          <div style={{fontFamily:"'DM Mono', monospace",fontSize:11,letterSpacing:"0.1em",color:palette.inkLight,marginBottom:12}}>LIBRI IN COLLEZIONE</div>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            {colBooks.map(b=>(
              <div key={b.id} style={{position:"relative"}}>
                <BookCard book={b} compact onEdit={onEditBook} onDelete={onDeleteBook}/>
                <button onClick={()=>onToggleBook(col.id,b.id)}
                  style={{position:"absolute",top:10,right:60,...btnStyle("danger"),fontSize:11,padding:"3px 8px"}}>
                  − rimuovi
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{textAlign:"center",padding:"40px 20px",fontFamily:"'Lora', serif",fontStyle:"italic",color:palette.inkLight,fontSize:16,marginBottom:28}}>
          Questa collezione è vuota. Aggiungi dei libri qui sotto.
        </div>
      )}

      {notInCol.length>0 && (
        <div style={{background:palette.tagBg,border:`1px solid ${palette.border}`,padding:20}}>
          <div style={{fontFamily:"'DM Mono', monospace",fontSize:11,letterSpacing:"0.1em",color:palette.inkLight,marginBottom:12}}>AGGIUNGI LIBRI ALLA COLLEZIONE</div>
          <input style={inputStyle({marginBottom:12})} placeholder="Cerca tra i tuoi libri…"
            value={addSearch} onChange={e=>setAddSearch(e.target.value)}/>
          <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:320,overflowY:"auto"}}>
            {filtered.map(b=>(
              <div key={b.id} onClick={()=>onToggleBook(col.id,b.id)}
                style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",
                  background:palette.paper,border:`1px solid ${palette.border}`,cursor:"pointer",borderRadius:1}}
                onMouseEnter={e=>e.currentTarget.style.borderColor=col.color}
                onMouseLeave={e=>e.currentTarget.style.borderColor=palette.border}>
                {b.cover&&<img src={b.cover} style={{width:28,height:40,objectFit:"cover",borderRadius:1,flexShrink:0}} alt=""/>}
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontFamily:"'Playfair Display', serif",fontSize:14,color:palette.ink,fontWeight:600}}>{b.title}</div>
                  <div style={{fontFamily:"'Lora', serif",fontStyle:"italic",fontSize:12,color:palette.inkLight}}>{b.author}</div>
                </div>
                <span style={{fontFamily:"'DM Mono', monospace",fontSize:18,color:col.color,flexShrink:0}}>+</span>
              </div>
            ))}
            {filtered.length===0&&<div style={{fontFamily:"'Lora', serif",fontStyle:"italic",color:palette.inkLight,fontSize:14,textAlign:"center",padding:16}}>Nessun libro trovato.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Export helpers ───────────────────────────────────────────────────

function exportCSV(books) {
  const h = ["Titolo","Autore","Editore","Anno pub.","Pagine","Stato","Voto","Mese lettura","Anno lettura","Tag","Note"];
  const rows = books.map(b => [b.title,b.author,b.publisher,b.year,b.pages,b.status||"letto",b.rating||"",
    b.readMonth?MONTHS[b.readMonth-1]:"",b.readYear||"",b.tags.join("; "),b.notes]
    .map(v=>`"${String(v||"").replace(/"/g,'""')}"`));
  const csv = [h.join(","),...rows.map(r=>r.join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
  a.download = `libreria_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
}

function exportJSON(books, goals, collections) {
  const payload = { books, goals, collections };
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
  a.download = `libreria_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

// ─── Main App ─────────────────────────────────────────────────────────

// ─── Auth Screen ──────────────────────────────────────────────────────────────
function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg({ type:"err", text: error.message });
    } else if (mode === "register") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setMsg({ type:"err", text: error.message });
      else setMsg({ type:"ok", text:"Controlla la tua email per confermare la registrazione." });
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) setMsg({ type:"err", text: error.message });
      else setMsg({ type:"ok", text:"Email di reset inviata." });
    }
    setLoading(false);
  }

  return (
    <div style={{minHeight:"100vh",background:palette.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{fonts}</style>
      <div style={{background:palette.paper,border:`1px solid ${palette.border}`,padding:"40px 48px",maxWidth:400,width:"100%",boxShadow:"0 8px 32px rgba(26,18,8,0.1)"}}>
        <div style={{fontFamily:"'Playfair Display', serif",fontSize:26,fontWeight:700,color:palette.ink,marginBottom:6}}>BookShelf</div>
        <div style={{fontFamily:"'Lora', serif",fontStyle:"italic",fontSize:13,color:palette.inkLight,marginBottom:28}}>
          {mode==="login"?"Accedi al tuo scaffale":mode==="register"?"Crea il tuo account":"Recupera la password"}
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:14}}>
            {fieldLabel("EMAIL")}
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={inputStyle()} placeholder="nome@email.com" autoComplete="email"/>
          </div>
          {mode!=="reset" && (
            <div style={{marginBottom:20}}>
              {fieldLabel("PASSWORD")}
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={inputStyle()} placeholder="••••••••" autoComplete={mode==="register"?"new-password":"current-password"}/>
            </div>
          )}
          {msg && (
            <div style={{padding:"10px 14px",marginBottom:16,background:msg.type==="ok"?"#f0fdf4":"#fef2f2",border:`1px solid ${msg.type==="ok"?"#bbf7d0":"#fecaca"}`,color:msg.type==="ok"?palette.green:palette.accent,fontFamily:"'DM Mono', monospace",fontSize:12}}>
              {msg.text}
            </div>
          )}
          <button type="submit" disabled={loading} style={{...btnStyle("primary"),width:"100%",opacity:loading?0.6:1}}>
            {loading?"...":mode==="login"?"Accedi":mode==="register"?"Registrati":"Invia email di reset"}
          </button>
        </form>
        <div style={{marginTop:20,display:"flex",gap:16,justifyContent:"center",flexWrap:"wrap"}}>
          {mode!=="login"    && <span onClick={()=>{setMode("login");setMsg(null);}}    style={{fontFamily:"'DM Mono', monospace",fontSize:11,color:palette.inkLight,cursor:"pointer",textDecoration:"underline"}}>Accedi</span>}
          {mode!=="register" && <span onClick={()=>{setMode("register");setMsg(null);}} style={{fontFamily:"'DM Mono', monospace",fontSize:11,color:palette.inkLight,cursor:"pointer",textDecoration:"underline"}}>Crea account</span>}
          {mode!=="reset"    && <span onClick={()=>{setMode("reset");setMsg(null);}}    style={{fontFamily:"'DM Mono', monospace",fontSize:11,color:palette.inkLight,cursor:"pointer",textDecoration:"underline"}}>Password dimenticata?</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function safeLsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch(e) {
    console.error('[localStorage] quota exceeded for key:', key, e);
    if (!document.getElementById('__ls-toast')) {
      const t = document.createElement('div');
      t.id = '__ls-toast';
      t.textContent = '\u26a0\ufe0f Spazio locale esaurito \u2014 alcuni dati potrebbero non essere salvati.';
      t.style.cssText = [
        'position:fixed','bottom:1.2rem','left:50%','transform:translateX(-50%)',
        'background:#c8903a','color:#0f0e0b','padding:.6rem 1.4rem',
        'border-radius:6px','font-size:.85rem','z-index:99999',
        'font-family:Georgia,serif','box-shadow:0 2px 8px rgba(0,0,0,.5)',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 7000);
    }
  }
}


export default function App() {
  const [user, setUser]               = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [books, setBooks]             = useState([]);
  const [goals, setGoals]             = useState({});
  const [collections, setCollections] = useState([]);
  const [loaded, setLoaded]           = useState(false);

  const [view, setView]           = useState("library");
  const [activeCol, setActiveCol] = useState(null);
  const [showForm, setShowForm]   = useState(false);
  const [editBook, setEditBook]   = useState(null);
  const [showColForm, setShowColForm] = useState(false);
  const [editCol, setEditCol]     = useState(null);

  const [filterTag, setFilterTag]       = useState(null);
  const [filterRating, setFilterRating] = useState(0);
  const [filterYear, setFilterYear]     = useState(null);
  const [filterStatus, setFilterStatus] = useState(null);
  const [search, setSearch]   = useState("");
  const [sortBy, setSortBy]   = useState("added");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage]       = useState(1);
  const [showTags, setShowTags] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [gridSize, setGridSize] = useState("M");
  const [filterCollection, setFilterCollection] = useState(null);
  const dragItem = useRef(null);
  const dragOver = useRef(null);
  const [pageSize, setPageSize] = useState(25); // 25 | 50 | 100 | 0 (= tutti)
  const [showExport, setShowExport] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText]   = useState("");
  const [importMsg, setImportMsg]     = useState(null);
  const [toastFading, setToastFading] = useState(false);
  const toastTimers = useRef([]);

  function showToast(msg, duration=3000) {
    toastTimers.current.forEach(clearTimeout);
    toastTimers.current = [];
    setToastFading(false);
    setImportMsg(msg);
    toastTimers.current.push(setTimeout(()=>setToastFading(true), duration - 500));
    toastTimers.current.push(setTimeout(()=>{ setImportMsg(null); setToastFading(false); }, duration));
  }
  const exportRef = useRef(null);

  // Close export dropdown on outside click
  useEffect(()=>{
    function h(e){ if(exportRef.current&&!exportRef.current.contains(e.target)) setShowExport(false); }
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[]);

  // ── Auth ─────────────────────────────────────────────────────────
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{
      setUser(session?.user??null);
      setAuthLoading(false);
    });
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_e,session)=>{
      setUser(session?.user??null);
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // ── Load from Supabase when user logs in ─────────────────────────
  useEffect(()=>{
    if(!user){ setBooks([]); setGoals({}); setCollections([]); setLoaded(false); return; }
    loadFromSupabase(user.id);
  },[user]); // eslint-disable-line

  async function loadFromSupabase(userId) {
    try {
      const [bR,gR,cR] = await Promise.all([
        supabase.from("bs_books").select("*").eq("user_id",userId).is("deleted_at",null),
        supabase.from("bs_goals").select("*").eq("user_id",userId),
        supabase.from("bs_collections").select("*").eq("user_id",userId),
      ]);
      if(bR.data){
        const mapped=bR.data.map(r=>({
          id:r.id,title:r.title,originalTitle:r.original_title,author:r.author,
          publisher:r.publisher,year:r.year,pages:r.pages,currentPage:r.current_page,
          readMonth:r.read_month,readYear:r.read_year,rating:r.rating,
          tags:r.tags||[],notes:r.notes,cover:r.cover,isbn:r.isbn,
          status:r.status,addedAt:r.added_at,
        }));
        setBooks(mapped); store.set(STORAGE_KEY,mapped);
        // First-time migration offer
        if(mapped.length===0){
          const local=store.get(STORAGE_KEY)||[];
          if(local.length>0 && window.confirm(`Trovati ${local.length} libri salvati localmente. Importarli nel tuo account?`)){
            await migrateLocalToSupabase(userId,local);
            return;
          }
        }
      }
      if(gR.data){
        const g={}; gR.data.forEach(r=>{g[r.year]={books:r.goal_books,pages:r.goal_pages};}); setGoals(g);
      }
      if(cR.data){
        setCollections(cR.data.map(r=>({id:r.id,name:r.name,description:r.description,color:r.color,bookIds:r.book_ids||[]})));
      }
    } catch(e){ console.error("Supabase load:",e); setBooks(store.get(STORAGE_KEY)||[]); setGoals(store.get(GOALS_KEY)||{}); setCollections(store.get(COLLECTIONS_KEY)||[]); }
    setLoaded(true);
  }

  async function migrateLocalToSupabase(userId,localBooks) {
    const bRows=localBooks.map(b=>({id:b.id,user_id:userId,title:b.title||"",original_title:b.originalTitle||"",author:b.author||"",publisher:b.publisher||"",year:b.year||"",pages:b.pages||"",current_page:b.currentPage||"",read_month:b.readMonth||"",read_year:b.readYear||"",rating:b.rating||0,tags:b.tags||[],notes:b.notes||"",cover:b.cover||"",isbn:b.isbn||"",status:b.status||"da leggere",added_at:b.addedAt||new Date().toISOString()}));
    await supabase.from("bs_books").upsert(bRows,{onConflict:"id"});
    const localGoals=store.get(GOALS_KEY)||{};
    const gRows=Object.entries(localGoals).map(([y,g])=>({user_id:userId,year:parseInt(y),goal_books:g.books||0,goal_pages:g.pages||0}));
    if(gRows.length) await supabase.from("bs_goals").upsert(gRows,{onConflict:"user_id,year"});
    const localCols=store.get(COLLECTIONS_KEY)||[];
    const cRows=localCols.map(c=>({id:c.id,user_id:userId,name:c.name||"",description:c.description||"",color:c.color||"",book_ids:c.bookIds||[]}));
    if(cRows.length) await supabase.from("bs_collections").upsert(cRows,{onConflict:"id"});
    await loadFromSupabase(userId);
  }

  // Persist to localStorage (backup)
  useEffect(()=>{ if(loaded) store.set(STORAGE_KEY, books); },[books,loaded]);
  useEffect(()=>{ if(loaded) store.set(GOALS_KEY, goals); },[goals,loaded]);
  useEffect(()=>{ if(loaded) store.set(COLLECTIONS_KEY, collections); },[collections,loaded]);

  // Sync goals to Supabase
  useEffect(()=>{
    if(!loaded||!user) return;
    const rows=Object.entries(goals).map(([y,g])=>({user_id:user.id,year:parseInt(y),goal_books:g.books||0,goal_pages:g.pages||0}));
    if(rows.length) supabase.from("bs_goals").upsert(rows,{onConflict:"user_id,year"}).then(()=>{});
  },[goals,loaded,user]); // eslint-disable-line

  const allTags = [...new Set(books.flatMap(b=>b.tags))].sort();

  // ── cp_items / cp_log / cp_tags live sync ──────────────────────────────────
  function syncCpData(book, prevBook) {
    if (!book?.id) return;
    const cpId = 'bs_' + book.id;
    const now  = new Date().toISOString();
    const m = parseInt(book.readMonth, 10), y = parseInt(book.readYear, 10);
    const finishedAt = (y > 1900) ? new Date(y, (m >= 1 && m <= 12 ? m - 1 : 11), 28).toISOString() : null;
    const STATUS_TO_CP = { 'letto':'finished','in corso':'in_progress','da leggere':'to_read','wishlist':'wishlist','abbandonato':'abandoned' };
    const cpGet = k => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };

    // 1. cp_items — aggiorna o crea
    const items = cpGet('cp_items');
    const idx = items.findIndex(i => i.id === cpId);
    const cpItem = {
      id: cpId, type: 'book', title: book.title || '', creator: book.author || '',
      status: STATUS_TO_CP[book.status] || 'to_read',
      started_at: null, finished_at: finishedAt,
      rating: book.rating || null, source_app: 'bookshelf', source_id: book.id,
      cover_url: book.cover || null,
      created_at: idx >= 0 ? items[idx].created_at : now, updated_at: now,
      _meta: { originalTitle: book.originalTitle||null, publisher: book.publisher||null,
               year: book.year||null, pages: book.pages||null, isbn: book.isbn||null },
    };
    if (idx >= 0) items[idx] = cpItem; else items.unshift(cpItem);
    safeLsSet('cp_items', JSON.stringify(items));

    // 2. cp_log — evento se status cambia
    const prevStatus = prevBook?.status, newStatus = book.status;
    if (!prevBook || prevStatus !== newStatus) {
      const eventType = newStatus === 'letto' ? 'finished'
        : (newStatus === 'in corso' && prevStatus !== 'in corso') ? 'started'
        : newStatus === 'abbandonato' ? 'abandoned' : null;
      if (eventType) {
        const log = cpGet('cp_log');
        const evId = 'bs_ev_' + book.id + '_' + eventType;
        if (!log.find(e => e.id === evId)) {
          log.push({ id: evId, item_id: cpId, event_type: eventType,
                     date: finishedAt || now, meta: {}, source_app: 'bookshelf' });
          safeLsSet('cp_log', JSON.stringify(log));
        }
      }
    }

    // 3. cp_tags — diff add/remove
    if (window.CpTags) {
      const prevTags = prevBook?.tags || [], newTags = book.tags || [];
      newTags.filter(t => !prevTags.includes(t)).forEach(t => window.CpTags.addTag(cpId, t, 'bookshelf'));
      prevTags.filter(t => !newTags.includes(t)).forEach(t => window.CpTags.removeTag(cpId, t));
    }
  }

  function saveBook(book) {
    const prevBook = books.find(b => b.id === book.id) || null;
    const isNew = !prevBook;
    syncCpData(book, prevBook);
    setBooks(prev=>{const i=prev.findIndex(b=>b.id===book.id);if(i>=0){const n=[...prev];n[i]=book;return n;}return[book,...prev];});
    setShowForm(false); setEditBook(null);
    showToast({type:"ok", text: isNew ? "Libro aggiunto." : "Libro aggiornato."});
    if(isNew){
      const newCount = books.length + 1;
      if(newCount > 0 && newCount % 10 === 0){
        setTimeout(()=>showToast({type:"backup", text:`Hai ${newCount} libri — ricordati di esportare un backup JSON!`}, 6000), 3200);
      }
    }
    // Supabase sync
    if(user) supabase.from("bs_books").upsert({
      id:book.id,user_id:user.id,title:book.title||"",original_title:book.originalTitle||"",
      author:book.author||"",publisher:book.publisher||"",year:book.year||"",
      pages:book.pages||"",current_page:book.currentPage||"",
      read_month:book.readMonth||"",read_year:book.readYear||"",
      rating:book.rating||0,tags:book.tags||[],notes:book.notes||"",
      cover:book.cover||"",isbn:book.isbn||"",status:book.status||"da leggere",
      added_at:book.addedAt||new Date().toISOString(),updated_at:new Date().toISOString(),
    },{onConflict:"id"}).then(({error})=>{if(error)console.error("bs_books upsert:",error);});
  }
  function deleteBook(id) {
    if(confirm("Eliminare questo libro?")) {
      setBooks(p=>p.filter(b=>b.id!==id));
      if(user) supabase.from("bs_books").update({deleted_at:new Date().toISOString()}).eq("id",id).eq("user_id",user.id).then(()=>{});
    }
  }

  function saveCollection(col) {
    setCollections(prev=>{const i=prev.findIndex(c=>c.id===col.id);if(i>=0){const n=[...prev];n[i]=col;return n;}return[col,...prev];});
    setShowColForm(false); setEditCol(null);
    if(activeCol?.id===col.id) setActiveCol(col);
    if(user) supabase.from("bs_collections").upsert({
      id:col.id,user_id:user.id,name:col.name||"",description:col.description||"",
      color:col.color||"",book_ids:col.bookIds||[],updated_at:new Date().toISOString(),
    },{onConflict:"id"}).then(({error})=>{if(error)console.error("bs_collections upsert:",error);});
  }
  function deleteCollection(id) {
    if(confirm("Eliminare questa collezione? I libri non verranno eliminati.")){
      setCollections(p=>p.filter(c=>c.id!==id));
      if(activeCol?.id===id){ setView("collections"); setActiveCol(null); }
      if(user) supabase.from("bs_collections").delete().eq("id",id).eq("user_id",user.id).then(()=>{});
    }
  }
  function handleImport() {
    setImportText("");
    setShowImportModal(true);
    setShowExport(false);
  }

  function processImport() {
    try {
      const data = JSON.parse(importText.trim());
      let parsed;
      if (Array.isArray(data))                               parsed = { books: data };
      else if (data.books || data.goals || data.collections) parsed = data;
      else { showToast({type:"err", text:"Formato non riconosciuto."}, 4000); return; }

      const msg = [];
      if (parsed.books?.length) {
        const existingIds = new Set(books.map(b => b.id));
        const existingTitleAuthor = new Set(
          books.map(b => b.title.toLowerCase().trim() + '||' + (b.author||'').toLowerCase().trim())
        );
        const newBooks = parsed.books.filter(b =>
          !existingIds.has(b.id) &&
          !existingTitleAuthor.has((b.title||'').toLowerCase().trim() + '||' + (b.author||'').toLowerCase().trim())
        );
        setBooks(prev => [...prev, ...newBooks]);
        // Supabase sync
        if(user && newBooks.length > 0) {
          const rows = newBooks.map(b => ({
            id:b.id,user_id:user.id,title:b.title||"",original_title:b.originalTitle||"",
            author:b.author||"",publisher:b.publisher||"",year:b.year||"",
            pages:b.pages||"",current_page:b.currentPage||"",
            read_month:b.readMonth||"",read_year:b.readYear||"",
            rating:b.rating||0,tags:b.tags||[],notes:b.notes||"",
            cover:b.cover||"",isbn:b.isbn||"",status:b.status||"da leggere",
            added_at:b.addedAt||new Date().toISOString(),updated_at:new Date().toISOString(),
          }));
          supabase.from("bs_books").upsert(rows,{onConflict:"id"}).then(({error})=>{if(error)console.error("import books upsert:",error);});
        }
        msg.push(`${newBooks.length} libri importati`);
      }
      if (parsed.goals && Object.keys(parsed.goals).length) {
        const mergedGoals = { ...parsed.goals, ...goals };
        setGoals(mergedGoals);
        // Supabase sync
        if(user) {
          const rows = Object.entries(mergedGoals).map(([year,g])=>({user_id:user.id,year:parseInt(year),target:g.target||0,updated_at:new Date().toISOString()}));
          supabase.from("bs_goals").upsert(rows,{onConflict:"user_id,year"}).then(({error})=>{if(error)console.error("import goals upsert:",error);});
        }
        msg.push("obiettivi importati");
      }
      if (parsed.collections?.length) {
        const existingIds = new Set(collections.map(c => c.id));
        const newCols = parsed.collections.filter(c => !existingIds.has(c.id));
        setCollections(prev => [...prev, ...newCols]);
        // Supabase sync
        if(user && newCols.length > 0) {
          const rows = newCols.map(c => ({
            id:c.id,user_id:user.id,name:c.name||"",description:c.description||"",
            color:c.color||"",book_ids:c.bookIds||[],updated_at:new Date().toISOString(),
          }));
          supabase.from("bs_collections").upsert(rows,{onConflict:"id"}).then(({error})=>{if(error)console.error("import collections upsert:",error);});
        }
        msg.push(`${newCols.length} collezioni importate`);
      }
      showToast({ type:"ok", text: msg.length ? msg.join(", ") + "." : "Nessun dato nuovo da importare." }, 4000);
      setShowImportModal(false);
      setImportText("");
    } catch {
      showToast({type:"err", text:"JSON non valido — controlla il testo incollato."}, 4000);
    }
  }

  function toggleBookInCollection(colId, bookId) {
    setCollections(prev=>prev.map(c=>{
      if(c.id!==colId) return c;
      const ids = c.bookIds||[];
      const next = ids.includes(bookId)?ids.filter(i=>i!==bookId):[...ids,bookId];
      const updated = {...c, bookIds:next};
      if(activeCol?.id===colId) setActiveCol(updated);
      if(user) supabase.from("bs_collections").update({book_ids:next,updated_at:new Date().toISOString()}).eq("id",colId).eq("user_id",user.id).then(()=>{});
      return updated;
    }));
  }

  const formRef = useRef(null);
  const topRef  = useRef(null);

  let filtered = books.filter(b=>{
    if(filterTag&&!b.tags.includes(filterTag)) return false;
    if(filterRating&&b.rating<filterRating)    return false;
    if(filterYear&&b.readYear!==filterYear)    return false;
    if(filterStatus&&(b.status||"letto")!==filterStatus) return false;
    if(filterCollection){
      const col = collections.find(c=>c.id===filterCollection);
      if(!col||!col.bookIds?.includes(b.id)) return false;
    }
    if(search){
      const q=search.toLowerCase();
      const matchTitle        = b.title.toLowerCase().includes(q);
      const matchAuthor       = b.author.toLowerCase().includes(q);
      const matchOriginal     = (b.originalTitle||"").toLowerCase().includes(q);
      const matchPublisher    = (b.publisher||"").toLowerCase().includes(q);
      const matchTag          = b.tags.some(t=>t.toLowerCase().includes(q));
      if(!matchTitle&&!matchAuthor&&!matchOriginal&&!matchPublisher&&!matchTag) return false;
    }
    return true;
  });
  const dir = sortDir==="asc" ? 1 : -1;
  if(sortBy==="rating") filtered=[...filtered].sort((a,b)=>dir*(a.rating-b.rating));
  else if(sortBy==="title")  filtered=[...filtered].sort((a,b)=>dir*a.title.localeCompare(b.title));
  else if(sortBy==="author") filtered=[...filtered].sort((a,b)=>dir*a.author.localeCompare(b.author));
  else if(sortBy==="date")   filtered=[...filtered].sort((a,b)=>{
    const da=(a.readYear||0)*100+(a.readMonth||0), db=(b.readYear||0)*100+(b.readMonth||0); return dir*(da-db);
  });
  else if(sortBy==="added" && sortDir==="asc") filtered=[...filtered].reverse();

  const totalPages = pageSize===0 ? 1 : Math.ceil(filtered.length / pageSize);
  const safePage   = Math.min(page, totalPages||1);
  const paginated  = pageSize===0 ? filtered : filtered.slice((safePage-1)*pageSize, safePage*pageSize);

  const prevFilterKey = useRef("");
  const filterKey = `${search}|${filterTag}|${filterRating}|${filterYear}|${filterStatus}|${filterCollection}|${sortBy}|${sortDir}|${pageSize}`;
  if(filterKey !== prevFilterKey.current){ prevFilterKey.current = filterKey; if(page!==1) setPage(1); }

  if(authLoading) return(
    <div style={{minHeight:"100vh",background:palette.bg,display:"flex",alignItems:"center",justifyContent:"center"}}>
      <style>{fonts}</style>
      <div style={{fontFamily:"'Lora', serif",fontStyle:"italic",color:palette.inkLight,fontSize:15}}>Caricamento...</div>
    </div>
  );
  if(!user) return <AuthScreen/>;

  return (
    <>
      <style>{fonts+`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${palette.bg};}
        input:focus,textarea:focus{border-color:${palette.ink}!important;box-shadow:0 0 0 2px rgba(26,18,8,0.08);}
        button:hover{opacity:0.82;}
        select{appearance:none;}
        ::-webkit-scrollbar{width:6px;}
        ::-webkit-scrollbar-track{background:${palette.bg};}
        ::-webkit-scrollbar-thumb{background:${palette.border};border-radius:3px;}
        input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;}
      `}</style>
      <div style={{minHeight:"100vh", background:palette.bg}}>

        {/* Header */}
        <div style={{borderBottom:`2px solid ${palette.ink}`, background:palette.paper, padding:"0 40px"}}>
          <div style={{maxWidth:900, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:72}}>
            <div style={{display:"flex", alignItems:"center", gap:0, overflowX:"auto", WebkitOverflowScrolling:"touch"}}>
              <div style={{fontFamily:"'Playfair Display', serif", fontSize:22, fontWeight:700, color:palette.ink, letterSpacing:"-0.01em", marginRight:32, flexShrink:0}}>
                BookShelf
              </div>
              {["library","collections","stats"].map(v=>(
                <button key={v} onClick={()=>{setView(v);if(v==="library")setActiveCol(null);}}
                  style={{...btnStyle("ghost"), border:"none",
                    borderBottom:`2px solid ${view===v||(v==="collections"&&view==="collection-detail")?palette.ink:"transparent"}`,
                    borderRadius:0, padding:"14px 12px", fontSize:12, letterSpacing:"0.06em", whiteSpace:"nowrap",
                    color:view===v||(v==="collections"&&view==="collection-detail")?palette.ink:palette.inkLight,
                    fontWeight:view===v||(v==="collections"&&view==="collection-detail")?"600":"400",
                  }}>
                  {v==="library"?"LIBRERIA":v==="collections"?`COLLEZIONI${collections.length>0?` (${collections.length})`:""}`:"STATISTICHE"}
                </button>
              ))}
            </div>
            <div style={{display:"flex", gap:8}}>
              {view==="library" && <>
                <div style={{position:"relative"}} ref={exportRef}>
                  <button style={btnStyle("outline")} onClick={()=>setShowExport(v=>!v)}>↓ Esporta / Importa</button>
                  {showExport && (
                    <div style={{position:"absolute", right:0, top:"calc(100% + 6px)", background:palette.paper,
                      border:`1px solid ${palette.border}`, zIndex:100, minWidth:160, boxShadow:"0 4px 16px rgba(26,18,8,0.12)"}}>
                      {[
                        ["Esporta CSV",  ()=>exportCSV(books)],
                        ["Esporta JSON", ()=>exportJSON(books, goals, collections)],
                        ["Importa JSON", ()=>handleImport()],
                      ].map(([label,fn],i)=>(
                        <div key={label} onClick={()=>{fn();setShowExport(false);}}
                          style={{padding:"10px 16px", fontFamily:"'DM Mono', monospace", fontSize:12, cursor:"pointer", color:palette.ink,
                            borderBottom:i<2?`1px solid ${palette.border}`:"none",
                            borderTop:i===2?`1px solid ${palette.border}`:"none"}}
                          onMouseEnter={e=>e.currentTarget.style.background=palette.tagBg}
                          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                          {i===2?"↑ ":""}{label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button style={btnStyle("primary")} onClick={()=>{setEditBook(null);setShowForm(true);}}>+ Aggiungi libro</button>
              <a href="/listens.html" target="_blank"
                style={{...btnStyle("ghost"), textDecoration:'none', padding:'9px 14px', fontSize:13}}>
                🎙 ListenS
              </a>
              <button style={{...btnStyle("ghost"),fontSize:11,padding:"6px 12px",opacity:0.7}} title={`Connesso come ${user.email}`}
                onClick={()=>{ if(confirm("Disconnettersi?")) supabase.auth.signOut(); }}>
                {user.email?.split("@")[0]} ↩
              </button>
              </>}
              {(view==="collections"||view==="collection-detail") && (
                <button style={btnStyle("primary")} onClick={()=>{setEditCol(null);setShowColForm(true);}}>+ Nuova collezione</button>
              )}
            </div>
          </div>
        </div>

        {/* Modale importazione JSON */}
        {showImportModal && (
          <div style={{position:"fixed",inset:0,background:"rgba(26,18,8,0.5)",zIndex:300,
            display:"flex",alignItems:"center",justifyContent:"center",padding:24}}
            onClick={e=>{if(e.target===e.currentTarget)setShowImportModal(false);}}>
            <div style={{background:palette.paper,border:`1px solid ${palette.border}`,
              padding:28,maxWidth:560,width:"100%",boxShadow:"0 16px 48px rgba(26,18,8,0.2)"}}>
              <div style={{fontFamily:"'Playfair Display', serif",fontSize:18,fontWeight:700,
                color:palette.ink,marginBottom:6}}>Importa JSON</div>
              <div style={{fontFamily:"'Lora', serif",fontStyle:"italic",fontSize:13,
                color:palette.inkLight,marginBottom:16,lineHeight:1.6}}>
                Incolla qui il contenuto del file JSON esportato in precedenza.
                Puoi aprire il file con il Blocco Note, selezionare tutto (Ctrl+A) e copiare (Ctrl+C).
              </div>
              <textarea
                value={importText}
                onChange={e=>setImportText(e.target.value)}
                placeholder='[ { "title": "...", "author": "..." }, ... ]'
                style={{...inputStyle(), minHeight:180, resize:"vertical", fontFamily:"'DM Mono', monospace",
                  fontSize:12, marginBottom:16}}
                autoFocus
              />
              <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
                <button style={btnStyle("outline")} onClick={()=>setShowImportModal(false)}>Annulla</button>
                <button style={btnStyle("primary")}
                  onClick={processImport}
                  disabled={!importText.trim()}>
                  Importa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast importazione */}
        {importMsg && (
          <div style={{position:"fixed", bottom:32, left:"50%", transform:"translateX(-50%)",
            background:importMsg.type==="ok"?palette.green:importMsg.type==="backup"?palette.gold:palette.accent,
            color:"#fff", padding:"12px 24px", borderRadius:2, zIndex:200,
            fontFamily:"'DM Mono', monospace", fontSize:12, letterSpacing:"0.05em",
            boxShadow:"0 4px 20px rgba(0,0,0,0.2)", pointerEvents:"none",
            maxWidth:400, textAlign:"center",
            opacity: toastFading ? 0 : 1, transition:"opacity 0.5s ease"}}>
            {importMsg.type==="ok"?"✓ ":importMsg.type==="backup"?"💾 ":"⚠ "}{importMsg.text}
          </div>
        )}

        {/* Stats */}
        {view==="library" && books.length>0 && (
          <StatsBar books={books} filterYear={filterYear} setFilterYear={setFilterYear}
            goals={goals} setGoals={setGoals}
            onEditBook={b=>{setEditBook(b);setShowForm(false);
              setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}),50);}}
            onGoToStats={()=>setView("stats")}/>
        )}

        <div style={{maxWidth:900, margin:"0 auto", padding:"32px 40px"}}>

          {/* LIBRARY */}
          {view==="library" && <>
            {(showForm||editBook) && (
              <div style={{marginBottom:32}} ref={formRef}>
                <BookForm initial={editBook} allTags={allTags} onSave={saveBook}
                  onCancel={()=>{setShowForm(false);setEditBook(null);}}/>
              </div>
            )}
            {books.length>0 && (
              <div style={{marginBottom:24, display:"flex", flexDirection:"column", gap:10}}>
                <div style={{display:"flex", flexWrap:"wrap", gap:10, alignItems:"center"}}>
                  <input style={inputStyle({width:220})} placeholder="Cerca titolo, autore, editore, tag…"
                    value={search} onChange={e=>setSearch(e.target.value)}/>
                  <div style={{display:"flex", gap:0, alignItems:"stretch"}}>
                    <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
                      style={{...inputStyle({width:"auto",cursor:"pointer"}), borderRadius:"2px 0 0 2px", borderRight:"none"}}>
                      <option value="added">Ordine aggiunta</option>
                      <option value="date">Data lettura</option>
                      <option value="rating">Voto</option>
                      <option value="title">Titolo</option>
                      <option value="author">Autore</option>
                    </select>
                    <button onClick={()=>setSortDir(d=>d==="desc"?"asc":"desc")}
                      title={sortDir==="desc"?"Decrescente":"Crescente"}
                      style={{...btnStyle("outline"), borderRadius:"0 2px 2px 0", padding:"0 10px",
                        fontFamily:"'DM Mono', monospace", fontSize:13, lineHeight:1,
                        borderColor:palette.border, color:palette.inkLight}}>
                      {sortDir==="desc"?"↓":"↑"}
                    </button>
                  </div>
                  <div style={{display:"flex", gap:4, alignItems:"center"}}>
                    <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight}}>STATO:</span>
                    <Tag label="tutti" onClick={()=>setFilterStatus(null)} active={!filterStatus}/>
                    {Object.entries(STATUS_CONFIG).map(([k,c])=>(
                      <Tag key={k} label={`${c.dot} ${c.label}`}
                        onClick={()=>setFilterStatus(filterStatus===k?null:k)} active={filterStatus===k}/>
                    ))}
                  </div>
                  <div style={{display:"flex", gap:6, alignItems:"center"}}>
                    <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight}}>MIN★:</span>
                    {[1,1.5,2,2.5,3,3.5,4,4.5,5].map(r=>(
                      <span key={r} onClick={()=>setFilterRating(filterRating===r?0:r)}
                        style={{fontFamily:"'DM Mono', monospace", fontSize:11, cursor:"pointer", userSelect:"none",
                          color:filterRating===r?palette.ink:palette.inkLight,
                          textDecoration:filterRating===r?"underline":"none"}}>{r}</span>
                    ))}
                    {filterRating>0 && (
                      <span onClick={()=>setFilterRating(0)}
                        style={{fontFamily:"'DM Mono', monospace",fontSize:10,color:palette.accent,cursor:"pointer",opacity:0.7}}>✕</span>
                    )}
                  </div>
                  {/* Toggle vista + dimensione griglia */}
                  <div style={{display:"flex", gap:4, marginLeft:"auto", alignItems:"center"}}>
                    {viewMode==="grid" && (
                      <div style={{display:"flex", gap:0}}>
                        {[["S","100px"],["M","140px"],["L","190px"]].map(([size],i)=>(
                          <button key={size} onClick={()=>setGridSize(size)}
                            title={`Griglia ${size==="S"?"piccola":size==="M"?"media":"grande"}`}
                            style={{...btnStyle("outline"), padding:"0 9px", fontSize:11, lineHeight:1,
                              borderRadius:i===0?"2px 0 0 2px":i===2?"0 2px 2px 0":"0",
                              borderRight:i<2?"none":undefined,
                              fontFamily:"'DM Mono', monospace",
                              background:gridSize===size?palette.inkLight:"transparent",
                              color:gridSize===size?palette.paper:palette.inkLight}}>
                            {size}
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{display:"flex", gap:0}}>
                      {[["list","☰"],["grid","⊞"]].map(([mode, icon])=>(
                        <button key={mode} onClick={()=>setViewMode(mode)}
                          title={mode==="list"?"Vista lista":"Vista griglia"}
                          style={{...btnStyle("outline"), padding:"0 10px", fontSize:15, lineHeight:1,
                            borderRadius:mode==="list"?"2px 0 0 2px":"0 2px 2px 0",
                            borderRight:mode==="list"?"none":undefined,
                            background:viewMode===mode?palette.ink:"transparent",
                            color:viewMode===mode?palette.paper:palette.inkLight}}>
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Riga 2: tag + collezioni a scomparsa + contatore */}
                <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:8,
                  paddingTop:8, borderTop:`1px solid ${palette.border}`}}>
                  <div style={{flex:1, display:"flex", flexDirection:"column", gap:8}}>

                    {/* Tag */}
                    {allTags.length>0 && (
                      <div>
                        <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:showTags?8:0}}>
                          <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight}}>TAG:</span>
                          <button onClick={()=>setShowTags(s=>!s)} style={{...btnStyle("ghost"),
                            padding:"2px 8px", fontSize:10, display:"flex", alignItems:"center", gap:4}}>
                            {showTags ? "nascondi ↑" : `mostra (${allTags.length}) ↓`}
                            {filterTag&&!showTags&&<span style={{color:palette.gold,marginLeft:2}}>● {filterTag}</span>}
                          </button>
                          {filterTag && <span onClick={()=>setFilterTag(null)}
                            style={{fontFamily:"'DM Mono', monospace",fontSize:10,color:palette.accent,cursor:"pointer",opacity:0.7}}>✕</span>}
                        </div>
                        {showTags && (
                          <div style={{display:"flex", gap:4, flexWrap:"wrap", alignItems:"center"}}>
                            <Tag label="tutti" onClick={()=>setFilterTag(null)} active={!filterTag}/>
                            {allTags.map(t=><Tag key={t} label={t}
                              onClick={()=>setFilterTag(filterTag===t?null:t)} active={filterTag===t}/>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collezioni */}
                    {collections.length>0 && (
                      <div style={{display:"flex", alignItems:"center", gap:6, flexWrap:"wrap"}}>
                        <span style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight}}>COLLEZIONE:</span>
                        <Tag label="tutte" onClick={()=>setFilterCollection(null)} active={!filterCollection}/>
                        {collections.map(c=>(
                          <span key={c.id}
                            onClick={()=>setFilterCollection(filterCollection===c.id?null:c.id)}
                            style={{display:"inline-flex", alignItems:"center", gap:4,
                              padding:"2px 8px", borderRadius:2, cursor:"pointer",
                              fontFamily:"'DM Mono', monospace", fontSize:11, userSelect:"none",
                              background:filterCollection===c.id?c.color+"22":palette.tagBg,
                              color:filterCollection===c.id?c.color:palette.inkLight,
                              border:`1px solid ${filterCollection===c.id?c.color+"66":palette.border}`}}>
                            <span style={{width:7,height:7,borderRadius:"50%",background:c.color,display:"inline-block",flexShrink:0}}/>
                            {c.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Contatore + selettore pagina */}
                  <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
                    <div style={{fontFamily:"'DM Mono', monospace", fontSize:11, color:palette.inkLight, whiteSpace:"nowrap", paddingTop:2}}>
                      {filtered.length === books.length
                        ? `${books.length} ${books.length===1?"libro":"libri"}`
                        : `${filtered.length} di ${books.length}`}
                      {pageSize>0 && totalPages>1 && ` · p. ${safePage}/${totalPages}`}
                      {(filterTag||filterRating>0||filterStatus||filterCollection||search) && (
                        <span onClick={()=>{setFilterTag(null);setFilterRating(0);setFilterStatus(null);setFilterCollection(null);setSearch("");}}
                          style={{marginLeft:8, color:palette.accent, cursor:"pointer", opacity:0.7}}>✕ reset</span>
                      )}
                    </div>
                    <div style={{display:"flex", gap:0, alignItems:"center"}}>
                      {[[25,"25"],[50,"50"],[100,"100"],[0,"∞"]].map(([val,label],i,arr)=>(
                        <span key={val} onClick={()=>{ setPageSize(val); setPage(1); }}
                          style={{fontFamily:"'DM Mono', monospace", fontSize:10, cursor:"pointer",
                            padding:"1px 5px", userSelect:"none",
                            color:pageSize===val?palette.ink:palette.inkLight,
                            borderTop:`1px solid ${palette.border}`,
                            borderBottom:`1px solid ${palette.border}`,
                            borderLeft:`1px solid ${palette.border}`,
                            borderRight: i===arr.length-1?`1px solid ${palette.border}`:"none",
                            borderRadius: i===0?"2px 0 0 2px":i===arr.length-1?"0 2px 2px 0":"0",
                            background:pageSize===val?palette.tagBg:"transparent",
                            fontWeight:pageSize===val?"500":"400"}}>
                          {label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lista o griglia */}
            <div ref={topRef}/>
            {paginated.length>0 ? (
              viewMode==="grid" ? (
                <div style={{display:"grid",
                  gridTemplateColumns:`repeat(auto-fill, minmax(${gridSize==="S"?"100px":gridSize==="L"?"190px":"140px"}, 1fr))`, gap:12}}>
                  {paginated.map(b=><BookGridCard key={b.id} book={b}
                    collections={collections}
                    onGoToCollection={c=>{setActiveCol(c);setView("collection-detail");}}
                    onEdit={b=>{
                      setEditBook(b); setShowForm(false);
                      setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}), 50);
                    }}
                    onDelete={deleteBook}/>)}
                </div>
              ) : (() => {
                // Drag reorder: only when no filters, sorted by "added", list view
                const canDrag = viewMode==="list" && sortBy==="added" && sortDir==="desc" && pageSize===0 && !search && !filterTag && !filterRating && !filterStatus && !filterCollection;
                const handleDrop = () => {
                  if(!dragItem.current||!dragOver.current||dragItem.current===dragOver.current) return;
                  const fromIdx = books.findIndex(b=>b.id===dragItem.current);
                  const toIdx   = books.findIndex(b=>b.id===dragOver.current);
                  if(fromIdx<0||toIdx<0) return;
                  const next = [...books];
                  const [moved] = next.splice(fromIdx, 1);
                  next.splice(toIdx, 0, moved);
                  setBooks(next);
                  dragItem.current = null; dragOver.current = null;
                };
                return (
                  <div style={{display:"flex", flexDirection:"column", gap:10}}>
                    {sortBy==="added" && sortDir==="desc" && !search && !filterTag && !filterRating && !filterStatus && !filterCollection && (
                      <div style={{fontFamily:"'DM Mono', monospace", fontSize:10,
                        color:palette.inkLight, opacity:0.5, textAlign:"right"}}>
                        {canDrag ? "↕ trascina per riordinare" : "seleziona ∞ per riordinare tramite drag & drop"}
                      </div>
                    )}
                    {paginated.map((b)=>(
                      <div key={b.id} style={{display:"flex", alignItems:"stretch", gap:0}}
                        draggable={canDrag}
                        onDragStart={()=>{ dragItem.current=b.id; }}
                        onDragEnter={()=>{ dragOver.current=b.id; }}
                        onDragEnd={handleDrop}
                        onDragOver={e=>e.preventDefault()}>
                        {canDrag && (
                          <div style={{display:"flex", alignItems:"center", paddingRight:8,
                            cursor:"grab", color:palette.border, userSelect:"none",
                            fontSize:16, flexShrink:0}}
                            title="Trascina per riordinare">⠿</div>
                        )}
                        <div style={{flex:1, minWidth:0}}>
                          <BookCard book={b}
                            collections={collections}
                            onGoToCollection={c=>{setActiveCol(c);setView("collection-detail");}}
                            onEdit={b=>{
                              setEditBook(b); setShowForm(false);
                              setTimeout(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}), 50);
                            }}
                            onDelete={deleteBook}/>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()
            ) : (
              <div style={{textAlign:"center", padding:"80px 40px", fontFamily:"'Playfair Display', serif",
                fontStyle:"italic", color:palette.inkLight, fontSize:20}}>
                {books.length===0?"La tua libreria è vuota. Aggiungi il primo libro!":"Nessun libro corrisponde ai filtri selezionati."}
              </div>
            )}

            {/* Paginazione */}
            {totalPages>1 && (
              <div style={{display:"flex", justifyContent:"center", alignItems:"center", gap:6, marginTop:32, flexWrap:"wrap"}}>
                <button onClick={()=>{setPage(1);topRef.current?.scrollIntoView({behavior:"smooth"});}}
                  disabled={safePage===1} style={{...btnStyle("ghost"),opacity:safePage===1?0.3:1,fontSize:11}}>«</button>
                <button onClick={()=>{setPage(p=>Math.max(1,p-1));topRef.current?.scrollIntoView({behavior:"smooth"});}}
                  disabled={safePage===1} style={{...btnStyle("ghost"),opacity:safePage===1?0.3:1,fontSize:11}}>‹</button>
                {Array.from({length:totalPages},(_,i)=>i+1)
                  .filter(p=>p===1||p===totalPages||Math.abs(p-safePage)<=2)
                  .reduce((acc,p,i,arr)=>{ if(i>0&&p-arr[i-1]>1) acc.push("…"); acc.push(p); return acc; },[])
                  .map((p,i)=>p==="…"
                    ? <span key={`e${i}`} style={{fontFamily:"'DM Mono', monospace",fontSize:11,color:palette.inkLight,padding:"0 4px"}}>…</span>
                    : <button key={p} onClick={()=>{setPage(p);topRef.current?.scrollIntoView({behavior:"smooth"});}}
                        style={{...btnStyle(p===safePage?"primary":"ghost"),minWidth:32,padding:"4px 8px",fontSize:11}}>{p}</button>
                  )
                }
                <button onClick={()=>{setPage(p=>Math.min(totalPages,p+1));topRef.current?.scrollIntoView({behavior:"smooth"});}}
                  disabled={safePage===totalPages} style={{...btnStyle("ghost"),opacity:safePage===totalPages?0.3:1,fontSize:11}}>›</button>
                <button onClick={()=>{setPage(totalPages);topRef.current?.scrollIntoView({behavior:"smooth"});}}
                  disabled={safePage===totalPages} style={{...btnStyle("ghost"),opacity:safePage===totalPages?0.3:1,fontSize:11}}>»</button>
              </div>
            )}
          </>}

          {/* COLLECTIONS */}
          {view==="collections" && <>
            {(showColForm||editCol) && (
              <CollectionForm initial={editCol} onSave={saveCollection}
                onCancel={()=>{setShowColForm(false);setEditCol(null);}}/>
            )}
            {collections.length>0 ? (
              <div style={{display:"flex", flexDirection:"column", gap:12}}>
                {collections.map(col=>(
                  <CollectionCard key={col.id} col={col} books={books}
                    onClick={()=>{setActiveCol(col);setView("collection-detail");}}
                    onEdit={c=>{setEditCol(c);setShowColForm(false);}}
                    onDelete={deleteCollection}/>
                ))}
              </div>
            ) : !showColForm && (
              <div style={{textAlign:"center", padding:"80px 40px", fontFamily:"'Playfair Display', serif",
                fontStyle:"italic", color:palette.inkLight, fontSize:20}}>
                Nessuna collezione ancora. Creane una con il pulsante in alto!
              </div>
            )}
          </>}

          {/* COLLECTION DETAIL */}
          {view==="collection-detail" && activeCol && <>
            {(showColForm||editCol) && (
              <CollectionForm initial={editCol} onSave={saveCollection}
                onCancel={()=>{setShowColForm(false);setEditCol(null);}}/>
            )}
            {!showColForm&&!editCol && (
              <CollectionDetail
                col={collections.find(c=>c.id===activeCol.id)||activeCol}
                books={books}
                onBack={()=>{setView("collections");setActiveCol(null);}}
                onEditCollection={c=>{setEditCol(c);setShowColForm(false);}}
                onToggleBook={toggleBookInCollection}
                onEditBook={b=>{setEditBook(b);setShowForm(false);setView("library");}}
                onDeleteBook={deleteBook}
              />
            )}
          </>}

        </div>

        {/* STATISTICHE — fuori dal div con padding per gestire il proprio layout */}
        {view==="stats" && (
          <StatsView books={books} goals={goals} initialYear={filterYear || new Date().getFullYear()}/>
        )}

      </div>
    </>
  );
}
