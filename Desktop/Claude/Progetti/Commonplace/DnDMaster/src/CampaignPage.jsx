import React from "react";
import { userKey, safeLsSet } from "./storage.js";
import { parseWikiPage, mergeCampaignEntries } from "./campaign.js";
import { TYPE_META, Detail, norm } from "./GlobalSearch.jsx";

// Tab 🗺 Campagna: il registro dei PNG/luoghi/fazioni della campagna.
// Si popola importando le schede markdown della wiki Obsidian (frontmatter
// YAML) e/o con voci manuali; le voci sono cercabili in ⌘K e pinnabili.

export const CAMPAIGN_KEY = "dnd_campaign_v1";
const KINDS = ["png", "luogo", "fazione", "campagna"];

export function loadCampaign() {
  try { return JSON.parse(localStorage.getItem(userKey(CAMPAIGN_KEY)) || "[]"); } catch { return []; }
}

function ManualForm({ onAdd, onClose }) {
  const [kind, setKind] = React.useState("png");
  const [nome, setNome] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [ruolo, setRuolo] = React.useState("");
  const submit = () => {
    if (!nome.trim()) return;
    onAdd({
      kind, tipo: kind, nome: nome.trim(), alias: [], tags: [],
      summary: summary.trim(),
      fields: ruolo.trim() ? { note: ruolo.trim() } : {},
      sections: [], manual: true,
    });
    onClose();
  };
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginBottom: 12 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <select value={kind} onChange={e => setKind(e.target.value)} style={{ width: 130 }}>
          {KINDS.map(k => <option key={k} value={k}>{TYPE_META[k].icon} {TYPE_META[k].label}</option>)}
        </select>
        <input placeholder="Nome *" value={nome} onChange={e => setNome(e.target.value)} style={{ flex: 1 }} autoFocus />
      </div>
      <textarea placeholder="Descrizione / riassunto" value={summary} onChange={e => setSummary(e.target.value)}
        rows={2} style={{ width: "100%", marginBottom: 8, resize: "vertical" }} />
      <input placeholder="Note (ruolo, status, ganci...)" value={ruolo} onChange={e => setRuolo(e.target.value)}
        style={{ width: "100%", marginBottom: 8 }} />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button className="btn btn-sm" onClick={onClose}>Annulla</button>
        <button className="btn btn-sm btn-primary" onClick={submit} disabled={!nome.trim()}>Aggiungi</button>
      </div>
    </div>
  );
}

