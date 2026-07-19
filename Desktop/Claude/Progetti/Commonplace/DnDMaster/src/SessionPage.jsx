import React from "react";
import { TYPE_META, TYPE_ORDER, Detail } from "./GlobalSearch.jsx";
import { K, loadJSON, saveJSON } from "./storage.js";

// ─── Orologio di gioco (tempo in-game della campagna) ───────────────────────
export const CLOCK_KEY = K.gameClock;

export function loadClock() {
  try {
    const c = loadJSON(K.gameClock, null);
    if (c && Number.isFinite(c.day) && Number.isFinite(c.minutes)) return c;
  } catch {}
  return { day: 1, minutes: 8 * 60 }; // Giorno 1, 08:00
}

// Avanza l'orologio di N minuti gestendo il cambio di giorno.
export function advanceClock(clock, deltaMinutes) {
  const total = clock.day * 1440 + clock.minutes + deltaMinutes;
  const safe = Math.max(1440, total); // mai prima di Giorno 1, 00:00
  return { day: Math.floor(safe / 1440), minutes: safe % 1440 };
}

export function clockTime(clock) {
  const h = String(Math.floor(clock.minutes / 60)).padStart(2, "0");
  const m = String(clock.minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Cruscotto di sessione: orologio di gioco + riposi brevi/lunghi per il party.
function SessionDashboard({ characters, onUpdateCharacters }) {
  const [clock, setClock] = React.useState(loadClock);
  const [showShort, setShowShort] = React.useState(false);
  const [heals, setHeals] = React.useState({});
  const pcs = (characters || []).filter(c => c.name && c.name !== "Nuovo Personaggio");

  const save = (c) => { setClock(c); saveJSON(K.gameClock, c); };
  const bump = (min) => save(advanceClock(clock, min));

  const longRest = () => {
    if (!pcs.length) { window.alert("Nessun personaggio nel gruppo."); return; }
    if (!window.confirm(`🌙 Riposo lungo per ${pcs.length} PG?\nPF al massimo, slot ripristinati, TS morte azzerati, metà dadi vita recuperati, +8 ore.`)) return;
    onUpdateCharacters(pcs.map(c => ({
      ...c, currentHp: c.maxHp, tempHp: 0, usedSpellSlots: {},
      deathSaves: { successes: 0, failures: 0 },
      // 5e: recupera metà dei dadi vita totali (= livello), minimo 1
      hitDiceUsed: Math.max(0, (c.hitDiceUsed || 0) - Math.max(1, Math.floor((c.level || 1) / 2))),
    })));
    save(advanceClock(clock, 8 * 60));
  };

  const applyShortRest = () => {
    onUpdateCharacters(pcs.map(c => {
      const heal = parseInt(heals[c.id], 10) || 0;
      return heal > 0 ? { ...c, currentHp: Math.min(c.maxHp || 0, (c.currentHp || 0) + heal) } : c;
    }));
    save(advanceClock(clock, 60));
    setShowShort(false);
    setHeals({});
  };

  const btn = { fontSize: "0.66rem", padding: "3px 8px" };
  return (
    <div style={{ flexShrink: 0, padding: "10px 14px 0" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
        background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px" }}>
        {/* orologio */}
        <span title="Orologio di gioco" style={{ fontSize: "0.9rem" }}>🕐</span>
        <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.82rem", color: "var(--gold2)", display: "flex", alignItems: "center", gap: 4 }}>
          Giorno
          <input type="number" min={1} value={clock.day}
            onChange={e => save({ ...clock, day: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            style={{ width: 52, fontSize: "0.8rem", textAlign: "center" }} />
          <input type="time" value={clockTime(clock)}
            onChange={e => { const [h, m] = e.target.value.split(":").map(Number); if (!isNaN(h)) save({ ...clock, minutes: h * 60 + (m || 0) }); }}
            style={{ fontSize: "0.8rem" }} />
        </span>
        <button className="btn btn-sm" style={btn} onClick={() => bump(10)}>+10 min</button>
        <button className="btn btn-sm" style={btn} onClick={() => bump(60)}>+1 ora</button>
        <button className="btn btn-sm" style={btn} title="Alba (06:00)" onClick={() => save({ ...clock, minutes: 6 * 60 })}>☀️</button>
        <button className="btn btn-sm" style={btn} title="Tramonto (18:00)" onClick={() => save({ ...clock, minutes: 18 * 60 })}>🌆</button>
        {/* riposi */}
        <span style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <button className="btn btn-sm" style={btn} onClick={() => setShowShort(s => !s)}>🏕 Riposo breve</button>
          <button className="btn btn-sm" style={btn} onClick={longRest}>🌙 Riposo lungo</button>
        </span>
      </div>

      {showShort && (
        <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderTop: "none",
          borderRadius: "0 0 8px 8px", padding: "8px 12px", margin: "0 8px" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", marginBottom: 6 }}>
            🏕 Riposo breve (+1 ora) — PF recuperati spendendo Dadi Vita (tirati al tavolo):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {pcs.map(c => (
              <label key={c.id} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: "0.78rem", color: "var(--text2)" }}>
                {c.name} <span style={{ color: "var(--text3)", fontSize: "0.7rem" }}>({c.currentHp}/{c.maxHp})</span>
                <input type="number" min={0} placeholder="+PF" value={heals[c.id] ?? ""}
                  onChange={e => setHeals(h => ({ ...h, [c.id]: e.target.value }))}
                  style={{ width: 56, fontSize: "0.78rem" }} />
              </label>
            ))}
            <button className="btn btn-sm btn-primary" style={btn} onClick={applyShortRest}>Applica</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Tab 📌 Sessione: gli elementi pinnati dalla palette ⌘K (mostri, incantesimi,
// regole, oggetti…) raccolti in un'unica schermata per la serata. L'idea è
// "preparo prima, in sessione ho già tutto davanti" — da schermo del master.
export default function SessionPage({ pinned, onTogglePin, onClearAll, onOpenSearch, characters, onUpdateCharacters }) {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div className="section-header" style={{ marginBottom: 0, flexShrink: 0 }}>
        <span style={{ color: "var(--gold)", fontSize: "1.1rem", fontWeight: 700 }}>📌 Sessione</span>
        <span style={{ fontSize: "0.78rem", color: "var(--text2)", marginLeft: 8 }}>{pinned.length ? `${pinned.length} elementi preparati` : ""}</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-sm" onClick={onOpenSearch} title="Aggiungi altri elementi">🔍 Aggiungi</button>
          {pinned.length > 0 && (
            <button className="btn btn-sm" onClick={() => {
              if (window.confirm("Svuotare tutti gli elementi della sessione?")) onClearAll();
            }}>Svuota</button>
          )}
        </span>
      </div>

      <SessionDashboard characters={characters} onUpdateCharacters={onUpdateCharacters} />

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        {!pinned.length && (
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
        )}
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
