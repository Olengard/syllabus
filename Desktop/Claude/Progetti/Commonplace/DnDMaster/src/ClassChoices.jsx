import React from "react";
import { getOptionalFeatures, FEATURE_TYPE_LABELS, getFeats } from "./catalog.js";

const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ABILITY_FULL = { STR: "Forza", DEX: "Destrezza", CON: "Costituzione", INT: "Intelligenza", WIS: "Saggezza", CHA: "Carisma" };

// Appiattisce le `entries` 5e.tools in testo leggibile.
function flatten(entries) {
  if (!entries) return "";
  if (typeof entries === "string") return entries;
  if (Array.isArray(entries)) return entries.map(flatten).filter(Boolean).join("\n");
  if (entries.entries) return flatten(entries.entries);
  if (entries.items) return entries.items.map(flatten).filter(Boolean).join("\n");
  return entries.text || entries.entry || "";
}
const clean = (s) => (s || "").replace(/\{@[a-z]+ ([^|}]+)[^}]*\}/g, "$1");

function prereqText(pr) {
  if (!Array.isArray(pr) || !pr.length) return "";
  return pr.map((p) =>
    Object.entries(p).map(([k, v]) => {
      if (k === "level") return "Liv " + (v.level || v);
      if (k === "spell") return Array.isArray(v) ? clean(v.join(", ")) : clean(String(v));
      if (k === "pact") return "Patto " + v;
      if (k === "feature") return Array.isArray(v) ? clean(v.join(", ")) : clean(String(v));
      return typeof v === "object" ? "" : `${v}`;
    }).filter(Boolean).join(", ")
  ).filter(Boolean).join(" / ");
}

// ─── Una riga ASI (un livello che concede Aumento Caratteristiche) ────────────
function AsiSlot({ level, entry, feats, onChange }) {
  const kind = entry?.kind || "asi";
  const mode = entry?.mode || "one"; // "one" = +2 a una; "two" = +1 a due
  const bonuses = entry?.bonuses || {};
  const abA = Object.keys(bonuses)[0] || "";
  const abB = Object.keys(bonuses)[1] || "";

  const set = (patch) => onChange({ kind, mode, bonuses, feat: entry?.feat || "", ...patch });

  const setMode = (m) => set({ mode: m, bonuses: {} });
  const setOne = (ab) => set({ bonuses: ab ? { [ab]: 2 } : {} });
  const setTwo = (a, b) => {
    const nb = {};
    if (a) nb[a] = 1;
    if (b && b !== a) nb[b] = 1;
    set({ bonuses: nb });
  };

  const selStyle = { padding: "5px 6px", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 5, color: "var(--text)", fontSize: "0.8rem" };

  return (
    <div className="section" style={{ padding: 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ fontFamily: "'Cinzel',serif", color: "var(--gold)", fontSize: "0.85rem" }}>Livello {level}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className={`btn btn-sm${kind === "asi" ? " btn-primary" : ""}`} onClick={() => set({ kind: "asi", feat: "" })}>Caratteristiche</button>
          <button className={`btn btn-sm${kind === "feat" ? " btn-primary" : ""}`} onClick={() => set({ kind: "feat", bonuses: {} })}>Talento</button>
        </div>
      </div>

      <div style={{ padding: 10 }}>
        {kind === "asi" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 12, fontSize: "0.78rem", color: "var(--text2)" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input type="radio" checked={mode === "one"} onChange={() => setMode("one")} /> +2 a una
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 5, cursor: "pointer" }}>
                <input type="radio" checked={mode === "two"} onChange={() => setMode("two")} /> +1 a due
              </label>
            </div>
            {mode === "one" ? (
              <select value={abA} onChange={(e) => setOne(e.target.value)} style={selStyle}>
                <option value="">— scegli caratteristica —</option>
                {ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_FULL[a]} (+2)</option>)}
              </select>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <select value={abA} onChange={(e) => setTwo(e.target.value, abB)} style={{ ...selStyle, flex: 1 }}>
                  <option value="">— prima (+1) —</option>
                  {ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_FULL[a]}</option>)}
                </select>
                <select value={abB} onChange={(e) => setTwo(abA, e.target.value)} style={{ ...selStyle, flex: 1 }}>
                  <option value="">— seconda (+1) —</option>
                  {ABILITIES.filter((a) => a !== abA).map((a) => <option key={a} value={a}>{ABILITY_FULL[a]}</option>)}
                </select>
              </div>
            )}
          </div>
        ) : (
          <select value={entry?.feat || ""} onChange={(e) => set({ feat: e.target.value })} style={{ ...selStyle, width: "100%" }}>
            <option value="">{feats ? "— scegli talento —" : "caricamento talenti…"}</option>
            {(feats || []).map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        )}
        {kind === "feat" && entry?.feat && (
          <div style={{ fontSize: "0.68rem", color: "var(--text3)", marginTop: 6 }}>
            ⚠ I talenti che danno bonus alle caratteristiche (mezzi-talenti) vanno aggiustati a mano nelle Statistiche.
          </div>
        )}
      </div>
    </div>
  );
}

