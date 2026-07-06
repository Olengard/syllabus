import React, { useState, useEffect, useCallback } from "react";
import CatalogBrowser from "./CatalogBrowser.jsx";
import ClassChoices from "./ClassChoices.jsx";
import shopExtra from "./shopExtra.json";
import GlobalSearch, { norm as searchNorm, deSlug } from "./GlobalSearch.jsx";
import BackupModal from "./BackupRestore.jsx";
import DiceTray from "./DiceTray.jsx";
import SessionPage from "./SessionPage.jsx";
// DB di gioco (estratti dal monolite — dati puri, vedi src/data/)
import { SPELLS_DB } from "./data/spells.js";
import { EQUIPMENT_DB } from "./data/equipment.js";
import { MONSTERS_DB } from "./data/monsters.js";
import { MAGIC_ITEMS_DB } from "./data/magicItems.js";
import { RACES_DB } from "./data/races.js";
import { CLASSES_DB } from "./data/classes.js";
import { SHOP_DB } from "./data/shop.js";
import { RULES_DB } from "./data/rules.js";
// Moduli estratti dal monolite (ondata 2)
import { styles } from "./styles.js";
import { getStoredUser, storeUser, clearUser, userKey, safeLsSet, migrateLegacyKey } from "./storage.js";
import NameGenerator from "./NameGenerator.jsx";
import RulesModal from "./RulesModal.jsx";
import SessionNotesPage from "./SessionNotesPage.jsx";
import SpellsPage from "./SpellsPage.jsx";
import ShopPage from "./ShopPage.jsx";
import DescriptionsPage from "./DescriptionsPage.jsx";
import CampaignPage, { loadCampaign } from "./CampaignPage.jsx";
import { coherentWith, terrainAllows } from "./encounter.js";

// ─── Auth ─────────────────────────────────────────────────────────────────────
const USERS = [
  { username: "Olengard", hash: "f7ff028e544670d765042a31256bf6b59af47b9d929bb61708266cc7388653be" },
  { username: "Manu",     hash: "fdf26eeafec45c09ba8465e3e8837a9042a9221304f2400226e0401b5d0077ff" },
];

const AUTO_LOGIN_USER = "Olengard"; // su questo device, login automatico

async function hashPassword(password) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(password));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,"0")).join("");
}


// ─── Constants ────────────────────────────────────────────────────────────────
const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const ABILITY_FULL = {
  STR: "Forza", DEX: "Destrezza", CON: "Costituzione",
  INT: "Intelligenza", WIS: "Saggezza", CHA: "Carisma"
};
const SKILLS = [
  { name: "Acrobazia", ability: "DEX" }, { name: "Addestrare Animali", ability: "WIS" },
  { name: "Arcano", ability: "INT" }, { name: "Atletica", ability: "STR" },
  { name: "Furtività", ability: "DEX" }, { name: "Indagare", ability: "INT" },
  { name: "Inganno", ability: "CHA" }, { name: "Intuizione", ability: "WIS" },
  { name: "Intimidazione", ability: "CHA" }, { name: "Medicina", ability: "WIS" },
  { name: "Natura", ability: "INT" }, { name: "Percezione", ability: "WIS" },
  { name: "Persuasione", ability: "CHA" }, { name: "Rapidità di Mano", ability: "DEX" },
  { name: "Religione", ability: "INT" }, { name: "Rappresentazione", ability: "CHA" },
  { name: "Sopravvivenza", ability: "WIS" }, { name: "Storia", ability: "INT" },
];
// Skill 5e.tools (EN) → nomi italiani dell'app: usata dal BackgroundPicker
// per applicare le competenze dei background importati.
const SKILL_EN_TO_IT = {
  "athletics": "Atletica", "acrobatics": "Acrobazia", "sleight of hand": "Rapidità di Mano",
  "stealth": "Furtività", "arcana": "Arcano", "history": "Storia", "investigation": "Indagare",
  "nature": "Natura", "religion": "Religione", "animal handling": "Addestrare Animali",
  "insight": "Intuizione", "medicine": "Medicina", "perception": "Percezione",
  "survival": "Sopravvivenza", "deception": "Inganno", "intimidation": "Intimidazione",
  "performance": "Rappresentazione", "persuasion": "Persuasione",
};
const ALIGNMENTS = [
  "Legale Buono", "Neutrale Buono", "Caotico Buono",
  "Legale Neutrale", "Neutrale", "Caotico Neutrale",
  "Legale Malvagio", "Neutrale Malvagio", "Caotico Malvagio",
];
const DAMAGE_TYPES = ["Perforante","Tagliente","Contundente","Fuoco","Freddo","Fulmine","Acido","Veleno","Necrotico","Radiante","Psichico","Forza","Tuono"];
const SIZES = ["Minuscolo","Piccolo","Medio","Grande","Enorme","Mastodontico"];

const mod = (score) => Math.floor((score - 10) / 2);
const modStr = (score) => { const m = mod(score); return (m >= 0 ? "+" : "") + m; };
const pb = (level) => Math.ceil(level / 4) + 1;

const defaultChar = () => ({
  id: Date.now(),
  name: "Nuovo Personaggio",
  player: "",
  race: "",
  class: "",
  subclass: "",
  level: 1,
  background: "",
  alignment: "",
  xp: 0,
  maxHp: 10, currentHp: 10, tempHp: 0,
  armorClass: 10,
  speed: 30,
  initiative: 0,
  passivePerception: 10,
  inspiration: false,
  deathSaves: { successes: 0, failures: 0 },
  abilities: { STR: 10, DEX: 10, CON: 10, INT: 10, WIS: 10, CHA: 10 },
  savingThrows: { STR: false, DEX: false, CON: false, INT: false, WIS: false, CHA: false },
  skills: {},
  equipment: [],
  pinnedFeatures: [],
  spells: [],
  spellSlots: {},
  usedSpellSlots: {},
  currency: { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 },
  reputation: [],
  prestige: [
    { id: 1, name: "Flint",          value: 0 },
    { id: 2, name: "Risur",          value: 0 },
    { id: 3, name: "Corte Nascosta", value: 0 },
    { id: 4, name: "Clero",          value: 0 },
    { id: 5, name: "Obscurati",      value: 0 },
  ],
  notes: "",
  traits: "",
  ideals: "",
  bonds: "",
  flaws: "",
  attacks: [],
  choices: {},   // scelte di classe: { optionalFeatures:{}, asi:[], expertise:[] }
});

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "dnd5e-master-v1";
const loadData = async () => {
  try {
    const raw = localStorage.getItem(userKey(STORAGE_KEY));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
};
// NB: il salvataggio dei personaggi è debounced dentro App (vedi flushSave):
// riserializzare tutti i PG (ritratti base64 inclusi) a ogni battitura è sprecato.




// ─── Equipment Search Component ───────────────────────────────────────────────
const EQ_ICONS = { Arma: "⚔", Armatura: "🛡", Magico: "✨", Strumento: "🔧", Altro: "📦" };
const EQ_CAT_CLS = { Arma: "eq-cat-arma", Armatura: "eq-cat-armatura", Magico: "eq-cat-magico", Strumento: "eq-cat-strumento", Altro: "" };

function EquipmentSearch({ onAdd, onClose }) {
  const [mode, setMode]         = useState("search");
  const [query, setQuery]       = useState("");
  const [catFilter, setCatFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [qty, setQty]           = useState(1);
  const [manual, setManual]     = useState({
    name:"", category:"Arma", subcategory:"", damage:"", damageType:"Tagliente",
    weight:"", cost:"", properties:"", ac:"", notes:"", qty:1
  });

  const [dbSource, setDbSource] = useState("all"); // "equip" | "magic" | "all"

  const importedItems = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_items")) || "[]"); } catch { return []; }
  }, []);

  const allItems = [...EQUIPMENT_DB, ...MAGIC_ITEMS_DB, ...importedItems];
  const baseDB = dbSource === "equip"  ? EQUIPMENT_DB
               : dbSource === "magic"  ? [...MAGIC_ITEMS_DB, ...importedItems.filter(i=>i._imported)]
               : allItems;

  const results = baseDB.filter(item => {
    const mQ = !query || searchNorm(`${item.name} ${deSlug(item.slug)} ${item.subcategory||""}`).includes(searchNorm(query));
    const mC = !catFilter || item.category === catFilter;
    return mQ && mC;
  }).slice(0, 50);

  const handleAdd = () => {
    if (!selected) return;
    onAdd({ ...selected, qty, id: Date.now(), equipped: false, fromDb: selected.slug });
    onClose();
  };

  const handleManualAdd = () => {
    if (!manual.name.trim()) return;
    const props = manual.properties ? manual.properties.split(",").map(s => s.trim()).filter(Boolean) : [];
    onAdd({
      id: Date.now(), fromDb: null, equipped: false,
      name: manual.name.trim(), category: manual.category, subcategory: manual.subcategory,
      damage: manual.damage || null, damageType: manual.damageType || null,
      weight: manual.weight ? +manual.weight : null,
      cost: manual.cost || "—", properties: props,
      ac: manual.ac ? +manual.ac : null, notes: manual.notes, qty: +manual.qty || 1,
    });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="overlay-panel" onClick={e => e.stopPropagation()}>
        <div className="overlay-header">
          <span className="overlay-title">🎒 Equipaggiamento</span>
          <div style={{ display:"flex", gap:6 }}>
            <button className={`btn btn-sm ${mode==="search"?"btn-primary":""}`} onClick={()=>setMode("search")}>Cerca DB</button>
            <button className={`btn btn-sm ${mode==="manual"?"btn-primary":""}`} onClick={()=>setMode("manual")}>+ Manuale</button>
            <button className="btn btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        {mode === "search" && (<>
          <div style={{padding:"8px 12px",borderBottom:"1px solid var(--border)",display:"flex",gap:6}}>
            {[["all","⚔✨ Tutto"],["equip","⚔ Base"],["magic",`✨ Magici${importedItems.length>0?" +"+importedItems.length+" imp.":""}`]].map(([v,lbl])=>(
              <button key={v} className={`btn btn-sm ${dbSource===v?"btn-primary":""}`}
                onClick={()=>{setDbSource(v);setCatFilter("");setSelected(null);}}>
                {lbl}
              </button>
            ))}
          </div>
          <div style={{ padding:"10px 12px", borderBottom:"1px solid var(--border)", display:"flex", gap:8 }}>
            <input placeholder="Cerca oggetto..." value={query} onChange={e=>setQuery(e.target.value)} style={{flex:1}} autoFocus />
            <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{width:150}}>
              <option value="">Tutte le categorie</option>
              <optgroup label="Equipaggiamento">
                {["Arma","Armatura","Avventura","Strumento","Cavalcatura"].map(c=><option key={c}>{c}</option>)}
              </optgroup>
              <optgroup label="Oggetti Magici">
                {["Anello","Bacchetta","Bastone","Scettro","Oggetto Meraviglioso","Pergamena"].map(c=><option key={c}>{c}</option>)}
              </optgroup>
            </select>
          </div>
          <div className="overlay-body">
            {results.length === 0 && <div className="empty-state">Nessun risultato per "{query}"</div>}
            {results.map(item => (
              <div key={item.slug} className={`eq-search-result ${selected?.slug===item.slug?"selected":""}`}
                onClick={()=>setSelected(selected?.slug===item.slug ? null : item)}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:6}}>
                  <div className="eq-name">{EQ_ICONS[item.category]} {item.name}</div>
                  <div style={{display:"flex",gap:4,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                    <span className={`eq-cat-badge ${EQ_CAT_CLS[item.category]||""}`}>{item.subcategory}</span>
                    {item.rarity && <span style={{fontSize:"0.6rem",padding:"1px 6px",borderRadius:8,background:"rgba(201,168,76,0.15)",border:"1px solid var(--gold)",color:"var(--gold)"}}>{item.rarity}</span>}
                    {item.cost && item.cost!=="—" && <span style={{fontSize:"0.65rem",color:"var(--text3)"}}>{item.cost}</span>}
                  </div>
                </div>
                <div className="eq-meta">
                  {item.damage && <span>🎲 {item.damage} {item.damageType}&nbsp;&nbsp;</span>}
                  {item.ac     && <span>🛡 CA {item.ac}&nbsp;&nbsp;</span>}
                  {item.weight && <span>⚖ {item.weight} kg</span>}
                </div>
                {selected?.slug === item.slug && (<>
                  <div className="eq-props" style={{marginTop:6}}>
                    {(item.properties||[]).map(p=>(
                      <span key={p} className={`eq-prop ${item.category==="Magico"?"magic":item.category==="Armatura"?"armor-prop":""}`}>{p}</span>
                    ))}
                  </div>
                  {item.notes && <div style={{marginTop:6,fontSize:"0.78rem",color:"var(--text2)",fontStyle:"italic"}}>{item.notes}</div>}
                  <div style={{display:"flex",alignItems:"center",gap:8,marginTop:8}}>
                    <span style={{fontSize:"0.65rem",color:"var(--text3)",fontFamily:"'Cinzel',serif"}}>QUANTITÀ</span>
                    <input type="number" min={1} value={qty} onChange={e=>setQty(+e.target.value)} style={{width:55}} />
                  </div>
                </>)}
              </div>
            ))}
          </div>
          <div className="overlay-footer">
            <span style={{fontSize:"0.7rem",color:"var(--text3)",alignSelf:"center"}}>
  {results.length} / {baseDB.length} oggetti {dbSource==="magic"?"magici":dbSource==="equip"?"base":"totali"}
</span>
            <button className="btn" onClick={onClose}>Annulla</button>
            <button className="btn btn-primary" disabled={!selected} onClick={handleAdd}>+ Aggiungi</button>
          </div>
        </>)}

        {mode === "manual" && (<>
          <div className="overlay-body">
            <div className="grid-2" style={{marginBottom:8}}>
              <div className="field"><label>Nome *</label><input value={manual.name} onChange={e=>setManual(m=>({...m,name:e.target.value}))} autoFocus /></div>
              <div className="field"><label>Quantità</label><input type="number" min={1} value={manual.qty} onChange={e=>setManual(m=>({...m,qty:+e.target.value}))} /></div>
            </div>
            <div className="grid-2" style={{marginBottom:8}}>
              <div className="field"><label>Categoria</label>
                <select value={manual.category} onChange={e=>setManual(m=>({...m,category:e.target.value}))}>
                  {["Arma","Armatura","Magico","Strumento","Altro"].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="field"><label>Sottocategoria</label><input value={manual.subcategory} onChange={e=>setManual(m=>({...m,subcategory:e.target.value}))} placeholder="es. Marziale Mischia" /></div>
            </div>
            <div className="grid-2" style={{marginBottom:8}}>
              <div className="field"><label>Dado Danno</label><input value={manual.damage} onChange={e=>setManual(m=>({...m,damage:e.target.value}))} placeholder="es. 1d8" /></div>
              <div className="field"><label>Tipo Danno</label>
                <select value={manual.damageType} onChange={e=>setManual(m=>({...m,damageType:e.target.value}))}>
                  {["—",...DAMAGE_TYPES].map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
            </div>
            <div className="grid-2" style={{marginBottom:8}}>
              <div className="field"><label>CA (armature)</label><input type="number" value={manual.ac} onChange={e=>setManual(m=>({...m,ac:e.target.value}))} /></div>
              <div className="field"><label>Peso (kg)</label><input type="number" step="0.5" value={manual.weight} onChange={e=>setManual(m=>({...m,weight:e.target.value}))} /></div>
            </div>
            <div className="field" style={{marginBottom:8}}>
              <label>Costo</label><input value={manual.cost} onChange={e=>setManual(m=>({...m,cost:e.target.value}))} placeholder="es. 15 mo" />
            </div>
            <div className="field" style={{marginBottom:8}}>
              <label>Proprietà (separate da virgola)</label>
              <input value={manual.properties} onChange={e=>setManual(m=>({...m,properties:e.target.value}))} placeholder="es. Versatile (1d10), Leggera" />
            </div>
            <div className="field">
              <label>Note</label>
              <textarea rows={2} value={manual.notes} onChange={e=>setManual(m=>({...m,notes:e.target.value}))} style={{resize:"vertical"}} />
            </div>
          </div>
          <div className="overlay-footer">
            <button className="btn" onClick={onClose}>Annulla</button>
            <button className="btn btn-primary" disabled={!manual.name.trim()} onClick={handleManualAdd}>+ Aggiungi</button>
          </div>
        </>)}
      </div>
    </div>
  );
}






