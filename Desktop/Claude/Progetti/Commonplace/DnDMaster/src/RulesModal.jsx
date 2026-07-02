// Estratto da App.jsx (scorporo monolite).
import React from "react";
import { RULES_DB } from "./data/rules.js";

export default function RulesModal({ onClose }) {
  const [activeCat, setActiveCat] = React.useState(RULES_DB[0].id);
  const catData = RULES_DB.find(c => c.id === activeCat);

  // Chiudi con tap fuori dal pannello
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div onClick={handleBackdrop} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,0.72)",zIndex:9000,
      display:"flex",alignItems:"center",justifyContent:"center",padding:12,
    }}>
      <div style={{
        background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,
        width:"100%",maxWidth:760,height:"min(88vh,640px)",
        display:"flex",flexDirection:"column",overflow:"hidden",
        boxShadow:"0 8px 40px rgba(0,0,0,0.6)",
      }}>
        {/* header */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
          padding:"12px 16px",borderBottom:"1px solid var(--border)",flexShrink:0}}>
          <span style={{fontWeight:700,fontSize:"1rem",color:"var(--gold)"}}>📋 Tabelle di Riferimento</span>
          <button onClick={onClose} style={{background:"none",border:"none",color:"var(--text2)",
            fontSize:"1.3rem",cursor:"pointer",lineHeight:1,padding:"0 4px"}}>✕</button>
        </div>

        <div style={{display:"flex",flex:1,overflow:"hidden"}}>
          {/* sidebar categorie */}
          <div style={{width:170,flexShrink:0,overflowY:"auto",
            borderRight:"1px solid var(--border)",background:"var(--surface)"}}>
            {RULES_DB.map(cat => (
              <div key={cat.id} onClick={() => setActiveCat(cat.id)}
                style={{
                  padding:"10px 12px",cursor:"pointer",fontSize:"0.82rem",
                  color: activeCat === cat.id ? "var(--gold)" : "var(--text2)",
                  background: activeCat === cat.id ? "var(--surface2)" : "transparent",
                  borderLeft: activeCat === cat.id ? `3px solid ${cat.colore}` : "3px solid transparent",
                  transition:"all 0.12s",fontWeight: activeCat === cat.id ? 600 : 400,
                }}>
                {cat.label}
              </div>
            ))}
          </div>

          {/* contenuto */}
          <div style={{flex:1,overflowY:"auto",padding:"12px 16px"}}>
            {catData && (
              <>
                <div style={{fontSize:"0.72rem",color:"var(--text3)",marginBottom:12,
                  textTransform:"uppercase",letterSpacing:"0.08em"}}>
                  {catData.label} · {catData.voci.length} voci
                </div>
                {catData.voci.map((v, i) => (
                  <div key={i} style={{marginBottom:8,borderRadius:7,overflow:"hidden",
                    border:"1px solid var(--border)"}}>
                    <div style={{
                      padding:"8px 12px",background:"var(--surface2)",
                      borderLeft:`4px solid ${catData.colore}`,
                      fontSize:"0.88rem",fontWeight:700,color:"var(--text)",
                    }}>
                      {v.titolo}
                    </div>
                    <div style={{
                      padding:"8px 12px",fontSize:"0.82rem",
                      color:"var(--text2)",lineHeight:1.6,
                      background:"var(--surface)",
                    }}>
                      {v.testo}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