// progression / asiLevels / featuresByLevel / subclassFeatures vengono dal CharacterSheet
export default function ClassChoices({ char, onChange, progression, asiLevels, featuresByLevel, subclassFeatures }) {
  const [ofList, setOfList] = React.useState(null);
  const [feats, setFeats]   = React.useState(null);
  const [error, setError]   = React.useState("");
  const [query, setQuery]   = React.useState("");
  const [expanded, setExpanded] = React.useState(null);
  const [showFeatures, setShowFeatures] = React.useState(false);

  const level = char.level || 1;
  const hasProgression = !!(progression && progression.length);
  const hasAsi = !!(asiLevels && asiLevels.length);

  // Carica optional features solo se la classe ha una progressione
  React.useEffect(() => {
    if (!hasProgression) return;
    let alive = true;
    getOptionalFeatures().then((l) => alive && setOfList(l)).catch((e) => alive && setError(e.message));
    return () => { alive = false; };
  }, [hasProgression]);

  // Carica i talenti solo se ci sono slot ASI
  React.useEffect(() => {
    if (!hasAsi) return;
    let alive = true;
    getFeats().then((l) => alive && setFeats(l)).catch(() => alive && setFeats([]));
    return () => { alive = false; };
  }, [hasAsi]);

  // ── Logica ASI: applica il bonus NETTO alle caratteristiche, senza doppi conteggi ──
  const asiMap = char.choices?.asi || {};
  const computeTotal = (map, levels) => {
    const t = {};
    for (const lv of levels) {
      const e = map[lv];
      if (e?.kind === "asi") for (const [ab, v] of Object.entries(e.bonuses || {})) t[ab] = (t[ab] || 0) + v;
    }
    return t;
  };
  const reconcile = (newMap) => {
    const total = computeTotal(newMap, asiLevels || []);
    const applied = char.choices?._asiApplied || {};
    const abilities = { ...char.abilities };
    const keys = new Set([...Object.keys(total), ...Object.keys(applied)]);
    for (const ab of keys) abilities[ab] = (abilities[ab] ?? 10) + (total[ab] || 0) - (applied[ab] || 0);
    onChange({ ...char, abilities, choices: { ...(char.choices || {}), asi: newMap, _asiApplied: total } });
  };
  // Riallinea i bonus quando cambiano i livelli ASI disponibili (es. cambio di livello)
  const asiKey = JSON.stringify(asiLevels || []);
  React.useEffect(() => {
    const total = computeTotal(asiMap, asiLevels || []);
    const applied = char.choices?._asiApplied || {};
    if (JSON.stringify(total) !== JSON.stringify(applied)) reconcile(asiMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asiKey]);

  const setSlot = (lv, entry) => reconcile({ ...asiMap, [lv]: entry });

  function setOFSelection(progName, names) {
    onChange({
      ...char,
      choices: { ...(char.choices || {}), optionalFeatures: { ...(char.choices?.optionalFeatures || {}), [progName]: names } },
    });
  }

  // Privilegi (classe + sottoclasse) fino al livello, per il display di sola lettura
  const mergedFeatures = React.useMemo(() => {
    const out = {};
    const add = (fbl) => {
      for (const [lv, feats] of Object.entries(fbl || {})) {
        if (+lv > level) continue;
        (out[lv] ||= []).push(...(Array.isArray(feats) ? feats : []));
      }
    };
    add(featuresByLevel);
    add(subclassFeatures);
    return out;
  }, [featuresByLevel, subclassFeatures, level]);

  const nothing = !hasProgression && !hasAsi && !featuresByLevel;
  if (nothing) {
    return (
      <div style={{ color: "var(--text3)", fontSize: "0.82rem", fontStyle: "italic", padding: 12, lineHeight: 1.6 }}>
        {char.class
          ? <>La classe <strong>{char.class}</strong> è stata importata prima di questo aggiornamento (o non ha dati di scelte).
             <br />Reimportala dal <strong>📥 Catalogo online → Classi</strong> per abilitare ASI, infusioni, invocazioni e l'elenco privilegi.</>
          : "Seleziona prima una classe."}
      </div>
    );
  }

  const selectedByProg = char.choices?.optionalFeatures || {};

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && <div style={{ color: "var(--red2)", fontSize: "0.82rem" }}>Errore: {error}</div>}

      {/* ── ASI / Talenti ── */}
      {hasAsi && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontFamily: "'Cinzel',serif", color: "var(--gold2)", fontSize: "0.8rem", letterSpacing: "0.05em" }}>
            AUMENTI CARATTERISTICHE / TALENTI
          </div>
          <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginTop: -4 }}>
            Gli aumenti aggiornano automaticamente le caratteristiche nella scheda.
          </div>
          {asiLevels.map((lv) => (
            <AsiSlot key={lv} level={lv} entry={asiMap[lv]} feats={feats} onChange={(e) => setSlot(lv, e)} />
          ))}
        </div>
      )}

      {/* ── Optional features (infusioni, invocazioni, …) ── */}
      {hasProgression && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!ofList ? (
            <div style={{ color: "var(--gold)", fontSize: "0.85rem" }}>⏳ Caricamento opzioni…</div>
          ) : progression.map((prog) => {
            const count = (prog.progression && prog.progression[level - 1]) || 0;
            const types = prog.featureType || [];
            const typeLabel = FEATURE_TYPE_LABELS[types[0]] || prog.name || "Opzioni";
            const options = ofList.filter((o) => (o.featureType || []).some((t) => types.includes(t)));
            const selected = selectedByProg[prog.name] || [];
            const q = query.trim().toLowerCase();
            const shown = q ? options.filter((o) => o.name.toLowerCase().includes(q)) : options;
            const toggle = (name) => {
              if (selected.includes(name)) setOFSelection(prog.name, selected.filter((n) => n !== name));
              else if (selected.length < count) setOFSelection(prog.name, [...selected, name]);
            };
            return (
              <div key={prog.name} className="section" style={{ padding: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "'Cinzel',serif", color: "var(--gold)", fontSize: "0.9rem" }}>{prog.name}</div>
                  <div style={{ fontSize: "0.78rem", color: selected.length >= count ? "var(--gold2)" : "var(--text3)" }}>
                    {selected.length}/{count} scelte (Lv{level})
                  </div>
                </div>
                {count === 0 ? (
                  <div style={{ padding: 12, fontSize: "0.8rem", color: "var(--text3)", fontStyle: "italic" }}>
                    Nessuna scelta disponibile al livello {level}.
                  </div>
                ) : (
                  <div style={{ padding: 10 }}>
                    <input placeholder={`Cerca ${typeLabel.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", marginBottom: 8, background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: "0.82rem" }} />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "42vh", overflowY: "auto" }}>
                      {shown.map((o) => {
                        const isSel = selected.includes(o.name);
                        const atLimit = selected.length >= count && !isSel;
                        const pr = prereqText(o.prerequisite);
                        const isOpen = expanded === o.name;
                        return (
                          <div key={o.name + (o.source || "")} style={{ background: isSel ? "rgba(200,144,58,0.12)" : "var(--surface3)", border: `1px solid ${isSel ? "var(--gold)" : "var(--border)"}`, borderRadius: 5, padding: "6px 8px", opacity: atLimit ? 0.5 : 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <label style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, cursor: atLimit ? "not-allowed" : "pointer" }}>
                                <input type="checkbox" checked={isSel} disabled={atLimit} onChange={() => toggle(o.name)} />
                                <span style={{ fontSize: "0.84rem", color: "var(--text)" }}>{o.name}</span>
                                {pr && <span style={{ fontSize: "0.66rem", color: "var(--text3)" }}>· {pr}</span>}
                              </label>
                              <button className="btn btn-sm" style={{ fontSize: "0.62rem" }} onClick={() => setExpanded(isOpen ? null : o.name)}>{isOpen ? "−" : "i"}</button>
                            </div>
                            {isOpen && (
                              <div style={{ fontSize: "0.74rem", color: "var(--text3)", marginTop: 6, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                                {clean(flatten(o.entries)) || "—"}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {shown.length === 0 && <div style={{ color: "var(--text3)", fontStyle: "italic", fontSize: "0.8rem", padding: 6 }}>Nessuna opzione.</div>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Elenco privilegi (sola lettura) ── */}
      {featuresByLevel && Object.keys(mergedFeatures).length > 0 && (
        <div className="section" style={{ padding: 0 }}>
          <button onClick={() => setShowFeatures((s) => !s)}
            style={{ width: "100%", textAlign: "left", padding: "10px 12px", background: "transparent", border: "none", color: "var(--gold)", fontFamily: "'Cinzel',serif", fontSize: "0.85rem", cursor: "pointer" }}>
            {showFeatures ? "▾" : "▸"} TUTTI I PRIVILEGI (fino a Lv{level})
          </button>
          {showFeatures && (
            <div style={{ padding: "0 12px 12px" }}>
              {Object.entries(mergedFeatures).sort(([a], [b]) => +a - +b).map(([lv, feats]) => (
                <div key={lv} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: "0.66rem", color: "var(--gold2)", letterSpacing: "0.08em", marginBottom: 4 }}>LIVELLO {lv}</div>
                  {feats.map((f, i) => {
                    const name = typeof f === "string" ? f : (f?.name || "");
                    const desc = typeof f === "string" ? "" : (f?.desc || "");
                    if (!name) return null;
                    return (
                      <div key={i} style={{ marginBottom: 6 }}>
                        <strong style={{ fontSize: "0.82rem", color: "var(--text)" }}>{name}</strong>
                        {desc && <div style={{ fontSize: "0.72rem", color: "var(--text3)", lineHeight: 1.4, marginTop: 2, whiteSpace: "pre-wrap" }}>{desc.length > 500 ? desc.slice(0, 500) + "…" : desc}</div>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