// ─── Spell Search Component (local DB + manual) ───────────────────────────────
function SpellSearch({ onAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("");
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("search"); // "search" | "manual"
  const [manual, setManual] = useState({
    name: "", level: 0, school: "Evocation", castingTime: "1 azione",
    range: "18 m", duration: "Istantanea", components: "V, S", desc: "", higherLevel: ""
  });

  // Carica gli importati una sola volta (evita di ri-parsare ~1MB a ogni tasto)
  const importedSpells = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_spells")) || "[]"); } catch { return []; }
  }, []);
  const allSpells = React.useMemo(() => {
    const map = new Map();
    for (const s of [...SPELLS_DB, ...importedSpells]) {
      const k = s.slug || s.name;
      if (!map.has(k)) map.set(k, s);
    }
    return [...map.values()];
  }, [importedSpells]);

  const results = React.useMemo(() => allSpells.filter(sp => {
    const matchQuery = !query || searchNorm(`${sp.name || ""} ${deSlug(sp.slug)}`).includes(searchNorm(query));
    const matchLevel = levelFilter === "" || sp.level === parseInt(levelFilter);
    return matchQuery && matchLevel;
  }).slice(0, 100), [allSpells, query, levelFilter]);

  const schoolEmoji = { Evocation: "🔥", Abjuration: "🛡", Conjuration: "✨", Divination: "🔮", Enchantment: "💫", Illusion: "👁", Necromancy: "💀", Transmutation: "⚗" };

  const addManual = () => {
    if (!manual.name) return;
    const slug = "custom-" + manual.name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now();
    onAdd({ ...manual, slug });
    onClose();
  };

  return (
    <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="overlay-panel" onClick={e => e.stopPropagation()}>
        <div className="overlay-header">
          <span className="overlay-title">✨ Aggiungi Incantesimo</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button className={`btn btn-sm ${mode === "search" ? "btn-primary" : ""}`} onClick={() => setMode("search")}>Cerca</button>
            <button className={`btn btn-sm ${mode === "manual" ? "btn-primary" : ""}`} onClick={() => setMode("manual")}>+ Manuale</button>
            <button className="btn btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>

        {mode === "search" && (
          <>
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8 }}>
              <input placeholder="Cerca per nome..." value={query} onChange={e => setQuery(e.target.value)} style={{ flex: 1 }} autoFocus />
              <select value={levelFilter} onChange={e => setLevelFilter(e.target.value)} style={{ width: 90 }}>
                <option value="">Tutti</option>
                {[0,1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>{l === 0 ? "Trucchi" : `Lv ${l}`}</option>)}
              </select>
            </div>
            <div className="overlay-body">
              {results.length === 0 && <div className="empty-state">Nessun risultato per "{query}"</div>}
              {results.map(sp => (
                <div key={sp.slug || sp.name} className={`spell-result ${selected?.slug === sp.slug ? "selected" : ""}`} onClick={() => setSelected(selected?.slug === sp.slug ? null : sp)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <strong style={{ color: "var(--gold2)", fontFamily: "'Cinzel', serif", fontSize: "0.85rem" }}>
                      {schoolEmoji[sp.school] || "✦"} {sp.name}
                    </strong>
                    <span className="spell-level-badge">{sp.level === 0 ? "Trucco" : `${sp.level}° liv.`}</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>
                    {sp.school} • {sp.castingTime} • {sp.range} • {sp.duration}
                  </div>
                  {selected?.slug === sp.slug && (
                    <div style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--text2)", lineHeight: 1.5 }}>
                      {sp.desc?.slice(0, 400)}{sp.desc?.length > 400 ? "..." : ""}
                      {sp.higherLevel && <div style={{ marginTop: 6, color: "var(--blue2)", fontStyle: "italic" }}>A livelli più alti: {sp.higherLevel}</div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="overlay-footer">
              <span style={{ fontSize: "0.7rem", color: "var(--text3)", alignSelf: "center" }}>{allSpells.length} incantesimi{importedSpells.length > 0 ? ` (${importedSpells.length} importati)` : ""}</span>
              <button className="btn" onClick={onClose}>Annulla</button>
              <button className="btn btn-primary" disabled={!selected} onClick={() => { if (selected) { onAdd(selected); onClose(); } }}>
                + Aggiungi
              </button>
            </div>
          </>
        )}

        {mode === "manual" && (
          <>
            <div className="overlay-body">
              <div style={{ fontSize: "0.7rem", color: "var(--text3)", marginBottom: 12, fontStyle: "italic" }}>
                Aggiungi un incantesimo personalizzato o non presente nel database.
              </div>
              <div className="grid-2" style={{ marginBottom: 8 }}>
                <div className="field"><label>Nome *</label><input value={manual.name} onChange={e => setManual(m => ({ ...m, name: e.target.value }))} autoFocus /></div>
                <div className="field"><label>Livello</label>
                  <select value={manual.level} onChange={e => setManual(m => ({ ...m, level: +e.target.value }))}>
                    {[0,1,2,3,4,5,6,7,8,9].map(l => <option key={l} value={l}>{l === 0 ? "Trucco (0)" : l}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid-2" style={{ marginBottom: 8 }}>
                <div className="field"><label>Scuola</label>
                  <select value={manual.school} onChange={e => setManual(m => ({ ...m, school: e.target.value }))}>
                    {["Abjuration","Conjuration","Divination","Enchantment","Evocation","Illusion","Necromancy","Transmutation"].map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div className="field"><label>Tempo di Lancio</label><input value={manual.castingTime} onChange={e => setManual(m => ({ ...m, castingTime: e.target.value }))} /></div>
              </div>
              <div className="grid-2" style={{ marginBottom: 8 }}>
                <div className="field"><label>Gittata</label><input value={manual.range} onChange={e => setManual(m => ({ ...m, range: e.target.value }))} /></div>
                <div className="field"><label>Durata</label><input value={manual.duration} onChange={e => setManual(m => ({ ...m, duration: e.target.value }))} /></div>
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label>Componenti</label><input value={manual.components} onChange={e => setManual(m => ({ ...m, components: e.target.value }))} />
              </div>
              <div className="field" style={{ marginBottom: 8 }}>
                <label>Descrizione</label>
                <textarea rows={4} value={manual.desc} onChange={e => setManual(m => ({ ...m, desc: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
              <div className="field">
                <label>A livelli più alti (opzionale)</label>
                <textarea rows={2} value={manual.higherLevel} onChange={e => setManual(m => ({ ...m, higherLevel: e.target.value }))} style={{ resize: "vertical" }} />
              </div>
            </div>
            <div className="overlay-footer">
              <button className="btn" onClick={onClose}>Annulla</button>
              <button className="btn btn-primary" disabled={!manual.name} onClick={addManual}>+ Aggiungi Incantesimo</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Spell Slots Editor ───────────────────────────────────────────────────────
function SpellSlotsPanel({ char, onChange }) {
  const maxSlots = { 1:[0,2,3,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4,4], 2:[0,0,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3,3], 3:[0,0,0,0,0,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3], 4:[0,0,0,0,0,0,0,1,2,3,3,3,3,3,3,3,3,3,3,3], 5:[0,0,0,0,0,0,0,0,0,1,2,2,2,2,2,2,2,2,2,2], 6:[0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1,1,1], 7:[0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1,1,1], 8:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,1,1], 9:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1] };
  const lvl = Math.min(char.level, 20);
  
  return (
    <div>
      {[1,2,3,4,5,6,7,8,9].map(sl => {
        const max = (char.spellSlots?.[sl] !== undefined) ? char.spellSlots[sl] : (maxSlots[sl]?.[lvl] || 0);
        if (max === 0) return null;
        const used = char.usedSpellSlots?.[sl] || 0;
        return (
          <div key={sl} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "'Cinzel', serif", marginBottom: 4 }}>
              Slot {sl}° — {used}/{max} usati
              <span style={{ marginLeft: 8 }}>
                <input type="number" min={0} max={9} value={max} onChange={e => onChange({ spellSlots: { ...char.spellSlots, [sl]: +e.target.value } })} style={{ width: 40, padding: "1px 4px", fontSize: "0.7rem" }} />
              </span>
            </div>
            <div className="slot-group">
              {Array.from({ length: max }, (_, i) => (
                <div key={i} className={`slot-pip ${i < max - used ? "available" : "used"}`}
                  onClick={() => {
                    const newUsed = i < max - used ? used + 1 : Math.max(0, used - 1);
                    onChange({ usedSpellSlots: { ...char.usedSpellSlots, [sl]: newUsed } });
                  }} title={i < max - used ? "Slot disponibile (clicca per usare)" : "Slot usato (clicca per ripristinare)"} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── SpellCard with Upcast ────────────────────────────────────────────────────
function computeUpcast(sp, castLevel) {
  const base = sp.level;
  const sc = sp.scaling;
  if (!sc || castLevel <= base) return null;
  const diff = castLevel - sc.from;
  if (diff <= 0) return null;
  const steps = sc.per === 2 ? Math.floor(diff / 2) : diff;
  if (steps <= 0) return null;
  if (sc.type === "dice") {
    const extraNum = steps * sc.num;
    const bd = sp.baseDice;
    if (bd) {
      const totalNum = bd[0] + extraNum;
      const bonus = bd[2] ? "+" + bd[2] : "";
      return {
        summary: totalNum + "d" + bd[1] + bonus,
        detail: "Base " + bd[0] + "d" + bd[1] + bonus + " + " + extraNum + "d" + sc.sides + " (" + steps + " livello/i sopra il " + sc.from + "°)"
      };
    }
    return { summary: "+" + (steps * sc.num) + "d" + sc.sides, detail: "+" + (steps * sc.num) + "d" + sc.sides + " rispetto al livello base" };
  } else if (sc.type === "flat") {
    const extra = steps * sc.value;
    return { summary: "+" + extra, detail: "+" + extra + " (" + steps + " liv sopra il " + sc.from + "°, +" + sc.value + " ciascuno)" };
  } else if (sc.type === "target") {
    return { summary: "+" + steps + " bersagli", detail: "+" + steps + " bersaglio/i aggiuntivo/i" };
  }
  return null;
}

function SpellCard({ sp, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const [castLevel, setCastLevel] = useState(sp.level);
  const isScalable = !!sp.scaling;
  const upcast = computeUpcast(sp, castLevel);

  return (
    <div className="spell-card" style={{ borderColor: castLevel > sp.level ? "var(--blue2)" : undefined }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
          <div className="spell-name" style={{ margin: 0 }}>{sp.name}</div>
          {isScalable && (
            <span style={{ fontSize: "0.6rem", color: "var(--blue2)", fontFamily: "'Cinzel', serif", border: "1px solid var(--blue2)", borderRadius: 10, padding: "1px 6px" }}>
              scalabile
            </span>
          )}
          <span style={{ fontSize: "0.7rem", color: "var(--text3)", marginLeft: "auto" }}>{expanded ? "\u25b2" : "\u25bc"}</span>
        </div>
        <button className="btn btn-sm btn-danger" style={{ marginLeft: 8 }} onClick={() => onRemove(sp.slug)}>✕</button>
      </div>
      <div className="spell-meta">{sp.school} • {sp.castingTime} • {sp.range} • {sp.duration}</div>
      {isScalable && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 8px", background: "var(--surface3)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
          <span style={{ fontSize: "0.65rem", color: "var(--text3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.06em", flexShrink: 0 }}>LANCIA A LIV.</span>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            {Array.from({ length: 10 - sp.level }, (_, i) => sp.level + i + 1).concat([sp.level]).sort((a,b)=>a-b).map(lv => (
              <button key={lv} onClick={() => setCastLevel(lv)}
                style={{
                  width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer",
                  fontFamily: "'Cinzel', serif", fontSize: "0.7rem", fontWeight: 700,
                  background: castLevel === lv ? "var(--blue2)" : "var(--surface2)",
                  color: castLevel === lv ? "#fff" : "var(--text3)",
                  boxShadow: castLevel === lv ? "0 0 8px rgba(74,128,168,0.6)" : "none",
                  transition: "all 0.15s"
                }}>
                {lv}
              </button>
            ))}
          </div>
          {upcast ? (
            <div style={{ marginLeft: 4, flex: 1 }}>
              <div style={{ fontSize: "1rem", fontFamily: "'Cinzel', serif", fontWeight: 700, color: "var(--blue2)" }}>{upcast.summary}</div>
              <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginTop: 1 }}>{upcast.detail}</div>
            </div>
          ) : castLevel === sp.level ? (
            <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontStyle: "italic" }}>livello base</div>
          ) : null}
        </div>
      )}
      {expanded && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontSize: "0.75rem", color: "var(--text3)", marginBottom: 4 }}>Comp.: {sp.components}</div>
          <div className="spell-desc">{sp.desc}</div>
          {sp.higherLevel && (
            <div style={{ marginTop: 8, padding: "6px 8px", background: "rgba(74,128,168,0.08)", borderRadius: "var(--radius)", borderLeft: "2px solid var(--blue2)" }}>
              <div style={{ fontSize: "0.65rem", color: "var(--blue2)", fontFamily: "'Cinzel', serif", marginBottom: 3 }}>A LIVELLI PIÙ ALTI</div>
              <div style={{ fontSize: "0.8rem", color: "var(--text2)" }}>{sp.higherLevel}</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Equipment Tab Component ──────────────────────────────────────────────────
function EquipmentTab({ char, update }) {
  const [showSearch, setShowSearch]   = useState(false);
  const [expandedId, setExpandedId]   = useState(null);
  const [editingId, setEditingId]     = useState(null);
  const [editForm, setEditForm]       = useState(null);

  const equipment = char.equipment || [];
  const totalWeight = equipment.reduce((sum, i) => sum + ((i.weight||0) * (i.qty||1)), 0);

  const addItem = (item) => {
    const newEq = [...equipment, item];
    // Auto-create attack if weapon
    if (item.damage && item.category === "Arma") {
      const strMod = Math.floor(((char.abilities?.STR || 10) - 10) / 2);
      const dexMod = Math.floor(((char.abilities?.DEX || 10) - 10) / 2);
      const isFinesse = (item.properties||[]).some(p => p.toLowerCase().includes("accurata"));
      const isRanged = (item.subcategory||"").toLowerCase().includes("distanza");
      const atkMod = isFinesse ? Math.max(strMod, dexMod) : isRanged ? dexMod : strMod;
      const profBonus = Math.ceil((char.level || 1) / 4) + 1;
      const atkBonus = (atkMod + profBonus >= 0 ? "+" : "") + (atkMod + profBonus);
      const magicBonus = (item.properties||[]).find(p => /^\+\d/.test(p));
      const mBonus = magicBonus ? parseInt(magicBonus) : 0;
      const finalAtk = (atkMod + profBonus + mBonus >= 0 ? "+" : "") + (atkMod + profBonus + mBonus);
      const newAtk = {
        id: Date.now() + 1,
        name: item.name,
        atkBonus: finalAtk,
        dmgDice: item.damage,
        dmgBonus: atkMod + mBonus,
        dmgType: item.damageType || "",
        notes: (item.properties||[]).join(", "),
        fromEquip: item.id,
      };
      const attacks = [...(char.attacks || []), newAtk];
      update({ equipment: newEq, attacks });
    } else {
      update({ equipment: newEq });
    }
  };

  const removeItem = (id) => {
    const item = equipment.find(i => i.id === id);
    const newEq = equipment.filter(i => i.id !== id);
    // Remove linked attack
    const attacks = (char.attacks || []).filter(a => a.fromEquip !== id);
    update({ equipment: newEq, attacks });
  };

  const toggleEquipped = (id) => {
    update({ equipment: equipment.map(i => i.id === id ? { ...i, equipped: !i.equipped } : i) });
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({ ...item, properties: (item.properties||[]).join(", ") });
  };

  const saveEdit = () => {
    const props = editForm.properties ? editForm.properties.split(",").map(s=>s.trim()).filter(Boolean) : [];
    const updated = { ...editForm, properties: props, weight: editForm.weight ? +editForm.weight : null, ac: editForm.ac ? +editForm.ac : null, qty: +editForm.qty || 1 };
    update({ equipment: equipment.map(i => i.id === editingId ? updated : i) });
    setEditingId(null); setEditForm(null);
  };

  // Group by category
  const groups = {};
  equipment.forEach(item => {
    const cat = item.category || "Altro";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });
  const catOrder = ["Armatura","Arma","Magico","Strumento","Altro"];
  const catIcon = { Arma:"⚔", Armatura:"🛡", Magico:"✨", Strumento:"🔧", Altro:"📦" };

  return (
    <div className="section">
      <div className="section-header">
        <span>EQUIPAGGIAMENTO</span>
        <span style={{fontSize:"0.7rem",color:"var(--text3)",fontFamily:"'Cinzel',serif"}}>⚖ {totalWeight.toFixed(1)} kg totali</span>
      </div>
      <div className="section-content">
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <button className="btn btn-primary" style={{flex:1}} onClick={()=>setShowSearch(true)}>🎒 + Aggiungi dal Database</button>
        </div>

        {equipment.length === 0 && <div className="empty-state">Nessun oggetto. Clicca "+ Aggiungi dal Database" per iniziare.</div>}

        {catOrder.filter(cat => groups[cat]?.length).map(cat => (
          <div key={cat} style={{marginBottom:12}}>
            <div style={{fontSize:"0.65rem",fontFamily:"'Cinzel',serif",color:"var(--text3)",letterSpacing:"0.1em",marginBottom:6,paddingBottom:4,borderBottom:"1px solid var(--border)"}}>
              {catIcon[cat]} {cat.toUpperCase()} ({groups[cat].length})
            </div>
            {groups[cat].map(item => (
              <div key={item.id} className="item-row-expanded">
                {editingId === item.id ? (
                  <div style={{padding:"10px 12px"}}>
                    <div className="grid-2" style={{marginBottom:8}}>
                      <div className="field"><label>Nome</label><input value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))} /></div>
                      <div className="field"><label>Qtà</label><input type="number" min={1} value={editForm.qty||1} onChange={e=>setEditForm(f=>({...f,qty:+e.target.value}))} /></div>
                    </div>
                    <div className="grid-2" style={{marginBottom:8}}>
                      <div className="field"><label>Dado Danno</label><input value={editForm.damage||""} onChange={e=>setEditForm(f=>({...f,damage:e.target.value}))} placeholder="es. 1d8" /></div>
                      <div className="field"><label>Tipo</label>
                        <select value={editForm.damageType||""} onChange={e=>setEditForm(f=>({...f,damageType:e.target.value}))}>
                          {["—",...DAMAGE_TYPES].map(t=><option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="grid-2" style={{marginBottom:8}}>
                      <div className="field"><label>CA</label><input type="number" value={editForm.ac||""} onChange={e=>setEditForm(f=>({...f,ac:e.target.value}))} /></div>
                      <div className="field"><label>Peso (kg)</label><input type="number" step="0.5" value={editForm.weight||""} onChange={e=>setEditForm(f=>({...f,weight:e.target.value}))} /></div>
                    </div>
                    <div className="field" style={{marginBottom:8}}>
                      <label>Proprietà (separate da virgola)</label>
                      <input value={editForm.properties||""} onChange={e=>setEditForm(f=>({...f,properties:e.target.value}))} />
                    </div>
                    <div className="field" style={{marginBottom:10}}>
                      <label>Note</label>
                      <textarea rows={2} value={editForm.notes||""} onChange={e=>setEditForm(f=>({...f,notes:e.target.value}))} style={{resize:"vertical"}} />
                    </div>
                    <div style={{display:"flex",gap:8}}>
                      <button className="btn btn-primary" style={{flex:1}} onClick={saveEdit}>✓ Salva</button>
                      <button className="btn" onClick={()=>{setEditingId(null);setEditForm(null);}}>Annulla</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="item-row-main" onClick={()=>setExpandedId(expandedId===item.id?null:item.id)}>
                      <div className="item-qty">{item.qty||1}×</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:6}}>
                          <div className="item-name">{item.name}</div>
                          <span className={`item-equip-badge ${item.equipped?"equipped":"unequipped"}`}
                            onClick={e=>{e.stopPropagation();toggleEquipped(item.id);}}>
                            {item.equipped?"✦ Equipaggiato":"○ Non equipaggiato"}
                          </span>
                        </div>
                        <div style={{fontSize:"0.7rem",color:"var(--text3)",marginTop:2}}>
                          {item.damage && <span>🎲 {item.damage} {item.damageType}&nbsp;&nbsp;</span>}
                          {item.ac     && <span>🛡 CA {item.ac}&nbsp;&nbsp;</span>}
                          {item.weight && <span>⚖ {item.weight} kg</span>}
                        </div>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <button className="btn btn-sm" onClick={e=>{e.stopPropagation();startEdit(item);}}>✎</button>
                        <button className="btn btn-sm btn-danger" onClick={e=>{e.stopPropagation();removeItem(item.id);}}>✕</button>
                      </div>
                    </div>
                    {expandedId === item.id && (
                      <div className="item-row-detail">
                        {(item.properties||[]).length > 0 && (
                          <div className="eq-props" style={{marginBottom:6}}>
                            {item.properties.map(p=><span key={p} className={`eq-prop ${item.category==="Magico"?"magic":""}`}>{p}</span>)}
                          </div>
                        )}
                        {item.cost && <div><strong>Costo:</strong> {item.cost}</div>}
                        {item.subcategory && <div><strong>Tipo:</strong> {item.subcategory}</div>}
                        {item.notes && <div style={{marginTop:4,fontStyle:"italic"}}>{item.notes}</div>}
                        {item.fromEquip === undefined && item.damage && (
                          <div style={{marginTop:6,fontSize:"0.7rem",color:"var(--green2)"}}>✦ Attacco collegato creato automaticamente</div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        ))}

        {showSearch && <EquipmentSearch onAdd={addItem} onClose={()=>setShowSearch(false)} />}
      </div>
    </div>
  );
}






// ─── 5eTools Importer ─────────────────────────────────────────────────────────
function Import5eTools({ onImportMonsters, onImportSpells, onImportItems, onImportClasses, onImportRaces, onImportFeats, onImportBackgrounds, onClose }) {
  const [file, setFile]       = React.useState(null);
  const [preview, setPreview] = React.useState(null);
  const [error, setError]     = React.useState(null);
  const [imported, setImported] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [mode, setMode] = React.useState("catalog"); // "catalog" | "file"

  // ── Parsers: 5etools JSON → gestionale format ──────────────────────────
  const parse5eMonster = (m) => ({
    name: m.name || "?",
    cr: typeof m.cr === "object" ? m.cr.cr : (m.cr || "0"),
    size: {T:"Minuscolo",S:"Piccolo",M:"Medio",L:"Grande",H:"Enorme",G:"Gigantesco"}[m.size] || m.size || "Medio",
    type: m.type && typeof m.type === "object" ? m.type.type : (m.type || "bestia"),
    alignment: Array.isArray(m.alignment) ? m.alignment.join(" ") : (m.alignment || "N"),
    ac: Array.isArray(m.ac) ? (typeof m.ac[0]==="object" ? m.ac[0].ac : m.ac[0]) : (m.ac || 10),
    hp: m.hp?.average || (Array.isArray(m.hp) ? m.hp[0] : (m.hp || 1)),
    hpFormula: m.hp?.formula || "",
    speed: typeof m.speed === "object"
      ? Object.entries(m.speed).map(([k,v])=>`${k} ${v}ft`).join(", ")
      : (m.speed || "30 ft"),
    str: m.str || 10, dex: m.dex || 10, con: m.con || 10,
    int: m.int || 10, wis: m.wis || 10, cha: m.cha || 10,
    savingThrows: m.save
      ? Object.entries(m.save).map(([k,v])=>`${k.toUpperCase()} ${v}`).join(", ")
      : "",
    skills: m.skill
      ? Object.entries(m.skill).map(([k,v])=>`${k} ${v}`).join(", ")
      : "",
    resistances: Array.isArray(m.resist)
      ? m.resist.map(r=>typeof r==="object"?r.resist?.join(",")||"":r).join(", ")
      : (m.resist || ""),
    immunities: Array.isArray(m.immune)
      ? m.immune.map(r=>typeof r==="object"?r.immune?.join(",")||"":r).join(", ")
      : (m.immune || ""),
    senses: m.senses ? (Array.isArray(m.senses) ? m.senses.join(", ") : m.senses) : "Percezione passiva " + (m.passive || 10),
    languages: Array.isArray(m.languages) ? m.languages.join(", ") : (m.languages || "—"),
    traits: (m.trait||[]).map(t=>({
      name: t.name || "",
      desc: Array.isArray(t.entries) ? t.entries.map(e=>typeof e==="string"?e:e.text||"").join(" ") : ""
    })),
    actions: (m.action||[]).map(a=>{
      const entries = Array.isArray(a.entries) ? a.entries : [];
      const desc = entries.map(e=>{
        if (typeof e === "string") return e;
        if (e.type === "attack") return e.attackEntries?.join(" ") || "";
        return e.text || e.entry || (Array.isArray(e.entries) ? e.entries.map(x=>typeof x==="string"?x:x.text||"").join(" ") : "");
      }).join(" ").replace(/\{@[a-z]+ ([^|}]+)[^}]*\}/g,"$1").trim();

      // Extract attack bonus: "+5 to hit" or "to hit: +5"
      const bonusMatch = desc.match(/([+-]\d+)\s+to\s+hit/i) || desc.match(/to\s+hit[:\s]+([+-]\d+)/i);
      const bonus = bonusMatch ? bonusMatch[1] : null;

      // Extract damage: "2d6 + 3" or "1d8+2"
      const dmgMatch = desc.match(/Hit[:\s]+[^.]*?(\d+d\d+(?:\s*[+-]\s*\d+)?)/i);
      const damage = dmgMatch ? dmgMatch[1].replace(/\s+/g,"") : null;

      // Extract damage type
      const dmgTypeMatch = desc.match(/\d+d\d+[^.]*?(bludgeoning|piercing|slashing|fire|cold|lightning|thunder|acid|poison|psychic|radiant|necrotic|force)/i);
      const dmgType = dmgTypeMatch ? dmgTypeMatch[1] : null;

      // Detect attack type
      const isMelee = /melee/i.test(desc);
      const isRanged = /ranged/i.test(desc);
      const type = isMelee && isRanged ? "Mischia/Distanza" : isMelee ? "Mischia" : isRanged ? "Distanza" : "Azione";

      // Extract reach/range
      const reachMatch = desc.match(/reach\s+(\d+)\s*ft/i);
      const rangeMatch = desc.match(/range\s+(\d+\/\d+|\d+)\s*ft/i);
      const reach = reachMatch ? reachMatch[1]+"ft" : rangeMatch ? rangeMatch[1]+"ft" : null;

      return { name: a.name || "", type, bonus, damage, damageType: dmgType, reach, desc };
    }),
    legendaryActions: (m.legendary||[]).map(a=>({
      name: a.name || "",
      desc: (Array.isArray(a.entries) ? a.entries.map(e=>typeof e==="string"?e:e.text||"").join(" ") : "")
            .replace(/\{@[a-z]+ ([^|}]+)[^}]*\}/g,"$1")
    })),
    notes: m.source ? `Fonte: ${m.source} p.${m.page||"?"}` : "",
    _imported: true, _source: "5etools",
  });

  const parse5eSpell = (s) => {
    const schoolMap = {A:"Abjuration",C:"Conjuration",D:"Divination",E:"Enchantment",V:"Evocation",I:"Illusion",N:"Necromancy",T:"Transmutation"};
    return {
      slug: (s.name||"").toLowerCase().replace(/[^a-z0-9]/g,"-"),
      name: s.name || "?",
      level: s.level || 0,
      school: schoolMap[s.school] || s.school || "",
      castingTime: Array.isArray(s.time)
        ? s.time.map(t=>`${t.number} ${t.unit}`).join(" o ")
        : (s.time || ""),
      range: typeof s.range === "object"
        ? (s.range.distance ? `${s.range.distance.amount||""} ${s.range.distance.type||""}`.trim() : s.range.type||"")
        : (s.range || ""),
      duration: Array.isArray(s.duration)
        ? s.duration.map(d=>d.concentration ? `Concentrazione, ${d.duration?.amount||""} ${d.duration?.type||""}` : (d.type==="instant"?"Istantaneo":d.type||"")).join(" o ")
        : "",
      components: [
        s.components?.v && "V",
        s.components?.s && "S",
        s.components?.m && `M (${typeof s.components.m==="string"?s.components.m:s.components.m?.text||""})`,
      ].filter(Boolean).join(", "),
      classes: Array.isArray(s.classes?.fromClassList)
        ? s.classes.fromClassList.map(c=>c.name).join(", ")
        : "",
      desc: Array.isArray(s.entries)
        ? s.entries.map(e=>typeof e==="string"?e:e.entries?.join(" ")||e.text||"").join("\n")
        : "",
      source: s.source ? `${s.source} p.${s.page||"?"}` : "",
      _imported: true,
    };
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  const stripTags = (str) => {
    if (!str || typeof str !== "string") return str || "";
    return str.replace(/\{@[a-z]+ ([^}|]+)[^}]*\}/g, "$1");
  };

  const entriesToText = (entries) => {
    if (!entries) return "";
    if (typeof entries === "string") return stripTags(entries);
    if (!Array.isArray(entries)) {
      // Single object entry
      if (entries.entries) return entriesToText(entries.entries);
      if (entries.entry) return stripTags(entries.entry);
      if (entries.text) return stripTags(entries.text);
      return "";
    }
    return entries.map(e => {
      if (typeof e === "string") return stripTags(e);
      if (!e || typeof e !== "object") return "";
      if (e.type === "list") return (e.items||[]).map(i => "• " + entriesToText(i)).join("\n");
      if (e.type === "table") return "[Tabella: " + (e.caption||"") + "]";
      if (e.type === "entries" || e.type === "section") {
        const title = e.name ? (e.name + ": ") : "";
        return title + entriesToText(e.entries);
      }
      if (e.type === "inset" || e.type === "insetReadaloud") return entriesToText(e.entries);
      if (e.type === "item") return (e.name ? e.name + ": " : "") + entriesToText(e.entries || e.entry || "");
      if (e.entries) return entriesToText(e.entries);
      if (e.entry) return stripTags(String(e.entry));
      if (e.text) return stripTags(String(e.text));
      return "";
    }).filter(Boolean).join("\n");
  };

  const parse5eClass = (cls, allFeatures, allSubclasses) => {
    const hd = cls.hd ? cls.hd.faces : 8;
    const prof = (cls.proficiency || []).map(p => p.toUpperCase());

    // Spell slots per level
    let spellSlots = null;
    for (const tg of (cls.classTableGroups || [])) {
      if (tg.rowsSpellProgression) { spellSlots = tg.rowsSpellProgression; break; }
    }

    // Features: match by className
    const className = cls.name;
    const myFeatures = allFeatures.filter(f => f.className === className);

    // Group features by level
    const featuresByLevel = {};
    for (const f of myFeatures) {
      const lv = f.level || 1;
      if (!featuresByLevel[lv]) featuresByLevel[lv] = [];
      featuresByLevel[lv].push({
        name: stripTags(f.name),
        desc: entriesToText(f.entries),
      });
    }

    // Subclasses
    const mySubclasses = (() => {
      const seen = new Set();
      return (allSubclasses || [])
        .filter(sc => sc.className === className)
        .filter(sc => { if (seen.has(sc.name)) return false; seen.add(sc.name); return true; })
        .map(sc => ({ name: sc.name, shortName: sc.shortName || sc.name, source: sc.source }));
    })();

    // Proficiencies
    const sp = cls.startingProficiencies || {};
    const armorProf = (sp.armor || []).map(a => typeof a === "string" ? stripTags(a) : a.proficiency || "").filter(Boolean);
    const weaponProf = (sp.weapons || []).map(w => typeof w === "string" ? stripTags(w) : w.proficiency || "").filter(Boolean);

    const skillEntry = (sp.skills || []);
    let skillCount = 2;
    let skillList = [];
    for (const sk of skillEntry) {
      if (sk.choose) { skillCount = sk.choose.count || 2; skillList = sk.choose.from || []; }
    }

    // Spell slots for the current level (we'll store all 20 levels)
    const slotsPerLevel = spellSlots ? spellSlots.map(row => row.filter(n => n > 0)) : null;

    return {
      slug: className.toLowerCase().replace(/[^a-z0-9]/g, "-") + "-imported",
      name: className,
      source: cls.source,
      hitDie: hd,
      savingThrows: prof,
      armorProf,
      weaponProf,
      skillCount,
      skillList: skillList.map(s => s.charAt(0).toUpperCase() + s.slice(1)),
      spellcastingAbility: cls.spellcastingAbility || null,
      casterProgression: cls.casterProgression || null,
      slotsPerLevel,
      featuresByLevel,
      subclasses: mySubclasses,
      optionalFeatureProgression: cls.optionalfeatureProgression || null,
      subclassTitle: cls.subclassTitle || "Sottoclasse",
      subclassFeaturesByLevel: (() => {
        const result = {};
        for (const sc of mySubclasses) {
          const scFeats = (allFeatures || []).filter(f =>
            f.subclassShortName === sc.shortName ||
            f.subclassShortName === sc.name
          );
          if (scFeats.length > 0) {
            result[sc.name] = {};
            for (const f of scFeats) {
              const lv = String(f.level || 1);
              if (!result[sc.name][lv]) result[sc.name][lv] = [];
              result[sc.name][lv].push({ name: stripTags(f.name), desc: entriesToText(f.entries || []) });
            }
          }
        }
        return result;
      })(),
      _imported: true,
      _source: "5etools",
    };
  };

  const parse5eItem = (it) => {
    const rarityMap = {none:"Comune",common:"Comune",uncommon:"Non comune",rare:"Raro","very rare":"Molto raro",legendary:"Leggendario",artifact:"Artefatto",varies:"Varia",unknown:"Sconosciuta"};
    const typeMap = {S:"Arma",M:"Arma",R:"Arma",A:"Armatura",LA:"Armatura",MA:"Armatura",HA:"Armatura",S2:"Armatura",RD:"Bacchetta",ST:"Bastone",RG:"Anello",SC:"Pergamena",P:"Pozione",W:"Oggetto Meraviglioso",G:"Avventura",AT:"Strumento",MNT:"Cavalcatura"};
    return {
      slug: (it.name||"").toLowerCase().replace(/[^a-z0-9]/g,"-"),
      name: it.name || "?",
      category: typeMap[it.type] || "Oggetto Meraviglioso",
      subcategory: "Importato",
      rarity: rarityMap[it.rarity] || it.rarity || "—",
      weight: it.weight || 0,
      cost: it.value ? `${it.value} mo` : "—",
      ac: it.ac || null,
      properties: [
        it.reqAttune && (it.reqAttune === true ? "Richiede sintonia" : `Richiede sintonia (${it.reqAttune})`),
        it.curse && "Maledetto",
      ].filter(Boolean),
      notes: Array.isArray(it.entries)
        ? it.entries.map(e=>typeof e==="string"?e:e.text||"").join(" ")
        : "",
      _imported: true,
    };
  };

  const handleFile = async (e) => {
    setError(null); setPreview(null); setImported(null);
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setLoading(true);
    try {
      const text = await f.text();
      const data = JSON.parse(text);
      // Detect content type
      const types = {
        monster:  (data.monster  || []).length,
        spell:    (data.spell    || []).length,
        item:     (data.item     || []).length,
        baseitem: (data.baseitem || []).length,
        class:    (data.class    || []).length,
        race:     (data.race     || []).length,
        feat:     (data.feat     || []).length,
        background: (data.background || []).length,
      };
      setPreview({ filename: f.name, types, data });
    } catch(err) {
      setError("Errore nel parsing del file: " + err.message);
    }
    setLoading(false);
  };

  // Trasforma i dati grezzi 5e.tools col parser giusto e li salva.
  // Ritorna il n. di elementi importati. Usato sia dall'import da file sia dal
  // catalogo online (che passa `d` recuperato dalla rete invece che dal file).
  const runImport = (type, d) => {
    if (!d) return 0;
    if (type === "monster") {
      const monsters = (d.monster||[]).map(parse5eMonster);
      onImportMonsters(monsters);
      return monsters.length;
    } else if (type === "spell") {
      const spells = (d.spell||[]).map(parse5eSpell);
      onImportSpells(spells);
      return spells.length;
    } else if (type === "item") {
      const items = [...(d.item||[]), ...(d.baseitem||[])].map(parse5eItem);
      onImportItems(items);
      return items.length;
    } else if (type === "class") {
      const allFeatures = [...(d.classFeature||[]), ...(d.subclassFeature||[])];
      const classes = (d.class||[]).map(cls => parse5eClass(cls, allFeatures, d.subclass || []));
      onImportClasses(classes);
      return classes.length;
    } else if (type === "race") {
      const races = (d.race||[]).map(r => ({
        slug: (r.name||"").toLowerCase().replace(/[^a-z0-9]/g,"-") + "-imported",
        name: r.name,
        size: {T:"Minuscolo",S:"Piccolo",M:"Medio",L:"Grande"}[r.size] || "Medio",
        speed: r.speed?.walk || r.speed || 30,
        languages: Array.isArray(r.languageProficiencies)
          ? Object.keys(r.languageProficiencies[0]||{}).join(", ")
          : "Comune",
        // Stesso formato delle razze inline: oggetto {STR:2, ...} + __choose
        // per i bonus a scelta (era una stringa: crashava picker e applyRace)
        abilityBonuses: (() => {
          const out = {};
          for (const a of r.ability || []) {
            for (const [k, v] of Object.entries(a)) {
              if (k === "choose") out.__choose = true;
              else if (typeof v === "number") out[k.toUpperCase()] = v;
            }
          }
          return out;
        })(),
        traits: (r.entries||[]).filter(e=>e.name).map(e=>({
          name: e.name, desc: entriesToText(e.entries||[])
        })),
        source: r.source,
        _imported: true,
      }));
      onImportRaces(races);
      return races.length;
    } else if (type === "feat") {
      const feats = (d.feat||[]).map(f=>({
        name: f.name,
        prerequisite: (f.prerequisite||[]).map(p=>Object.values(p)[0]).join(", "),
        desc: entriesToText(f.entries||[]),
        source: f.source,
        _imported: true,
      }));
      onImportFeats(feats);
      return feats.length;
    } else if (type === "background") {
      const bgs = (d.background||[]).map(b=>({
        name: b.name,
        skills: (b.skillProficiencies||[]).map(sp=>Object.keys(sp).join(", ")).join("; "),
        feature: (b.entries||[]).find(e=>e.name)?.name || "",
        source: b.source,
        _imported: true,
      }));
      onImportBackgrounds(bgs);
      return bgs.length;
    }
    return 0;
  };

  const TYPE_LABELS = { monster:"mostri", spell:"incantesimi", item:"oggetti", class:"classi", race:"razze", feat:"talenti", background:"background" };

  const doImport = (type) => {
    if (!preview?.data) return;
    setLoading(true);
    try {
      const count = runImport(type, preview.data);
      setImported({ type: TYPE_LABELS[type], count });
    } catch(err) {
      setError("Errore durante l\'importazione: " + err.message);
    }
    setLoading(false);
  };

  return (
    <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="overlay-panel" style={{maxWidth:580}} onClick={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}>
        <div className="overlay-header">
          <span className="overlay-title">📥 Importa da 5e.tools</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="overlay-body" style={{padding:16}}>
          {/* Toggle modalità: catalogo online vs file */}
          <div style={{display:"flex",gap:6,marginBottom:14}}>
            <button className={`btn btn-sm${mode==="catalog"?" btn-primary":""}`} style={{flex:1}} onClick={()=>setMode("catalog")}>🌐 Catalogo online</button>
            <button className={`btn btn-sm${mode==="file"?" btn-primary":""}`} style={{flex:1}} onClick={()=>setMode("file")}>📁 Da file</button>
          </div>

          {mode==="catalog" && (
            <>
              <div style={{fontSize:"0.72rem",color:"var(--text3)",marginBottom:10,lineHeight:1.5}}>
                Cerca per nome e importa con un click — i dati arrivano dal mirror di 5e.tools.
                ⚠ Contenuti di proprietà WotC: solo per uso privato.
              </div>
              <CatalogBrowser onImport={runImport} />
            </>
          )}

          {mode==="file" && (<>
          {/* Instructions */}
          <div style={{background:"var(--surface3)",border:"1px solid var(--border)",borderRadius:6,padding:12,marginBottom:14,fontSize:"0.78rem",color:"var(--text2)",lineHeight:1.6}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.65rem",color:"var(--gold)",letterSpacing:"0.1em",marginBottom:6}}>COME IMPORTARE DA 5E.TOOLS</div>
            <ol style={{paddingLeft:18,margin:0}}>
              <li>Vai su <strong style={{color:"var(--gold)"}}>5e.tools</strong> (Mostri, Incantesimi, o Oggetti)</li>
              <li>Filtra o cerca ciò che ti serve</li>
              <li>Menu in alto → <strong>Others → Download as JSON</strong></li>
              <li>Carica il file qui sotto</li>
            </ol>
            <div style={{marginTop:8,fontSize:"0.7rem",color:"var(--text3)"}}>
              ⚠ I file JSON di 5e.tools contengono dati di proprietà di WotC. Usare solo per sessioni private.
            </div>
          </div>

          {/* File picker */}
          <div style={{marginBottom:14}}>
            <label style={{display:"block",fontFamily:"'Cinzel',serif",fontSize:"0.65rem",color:"var(--text3)",letterSpacing:"0.1em",marginBottom:6}}>FILE JSON 5E.TOOLS</label>
            <input type="file" accept=".json" onChange={handleFile}
              style={{display:"block",width:"100%",padding:"8px",background:"var(--surface3)",border:"1px solid var(--border)",borderRadius:6,color:"var(--text)",fontSize:"0.8rem",cursor:"pointer"}} />
          </div>

          {loading && <div style={{textAlign:"center",color:"var(--gold)",padding:20}}>⏳ Parsing in corso...</div>}

          {error && (
            <div style={{background:"rgba(192,57,43,0.15)",border:"1px solid var(--red2)",borderRadius:6,padding:12,color:"var(--red2)",fontSize:"0.8rem",marginBottom:12}}>
              ✗ {error}
            </div>
          )}

          {preview && !imported && (
            <div style={{background:"var(--surface3)",border:"1px solid var(--border)",borderRadius:6,padding:14}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.65rem",color:"var(--text3)",letterSpacing:"0.1em",marginBottom:10}}>
                CONTENUTO RILEVATO: {preview.filename}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {preview.types.monster > 0 && (
                  <button className="btn btn-primary" onClick={()=>doImport("monster")}>
                    🐉 Importa {preview.types.monster} Mostri
                  </button>
                )}
                {preview.types.spell > 0 && (
                  <button className="btn btn-primary" onClick={()=>doImport("spell")}>
                    ✨ Importa {preview.types.spell} Incantesimi
                  </button>
                )}
                {(preview.types.item + preview.types.baseitem) > 0 && (
                  <button className="btn btn-primary" onClick={()=>doImport("item")}>
                    🎒 Importa {preview.types.item + preview.types.baseitem} Oggetti
                  </button>
                )}
                {preview.types.class > 0 && (
                  <button className="btn btn-primary" onClick={()=>doImport("class")}>
                    📖 Importa {preview.types.class} {preview.types.class === 1 ? "Classe" : "Classi"}
                    {preview.data.subclass?.length > 0 && ` + ${preview.data.subclass.length} sottoclassi`}
                  </button>
                )}
                {preview.types.race > 0 && (
                  <button className="btn btn-primary" onClick={()=>doImport("race")}>
                    🧬 Importa {preview.types.race} {preview.types.race === 1 ? "Razza" : "Razze"}
                  </button>
                )}
                {preview.types.feat > 0 && (
                  <button className="btn btn-primary" onClick={()=>doImport("feat")}>
                    ⚡ Importa {preview.types.feat} {preview.types.feat === 1 ? "Talento" : "Talenti"}
                  </button>
                )}
                {preview.types.background > 0 && (
                  <button className="btn btn-primary" onClick={()=>doImport("background")}>
                    📜 Importa {preview.types.background} {preview.types.background === 1 ? "Background" : "Background"}
                  </button>
                )}
                {preview.types.monster === 0 && preview.types.spell === 0
                  && (preview.types.item + preview.types.baseitem) === 0
                  && preview.types.class === 0 && preview.types.race === 0
                  && preview.types.feat === 0 && preview.types.background === 0 && (
                  <div style={{gridColumn:"1/-1",color:"var(--text3)",fontStyle:"italic",fontSize:"0.8rem"}}>
                    Nessun contenuto importabile trovato in questo file.<br/>
                    <span style={{fontSize:"0.7rem"}}>Chiavi trovate: {Object.keys(preview.data).filter(k=>k!=="_ meta").join(", ")}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {imported && (
            <div style={{background:"rgba(46,139,87,0.15)",border:"1px solid #2e8b57",borderRadius:6,padding:14,textAlign:"center"}}>
              <div style={{fontSize:"2rem",marginBottom:6}}>✓</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.9rem",color:"#2e8b57"}}>
                {imported.count} {imported.type} importati con successo!
              </div>
              <div style={{fontSize:"0.75rem",color:"var(--text3)",marginTop:6}}>
                {imported.type === "mostri" && "Trovi i mostri importati nel tab Mostri → sezione Personalizzati"}
                {imported.type === "incantesimi" && "Trovi gli incantesimi importati nel tab Incantesimi"}
                {imported.type === "oggetti" && "Trovi gli oggetti importati nella ricerca Equipaggiamento"}
              {imported.type === "classi" && "Trovi le classi importate nel ClassPicker della scheda personaggio"}
              {imported.type === "razze" && "Trovi le razze importate nel RacePicker della scheda personaggio"}
              {imported.type === "talenti" && "Talenti salvati nel gestionale"}
              {imported.type === "background" && "Background salvati nel gestionale"}
              </div>
              <button className="btn" style={{marginTop:10}} onClick={onClose}>Chiudi</button>
            </div>
          )}
          </>)}
        </div>
      </div>
    </div>
  );
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{padding:20,background:"#2a0a0a",border:"2px solid #c0392b",borderRadius:8,margin:10,color:"#e74c3c",fontFamily:"monospace",fontSize:"0.8rem"}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",marginBottom:8,color:"#e74c3c"}}>⚠ Errore JavaScript</div>
        <div style={{marginBottom:8,color:"#fff"}}>{this.state.error.message}</div>
        <pre style={{whiteSpace:"pre-wrap",fontSize:"0.7rem",color:"#aaa",maxHeight:200,overflow:"auto"}}>{this.state.error.stack}</pre>
        <button onClick={()=>this.setState({error:null})}
          style={{marginTop:10,padding:"8px 16px",background:"#c0392b",border:"none",borderRadius:4,color:"#fff",cursor:"pointer",fontFamily:"'Cinzel',serif"}}>
          Riprova
        </button>
      </div>
    );
    return this.props.children;
  }
}

// ─── Race & Class Picker Components ──────────────────────────────────────────

// Proficiency bonus by level
const PB = [0,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,6,6,6,6];

// Compute spell slots object {1:n, 2:n, ...} from class+level
function computeSlots(cls, level) {
  if (!cls || !cls.slots) return {};
  const row = cls.slots[level] || [];
  const result = {};
  row.forEach((n, i) => { if (n > 0) result[i+1] = n; });
  return result;
}

// ── RacePicker ────────────────────────────────────────────────────────────
function RacePicker({ currentRace, onApply, onClose }) {
  const importedRaces = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(userKey("dnd_imported_races")) || "[]")
        .map(ir => ({
          slug: ir.slug,
          name: ir.name,
          size: ir.size || "Medio",
          speed: ir.speed || 30,
          // stessa forma delle razze inline: languages array, resistances/darkvision presenti
          languages: Array.isArray(ir.languages) ? ir.languages
            : ir.languages ? String(ir.languages).split(/,\s*/) : ["Comune"],
          abilityBonuses: ir.abilityBonuses || parseAsiLegacy(ir.abilityScoreIncrease),
          traits: ir.traits || [],
          resistances: ir.resistances || [],
          darkvision: ir.darkvision || 0,
          source: ir.source,
          _imported: true,
        }));
    } catch { return []; }
  }, []);

  const allRaces = React.useMemo(() => [...RACES_DB, ...importedRaces], [importedRaces]);
  const [sel, setSel] = React.useState(allRaces.find(r=>r.name===currentRace) || null);
  const abLabels = {STR:"FOR",DEX:"DES",CON:"COS",INT:"INT",WIS:"SAG",CHA:"CAR"};

  return (
    <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="overlay-panel rc-overlay-panel" onClick={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}>
        <div className="overlay-header">
          <span className="overlay-title">🧬 Scegli Razza</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="rc-grid">
          {/* Left: list */}
          <div className="rc-list">
            {allRaces.map(r => (
              <div key={r.slug} className={`rc-list-item ${sel?.slug===r.slug?"active":""}`}
                onClick={()=>setSel(r)}>
                {r.name}
                {r._imported && <span style={{fontSize:"0.6rem",marginLeft:6,color:"var(--gold)",opacity:0.8}}>imp.</span>}
              </div>
            ))}
          </div>
          {/* Right: detail */}
          <div className="rc-detail">
            {!sel && <div style={{color:"var(--text3)",fontStyle:"italic",marginTop:20}}>Seleziona una razza dalla lista.</div>}
            {sel && (<>
              <div className="rc-detail-name">{sel.name}</div>
              <div className="rc-detail-sub">{sel.size} · Velocità {sel.speed} m{sel.darkvision ? ` · Scurovisione ${sel.darkvision} m` : ""}</div>

              {/* Ability bonuses */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">BONUS CARATTERISTICHE</div>
                <div className="rc-ab-bonus">
                  {Object.entries(sel.abilityBonuses || {}).filter(([k])=>!k.startsWith("__")).map(([ab,v])=>(
                    <span key={ab} className="rc-ab-chip">{abLabels[ab]||ab} +{v}</span>
                  ))}
                  {Object.keys(sel.abilityBonuses || {}).some(k=>k.startsWith("__")) && (
                    <span className="rc-ab-chip" style={{borderColor:"var(--text3)",color:"var(--text3)"}}>+1 a due a scelta</span>
                  )}
                </div>
              </div>

              {/* Languages */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">LINGUE</div>
                <div style={{fontSize:"0.78rem",color:"var(--text2)"}}>{Array.isArray(sel.languages) ? sel.languages.join(", ") : sel.languages}</div>
              </div>

              {/* Resistances */}
              {(sel.resistances || []).length > 0 && (
                <div className="rc-detail-section">
                  <div className="rc-detail-section-title">RESISTENZE</div>
                  <div style={{fontSize:"0.78rem",color:"var(--blue2)"}}>{sel.resistances.join(", ")}</div>
                </div>
              )}

              {/* Traits */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">TRATTI RAZZIALI</div>
                {(sel.traits || []).map((t,i)=>(
                  <div key={i} className="rc-trait">
                    <span className="rc-trait-name">{t.name}. </span>
                    <span className="rc-trait-desc">{t.desc}</span>
                  </div>
                ))}
              </div>

              <button className="rc-apply-btn" onClick={()=>onApply(sel)}>
                ✦ Applica Razza alla Scheda
              </button>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── ClassPicker ────────────────────────────────────────────────────────────
function ClassPicker({ currentClass, currentLevel, onApply, onClose }) {
  const importedClasses = React.useMemo(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(userKey("dnd_imported_classes")) || "[]");
      // Deduplicate by name (keep last)
      const deduped = Object.values(Object.fromEntries(raw.map(c => [c.name, c])));
      return deduped.map(ic => ({
          slug: ic.slug,
          name: ic.name,
          hitDie: ic.hitDie || 8,
          savingThrows: ic.savingThrows || [],
          armorProf: ic.armorProf || [],
          weaponProf: ic.weaponProf || [],
          skillCount: ic.skillCount || 2,
          skillList: ic.skillList || [],
          spellcastingAbility: ic.spellcastingAbility || null,
          // Convert slotsPerLevel to slots format used by CLASSES_DB
          slots: ic.slotsPerLevel
            ? Object.fromEntries(ic.slotsPerLevel.map((row, i) => [i+1, row]))
            : {},
          features: ic.featuresByLevel || {},
          subclasses: ic.subclasses || [],
          source: ic.source,
          _imported: true,
        }));
    } catch { return []; }
  }, []);

  const srdNames = new Set(CLASSES_DB.map(c => c.name));
  const allClasses = React.useMemo(() => [
    ...CLASSES_DB,
    ...importedClasses.filter(ic => !srdNames.has(ic.name))
  ], [importedClasses]);

  const [sel, setSel] = React.useState(allClasses.find(c=>c.name===currentClass) || null);
  const level = currentLevel || 1;

  const slotRows = sel ? Object.entries(sel.slots).map(([lv,arr])=>({lv:+lv,arr})) : [];

  return (
    <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="overlay-panel rc-overlay-panel" onClick={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}>
        <div className="overlay-header">
          <span className="overlay-title">⚔ Scegli Classe</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="rc-grid">
          {/* Left: list */}
          <div className="rc-list">
            {allClasses.map(c=>(
              <div key={c.slug} className={`rc-list-item ${sel?.slug===c.slug?"active":""}`}
                onClick={()=>setSel(c)}>
                <div>{c.name}</div>
                {c._imported && <div style={{fontSize:"0.6rem",color:"var(--gold)",opacity:0.8}}>{c.source || "imp."}</div>}
              </div>
            ))}
          </div>
          {/* Right: detail */}
          <div className="rc-detail">
            {!sel && <div style={{color:"var(--text3)",fontStyle:"italic",marginTop:20}}>Seleziona una classe dalla lista.</div>}
            {sel && (<>
              <div className="rc-detail-name">{sel.name}</div>
              <div className="rc-detail-sub">
                d{sel.hitDie} · BP {PB[level]} (Lv{level}) · {(sel.spellcasting || sel.spellcastingAbility) ? `Incantatore (${sel.spellcasting || sel.spellcastingAbility})` : "Non-incantatore"}
              </div>

              {/* Saves */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">TIRI SALVEZZA</div>
                <div className="rc-ab-bonus">
                  {sel.savingThrows.map(ab=><span key={ab} className="rc-ab-chip">{ab}</span>)}
                </div>
              </div>

              {/* Armor */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">ARMATURE & ARMI</div>
                <div style={{fontSize:"0.78rem",color:"var(--text2)"}}>
                  {sel.armorProf.length ? sel.armorProf.join(", ") : "Nessuna armatura"} · {sel.weaponProf.join(", ")}
                </div>
              </div>

              {/* Skills */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">ABILITÀ ({sel.skillChoices || sel.skillCount || "?"} a scelta tra)</div>
                <div style={{fontSize:"0.78rem",color:"var(--text2)"}}>{(sel.skills || sel.skillList || []).join(", ")}</div>
              </div>

              {/* Spell slots if caster */}
              {sel.spellcasting && (
                <div className="rc-detail-section">
                  <div className="rc-detail-section-title">SLOT INCANTESIMO PER LIVELLO (Lv{level} evidenziato)</div>
                  <div style={{overflowX:"auto"}}>
                    <table className="rc-slot-table">
                      <thead>
                        <tr>
                          <th>Lv</th>
                          {[1,2,3,4,5,6,7,8,9].map(n=><th key={n}>{n}°</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {slotRows.filter(({arr})=>arr.some(n=>n>0)).map(({lv,arr})=>(
                          <tr key={lv} className={lv===level?"current-lv":""}>
                            <td>{lv}</td>
                            {arr.map((n,i)=><td key={i}>{n||"—"}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Features up to current level */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">CARATTERISTICHE (fino a Lv{level})</div>
                {Object.entries(sel.features)
                  .filter(([lv])=>+lv<=level)
                  .map(([lv,feats])=> feats.length ? (
                    <div key={lv} className="rc-feature-level">
                      <div className="rc-feature-lv-badge">LV {lv}</div>
                      {feats.map((f,i)=>{
                        const fname = typeof f === "string" ? f : (f?.name || "");
                        const fdesc = typeof f === "string" ? "" : (typeof f?.desc === "string" ? f.desc : "");
                        return (
                          <div key={i} className="rc-feature-item">
                            <strong>{fname}</strong>
                            {fdesc && <div style={{fontSize:"0.7rem",color:"var(--text3)",marginTop:2}}>{fdesc.length>200?fdesc.slice(0,200)+"…":fdesc}</div>}
                          </div>
                        );
                      })}
                    </div>
                  ) : null)}
              </div>

              {/* Subclasses hint */}
              {(sel.subclasses||[]).length > 0 && (
                <div className="rc-detail-section">
                  <div className="rc-detail-section-title">SOTTOCLASSI DISPONIBILI</div>
                  <div style={{fontSize:"0.78rem",color:"var(--text2)"}}>
                    {sel.subclasses.map(sc=>sc.shortName||sc.name).join(" · ")}
                  </div>
                  <div style={{fontSize:"0.7rem",color:"var(--text3)",marginTop:4}}>
                    Potrai scegliere la sottoclasse dopo aver applicato la classe.
                  </div>
                </div>
              )}

              <button className="rc-apply-btn" onClick={()=>onApply(sel)}>
                ✦ Applica Classe alla Scheda (Lv{level})
              </button>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Background Picker ────────────────────────────────────────────────────────
// Sceglie tra i background importati da 5e.tools e applica nome + competenze
// (skill EN → IT via SKILL_EN_TO_IT). Il campo testo resta libero per i
// background costruiti ad hoc.
function BackgroundPicker({ currentBackground, onApply, onClose }) {
  const [query, setQuery] = React.useState("");
  const backgrounds = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_backgrounds")) || "[]"); }
    catch { return []; }
  }, []);
  const [sel, setSel] = React.useState(
    backgrounds.find(b => b.name === currentBackground) || null
  );

  const filtered = React.useMemo(() => {
    const q = query.toLowerCase().trim();
    return q ? backgrounds.filter(b => (b.name || "").toLowerCase().includes(q)) : backgrounds;
  }, [backgrounds, query]);

  // Skill del background selezionato, tradotte (null = non mappabile)
  const selSkills = React.useMemo(() => {
    if (!sel?.skills) return [];
    return sel.skills.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
      .map(en => ({ en, it: SKILL_EN_TO_IT[en] || null }));
  }, [sel]);

  return (
    <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="overlay-panel rc-overlay-panel" onClick={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}>
        <div className="overlay-header">
          <span className="overlay-title">🎭 Scegli Background</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        {backgrounds.length === 0 ? (
          <div style={{padding:"24px 16px",textAlign:"center",color:"var(--text3)",fontSize:"0.85rem",lineHeight:1.7}}>
            Nessun background importato.<br/>
            Importali da <b>📥 Importa → 🌐 Catalogo → Background</b>,<br/>
            oppure scrivi il background a mano nel campo della scheda.
          </div>
        ) : (
        <div className="rc-grid">
          <div className="rc-list" style={{display:"flex",flexDirection:"column"}}>
            <input placeholder="🔍 Cerca..." value={query} onChange={e=>setQuery(e.target.value)}
              style={{margin:"6px 8px",fontSize:"0.8rem"}} autoFocus />
            <div style={{flex:1,overflowY:"auto"}}>
              {filtered.map(b => (
                <div key={b.name} className={`rc-list-item ${sel?.name===b.name?"active":""}`}
                  onClick={()=>setSel(b)}>
                  {b.name}
                  {b.source && <span style={{fontSize:"0.62rem",color:"var(--text3)",marginLeft:5}}>{b.source}</span>}
                </div>
              ))}
              {filtered.length === 0 && (
                <div style={{padding:"12px",fontSize:"0.75rem",color:"var(--text3)"}}>Nessun risultato.</div>
              )}
            </div>
          </div>
          <div className="rc-detail">
            {!sel ? (
              <div style={{padding:24,color:"var(--text3)",fontSize:"0.82rem"}}>Seleziona un background dalla lista.</div>
            ) : (<>
              <div className="rc-detail-title">{sel.name}</div>
              {sel.source && <div className="rc-detail-sub">{sel.source}</div>}

              {selSkills.length > 0 && (
                <div className="rc-detail-section">
                  <div className="rc-detail-section-title">COMPETENZE (applicate alla scheda)</div>
                  <div className="rc-ab-bonus">
                    {selSkills.map(({ en, it }) => (
                      <span key={en} className="rc-ab-chip"
                        style={it ? {} : {borderColor:"var(--text3)",color:"var(--text3)"}}
                        title={it ? "" : "Skill a scelta: spuntala a mano nella scheda"}>
                        {it || (en === "choose" || en === "any" ? "a scelta" : en)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {sel.feature && (
                <div className="rc-detail-section">
                  <div className="rc-detail-section-title">PRIVILEGIO</div>
                  <div style={{fontSize:"0.78rem",color:"var(--text2)",lineHeight:1.5}}>
                    {sel.feature.replace(/^Feature:\s*/i, "")}
                  </div>
                </div>
              )}

              <button className="rc-apply-btn" onClick={()=>onApply(sel, selSkills.map(s=>s.it).filter(Boolean))}>
                ✦ Applica Background alla Scheda
              </button>
            </>)}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

// Compat: le razze importate prima del fix salvavano i bonus caratteristica
// come stringa ("STR +2, CHA +1"); questa le converte nell'oggetto atteso.
function parseAsiLegacy(s) {
  const out = {};
  if (typeof s !== "string") return out;
  for (const m of s.matchAll(/([A-Z]{3})\s*\+(\d+)/g)) out[m[1]] = +m[2];
  if (/choose/i.test(s)) out.__choose = true;
  return out;
}

// ─── Subclass Picker ──────────────────────────────────────────────────────────
function SubclassPicker({ className, currentSubclass, onApply, onClose }) {
  // Load subclasses from imported classes + built-in CLASSES_DB entries
  const subclasses = React.useMemo(() => {
    // From imported classes
    const imported = (() => {
      try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_classes")) || "[]"); } catch { return []; }
    })();
    const ic = imported.find(c => c.name === className);
    if (ic && ic.subclasses && ic.subclasses.length > 0) {
      // Deduplicate by name
      const seen = new Set();
      return ic.subclasses.filter(sc => {
        const k = sc.name;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
    }

    // From CLASSES_DB (some have subclasses defined)
    const bc = CLASSES_DB.find(c => c.name === className);
    if (bc && bc.subclasses) return bc.subclasses;
    return [];
  }, [className]);

  // Load subclass features from imported classFeature data
  const subclassFeatures = React.useMemo(() => {
    try {
      const imported = JSON.parse(localStorage.getItem(userKey("dnd_imported_classes")) || "[]");
      const ic = imported.find(c => c.name === className);
      return (ic && ic.subclassFeaturesByLevel && typeof ic.subclassFeaturesByLevel === "object")
        ? ic.subclassFeaturesByLevel : {};
    } catch { return {}; }
  }, [className]);

  const [sel, setSel] = React.useState(
    subclasses.find(sc => sc.name === currentSubclass || sc.shortName === currentSubclass) || null
  );

  const subclassTitle = React.useMemo(() => {
    try {
      const imported = JSON.parse(localStorage.getItem(userKey("dnd_imported_classes")) || "[]");
      return imported.find(c => c.name === className)?.subclassTitle || "Sottoclasse";
    } catch { return "Sottoclasse"; }
  }, [className]);

  if (subclasses.length === 0) {
    return (
      <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
        <div className="overlay-panel" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
          <div className="overlay-header">
            <span className="overlay-title">🌿 {subclassTitle}</span>
            <button className="btn btn-sm" onClick={onClose}>✕</button>
          </div>
          <div style={{padding:24,textAlign:"center",color:"var(--text3)",fontStyle:"italic"}}>
            Nessuna sottoclasse trovata per {className}.<br/>
            <span style={{fontSize:"0.75rem",marginTop:8,display:"block"}}>
              Importa il file della classe da 5e.tools per aggiungere le sottoclassi.
            </span>
          </div>
        </div>
      </div>
    );
  }

  const selFeatures = React.useMemo(() => {
    if (!sel) return {};
    const raw = subclassFeatures[sel.name] || subclassFeatures[sel.shortName] || {};
    // Sanitise: ensure every feat is {name: string, desc: string}
    const safe = {};
    for (const [lv, feats] of Object.entries(raw)) {
      safe[lv] = (Array.isArray(feats) ? feats : []).map(f => {
        if (typeof f === "string") return { name: f, desc: "" };
        if (f && typeof f === "object") return {
          name: typeof f.name === "string" ? f.name : "",
          desc: typeof f.desc === "string" ? f.desc : "",
        };
        return { name: "", desc: "" };
      }).filter(f => f.name);
    }
    return safe;
  }, [sel, subclassFeatures]);

  return (
    <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="overlay-panel rc-overlay-panel" onClick={e=>e.stopPropagation()} onTouchEnd={e=>e.stopPropagation()}>
        <div className="overlay-header">
          <span className="overlay-title">🌿 {subclassTitle} — {className}</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="rc-grid">
          {/* Left: subclass list */}
          <div className="rc-list" style={{WebkitOverflowScrolling:"touch"}}>
            {subclasses.map(sc => (
              <div key={sc.name}
                className={`rc-list-item ${sel?.name===sc.name?"active":""}`}
                onClick={()=>setSel(sc)}>
                <div>{sc.shortName || sc.name}</div>
                {sc.source && <div style={{fontSize:"0.6rem",color:"var(--text3)",marginTop:2}}>{sc.source}</div>}
              </div>
            ))}
          </div>

          {/* Right: detail */}
          <div className="rc-detail">
            {!sel && (
              <div style={{color:"var(--text3)",fontStyle:"italic",marginTop:20}}>
                Seleziona una {subclassTitle.toLowerCase()} dalla lista.
              </div>
            )}
            {sel && (<>
              <div className="rc-detail-name">{sel.name}</div>
              {sel.source && (
                <div className="rc-detail-sub">{sel.source}</div>
              )}

              {/* Subclass features by level */}
              {Object.keys(selFeatures).length > 0 ? (
                <div className="rc-detail-section">
                  <div className="rc-detail-section-title">CARATTERISTICHE SOTTOCLASSE</div>
                  {Object.entries(selFeatures)
                    .sort(([a],[b]) => +a - +b)
                    .map(([lv, feats]) => (
                      <div key={lv} className="rc-feature-level">
                        <div className="rc-feature-lv-badge">LV {lv}</div>
                        {feats.map((f, i) => {
                          // Normalise: f might be a string or {name,desc}
                          const fname = typeof f === "string" ? f : (f?.name || "");
                          const fdesc = typeof f === "string" ? "" : (typeof f?.desc === "string" ? f.desc : "");
                          return (
                            <div key={i} className="rc-feature-item">
                              <strong>{fname}</strong>
                              {fdesc && (
                                <div style={{fontSize:"0.72rem",color:"var(--text3)",marginTop:3,lineHeight:1.4,whiteSpace:"pre-wrap"}}>
                                  {fdesc.length > 400 ? fdesc.slice(0,400) + "…" : fdesc}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="rc-detail-section">
                  <div style={{color:"var(--text3)",fontSize:"0.78rem",fontStyle:"italic"}}>
                    Importa il file JSON della classe da 5e.tools per vedere le caratteristiche della sottoclasse.
                  </div>
                </div>
              )}

              <button className="rc-apply-btn" onClick={()=>{onApply(sel.name); onClose();}}>
                ✦ Applica {subclassTitle}
              </button>
            </>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Character Sheet ──────────────────────────────────────────────────────────
// Ridimensiona un'immagine caricata a un lato massimo e la comprime in JPEG,
// così il ritratto in base64 pesa ~30-60KB e non satura la quota di localStorage.
function resizeImage(file, maxDim = 512, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
        else if (height > width && height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
        const canvas = document.createElement("canvas");
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Riquadro ritratto del personaggio (in alto a destra nella scheda).
function CharacterPortrait({ portrait, onSet }) {
  const inputRef = React.useRef(null);
  const [busy, setBusy] = React.useState(false);
  const pick = () => inputRef.current?.click();
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { onSet(await resizeImage(file)); } catch { /* immagine non valida */ }
    setBusy(false);
  };
  return (
    <div style={{ flexShrink: 0, width: 118, display: "flex", flexDirection: "column", gap: 5 }}>
      <div onClick={pick} title={portrait ? "Cambia ritratto" : "Carica ritratto"}
        style={{
          width: 118, height: 148, borderRadius: 8, cursor: "pointer",
          border: `1px ${portrait ? "solid" : "dashed"} var(--border2)`,
          background: portrait ? `center/cover no-repeat url(${portrait})` : "var(--surface3)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--text3)", fontSize: "0.72rem", textAlign: "center", overflow: "hidden",
        }}>
        {!portrait && (busy ? "…" : <span style={{ lineHeight: 1.7 }}>🖼<br />Ritratto</span>)}
      </div>
      {portrait && (
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn btn-sm" style={{ flex: 1, fontSize: "0.62rem" }} onClick={pick}>Cambia</button>
          <button className="btn btn-sm" style={{ fontSize: "0.62rem" }} title="Rimuovi ritratto" onClick={() => onSet("")}>✕</button>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
    </div>
  );
}

// Autocompilazione attacco scegliendo un'arma del DB nel form (stessa logica
// dell'auto-attacco da equipaggiamento: "accurata" → max(FOR,DES), a distanza
// → DES, bonus competenza incluso). Il nome resta libero per attacchi custom.
const WEAPON_SUGGEST = EQUIPMENT_DB.filter(i => i.category === "Arma" && i.damage);
function weaponToAttack(item, char) {
  const strMod = Math.floor(((char.abilities?.STR || 10) - 10) / 2);
  const dexMod = Math.floor(((char.abilities?.DEX || 10) - 10) / 2);
  const isFinesse = (item.properties || []).some(p => p.toLowerCase().includes("accurata"));
  const isRanged = (item.subcategory || "").toLowerCase().includes("distanza");
  const atkMod = isFinesse ? Math.max(strMod, dexMod) : isRanged ? dexMod : strMod;
  const profBonus = Math.ceil((char.level || 1) / 4) + 1;
  return {
    name: item.name,
    atkBonus: (atkMod + profBonus >= 0 ? "+" : "") + (atkMod + profBonus),
    dmgDice: item.damage,
    dmgBonus: String(atkMod),
    dmgType: item.damageType || "",
    notes: (item.properties || []).join(", "),
  };
}

function CharacterSheet({ char, onChange, onDelete }) {
  const [tab, setTab] = useState("stats");
  const [showRacePicker, setShowRacePicker]   = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showSubclassPicker, setShowSubclassPicker] = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [collapsed, setCollapsed] = useState({});
  const [showSpellSearch, setShowSpellSearch] = useState(false);


  const [newAttack, setNewAttack] = useState({ name: "", atkBonus: "", dmgDice: "", dmgBonus: "", dmgType: "", notes: "" });

  const update = (patch) => onChange({ ...char, ...patch });
  const updateAbility = (ab, val) => update({ abilities: { ...char.abilities, [ab]: +val } });
  const toggleSection = (key) => setCollapsed(c => ({ ...c, [key]: !c[key] }));

  // Dati della classe importata corrente, usati dal tab Privilegi.
  const importedClass = React.useMemo(() => {
    if (!char.class) return null;
    try {
      const arr = JSON.parse(localStorage.getItem(userKey("dnd_imported_classes")) || "[]");
      return arr.find(c => c.name === char.class) || null;
    } catch { return null; }
  }, [char.class]);

  const classProgression = importedClass?.optionalFeatureProgression || null;
  const classFeaturesByLevel = importedClass?.featuresByLevel || char.classFeatures || null;
  const subclassFeatures = importedClass?.subclassFeaturesByLevel?.[char.subclass] || null;

  // Livelli che concedono un Aumento Caratteristiche (rilevati dai privilegi della classe)
  const asiLevels = React.useMemo(() => {
    const fbl = importedClass?.featuresByLevel || {};
    const levels = [];
    for (const [lv, feats] of Object.entries(fbl)) {
      const has = (feats || []).some(f =>
        /ability score improvement/i.test(typeof f === "string" ? f : (f?.name || "")));
      if (has) levels.push(+lv);
    }
    return levels.filter(l => l <= (char.level || 1)).sort((a, b) => a - b);
  }, [importedClass, char.level]);

  const profBonus = pb(char.level);
  const getSkillBonus = (skill) => {
    const prof = char.skills[skill.name];
    const base = mod(char.abilities[skill.ability]);
    if (prof === "expert") return base + profBonus * 2;
    if (prof === "full") return base + profBonus;
    if (prof === "half") return base + Math.floor(profBonus / 2);
    return base;
  };
  const getSaveBonus = (ab) => {
    const base = mod(char.abilities[ab]);
    return char.savingThrows[ab] ? base + profBonus : base;
  };
  const cycleProf = (skillName) => {
    const cur = char.skills[skillName];
    // none → competente → metà → esperto (Expertise) → none
    const next = !cur ? "full" : cur === "full" ? "half" : cur === "half" ? "expert" : undefined;
    const skills = { ...char.skills };
    if (next) skills[skillName] = next;
    else delete skills[skillName];
    update({ skills });
  };

  const addSpell = (sp) => {
    update({ spells: [...(char.spells || []), { slug: sp.slug, name: sp.name, level: sp.level_int, school: sp.school, castingTime: sp.casting_time, range: sp.range, duration: sp.duration, components: sp.components, desc: sp.desc, higherLevel: sp.higher_level }] });
  };
  const removeSpell = (slug) => update({ spells: char.spells.filter(s => s.slug !== slug) });

  const hpPct = Math.max(0, Math.min(100, (char.currentHp / char.maxHp) * 100));
  const hpColor = hpPct > 50 ? "var(--green)" : hpPct > 25 ? "#c9a844" : "var(--red)";

  const spellsByLevel = (char.spells || []).reduce((acc, sp) => {
    const l = sp.level || 0;
    if (!acc[l]) acc[l] = [];
    acc[l].push(sp);
    return acc;
  }, {});


  // ── Apply race from DB ──────────────────────────────────────────────────
  const applyRace = (raceData) => {
    const patch = { race: raceData.name, speed: raceData.speed, size: raceData.size };
    const newAbilities = { ...char.abilities };
    Object.entries(raceData.abilityBonuses || {}).forEach(([ab, bonus]) => {
      if (!ab.startsWith("__") && newAbilities[ab] !== undefined)
        newAbilities[ab] = Math.min(20, (newAbilities[ab] || 10) + bonus);
    });
    patch.abilities = newAbilities;
    patch.raceTraits = raceData.traits;
    patch.raceLanguages = raceData.languages;
    patch.raceResistances = raceData.resistances;
    patch.raceDarkvision = raceData.darkvision;
    update(patch);
    setShowRacePicker(false);
  };

  // ── Apply class from DB ─────────────────────────────────────────────────
  const applyClass = (classData) => {
    const level = char.level || 1;
    const conMod = Math.floor(((char.abilities?.CON || 10) - 10) / 2);
    const avgPerLevel = Math.floor(classData.hitDie / 2) + 1;
    const newMaxHp = classData.hitDie + conMod + (avgPerLevel + conMod) * (level - 1);
    const newSaves = {};
    Object.keys(char.savingThrows || {}).forEach(ab => { newSaves[ab] = false; });
    classData.savingThrows.forEach(ab => { newSaves[ab] = true; });
    const slotRow = classData.slots[level] || [];
    const spellSlots = {};
    slotRow.forEach((n, i) => { if (n > 0) spellSlots[i + 1] = n; });
    update({
      class: classData.name, hitDie: classData.hitDie,
      maxHp: Math.max(1, newMaxHp), currentHp: Math.max(1, newMaxHp),
      savingThrows: newSaves, spellSlots, usedSpellSlots: {},
      classSkills: classData.skills, classArmorProf: classData.armorProf,
      classWeaponProf: classData.weaponProf,
      spellcastingAbility: classData.spellcasting || "",
      classFeatures: classData.features,
    });
    setShowClassPicker(false);
  };

  // ── Sync slots/HP when level changes (if class known in DB) ────────────
  const syncClassToLevel = (newLevel) => {
    const classData = CLASSES_DB.find(c => c.name === char.class);
    if (!classData) { update({ level: newLevel }); return; }
    const conMod = Math.floor(((char.abilities?.CON || 10) - 10) / 2);
    const avgPerLevel = Math.floor(classData.hitDie / 2) + 1;
    const newMaxHp = classData.hitDie + conMod + (avgPerLevel + conMod) * (newLevel - 1);
    const slotRow = classData.slots[newLevel] || [];
    const spellSlots = {};
    slotRow.forEach((n, i) => { if (n > 0) spellSlots[i + 1] = n; });
    update({ level: newLevel, maxHp: Math.max(1, newMaxHp), spellSlots, usedSpellSlots: {} });
  };

  return (
    <div>
      {showSpellSearch && <SpellSearch onAdd={addSpell} onClose={() => setShowSpellSearch(false)} />}
      {showSubclassPicker && char.class && (
        <SubclassPicker
          className={char.class}
          currentSubclass={char.subclass}
          onApply={(subclassName) => update({ subclass: subclassName })}
          onClose={() => setShowSubclassPicker(false)}
        />
      )}
      {showRacePicker && <ErrorBoundary><RacePicker currentRace={char.race} onApply={applyRace} onClose={()=>setShowRacePicker(false)} /></ErrorBoundary>}
      {showBgPicker && <ErrorBoundary><BackgroundPicker currentBackground={char.background}
        onApply={(bg, skillsIT) => {
          // applica nome + competenze (senza degradare esperto/metà già presenti)
          const skills = { ...char.skills };
          for (const it of skillsIT) if (!skills[it]) skills[it] = "full";
          update({ background: bg.name, skills });
          setShowBgPicker(false);
        }}
        onClose={()=>setShowBgPicker(false)} /></ErrorBoundary>}
      {showClassPicker && <ErrorBoundary><ClassPicker currentClass={char.class} currentLevel={char.level} onApply={applyClass} onClose={()=>setShowClassPicker(false)} /></ErrorBoundary>}

      {/* Character header */}
      <div className="section" style={{ marginBottom: 12 }}>
        <div className="section-content">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
          <div className="grid-2" style={{ marginBottom: 10 }}>
            <div className="field">
              <label>Nome Personaggio
                <span
                  onClick={() => update({ inspiration: !char.inspiration })}
                  title={char.inspiration ? "Ha l'ispirazione — click per consumarla" : "Concedi ispirazione"}
                  style={{ cursor: "pointer", marginLeft: 8, fontSize: "0.9rem",
                    opacity: char.inspiration ? 1 : 0.3,
                    filter: char.inspiration ? "drop-shadow(0 0 4px rgba(212,168,76,0.8))" : "grayscale(1)" }}>
                  ⭐{char.inspiration ? " Ispirazione" : ""}
                </span>
              </label>
              <input value={char.name} onChange={e => update({ name: e.target.value })} style={{ fontSize: "1.1rem", fontFamily: "'Cinzel', serif", color: "var(--gold2)" }} />
            </div>
            <div className="field">
              <label>Giocatore</label>
              <input value={char.player} onChange={e => update({ player: e.target.value })} />
            </div>
          </div>
          <div className="grid-3">
            {/* Race picker */}
            <div className="field">
              <label>Razza {char.race && RACES_DB.find(r=>r.name===char.race) && <span className="rc-auto-badge">auto</span>}</label>
              <div style={{display:"flex",gap:6}}>
                <button className="rc-picker-btn" onClick={()=>setShowRacePicker(true)}>
                  <span className="rc-picker-value">{char.race || "— Seleziona razza —"}</span>
                  <span className="rc-picker-chevron">▾</span>
                </button>
                {char.race && <button className="btn btn-sm" title="Modifica manuale" onClick={()=>{
                  const n = prompt("Nome razza:", char.race);
                  if (n !== null) update({ race: n });
                }}>✎</button>}
              </div>
            </div>

            {/* Class picker */}
            <div className="field">
              <label>Classe {char.class && CLASSES_DB.find(c=>c.name===char.class) && <span className="rc-auto-badge">auto</span>}</label>
              <div style={{display:"flex",gap:6}}>
                <button className="rc-picker-btn" onClick={()=>setShowClassPicker(true)}>
                  <span className="rc-picker-value">{char.class || "— Seleziona classe —"}</span>
                  <span className="rc-picker-chevron">▾</span>
                </button>
                {char.class && <button className="btn btn-sm" title="Modifica manuale" onClick={()=>{
                  const n = prompt("Nome classe:", char.class);
                  if (n !== null) update({ class: n });
                }}>✎</button>}
              </div>
            </div>

            {/* Level — auto-syncs HP & slots if class known */}
            <div className="field">
              <label>Livello {char.class && CLASSES_DB.find(c=>c.name===char.class) && <span className="rc-auto-badge">sync HP+slot</span>}</label>
              <input type="number" min={1} max={20} value={char.level}
                onChange={e => syncClassToLevel(+e.target.value)} />
            </div>
          </div>
          <div className="grid-3">
            <div className="field">
              <label>Sottoclasse
                {char.class && <span className="rc-auto-badge" style={{cursor:"pointer",marginLeft:6}} onClick={()=>setShowSubclassPicker(true)}>scegli</span>}
              </label>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input value={char.subclass} onChange={e => update({ subclass: e.target.value })}
                  placeholder={char.class ? "Digita o clicca 'scegli'" : "Scegli prima la classe"}
                  style={{flex:1}} />
                {char.class && (
                  <button className="btn btn-sm" onClick={()=>setShowSubclassPicker(true)} title="Scegli sottoclasse">
                    🌿
                  </button>
                )}
              </div>
            </div>
            <div className="field">
              <label>Background
                <span className="rc-auto-badge" style={{cursor:"pointer",marginLeft:6}} onClick={()=>setShowBgPicker(true)}>scegli</span>
              </label>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <input value={char.background} onChange={e => update({ background: e.target.value })}
                  placeholder="Digita o clicca 'scegli'" style={{flex:1}} />
                <button className="btn btn-sm" onClick={()=>setShowBgPicker(true)} title="Scegli tra i background importati">🎭</button>
              </div>
            </div>
            <div className="field"><label>Allineamento</label>
              <input value={char.alignment} onChange={e => update({ alignment: e.target.value })}
                list="alignment-suggest" placeholder="Clicca per i 9 classici, o digita" />
              <datalist id="alignment-suggest">
                {ALIGNMENTS.map(a => <option key={a} value={a} />)}
              </datalist>
            </div>

            {/* Race/Class quick-info strip — works for DB picks AND manual entry */}
            {(() => {
              const dbClass = CLASSES_DB.find(c => c.name === char.class);
              const dbRace  = RACES_DB.find(r => r.name === char.race);
              const traits  = dbRace?.traits ?? char.raceTraits ?? [];
              const dv      = dbRace?.darkvision ?? char.raceDarkvision ?? 0;
              const res     = dbRace?.resistances ?? char.raceResistances ?? [];
              const features= dbClass?.features ?? char.classFeatures ?? null;
              const lvFeatsRaw = features ? (features[char.level] || []) : [];
              const lvFeats = lvFeatsRaw.map(f => typeof f === "string" ? f : (f?.name || "")).filter(Boolean);
              if (!traits.length && !lvFeats.length) return null;
              return (
                <div style={{gridColumn:"1/-1",marginTop:4,padding:"8px 10px",background:"var(--surface3)",borderRadius:"var(--radius)",border:"1px solid var(--border)",fontSize:"0.72rem",color:"var(--text2)"}}>
                  {traits.length > 0 && (
                    <div style={{marginBottom: lvFeats.length ? 5 : 0}}>
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.6rem",color:"var(--text3)",letterSpacing:"0.08em"}}>TRATTI RAZZIALI · </span>
                      {traits.map(t=>t.name).join(" · ")}
                      {dv > 0 && <span style={{color:"var(--gold)",marginLeft:6}}>· 👁 Scurovisione {dv}m</span>}
                      {res.length > 0 && <span style={{color:"var(--blue2)",marginLeft:6}}>· 🛡 Res: {res.join(", ")}</span>}
                    </div>
                  )}
                  {lvFeats.length > 0 && (
                    <div>
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.6rem",color:"var(--text3)",letterSpacing:"0.08em"}}>CARATTERISTICHE LV{char.level} · </span>
                      {lvFeats.join(" · ")}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
            </div>
            <CharacterPortrait portrait={char.portrait} onSet={(p) => update({ portrait: p || "" })} />
          </div>
        </div>
      </div>

      {/* Inner tabs */}
      <div className="inner-tabs">
        {[["stats","⚔ Statistiche"],["skills","🎯 Abilità"],["spells","✨ Incantesimi"],["privilegi","🎓 Privilegi"],["equipment","🎒 Equipaggiamento"],["reputation","🏛 Reputazione"],["notes","📜 Note"]].map(([k,l]) => (
          <button key={k} className={`inner-tab ${tab === k ? "active" : ""}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* STATS TAB */}
      {tab === "stats" && (
        <>
          {/* Ability Scores */}
          <div className="section">
            <div className="section-header" onClick={() => toggleSection("abilities")}>
              <span>CARATTERISTICHE</span>
              <span className="collapse-arrow">▼</span>
            </div>
            {!collapsed.abilities && (
              <div className="section-content">
                <div className="grid-6">
                  {ABILITIES.map(ab => (
                    <div key={ab} className="ability-box">
                      <div className="ability-label">{ab}</div>
                      <div className="ability-mod">{modStr(char.abilities[ab])}</div>
                      <input className="ability-input" type="number" min={1} max={30} value={char.abilities[ab]} onChange={e => updateAbility(ab, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Combat stats */}
          <div className="section">
            <div className="section-header" onClick={() => toggleSection("combat")}>
              <span>COMBATTIMENTO</span>
              <span className="collapse-arrow">▼</span>
            </div>
            {!collapsed.combat && (
              <div className="section-content">
                {/* HP */}
                <div className="hp-display" style={{ marginBottom: 12 }}>
                  <div className="hp-main">
                    <div className="hp-label">PF ATTUALI</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 4 }}>
                      <input type="number" value={char.currentHp} onChange={e => update({ currentHp: +e.target.value })}
                        style={{ width: 60, fontSize: "1.8rem", fontFamily: "'Cinzel', serif", fontWeight: 900, color: hpColor, background: "transparent", border: "none", textAlign: "center" }} />
                      <span className="hp-max">/ {char.maxHp}</span>
                    </div>
                    <div className="hp-bar"><div className="hp-bar-fill" style={{ width: hpPct + "%", background: `linear-gradient(90deg, ${hpColor}88, ${hpColor})` }} /></div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="hp-label">PF MAX</div>
                    <input type="number" value={char.maxHp} onChange={e => update({ maxHp: +e.target.value })}
                      style={{ width: 55, fontSize: "1.1rem", fontFamily: "'Cinzel', serif", textAlign: "center" }} />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div className="hp-label">PF TEMP</div>
                    <input type="number" value={char.tempHp} onChange={e => update({ tempHp: +e.target.value })}
                      style={{ width: 55, fontSize: "1.1rem", fontFamily: "'Cinzel', serif", textAlign: "center", color: "var(--blue2)" }} />
                  </div>
                </div>

                <div className="grid-3" style={{ marginBottom: 12 }}>
                  <div className="stat-badge"><div className="stat-badge-label">CLASSE ARMATURA</div>
                    <input type="number" value={char.armorClass} onChange={e => update({ armorClass: +e.target.value })} style={{ textAlign: "center", fontSize: "1.3rem", fontFamily: "'Cinzel', serif", fontWeight: 700, background: "transparent", border: "none" }} /></div>
                  <div className="stat-badge"><div className="stat-badge-label">INIZIATIVA</div>
                    <div className="stat-badge-value">{modStr(char.abilities.DEX)}</div></div>
                  <div className="stat-badge"><div className="stat-badge-label">VELOCITÀ</div>
                    <input type="number" value={char.speed} onChange={e => update({ speed: +e.target.value })} style={{ textAlign: "center", fontSize: "1.1rem", fontFamily: "'Cinzel', serif", background: "transparent", border: "none" }} /></div>
                </div>
                <div className="grid-3">
                  <div className="stat-badge"><div className="stat-badge-label">BONUS COMPETENZA</div><div className="stat-badge-value">+{profBonus}</div></div>
                  <div className="stat-badge"><div className="stat-badge-label">PERCEZIONE PASSIVA</div>
                    <div className="stat-badge-value">{10 + getSkillBonus({ name: "Percezione", ability: "WIS" })}</div></div>
                  <div className="stat-badge">
                    <div className="stat-badge-label">ISPIRAZIONE</div>
                    <input type="checkbox" className="checkbox" checked={char.inspiration} onChange={e => update({ inspiration: e.target.checked })} />
                  </div>
                </div>

                {/* Saving throws */}
                <hr className="divider" />
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em", marginBottom: 8 }}>TIRI SALVEZZA</div>
                <div className="grid-6">
                  {ABILITIES.map(ab => (
                    <div key={ab} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginBottom: 4 }}>{ab}</div>
                      <div style={{ fontSize: "0.9rem", fontFamily: "'Cinzel', serif", color: char.savingThrows[ab] ? "var(--gold)" : "var(--text2)", fontWeight: char.savingThrows[ab] ? 700 : 400, cursor: "pointer" }}
                        onClick={() => update({ savingThrows: { ...char.savingThrows, [ab]: !char.savingThrows[ab] } })}>
                        {getSaveBonus(ab) >= 0 ? "+" : ""}{getSaveBonus(ab)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Death saves */}
                <hr className="divider" />
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em", marginBottom: 8 }}>TIRI SALVEZZA CONTRO MORTE</div>
                <div style={{ display: "flex", gap: 16 }}>
                  {[["successes","✦ Successi","var(--green)"],["failures","✦ Fallimenti","var(--red)"]].map(([k, label, color]) => (
                    <div key={k}>
                      <div style={{ fontSize: "0.65rem", color: "var(--text3)", marginBottom: 4 }}>{label}</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {[0,1,2].map(i => (
                          <div key={i} style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${color}`, background: i < char.deathSaves[k] ? color : "transparent", cursor: "pointer" }}
                            onClick={() => update({ deathSaves: { ...char.deathSaves, [k]: i < char.deathSaves[k] ? char.deathSaves[k] - 1 : char.deathSaves[k] + 1 } })} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Attacks */}
                <hr className="divider" />
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em", marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  ATTACCHI
                  <button className="btn btn-sm" onClick={() => {
                    if (!newAttack.name) return;
                    update({ attacks: [...(char.attacks || []), { ...newAttack, id: Date.now() }] });
                    setNewAttack({ name: "", atkBonus: "", dmgDice: "", dmgBonus: "", dmgType: "", notes: "" });
                  }}>+ Aggiungi</button>
                </div>
                <div className="grid-3" style={{ marginBottom: 8 }}>
                  <input placeholder="Nome attacco (o arma dal DB…)" list="weapon-suggest" value={newAttack.name}
                    onChange={e => {
                      const v = e.target.value;
                      // Arma nota selezionata/digitata per intero → autocompila i campi
                      const w = WEAPON_SUGGEST.find(i => i.name.toLowerCase() === v.toLowerCase());
                      setNewAttack(a => w ? { ...a, ...weaponToAttack(w, char) } : { ...a, name: v });
                    }} />
                  <datalist id="weapon-suggest">
                    {WEAPON_SUGGEST.map(i => <option key={i.slug} value={i.name} />)}
                  </datalist>
                  <input placeholder="Bonus attacco (es +5)" value={newAttack.atkBonus} onChange={e => setNewAttack(a => ({ ...a, atkBonus: e.target.value }))} />
                  <input placeholder="Dado danno (es 1d8)" value={newAttack.dmgDice} onChange={e => setNewAttack(a => ({ ...a, dmgDice: e.target.value }))} />
                </div>
                <div className="grid-3" style={{ marginBottom: 10 }}>
                  <input placeholder="Bonus danno" value={newAttack.dmgBonus} onChange={e => setNewAttack(a => ({ ...a, dmgBonus: e.target.value }))} />
                  <select value={newAttack.dmgType} onChange={e => setNewAttack(a => ({ ...a, dmgType: e.target.value }))}>
                    <option value="">Tipo danno...</option>
                    {DAMAGE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input placeholder="Note" value={newAttack.notes} onChange={e => setNewAttack(a => ({ ...a, notes: e.target.value }))} />
                </div>
                {(char.attacks || []).map(atk => (
                  <div key={atk.id} className="item-row">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: "0.8rem", color: "var(--gold2)" }}>{atk.name}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text3)" }}>{atk.atkBonus} | {atk.dmgDice}{atk.dmgBonus ? `+${atk.dmgBonus}` : ""} {atk.dmgType}</div>
                    </div>
                    <button className="btn btn-sm btn-danger" onClick={() => update({ attacks: char.attacks.filter(a => a.id !== atk.id) })}>✕</button>
                  </div>
                ))}

                {/* Currency */}
                <hr className="divider" />
                <div style={{ fontSize: "0.7rem", color: "var(--text3)", fontFamily: "'Cinzel', serif", letterSpacing: "0.1em", marginBottom: 8 }}>VALUTA</div>
                <div style={{ display: "flex", gap: 8 }}>
                  {["cp","sp","ep","gp","pp"].map(c => (
                    <div key={c} style={{ textAlign: "center", flex: 1 }}>
                      <div style={{ fontSize: "0.6rem", color: "var(--text3)", marginBottom: 4 }}>{c.toUpperCase()}</div>
                      <input type="number" min={0} value={char.currency[c]} onChange={e => update({ currency: { ...char.currency, [c]: +e.target.value } })} style={{ textAlign: "center", padding: "4px 2px" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Traits */}
          <div className="section">
            <div className="section-header" onClick={() => toggleSection("traits")}>
              <span>TRATTI & PERSONALITÀ</span>
              <span className="collapse-arrow">▼</span>
            </div>
            {!collapsed.traits && (
              <div className="section-content">
                <div className="grid-2">
                  {[["traits","Tratti della Personalità"],["ideals","Ideali"],["bonds","Legami"],["flaws","Difetti"]].map(([k,l]) => (
                    <div key={k} className="field">
                      <label>{l}</label>
                      <textarea rows={3} value={char[k]} onChange={e => update({ [k]: e.target.value })} style={{ resize: "vertical" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* SKILLS TAB */}
      {/* Class competencies quick-view panel (stats tab) */}
      {/* Class competencies + race info — shown whenever class/race name matches DB, regardless of how it was entered */}
      {tab === "stats" && (() => {
        const dbClass = CLASSES_DB.find(c => c.name === char.class);
        const dbRace  = RACES_DB.find(r => r.name === char.race);
        // Resolve data: prefer DB, fall back to char fields set by picker, then nothing
        const armorProf   = dbClass?.armorProf   ?? char.classArmorProf   ?? [];
        const weaponProf  = dbClass?.weaponProf  ?? char.classWeaponProf  ?? [];
        const skills      = dbClass?.skills      ?? char.classSkills      ?? [];
        const skillChoices= dbClass?.skillChoices ?? 2;
        const spellAbil   = dbClass?.spellcasting ?? char.spellcastingAbility ?? null;
        const languagesRaw = dbRace?.languages   ?? char.raceLanguages    ?? [];
        const languages   = Array.isArray(languagesRaw) ? languagesRaw : [String(languagesRaw)];
        const traits      = dbRace?.traits       ?? char.raceTraits       ?? [];
        const darkvision  = dbRace?.darkvision   ?? char.raceDarkvision   ?? 0;
        const resistances = dbRace?.resistances  ?? char.raceResistances  ?? [];
        const features    = dbClass?.features    ?? char.classFeatures    ?? null;

        const hasClassInfo = dbClass || char.classSkills || char.classArmorProf;
        const hasRaceInfo  = dbRace  || char.raceTraits;

        if (!hasClassInfo && !hasRaceInfo) return null;
        return (
          <>
            {hasClassInfo && (
              <div className="section">
                <div className="section-header">
                  <span>COMPETENZE DI CLASSE</span>
                  <span style={{fontSize:"0.65rem",color:"var(--text3)"}}>
                    {char.class}{dbClass ? "" : " (manuale)"}
                  </span>
                </div>
                <div className="section-content" style={{fontSize:"0.78rem",color:"var(--text2)",lineHeight:1.8}}>
                  {armorProf.length > 0 && (
                    <div><strong style={{color:"var(--text3)",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",letterSpacing:"0.08em"}}>ARMATURE: </strong>{armorProf.join(", ") || "Nessuna"}</div>
                  )}
                  {weaponProf.length > 0 && (
                    <div><strong style={{color:"var(--text3)",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",letterSpacing:"0.08em"}}>ARMI: </strong>{weaponProf.join(", ")}</div>
                  )}
                  {skills.length > 0 && (
                    <div><strong style={{color:"var(--text3)",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",letterSpacing:"0.08em"}}>ABILITÀ ({skillChoices} a scelta): </strong>{skills.join(", ")}</div>
                  )}
                  {spellAbil && (
                    <div><strong style={{color:"var(--text3)",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",letterSpacing:"0.08em"}}>INCANTESIMI: </strong>
                      <span style={{color:"var(--gold)"}}>Caratteristica {spellAbil}</span>
                    </div>
                  )}
                  {(languages.length > 0 || darkvision > 0 || resistances.length > 0 || traits.length > 0) && (
                    <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid var(--border)"}}>
                      {languages.length > 0 && (
                        <div><strong style={{color:"var(--text3)",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",letterSpacing:"0.08em"}}>LINGUE: </strong>{languages.join(", ")}</div>
                      )}
                      {darkvision > 0 && (
                        <div><strong style={{color:"var(--text3)",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",letterSpacing:"0.08em"}}>SCUROVISIONE: </strong><span style={{color:"var(--gold)"}}>{darkvision} m</span></div>
                      )}
                      {resistances.length > 0 && (
                        <div><strong style={{color:"var(--text3)",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",letterSpacing:"0.08em"}}>RESISTENZE: </strong><span style={{color:"var(--blue2)"}}>{resistances.join(", ")}</span></div>
                      )}
                      {traits.length > 0 && (
                        <div><strong style={{color:"var(--text3)",fontFamily:"'Cinzel',serif",fontSize:"0.6rem",letterSpacing:"0.08em"}}>TRATTI RAZZIALI: </strong>{traits.map(t=>t.name).join(" · ")}</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {features && (() => {
              // Filtro sottoclasse: featuresByLevel importato mescola i privilegi
              // di TUTTE le sottoclassi → tolgo quelli di sottoclasse dal blocco
              // base e mostro solo quelli della sottoclasse scelta, etichettati.
              const scMapAll = importedClass?.subclassFeaturesByLevel || null;
              const subNamesByLv = {};
              if (scMapAll) {
                for (const perLv of Object.values(scMapAll)) {
                  for (const [lv, fs] of Object.entries(perLv || {})) {
                    (subNamesByLv[lv] ||= new Set());
                    for (const f of fs || []) if (f?.name) subNamesByLv[lv].add(f.name);
                  }
                }
              }
              const selSc = (scMapAll && char.subclass && scMapAll[char.subclass]) || null;
              const pinned = char.pinnedFeatures || [];
              const isPinned = (name, lv) => pinned.some(p => p.name === name && p.lv === +lv);
              const togglePinFeat = (f, lv, from) => {
                const name = typeof f === "string" ? f : (f?.name || "");
                const desc = typeof f === "string" ? "" : (typeof f?.desc === "string" ? f.desc : "");
                if (!name) return;
                update({
                  pinnedFeatures: isPinned(name, +lv)
                    ? pinned.filter(p => !(p.name === name && p.lv === +lv))
                    : [...pinned, { id: Date.now(), name, desc, lv: +lv, from: from || "" }],
                });
              };
              const FeatRow = ({ f, lv, from, color }) => {
                const fname = typeof f === "string" ? f : (f?.name || "");
                const fdesc = typeof f === "string" ? "" : (typeof f?.desc === "string" ? f.desc : "");
                const pin = isPinned(fname, +lv);
                return (
                  <div style={{display:"flex",alignItems:"baseline",gap:6,fontSize:"0.78rem",color:"var(--text2)",paddingLeft:8,borderLeft:`2px solid ${color || "var(--border)"}`,marginBottom:2}}>
                    <span onClick={() => togglePinFeat(f, lv, from)}
                      title={pin ? "Togli dalla scheda" : "Aggiungi alla scheda (★ In evidenza)"}
                      style={{cursor:"pointer",flexShrink:0,fontSize:"0.75rem",
                        opacity: pin ? 1 : 0.3, filter: pin ? "drop-shadow(0 0 3px rgba(212,168,76,0.8))" : "grayscale(1)"}}>★</span>
                    <span style={{minWidth:0}}>
                      <strong>{fname}</strong>
                      {fdesc && <span style={{color:"var(--text3)",marginLeft:4,fontSize:"0.73rem"}}>{fdesc.length > 120 ? fdesc.slice(0,120)+"…" : fdesc}</span>}
                    </span>
                  </div>
                );
              };
              const levels = [...new Set([
                ...Object.keys(features),
                ...(selSc ? Object.keys(selSc) : []),
              ])].filter(lv => +lv <= char.level).sort((a, b) => +b - +a);
              return (
              <div className="section">
                <div className="section-header">
                  <span>CARATTERISTICHE DI CLASSE</span>
                  <span style={{fontSize:"0.65rem",color:"var(--text3)"}}>
                    {char.subclass ? `${char.subclass} · ` : ""}fino a Lv{char.level}
                  </span>
                </div>
                <div className="section-content">
                  {/* privilegi pinnati: sempre visibili, descrizione completa */}
                  {pinned.length > 0 && (
                    <div style={{marginBottom:12,background:"var(--surface3)",border:"1px solid var(--border)",borderRadius:"var(--radius)",padding:"8px 10px"}}>
                      <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.6rem",color:"var(--gold)",letterSpacing:"0.08em",marginBottom:5}}>★ IN EVIDENZA</div>
                      {pinned.map(pf => (
                        <div key={pf.id} style={{marginBottom:7}}>
                          <div style={{display:"flex",alignItems:"baseline",gap:6}}>
                            <span onClick={() => update({ pinnedFeatures: pinned.filter(p => p.id !== pf.id) })}
                              title="Togli dalla scheda" style={{cursor:"pointer",fontSize:"0.75rem",filter:"drop-shadow(0 0 3px rgba(212,168,76,0.8))"}}>★</span>
                            <strong style={{fontSize:"0.8rem",color:"var(--gold2)"}}>{pf.name}</strong>
                            <span style={{fontSize:"0.66rem",color:"var(--text3)"}}>LV{pf.lv}{pf.from ? ` · ${pf.from}` : ""}</span>
                          </div>
                          {pf.desc && <div style={{fontSize:"0.76rem",color:"var(--text2)",lineHeight:1.55,marginTop:2,paddingLeft:20}}>{pf.desc}</div>}
                        </div>
                      ))}
                    </div>
                  )}

                  {scMapAll && !char.subclass && (
                    <div style={{fontSize:"0.72rem",color:"var(--text3)",marginBottom:8,fontStyle:"italic"}}>
                      Scegli la sottoclasse (in alto) per vedere anche i suoi privilegi.
                    </div>
                  )}

                  {levels.map(lv => {
                    const baseFeats = (features[lv] || []).filter(f => {
                      const n = typeof f === "string" ? f : (f?.name || "");
                      return !(subNamesByLv[lv]?.has(n));
                    });
                    const scFeats = selSc?.[lv] || [];
                    if (!baseFeats.length && !scFeats.length) return null;
                    return (
                      <div key={lv} style={{marginBottom:8}}>
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.6rem",color:"var(--text3)",letterSpacing:"0.08em",marginBottom:3}}>
                          LV {lv} {+lv === char.level && <span style={{color:"var(--gold)"}}>← attuale</span>}
                        </div>
                        {baseFeats.map((f, i) => <FeatRow key={i} f={f} lv={lv} from="" />)}
                        {scFeats.map((f, i) => <FeatRow key={`sc${i}`} f={f} lv={lv} from={char.subclass} color="var(--gold)" />)}
                      </div>
                    );
                  })}
                </div>
              </div>
              );
            })()}
          </>
        );
      })()}

      {tab === "skills" && (
        <div className="section">
          <div className="section-header"><span>ABILITÀ — clicca il pallino: competente → metà → esperto</span></div>
          <div className="section-content">
            <div style={{display:"flex",flexWrap:"wrap",gap:14,marginBottom:10,fontSize:"0.7rem",color:"var(--text3)"}}>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span className="skill-prof full" style={{cursor:"default"}} />Competente (+BC)</span>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span className="skill-prof half" style={{cursor:"default"}} />Metà (+½BC)</span>
              <span style={{display:"flex",alignItems:"center",gap:5}}><span className="skill-prof expert" style={{cursor:"default"}} />Esperto (+2×BC)</span>
            </div>
            {SKILLS.map(skill => {
              const prof = char.skills[skill.name];
              const bonus = getSkillBonus(skill);
              return (
                <div key={skill.name} className="skill-row">
                  <div className={`skill-prof ${prof || ""}`} onClick={() => cycleProf(skill.name)} title="Clicca per cambiare competenza" />
                  <span className="skill-name">{skill.name}</span>
                  <span className="skill-ability">{skill.ability}</span>
                  <span className="skill-bonus">{bonus >= 0 ? "+" : ""}{bonus}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SPELLS TAB */}
      {tab === "spells" && (
        <>
          <div className="section">
            <div className="section-header">
              <span>SLOT INCANTESIMO</span>
            </div>
            <div className="section-content">
              <SpellSlotsPanel char={char} onChange={patch => update(patch)} />
            </div>
          </div>
          <div className="section">
            <div className="section-header">
              <span>INCANTESIMI CONOSCIUTI</span>
              <button className="btn btn-sm btn-primary" onClick={() => setShowSpellSearch(true)}>+ Cerca</button>
            </div>
            <div className="section-content">
              {Object.keys(spellsByLevel).length === 0 && <div className="empty-state">Nessun incantesimo. Clicca "+ Cerca" per aggiungere.</div>}
              {[0,1,2,3,4,5,6,7,8,9].map(lvl => {
                const spells = spellsByLevel[lvl];
                if (!spells) return null;
                return (
                  <div key={lvl}>
                    <div className="spell-level-header">
                      <span>{lvl === 0 ? "TRUCCHI (0°)" : `${lvl}° LIVELLO`}</span>
                      <span style={{ color: "var(--text3)" }}>{spells.length} incantesimi</span>
                    </div>
                    {spells.map(sp => (
                      <SpellCard key={sp.slug} sp={sp} onRemove={removeSpell} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* PRIVILEGI / SCELTE TAB */}
      {tab === "privilegi" && (
        <div className="section">
          <div className="section-header"><span>SCELTE DI CLASSE</span></div>
          <div className="section-content">
            <ClassChoices
              char={char}
              progression={classProgression}
              asiLevels={asiLevels}
              featuresByLevel={classFeaturesByLevel}
              subclassFeatures={subclassFeatures}
              onChange={onChange}
            />
          </div>
        </div>
      )}

      {/* EQUIPMENT TAB */}
      {tab === "equipment" && (
        <EquipmentTab char={char} update={update} />
      )}

      {/* REPUTATION / PRESTIGE TAB */}
      {tab === "reputation" && (
        <div className="section">
          <div className="section-header">
            <span>PRESTIGIO & REPUTAZIONE</span>
            <span className="prestige-total-badge">
              Totale: {(char.prestige||[]).reduce((s,p)=>s+p.value,0)} / {(char.prestige||[]).length * 10}
            </span>
          </div>
          <div className="section-content">
            <div className="prestige-grid">
              {(char.prestige || []).map(entry => {
                const v = entry.value || 0;
                const label = v >= 9 ? "Leggendario" : v >= 7 ? "Illustre" : v >= 5 ? "Stimato" : v >= 3 ? "Riconosciuto" : v >= 1 ? "Noto" : "Sconosciuto";
                const barColor = v >= 8 ? "var(--gold2)" : v >= 5 ? "var(--gold)" : v >= 3 ? "#c9a44c" : "var(--text3)";
                const updateEntry = (patch) => update({
                  prestige: (char.prestige||[]).map(p => p.id === entry.id ? {...p, ...patch} : p)
                });
                return (
                  <div key={entry.id} className="prestige-row">
                    <div className="prestige-row-top">
                      <input
                        className="prestige-name-input"
                        value={entry.name}
                        onChange={e => updateEntry({ name: e.target.value })}
                        placeholder="Nome entità..."
                      />
                      <div style={{ textAlign: "center" }}>
                        <div className="prestige-score-display" style={{ color: barColor }}>{v}</div>
                        <div className="prestige-label">{label}</div>
                      </div>
                      <button className="btn btn-sm btn-danger"
                        onClick={() => update({ prestige: (char.prestige||[]).filter(p => p.id !== entry.id) })}>✕</button>
                    </div>
                    <div className="prestige-pips">
                      {Array.from({ length: 10 }, (_, i) => {
                        const filled = i < v;
                        const high = i >= 7 && filled;
                        return (
                          <div key={i}
                            className={`prestige-pip ${high ? "filled-high" : filled ? "filled" : ""}`}
                            onClick={() => updateEntry({ value: i + 1 === v ? i : i + 1 })}
                            title={`Imposta a ${i + 1}`}
                          />
                        );
                      })}
                    </div>
                    <div className="prestige-bar-track">
                      <div className="prestige-bar-fill" style={{ width: (v * 10) + "%", background: barColor }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add new entity */}
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              <button className="btn" style={{ flex: 1 }} onClick={() => {
                const newEntry = { id: Date.now(), name: "", value: 0 };
                update({ prestige: [...(char.prestige || []), newEntry] });
              }}>+ Aggiungi Entità</button>
              {(char.prestige||[]).length > 0 && (char.prestige||[]).every(p => p.value === 0) && (
                <button className="btn" onClick={() => update({
                  prestige: [
                    { id: 1, name: "Flint",          value: 0 },
                    { id: 2, name: "Risur",          value: 0 },
                    { id: 3, name: "Corte Nascosta", value: 0 },
                    { id: 4, name: "Clero",          value: 0 },
                    { id: 5, name: "Obscurati",      value: 0 },
                  ]
                })}>↺ Ripristina default</button>
              )}
            </div>

            {/* small legend */}
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", gap: 8 }}>
              {[["0","Sconosciuto","var(--text3)"],["1-2","Noto","#c9a44c"],["3-4","Riconosciuto","var(--gold)"],["5-6","Stimato","var(--gold)"],["7-8","Illustre","var(--gold2)"],["9-10","Leggendario","var(--gold2)"]].map(([range,lbl,col]) => (
                <div key={range} style={{ display:"flex", alignItems:"center", gap:4, fontSize:"0.65rem" }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background:col }} />
                  <span style={{ color:"var(--text3)" }}>{range}</span>
                  <span style={{ color: col, fontFamily:"'Cinzel',serif" }}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* NOTES TAB */}
      {tab === "notes" && (
        <div className="section">
          <div className="section-header"><span>NOTE</span></div>
          <div className="section-content">
            <textarea rows={20} value={char.notes} onChange={e => update({ notes: e.target.value })} style={{ resize: "vertical", lineHeight: 1.7 }} placeholder="Note di gioco, storia del personaggio, obiettivi..." />
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button className="btn btn-danger" onClick={() => { if (confirm(`Eliminare ${char.name}?`)) onDelete(char.id); }}>🗑 Elimina Personaggio</button>
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────



// ─── Monster Components ───────────────────────────────────────────────────────
const CR_ORDER = ["0","1/8","1/4","1/2","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"];

function crColor(cr) {
  const idx = CR_ORDER.indexOf(String(cr));
  if (idx <= 2) return "easy";
  if (idx >= 14) return "lethal";
  return "";
}

function modStr2(score) {
  const m = Math.floor((score - 10) / 2);
  return (m >= 0 ? "+" : "") + m;
}

function MonsterSheet({ monster, onAddToCombat, onEdit, onDelete }) {
  const [currentHp, setCurrentHp] = React.useState(monster.hp);
  const [tempHp, setTempHp] = React.useState(0);

  React.useEffect(() => { setCurrentHp(monster.hp); setTempHp(0); }, [monster.slug || monster.id]);

  const isCustom = !monster.slug;
  const abilities = ["STR","DEX","CON","INT","WIS","CHA"];
  const abilityKeys = ["str","dex","con","int","wis","cha"];

  const hpPct = Math.max(0, Math.min(100, (currentHp / monster.hp) * 100));
  const hpColor = hpPct > 60 ? "var(--green2)" : hpPct > 30 ? "var(--gold)" : "var(--red2)";

  return (
    <div className="monster-sheet">
      {/* Header */}
      <div className="monster-sheet-header">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div className="monster-sheet-name">{monster.name}</div>
            <div className="monster-sheet-subtitle">{monster.size} {monster.type}</div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {isCustom && <button className="btn btn-sm" onClick={onEdit}>✎ Modifica</button>}
            <button className="btn btn-sm btn-danger" onClick={onDelete}>✕</button>
          </div>
        </div>
        <div className="monster-sheet-tags">
          <span className="monster-tag cr">CR {monster.cr}</span>
          <span className="monster-tag ac">CA {monster.ac}</span>
          <span className="monster-tag hp">PF {monster.hp} ({monster.hpDice})</span>
          <span className="monster-tag speed">🏃 {monster.speed}</span>
        </div>

        {/* HP tracker */}
        <div className="monster-hp-tracker">
          <label>PF ATTUALI</label>
          <input type="number" value={currentHp} onChange={e => setCurrentHp(+e.target.value)} />
          <span style={{color:"var(--text3)",fontSize:"0.75rem"}}>/ {monster.hp}</span>
          <div style={{flex:1,height:6,background:"var(--surface2)",borderRadius:3,overflow:"hidden",border:"1px solid var(--border)"}}>
            <div style={{height:"100%",width:hpPct+"%",background:hpColor,transition:"width 0.3s,background 0.3s"}} />
          </div>
          <label style={{marginLeft:4}}>TEMP</label>
          <input type="number" value={tempHp} onChange={e => setTempHp(+e.target.value)} style={{width:45}} />
        </div>
      </div>

      {/* Ability Scores */}
      <div className="monster-abilities">
        {abilities.map((ab,i) => {
          const score = monster[abilityKeys[i]];
          return (
            <div key={ab} className="monster-ability">
              <div className="monster-ability-name">{ab}</div>
              <div className="monster-ability-score">{score}</div>
              <div className="monster-ability-mod">{modStr2(score)}</div>
            </div>
          );
        })}
      </div>

      {/* Saves & Skills */}
      {(Object.keys(monster.saves||{}).length > 0 || Object.keys(monster.skills||{}).length > 0) && (
        <div className="monster-section">
          {Object.keys(monster.saves||{}).length > 0 && (
            <div style={{marginBottom:6}}>
              <div className="monster-section-title">Tiri Salvezza</div>
              <div className="monster-saves-grid">
                {Object.entries(monster.saves).map(([ab,val]) => (
                  <span key={ab} className="monster-save-badge">{ab} {val}</span>
                ))}
              </div>
            </div>
          )}
          {Object.keys(monster.skills||{}).length > 0 && (
            <div>
              <div className="monster-section-title">Competenze</div>
              <div className="monster-saves-grid">
                {Object.entries(monster.skills).map(([sk,val]) => (
                  <span key={sk} className="monster-save-badge">{sk} {val}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resistances & Immunities */}
      {((monster.resistances||[]).length > 0 || (monster.immunities||[]).length > 0) && (
        <div className="monster-section">
          {monster.resistances?.length > 0 && (
            <div style={{marginBottom:4}}>
              <span style={{fontSize:"0.7rem",color:"var(--blue2)",fontWeight:700}}>Resistenze: </span>
              <span style={{fontSize:"0.72rem",color:"var(--text2)"}}>{monster.resistances.join("; ")}</span>
            </div>
          )}
          {monster.immunities?.length > 0 && (
            <div>
              <span style={{fontSize:"0.7rem",color:"var(--green2)",fontWeight:700}}>Immunità: </span>
              <span style={{fontSize:"0.72rem",color:"var(--text2)"}}>{monster.immunities.join("; ")}</span>
            </div>
          )}
        </div>
      )}

      {/* Senses & Languages */}
      <div className="monster-section">
        <div style={{fontSize:"0.72rem",color:"var(--text2)",marginBottom:3}}>
          <strong style={{color:"var(--text3)"}}>Sensi:</strong> {monster.senses}
        </div>
        <div style={{fontSize:"0.72rem",color:"var(--text2)"}}>
          <strong style={{color:"var(--text3)"}}>Lingue:</strong> {monster.languages}
        </div>
        {monster.notes && (
          <div style={{marginTop:6,fontSize:"0.72rem",color:"var(--gold)",fontStyle:"italic"}}>{monster.notes}</div>
        )}
      </div>

      {/* Traits */}
      {(monster.traits||[]).length > 0 && (
        <div className="monster-section">
          <div className="monster-section-title">Tratti</div>
          {monster.traits.map((tr,i) => (
            <div key={i} className="trait-block">
              <span className="trait-name">{tr.name}. </span>
              <span className="trait-desc">{tr.desc}</span>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {(monster.actions||[]).length > 0 && (
        <div className="monster-section">
          <div className="monster-section-title">Azioni</div>
          {monster.actions.map((action,i) => (
            <div key={i} className="monster-action">
              <div className="monster-action-name">{action.name}</div>
              <div className="monster-action-stats">
                {action.type && action.type !== "Speciale" && <span className="monster-action-stat">{action.type}</span>}
                {action.bonus && action.bonus !== "—" && <span className="monster-action-stat atk">⚔ {action.bonus}</span>}
                {action.damage && action.damage !== "—" && <span className="monster-action-stat dmg">🎲 {action.damage} {action.damageType}</span>}
                {action.reach && action.reach !== "—" && <span className="monster-action-stat">📏 {action.reach}</span>}
              </div>
              {action.desc && <div className="monster-action-desc">{action.desc}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Legendary Actions */}
      {(monster.legendaryActions||[]).length > 0 && (
        <div className="monster-section">
          <div className="monster-section-title" style={{color:"var(--gold2)"}}>⚡ Azioni Leggendarie (3/round)</div>
          {monster.legendaryActions.map((la,i) => (
            <div key={i} className="legendary-action">
              <div className="legendary-action-name">{la.name}</div>
              <div className="legendary-action-desc">{la.desc}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add to Combat */}
      <button className="add-to-combat-btn" onClick={() => onAddToCombat(monster)}>
        ⚔ AGGIUNGI AL COMBATTIMENTO
      </button>
    </div>
  );
}

// ── Monster Form (create / edit) ──────────────────────────────────────────
function MonsterForm({ initial, onSave, onClose }) {
  const blank = {
    name:"", cr:"1", type:"Umanoide", size:"Media",
    ac:12, hp:20, hpDice:"", speed:"9 m",
    str:10, dex:10, con:10, int:10, wis:10, cha:10,
    saves:{}, skills:{},
    resistances:"", immunities:"", senses:"Percezione passiva 10", languages:"Comune",
    traits:[], actions:[], legendaryActions:[], notes:""
  };
  const [form, setForm] = React.useState(initial || blank);
  const [actionsText, setActionsText] = React.useState(
    (initial?.actions||[]).map(a => `${a.name}|${a.type||""}|${a.bonus||""}|${a.damage||""}|${a.damageType||""}|${a.reach||""}|${a.desc||""}`).join("\n")
  );
  const [traitsText, setTraitsText] = React.useState(
    (initial?.traits||[]).map(t => `${t.name}|${t.desc}`).join("\n")
  );
  const [legText, setLegText] = React.useState(
    (initial?.legendaryActions||[]).map(a => `${a.name}|${a.desc}`).join("\n")
  );
  const [savesText, setSavesText] = React.useState(
    Object.entries(initial?.saves||{}).map(([k,v])=>`${k}:${v}`).join(", ")
  );
  const [skillsText, setSkillsText] = React.useState(
    Object.entries(initial?.skills||{}).map(([k,v])=>`${k}:${v}`).join(", ")
  );

  const f = (key, val) => setForm(prev => ({...prev, [key]: val}));

  const handleSave = () => {
    if (!form.name.trim()) return;
    // Parse actions: "Nome|tipo|bonus|dado|tipoD|portata|desc"
    const actions = actionsText.split("\n").filter(Boolean).map(line => {
      const [name,type,bonus,damage,damageType,reach,desc] = line.split("|");
      return { name:name?.trim()||"", type:type?.trim()||"", bonus:bonus?.trim()||"", damage:damage?.trim()||"", damageType:damageType?.trim()||"", reach:reach?.trim()||"", desc:desc?.trim()||"" };
    });
    const traits = traitsText.split("\n").filter(Boolean).map(line => {
      const [name,...rest] = line.split("|"); return { name:name?.trim()||"", desc:rest.join("|").trim() };
    });
    const legendaryActions = legText.split("\n").filter(Boolean).map(line => {
      const [name,...rest] = line.split("|"); return { name:name?.trim()||"", desc:rest.join("|").trim() };
    });
    // Parse saves: "STR:+4, DEX:+2"
    const saves = {};
    savesText.split(",").filter(Boolean).forEach(s => {
      const [k,v] = s.trim().split(":"); if(k&&v) saves[k.trim()] = v.trim();
    });
    const skills = {};
    skillsText.split(",").filter(Boolean).forEach(s => {
      const [k,v] = s.trim().split(":"); if(k&&v) skills[k.trim()] = v.trim();
    });
    const resistances = form.resistances ? form.resistances.split(",").map(s=>s.trim()).filter(Boolean) : [];
    const immunities = form.immunities ? form.immunities.split(",").map(s=>s.trim()).filter(Boolean) : [];
    onSave({ ...form, actions, traits, legendaryActions, saves, skills, resistances, immunities, id: initial?.id || Date.now() });
    onClose();
  };

  const abilities = [["str","FOR"],["dex","DES"],["con","COS"],["int","INT"],["wis","SAG"],["cha","CAR"]];
  const CRS = ["0","1/8","1/4","1/2","1","2","3","4","5","6","7","8","9","10","11","12","13","14","15","16","17","18","19","20","21","22","23","24","25","26","27","28","29","30"];

  return (
    <div className="overlay" onClick={onClose} onTouchEnd={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="overlay-panel" onClick={e=>e.stopPropagation()} style={{maxWidth:680}}>
        <div className="overlay-header">
          <span className="overlay-title">🐉 {initial ? "Modifica" : "Nuovo"} Mostro</span>
          <button className="btn btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="overlay-body">

          {/* Base info */}
          <div className="grid-2" style={{marginBottom:8}}>
            <div className="field"><label>Nome *</label><input value={form.name} onChange={e=>f("name",e.target.value)} autoFocus /></div>
            <div className="field"><label>CR</label>
              <select value={form.cr} onChange={e=>f("cr",e.target.value)}>
                {CRS.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid-2" style={{marginBottom:8}}>
            <div className="field"><label>Tipo</label>
              <select value={form.type} onChange={e=>f("type",e.target.value)}>
                {["Umanoide","Bestia","Non-morto","Mostruosità","Drago","Elementale","Costrutto","Fata","Fiend","Gigante","Aberrazione","Celeste","Melma","Vegetale"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field"><label>Taglia</label>
              <select value={form.size} onChange={e=>f("size",e.target.value)}>
                {["Minuscola","Piccola","Media","Grande","Enorme","Mastodontica"].map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
            <div className="field"><label>CA</label><input type="number" value={form.ac} onChange={e=>f("ac",+e.target.value)} /></div>
            <div className="field"><label>PF</label><input type="number" value={form.hp} onChange={e=>f("hp",+e.target.value)} /></div>
            <div className="field"><label>Dado PF</label><input value={form.hpDice} onChange={e=>f("hpDice",e.target.value)} placeholder="es. 5d8+10" /></div>
          </div>
          <div className="field" style={{marginBottom:8}}>
            <label>Velocità</label><input value={form.speed} onChange={e=>f("speed",e.target.value)} placeholder="es. 9 m, volo 18 m" />
          </div>

          {/* Ability scores */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:6,marginBottom:10}}>
            {abilities.map(([key,label]) => (
              <div key={key} className="field" style={{textAlign:"center"}}>
                <label>{label}</label>
                <input type="number" min={1} max={30} value={form[key]} onChange={e=>f(key,+e.target.value)} style={{textAlign:"center"}} />
                <div style={{fontSize:"0.65rem",color:"var(--gold)",marginTop:2}}>{modStr2(form[key])}</div>
              </div>
            ))}
          </div>

          {/* Saves & Skills */}
          <div className="grid-2" style={{marginBottom:8}}>
            <div className="field">
              <label>Tiri Salvezza (es. STR:+5, DEX:+3)</label>
              <input value={savesText} onChange={e=>setSavesText(e.target.value)} placeholder="FOR:+5, DES:+3" />
            </div>
            <div className="field">
              <label>Competenze (es. Percezione:+4)</label>
              <input value={skillsText} onChange={e=>setSkillsText(e.target.value)} placeholder="Percezione:+4" />
            </div>
          </div>

          {/* Resistances & Immunities */}
          <div className="grid-2" style={{marginBottom:8}}>
            <div className="field">
              <label>Resistenze (separate da virgola)</label>
              <input value={form.resistances} onChange={e=>f("resistances",e.target.value)} placeholder="Fuoco, Freddo" />
            </div>
            <div className="field">
              <label>Immunità (separate da virgola)</label>
              <input value={form.immunities} onChange={e=>f("immunities",e.target.value)} placeholder="Veleno, Avvelenato" />
            </div>
          </div>

          {/* Senses & Languages */}
          <div className="grid-2" style={{marginBottom:8}}>
            <div className="field"><label>Sensi</label><input value={form.senses} onChange={e=>f("senses",e.target.value)} /></div>
            <div className="field"><label>Lingue</label><input value={form.languages} onChange={e=>f("languages",e.target.value)} /></div>
          </div>

          {/* Traits */}
          <div className="field" style={{marginBottom:8}}>
            <label>Tratti (una per riga: Nome|Descrizione)</label>
            <textarea rows={3} value={traitsText} onChange={e=>setTraitsText(e.target.value)}
              placeholder={"Rigenerazione|Recupera 10 PF all'inizio di ogni turno.\nResistenza Magica|Vantaggio ai TS contro magia."} style={{resize:"vertical",fontFamily:"monospace",fontSize:"0.75rem"}} />
          </div>

          {/* Actions */}
          <div className="field" style={{marginBottom:8}}>
            <label>Azioni (una per riga: Nome|Tipo|Bonus|Dado|TipoDanno|Portata|Descrizione)</label>
            <textarea rows={4} value={actionsText} onChange={e=>setActionsText(e.target.value)}
              placeholder={"Multiattacco|Speciale||||| Effettua due attacchi.\nMorso|Attacco mischia|+5|2d6+3|Perforante|1.5 m|Se colpisce può afferrare."} style={{resize:"vertical",fontFamily:"monospace",fontSize:"0.75rem"}} />
          </div>

          {/* Legendary Actions */}
          <div className="field" style={{marginBottom:8}}>
            <label>Azioni Leggendarie (una per riga: Nome|Descrizione)</label>
            <textarea rows={2} value={legText} onChange={e=>setLegText(e.target.value)}
              placeholder={"Rilevare|Effettua una prova di Saggezza (Percezione).\nAttacco con la Coda (1 azione)|Attacco con la coda."} style={{resize:"vertical",fontFamily:"monospace",fontSize:"0.75rem"}} />
          </div>

          <div className="field">
            <label>Note</label>
            <textarea rows={2} value={form.notes} onChange={e=>f("notes",e.target.value)} style={{resize:"vertical"}} />
          </div>
        </div>
        <div className="overlay-footer">
          <button className="btn" onClick={onClose}>Annulla</button>
          <button className="btn btn-primary" disabled={!form.name.trim()} onClick={handleSave}>💾 Salva Mostro</button>
        </div>
      </div>
    </div>
  );
}

// ── Monsters Page ─────────────────────────────────────────────────────────
// ── Helper: convert Open5e API monster → our format ──────────────────────
function open5eToLocal(m) {
  const abilityMap = { str: m.strength||10, dex: m.dexterity||10, con: m.constitution||10, int: m.intelligence||10, wis: m.wisdom||10, cha: m.charisma||10 };
  const saves = {};
  if (m.strength_save != null)     saves["FOR"] = (m.strength_save >= 0 ? "+" : "") + m.strength_save;
  if (m.dexterity_save != null)    saves["DES"] = (m.dexterity_save >= 0 ? "+" : "") + m.dexterity_save;
  if (m.constitution_save != null) saves["COS"] = (m.constitution_save >= 0 ? "+" : "") + m.constitution_save;
  if (m.intelligence_save != null) saves["INT"] = (m.intelligence_save >= 0 ? "+" : "") + m.intelligence_save;
  if (m.wisdom_save != null)       saves["SAG"] = (m.wisdom_save >= 0 ? "+" : "") + m.wisdom_save;
  if (m.charisma_save != null)     saves["CAR"] = (m.charisma_save >= 0 ? "+" : "") + m.charisma_save;
  const skills = {};
  if (m.skills) Object.entries(m.skills).forEach(([k,v]) => { skills[k] = (v >= 0 ? "+" : "") + v; });
  const actions = (m.actions||[]).map(a => ({
    name: a.name||"", type: "Azione", bonus: "", damage: "", damageType: "", reach: "", desc: a.desc||""
  }));
  const legendaryActions = (m.legendary_actions||[]).map(a => ({ name: a.name||"", desc: a.desc||"" }));
  const traits = (m.special_abilities||[]).map(a => ({ name: a.name||"", desc: a.desc||"" }));
  const resRaw = [m.damage_resistances, m.damage_vulnerabilities].filter(Boolean).join(", ");
  const immRaw = [m.damage_immunities, m.condition_immunities?.map?.(c=>c.name||c)?.join(", ")].filter(Boolean).join("; ");
  return {
    slug: "open5e-" + m.slug,
    name: m.name,
    cr: String(m.challenge_rating),
    type: m.type||"Sconosciuto",
    size: m.size||"Media",
    ac: m.armor_class||10,
    hp: m.hit_points||1,
    hpDice: m.hit_dice||"",
    speed: typeof m.speed === "object" ? Object.entries(m.speed).map(([k,v])=>`${k} ${v}`).join(", ") : String(m.speed||"9 m"),
    ...abilityMap,
    saves, skills,
    resistances: resRaw ? [resRaw] : [],
    immunities: immRaw ? [immRaw] : [],
    senses: m.senses||"Percezione passiva 10",
    languages: m.languages||"—",
    actions, legendaryActions, traits,
    notes: m.document__title ? `Fonte: ${m.document__title}` : "",
    _source: "api",
  };
}

const MONSTERS_STORAGE_KEY = "dnd_custom_monsters_v1";

function MonstersPage({ onAddToCombat }) {
  // ── Persistent custom monsters ──────────────────────────────────────────
  const [customMonsters, setCustomMonsters] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey(MONSTERS_STORAGE_KEY)) || "[]"); } catch { return []; }
  });
  React.useEffect(() => {
    try { safeLsSet(userKey(MONSTERS_STORAGE_KEY), JSON.stringify(customMonsters)); } catch {}
  }, [customMonsters]);
  // Re-read when import happens from outside
  React.useEffect(() => {
    const refresh = () => {
      try { setCustomMonsters(JSON.parse(localStorage.getItem(userKey(MONSTERS_STORAGE_KEY)) || "[]")); } catch {}
    };
    window.addEventListener("dnd_monsters_updated", refresh);
    return () => window.removeEventListener("dnd_monsters_updated", refresh);
  }, []);

  // ── UI state ────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = React.useState(null);
  const [showForm, setShowForm]     = React.useState(false);
  const [editTarget, setEditTarget] = React.useState(null);
  const [query, setQuery]           = React.useState("");
  const [crFilter, setCrFilter]     = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [tab, setTab]               = React.useState("srd"); // "srd" | "custom" | "online"

  // ── Online search state ─────────────────────────────────────────────────
  const [onlineQuery, setOnlineQuery]     = React.useState("");
  const [onlineResults, setOnlineResults] = React.useState([]);
  const [onlineLoading, setOnlineLoading] = React.useState(false);
  const [onlineError, setOnlineError]     = React.useState("");
  const [onlineSelected, setOnlineSelected] = React.useState(null);

  // ── Data ────────────────────────────────────────────────────────────────
  const srdMonsters   = MONSTERS_DB.map(m => ({...m, _source:"db"}));
  const customList    = customMonsters.map(m => ({...m, _source:"custom"}));

  const listSource = tab === "srd" ? srdMonsters : tab === "custom" ? customList : [];

  const crList   = [...new Set(listSource.map(m=>m.cr))].sort((a,b)=>CR_ORDER.indexOf(String(a))-CR_ORDER.indexOf(String(b)));
  const typeList = [...new Set(listSource.map(m=>m.type))].sort();

  const filtered = listSource.filter(m => {
    const mQ = !query || searchNorm(`${m.name} ${deSlug(m.slug)}`).includes(searchNorm(query));
    const mCR = !crFilter || m.cr === crFilter;
    const mT = !typeFilter || m.type === typeFilter;
    return mQ && mCR && mT;
  });

  const allForLookup = [...srdMonsters, ...customList, ...onlineResults.map(m=>({...m,_source:"api"}))];
  const selected = allForLookup.find(m => (m.slug||m.id) === selectedId);

  // ── CRUD ────────────────────────────────────────────────────────────────
  const saveCustom = (monster) => {
    setCustomMonsters(prev => {
      const existing = prev.find(m => m.id === monster.id);
      return existing ? prev.map(m => m.id === monster.id ? monster : m) : [...prev, monster];
    });
    setSelectedId(monster.id);
    setTab("custom");
  };

  const deleteMonster = (monster) => {
    if (monster._source !== "custom") return;
    if (confirm(`Eliminare ${monster.name}?`)) {
      setCustomMonsters(prev => prev.filter(m => m.id !== monster.id));
      setSelectedId(null);
    }
  };

  const importFromApi = (apiMonster) => {
    const local = open5eToLocal(apiMonster);
    saveCustom({ ...local, id: Date.now(), _source: "custom", slug: undefined });
  };

  // ── Online search ───────────────────────────────────────────────────────
  const searchOnline = async () => {
    if (!onlineQuery.trim()) return;
    setOnlineLoading(true); setOnlineError(""); setOnlineResults([]); setOnlineSelected(null);
    try {
      const url = `https://api.open5e.com/v1/monsters/?search=${encodeURIComponent(onlineQuery)}&limit=20&document__slug=wotc-srd`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Errore API: " + res.status);
      const data = await res.json();
      const converted = (data.results||[]).map(open5eToLocal);
      setOnlineResults(converted);
      if (converted.length === 0) setOnlineError("Nessun risultato. Prova un termine diverso.");
    } catch (e) {
      setOnlineError("Connessione non disponibile. Controlla la rete.");
    } finally {
      setOnlineLoading(false);
    }
  };

  return (
    <div className="monsters-layout">
      {/* ── Left panel ── */}
      <div className="monster-list-panel">
        <div className="monster-list-header">
          {tab !== "online" && (
            <input placeholder="Cerca..." value={query} onChange={e=>setQuery(e.target.value)} style={{flex:1}} />
          )}
          <button className="btn btn-sm btn-primary" onClick={()=>{setEditTarget(null);setShowForm(true);}}>+ Nuovo</button>
        </div>

        {/* Source tabs */}
        <div style={{display:"flex",gap:3,padding:"6px 8px",borderBottom:"1px solid var(--border)"}}>
          {[["srd","📖 SRD"],["custom","⚙ Custom"],["online","🌐 Online"]].map(([k,l]) => (
            <button key={k} className={`type-btn ${tab===k?"active-ally":""}`} style={{flex:1,padding:"5px 2px",fontSize:"0.6rem"}}
              onClick={()=>{setTab(k);setSelectedId(null);}}>
              {l}{k==="custom"&&customMonsters.length>0?` (${customMonsters.length})`:""}
            </button>
          ))}
        </div>

        {/* Filters for SRD/Custom */}
        {tab !== "online" && (
          <div style={{padding:"6px 8px",borderBottom:"1px solid var(--border)",display:"flex",gap:6}}>
            <select value={crFilter} onChange={e=>setCrFilter(e.target.value)} style={{flex:1,fontSize:"0.75rem",padding:"3px 6px"}}>
              <option value="">Tutti CR</option>
              {crList.map(cr=><option key={cr} value={cr}>CR {cr}</option>)}
            </select>
            <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} style={{flex:1,fontSize:"0.75rem",padding:"3px 6px"}}>
              <option value="">Tutti tipi</option>
              {typeList.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}

        {/* Online search box */}
        {tab === "online" && (
          <div style={{padding:"8px",borderBottom:"1px solid var(--border)"}}>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <input placeholder="Nome mostro (inglese)..." value={onlineQuery}
                onChange={e=>setOnlineQuery(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&searchOnline()} style={{flex:1}} autoFocus />
              <button className="btn btn-sm btn-primary" onClick={searchOnline} disabled={onlineLoading}>
                {onlineLoading ? "..." : "🔍"}
              </button>
            </div>
            <div style={{fontSize:"0.65rem",color:"var(--text3)"}}>
              Cerca tra tutti i mostri SRD via Open5e API. Richiede connessione internet.
            </div>
          </div>
        )}

        {/* Monster list */}
        <div className="monster-list-body">
          {tab !== "online" && filtered.length === 0 && (
            <div style={{padding:"20px",textAlign:"center",color:"var(--text3)",fontStyle:"italic"}}>
              {tab === "custom" && customMonsters.length === 0 ? "Nessun mostro custom. Creane uno con + Nuovo." : "Nessun risultato."}
            </div>
          )}
          {tab !== "online" && filtered.map(m => {
            const id = m.slug||m.id;
            return (
              <div key={id} className={`monster-list-item ${id===selectedId?"active":""} ${m._source==="custom"?"custom":""}`}
                onClick={()=>setSelectedId(id)}>
                <span className={`monster-cr-badge ${crColor(m.cr)}`}>CR {m.cr}</span>
                <div>
                  <div className="monster-list-name">{m.name}</div>
                  <div className="monster-list-type">{m.size} {m.type}</div>
                </div>
              </div>
            );
          })}
          {tab === "online" && onlineError && (
            <div style={{padding:"16px",textAlign:"center",color:"var(--red2)",fontSize:"0.8rem"}}>{onlineError}</div>
          )}
          {tab === "online" && onlineResults.map(m => (
            <div key={m.slug} className={`monster-list-item ${m.slug===selectedId?"active":""}`}
              onClick={()=>{setSelectedId(m.slug); setOnlineSelected(m);}}>
              <span className={`monster-cr-badge ${crColor(m.cr)}`}>CR {m.cr}</span>
              <div style={{flex:1}}>
                <div className="monster-list-name">{m.name}</div>
                <div className="monster-list-type">{m.size} {m.type}</div>
              </div>
              <button className="btn btn-sm" title="Importa come custom"
                onClick={e=>{e.stopPropagation(); importFromApi(onlineResults.find(x=>x.slug===m.slug)); }}>
                ↓ Importa
              </button>
            </div>
          ))}
        </div>

        <div style={{padding:"8px",borderTop:"1px solid var(--border)",fontSize:"0.65rem",color:"var(--text3)",textAlign:"center",fontFamily:"'Cinzel',serif"}}>
          {tab==="srd" && `${filtered.length} / ${srdMonsters.length} mostri SRD (DB: ${MONSTERS_DB.length})`}
          {tab==="custom" && `${customMonsters.length} mostri custom salvati`}
          {tab==="online" && `${onlineResults.length} risultati online`}
        </div>
      </div>

      {/* ── Right: monster sheet ── */}
      <div>
        {!selected && (
          <div className="monster-empty">
            <div style={{fontSize:"3rem",marginBottom:12}}>🐉</div>
            <div>Seleziona un mostro dalla lista</div>
            {tab==="online" && <div style={{marginTop:8,fontSize:"0.8rem",color:"var(--text3)"}}>Cerca per nome (in inglese) e clicca ↓ Importa per salvarlo tra i tuoi custom.</div>}
            {tab!=="online" && <div style={{marginTop:8,fontSize:"0.8rem"}}>o creane uno nuovo con il pulsante + Nuovo</div>}
          </div>
        )}
        {selected && (
          <MonsterSheet
            monster={selected}
            onAddToCombat={onAddToCombat}
            onEdit={() => { setEditTarget({...selected, id: selected.id||Date.now()}); setShowForm(true); }}
            onDelete={() => deleteMonster(selected)}
          />
        )}
      </div>

      {showForm && (
        <MonsterForm
          initial={editTarget}
          onSave={saveCustom}
          onClose={()=>{ setShowForm(false); setEditTarget(null); }}
        />
      )}
    </div>
  );
}

// ─── Dice Roller ──────────────────────────────────────────────────────────────
function rollDie(sides) { return Math.floor(Math.random() * sides) + 1; }

function parseDice(expr) {
  // Parse expressions like "2d6+3" or "1d8" into { num, sides, bonus }
  const m = expr.trim().match(/^(\d+)d(\d+)(?:\+(-?\d+))?(?:\s*([+-]\d+))?$/i);
  if (!m) return null;
  return { num: +m[1], sides: +m[2], bonus: m[3] ? +m[3] : (m[4] ? +m[4] : 0) };
}

function DiceRoller({ characters, activeCombatantId }) {
  const [rollerTab, setRollerTab] = useState("attack"); // attack | damage | save | check | manual
  const [advantage, setAdvantage] = useState("normal"); // normal | adv | dis
  const [selectedCharId, setSelectedCharId] = useState(null);
  const [selectedAttackIdx, setSelectedAttackIdx] = useState(0);

  // Auto-follow the active combatant during running combat
  React.useEffect(() => {
    if (activeCombatantId) {
      setSelectedCharId(activeCombatantId);
      setSelectedAttackIdx(0);
    }
  }, [activeCombatantId]);
  const [manualDie, setManualDie] = useState(20);
  const [manualNum, setManualNum] = useState(1);
  const [manualBonus, setManualBonus] = useState(0);
  const [selectedAbility, setSelectedAbility] = useState("STR");
  const [selectedSkill, setSelectedSkill] = useState("Acrobazia");
  const [saveMod, setSaveMod] = useState(0);
  const [result, setResult] = useState(null);
  const [log, setLog] = useState([]);

  const activeChars = characters.filter(c => c.name && c.name !== "Nuovo Personaggio");
  const selectedChar = activeChars.find(c => c.id === selectedCharId) || activeChars[0] || null;

  const pushLog = (entry) => setLog(prev => [entry, ...prev].slice(0, 20));

  const rollWithAdv = (sides) => {
    const r1 = rollDie(sides);
    if (advantage === "normal") return { roll: r1, rolls: [r1] };
    const r2 = rollDie(sides);
    const roll = advantage === "adv" ? Math.max(r1, r2) : Math.min(r1, r2);
    return { roll, rolls: [r1, r2] };
  };

  const doAttackRoll = () => {
    const char = selectedChar;
    const attacks = char?.attacks || [];
    const atk = attacks[safeAttackIdx];
    const { roll, rolls } = rollWithAdv(20);
    const bonusStr = atk?.atkBonus || "+0";
    const bonus = parseInt(bonusStr.replace("+", "")) || 0;
    const total = roll + bonus;
    const isCrit = roll === 20;
    const isFumble = roll === 1;
    const label = atk ? `Attacco: ${atk.name}` : "Attacco";
    const breakdown = rolls.length > 1
      ? `(${rolls.join(", ")}) → d20=${roll} ${bonusStr}`
      : `d20=${roll} ${bonusStr}`;
    const r = { type: "attack", total, roll, bonus, isCrit, isFumble, label, breakdown };
    setResult(r);
    pushLog({ name: label, val: total, isCrit, isFumble });
  };

  const doDamageRoll = () => {
    const char = selectedChar;
    const attacks = char?.attacks || [];
    const atk = attacks[safeAttackIdx];
    if (!atk?.dmgDice) { setResult({ type: "damage", total: 0, label: "Nessun dado danno configurato", breakdown: "" }); return; }
    const parsed = parseDice(atk.dmgDice + (atk.dmgBonus ? "+" + atk.dmgBonus : ""));
    if (!parsed) { setResult({ type: "damage", total: 0, label: "Formato dado non valido", breakdown: "" }); return; }
    const isCritRoll = result?.isCrit;
    const numDice = isCritRoll ? parsed.num * 2 : parsed.num;
    const rolls = Array.from({ length: numDice }, () => rollDie(parsed.sides));
    const total = rolls.reduce((a, b) => a + b, 0) + parsed.bonus;
    const label = `Danno: ${atk.name}${isCritRoll ? " (CRITICO!)" : ""}`;
    const breakdown = `[${rolls.join("+")}]${parsed.bonus ? (parsed.bonus > 0 ? "+" : "") + parsed.bonus : ""} = ${total}`;
    const r = { type: "damage", total, label, breakdown, isCrit: isCritRoll };
    setResult(r);
    pushLog({ name: label, val: total, isCrit: isCritRoll });
  };

  const doSaveRoll = () => {
    const char = selectedChar;
    let bonus = +saveMod;
    let label = `TS ${selectedAbility}`;
    if (char) {
      const base = Math.floor(((char.abilities?.[selectedAbility] || 10) - 10) / 2);
      const profBonus = Math.ceil((char.level || 1) / 4) + 1;
      const hasProf = char.savingThrows?.[selectedAbility];
      bonus = base + (hasProf ? profBonus : 0);
      label = `TS ${selectedAbility} — ${char.name}`;
    }
    const { roll, rolls } = rollWithAdv(20);
    const total = roll + bonus;
    const isCrit = roll === 20; const isFumble = roll === 1;
    const bonusStr = (bonus >= 0 ? "+" : "") + bonus;
    const breakdown = rolls.length > 1 ? `(${rolls.join(", ")}) → d20=${roll} ${bonusStr}` : `d20=${roll} ${bonusStr}`;
    const r = { type: "save", total, roll, bonus, isCrit, isFumble, label, breakdown };
    setResult(r); pushLog({ name: label, val: total, isCrit, isFumble });
  };

  const doCheckRoll = () => {
    const char = selectedChar;
    const skill = SKILLS.find(s => s.name === selectedSkill);
    const ab = skill?.ability || selectedAbility;
    let bonus = 0; let label = `Prova ${selectedSkill}`;
    if (char) {
      const base = Math.floor(((char.abilities?.[ab] || 10) - 10) / 2);
      const profBonus = Math.ceil((char.level || 1) / 4) + 1;
      const prof = char.skills?.[selectedSkill];
      bonus = base + (prof === "full" ? profBonus : prof === "half" ? Math.floor(profBonus / 2) : 0);
      label = `${selectedSkill} (${ab}) — ${char.name}`;
    }
    const { roll, rolls } = rollWithAdv(20);
    const total = roll + bonus;
    const isCrit = roll === 20; const isFumble = roll === 1;
    const bonusStr = (bonus >= 0 ? "+" : "") + bonus;
    const breakdown = rolls.length > 1 ? `(${rolls.join(", ")}) → d20=${roll} ${bonusStr}` : `d20=${roll} ${bonusStr}`;
    const r = { type: "check", total, roll, bonus, isCrit, isFumble, label, breakdown };
    setResult(r); pushLog({ name: label, val: total, isCrit, isFumble });
  };

  const doManualRoll = () => {
    const rolls = Array.from({ length: manualNum }, () => rollDie(manualDie));
    const total = rolls.reduce((a, b) => a + b, 0) + (+manualBonus);
    const isCrit = manualDie === 20 && manualNum === 1 && rolls[0] === 20;
    const isFumble = manualDie === 20 && manualNum === 1 && rolls[0] === 1;
    const label = `${manualNum}d${manualDie}${manualBonus ? (manualBonus > 0 ? "+" : "") + manualBonus : ""}`;
    const breakdown = manualNum > 1 ? `[${rolls.join("+")}]${manualBonus ? (manualBonus > 0 ? "+" : "") + manualBonus : ""} = ${total}` : `d${manualDie}=${rolls[0]}${manualBonus ? (manualBonus > 0 ? "+" : "") + manualBonus : ""}`;
    const r = { type: "manual", total, label, breakdown, isCrit, isFumble };
    setResult(r); pushLog({ name: label, val: total, isCrit, isFumble });
  };

  const doRoll = () => {
    if (rollerTab === "attack") doAttackRoll();
    else if (rollerTab === "damage") doDamageRoll();
    else if (rollerTab === "save") doSaveRoll();
    else if (rollerTab === "check") doCheckRoll();
    else doManualRoll();
  };

  const attacks = selectedChar?.attacks || [];
  // Clamp index to valid range when character changes
  const safeAttackIdx = Math.min(selectedAttackIdx, Math.max(0, attacks.length - 1));

  return (
    <div className="dice-panel">
      <div className="dice-panel-header">🎲 TIRI</div>
      <div className="dice-panel-body">

        {/* Roller type tabs */}
        <div className="roller-tabs">
          {[["attack","⚔ ATK"],["damage","💥 DMG"],["save","🛡 TS"],["check","🎯 PROVA"],["manual","🎲 DADO"]].map(([k,l]) => (
            <div key={k} className={`roller-tab ${rollerTab === k ? "active" : ""}`} onClick={() => setRollerTab(k)}>{l}</div>
          ))}
        </div>

        {/* Character selector — for attack/damage/save/check */}
        {rollerTab !== "manual" && activeChars.length > 0 && (
          <div className="char-select-row">
            <span style={{ fontSize: "0.65rem", color: "var(--text3)", fontFamily: "'Cinzel', serif", flexShrink: 0 }}>PG:</span>
            {activeChars.map(c => (
              <div key={c.id} className={`char-avatar ${(selectedCharId === c.id || (!selectedCharId && c === activeChars[0])) ? "active" : ""}`}
                onClick={() => { setSelectedCharId(c.id); setSelectedAttackIdx(0); }} title={c.name}>
                {c.name.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
        )}

        {/* Advantage toggle — for d20 rolls */}
        {(rollerTab === "attack" || rollerTab === "save" || rollerTab === "check") && (
          <div className="adv-toggle">
            <div className={`adv-btn ${advantage === "normal" ? "active-normal" : ""}`} onClick={() => setAdvantage("normal")}>Normale</div>
            <div className={`adv-btn ${advantage === "adv" ? "active-adv" : ""}`} onClick={() => setAdvantage("adv")}>✦ Vantaggio</div>
            <div className={`adv-btn ${advantage === "dis" ? "active-dis" : ""}`} onClick={() => setAdvantage("dis")}>✕ Svantaggio</div>
          </div>
        )}

        {/* Attack picker */}
        {rollerTab === "attack" && (
          <select className="attack-select" value={safeAttackIdx} onChange={e => setSelectedAttackIdx(+e.target.value)}>
            {attacks.length === 0 && <option value={0}>— Nessun attacco configurato —</option>}
            {attacks.map((atk, i) => (
              <option key={i} value={i}>{atk.name} ({atk.atkBonus || "+0"})</option>
            ))}
          </select>
        )}

        {/* Damage picker */}
        {rollerTab === "damage" && (
          <div>
            <select className="attack-select" value={safeAttackIdx} onChange={e => setSelectedAttackIdx(+e.target.value)}>
              {attacks.length === 0 && <option value={0}>— Nessun attacco configurato —</option>}
              {attacks.map((atk, i) => (
                <option key={i} value={i}>{atk.name} — {atk.dmgDice}{atk.dmgBonus ? "+"+atk.dmgBonus : ""} {atk.dmgType}</option>
              ))}
            </select>
            {result?.isCrit && (
              <div style={{ fontSize: "0.7rem", color: "var(--gold)", fontFamily: "'Cinzel', serif", marginBottom: 6 }}>
                ✦ Critico attivo — dadi raddoppiati!
              </div>
            )}
          </div>
        )}

        {/* Saving throw picker */}
        {rollerTab === "save" && (
          <div>
            <select className="attack-select" value={selectedAbility} onChange={e => setSelectedAbility(e.target.value)}>
              {ABILITIES.map(ab => {
                const char = selectedChar;
                const base = char ? Math.floor(((char.abilities?.[ab] || 10) - 10) / 2) : 0;
                const profBonus = char ? Math.ceil((char.level || 1) / 4) + 1 : 0;
                const hasProf = char?.savingThrows?.[ab];
                const total = base + (hasProf ? profBonus : 0);
                return <option key={ab} value={ab}>{ABILITY_FULL[ab]} ({total >= 0 ? "+" : ""}{total}){hasProf ? " ✦" : ""}</option>;
              })}
            </select>
            {!selectedChar && (
              <div className="bonus-row">
                <label>BONUS MANUALE</label>
                <input type="number" value={saveMod} onChange={e => setSaveMod(+e.target.value)} style={{ width: 60 }} />
              </div>
            )}
          </div>
        )}

        {/* Skill check picker */}
        {rollerTab === "check" && (
          <select className="attack-select" value={selectedSkill} onChange={e => setSelectedSkill(e.target.value)}>
            {SKILLS.map(sk => {
              const char = selectedChar;
              const base = char ? Math.floor(((char.abilities?.[sk.ability] || 10) - 10) / 2) : 0;
              const profBonus = char ? Math.ceil((char.level || 1) / 4) + 1 : 0;
              const prof = char?.skills?.[sk.name];
              const total = base + (prof === "full" ? profBonus : prof === "half" ? Math.floor(profBonus / 2) : 0);
              return <option key={sk.name} value={sk.name}>{sk.name} ({sk.ability}) {total >= 0 ? "+" : ""}{total}{prof ? " ✦" : ""}</option>;
            })}
          </select>
        )}

        {/* Manual dice */}
        {rollerTab === "manual" && (
          <div>
            <div className="manual-dice-grid">
              {[4,6,8,10,12,20,100].concat([]).map(d => (
                <div key={d} className={`die-btn ${manualDie === d ? "selected" : ""}`} onClick={() => setManualDie(d)}>d{d}</div>
              ))}
            </div>
            <div className="bonus-row">
              <label>N°</label>
              <input type="number" min={1} max={20} value={manualNum} onChange={e => setManualNum(+e.target.value)} style={{ width: 55 }} />
              <label style={{ marginLeft: 8 }}>BONUS</label>
              <input type="number" value={manualBonus} onChange={e => setManualBonus(+e.target.value)} style={{ width: 60 }} />
            </div>
          </div>
        )}

        {/* Result display */}
        <div className={`result-display ${result?.isCrit ? "crit" : result?.isFumble ? "fumble" : ""}`}>
          {result ? (
            <>
              <div className="result-main">{result.total}</div>
              <div className="result-label">{result.label}</div>
              <div className="result-breakdown">{result.breakdown}</div>
              {result.isCrit && <div className="result-badge crit-badge">⚡ CRITICO!</div>}
              {result.isFumble && <div className="result-badge fumble-badge">💀 FALLIMENTO CRITICO</div>}
            </>
          ) : (
            <div style={{ color: "var(--text3)", fontStyle: "italic", fontSize: "0.85rem" }}>Premi Tira per ottenere un risultato</div>
          )}
        </div>

        {/* Roll button */}
        <button className="roll-btn" onClick={doRoll}>
          🎲 TIRA
        </button>

        {/* Log */}
        {log.length > 0 && (
          <div className="roll-log">
            {log.map((entry, i) => (
              <div key={i} className="roll-log-entry">
                <span className="roll-log-name">{entry.name}</span>
                <span className={`roll-log-val ${entry.isCrit ? "crit-val" : entry.isFumble ? "fumble-val" : ""}`}>{entry.val}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Combat Tracker ───────────────────────────────────────────────────────────


// ─── MonsterSearch ────────────────────────────────────────────────────────────
// Reusable autocomplete that pre-fills an enemy form from MONSTERS_DB
function MonsterSearch({ onSelect }) {
  const [q, setQ] = React.useState("");
  const [open, setOpen] = React.useState(false);

  const results = React.useMemo(() => {
    if (!q.trim()) return [];
    const nq = searchNorm(q);
    return MONSTERS_DB.filter(m => searchNorm(`${m.name} ${deSlug(m.slug)}`).includes(nq)).slice(0, 8);
  }, [q]);

  function pick(m) {
    onSelect({
      name: m.name,
      subname: `${m.size} ${m.type} — CR ${m.cr}`,
      initMod: Math.floor(((m.dex||10)-10)/2),
      maxHp: m.hp || 0,
      ac: m.ac || 10,
      legendaryActions: (m.legendaryActions?.length > 0) ? 3 : 0,
      hasReaction: true,
    });
    setQ("");
    setOpen(false);
  }

  return (
    <div style={{position:"relative",marginBottom:8}}>
      <input
        value={q}
        onChange={e=>{ setQ(e.target.value); setOpen(true); }}
        onFocus={()=>setOpen(true)}
        onBlur={()=>setTimeout(()=>setOpen(false),150)}
        placeholder="🔍 Cerca nel database mostri..."
        style={{width:"100%",boxSizing:"border-box",padding:"7px 10px",
          background:"var(--surface)",border:"1px solid var(--gold)",
          borderRadius:5,color:"var(--text)",fontSize:"0.85rem",outline:"none"}}
      />
      {open && results.length > 0 && (
        <div style={{position:"absolute",top:"100%",left:0,right:0,zIndex:200,
          background:"var(--surface2)",border:"1px solid var(--border)",
          borderRadius:6,boxShadow:"0 4px 16px rgba(0,0,0,0.4)",maxHeight:220,overflowY:"auto"}}>
          {results.map(m => (
            <div key={m.slug} onMouseDown={()=>pick(m)}
              style={{padding:"8px 12px",cursor:"pointer",borderBottom:"1px solid var(--border)",
                display:"flex",justifyContent:"space-between",alignItems:"center"}}
              onMouseEnter={e=>e.currentTarget.style.background="var(--surface3)"}
              onMouseLeave={e=>e.currentTarget.style.background=""}>
              <div>
                <div style={{fontWeight:600,fontSize:"0.88rem",color:"var(--text)"}}>{m.name}</div>
                <div style={{fontSize:"0.72rem",color:"var(--text3)"}}>{m.size} {m.type} · CR {m.cr}</div>
              </div>
              <div style={{fontSize:"0.75rem",color:"var(--text3)",textAlign:"right",flexShrink:0,marginLeft:12}}>
                <div>PF {m.hp}</div>
                <div>CA {m.ac}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── QuickAddEnemy ────────────────────────────────────────────────────────────
function QuickAddEnemy({ onAdd, onClose }) {
  const [form, setForm] = React.useState({name:"",count:"1",initMod:"0",maxHp:"",ac:"10",legendaryActions:"0",hasReaction:true});

  function handleAdd() {
    if (!form.name.trim()) return;
    onAdd({
      name: form.name.trim(),
      count: form.count,
      initMod: parseInt(form.initMod)||0,
      maxHp: parseInt(form.maxHp)||0,
      ac: parseInt(form.ac)||10,
      legendaryActions: parseInt(form.legendaryActions)||0,
      hasReaction: form.hasReaction,
    });
    setForm({name:"",count:"1",initMod:"0",maxHp:"",ac:"10",legendaryActions:"0",hasReaction:true});
  }

  return (
    <div style={{padding:"10px 12px",background:"rgba(192,57,43,0.06)",
      borderBottom:"1px solid var(--border)"}}>
      <div style={{fontSize:"0.68rem",color:"var(--red2)",textTransform:"uppercase",
        letterSpacing:"0.08em",marginBottom:8,fontWeight:700}}>⚔ Aggiungi rinforzi</div>
      <MonsterSearch onSelect={cfg=>setForm(p=>({
        ...p,
        name: cfg.name,
        initMod: String(cfg.initMod),
        maxHp: String(cfg.maxHp),
        ac: String(cfg.ac),
        legendaryActions: String(cfg.legendaryActions),
        hasReaction: cfg.hasReaction,
      }))} />
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:8}}>
        <input value={form.name} placeholder="Nome creatura"
          onChange={e=>setForm(p=>({...p,name:e.target.value}))}
          onKeyDown={e=>e.key==="Enter"&&handleAdd()} />
        <input type="number" min={1} max={20} value={form.count}
          onChange={e=>setForm(p=>({...p,count:e.target.value}))}
          style={{width:46}} title="Quantità" />
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
        <div className="field"><label>Init</label>
          <input type="number" value={form.initMod} onChange={e=>setForm(p=>({...p,initMod:e.target.value}))} /></div>
        <div className="field"><label>PF</label>
          <input type="number" min={0} value={form.maxHp} onChange={e=>setForm(p=>({...p,maxHp:e.target.value}))} /></div>
        <div className="field"><label>CA</label>
          <input type="number" min={0} value={form.ac} onChange={e=>setForm(p=>({...p,ac:e.target.value}))} /></div>
      </div>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        <button className="btn btn-danger btn-sm" style={{flex:1,fontSize:"0.82rem"}}
          onClick={handleAdd}>
          + Aggiungi al combattimento
        </button>
        <button className="btn btn-sm" style={{fontSize:"0.75rem"}} onClick={onClose}>Annulla</button>
      </div>
    </div>
  );
}

const COMBAT_KEY = "dnd_combat_v2";
const ENCOUNTERS_KEY = "dnd_encounters_v2";

// ─── helpers ─────────────────────────────────────────────────────────────────
function loadLS(key, fallback) {
  try { return JSON.parse(localStorage.getItem(userKey(key)) || "null") ?? fallback; } catch { return fallback; }
}
function saveLS(key, val) {
  try { safeLsSet(userKey(key), JSON.stringify(val)); } catch {}
}
function newId() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

// Condizioni con colore e descrizione breve
const COND_META = {
  "Avvelenato":   { color:"#27ae60", short:"Svantaggio attacchi e prove" },
  "Accecato":     { color:"#7f8c8d", short:"Fallisce prove vista, svant. attacchi" },
  "Assordato":    { color:"#95a5a6", short:"Fallisce prove udito" },
  "Spaventato":   { color:"#e67e22", short:"Svant. attacchi/prove vicino alla fonte" },
  "Affascinato":  { color:"#9b59b6", short:"Non attacca la fonte del fascino" },
  "Paralizzato":  { color:"#c0392b", short:"Incap., fallisce FOR/DES, critici in mischia" },
  "Prono":        { color:"#d35400", short:"Svant. attacchi, vant. contro in mischia" },
  "Trattenuto":   { color:"#2980b9", short:"Vel. 0, svant. attacchi e TS DES" },
  "Stordito":     { color:"#e74c3c", short:"Incap., fallisce FOR/DES, vant. contro" },
  "Incapacitato": { color:"#555",    short:"Nessuna azione né reazione" },
  "Invisibile":   { color:"#1abc9c", short:"Vant. attacchi, svant. contro" },
  "Pietrificato": { color:"#bdc3c7", short:"Incap., resistenza tutto, fallisce FOR/DES" },
  "Esausto":      { color:"#f39c12", short:"Vedi livelli esaurimento (1-6)" },
};
const CONDITIONS = Object.keys(COND_META);

// ─── CombatTracker ────────────────────────────────────────────────────────────
function CombatTracker({ characters, pendingCombatant, onPendingConsumed }) {

  // ── STATE ──────────────────────────────────────────────────────────────────
  const [view, setView]           = React.useState("combat");   // "combat" | "encounters"
  const [activeEncounterInfo, setActiveEncounterInfo] = React.useState(() => loadLS(COMBAT_KEY+"_encinfo", null)); // {name, notes}
  const [phase, setPhase]         = React.useState(() => loadLS(COMBAT_KEY+"_phase", "idle"));
  React.useEffect(() => saveLS(COMBAT_KEY+"_phase", phase), [phase]);
  const [round, setRound]         = React.useState(() => loadLS(COMBAT_KEY+"_round", 1));
  const [currentIdx, setCurrentIdx] = React.useState(() => loadLS(COMBAT_KEY+"_idx", 0));
  const [combatants, setCombatants] = React.useState(() => loadLS(COMBAT_KEY+"_combatants", []));
  const [encounters, setEncounters] = React.useState(() => loadLS(ENCOUNTERS_KEY, []));

  // setup state
  const [pgToggles, setPgToggles]   = React.useState({});   // id → bool (attivo)
  const [initValues, setInitValues] = React.useState({});   // combatant id → valore inserito

  // detail panel
  const [expandedId, setExpandedId] = React.useState(null);

  // confirm modal
  const [confirmModal, setConfirmModal] = React.useState(null); // null | { message, onConfirm }

  // encounter editor
  const [editingEncounter, setEditingEncounter] = React.useState(null); // null | encounter obj

  // setup: add enemy form
  const [enemyForm, setEnemyForm] = React.useState({name:"",count:"1",initMod:"0",maxHp:"",ac:"10",legendaryActions:"0",hasReaction:true});
  const [showEnemyForm, setShowEnemyForm] = React.useState(false);
  const [showQuickAdd, setShowQuickAdd] = React.useState(false);

  // ── PERSIST ────────────────────────────────────────────────────────────────
  React.useEffect(() => saveLS(COMBAT_KEY+"_encinfo", activeEncounterInfo), [activeEncounterInfo]);
  React.useEffect(() => saveLS(COMBAT_KEY+"_phase", phase), [phase]);
  React.useEffect(() => saveLS(COMBAT_KEY+"_round", round), [round]);
  React.useEffect(() => saveLS(COMBAT_KEY+"_idx", currentIdx), [currentIdx]);
  React.useEffect(() => saveLS(COMBAT_KEY+"_combatants", combatants), [combatants]);
  React.useEffect(() => saveLS(ENCOUNTERS_KEY, encounters), [encounters]);

  // ── PENDING FROM MOSTRI TAB ────────────────────────────────────────────────
  const lastPendingRef = React.useRef(null);
  React.useEffect(() => {
    if (!pendingCombatant || lastPendingRef.current === pendingCombatant) return;
    lastPendingRef.current = pendingCombatant;
    const m = pendingCombatant;
    addEnemy({
      name: m.name,
      subname: `${m.size||""} ${m.type||""} — CR ${m.cr||"?"}`,
      initMod: Math.floor(((m.dex||10)-10)/2),
      maxHp: m.hp || 0,
      ac: m.ac || 10,
      legendaryActions: m.legendary_actions ? 3 : 0,
      hasReaction: true,
    });
    onPendingConsumed();
  }, [pendingCombatant]);

  // ── COMBATANT HELPERS ──────────────────────────────────────────────────────
  function makePcCombatant(c) {
    return {
      id: "pc-"+c.id, kind:"pc",
      name: c.name,
      subname: `${c.class||""} Lv${c.level||1}`,
      initMod: Math.floor(((c.abilities?.DEX||10)-10)/2),
      initiative: null,
      currentHp: c.currentHp || c.maxHp || 0,
      maxHp: c.maxHp || 0,
      ac: c.armorClass || 10,
      conditions: [],
      effects: [],        // { id, label, roundsLeft, onStart } countdown effects
      concentration: null, // string | null
      legendaryActions: 0, legendaryUsed: 0,
      hasReaction: true, reactionUsed: false,
      note: "",
      dead: false,
    };
  }

  function makeEnemyCombatant({ name, subname="", initMod=0, maxHp=0, ac=10,
    legendaryActions=0, hasReaction=true, groupId=null, groupInit=null }) {
    return {
      id: newId(), kind:"enemy",
      name, subname, initMod,
      initiative: groupInit,
      currentHp: maxHp, maxHp, ac,
      conditions: [], effects: [],
      concentration: null,
      legendaryActions, legendaryUsed: 0,
      hasReaction, reactionUsed: false,
      note: "", dead: false,
      groupId,
    };
  }

  function addEnemy(cfg) {
    setCombatants(prev => [...prev, makeEnemyCombatant(cfg)]);
  }

  function updateCombatant(id, patch) {
    setCombatants(prev => prev.map(c => c.id === id ? {...c, ...patch} : c));
  }

  function removeCombatant(id) {
    setCombatants(prev => prev.filter(c => c.id !== id));
  }

  // ── PHASE: IDLE ────────────────────────────────────────────────────────────
  function startSetup(preloadedEnemies = []) {
    // Build initial toggle state for PGs
    const toggles = {};
    characters.filter(c => c.name && c.name !== "Nuovo Personaggio")
      .forEach(c => { toggles[c.id] = true; });
    setPgToggles(toggles);
    const enemies = preloadedEnemies.map(e => makeEnemyCombatant(e));
    setCombatants(enemies);
    setInitValues({});
    setPhase("setup");
  }

  // ── PHASE: SETUP → RUNNING ─────────────────────────────────────────────────
  function confirmSetupAndRun() {
    // Merge active PCs + existing enemies, assign initiatives, sort
    const pcs = characters
      .filter(c => pgToggles[c.id] && c.name && c.name !== "Nuovo Personaggio")
      .map(makePcCombatant);

    const all = [...pcs, ...combatants.filter(c => c.kind === "enemy")];
    // Apply initiative values
    const withInit = all.map(c => ({
      ...c,
      initiative: initValues[c.id] !== undefined
        ? Number(initValues[c.id])
        : (c.initiative ?? null),
    }));
    const sorted = [...withInit].sort((a,b) => {
      if (b.initiative === null) return -1;
      if (a.initiative === null) return 1;
      if (b.initiative !== a.initiative) return b.initiative - a.initiative;
      return b.initMod - a.initMod;
    });
    setCombatants(sorted);
    setCurrentIdx(0);
    setRound(1);
    setPhase("running");
  }

  // ── PHASE: RUNNING — turn navigation ──────────────────────────────────────
  function nextTurn() {
    const alive = combatants.filter(c => !c.dead);
    if (alive.length === 0) return;

    // tick effects for current combatant (onStart = false → tick on their turn end)
    setCombatants(prev => {
      const cur = prev[currentIdx];
      if (!cur) return prev;
      return prev.map((c,i) => {
        if (i !== currentIdx) return c;
        const effects = c.effects
          .map(e => e.onStart ? e : {...e, roundsLeft: e.roundsLeft - 1})
          .filter(e => e.roundsLeft > 0);
        return {...c, effects};
      });
    });

    let next = (currentIdx + 1) % combatants.length;
    let newRound = round;
    if (next === 0) newRound = round + 1;

    // skip dead
    let attempts = 0;
    while (combatants[next]?.dead && attempts < combatants.length) {
      next = (next + 1) % combatants.length;
      if (next === 0) newRound++;
      attempts++;
    }

    // tick effects for next combatant (onStart = true → tick at start of their turn)
    setCombatants(prev => prev.map((c,i) => {
      if (i !== next) return c;
      // also reset legendary/reaction
      const effects = c.effects
        .map(e => e.onStart ? {...e, roundsLeft: e.roundsLeft - 1} : e)
        .filter(e => e.roundsLeft > 0);
      return {
        ...c, effects,
        legendaryUsed: 0,
        reactionUsed: false,
      };
    }));

    setCurrentIdx(next);
    setRound(newRound);
  }

  function prevTurn() {
    let prev = currentIdx - 1;
    if (prev < 0) { prev = combatants.length - 1; setRound(r => Math.max(1, r-1)); }
    let attempts = 0;
    while (combatants[prev]?.dead && attempts < combatants.length) {
      prev = prev <= 0 ? combatants.length - 1 : prev - 1;
      attempts++;
    }
    setCurrentIdx(prev);
  }

  function endCombat() {
    setConfirmModal({
      message: "Terminare il combattimento e cancellarlo?",
      onConfirm: () => {
        setCombatants([]);
        setRound(1); setCurrentIdx(0);
        setPhase("idle");
        setExpandedId(null);
        setConfirmModal(null);
      }
    });
  }

  function addEnemyInSetup() {
    if (!enemyForm.name.trim()) return;
    const count = parseInt(enemyForm.count) || 1;
    const base = {
      name: enemyForm.name.trim(),
      initMod: parseInt(enemyForm.initMod) || 0,
      maxHp: parseInt(enemyForm.maxHp) || 0,
      ac: parseInt(enemyForm.ac) || 10,
      legendaryActions: parseInt(enemyForm.legendaryActions) || 0,
      hasReaction: enemyForm.hasReaction,
      groupId: newId(),
    };
    const enemies = Array.from({length: count}, (_,i) => makeEnemyCombatant({
      ...base,
      name: count > 1 ? `${base.name} ${i+1}` : base.name,
    }));
    setCombatants(prev => [...prev, ...enemies]);
    setEnemyForm({name:"",count:"1",initMod:"0",maxHp:"",ac:"10",legendaryActions:"0",hasReaction:true});
    setShowEnemyForm(false);
  }

  function addEnemyLive(cfg) {
    // Insert after current combatant so they act next
    const enemies = Array.from({length: parseInt(cfg.count)||1}, (_,i) => makeEnemyCombatant({
      ...cfg,
      name: (parseInt(cfg.count)||1) > 1 ? `${cfg.name} ${i+1}` : cfg.name,
      groupId: newId(),
    }));
    setCombatants(prev => {
      const next = [...prev];
      next.splice(currentIdx + 1, 0, ...enemies);
      return next;
    });
    setShowQuickAdd(false);
  }

  // ── ENCOUNTERS ────────────────────────────────────────────────────────────
  function saveEncounter(enc) {
    if (enc.id) {
      setEncounters(prev => prev.map(e => e.id === enc.id ? enc : e));
    } else {
      setEncounters(prev => [...prev, {...enc, id: newId()}]);
    }
    setEditingEncounter(null);
  }

  function deleteEncounter(id) {
    setConfirmModal({
      message: "Eliminare questo scontro salvato?",
      onConfirm: () => {
        setEncounters(prev => prev.filter(e => e.id !== id));
        setConfirmModal(null);
      }
    });
  }

  function loadEncounter(enc) {
    setActiveEncounterInfo({ name: enc.name || "", notes: enc.notes || "" });
    startSetup(enc.enemies || []);
    setView("combat");
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* ── TOP BAR ── */}
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
        padding:"8px 14px",borderBottom:"1px solid var(--border)",flexShrink:0,gap:8,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:6}}>
          {["combat","encounters"].map(v => (
            <button key={v} onClick={()=>setView(v)}
              className={`inner-tab ${view===v?"active":""}`}
              style={{fontSize:"0.82rem",padding:"5px 12px"}}>
              {v==="combat" ? "⚔ Combattimento" : "📋 Scontri Salvati"}
            </button>
          ))}
        </div>
        {view==="combat" && phase==="idle" && (
          <button className="btn btn-primary" style={{fontSize:"0.82rem"}}
            onClick={()=>startSetup()}>
            + Nuovo combattimento
          </button>
        )}
        {view==="combat" && phase==="running" && (
          <button className="btn btn-danger" style={{fontSize:"0.82rem"}}
            onClick={endCombat}>
            ✕ Fine combattimento
          </button>
        )}
        {view==="encounters" && (
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-primary" style={{fontSize:"0.82rem"}}
              onClick={()=>setEditingEncounter({name:"",notes:"",enemies:[]})}>
              + Nuovo scontro
            </button>
            <label className="btn" style={{fontSize:"0.82rem",cursor:"pointer",margin:0}}>
              ⬆ Importa JSON
              <input type="file" accept=".json" style={{display:"none"}} onChange={e=>{
                const file = e.target.files[0]; if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  try {
                    const data = JSON.parse(ev.target.result);
                    const lista = Array.isArray(data) ? data : [data];
                    const validi = lista.filter(enc => enc.name && Array.isArray(enc.enemies));
                    if (validi.length === 0) { alert("Nessun encounter valido trovato nel file."); return; }
                    const nomiEsistenti = new Set(encounters.map(e => e.name));
                    const nuovi = validi.filter(enc => !nomiEsistenti.has(enc.name));
                    if (nuovi.length === 0) { alert("Tutti gli encounter del file sono già presenti."); return; }
                    setEncounters(prev => [...prev, ...nuovi.map(enc => ({...enc, id: newId()}))]);
                    alert(`✅ Importati ${nuovi.length} encounter!`);
                  } catch(err) { alert("Errore nel file JSON: " + err.message); }
                };
                reader.readAsText(file);
                e.target.value = "";
              }} />
            </label>
          </div>
        )}
      </div>

      {/* ── VIEWS ── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>

        {/* ════ IDLE ════ */}
        {view==="combat" && phase==="idle" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
            justifyContent:"center",gap:16,color:"var(--text3)"}}>
            <div style={{fontSize:"2.5rem"}}>⚔</div>
            <div style={{fontSize:"1rem",fontWeight:600,color:"var(--text2)"}}>Nessun combattimento attivo</div>
            <div style={{fontSize:"0.82rem"}}>Avvia un nuovo combattimento o carica uno scontro salvato.</div>
            {encounters.length > 0 && (
              <div style={{display:"flex",flexDirection:"column",gap:8,width:"100%",maxWidth:340,marginTop:8}}>
                <div style={{fontSize:"0.72rem",color:"var(--text3)",textAlign:"center",
                  textTransform:"uppercase",letterSpacing:"0.08em"}}>Scontri salvati</div>
                {encounters.map(enc => (
                  <div key={enc.id} style={{display:"flex",alignItems:"center",gap:8,
                    background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:7,padding:"8px 12px"}}>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600,fontSize:"0.88rem",color:"var(--text)"}}>{enc.name}</div>
                      <div style={{fontSize:"0.72rem",color:"var(--text3)"}}>
                        {enc.enemies?.length || 0} nemici
                      </div>
                    </div>
                    <button className="btn btn-primary" style={{fontSize:"0.75rem",padding:"5px 10px"}}
                      onClick={()=>loadEncounter(enc)}>
                      Carica ▶
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════ SETUP ════ */}
        {view==="combat" && phase==="setup" && (
          <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:14}}>

            {/* PG attivi */}
            <div>
              <div style={{fontSize:"0.72rem",color:"var(--text3)",textTransform:"uppercase",
                letterSpacing:"0.08em",marginBottom:8}}>Personaggi del Party</div>
              {characters.filter(c=>c.name&&c.name!=="Nuovo Personaggio").map(c => (
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"8px 10px",borderRadius:6,marginBottom:4,
                  background: pgToggles[c.id] ? "var(--surface2)" : "var(--surface)",
                  border:`1px solid ${pgToggles[c.id]?"var(--border)":"transparent"}`,
                  opacity: pgToggles[c.id] ? 1 : 0.45}}>
                  <input type="checkbox" checked={!!pgToggles[c.id]}
                    onChange={e=>setPgToggles(p=>({...p,[c.id]:e.target.checked}))}
                    style={{width:16,height:16,cursor:"pointer"}} />
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:"0.88rem"}}>{c.name}</div>
                    <div style={{fontSize:"0.72rem",color:"var(--text3)"}}>{c.class} Lv{c.level}</div>
                  </div>
                  {pgToggles[c.id] && (
                    <div style={{display:"flex",alignItems:"center",gap:6}}>
                      <span style={{fontSize:"0.72rem",color:"var(--text3)"}}>Init</span>
                      <input type="number" placeholder="d20+mod"
                        value={initValues["pc-"+c.id]??""} min={1} max={30}
                        onChange={e=>setInitValues(p=>({...p,["pc-"+c.id]:e.target.value}))}
                        style={{width:52,textAlign:"center",padding:"4px 6px",fontSize:"0.88rem"}} />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Nemici */}
            <div>
              <div style={{fontSize:"0.72rem",color:"var(--text3)",textTransform:"uppercase",
                letterSpacing:"0.08em",marginBottom:8}}>Nemici</div>
              {combatants.filter(c=>c.kind==="enemy").length === 0 && (
                <div style={{fontSize:"0.82rem",color:"var(--text3)",padding:"8px 0"}}>
                  Nessun nemico aggiunto. Aggiungine uno o carica uno scontro salvato.
                </div>
              )}
              {combatants.filter(c=>c.kind==="enemy").map(c => (
                <div key={c.id} style={{display:"flex",alignItems:"center",gap:8,
                  padding:"8px 10px",borderRadius:6,marginBottom:4,
                  background:"var(--surface2)",border:"1px solid var(--border)"}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:"0.88rem",color:"var(--red2)"}}>{c.name}</div>
                    {c.subname && <div style={{fontSize:"0.72rem",color:"var(--text3)"}}>{c.subname}</div>}
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:"0.72rem",color:"var(--text3)"}}>Init</span>
                    <input type="number" placeholder="d20+mod"
                      value={initValues[c.id]??""} min={1} max={30}
                      onChange={e=>setInitValues(p=>({...p,[c.id]:e.target.value}))}
                      style={{width:52,textAlign:"center",padding:"4px 6px",fontSize:"0.88rem"}} />
                  </div>
                  <div style={{fontSize:"0.72rem",color:"var(--text3)"}}>PF {c.maxHp} CA {c.ac}</div>
                  <button onClick={()=>removeCombatant(c.id)}
                    style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",fontSize:"0.9rem"}}>✕</button>
                </div>
              ))}
            </div>

            {/* Form aggiungi nemico */}
            <div style={{background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:7,padding:"10px 12px"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom: showEnemyForm ? 10 : 0}}>
                <div style={{fontSize:"0.72rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em"}}>
                  Aggiungi nemico
                </div>
                <button className="btn btn-sm" style={{fontSize:"0.75rem"}}
                  onClick={()=>setShowEnemyForm(p=>!p)}>
                  {showEnemyForm ? "Chiudi ▲" : "+ Nemico ▼"}
                </button>
              </div>
              {showEnemyForm && (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <MonsterSearch onSelect={cfg=>setEnemyForm(p=>({
                    ...p,
                    name: cfg.name,
                    initMod: String(cfg.initMod),
                    maxHp: String(cfg.maxHp),
                    ac: String(cfg.ac),
                    legendaryActions: String(cfg.legendaryActions),
                    hasReaction: cfg.hasReaction,
                  }))} />
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}>
                    <input value={enemyForm.name} placeholder="Nome (o cerca sopra)"
                      onChange={e=>setEnemyForm(p=>({...p,name:e.target.value}))}
                      onKeyDown={e=>e.key==="Enter"&&addEnemyInSetup()} />
                    <input type="number" min={1} max={20} value={enemyForm.count}
                      onChange={e=>setEnemyForm(p=>({...p,count:e.target.value}))}
                      style={{width:46}} title="Quante creature" />
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                    <div className="field"><label>Mod. Init</label>
                      <input type="number" value={enemyForm.initMod} onChange={e=>setEnemyForm(p=>({...p,initMod:e.target.value}))} /></div>
                    <div className="field"><label>PF</label>
                      <input type="number" min={0} value={enemyForm.maxHp} onChange={e=>setEnemyForm(p=>({...p,maxHp:e.target.value}))} /></div>
                    <div className="field"><label>CA</label>
                      <input type="number" min={0} value={enemyForm.ac} onChange={e=>setEnemyForm(p=>({...p,ac:e.target.value}))} /></div>
                  </div>
                  <div style={{display:"flex",gap:10,alignItems:"center"}}>
                    <div className="field" style={{flex:1}}>
                      <label>Azioni leggendarie</label>
                      <input type="number" min={0} max={5} value={enemyForm.legendaryActions}
                        onChange={e=>setEnemyForm(p=>({...p,legendaryActions:e.target.value}))} />
                    </div>
                    <label style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.8rem",color:"var(--text2)",cursor:"pointer",paddingTop:14}}>
                      <input type="checkbox" checked={enemyForm.hasReaction}
                        onChange={e=>setEnemyForm(p=>({...p,hasReaction:e.target.checked}))} />
                      Ha reazione
                    </label>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={addEnemyInSetup}>+ Aggiungi</button>
                </div>
              )}
            </div>

            {/* Bottoni */}
            <div style={{display:"flex",gap:8,marginTop:4,paddingTop:4}}>
              <button className="btn btn-primary" style={{flex:1,padding:"10px 0",fontSize:"0.9rem"}}
                onClick={confirmSetupAndRun}>
                ⚔ Inizia combattimento
              </button>
              <button className="btn" style={{fontSize:"0.82rem"}}
                onClick={()=>setPhase("idle")}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* ════ RUNNING ════ */}
        {view==="combat" && phase==="running" && (
          <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>

            {/* round bar */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"6px 14px",background:"var(--surface2)",borderBottom:"1px solid var(--border)",
              flexShrink:0}}>
              <button className="btn btn-sm" onClick={prevTurn}>◀</button>
              <div style={{textAlign:"center"}}>
                <div style={{fontSize:"0.6rem",color:"var(--text3)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Round</div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:"var(--gold)",fontFamily:"'Cinzel',serif",lineHeight:1}}>{round}</div>
              </div>
              <div style={{flex:1,textAlign:"center",padding:"0 12px"}}>
                <div style={{fontSize:"0.6rem",color:"var(--text3)",letterSpacing:"0.1em",textTransform:"uppercase"}}>Turno di</div>
                <div style={{fontSize:"0.95rem",fontWeight:700,
                  color: combatants[currentIdx]?.kind==="enemy" ? "var(--red2)" : "var(--gold)"}}>
                  {combatants[currentIdx]?.name || "—"}
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={nextTurn}>Avanti ▶</button>
            </div>

            {/* encounter info banner */}
            {activeEncounterInfo && (activeEncounterInfo.name || activeEncounterInfo.notes) && (
              <div style={{flexShrink:0,padding:"4px 14px",background:"var(--surface2)",
                borderBottom:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:1}}>
                {activeEncounterInfo.name && (
                  <div style={{fontSize:"0.68rem",fontWeight:600,color:"var(--gold)",
                    fontFamily:"'Cinzel',serif",letterSpacing:"0.06em",textTransform:"uppercase"}}>
                    {activeEncounterInfo.name}
                  </div>
                )}
                {activeEncounterInfo.notes && (
                  <div style={{fontSize:"0.65rem",color:"var(--text3)",lineHeight:1.4}}>
                    {activeEncounterInfo.notes}
                  </div>
                )}
              </div>
            )}

            {/* quick add reinforcements */}
            <div style={{flexShrink:0}}>
              <div style={{display:"flex",justifyContent:"flex-end",
                padding:"4px 10px",borderBottom: showQuickAdd ? "1px solid var(--border)" : "none"}}>
                <button className="btn btn-sm" style={{fontSize:"0.72rem",color:"var(--text3)"}}
                  onClick={()=>setShowQuickAdd(p=>!p)}>
                  {showQuickAdd ? "▲ Chiudi" : "+ Rinforzi"}
                </button>
              </div>
              {showQuickAdd && (
                <QuickAddEnemy onAdd={addEnemyLive} onClose={()=>setShowQuickAdd(false)} />
              )}
            </div>

            {/* combatant list */}
            <div style={{flex:1,overflowY:"auto",padding:"8px 10px"}}>
              {combatants.map((c,idx) => (
                <CombatantRow key={c.id} c={c} idx={idx} currentIdx={currentIdx}
                  expanded={expandedId===c.id}
                  onExpand={()=>setExpandedId(expandedId===c.id ? null : c.id)}
                  onUpdate={patch=>updateCombatant(c.id,patch)}
                  onRemove={()=>removeCombatant(c.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ════ ENCOUNTERS ════ */}
        {view==="encounters" && !editingEncounter && (
          <EncounterList encounters={encounters}
            onLoad={loadEncounter}
            onEdit={enc=>setEditingEncounter(enc)}
            onDelete={deleteEncounter}
          />
        )}
        {view==="encounters" && editingEncounter && (
          <EncounterEditor enc={editingEncounter}
            onSave={saveEncounter}
            onCancel={()=>setEditingEncounter(null)}
          />
        )}

      </div>

      {/* ── CONFIRM MODAL ── */}
      {confirmModal && (
        <div onClick={()=>setConfirmModal(null)} style={{
          position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",zIndex:9100,
          display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
          <div onClick={e=>e.stopPropagation()} style={{
            background:"var(--surface)",border:"1px solid var(--border)",borderRadius:10,
            padding:"24px 28px",maxWidth:340,width:"100%",
            boxShadow:"0 8px 32px rgba(0,0,0,0.5)",textAlign:"center"}}>
            <div style={{fontSize:"1.5rem",marginBottom:12}}>⚔</div>
            <div style={{fontSize:"0.95rem",color:"var(--text)",marginBottom:20,lineHeight:1.5}}>
              {confirmModal.message}
            </div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <button className="btn btn-danger" style={{minWidth:100,fontSize:"0.88rem"}}
                onClick={confirmModal.onConfirm}>
                Conferma
              </button>
              <button className="btn" style={{minWidth:100,fontSize:"0.88rem"}}
                onClick={()=>setConfirmModal(null)}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── CombatantRow ─────────────────────────────────────────────────────────────
function CombatantRow({ c, idx, currentIdx, expanded, onExpand, onUpdate, onRemove }) {
  const isActive = idx === currentIdx;
  const [hpDelta, setHpDelta] = React.useState("");
  const [showCondPicker, setShowCondPicker] = React.useState(false);
  const [newEffect, setNewEffect]   = React.useState({label:"",rounds:"",onStart:true});
  const [showEffectForm, setShowEffectForm] = React.useState(false);
  const [condTooltip, setCondTooltip] = React.useState(null);

  function applyHpDelta(sign) {
    const val = parseInt(hpDelta);
    if (isNaN(val) || val <= 0) return;
    const next = Math.max(0, c.currentHp + sign * val);
    onUpdate({ currentHp: next, dead: next === 0 ? c.dead : false });
    setHpDelta("");
  }

  function toggleCondition(cond) {
    const has = c.conditions.includes(cond);
    onUpdate({ conditions: has ? c.conditions.filter(x=>x!==cond) : [...c.conditions, cond] });
  }

  function addEffect() {
    if (!newEffect.label.trim() || !newEffect.rounds) return;
    const eff = { id: newId(), label: newEffect.label.trim(),
      roundsLeft: parseInt(newEffect.rounds), onStart: newEffect.onStart };
    onUpdate({ effects: [...c.effects, eff] });
    setNewEffect({label:"",rounds:"",onStart:true});
    setShowEffectForm(false);
  }

  function removeEffect(id) {
    onUpdate({ effects: c.effects.filter(e => e.id !== id) });
  }

  const hpPct = c.maxHp > 0 ? Math.max(0, Math.min(1, c.currentHp / c.maxHp)) : null;
  const hpColor = hpPct === null ? "var(--border2)"
    : hpPct > 0.5 ? "#27ae60" : hpPct > 0.25 ? "#f39c12" : "#c0392b";

  return (
    <div style={{
      borderRadius:8, marginBottom:6, overflow:"hidden",
      border: isActive ? "2px solid var(--gold)" : "1px solid var(--border)",
      background: isActive ? "rgba(180,140,50,0.06)" : "var(--surface2)",
      opacity: c.dead ? 0.45 : 1,
    }}>
      {/* ── MAIN ROW ── */}
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer"}}
        onClick={onExpand}>
        {/* initiative badge */}
        <div style={{width:32,textAlign:"center",flexShrink:0}}>
          <div style={{fontSize:"1rem",fontWeight:700,color:"var(--gold)",fontFamily:"'Cinzel',serif",lineHeight:1}}>
            {c.initiative ?? "?"}
          </div>
          <div style={{fontSize:"0.55rem",color:"var(--text3)"}}>INIT</div>
        </div>

        {/* name + conditions */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            <span style={{fontWeight:700,fontSize:"0.92rem",
              color: c.kind==="enemy" ? "var(--red2)" : "var(--text)"}}>
              {c.name}
            </span>
            {c.concentration &&
              <span style={{fontSize:"0.68rem",background:"rgba(22,160,133,0.2)",
                color:"#1abc9c",border:"1px solid #1abc9c",borderRadius:4,padding:"1px 5px"}}>
                🔮 {c.concentration}
              </span>}
            {c.dead &&
              <span style={{fontSize:"0.68rem",color:"var(--text3)"}}>💀 KO</span>}
          </div>
          {c.subname && <div style={{fontSize:"0.7rem",color:"var(--text3)"}}>{c.subname}</div>}
          {/* condition badges */}
          {c.conditions.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}}>
              {c.conditions.map(cond => (
                <span key={cond}
                  style={{fontSize:"0.68rem",padding:"1px 6px",borderRadius:8,fontWeight:600,
                    background: COND_META[cond]?.color || "#555", color:"#fff",cursor:"pointer"}}
                  onClick={e=>{e.stopPropagation();toggleCondition(cond);}}>
                  {cond} ✕
                </span>
              ))}
            </div>
          )}
          {/* effect badges */}
          {c.effects.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:3}}>
              {c.effects.map(eff => (
                <span key={eff.id}
                  style={{fontSize:"0.68rem",padding:"1px 6px",borderRadius:8,fontWeight:600,
                    background:"rgba(41,128,185,0.25)",color:"#5dade2",
                    border:"1px solid #2980b9",cursor:"pointer"}}
                  onClick={e=>{e.stopPropagation();removeEffect(eff.id);}}>
                  ⏱ {eff.label} {eff.roundsLeft}r ✕
                </span>
              ))}
            </div>
          )}
        </div>

        {/* CA */}
        {c.ac > 0 && (
          <div style={{textAlign:"center",flexShrink:0}}>
            <div style={{fontSize:"0.88rem",fontWeight:700,fontFamily:"'Cinzel',serif"}}>{c.ac}</div>
            <div style={{fontSize:"0.55rem",color:"var(--text3)"}}>CA</div>
          </div>
        )}

        {/* HP bar + value */}
        {c.maxHp > 0 && (
          <div style={{flexShrink:0,width:56,textAlign:"center"}}>
            <div style={{fontSize:"0.88rem",fontWeight:700,color:hpColor,fontFamily:"'Cinzel',serif"}}>
              {c.currentHp}<span style={{fontSize:"0.6rem",color:"var(--text3)"}}>/{c.maxHp}</span>
            </div>
            <div style={{height:4,borderRadius:2,background:"var(--border)",marginTop:2,overflow:"hidden"}}>
              <div style={{width:`${hpPct*100}%`,height:"100%",background:hpColor,transition:"width 0.3s"}} />
            </div>
          </div>
        )}

        {/* expand chevron */}
        <div style={{color:"var(--text3)",fontSize:"0.75rem",flexShrink:0}}>
          {expanded ? "▲" : "▼"}
        </div>
      </div>

      {/* ── EXPANDED PANEL ── */}
      {expanded && (
        <div style={{borderTop:"1px solid var(--border)",padding:"10px 12px",
          display:"flex",flexDirection:"column",gap:10}}>

          {/* HP controls */}
          {c.maxHp > 0 && (
            <div>
              <div style={{fontSize:"0.68rem",color:"var(--text3)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.08em"}}>Punti Ferita</div>
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
                <button className="btn btn-danger btn-sm" style={{fontWeight:700,fontSize:"0.9rem",width:32}}
                  onClick={()=>applyHpDelta(-1)}>−</button>
                <input type="number" min={0} value={hpDelta}
                  onChange={e=>setHpDelta(e.target.value)}
                  placeholder="val" style={{width:52,textAlign:"center",fontSize:"0.9rem",padding:"4px 6px"}} />
                <button className="btn btn-sm" style={{fontWeight:700,fontSize:"0.9rem",width:32,color:"var(--green2)"}}
                  onClick={()=>applyHpDelta(1)}>+</button>
                <input type="number" min={0} max={c.maxHp}
                  value={c.currentHp}
                  onChange={e=>onUpdate({currentHp:Math.max(0,parseInt(e.target.value)||0)})}
                  style={{width:52,textAlign:"center",fontSize:"0.88rem",padding:"4px 6px",color:"var(--red2)",fontWeight:700}} />
                <span style={{fontSize:"0.75rem",color:"var(--text3)"}}>/ {c.maxHp}</span>
                <button className="btn btn-sm" style={{marginLeft:"auto",color:"var(--text3)",fontSize:"0.75rem"}}
                  onClick={()=>onUpdate({dead:!c.dead})}>
                  {c.dead ? "↺ Riporta in vita" : "💀 KO"}
                </button>
              </div>
            </div>
          )}

          {/* Condizioni */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
              <div style={{fontSize:"0.68rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Condizioni</div>
              <button className="btn btn-sm" style={{fontSize:"0.72rem"}}
                onClick={()=>setShowCondPicker(p=>!p)}>
                {showCondPicker ? "Chiudi ▲" : "+ Aggiungi ▼"}
              </button>
            </div>
            {showCondPicker && (
              <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:6}}>
                {CONDITIONS.map(cond => {
                  const active = c.conditions.includes(cond);
                  return (
                    <span key={cond}
                      style={{fontSize:"0.75rem",padding:"3px 8px",borderRadius:8,fontWeight:600,
                        cursor:"pointer",transition:"all 0.12s",
                        background: active ? COND_META[cond]?.color : "var(--surface)",
                        color: active ? "#fff" : "var(--text2)",
                        border:`1px solid ${COND_META[cond]?.color || "var(--border)"}`}}
                      onClick={()=>toggleCondition(cond)}
                      onMouseEnter={()=>setCondTooltip(cond)}
                      onMouseLeave={()=>setCondTooltip(null)}>
                      {cond}
                    </span>
                  );
                })}
              </div>
            )}
            {condTooltip && COND_META[condTooltip] && (
              <div style={{fontSize:"0.75rem",color:"var(--text2)",
                background:"var(--surface)",border:"1px solid var(--border)",
                borderRadius:5,padding:"5px 8px",marginBottom:4}}>
                <strong style={{color:COND_META[condTooltip].color}}>{condTooltip}:</strong> {COND_META[condTooltip].short}
              </div>
            )}
          </div>

          {/* Effetti temporanei */}
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
              <div style={{fontSize:"0.68rem",color:"var(--text3)",textTransform:"uppercase",letterSpacing:"0.08em"}}>Effetti & Concentrazione</div>
              <button className="btn btn-sm" style={{fontSize:"0.72rem"}}
                onClick={()=>setShowEffectForm(p=>!p)}>
                {showEffectForm ? "Chiudi ▲" : "+ Effetto ▼"}
              </button>
            </div>
            {/* concentrazione */}
            <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6}}>
              <span style={{fontSize:"0.75rem",color:"var(--text3)",flexShrink:0}}>🔮 Conc.:</span>
              <input value={c.concentration||""} placeholder="nome incantesimo..."
                onChange={e=>onUpdate({concentration:e.target.value||null})}
                style={{flex:1,padding:"4px 8px",fontSize:"0.8rem",
                  background:"var(--surface)",border:"1px solid var(--border)",borderRadius:4,
                  color:"var(--text)",outline:"none"}} />
            </div>
            {showEffectForm && (
              <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",
                background:"var(--surface)",border:"1px solid var(--border)",
                borderRadius:6,padding:"8px 10px",marginBottom:6}}>
                <input value={newEffect.label} placeholder="Nome effetto"
                  onChange={e=>setNewEffect(p=>({...p,label:e.target.value}))}
                  style={{flex:"1 1 100px",padding:"4px 8px",fontSize:"0.8rem",
                    background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:4,color:"var(--text)",outline:"none"}} />
                <input type="number" min={1} max={100} value={newEffect.rounds}
                  placeholder="round"
                  onChange={e=>setNewEffect(p=>({...p,rounds:e.target.value}))}
                  style={{width:52,padding:"4px 6px",fontSize:"0.8rem",textAlign:"center",
                    background:"var(--surface2)",border:"1px solid var(--border)",
                    borderRadius:4,color:"var(--text)",outline:"none"}} />
                <select value={newEffect.onStart?"start":"end"}
                  onChange={e=>setNewEffect(p=>({...p,onStart:e.target.value==="start"}))}
                  style={{padding:"4px 6px",fontSize:"0.75rem",background:"var(--surface2)",
                    border:"1px solid var(--border)",borderRadius:4,color:"var(--text)"}}>
                  <option value="start">Inizio turno bersaglio</option>
                  <option value="end">Fine turno caster</option>
                </select>
                <button className="btn btn-primary btn-sm" onClick={addEffect}>+ Aggiungi</button>
              </div>
            )}
          </div>

          {/* Leggendarie + Reazione (solo nemici) */}
          {c.kind==="enemy" && (c.legendaryActions > 0 || c.hasReaction) && (
            <div>
              <div style={{fontSize:"0.68rem",color:"var(--text3)",textTransform:"uppercase",
                letterSpacing:"0.08em",marginBottom:6}}>Azioni Speciali</div>
              <div style={{display:"flex",gap:10,flexWrap:"wrap"}}>
                {c.legendaryActions > 0 && (
                  <div style={{display:"flex",alignItems:"center",gap:6,
                    background:"var(--surface)",border:"1px solid var(--border)",
                    borderRadius:6,padding:"5px 10px"}}>
                    <span style={{fontSize:"0.78rem",color:"var(--gold)"}}>⭐ Leggendarie</span>
                    {Array.from({length:c.legendaryActions}).map((_,i) => (
                      <div key={i}
                        onClick={()=>{
                          const used = i < c.legendaryUsed ? i : i+1;
                          onUpdate({legendaryUsed: i < c.legendaryUsed ? i : Math.min(c.legendaryActions, c.legendaryUsed+1)});
                        }}
                        style={{width:16,height:16,borderRadius:"50%",cursor:"pointer",
                          background: i < c.legendaryUsed ? "var(--text3)" : "var(--gold)",
                          border:"2px solid var(--gold)",transition:"all 0.15s"}} />
                    ))}
                    <button className="btn btn-sm" style={{fontSize:"0.68rem",marginLeft:4}}
                      onClick={()=>onUpdate({legendaryUsed:0})}>↺</button>
                  </div>
                )}
                {c.hasReaction && (
                  <div style={{display:"flex",alignItems:"center",gap:6,
                    background:"var(--surface)",border:"1px solid var(--border)",
                    borderRadius:6,padding:"5px 10px",cursor:"pointer"}}
                    onClick={()=>onUpdate({reactionUsed:!c.reactionUsed})}>
                    <span style={{fontSize:"0.78rem",color: c.reactionUsed ? "var(--text3)" : "var(--text2)"}}>
                      {c.reactionUsed ? "🔘" : "⚡"} Reazione
                    </span>
                    <span style={{fontSize:"0.7rem",color:"var(--text3)"}}>
                      {c.reactionUsed ? "usata" : "disponibile"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Nota libera */}
          <div>
            <div style={{fontSize:"0.68rem",color:"var(--text3)",textTransform:"uppercase",
              letterSpacing:"0.08em",marginBottom:4}}>Note</div>
            <textarea value={c.note||""} rows={2}
              onChange={e=>onUpdate({note:e.target.value})}
              placeholder="Note libere (es. ha usato Action Surge, sta sanguinando...)"
              style={{width:"100%",boxSizing:"border-box",resize:"vertical",
                background:"var(--surface)",border:"1px solid var(--border)",
                borderRadius:5,color:"var(--text)",fontSize:"0.8rem",
                padding:"6px 8px",outline:"none",fontFamily:"inherit"}} />
          </div>

          {/* Rimuovi */}
          <button className="btn btn-danger btn-sm" style={{alignSelf:"flex-end",fontSize:"0.75rem"}}
            onClick={onRemove}>
            Rimuovi dal combattimento
          </button>
        </div>
      )}
    </div>
  );
}

// ─── EncounterList ─────────────────────────────────────────────────────────────
function EncounterList({ encounters, onLoad, onEdit, onDelete }) {
  if (encounters.length === 0) return (
    <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",gap:12,color:"var(--text3)"}}>
      <div style={{fontSize:"2rem"}}>📋</div>
      <div style={{fontSize:"0.9rem"}}>Nessuno scontro salvato.</div>
      <div style={{fontSize:"0.8rem"}}>Crea il primo con il pulsante + in alto.</div>
    </div>
  );
  return (
    <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:8}}>
      {encounters.map(enc => (
        <div key={enc.id} style={{background:"var(--surface2)",border:"1px solid var(--border)",
          borderRadius:8,padding:"12px 14px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:"0.95rem",color:"var(--text)",marginBottom:2}}>{enc.name}</div>
              {enc.notes && <div style={{fontSize:"0.78rem",color:"var(--text2)",marginBottom:6}}>{enc.notes}</div>}
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {(enc.enemies||[]).map((e,i) => (
                  <span key={i} style={{fontSize:"0.72rem",padding:"2px 7px",borderRadius:8,
                    background:"rgba(192,57,43,0.15)",color:"var(--red2)",border:"1px solid var(--red2)"}}>
                    {e.name}
                  </span>
                ))}
              </div>
            </div>
            <div style={{display:"flex",gap:6,flexShrink:0}}>
              <button className="btn btn-primary btn-sm" style={{fontSize:"0.75rem"}}
                onClick={()=>onLoad(enc)}>▶ Carica</button>
              <button className="btn btn-sm" style={{fontSize:"0.75rem"}}
                onClick={()=>onEdit(enc)}>✏</button>
              <button className="btn btn-sm btn-danger" style={{fontSize:"0.75rem"}}
                onClick={()=>onDelete(enc.id)}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── EncounterEditor ───────────────────────────────────────────────────────────
function EncounterEditor({ enc, onSave, onCancel }) {
  const [name, setName]     = React.useState(enc.name||"");
  const [notes, setNotes]   = React.useState(enc.notes||"");
  const [enemies, setEnemies] = React.useState(enc.enemies||[]);
  const [form, setForm]     = React.useState({name:"",count:1,initMod:0,maxHp:"",ac:"",legendaryActions:0,hasReaction:true});

  function addEnemy() {
    if (!form.name.trim()) return;
    const base = {
      name: form.name.trim(), initMod: +form.initMod,
      maxHp: form.maxHp ? +form.maxHp : 0,
      ac: form.ac ? +form.ac : 10,
      legendaryActions: +form.legendaryActions,
      hasReaction: form.hasReaction,
      groupId: newId(),
    };
    const rows = Array.from({length: +form.count||1}, (_,i) => ({
      ...base,
      name: form.count > 1 ? `${base.name} ${i+1}` : base.name,
    }));
    setEnemies(p => [...p, ...rows]);
    setForm({name:"",count:1,initMod:0,maxHp:"",ac:"",legendaryActions:0,hasReaction:true});
  }

  return (
    <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:14}}>
      <div className="field">
        <label>Nome scontro</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Es. Imboscata al mercato" />
      </div>
      <div className="field">
        <label>Note (tattiche, ambiente...)</label>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={2}
          style={{resize:"vertical",padding:"6px 8px",background:"var(--surface2)",
            border:"1px solid var(--border)",borderRadius:5,color:"var(--text)",
            fontSize:"0.85rem",fontFamily:"inherit",outline:"none",width:"100%",boxSizing:"border-box"}} />
      </div>

      {/* nemici salvati */}
      {enemies.length > 0 && (
        <div>
          <div style={{fontSize:"0.72rem",color:"var(--text3)",textTransform:"uppercase",
            letterSpacing:"0.08em",marginBottom:6}}>Nemici</div>
          {enemies.map((e,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",
              borderRadius:6,marginBottom:3,background:"var(--surface2)",border:"1px solid var(--border)"}}>
              <span style={{flex:1,fontSize:"0.85rem",color:"var(--red2)",fontWeight:600}}>{e.name}</span>
              <span style={{fontSize:"0.72rem",color:"var(--text3)"}}>PF {e.maxHp} CA {e.ac}</span>
              {e.legendaryActions>0 && <span style={{fontSize:"0.68rem",color:"var(--gold)"}}>⭐ ×{e.legendaryActions}</span>}
              <button onClick={()=>setEnemies(p=>p.filter((_,j)=>j!==i))}
                style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer"}}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* form aggiungi nemico */}
      <div style={{background:"var(--surface2)",border:"1px solid var(--border)",
        borderRadius:7,padding:"10px 12px"}}>
        <div style={{fontSize:"0.72rem",color:"var(--text3)",textTransform:"uppercase",
          letterSpacing:"0.08em",marginBottom:8}}>Aggiungi nemico</div>
        <MonsterSearch onSelect={cfg=>setForm(p=>({
          ...p,
          name: cfg.name,
          initMod: String(cfg.initMod),
          maxHp: String(cfg.maxHp),
          ac: String(cfg.ac),
          legendaryActions: String(cfg.legendaryActions),
          hasReaction: cfg.hasReaction,
        }))} />
        <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8,marginBottom:8}}>
          <input value={form.name} placeholder="Nome (o cerca sopra)"
            onChange={e=>setForm(p=>({...p,name:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&addEnemy()} />
          <input type="number" min={1} max={20} value={form.count}
            onChange={e=>setForm(p=>({...p,count:e.target.value}))}
            style={{width:46}} title="Quante creature" />
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:8}}>
          <div className="field"><label>Mod. Init</label>
            <input type="number" value={form.initMod} onChange={e=>setForm(p=>({...p,initMod:e.target.value}))} /></div>
          <div className="field"><label>PF</label>
            <input type="number" min={0} value={form.maxHp} onChange={e=>setForm(p=>({...p,maxHp:e.target.value}))} /></div>
          <div className="field"><label>CA</label>
            <input type="number" min={0} value={form.ac} onChange={e=>setForm(p=>({...p,ac:e.target.value}))} /></div>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:8}}>
          <div className="field" style={{flex:1}}>
            <label>Azioni leggendarie</label>
            <input type="number" min={0} max={5} value={form.legendaryActions}
              onChange={e=>setForm(p=>({...p,legendaryActions:e.target.value}))} />
          </div>
          <label style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.8rem",color:"var(--text2)",cursor:"pointer"}}>
            <input type="checkbox" checked={form.hasReaction}
              onChange={e=>setForm(p=>({...p,hasReaction:e.target.checked}))} />
            Ha reazione
          </label>
        </div>
        <button className="btn btn-primary btn-sm" onClick={addEnemy}>+ Aggiungi nemico</button>
      </div>

      <div style={{display:"flex",gap:8,marginTop:"auto",paddingTop:8}}>
        <button className="btn btn-primary" style={{flex:1}}
          onClick={()=>onSave({...enc,id:enc.id,name,notes,enemies})}>
          💾 Salva scontro
        </button>
        <button className="btn" onClick={onCancel}>Annulla</button>
      </div>
    </div>
  );
}











// ─── EncounterGenerator ───────────────────────────────────────────────────────
const XP_BY_CR = {
  "0":10,"1/8":25,"1/4":50,"1/2":100,"1":200,"2":450,"3":700,"4":1100,
  "5":1800,"6":2300,"7":2900,"8":3900,"9":5000,"10":5900,"11":7200,
  "12":8400,"13":10000,"14":11500,"15":13000,"16":15000,"17":18000,
  "18":20000,"19":22000,"20":25000,"21":33000,"22":41000,"23":50000,
  "24":62000,"25":75000,"26":90000,"27":105000,"28":120000,"29":135000,"30":155000,
};
const XP_THRESHOLDS = {
  1:[25,50,75,100],2:[50,100,150,200],3:[75,150,225,400],4:[125,250,375,500],
  5:[250,500,750,1100],6:[300,600,900,1400],7:[350,750,1100,1700],8:[450,900,1400,2100],
  9:[550,1100,1600,2400],10:[600,1200,1900,2800],11:[800,1600,2400,3600],
  12:[1000,2000,3000,4500],13:[1100,2200,3400,5100],14:[1250,2500,3800,5700],
  15:[1400,2800,4300,6400],16:[1600,3200,4800,7200],17:[2000,3900,5900,8800],
  18:[2100,4200,6300,9500],19:[2400,4900,7300,10900],20:[2800,5700,8500,12700],
};
const MULTI_MONSTER_MULT = [
  [1,1],[2,1.5],[3,2],[7,2.5],[11,3],[15,4],
];
const TERRAIN_TYPES = [
  "Qualsiasi","Dungeon","Foresta","Pianura","Montagna","Palude","Grotta","Mare / Costa",
  "Città","Sottosuolo","Deserto","Tundra","Piano Infernale",
];
// Filtri terreno e affinità tematiche: vedi src/encounter.js (terrainAllows,
// coherentWith) — gestiscono tipi italiani inline ED inglesi importati.

function crToNum(cr) {
  if (!cr) return 0;
  if (cr==="1/8") return 0.125;
  if (cr==="1/4") return 0.25;
  if (cr==="1/2") return 0.5;
  return parseFloat(cr)||0;
}
function numToCr(n) {
  if (n<=0) return "0";
  if (n<=0.125) return "1/8";
  if (n<=0.25)  return "1/4";
  if (n<=0.5)   return "1/2";
  return String(Math.round(n));
}
function getMultiplier(count) {
  for (let i=MULTI_MONSTER_MULT.length-1;i>=0;i--) {
    if (count>=MULTI_MONSTER_MULT[i][0]) return MULTI_MONSTER_MULT[i][1];
  }
  return 1;
}
function getDifficulty(adjustedXP, partyLevel, partySize) {
  const thresh = XP_THRESHOLDS[Math.min(Math.max(partyLevel,1),20)] || XP_THRESHOLDS[1];
  const [easy,med,hard,deadly] = thresh.map(t=>t*partySize);
  if (adjustedXP<easy)   return {label:"Banale",   color:"#888", raw:adjustedXP};
  if (adjustedXP<med)    return {label:"Facile",   color:"#4caf50", raw:adjustedXP};
  if (adjustedXP<hard)   return {label:"Medio",    color:"#ff9800", raw:adjustedXP};
  if (adjustedXP<deadly) return {label:"Difficile",color:"#f44336", raw:adjustedXP};
  return                        {label:"Letale",   color:"#9c27b0", raw:adjustedXP};
}

function EncounterGeneratorPage({ onSendToTracker }) {
  const [partySize,  setPartySize]  = React.useState(4);
  const [partyLevel, setPartyLevel] = React.useState(5);
  const [terrain,    setTerrain]    = React.useState("Qualsiasi");
  const [target,     setTarget]     = React.useState("Medio"); // Facile/Medio/Difficile/Letale
  const [generated,  setGenerated]  = React.useState(null);
  const [encName,    setEncName]    = React.useState("");
  const [saved,      setSaved]      = React.useState(false);

  const allMonsters = React.useMemo(()=>{
    const imported = (()=>{ try{return JSON.parse(localStorage.getItem(userKey(MONSTERS_STORAGE_KEY))||"[]");}catch{return[];} })();
    return [...MONSTERS_DB, ...imported];
  },[]);

  function getXpBudget() {
    const thresh = XP_THRESHOLDS[Math.min(Math.max(partyLevel,1),20)] || XP_THRESHOLDS[1];
    const idx = {Facile:0,Medio:1,Difficile:2,Letale:3}[target]??1;
    return thresh[idx] * partySize;
  }

  function candidateMonsters() {
    const maxCr = partyLevel + 3;
    const minCr = Math.max(0, partyLevel - 5);
    return allMonsters.filter(m => {
      const cr = crToNum(m.cr);
      if (cr > maxCr || cr < minCr) return false;
      if (!terrainAllows(terrain, m.type)) return false;
      return true;
    });
  }

  function generate() {
    const budget = getXpBudget();
    const pool   = candidateMonsters();
    if (pool.length === 0) { setGenerated({error:"Nessun mostro adatto per questo livello/terreno. Prova ad importare più mostri da 5etools."}); return; }

    let bestResult = null;
    let bestDiff   = Infinity;

    for (let attempt=0; attempt<200; attempt++) {
      // Coerenza tematica: si sceglie un mostro "àncora" e si completa il
      // gruppo solo con tipi affini (goblin+lupi sì, fantasma+lupi no).
      const anchor = pool[Math.floor(Math.random()*pool.length)];
      const compatible = pool.filter(m => m !== anchor && coherentWith(anchor.type, m.type));
      const numExtra = Math.floor(Math.random()*Math.min(2, compatible.length + 1)); // 0–2 tipi oltre l'àncora
      const shuffled = [
        anchor,
        ...[...compatible].sort(()=>Math.random()-0.5).slice(0, numExtra),
      ];
      let groups = [];
      let totalRawXP = 0;
      let totalCount = 0;

      for (const monster of shuffled) {
        const xp = XP_BY_CR[monster.cr] || 0;
        if (xp===0) continue;
        // how many of this monster fit roughly in remaining budget fraction
        const remaining = budget - totalRawXP;
        if (remaining <= 0) break;
        const maxCount = Math.max(1, Math.floor(remaining / xp));
        const count    = Math.max(1, Math.min(maxCount, 1+Math.floor(Math.random()*4)));
        groups.push({monster, count, xpEach:xp});
        totalRawXP += xp * count;
        totalCount += count;
      }

      if (groups.length===0) continue;
      const mult        = getMultiplier(totalCount);
      const adjustedXP  = Math.round(totalRawXP * mult);
      const diff        = Math.abs(adjustedXP - budget);

      if (diff < bestDiff) {
        bestDiff   = diff;
        bestResult = {groups, totalRawXP, adjustedXP, totalCount, mult};
      }
    }

    if (!bestResult) { setGenerated({error:"Generazione fallita. Riprova."}); return; }

    const difficulty = getDifficulty(bestResult.adjustedXP, partyLevel, partySize);
    setGenerated({...bestResult, difficulty});
    setEncName("Scontro generato");
    setSaved(false);
  }

  function saveToEncounters() {
    if (!generated || generated.error) return;
    const enemies = generated.groups.map(g=>({
      name: g.monster.name,
      count: g.count,
      initMod: Math.floor(((g.monster.dex||10)-10)/2),
      maxHp: g.monster.hp || 10,
      ac: g.monster.ac || 10,
      legendaryActions: g.monster.legendaryActions?.length ? 3 : 0,
      hasReaction: true,
    }));
    const enc = { id: newId(), name: encName||"Scontro generato", notes:`Generato per gruppo di ${partySize} PG lv.${partyLevel} • ${terrain} • ${generated.difficulty.label} • XP: ${generated.adjustedXP}`, enemies };
    const key = userKey("dnd_encounters_v2");
    const existing = (()=>{ try{return JSON.parse(localStorage.getItem(key)||"[]");}catch{return[];} })();
    safeLsSet(key, JSON.stringify([...existing, enc]));
    setSaved(true);
    if (onSendToTracker) onSendToTracker(enc);
  }

  const thresh = XP_THRESHOLDS[Math.min(Math.max(partyLevel,1),20)] || XP_THRESHOLDS[1];
  const budgetLabels = [
    {label:"Facile",   xp: thresh[0]*partySize, color:"#4caf50"},
    {label:"Medio",    xp: thresh[1]*partySize, color:"#ff9800"},
    {label:"Difficile",xp: thresh[2]*partySize, color:"#f44336"},
    {label:"Letale",   xp: thresh[3]*partySize, color:"#9c27b0"},
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* ── Pannello configurazione ── */}
      <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",flexShrink:0,
        display:"flex",flexDirection:"column",gap:10}}>

        {/* riga 1: gruppo */}
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:"0.75rem",color:"var(--text3)",whiteSpace:"nowrap"}}>Giocatori</span>
            <div style={{display:"flex",gap:4}}>
              {[2,3,4,5,6].map(n=>(
                <button key={n} className={`btn btn-sm ${partySize===n?"btn-primary":""}`}
                  style={{minWidth:32,padding:"4px 8px",fontSize:"0.82rem"}}
                  onClick={()=>setPartySize(n)}>{n}</button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:"0.75rem",color:"var(--text3)",whiteSpace:"nowrap"}}>Livello</span>
            <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20].map(n=>(
                <button key={n} className={`btn btn-sm ${partyLevel===n?"btn-primary":""}`}
                  style={{minWidth:28,padding:"3px 6px",fontSize:"0.75rem"}}
                  onClick={()=>setPartyLevel(n)}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        {/* riga 2: difficoltà + terreno */}
        <div style={{display:"flex",gap:12,flexWrap:"wrap",alignItems:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:"0.75rem",color:"var(--text3)"}}>Difficoltà</span>
            <div style={{display:"flex",gap:4}}>
              {budgetLabels.map(({label,xp,color})=>(
                <button key={label} className={`btn btn-sm ${target===label?"btn-primary":""}`}
                  style={{fontSize:"0.78rem",padding:"4px 10px",
                    ...(target===label?{}:{borderColor:color,color:color})}}
                  onClick={()=>setTarget(label)}>
                  {label} <span style={{fontSize:"0.65rem",opacity:0.7}}>({xp.toLocaleString()} XP)</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:"0.75rem",color:"var(--text3)"}}>Terreno</span>
            <select value={terrain} onChange={e=>setTerrain(e.target.value)} style={{fontSize:"0.82rem"}}>
              {TERRAIN_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" style={{marginLeft:"auto",fontSize:"0.88rem",padding:"8px 20px"}}
            onClick={generate}>
            🎲 Genera
          </button>
        </div>
      </div>

      {/* ── Risultato ── */}
      <div style={{flex:1,overflowY:"auto",padding:"14px"}}>
        {!generated && (
          <div style={{textAlign:"center",color:"var(--text3)",fontSize:"0.85rem",marginTop:40}}>
            Configura il gruppo e clicca Genera
          </div>
        )}
        {generated?.error && (
          <div style={{color:"var(--red2)",fontSize:"0.85rem",padding:12,
            background:"var(--surface2)",borderRadius:8}}>{generated.error}</div>
        )}
        {generated && !generated.error && (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>

            {/* intestazione difficoltà */}
            <div style={{display:"flex",alignItems:"center",gap:12,
              background:"var(--surface2)",borderRadius:10,padding:"10px 14px"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.68rem",color:"var(--text3)",textTransform:"uppercase",
                  letterSpacing:"0.08em",marginBottom:2}}>Difficoltà stimata</div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:generated.difficulty.color,
                  fontFamily:"'Cinzel',serif"}}>{generated.difficulty.label}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"0.68rem",color:"var(--text3)",marginBottom:2}}>XP aggiustato</div>
                <div style={{fontSize:"1.1rem",fontWeight:700,color:"var(--gold)"}}>
                  {generated.adjustedXP.toLocaleString()}
                </div>
                <div style={{fontSize:"0.68rem",color:"var(--text3)"}}>
                  raw {generated.totalRawXP.toLocaleString()} × {generated.mult}
                </div>
              </div>
            </div>

            {/* lista mostri */}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {generated.groups.map((g,i)=>(
                <div key={i} style={{background:"var(--surface2)",border:"1px solid var(--border)",
                  borderRadius:8,padding:"10px 14px",display:"flex",justifyContent:"space-between",
                  alignItems:"center",gap:8}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:"0.9rem",color:"var(--text)",
                      fontFamily:"'Cinzel',serif"}}>{g.monster.name}</div>
                    <div style={{fontSize:"0.72rem",color:"var(--text3)",marginTop:2}}>
                      CR {g.monster.cr} • {g.monster.type} • CA {g.monster.ac} • {g.monster.hp} PF
                    </div>
                  </div>
                  <div style={{textAlign:"right",flexShrink:0}}>
                    <div style={{fontSize:"1.2rem",fontWeight:700,color:"var(--gold)"}}>×{g.count}</div>
                    <div style={{fontSize:"0.68rem",color:"var(--text3)"}}>
                      {(g.xpEach*g.count).toLocaleString()} XP
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* azioni */}
            <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",
              borderTop:"1px solid var(--border)",paddingTop:12}}>
              <input value={encName} onChange={e=>setEncName(e.target.value)}
                placeholder="Nome scontro..."
                style={{flex:1,minWidth:160,fontSize:"0.85rem"}} />
              <button className="btn" style={{fontSize:"0.82rem"}} onClick={generate}>
                🎲 Rigenera
              </button>
              <button className="btn btn-primary" style={{fontSize:"0.82rem"}}
                onClick={saveToEncounters} disabled={saved}>
                {saved ? "✓ Salvato!" : "💾 Salva negli Scontri"}
              </button>
            </div>

            {saved && (
              <div style={{fontSize:"0.78rem",color:"var(--gold)",textAlign:"center"}}>
                Scontro aggiunto — trovi lo scontro in ⚔ Combattimento → 📋 Scontri Salvati
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}




// Costruisce l'indice per la ricerca globale (palette ⌘K). Unisce i DB inline
// (IT, con slug EN) e gli importati (EN); il ponte EN↔IT è gratuito perché lo
// slug 5e.tools è in inglese (es. "Palla di Fuoco" → slug "fireball").
function buildSearchEntries(importedSpells) {
  const entries = [];
  const push = (type, id, title, en, sub, data, extra = "") => {
    entries.push({
      type, id: `${type}:${id}`, title, en, sub, data,
      _hay: searchNorm([title, en, sub, extra].join(" ")),
    });
  };

  // Incantesimi: inline (IT) + importati (EN), dedup per slug (inline vince)
  const spellMap = new Map();
  for (const s of [...SPELLS_DB, ...(importedSpells || [])]) {
    const k = s.slug || s.name;
    if (!spellMap.has(k)) spellMap.set(k, s);
  }
  for (const s of spellMap.values()) {
    const lvl = s.level === 0 ? "Trucchetto" : `Liv. ${s.level}`;
    push("spell", s.slug || s.name, s.name, deSlug(s.slug), `${lvl}${s.school ? " · " + s.school : ""}`, s, s.desc);
  }

  // Mostri: inline + custom/importati per-utente
  let customMonsters = [];
  try { customMonsters = JSON.parse(localStorage.getItem(userKey("dnd_custom_monsters_v1")) || "[]"); } catch {}
  const monMap = new Map();
  for (const m of [...MONSTERS_DB, ...customMonsters]) {
    const k = m.slug || m.name;
    if (!monMap.has(k)) monMap.set(k, m);
  }
  for (const m of monMap.values()) {
    push("monster", m.slug || m.name, m.name, deSlug(m.slug), `GS ${m.cr}${m.type ? " · " + m.type : ""}`, m, m.languages);
  }

  // Oggetti magici
  for (const it of MAGIC_ITEMS_DB) {
    push("magic", it.slug || it.name, it.name, deSlug(it.slug), [it.category, it.rarity].filter(Boolean).join(" · "), it, it.notes);
  }

  // Oggetti del tab Prezzi (PHB curato IT/EN + ampliamento 5e.tools EN)
  for (const it of [...SHOP_DB.items, ...shopExtra]) {
    const costo = it.costo_mo > 0 ? `${it.costo_mo} mo` : it.costo_ma > 0 ? `${it.costo_ma} ma` : "—";
    push("item", it.id, it.nome, it.en || "", costo, it, it.note);
  }

  // Registro Campagna (PNG/luoghi/fazioni importati dalla wiki + voci manuali)
  for (const e of loadCampaign()) {
    const sub = e.fields?.ruolo || e.fields?.categoria || e.tipo;
    const extra = [e.summary, ...(e.tags || []), ...Object.values(e.fields || {}).flat(),
      ...(e.sections || []).map(s => s.text)].join(" ");
    push(e.kind, `${e.kind}-${e.nome}`, e.nome, (e.alias || []).join(", "), sub, e, extra);
  }

  // Regole e condizioni (condizioni già bilingui nel titolo)
  for (const sec of RULES_DB) {
    const secName = sec.label.replace(/^\S+\s+/, "");
    for (const v of sec.voci) {
      push("rule", `${sec.id}-${v.titolo}`, v.titolo, "", secName, { testo: v.testo, sectionLabel: sec.label }, v.testo);
    }
  }

  // Dati personali: note di sessione, incontri salvati, nomi salvati
  const loadLs = (key) => { try { return JSON.parse(localStorage.getItem(userKey(key)) || "[]"); } catch { return []; } };
  for (const n of loadLs("dnd_session_notes")) {
    const title = (n.testo || "").slice(0, 60) + ((n.testo || "").length > 60 ? "…" : "");
    push("note", n.id, title || "Nota", "", (n.tags || []).join(" · "), n, n.testo);
  }
  for (const enc of loadLs("dnd_encounters_v2")) {
    const sub = `${(enc.enemies || []).length} nemici`;
    push("encounter", enc.id, enc.name || "Scontro", "", sub, enc,
      [enc.notes, ...(enc.enemies || []).map(e => e.name)].join(" "));
  }
  for (const sn of loadLs("dnd_saved_names")) {
    push("savedname", sn.id || sn.name, sn.name, "", sn.sub || "", sn, "");
  }

  return entries;
}

function App() {
  const [characters, setCharacters] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState("characters");
  const [showRules, setShowRules] = useState(false); // "characters" | "combat" | "monsters"
  const [pendingCombatant, setPendingCombatant] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  // Elementi pinnati per la sessione (dal 📌 nella palette di ricerca)
  const [pinned, setPinned] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_session_pins_v1")) || "[]"); } catch { return []; }
  });
  // Cronologia tiri di dado (sopravvive a un reload accidentale in sessione)
  const [diceHistory, setDiceHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_dice_history_v1")) || "[]"); } catch { return []; }
  });
  const [importedSpells, setImportedSpells] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_spells")) || "[]"); } catch { return []; }
  });
  const [importedItems, setImportedItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_items")) || "[]"); } catch { return []; }
  });

  useEffect(() => {
    loadData().then(d => {
      if (d?.characters?.length) {
        // Merge each saved character with defaultChar() so new fields
        // added in later versions are always present with safe defaults
        const migrated = d.characters.map(saved => ({
          ...defaultChar(),   // all default fields first
          ...saved,           // saved data overrides everything
          // Deep-merge nested objects so new sub-fields appear
          abilities:    { ...defaultChar().abilities,    ...(saved.abilities    || {}) },
          savingThrows: { ...defaultChar().savingThrows, ...(saved.savingThrows || {}) },
          skills:       { ...defaultChar().skills,       ...(saved.skills       || {}) },
          currency:     { ...defaultChar().currency,     ...(saved.currency     || {}) },
          deathSaves:   { ...defaultChar().deathSaves,   ...(saved.deathSaves   || {}) },
          spellSlots:   saved.spellSlots    || {},
          usedSpellSlots: saved.usedSpellSlots || {},
          // Arrays default to [] if missing
          equipment:    saved.equipment    || [],
          spells:       saved.spells       || [],
          attacks:      saved.attacks      || [],
          reputation:   saved.reputation   || [],
          prestige:     saved.prestige     || defaultChar().prestige,
        }));
        setCharacters(migrated);
        setActiveId(d.activeId || migrated[0]?.id);
      }
      setLoading(false);
    });
  }, []);

  // ── Salvataggio personaggi con debounce ──────────────────────────────────
  // Ogni battitura in un campo cambia `characters`: scrivere subito significa
  // riserializzare tutti i PG (ritratti base64 inclusi) a ogni tasto. Si salva
  // 400ms dopo l'ultima modifica; flush immediato su chiusura/nascondimento
  // pagina e su unmount (logout). La chiave utente è catturata al momento
  // della modifica: al flush l'utente potrebbe essere già sloggato.
  const saveTimer = React.useRef(null);
  const pendingSave = React.useRef(null);
  const flushSave = useCallback(() => {
    const p = pendingSave.current;
    if (!p) return;
    pendingSave.current = null;
    try { safeLsSet(p.key, JSON.stringify(p.data)); } catch {}
  }, []);

  useEffect(() => {
    if (loading) return;
    pendingSave.current = { key: userKey(STORAGE_KEY), data: { characters, activeId } };
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flushSave, 400);
    return () => clearTimeout(saveTimer.current);
  }, [characters, activeId, loading, flushSave]);

  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flushSave(); };
    window.addEventListener("pagehide", flushSave);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("pagehide", flushSave);
      document.removeEventListener("visibilitychange", onHide);
      flushSave(); // unmount (es. logout): non perdere l'ultima modifica
    };
  }, [flushSave]);

  // importedSpells and importedItems are saved to localStorage inside the import handler directly
  // No useEffect here — it would overwrite localStorage on mount with the initial (possibly empty) state

  // Scorciatoia ricerca globale: Ctrl/Cmd+K
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowSearch(s => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Indice di ricerca: ricostruito a ogni apertura della palette per riflettere
  // gli ultimi import (gli incantesimi importati arrivano da stato/localStorage).
  const searchEntries = React.useMemo(
    () => (showSearch ? buildSearchEntries(importedSpells) : []),
    [showSearch, importedSpells]
  );

  // ── Pin di sessione + dadi ────────────────────────────────────────────────
  const pinnedIds = React.useMemo(() => new Set(pinned.map(p => p.id)), [pinned]);
  const togglePin = (entry) => {
    setPinned(prev => {
      const exists = prev.some(p => p.id === entry.id);
      // _hay (testo di ricerca) non serve nel pin salvato
      const next = exists ? prev.filter(p => p.id !== entry.id) : [...prev, { ...entry, _hay: undefined }];
      try { safeLsSet(userKey("dnd_session_pins_v1"), JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const clearPins = () => {
    setPinned([]);
    try { safeLsSet(userKey("dnd_session_pins_v1"), "[]"); } catch {}
  };
  const recordRoll = (r) => {
    setDiceHistory(prev => {
      const next = [r, ...prev].slice(0, 30);
      try { safeLsSet(userKey("dnd_dice_history_v1"), JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const clearRolls = () => {
    setDiceHistory([]);
    try { safeLsSet(userKey("dnd_dice_history_v1"), "[]"); } catch {}
  };

  const addChar = () => {
    const c = defaultChar();
    setCharacters(cs => [...cs, c]);
    setActiveId(c.id);
  };
  const updateChar = (updated) => setCharacters(cs => cs.map(c => c.id === updated.id ? updated : c));
  const deleteChar = (id) => {
    setCharacters(cs => { const next = cs.filter(c => c.id !== id); setActiveId(next[0]?.id || null); return next; });
  };

  const activeChar = characters.find(c => c.id === activeId);

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="header">
          <h1>⚔ D&D Master</h1>
          <button className="btn btn-sm" style={{fontSize:"0.65rem",marginLeft:8}} onClick={()=>setShowSearch(true)} title="Ricerca globale (Ctrl/Cmd+K)">🔍 Cerca</button>
          <button className="btn btn-sm" style={{fontSize:"0.65rem",marginLeft:8}} onClick={()=>setShowRules(true)} title="Tabelle di riferimento">📋 Regole</button>
          <button className="btn btn-sm" style={{fontSize:"0.65rem",marginLeft:8}} onClick={()=>setShowImport(true)} title="Importa da 5e.tools">
            📥 Importa
          </button>
          <button className="btn btn-sm" style={{fontSize:"0.65rem",marginLeft:8}} onClick={()=>setShowBackup(true)} title="Backup ed esportazione dati">💾 Backup</button>
          <div className="header-tabs">
            <button className={`tab-btn ${mainTab === "characters" ? "active" : ""}`} onClick={() => setMainTab("characters")}>Personaggi</button>
            <button className={`tab-btn ${mainTab === "session" ? "active" : ""}`} onClick={() => setMainTab("session")}>📌 Sessione{pinned.length ? ` (${pinned.length})` : ""}</button>
            <button className={`tab-btn ${mainTab === "combat" ? "active" : ""}`} onClick={() => setMainTab("combat")}>⚔ Combattimento</button>
            <button className={`tab-btn ${mainTab === "monsters" ? "active" : ""}`} onClick={() => setMainTab("monsters")}>🐉 Mostri</button>
            <button className={`tab-btn ${mainTab === "campaign" ? "active" : ""}`} onClick={() => setMainTab("campaign")}>🗺 Campagna</button>
            <button className={`tab-btn ${mainTab === "names" ? "active" : ""}`} onClick={() => setMainTab("names")}>✨ Nomi</button>
            <button className={`tab-btn ${mainTab === "descriptions" ? "active" : ""}`} onClick={() => setMainTab("descriptions")}>📖 Descrizioni</button>
            <button className={`tab-btn ${mainTab === "shop" ? "active" : ""}`} onClick={() => setMainTab("shop")}>🏪 Prezzi</button>
            <button className={`tab-btn ${mainTab === "notes" ? "active" : ""}`} onClick={() => setMainTab("notes")}>📓 Note</button>
            <button className={`tab-btn ${mainTab === "spells" ? "active" : ""}`} onClick={() => setMainTab("spells")}>✨ Incantesimi</button>
            <button className={`tab-btn ${mainTab === "generator" ? "active" : ""}`} onClick={() => setMainTab("generator")}>⚡ Genera</button>
          </div>
        </div>

        {mainTab === "characters" && (
          <div className="char-list">
            {characters.map(c => (
              <div key={c.id} className={`char-chip ${c.id === activeId ? "active" : ""}`} onClick={() => setActiveId(c.id)}>
                {c.inspiration && <span title="Ispirazione" style={{ marginRight: 3 }}>⭐</span>}
                {c.name}
                {c.level ? <span style={{ marginLeft: 4, opacity: 0.6 }}>Lv{c.level}</span> : null}
              </div>
            ))}
            <div className="char-chip-add" onClick={addChar} title="Nuovo personaggio">＋</div>
          </div>
        )}

        <div className="main">
          {loading && <div className="empty-screen"><div className="empty-screen-icon">⚔</div><h2>Caricamento...</h2></div>}
          {!loading && mainTab === "characters" && !activeChar && (
            <div className="empty-screen">
              <div className="empty-screen-icon">📜</div>
              <h2>Nessun Personaggio</h2>
              <p>Clicca il tasto ＋ nella barra in alto per aggiungere il primo personaggio.</p>
              <button className="btn btn-primary" onClick={addChar}>+ Nuovo Personaggio</button>
            </div>
          )}
          {!loading && mainTab === "characters" && activeChar && (
            <CharacterSheet char={activeChar} onChange={updateChar} onDelete={deleteChar} />
          )}
          {!loading && mainTab === "session" && (
            <SessionPage
              pinned={pinned}
              onTogglePin={togglePin}
              onClearAll={clearPins}
              onOpenSearch={() => setShowSearch(true)}
              characters={characters}
              onUpdateCharacters={(updated) => {
                setCharacters(cs => cs.map(c => updated.find(u => u.id === c.id) || c));
              }}
            />
          )}
          {!loading && mainTab === "combat" && (
            <CombatTracker characters={characters} pendingCombatant={pendingCombatant} onPendingConsumed={() => setPendingCombatant(null)} />
          )}
          {!loading && mainTab === "campaign" && <ErrorBoundary><CampaignPage /></ErrorBoundary>}
          {!loading && mainTab === "shop" && <ShopPage />}
          {!loading && mainTab === "notes" && <SessionNotesPage characters={characters} />}
          {!loading && mainTab === "spells" && <SpellsPage />}
          {!loading && mainTab === "generator" && <EncounterGeneratorPage />}
          {!loading && mainTab === "descriptions" && (
            <DescriptionsPage />
          )}

          {!loading && mainTab === "names" && (
          <div className="section" style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
            <ErrorBoundary><NameGenerator /></ErrorBoundary>
          </div>
        )}

        {mainTab === "monsters" && (
            <ErrorBoundary><MonstersPage onAddToCombat={(monster) => {
              setPendingCombatant(monster);
              setMainTab("combat");
            }} /></ErrorBoundary>
          )}
        </div>
      </div>
      {showImport && (
        <Import5eTools
          onClose={() => setShowImport(false)}
          onImportMonsters={(monsters) => {
            const existing = (() => { try { return JSON.parse(localStorage.getItem(userKey("dnd_custom_monsters_v1")) || "[]"); } catch { return []; } })();
            const map = {}; for (const m of [...existing, ...monsters]) map[m.id || m.slug || m.name] = m;
            try { safeLsSet(userKey("dnd_custom_monsters_v1"), JSON.stringify(Object.values(map))); } catch {}
            window.dispatchEvent(new Event("dnd_monsters_updated"));
          }}
          onImportSpells={(spells) => {
            (() => {
              try {
                const existing = JSON.parse(localStorage.getItem(userKey("dnd_imported_spells")) || "[]");
                const map = {};
                for (const s of [...existing, ...spells]) map[s.slug || s.name] = s;
                safeLsSet(userKey("dnd_imported_spells"), JSON.stringify(Object.values(map)));
              } catch {}
            })();
          }}
          onImportItems={(items) => {
            setImportedItems(s => {
              const map = {};
              for (const it of [...s, ...items]) map[it.slug || it.name] = it;
              const merged = Object.values(map);
              try { safeLsSet(userKey("dnd_imported_items"), JSON.stringify(merged)); } catch {}
              return merged;
            });
          }}
          onImportClasses={(classes) => {
            const existing = (() => { try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_classes")) || "[]"); } catch { return []; } })();
            // Deduplicate by name — new import replaces old entry with same name
            const nameMap = {};
            for (const c of [...existing, ...classes]) nameMap[c.name] = c;
            try { safeLsSet(userKey("dnd_imported_classes"), JSON.stringify(Object.values(nameMap))); } catch {}
          }}
          onImportRaces={(races) => {
            const existing = (() => { try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_races")) || "[]"); } catch { return []; } })();
            const map = {}; for (const r of [...existing, ...races]) map[r.slug || r.name] = r;
            try { safeLsSet(userKey("dnd_imported_races"), JSON.stringify(Object.values(map))); } catch {}
          }}
          onImportFeats={(feats) => {
            const existing = (() => { try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_feats")) || "[]"); } catch { return []; } })();
            const map = {}; for (const f of [...existing, ...feats]) map[f.slug || f.name] = f;
            try { safeLsSet(userKey("dnd_imported_feats"), JSON.stringify(Object.values(map))); } catch {}
          }}
          onImportBackgrounds={(bgs) => {
            const existing = (() => { try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_backgrounds")) || "[]"); } catch { return []; } })();
            const map = {}; for (const b of [...existing, ...bgs]) map[b.slug || b.name] = b;
            try { safeLsSet(userKey("dnd_imported_backgrounds"), JSON.stringify(Object.values(map))); } catch {}
          }}
        />
      )}
      {/* Mobile bottom nav */}
      <nav className="mobile-nav">
        <div className="mobile-nav-inner">
          {[
            {id:'characters',  icon:'🧙', label:'Pers.'},
            {id:'session',     icon:'📌',      label:'Sess.'},
            {id:'combat',      icon:'⚔',      label:'Combat'},
            {id:'monsters',    icon:'🐉',  label:'Mostri'},
            {id:'campaign',    icon:'🗺',      label:'Camp.'},
            {id:'names',       icon:'✨',      label:'Nomi'},
            {id:'descriptions',icon:'📖',  label:'Descr.'},
            {id:'shop',        icon:'🏪',  label:'Prezzi'},
            {id:'notes',       icon:'📓',  label:'Note'},
            {id:'spells',      icon:'✨',      label:'Incant.'},
            {id:'generator',   icon:'⚡',      label:'Genera'},
          ].map(t => (
            <button key={t.id}
              className={`mobile-nav-btn${mainTab===t.id?' active':''}`}
              onClick={()=>setMainTab(t.id)}>
              <span className="mnav-icon">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
      {showSearch && (
        <GlobalSearch
          entries={searchEntries}
          onClose={() => setShowSearch(false)}
          onNavigate={(tab) => setMainTab(tab)}
          pinnedIds={pinnedIds}
          onTogglePin={togglePin}
          onRoll={recordRoll}
        />
      )}
      {showBackup && (
        <BackupModal user={getStoredUser()} onClose={() => setShowBackup(false)} />
      )}
      <DiceTray history={diceHistory} onRoll={recordRoll} onClear={clearRolls} />
    </>
  );
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError]       = React.useState("");
  const [loading, setLoading]   = React.useState(false);

  async function handleLogin() {
    setError(""); setLoading(true);
    const user = USERS.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) { setError("Utente non trovato."); setLoading(false); return; }
    const hash = await hashPassword(password);
    if (hash !== user.hash) { setError("Password errata."); setLoading(false); return; }
    storeUser(user.username);
    onLogin(user.username);
  }

  return (
    <div style={{
      display:"flex", alignItems:"center", justifyContent:"center",
      height:"100vh", background:"var(--bg)",
    }}>
      <div style={{
        background:"var(--surface)", border:"1px solid var(--border)",
        borderRadius:16, padding:"40px 36px", width:"100%", maxWidth:360,
        display:"flex", flexDirection:"column", gap:18,
      }}>
        <div style={{textAlign:"center", marginBottom:8}}>
          <div style={{fontSize:"2rem", marginBottom:8}}>⚔</div>
          <div style={{fontFamily:"'Cinzel',serif", fontSize:"1.3rem",
            fontWeight:700, color:"var(--gold)"}}>D&D Master</div>
          <div style={{fontSize:"0.78rem", color:"var(--text3)", marginTop:4}}>Accedi per continuare</div>
        </div>

        <div style={{display:"flex", flexDirection:"column", gap:10}}>
          <input
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            autoFocus
            style={{fontSize:"0.95rem", padding:"10px 12px"}}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{fontSize:"0.95rem", padding:"10px 12px"}}
          />
        </div>

        {error && (
          <div style={{fontSize:"0.8rem", color:"var(--red2)", textAlign:"center"}}>{error}</div>
        )}

        <button className="btn btn-primary" onClick={handleLogin} disabled={loading || !username || !password}
          style={{padding:"12px", fontSize:"1rem"}}>
          {loading ? "…" : "Accedi"}
        </button>
      </div>
    </div>
  );
}

// ─── AppRoot — gestisce auth prima di montare App ─────────────────────────────


const _OriginalApp = App;
export default function AppRoot() {
  const [user, setUser] = React.useState(() => {
    // Login automatico se configurato e nessun utente già loggato
    const stored = getStoredUser();
    if (stored) return stored;
    if (AUTO_LOGIN_USER) { storeUser(AUTO_LOGIN_USER); return AUTO_LOGIN_USER; }
    return null;
  });

  // Migrazione legacy → spazio utente. Gira nel corpo del componente (guardata da
  // un ref) così avviene prima che App/MonstersPage leggano da localStorage.
  const migrated = React.useRef(false);
  if (user && !migrated.current) {
    migrated.current = true;
    migrateLegacyKey(STORAGE_KEY);                       // personaggi
    migrateLegacyKey(MONSTERS_STORAGE_KEY, { merge: true }); // mostri custom + importati
  }

  if (!user) {
    return <LoginScreen onLogin={u => setUser(u)} />;
  }

  return (
    <>
      <_OriginalApp />
      <div style={{
        position:"fixed", bottom:8, right:10,
        fontSize:"0.62rem", color:"var(--text3)",
        display:"flex", alignItems:"center", gap:8,
      }}>
        <span>👤 {user}</span>
        <button
          onClick={() => { clearUser(); setUser(null); }}
          style={{background:"none", border:"none", color:"var(--text3)",
            cursor:"pointer", fontSize:"0.62rem", padding:"2px 4px",
            textDecoration:"underline"}}>
          Logout
        </button>
      </div>
    </>
  );
}