export default function CampaignPage() {
  const [entries, setEntries] = React.useState(loadCampaign);
  const [query, setQuery] = React.useState("");
  const [kindFilter, setKindFilter] = React.useState("all");
  const [expanded, setExpanded] = React.useState(() => new Set());
  const [showManual, setShowManual] = React.useState(false);
  const [report, setReport] = React.useState(null);
  const fileRef = React.useRef(null);

  const persist = (next) => {
    setEntries(next);
    try { safeLsSet(userKey(CAMPAIGN_KEY), JSON.stringify(next)); } catch {}
  };

  const onFiles = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = "";
    if (!files.length) return;
    const imported = [];
    let skipped = 0;
    for (const f of files) {
      try {
        const entry = parseWikiPage(f.name, await f.text());
        if (entry) imported.push(entry); else skipped++;
      } catch { skipped++; }
    }
    persist(mergeCampaignEntries(entries, imported));
    const perKind = {};
    for (const e2 of imported) perKind[e2.kind] = (perKind[e2.kind] || 0) + 1;
    const dettaglio = KINDS.filter(k => perKind[k])
      .map(k => `${perKind[k]} ${TYPE_META[k].label.toLowerCase()}`).join(", ");
    setReport(
      imported.length
        ? `Importate ${imported.length} schede (${dettaglio})${skipped ? ` · ${skipped} saltate (indici, avventure, senza frontmatter)` : ""}.`
        : `Nessuna scheda importabile tra i ${files.length} file (servono frontmatter con tipo: png/luogo/fazione/oggetto/mistero/concetto).`
    );
  };

  const remove = (entry) => {
    persist(entries.filter(x => !(x.kind === entry.kind && x.nome === entry.nome)));
  };

  const toggle = (id) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const filtered = React.useMemo(() => {
    const q = norm(query);
    return entries.filter(e => {
      if (kindFilter !== "all" && e.kind !== kindFilter) return false;
      if (!q) return true;
      const hay = norm([e.nome, ...(e.alias || []), ...(e.tags || []), e.summary,
        ...Object.values(e.fields || {}).flat()].join(" "));
      return q.split(" ").every(t => hay.includes(t));
    });
  }, [entries, query, kindFilter]);

  const groups = React.useMemo(() => {
    const byKind = {};
    for (const e of filtered) (byKind[e.kind] ||= []).push(e);
    for (const arr of Object.values(byKind)) arr.sort((a, b) => a.nome.localeCompare(b.nome, "it"));
    return KINDS.filter(k => byKind[k]?.length).map(k => ({ kind: k, items: byKind[k] }));
  }, [filtered]);

  const counts = React.useMemo(() => {
    const c = { all: entries.length };
    for (const e of entries) c[e.kind] = (c[e.kind] || 0) + 1;
    return c;
  }, [entries]);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div className="section-header" style={{ marginBottom: 0, flexShrink: 0, flexWrap: "wrap", gap: 8 }}>
        <span style={{ color: "var(--gold)", fontSize: "1.1rem", fontWeight: 700 }}>🗺 Campagna</span>
        <span style={{ fontSize: "0.78rem", color: "var(--text2)" }}>{entries.length} voci</span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button className="btn btn-sm" onClick={() => setShowManual(s => !s)}>＋ Voce manuale</button>
          <button className="btn btn-sm btn-primary" onClick={() => fileRef.current?.click()}
            title="Seleziona le schede .md della wiki (selezione multipla)">📥 Importa dalla wiki</button>
        </span>
      </div>
      <input ref={fileRef} type="file" multiple accept=".md,text/markdown" onChange={onFiles} style={{ display: "none" }} />

      <div style={{ padding: "10px 14px 0", flexShrink: 0 }}>
        {report && (
          <div style={{ fontSize: "0.78rem", color: "var(--green2)", background: "rgba(78,158,98,0.12)",
            border: "1px solid rgba(78,158,98,0.4)", borderRadius: 6, padding: "6px 10px", marginBottom: 8,
            display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span>{report}</span>
            <button onClick={() => setReport(null)} style={{ background: "none", border: "none", color: "var(--text3)", cursor: "pointer" }}>✕</button>
          </div>
        )}
        {showManual && <ManualForm onAdd={(e) => persist(mergeCampaignEntries(entries, []).concat([e]))} onClose={() => setShowManual(false)} />}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <input placeholder="🔍 Cerca nome, alias, tag, testo..." value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 1, minWidth: 180 }} />
          {["all", ...KINDS].map(k => (
            <button key={k}
              className={`btn btn-sm ${kindFilter === k ? "btn-primary" : ""}`}
              style={{ fontSize: "0.68rem" }}
              onClick={() => setKindFilter(k)}>
              {k === "all" ? `Tutto (${counts.all || 0})` : `${TYPE_META[k].icon} ${counts[k] || 0}`}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 14px" }}>
        {entries.length === 0 && (
          <div className="empty-screen">
            <div className="empty-screen-icon">🗺</div>
            <h2>Registro vuoto</h2>
            <p style={{ maxWidth: 460, lineHeight: 1.7 }}>
              Porta qui la tua campagna: <b>📥 Importa dalla wiki</b> e seleziona le schede
              markdown (PNG, luoghi, fazioni) del vault Obsidian — o aggiungi voci manuali.
              Tutto diventa cercabile in <b>⌘K</b> e pinnabile in 📌 Sessione.
            </p>
          </div>
        )}
        {entries.length > 0 && filtered.length === 0 && (
          <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--text3)", fontSize: "0.85rem" }}>
            Nessuna voce per "{query}".
          </div>
        )}
        {groups.map(({ kind, items }) => {
          const meta = TYPE_META[kind];
          return (
            <div key={kind} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: "0.68rem", color: "var(--text3)", textTransform: "uppercase",
                letterSpacing: "0.08em", margin: "0 0 6px 2px" }}>
                {meta.icon} {meta.label} · {items.length}
              </div>
              {items.map(e => {
                const id = `${e.kind}::${e.nome}`;
                const isOpen = expanded.has(id);
                return (
                  <div key={id} style={{ marginBottom: 6, border: "1px solid var(--border)", borderRadius: 7, overflow: "hidden" }}>
                    <div onClick={() => toggle(id)} style={{
                      display: "flex", alignItems: "baseline", gap: 8, padding: "8px 12px",
                      cursor: "pointer", background: "var(--surface2)", borderLeft: `4px solid ${meta.color}`,
                    }}>
                      <span style={{ fontWeight: 700, color: "var(--text)", fontSize: "0.9rem" }}>{e.nome}</span>
                      {e.alias?.length > 0 && (
                        <span style={{ fontSize: "0.74rem", color: "var(--text3)", fontStyle: "italic" }}>{e.alias.join(", ")}</span>
                      )}
                      {e.manual && <span style={{ fontSize: "0.64rem", color: "var(--gold)", border: "1px solid var(--border2)", borderRadius: 4, padding: "0 4px" }}>manuale</span>}
                      <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: "var(--text3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 220 }}>
                        {e.fields?.ruolo || e.fields?.categoria || e.tipo}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{isOpen ? "▾" : "▸"}</span>
                      <button onClick={(ev) => { ev.stopPropagation(); if (window.confirm(`Eliminare "${e.nome}"?`)) remove(e); }}
                        title="Elimina voce"
                        style={{ background: "none", border: "none", cursor: "pointer", padding: "0 2px", fontSize: "0.85rem", lineHeight: 1 }}>✕</button>
                    </div>
                    {isOpen && (
                      <div style={{ padding: "8px 12px 12px", background: "var(--surface)", borderLeft: `4px solid ${meta.color}` }}>
                        <Detail entry={{ type: e.kind, data: e }} />
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
