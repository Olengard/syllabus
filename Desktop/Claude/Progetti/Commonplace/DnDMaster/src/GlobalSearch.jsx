import React from "react";
import { parseDice, rollDice } from "./DiceTray.jsx";

// ─── Helpers di matching / ponte EN↔IT ──────────────────────────────────────
// Normalizza per la ricerca: minuscolo, senza accenti, spazi collassati.
export function norm(s) {
  return (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Gli slug del catalogo 5e.tools sono in inglese ("palla di fuoco" inline ha
// slug "fireball"): de-slugificare dà il nome EN per il ponte EN↔IT gratuito.
export function deSlug(slug) {
  if (!slug) return "";
  return slug.replace(/-/g, " ").replace(/\b(imported|custom)\b/g, "").trim();
}

export const TYPE_META = {
  spell:   { icon: "✨", label: "Incantesimo",  tab: "spells",   color: "#7c5cbf" },
  monster: { icon: "🐉", label: "Mostro",       tab: "monsters", color: "#c0392b" },
  magic:   { icon: "💎", label: "Oggetto magico", tab: null,     color: "#2980b9" },
  item:    { icon: "🏪", label: "Oggetto",      tab: "shop",     color: "#16a085" },
  rule:    { icon: "📋", label: "Regola",       tab: null,       color: "#8e44ad" },
};
export const TYPE_ORDER = ["spell", "monster", "rule", "magic", "item"];
const MAX_PER_GROUP = 10;

// ─── Render dei dettagli per tipo (compatto, per consultazione live) ─────────
function Row({ label, value }) {
  if (value === undefined || value === null || value === "" || value === "—") return null;
  return (
    <div style={{ display: "flex", gap: 6, fontSize: "0.8rem", lineHeight: 1.5 }}>
      <span style={{ color: "var(--text3)", minWidth: 96, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--text)" }}>{value}</span>
    </div>
  );
}

function SpellDetail({ d }) {
  const lvl = d.level === 0 ? "Trucchetto" : `${d.level}° livello`;
  return (
    <>
      <Row label="Tipo" value={`${lvl}${d.school ? " · " + d.school : ""}`} />
      <Row label="Tempo di lancio" value={d.castingTime} />
      <Row label="Gittata" value={d.range} />
      <Row label="Durata" value={d.duration} />
      <Row label="Componenti" value={d.components} />
      {d.desc && <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.6, marginTop: 8 }}>{d.desc}</p>}
    </>
  );
}

function MonsterDetail({ d }) {
  const ab = [["FOR", d.str], ["DES", d.dex], ["COS", d.con], ["INT", d.int], ["SAG", d.wis], ["CAR", d.cha]];
  return (
    <>
      <Row label="Tipo" value={[d.size, d.type].filter(Boolean).join(" · ")} />
      <Row label="GS" value={d.cr} />
      <Row label="CA" value={d.ac} />
      <Row label="PF" value={d.hp ? `${d.hp}${d.hpDice ? " (" + d.hpDice + ")" : ""}` : ""} />
      <Row label="Velocità" value={d.speed} />
      {ab.some(([, v]) => v != null) && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: "0.78rem", margin: "6px 0", color: "var(--text2)" }}>
          {ab.map(([k, v]) => v != null && (
            <span key={k}><b style={{ color: "var(--text3)" }}>{k}</b> {v}</span>
          ))}
        </div>
      )}
      <Row label="Sensi" value={d.senses} />
      <Row label="Lingue" value={d.languages} />
      {Array.isArray(d.resistances) && d.resistances.length > 0 && <Row label="Resistenze" value={d.resistances.join(", ")} />}
      {Array.isArray(d.immunities) && d.immunities.length > 0 && <Row label="Immunità" value={d.immunities.join(", ")} />}
      {Array.isArray(d.traits) && d.traits.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {d.traits.map((t, i) => (
            <p key={i} style={{ fontSize: "0.8rem", color: "var(--text2)", lineHeight: 1.55, margin: "0 0 4px" }}>
              <b style={{ color: "var(--text)" }}>{t.name}.</b> {t.desc}
            </p>
          ))}
        </div>
      )}
      {Array.isArray(d.actions) && d.actions.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Azioni</div>
          {d.actions.map((a, i) => (
            <p key={i} style={{ fontSize: "0.8rem", color: "var(--text2)", lineHeight: 1.55, margin: "0 0 4px" }}>
              <b style={{ color: "var(--text)" }}>{a.name}.</b>{" "}
              {[a.type, a.bonus && `colpire ${a.bonus}`, a.damage && `${a.damage} ${a.damageType || ""}`.trim()].filter(Boolean).join(", ")}
              {a.desc ? ` ${a.desc}` : ""}
            </p>
          ))}
        </div>
      )}
    </>
  );
}

