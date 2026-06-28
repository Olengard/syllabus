import React from "react";
import {
  getClassList, getClassData,
  getRaces, getFeats, getBackgrounds,
  getSpells,
  buildMonsterIndex, hasMonsterIndex, getMonsterStatblock,
} from "./catalog.js";

const CATS = [
  { id: "class",      label: "📖 Classi" },
  { id: "spell",      label: "✨ Incantesimi" },
  { id: "monster",    label: "🐉 Mostri" },
  { id: "race",       label: "🧬 Razze" },
  { id: "feat",       label: "⚡ Talenti" },
  { id: "background", label: "📜 Background" },
];

const MAX_ROWS = 80; // limita il rendering; oltre, l'utente raffina la ricerca

// onImport(type, rawDataObj) → Promise<number> (n. elementi importati)
export default function CatalogBrowser({ onImport }) {
  const [cat, setCat]         = React.useState("class");
  const [query, setQuery]     = React.useState("");
  const [items, setItems]     = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [progress, setProgress] = React.useState(null); // {done,total}
  const [error, setError]     = React.useState("");
  const [needBuild, setNeedBuild] = React.useState(false); // mostri: indice non ancora costruito
  const [busy, setBusy]       = React.useState(null);  // chiave elemento in import
  const [done, setDone]       = React.useState(() => new Set()); // chiavi già importate
  const [bulk, setBulk]       = React.useState(null);  // { running, msg } per "importa tutti"

  const keyOf = (it) => (cat === "class" ? it.slug : `${it.name}|${it.source || ""}`);

  const loadCategory = React.useCallback(async (c, { build = false } = {}) => {
    setError(""); setItems([]); setProgress(null); setNeedBuild(false);
    setLoading(true);
    try {
      let list = [];
      if (c === "class")           list = await getClassList();
      else if (c === "race")       list = await getRaces();
      else if (c === "feat")       list = await getFeats();
      else if (c === "background") list = await getBackgrounds();
      else if (c === "spell")      list = await getSpells((done, total) => setProgress({ done, total }));
      else if (c === "monster") {
        if (!build && !(await hasMonsterIndex())) { setNeedBuild(true); setLoading(false); return; }
        list = await buildMonsterIndex((done, total) => setProgress({ done, total }));
      }
      setItems(list);
    } catch (e) {
      setError("Errore nel caricamento: " + e.message);
    }
    setLoading(false);
    setProgress(null);
  }, []);

  React.useEffect(() => { loadCategory(cat); }, [cat, loadCategory]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? items.filter((it) => (it.name || "").toLowerCase().includes(q)) : items;
    return base.slice(0, MAX_ROWS);
  }, [items, query]);

  const totalMatches = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((it) => (it.name || "").toLowerCase().includes(q)).length : items.length;
  }, [items, query]);

  async function importItem(it) {
    const k = keyOf(it);
    setBusy(k); setError("");
    try {
      let type, data;
      if (cat === "class")           { type = "class";      data = await getClassData(it.file); }
      else if (cat === "spell")      { type = "spell";      data = { spell: [it] }; }
      else if (cat === "race")       { type = "race";       data = { race: [it] }; }
      else if (cat === "feat")       { type = "feat";       data = { feat: [it] }; }
      else if (cat === "background") { type = "background"; data = { background: [it] }; }
      else if (cat === "monster") {
        const sb = await getMonsterStatblock(it.file, it.name, it.source);
        if (!sb) throw new Error("statblock non trovato");
        type = "monster"; data = { monster: [sb] };
      }
      await onImport(type, data);
      setDone((s) => new Set(s).add(k));
    } catch (e) {
      setError("Import fallito: " + e.message);
    }
    setBusy(null);
  }

  // Importa in blocco tutti gli elementi di una categoria
  async function importCategory(c, list) {
    if (c === "spell")      return onImport("spell",      { spell: list });
    if (c === "race")       return onImport("race",       { race: list });
    if (c === "feat")       return onImport("feat",       { feat: list });
    if (c === "background") return onImport("background", { background: list });
    if (c === "class") {
      const merged = { class: [], subclass: [], classFeature: [], subclassFeature: [] };
      for (const it of list) {
        const d = await getClassData(it.file);
        merged.class.push(...(d.class || []));
        merged.subclass.push(...(d.subclass || []));
        merged.classFeature.push(...(d.classFeature || []));
        merged.subclassFeature.push(...(d.subclassFeature || []));
      }
      return onImport("class", merged);
    }
    return 0;
  }

  // "Importa tutti" della categoria corrente (mostri esclusi: si usa la ricerca)
  async function importAllCurrent() {
    if (cat === "monster" || !items.length) return;
    setError(""); setBulk({ running: true, msg: `Importazione ${items.length} elementi…` });
    try {
      const n = await importCategory(cat, items);
      setDone((s) => { const ns = new Set(s); for (const it of items) ns.add(keyOf(it)); return ns; });
      setBulk({ running: false, msg: `✓ ${n} importati` });
    } catch (e) {
      setError("Import fallito: " + e.message); setBulk(null);
    }
  }

  // "Importa tutto il catalogo": categorie leggere (mostri esclusi per la quota)
  async function importEverything() {
    setError("");
    const steps = [
      ["classi",      async () => importCategory("class",      await getClassList())],
      ["incantesimi", async () => importCategory("spell",      await getSpells())],
      ["razze",       async () => importCategory("race",       await getRaces())],
      ["talenti",     async () => importCategory("feat",       await getFeats())],
      ["background",  async () => importCategory("background", await getBackgrounds())],
    ];
    let total = 0;
    try {
      for (let i = 0; i < steps.length; i++) {
        setBulk({ running: true, msg: `Importazione ${steps[i][0]}… (${i + 1}/${steps.length})` });
        total += await steps[i][1]();
      }
      setBulk({ running: false, msg: `✓ ${total} importati (classi, incantesimi, razze, talenti, background)` });
    } catch (e) {
      setError("Import fallito: " + e.message); setBulk(null);
    }
  }

  const subtitle = (it) => {
    if (cat === "spell")   return `Liv. ${it.level ?? 0}${it.school ? " • " + it.school : ""}`;
    if (cat === "monster") return `GS ${it.cr} • ${it.type}`;
    if (cat === "race" || cat === "background" || cat === "feat") return it.source || "";
    return "";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Sotto-tab categoria */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {CATS.map((c) => (
          <button key={c.id}
            className={`btn btn-sm${cat === c.id ? " btn-primary" : ""}`}
            onClick={() => { setCat(c.id); setQuery(""); }}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Importa tutto il catalogo (categorie leggere) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button className="btn btn-sm btn-primary" disabled={!!bulk?.running}
          title="Importa classi, incantesimi, razze, talenti e background (i mostri si cercano dall'indice)"
          onClick={importEverything}>
          {bulk?.running ? "⏳ In corso…" : "⬇ Importa tutto il catalogo"}
        </button>
        {bulk && (
          <span style={{ fontSize: "0.72rem", color: bulk.running ? "var(--gold)" : "var(--gold2)" }}>{bulk.msg}</span>
        )}
      </div>

      {/* Ricerca */}
      <input
        placeholder={cat === "class" ? "Filtra classi…" : "Cerca per nome…"}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "8px 10px", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text)", fontSize: "0.85rem" }}
      />

      {error && (
        <div style={{ background: "rgba(192,57,43,0.15)", border: "1px solid var(--red2)", borderRadius: 6, padding: 10, color: "var(--red2)", fontSize: "0.8rem" }}>
          ✗ {error}
        </div>
      )}

      {/* Mostri: indice da costruire */}
      {needBuild && (
        <div style={{ background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 6, padding: 14, fontSize: "0.8rem", color: "var(--text2)", lineHeight: 1.6 }}>
          La ricerca per nome sui mostri richiede di costruire una volta l'indice globale
          (scarica ~20-30&nbsp;MB da tutti i manuali). <strong>Fallo su wifi</strong>: poi resta in cache e funziona offline.
          <div style={{ marginTop: 10 }}>
            <button className="btn btn-primary" onClick={() => loadCategory("monster", { build: true })}>
              ⬇ Costruisci indice mostri
            </button>
          </div>
        </div>
      )}

      {/* Caricamento / avanzamento */}
      {loading && (
        <div style={{ textAlign: "center", color: "var(--gold)", padding: 16, fontSize: "0.85rem" }}>
          ⏳ {cat === "monster" ? "Costruzione indice mostri" : "Caricamento"}…
          {progress && (
            <div style={{ marginTop: 6, color: "var(--text3)", fontSize: "0.75rem" }}>
              {progress.done}/{progress.total} manuali
            </div>
          )}
        </div>
      )}

      {/* Risultati */}
      {!loading && !needBuild && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text3)" }}>
              {totalMatches} risultati{totalMatches > MAX_ROWS ? ` — mostro i primi ${MAX_ROWS}, raffina la ricerca` : ""}
            </div>
            {cat !== "monster" && items.length > 0 && (
              <button className="btn btn-sm" disabled={!!bulk?.running} onClick={importAllCurrent}
                title={`Importa tutti i ${items.length} elementi di questa categoria`}>
                ⬇ Importa tutti ({items.length})
              </button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "46vh", overflowY: "auto" }}>
            {filtered.map((it) => {
              const k = keyOf(it);
              const isDone = done.has(k);
              const isBusy = busy === k;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 5 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                    {subtitle(it) && <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>{subtitle(it)}</div>}
                  </div>
                  <button
                    className={`btn btn-sm${isDone ? "" : " btn-primary"}`}
                    disabled={isBusy || isDone}
                    onClick={() => importItem(it)}>
                    {isBusy ? "…" : isDone ? "✓" : (cat === "class" ? "+ Classe" : "+ Importa")}
                  </button>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ color: "var(--text3)", fontStyle: "italic", fontSize: "0.8rem", padding: 8 }}>
                Nessun risultato.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
