// Estratto da App.jsx (scorporo monolite).
import React from "react";
import { SHOP_DB } from "./data/shop.js";
import shopExtra from "./shopExtra.json";

export default function ShopPage() {
  const [query, setQuery] = React.useState("");
  const [activeCat, setActiveCat] = React.useState("all");
  const [selected, setSelected] = React.useState(null);
  const [copied, setCopied] = React.useState(null);

  // PHB curato (IT+EN) + ampliamento 5e.tools (mondano, EN)
  const ALL_ITEMS = React.useMemo(() => [...SHOP_DB.items, ...shopExtra], []);
  const ALL_CATS = React.useMemo(() => ([
    ...SHOP_DB.categorie,
    { key: "gemme", label: "Gemme & Tesori" },
    { key: "beni",  label: "Beni & Materiali" },
    { key: "altro", label: "Altro" },
  ]), []);

  const formatCosto = (item) => {
    if (item.costo_mo > 0) return `${item.costo_mo} mo`;
    if (item.costo_ma > 0) return `${item.costo_ma} ma`;
    return "gratuito";
  };

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    return ALL_ITEMS.filter(it => {
      const matchCat = activeCat === "all" || it.cat === activeCat;
      const matchQ = !q || it.nome.toLowerCase().includes(q) || (it.en || "").toLowerCase().includes(q);
      return matchCat && matchQ;
    });
  }, [query, activeCat, ALL_ITEMS]);

  const copyItem = (item) => {
    const txt = `${item.nome} — ${formatCosto(item)} — ${item.peso_kg > 0 ? item.peso_kg + " kg" : "—"}${item.danno && item.danno !== "—" ? " — " + item.danno : ""}`;
    navigator.clipboard.writeText(txt).catch(() => {});
    setCopied(item.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const catLabel = activeCat === "all" ? "Tutti gli oggetti"
    : ALL_CATS.find(c => c.key === activeCat)?.label || activeCat;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="section-header" style={{marginBottom:0,flexShrink:0}}>
        <span style={{color:"var(--gold)",fontSize:"1.1rem",fontWeight:700}}>🏪 Prezzi & Equipaggiamento</span>
        <span style={{fontSize:"0.78rem",color:"var(--text2)",marginLeft:8}}>PHB + 5e.tools · {ALL_ITEMS.length} oggetti</span>
      </div>

      {/* ── RICERCA ─────────────────────────────────────────── */}
      <div style={{padding:"10px 14px 0",flexShrink:0}}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="🔍 Cerca per nome (italiano o inglese)..."
          style={{width:"100%",boxSizing:"border-box",padding:"9px 12px",
            background:"var(--surface2)",border:"1px solid var(--border)",
            borderRadius:6,color:"var(--text)",fontSize:"0.95rem",outline:"none"}}
        />
      </div>

      <div style={{display:"flex",flex:1,overflow:"hidden",gap:0,marginTop:10}}>
        {/* ── SIDEBAR CATEGORIE ──────────────────────────────── */}
        <div style={{width:180,flexShrink:0,overflowY:"auto",borderRight:"1px solid var(--border)",
          padding:"6px 0",background:"var(--surface)"}}>
          {[{key:"all",label:"📦 Tutti"},...ALL_CATS].map(c => {
            const count = c.key === "all" ? ALL_ITEMS.length
              : ALL_ITEMS.filter(i => i.cat === c.key).length;
            return (
              <div key={c.key}
                onClick={() => { setActiveCat(c.key); setSelected(null); }}
                style={{
                  padding:"8px 12px",cursor:"pointer",fontSize:"0.8rem",
                  color: activeCat === c.key ? "var(--gold)" : "var(--text2)",
                  background: activeCat === c.key ? "var(--surface2)" : "transparent",
                  borderLeft: activeCat === c.key ? "3px solid var(--gold)" : "3px solid transparent",
                  display:"flex",justifyContent:"space-between",alignItems:"center",
                  transition:"all 0.15s",
                }}>
                <span>{c.label}</span>
                <span style={{fontSize:"0.72rem",opacity:0.6}}>{count}</span>
              </div>
            );
          })}
        </div>

        {/* ── LISTA + DETTAGLIO ──────────────────────────────── */}
        <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          {/* contatore */}
          <div style={{padding:"4px 14px",fontSize:"0.75rem",color:"var(--text3)",flexShrink:0,
            borderBottom:"1px solid var(--border)",background:"var(--surface)"}}>
            {filtered.length} oggetti · {catLabel}
          </div>

          <div style={{flex:1,display:"flex",overflow:"hidden"}}>
            {/* lista scrollabile */}
            <div style={{flex:1,overflowY:"auto",padding:"6px 8px"}}>
              {filtered.length === 0 && (
                <div style={{color:"var(--text3)",textAlign:"center",marginTop:40,fontSize:"0.9rem"}}>
                  Nessun risultato per "{query}"
                </div>
              )}
              {filtered.map(item => (
                <div key={item.id}
                  onClick={() => setSelected(selected?.id === item.id ? null : item)}
                  style={{
                    display:"flex",alignItems:"center",padding:"8px 10px",
                    borderRadius:6,cursor:"pointer",marginBottom:2,
                    background: selected?.id === item.id ? "var(--surface3)" : "transparent",
                    border:`1px solid ${selected?.id === item.id ? "var(--border)" : "transparent"}`,
                    transition:"all 0.12s",
                  }}
                  onMouseEnter={e => { if(selected?.id !== item.id) e.currentTarget.style.background="var(--surface2)"; }}
                  onMouseLeave={e => { if(selected?.id !== item.id) e.currentTarget.style.background="transparent"; }}
                >
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:"0.9rem",fontWeight:600,color:"var(--text)",
                      whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>
                      {item.nome}
                    </div>
                    <div style={{fontSize:"0.72rem",color:"var(--text3)"}}>
                      {item.en}{item.danno && item.danno !== "—" ? ` · ${item.danno}` : ""}
                    </div>
                  </div>
                  <div style={{marginLeft:10,textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:"0.9rem",fontWeight:700,color:"var(--gold)"}}>
                      {formatCosto(item)}
                    </div>
                    {item.peso_kg > 0 &&
                      <div style={{fontSize:"0.7rem",color:"var(--text3)"}}>{item.peso_kg} kg</div>
                    }
                  </div>
                </div>
              ))}
            </div>

            {/* pannello dettaglio */}
            {selected && (
              <div style={{width:260,flexShrink:0,borderLeft:"1px solid var(--border)",
                padding:14,overflowY:"auto",background:"var(--surface)"}}>
                <div style={{fontWeight:700,fontSize:"1rem",color:"var(--gold)",marginBottom:2}}>
                  {selected.nome}
                </div>
                <div style={{fontSize:"0.75rem",color:"var(--text3)",marginBottom:10}}>
                  {selected.en}
                </div>

                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 10px",marginBottom:10}}>
                  {[
                    ["💰 Costo", formatCosto(selected)],
                    ["⚖ Peso", selected.peso_kg > 0 ? `${selected.peso_kg} kg` : "—"],
                    selected.danno && selected.danno !== "—" ? ["⚔ Effetto", selected.danno] : null,
                  ].filter(Boolean).map(([label, val]) => (
                    <div key={label} style={{background:"var(--surface2)",borderRadius:5,padding:"6px 8px"}}>
                      <div style={{fontSize:"0.65rem",color:"var(--text3)",marginBottom:2}}>{label}</div>
                      <div style={{fontSize:"0.82rem",color:"var(--text)",fontWeight:600}}>{val}</div>
                    </div>
                  ))}
                </div>

                {selected.proprieta?.length > 0 && (
                  <div style={{marginBottom:10}}>
                    <div style={{fontSize:"0.7rem",color:"var(--text3)",marginBottom:4}}>Proprietà</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                      {selected.proprieta.map(p => (
                        <span key={p} style={{background:"rgba(180,140,50,0.12)",border:"1px solid var(--border)",
                          borderRadius:4,padding:"2px 6px",fontSize:"0.72rem",color:"var(--gold)"}}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.note && (
                  <div style={{fontSize:"0.8rem",color:"var(--text2)",lineHeight:1.5,
                    background:"var(--surface2)",borderRadius:5,padding:"8px 10px",marginBottom:10}}>
                    {selected.note}
                  </div>
                )}

                <button
                  onClick={() => copyItem(selected)}
                  style={{width:"100%",padding:"8px 0",background:"var(--surface2)",
                    border:"1px solid var(--border)",borderRadius:6,color:"var(--gold)",
                    cursor:"pointer",fontSize:"0.82rem",fontWeight:600}}>
                  {copied === selected.id ? "✓ Copiato!" : "📋 Copia riga"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