function MagicDetail({ d }) {
  return (
    <>
      <Row label="Categoria" value={[d.category, d.subcategory].filter(Boolean).join(" · ")} />
      <Row label="Rarità" value={d.rarity} />
      <Row label="CA" value={d.ac} />
      <Row label="Costo" value={d.cost} />
      <Row label="Peso" value={d.weight ? `${d.weight} lb` : ""} />
      {Array.isArray(d.properties) && d.properties.length > 0 && <Row label="Proprietà" value={d.properties.join(", ")} />}
      {d.notes && <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.6, marginTop: 8 }}>{d.notes}</p>}
    </>
  );
}

function ItemDetail({ d }) {
  const costo = d.costo_mo > 0 ? `${d.costo_mo} mo` : d.costo_ma > 0 ? `${d.costo_ma} ma` : "gratuito";
  return (
    <>
      <Row label="Costo" value={costo} />
      <Row label="Peso" value={d.peso_kg > 0 ? `${d.peso_kg} kg` : ""} />
      <Row label="Danno" value={d.danno} />
      {Array.isArray(d.proprieta) && d.proprieta.length > 0 && <Row label="Proprietà" value={d.proprieta.join(", ")} />}
      {d.note && <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.6, marginTop: 8 }}>{d.note}</p>}
    </>
  );
}

function RuleDetail({ d }) {
  return (
    <>
      {d.sectionLabel && <Row label="Sezione" value={d.sectionLabel} />}
      <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.6, marginTop: 8 }}>{d.testo}</p>
    </>
  );
}

export function Detail({ entry }) {
  const d = entry.data;
  switch (entry.type) {
    case "spell":   return <SpellDetail d={d} />;
    case "monster": return <MonsterDetail d={d} />;
    case "magic":   return <MagicDetail d={d} />;
    case "item":    return <ItemDetail d={d} />;
    case "rule":    return <RuleDetail d={d} />;
    default:        return null;
  }
}

