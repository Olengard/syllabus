import React from "react";
import { TYPE_META, TYPE_ORDER, Detail } from "./GlobalSearch.jsx";

// Tab 📌 Sessione: gli elementi pinnati dalla palette ⌘K (mostri, incantesimi,
// regole, oggetti…) raccolti in un'unica schermata per la serata. L'idea è
// "preparo prima, in sessione ho già tutto davanti" — da schermo del master.
export default function SessionPage({ pinned, onTogglePin, onClearAll, onOpenSearch }) {
  const [expanded, setExpanded] = React.useState(() => new Set());

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const groups = React.useMemo(() => {
    const byType = {};
    for (const e of pinned) (byType[e.type] ||= []).push(e);
    return TYPE_ORDER.filter(t => byType[t]?.length).map(t => ({ type: t, items: byType[t] }));
  }, [pinned]);

  if (!pinned.length) {
    return (
      <div className="empty-screen">
        <div className="empty-screen-icon">📌</div>
        <h2>Nessun elemento in Sessione</h2>
        <p style={{ maxWidth: 420, lineHeight: 1.7 }}>
          Prepara la serata: cerca con <b>🔍 Cerca</b> (Ctrl/Cmd+K) mostri, incantesimi,
          regole e oggetti che ti serviranno, e aggiungili qui col 📌.
          In sessione li avrai tutti davanti, senza cercare.
        </p>
        <button className="btn btn-primary" onClick={onOpenSearch}>🔍 Apri la ricerca</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div className="section-header" style={{ marginBottom: 0, flexShrink: 0 }}>
        <span style={{ color: "var(--gold)", fontSize: "1.1rem", fontWeight: 700 }}>📌 Sessione</span>
        <span style={{ fontSize: "0.78rem", color: "var(--text2)", marginLeft: 8 }}>{pinned.length} elementi preparati</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-sm" onClick={onOpenSearch} title="Aggiungi altri elementi">🔍 Aggiungi</button>
          <button className="btn btn-sm" onClick={() => {
            if (window.confirm("Svuotare tutti gli elementi della sessione?")) onClearAll();
          }}>Svuota</button>
        </span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        {groups.map(({ type, items }) => {
          const meta = TYPE_META[type];
          return (
            <div key={type} style={{ marginBottom: 14 }}>
              <div style={{
                fontSize: "0.68rem", color: "var(--text3)", textTransform: "uppercase",
                letterSpacing: "0.08em", margin: "0 0 6px 2px",
              }}>
                {meta.icon} {meta.label} · {items.length}
              </div>
              {items.map(e => {
                const isOpen = expanded.has(e.id);
                return (
                  <div key={e.id} style={{ marginBottom: 6, border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
                    <div
                      onClick={() => toggle(e.id)}
                      style={{
                        display: "flex", alignItems: "baseline", gap: 8, padding: "8px 12px",
                        cursor: "pointer", background: "var(--surface2)",
                        borderLeft: `4px solid ${meta.color}`,
                      }}>
                      <span style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9rem" }}>{e.title}</span>
                      {e.en && e.en.toLowerCase() !== e.title.toLowerCase() && (
                        <span style={{ fontSize: "0.74rem", color: "var(--text3)", fontStyle: "italic" }}>{e.en}</span>
                      )}
                      <span style={{ marginLeft: "auto", fontSize: "0.74rem", color: "var(--text3)", whiteSpace: "nowrap" }}>{e.sub}</span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{isOpen ? "▾" : "▸"}</span>
                      <button
                        onClick={(ev) => { ev.stopPropagation(); onTogglePin(e); }}
                        title="Rimuovi dalla Sessione"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "0.85rem", lineHeight: 1 }}>
                        ✕
                      </button>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "8px 12px 12px", background: "var(--surface)", borderLeft: `4px solid ${meta.color}` }}>
                        <Detail entry={e} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
