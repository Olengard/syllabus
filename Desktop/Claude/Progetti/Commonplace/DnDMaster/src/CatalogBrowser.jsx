import React from "react";
import {
  getClassList, getClassData,
  getRaces, getFeats, getBackgrounds,
  getSpells, getItems,
  buildMonsterIndex, hasMonsterIndex, getMonsterStatblock,
} from "./catalog.js";
import { K, loadJSON } from "./storage.js";

const CATS = [
  { id: "class",      label: "📖 Classi" },
  { id: "spell",      label: "✨ Incantesimi" },
  { id: "monster",    label: "🐉 Mostri" },
  { id: "item",       label: "⚔ Oggetti" },
  { id: "race",       label: "🧬 Razze" },
  { id: "feat",       label: "⚡ Talenti" },
  { id: "background", label: "📜 Background" },
];

const MAX_ROWS = 80; // limita il rendering; oltre, l'utente raffina la ricerca

// Dove vivono gli elementi già importati, per categoria del catalogo.
const IMPORTED_KEYS = {
  class: K.importedClasses, spell: K.importedSpells,
  race: K.importedRaces,    feat: K.importedFeats,
  background: K.importedBackgrounds, monster: K.customMonsters,
  item: K.importedItems,
};

// Etichette leggibili per i codici tipo oggetto 5e.tools (sottotitolo riga).
const ITEM_TYPE_LABELS = {
  M: "Arma da mischia", R: "Arma a distanza", S: "Scudo", A: "Munizioni",
  LA: "Armatura leggera", MA: "Armatura media", HA: "Armatura pesante",
  RD: "Bacchetta", ST: "Bastone", RG: "Anello", SC: "Pergamena", P: "Pozione",
  W: "Meraviglioso", G: "Avventura", AT: "Strumento", INS: "Strumento musicale",
  T: "Attrezzo", TAH: "Finimenti", TG: "Merce", VEH: "Veicolo", SHP: "Nave",
  MNT: "Cavalcatura", EXP: "Esplosivo", GV: "Variante generica", FD: "Cibo",
  OTH: "Altro", "$": "Tesoro",
};