// ─── Componente principale ───────────────────────────────────────────────────
export default function GlobalSearch({ entries, onClose, onNavigate, pinnedIds, onTogglePin, onRoll }) {
  const [query, setQuery] = React.useState("");
  const [sel, setSel] = React.useState(0);
  const [expanded, setExpanded] = React.useState(null);
  const [lastRoll, setLastRoll] = React.useState(null);
  const inputRef = React.useRef(null);
  const listRef = React.useRef(null);

  // La query è una formula di dadi? (es. "3d6+2") → riga speciale "Tira"
  const diceValid = React.useMemo(() => parseDice(query) !== null, [query]);
  const doRoll = () => {
    const r = rollDice(query);
    if (!r) return;
    setLastRoll(r);
    onRoll?.(r);
  };

  React.useEffect(() => { inputRef.current?.focus(); }, []);

  // Filtra: ogni parola della query deve comparire nell'haystack (AND).
  const results = React.useMemo(() => {
    const q = norm(query);
    if (!q) return [];
    const tokens = q.split(" ").filter(Boolean);
    const out = [];
    for (const e of entries) {
      if (tokens.every(t => e._hay.includes(t))) out.push(e);
      if (out.length > 400) break; // hard cap di sicurezza
    }
    return out;
  }, [query, entries]);

  // Raggruppa per tipo (cap per gruppo) e appiattisci per la navigazione tastiera.
  const { groups, flat } = React.useMemo(() => {
    const byType = {};
    for (const e of results) (byType[e.type] ||= []).push(e);
    const groups = [];
    const flat = [];
    for (const type of TYPE_ORDER) {
      const arr = byType[type];
      if (!arr || !arr.length) continue;
      const shown = arr.slice(0, MAX_PER_GROUP);
      groups.push({ type, shown, total: arr.length });
      flat.push(...shown);
    }
    return { groups, flat };
  }, [results]);

  React.useEffect(() => { setSel(0); setExpanded(null); setLastRoll(null); }, [query]);

  const move = (delta) => {
    if (!flat.length) return;
    setSel(s => {
      const n = (s + delta + flat.length) % flat.length;
      return n;
    });
  };

  React.useEffect(() => {
    // scorri il risultato selezionato in vista
    const el = listRef.current?.querySelector(`[data-idx="${sel}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); onClose(); }
    else if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (diceValid) { doRoll(); return; } // Invio ripetuto = ritira
      const cur = flat[sel];
      if (cur) setExpanded(x => x === cur.id ? null : cur.id);
    }
  };

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  let runningIdx = -1;

  return (
    <div onClick={handleBackdrop} onKeyDown={onKeyDown} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 9500,
      display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "8vh 12px 12px",
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
        width: "100%", maxWidth: 680, maxHeight: "80vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}>
        {/* barra di ricerca */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontSize: "1.1rem", opacity: 0.7 }}>🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cerca incantesimi, mostri, regole, oggetti… (IT o EN)"
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text)", fontSize: "1rem" }}
          />
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>✕</button>
        </div>

        {/* risultati */}
        <div ref={listRef} style={{ overflowY: "auto", flex: 1 }}>
          {!query && (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: "0.85rem", lineHeight: 1.7 }}>
              Cerca in tutto il gestionale da qui.<br />
              Funziona in <b>italiano</b> e in <b>inglese</b> (es. <i>fireball</i> → Palla di Fuoco).<br />
              Digita una formula (es. <i>2d8+3</i>) per <b>tirare i dadi</b> · 📌 aggiunge alla <b>Sessione</b>.<br />
              <span style={{ fontSize: "0.78rem" }}>↑↓ per scorrere · Invio per aprire · Esc per chiudere</span>
            </div>
          )}
          {diceValid && (
            <div onClick={doRoll} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
              cursor: "pointer", borderLeft: "3px solid var(--gold)",
              background: "var(--surface2)", borderBottom: "1px solid var(--border)",
            }}>
              <span style={{ fontSize: "1.2rem" }}>🎲</span>
              <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>
                Tira {query.toLowerCase().replace(/\s+/g, "")}
              </span>
              {lastRoll ? (
                <span style={{ marginLeft: "auto", display: "flex", alignItems: "baseline", gap: 8 }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{lastRoll.breakdown} =</span>
                  <span style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--gold2)" }}>{lastRoll.total}</span>
                </span>
              ) : (
                <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text3)" }}>Invio per tirare</span>
              )}
            </div>
          )}
          {query && flat.length === 0 && !diceValid && (
            <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: "0.85rem" }}>
              Nessun risultato per "{query}".
            </div>
          )}
          {groups.map(({ type, shown, total }) => {
            const meta = TYPE_META[type];
            return (
              <div key={type}>
                <div style={{
                  padding: "6px 14px", fontSize: "0.68rem", color: "var(--text3)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                  background: "var(--surface2)", position: "sticky", top: 0,
                }}>
                  {meta.icon} {meta.label} · {total}{total > MAX_PER_GROUP ? ` (primi ${MAX_PER_GROUP})` : ""}
                </div>
                {shown.map(e => {
                  runningIdx++;
                  const idx = runningIdx;
                  const isSel = idx === sel;
                  const isOpen = expanded === e.id;
                  return (
                    <div key={e.id} data-idx={idx}>
                      <div
                        onClick={() => { setSel(idx); setExpanded(x => x === e.id ? null : e.id); }}
                        style={{
                          display: "flex", alignItems: "baseline", gap: 8, padding: "8px 14px",
                          cursor: "pointer", borderLeft: `3px solid ${isSel ? meta.color : "transparent"}`,
                          background: isSel ? "var(--surface2)" : "transparent",
                        }}>
                        <span style={{ fontWeight: 600, color: "var(--text)", fontSize: "0.9rem" }}>{e.title}</span>
                        {e.en && norm(e.en) !== norm(e.title) && (
                          <span style={{ fontSize: "0.76rem", color: "var(--text3)", fontStyle: "italic" }}>{e.en}</span>
                        )}
                        <span style={{ marginLeft: "auto", fontSize: "0.74rem", color: "var(--text3)", whiteSpace: "nowrap" }}>{e.sub}</span>
                        {onTogglePin && (
                          <button
                            onClick={(ev) => { ev.stopPropagation(); onTogglePin(e); }}
                            title={pinnedIds?.has(e.id) ? "Rimuovi dalla Sessione" : "Aggiungi alla Sessione (📌)"}
                            style={{
                              background: "none", border: "none", cursor: "pointer", padding: "0 2px",
                              fontSize: "0.9rem", lineHeight: 1, flexShrink: 0,
                              opacity: pinnedIds?.has(e.id) ? 1 : 0.35,
                              filter: pinnedIds?.has(e.id) ? "drop-shadow(0 0 3px rgba(212,168,76,0.8))" : "grayscale(1)",
                            }}>📌</button>
                        )}
                      </div>
                      {isOpen && (
                        <div style={{ padding: "4px 16px 14px 20px", borderLeft: `3px solid ${meta.color}`, background: "var(--surface2)" }}>
                          <Detail entry={e} />
                          {meta.tab && onNavigate && (
                            <button
                              onClick={() => { onNavigate(meta.tab); onClose(); }}
                              style={{ marginTop: 10, background: "none", border: "1px solid var(--border2)", color: "var(--gold)", borderRadius: 6, padding: "3px 10px", fontSize: "0.76rem", cursor: "pointer" }}>
                              Apri in {meta.label} ▸
                            </button>
                          )}
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
    </div>
  );
}