// Nomi (minuscoli) già presenti nell'archivio locale per una categoria:
// il catalogo li segna "✓ importato" e li esclude dagli import di massa.
function loadImportedNames(type) {
  try {
    const arr = loadJSON(IMPORTED_KEYS[type], []);
    return new Set(arr.map((x) => (x.name || "").toLowerCase()).filter(Boolean));
  } catch { return new Set(); }
}

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
  const [refresh, setRefresh] = React.useState(0);      // bump dopo ogni import → rilegge l'archivio
  const [bulk, setBulk]       = React.useState(null);  // { running, msg } per "importa tutti"

  const keyOf = (it) => (cat === "class" ? it.slug : `${it.name}|${it.source || ""}`);

  // Già importati (dall'archivio locale, non solo dalla sessione corrente)
  const importedNames = React.useMemo(() => loadImportedNames(cat), [cat, refresh]);
  const isImported = React.useCallback(
    (it) => importedNames.has((it.name || "").toLowerCase()),
    [importedNames]
  );

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
      else if (c === "item")       list = await getItems();
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
      else if (cat === "item")       { type = "item";       data = { item: [it] }; }
      else if (cat === "race")       { type = "race";       data = { race: [it] }; }
      else if (cat === "feat")       { type = "feat";       data = { feat: [it] }; }
      else if (cat === "background") { type = "background"; data = { background: [it] }; }
      else if (cat === "monster") {
        const sb = await getMonsterStatblock(it.file, it.name, it.source);
        if (!sb) throw new Error("statblock non trovato");
        type = "monster"; data = { monster: [sb] };
      }
      await onImport(type, data);
      setRefresh((r) => r + 1); // l'archivio è cambiato: aggiorna i "✓ importato"
    } catch (e) {
      setError("Import fallito: " + e.message);
    }
    setBusy(null);
  }

  // Importa in blocco tutti gli elementi di una categoria
  async function importCategory(c, list) {
    if (c === "spell")      return onImport("spell",      { spell: list });
    if (c === "item")       return onImport("item",       { item: list });
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

  // "Importa tutti" della categoria corrente: SOLO gli elementi mancanti
  // (mostri esclusi: si usa la ricerca)
  async function importAllCurrent() {
    if (cat === "monster") return;
    const missing = items.filter((it) => !isImported(it));
    if (!missing.length) return;
    setError(""); setBulk({ running: true, msg: `Importazione ${missing.length} elementi…` });
    try {
      const n = await importCategory(cat, missing);
      setRefresh((r) => r + 1);
      setBulk({ running: false, msg: `✓ ${n} importati (${items.length - missing.length} già presenti, saltati)` });
    } catch (e) {
      setError("Import fallito: " + e.message); setBulk(null);
    }
  }

  // "Importa tutto il catalogo": categorie leggere, solo gli elementi mancanti
  // (mostri esclusi per la quota)
  async function importEverything() {
    setError("");
    const steps = [
      ["classi",      "class",      getClassList],
      ["incantesimi", "spell",      getSpells],
      ["razze",       "race",       getRaces],
      ["talenti",     "feat",       getFeats],
      ["background",  "background", getBackgrounds],
    ];
    let total = 0, skipped = 0;
    try {
      for (let i = 0; i < steps.length; i++) {
        const [label, type, fetchList] = steps[i];
        setBulk({ running: true, msg: `Importazione ${label}… (${i + 1}/${steps.length})` });
        const list = await fetchList();
        const already = loadImportedNames(type);
        const missing = list.filter((it) => !already.has((it.name || "").toLowerCase()));
        skipped += list.length - missing.length;
        if (missing.length) total += await importCategory(type, missing);
      }
      setRefresh((r) => r + 1);
      setBulk({ running: false, msg: `✓ ${total} importati${skipped ? `, ${skipped} già presenti (saltati)` : ""}` });
    } catch (e) {
      setError("Import fallito: " + e.message); setBulk(null);
    }
  }

  const subtitle = (it) => {
    if (cat === "spell")   return `Liv. ${it.level ?? 0}${it.school ? " • " + it.school : ""}`;
    if (cat === "monster") return `GS ${it.cr} • ${it.type}`;
    if (cat === "item") {
      const t = ITEM_TYPE_LABELS[String(it.type || "").split("|")[0]] || "";
      const r = it.rarity && it.rarity !== "none" ? it.rarity : "";
      return [t, r, it.source].filter(Boolean).join(" • ");
    }
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
              {totalMatches} risultati
              {importedNames.size > 0 && ` · ${items.filter(isImported).length} già importati`}
              {totalMatches > MAX_ROWS ? ` — mostro i primi ${MAX_ROWS}, raffina la ricerca` : ""}
            </div>
            {cat !== "monster" && items.length > 0 && (() => {
              const missing = items.filter((it) => !isImported(it)).length;
              return missing > 0 ? (
                <button className="btn btn-sm" disabled={!!bulk?.running} onClick={importAllCurrent}
                  title={`Importa i ${missing} elementi non ancora presenti`}>
                  ⬇ Importa mancanti ({missing})
                </button>
              ) : (
                <span style={{ fontSize: "0.72rem", color: "var(--green2)" }}>✓ tutto importato</span>
              );
            })()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "46vh", overflowY: "auto" }}>
            {filtered.map((it) => {
              const k = keyOf(it);
              const isDone = isImported(it);
              const isBusy = busy === k;
              return (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--surface3)", border: "1px solid var(--border)", borderRadius: 5, opacity: isDone ? 0.55 : 1 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.85rem", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{it.name}</div>
                    {subtitle(it) && <div style={{ fontSize: "0.7rem", color: "var(--text3)" }}>{subtitle(it)}</div>}
                  </div>
                  {isDone ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
                      <span style={{ fontSize: "0.7rem", color: "var(--green2)" }}>✓ importato</span>
                      <button className="btn btn-sm" disabled={isBusy} onClick={() => importItem(it)}
                        title="Reimporta (aggiorna la copia locale)" style={{ fontSize: "0.7rem", padding: "2px 6px" }}>
                        {isBusy ? "…" : "↻"}
                      </button>
                    </span>
                  ) : (
                    <button
                      className="btn btn-sm btn-primary"
                      disabled={isBusy}
                      onClick={() => importItem(it)}>
                      {isBusy ? "…" : (cat === "class" ? "+ Classe" : "+ Importa")}
                    </button>
                  )}
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
