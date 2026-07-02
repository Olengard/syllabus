import React, { useState, useEffect, useCallback } from "react";
import CatalogBrowser from "./CatalogBrowser.jsx";
import ClassChoices from "./ClassChoices.jsx";
import { hasFantasy, generateFantasyNames, generateSurname, generateSurnamesMixed, generateHouses, EXTRA_CATEGORIES } from "./nameForge.js";
import shopExtra from "./shopExtra.json";
import { DETAILS_EXTRA } from "./detailsExtra.js";
import GlobalSearch, { norm as searchNorm, deSlug } from "./GlobalSearch.jsx";
import BackupModal from "./BackupRestore.jsx";
import DiceTray from "./DiceTray.jsx";
import SessionPage from "./SessionPage.jsx";
// DB di gioco (estratti dal monolite — dati puri, vedi src/data/)
import { SPELLS_DB } from "./data/spells.js";
import { EQUIPMENT_DB } from "./data/equipment.js";
import { MONSTERS_DB } from "./data/monsters.js";
import { MAGIC_ITEMS_DB } from "./data/magicItems.js";
import { NAMES_DB } from "./data/names.js";
import { RACES_DB } from "./data/races.js";
import { CLASSES_DB } from "./data/classes.js";
import { DETAILS_DB } from "./data/details.js";
import { SHOP_DB } from "./data/shop.js";
import { RULES_DB } from "./data/rules.js";

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

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem("dnd_auth_user") || "null"); } catch { return null; }
}
function storeUser(username) {
  safeLsSet("dnd_auth_user", JSON.stringify(username));
}
function clearUser() {
  localStorage.removeItem("dnd_auth_user");
}
// Prefisso per tutte le chiavi localStorage — isola i dati per utente
function userKey(key) {
  const u = getStoredUser();
  return u ? `${u}__${key}` : key;
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

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,400&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg:       #0d0b08;
    --surface:  #1c1810;
    --surface2: #252018;
    --surface3: #302820;
    --border:   #5a4e38;
    --border2:  #7d6e50;
    --gold:     #d4a84c;
    --gold2:    #f0d070;
    --red:      #d44848;
    --red2:     #f06060;
    --green:    #4e9e62;
    --green2:   #68c47c;
    --blue:     #3e6e96;
    --blue2:    #5a96c8;
    --text:     #f0e6ce;
    --text2:    #cdb88a;
    --text3:    #9a8a68;
    --radius: 6px;
    --shadow: 0 4px 20px rgba(0,0,0,0.7);
  }
  body {
    background: var(--bg);
    color: var(--text);
    font-family: 'Crimson Pro', serif;
    font-size: 16px;
    line-height: 1.5;
    min-height: 100vh;
  }
  
  .app { display: flex; flex-direction: column; min-height: 100vh; }
  
  /* Header */
  .header {
    background: linear-gradient(180deg, #1a1208 0%, #0e0c09 100%);
    border-bottom: 2px solid var(--gold);
    padding: 12px 16px;
    display: flex; align-items: center; gap: 12px;
    position: sticky; top: 0; z-index: 100;
    box-shadow: 0 4px 24px rgba(0,0,0,0.8);
  }
  .header h1 {
    font-family: 'Cinzel', serif;
    font-size: 1.5rem; font-weight: 900;
    color: var(--gold);
    letter-spacing: 0.12em;
    text-shadow: 0 0 20px rgba(201,168,76,0.4);
    flex: 1;
  }
  .header-tabs { display: flex; gap: 4px; }
  .tab-btn {
    background: var(--surface2); border: 1px solid var(--border);
    color: var(--text2); font-family: 'Cinzel', serif; font-size: 0.8rem;
    padding: 6px 10px; border-radius: var(--radius); cursor: pointer;
    letter-spacing: 0.08em; transition: all 0.2s;
  }
  .tab-btn:hover { border-color: var(--gold); color: var(--gold); }
  .tab-btn.active { background: var(--gold); color: #1a1208; border-color: var(--gold); font-weight: 700; }

  /* Character list */
  .char-list { display: flex; gap: 8px; padding: 12px 16px; overflow-x: auto; background: var(--surface); border-bottom: 1px solid var(--border); }
  .char-chip {
    flex-shrink: 0;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 20px; padding: 6px 14px; cursor: pointer;
    font-family: 'Cinzel', serif; font-size: 0.82rem; color: var(--text2);
    transition: all 0.2s; white-space: nowrap;
  }
  .char-chip:hover { border-color: var(--gold); color: var(--gold); }
  .char-chip.active { background: var(--gold); color: #1a1208; border-color: var(--gold); font-weight: 700; }
  .char-chip-add {
    flex-shrink: 0;
    background: transparent; border: 1px dashed var(--border2);
    border-radius: 20px; padding: 6px 14px; cursor: pointer;
    font-size: 1rem; color: var(--text3); transition: all 0.2s;
  }
  .char-chip-add:hover { border-color: var(--gold); color: var(--gold); }

  /* Main content */
  .main { flex: 1; padding: 12px 16px; max-width: 900px; margin: 0 auto; width: 100%; }

  /* Sections */
  .section {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); margin-bottom: 12px;
    box-shadow: var(--shadow);
  }
  .section-header {
    background: linear-gradient(90deg, var(--surface2), var(--surface));
    border-bottom: 1px solid var(--border);
    padding: 10px 14px;
    font-family: 'Cinzel', serif; font-size: 0.85rem;
    color: var(--gold); letter-spacing: 0.08em; font-weight: 700;
    display: flex; align-items: center; justify-content: space-between;
    cursor: pointer; user-select: none;
  }
  .section-content { padding: 12px 14px; }

  /* Grid */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
  .grid-6 { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }

  /* Ability score box */
  .ability-box {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 10px 6px; text-align: center;
  }
  .ability-label { font-family: 'Cinzel', serif; font-size: 0.68rem; color: var(--text3); letter-spacing: 0.08em; margin-bottom: 4px; }
  .ability-mod { font-family: 'Cinzel', serif; font-size: 1.65rem; font-weight: 700; color: var(--gold); line-height: 1; }
  .ability-score { font-size: 0.9rem; color: var(--text2); margin-top: 4px; }
  .ability-input {
    background: transparent; border: none; text-align: center;
    font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 700;
    color: var(--gold2); width: 100%; outline: none;
  }

  /* Inputs */
  input, textarea, select {
    background: var(--surface3); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text); font-family: 'Crimson Pro', serif;
    font-size: 1.05rem; padding: 7px 11px; width: 100%; outline: none;
    transition: border-color 0.2s;
  }
  input:focus, textarea:focus, select:focus { border-color: var(--gold); }
  input[type="number"] { -moz-appearance: textfield; }
  input[type="number"]::-webkit-inner-spin-button { display: none; }
  
  label { font-size: 0.8rem; color: var(--text3); font-family: 'Cinzel', serif; letter-spacing: 0.05em; display: block; margin-bottom: 4px; }
  .field { margin-bottom: 8px; }

  /* HP display */
  .hp-display {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 10px;
  }
  .hp-main { flex: 1; text-align: center; }
  .hp-label { font-family: 'Cinzel', serif; font-size: 0.7rem; color: var(--text3); letter-spacing: 0.08em; }
  .hp-value { font-family: 'Cinzel', serif; font-size: 2.2rem; font-weight: 900; color: var(--red2); line-height: 1; }
  .hp-max { color: var(--text3); font-size: 1rem; }
  .hp-bar { height: 4px; background: var(--surface3); border-radius: 2px; margin-top: 6px; overflow: hidden; }
  .hp-bar-fill { height: 100%; background: linear-gradient(90deg, var(--red), var(--red2)); transition: width 0.3s; }

  /* Stat badge */
  .stat-badge {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 8px; text-align: center;
  }
  .stat-badge-label { font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--text3); letter-spacing: 0.07em; margin-bottom: 4px; }
  .stat-badge-value { font-family: 'Cinzel', serif; font-size: 1.3rem; font-weight: 700; color: var(--text); }

  /* Skills */
  .skill-row {
    display: flex; align-items: center; gap: 8px;
    padding: 4px 0; border-bottom: 1px solid rgba(74,63,47,0.3);
    font-size: 0.95rem;
  }
  .skill-row:last-child { border-bottom: none; }
  .skill-prof { width: 14px; height: 14px; border-radius: 50%; border: 1px solid var(--border2); cursor: pointer; flex-shrink: 0; transition: all 0.2s; }
  .skill-prof.half { background: linear-gradient(135deg, var(--gold) 50%, transparent 50%); border-color: var(--gold); }
  .skill-prof.full { background: var(--gold); border-color: var(--gold); }
  .skill-prof.expert { background: var(--gold); border-color: var(--gold2); box-shadow: 0 0 0 2px var(--surface), 0 0 0 3px var(--gold); }
  .skill-name { flex: 1; color: var(--text2); }
  .skill-ability { font-size: 0.65rem; color: var(--text3); font-family: 'Cinzel', serif; }
  .skill-bonus { font-family: 'Cinzel', serif; font-size: 0.85rem; color: var(--gold); font-weight: 600; width: 28px; text-align: right; }

  /* Spell card */
  .spell-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 10px; margin-bottom: 8px;
  }
  .spell-name { font-family: 'Cinzel', serif; font-size: 0.85rem; color: var(--gold2); font-weight: 600; margin-bottom: 4px; }
  .spell-meta { font-size: 0.75rem; color: var(--text3); margin-bottom: 6px; }
  .spell-desc { font-size: 0.85rem; color: var(--text2); line-height: 1.5; }
  .spell-level-badge {
    display: inline-block; background: var(--surface3); border: 1px solid var(--border);
    border-radius: 10px; padding: 1px 8px; font-size: 0.7rem;
    font-family: 'Cinzel', serif; color: var(--blue2);
  }

  /* Equipment */
  .item-row {
    display: flex; align-items: center; gap: 8px;
    padding: 6px; background: var(--surface2); border-radius: var(--radius);
    margin-bottom: 6px; border: 1px solid var(--border);
  }
  .item-name { flex: 1; font-size: 0.9rem; }
  .item-qty { font-family: 'Cinzel', serif; font-size: 0.85rem; color: var(--gold); width: 30px; text-align: center; }
  .item-weight { font-size: 0.75rem; color: var(--text3); }

  /* Reputation / Prestige */
  .prestige-grid { display: flex; flex-direction: column; gap: 10px; }
  .prestige-row {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 10px 12px; transition: border-color 0.2s;
  }
  .prestige-row:hover { border-color: var(--border2); }
  .prestige-row-top { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
  .prestige-name-input {
    flex: 1; font-family: 'Cinzel', serif; font-size: 0.9rem; font-weight: 700;
    background: transparent; border: none; border-bottom: 1px dashed var(--border2);
    color: var(--gold2); padding: 2px 4px; outline: none; transition: border-color 0.2s;
  }
  .prestige-name-input:focus { border-bottom-color: var(--gold); }
  .prestige-name-input::placeholder { color: var(--text3); font-style: italic; font-weight: 400; }
  .prestige-score-display {
    font-family: 'Cinzel', serif; font-size: 1.7rem; font-weight: 900;
    color: var(--gold); min-width: 38px; text-align: center; line-height: 1;
  }
  .prestige-label {
    font-family: 'Cinzel', serif; font-size: 0.58rem; color: var(--text3);
    letter-spacing: 0.08em; min-width: 70px; text-align: center;
  }
  .prestige-pips { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
  .prestige-pip {
    width: 24px; height: 24px; border-radius: 50%;
    border: 2px solid var(--border2); background: var(--surface3);
    cursor: pointer; transition: all 0.15s; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
  }
  .prestige-pip.filled { background: var(--gold); border-color: var(--gold2); box-shadow: 0 0 6px rgba(201,168,76,0.4); }
  .prestige-pip.filled-high { background: var(--gold2); border-color: #f5e87a; box-shadow: 0 0 10px rgba(232,201,106,0.6); }
  .prestige-pip:hover { border-color: var(--gold); transform: scale(1.18); }
  .prestige-bar-track {
    height: 5px; background: var(--surface3); border-radius: 3px;
    overflow: hidden; margin-top: 8px; border: 1px solid var(--border);
  }
  .prestige-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s ease; }
  .prestige-total-badge {
    font-family: 'Cinzel', serif; font-size: 0.65rem; padding: 3px 10px;
    border-radius: 10px; border: 1px solid var(--gold); color: var(--gold);
    background: rgba(201,168,76,0.08);
  }
  /* legacy kept for compat */
  .rep-row { display:flex; align-items:center; gap:10px; padding:8px; background:var(--surface2); border-radius:var(--radius); margin-bottom:6px; border:1px solid var(--border); }
  .rep-name { flex:1; font-size:0.9rem; }
  .rep-bar { flex:2; height:8px; background:var(--surface3); border-radius:4px; overflow:hidden; }
  .rep-bar-fill { height:100%; border-radius:4px; transition:width 0.3s; }

  /* Buttons */
  .btn {
    background: var(--surface2); border: 1px solid var(--border2);
    color: var(--text2); font-family: 'Cinzel', serif; font-size: 0.75rem;
    padding: 8px 14px; border-radius: var(--radius); cursor: pointer;
    letter-spacing: 0.06em; transition: all 0.2s; display: inline-flex;
    align-items: center; gap: 6px;
  }
  .btn:hover { border-color: var(--gold); color: var(--gold); background: var(--surface3); }
  .btn-primary { background: var(--gold); color: #1a1208; border-color: var(--gold); font-weight: 700; }
  .btn-primary:hover { background: var(--gold2); border-color: var(--gold2); color: #1a1208; }
  .btn-danger { border-color: var(--red); color: var(--red2); }
  .btn-danger:hover { background: var(--red); color: #fff; }
  .btn-sm { padding: 4px 10px; font-size: 0.65rem; }

  /* Spell slots */
  .slot-group { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
  .slot-pip {
    width: 22px; height: 22px; border-radius: 50%;
    border: 2px solid var(--blue2); cursor: pointer;
    transition: all 0.2s; background: var(--surface3);
  }
  .slot-pip.used { background: var(--surface3); border-color: var(--border); }
  .slot-pip.available { background: var(--blue); box-shadow: 0 0 8px rgba(74,128,168,0.4); }

  /* Search overlay */
  .overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.85);
    z-index: 200; display: flex; align-items: flex-start;
    justify-content: center; padding: 20px; overflow-y: auto;
    touch-action: pan-y;
    -webkit-overflow-scrolling: touch;
  }
  .overlay-panel {
    background: var(--surface); border: 1px solid var(--gold);
    border-radius: 8px; width: 100%; max-width: 600px;
    max-height: 85vh; display: flex; flex-direction: column;
    box-shadow: 0 0 40px rgba(201,168,76,0.2);
  }
  .overlay-header {
    padding: 14px 16px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
    background: var(--surface2);
  }
  .overlay-title { font-family: 'Cinzel', serif; color: var(--gold); font-size: 0.9rem; flex: 1; }
  .overlay-body { flex: 1; overflow-y: auto; padding: 12px;
    -webkit-overflow-scrolling: touch;
  }
  .overlay-footer { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; gap: 8px; justify-content: flex-end; }

  /* Spell search results */
  .spell-result {
    padding: 10px; border-bottom: 1px solid var(--border);
    cursor: pointer; transition: background 0.15s;
  }
  .spell-result:hover { background: var(--surface2); }
  .spell-result.selected { background: rgba(201,168,76,0.1); border-left: 2px solid var(--gold); }
  
  /* Misc */
  .divider { border: none; border-top: 1px solid var(--border); margin: 10px 0; }
  .row { display: flex; gap: 8px; align-items: flex-start; }
  .flex { display: flex; align-items: center; gap: 8px; }
  .text-gold { color: var(--gold); }
  .text-sm { font-size: 0.8rem; color: var(--text3); }
  .empty-state { text-align: center; padding: 24px; color: var(--text3); font-style: italic; }
  .checkbox { width: 16px; height: 16px; cursor: pointer; accent-color: var(--gold); }
  
  /* Tabs within character sheet */
  .inner-tabs { display: flex; gap: 2px; margin-bottom: 12px; border-bottom: 1px solid var(--border); padding-bottom: 8px; overflow-x: auto; }
  .inner-tab {
    background: transparent; border: 1px solid transparent;
    color: var(--text3); font-family: 'Cinzel', serif; font-size: 0.65rem;
    padding: 5px 10px; border-radius: var(--radius); cursor: pointer;
    letter-spacing: 0.06em; transition: all 0.2s; white-space: nowrap;
  }
  .inner-tab:hover { color: var(--gold); }
  .inner-tab.active { border-color: var(--border); background: var(--surface2); color: var(--gold); }

  /* Empty screen */
  .empty-screen {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    padding: 60px 20px; text-align: center; gap: 16px;
  }
  .empty-screen-icon { font-size: 4rem; opacity: 0.3; }
  .empty-screen h2 { font-family: 'Cinzel', serif; color: var(--text2); font-size: 1.2rem; }
  .empty-screen p { color: var(--text3); max-width: 300px; line-height: 1.6; }

  /* Collapsed section */
  .collapsed .section-content { display: none; }
  .collapse-arrow { transition: transform 0.2s; }
  .collapsed .collapse-arrow { transform: rotate(-90deg); }

  /* Spell level headers */
  .spell-level-header {
    font-family: 'Cinzel', serif; font-size: 0.7rem; color: var(--text3);
    letter-spacing: 0.1em; padding: 6px 0 4px;
    border-bottom: 1px solid var(--border); margin-bottom: 8px;
    display: flex; align-items: center; justify-content: space-between;
  }
  

  /* ─── Combat Tracker ─────────────────────────────────────────────────────── */
  .combat-layout { display: flex; flex-direction: column; gap: 12px; }

  .initiative-list { display: flex; flex-direction: column; gap: 6px; }

  .combatant-row {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px;
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); transition: all 0.2s;
    position: relative; overflow: hidden;
  }
  .combatant-row.active-turn {
    border-color: var(--gold);
    background: linear-gradient(90deg, rgba(201,168,76,0.12), var(--surface));
    box-shadow: 0 0 16px rgba(201,168,76,0.15);
  }
  .combatant-row.active-turn::before {
    content: "";
    position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
    background: var(--gold);
  }
  .combatant-row.enemy { border-left: 3px solid var(--red2); }
  .combatant-row.enemy.active-turn { border-color: var(--red2); background: linear-gradient(90deg, rgba(201,68,68,0.12), var(--surface)); }
  .combatant-row.enemy.active-turn::before { background: var(--red2); }
  .combatant-row.dead { opacity: 0.35; }

  .combatant-init {
    font-family: 'Cinzel', serif; font-size: 1.3rem; font-weight: 900;
    min-width: 36px; text-align: center;
    color: var(--gold);
  }
  .combatant-row.enemy .combatant-init { color: var(--red2); }
  .combatant-init-input {
    font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 700;
    width: 44px; text-align: center; padding: 4px 2px;
    background: var(--surface3); border: 1px solid var(--border2);
    border-radius: var(--radius); color: var(--gold);
  }
  .combatant-row.enemy .combatant-init-input { color: var(--red2); }

  .combatant-name { flex: 1; font-size: 0.95rem; font-weight: 600; }
  .combatant-subname { font-size: 0.7rem; color: var(--text3); margin-top: 1px; }
  .combatant-count {
    font-family: 'Cinzel', serif; font-size: 0.7rem;
    background: var(--surface3); border: 1px solid var(--border);
    border-radius: 10px; padding: 2px 8px; color: var(--text3);
  }

  .combatant-hp { display: flex; align-items: center; gap: 6px; }
  .combatant-hp input {
    width: 44px; text-align: center; padding: 4px 2px;
    font-family: 'Cinzel', serif; font-size: 0.9rem; font-weight: 700;
    color: var(--red2);
  }
  .combatant-hp-sep { color: var(--text3); font-size: 0.8rem; }

  .combatant-actions { display: flex; gap: 4px; }

  .round-display {
    display: flex; align-items: center; justify-content: center; gap: 16px;
    padding: 14px; background: var(--surface);
    border: 1px solid var(--border); border-radius: var(--radius);
    margin-bottom: 4px;
  }
  .round-number {
    font-family: 'Cinzel', serif; font-size: 2rem; font-weight: 900;
    color: var(--gold); line-height: 1;
  }
  .round-label { font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--text3); letter-spacing: 0.12em; }
  .turn-indicator { font-family: 'Cinzel', serif; font-size: 0.8rem; color: var(--text2); text-align: center; }

  .add-combatant-form {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 12px 14px;
  }
  .add-form-title { font-family: 'Cinzel', serif; font-size: 0.7rem; color: var(--text3); letter-spacing: 0.1em; margin-bottom: 10px; }

  .combatant-type-toggle {
    display: flex; gap: 4px; margin-bottom: 10px;
  }
  .type-btn {
    flex: 1; padding: 6px; border-radius: var(--radius);
    font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.06em;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text3); cursor: pointer; transition: all 0.2s; text-align: center;
  }
  .type-btn.active-ally { background: rgba(74,128,168,0.2); border-color: var(--blue2); color: var(--blue2); }
  .type-btn.active-enemy { background: rgba(201,68,68,0.2); border-color: var(--red2); color: var(--red2); }

  .next-turn-btn {
    width: 100%; padding: 14px;
    background: linear-gradient(135deg, var(--gold), var(--gold2));
    border: none; border-radius: var(--radius);
    font-family: 'Cinzel', serif; font-size: 0.9rem; font-weight: 700;
    color: #1a1208; cursor: pointer; letter-spacing: 0.1em;
    transition: all 0.2s; margin-top: 8px;
    box-shadow: 0 4px 16px rgba(201,168,76,0.3);
  }
  .next-turn-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(201,168,76,0.4); }
  .next-turn-btn:active { transform: translateY(0); }

  .combat-empty {
    text-align: center; padding: 40px 20px; color: var(--text3); font-style: italic;
  }

  .cond-badge {
    font-size: 0.65rem; padding: 1px 6px; border-radius: 10px;
    border: 1px solid var(--border); background: var(--surface3);
    color: var(--text3); cursor: pointer; transition: all 0.15s; white-space: nowrap;
  }
  .cond-badge.active { background: rgba(201,168,76,0.15); border-color: var(--gold); color: var(--gold); }
  .cond-badge.active-red { background: rgba(201,68,68,0.15); border-color: var(--red2); color: var(--red2); }

  .combatant-conditions { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }

  
  /* ─── Combat Split Layout ─────────────────────────────────────────────────── */
  .combat-split {
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 12px;
    align-items: start;
  }
  @media (max-width: 860px) {
    .combat-split { grid-template-columns: 1fr; }
  }

  /* ─── Dice Roller ──────────────────────────────────────────────────────────── */
  .dice-panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
    position: sticky; top: 60px;
  }
  .dice-panel-header {
    background: linear-gradient(90deg, var(--surface2), var(--surface));
    border-bottom: 1px solid var(--border);
    padding: 10px 14px;
    font-family: 'Cinzel', serif; font-size: 0.85rem;
    color: var(--gold); letter-spacing: 0.08em; font-weight: 700;
  }
  .dice-panel-body { padding: 12px 14px; }

  .roller-tabs { display: flex; gap: 3px; margin-bottom: 12px; }
  .roller-tab {
    flex: 1; padding: 5px 4px; text-align: center;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); font-family: 'Cinzel', serif;
    font-size: 0.6rem; color: var(--text3); cursor: pointer;
    letter-spacing: 0.05em; transition: all 0.15s;
  }
  .roller-tab:hover { color: var(--gold); border-color: var(--border2); }
  .roller-tab.active { background: var(--gold); color: #1a1208; border-color: var(--gold); font-weight: 700; }

  .adv-toggle { display: flex; gap: 4px; margin-bottom: 10px; }
  .adv-btn {
    flex: 1; padding: 6px 4px; text-align: center; border-radius: var(--radius);
    font-family: 'Cinzel', serif; font-size: 0.65rem; letter-spacing: 0.05em;
    border: 1px solid var(--border); background: var(--surface2);
    color: var(--text3); cursor: pointer; transition: all 0.15s;
  }
  .adv-btn.active-normal { background: rgba(74,128,168,0.2); border-color: var(--blue2); color: var(--blue2); }
  .adv-btn.active-adv    { background: rgba(74,140,92,0.2);  border-color: var(--green2); color: var(--green2); }
  .adv-btn.active-dis    { background: rgba(201,68,68,0.2);  border-color: var(--red2); color: var(--red2); }

  .result-display {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 12px;
    text-align: center; margin: 10px 0; min-height: 80px;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    position: relative; overflow: hidden;
  }
  .result-display.crit {
    border-color: var(--gold);
    background: linear-gradient(135deg, rgba(201,168,76,0.15), var(--surface2));
  }
  .result-display.fumble {
    border-color: var(--red2);
    background: linear-gradient(135deg, rgba(201,68,68,0.12), var(--surface2));
  }
  .result-main {
    font-family: 'Cinzel', serif; font-size: 2.4rem; font-weight: 900;
    color: var(--gold); line-height: 1;
  }
  .result-display.crit .result-main { color: var(--gold2); text-shadow: 0 0 20px rgba(232,201,106,0.5); }
  .result-display.fumble .result-main { color: var(--red2); }
  .result-label { font-family: 'Cinzel', serif; font-size: 0.6rem; color: var(--text3); letter-spacing: 0.12em; margin-top: 4px; }
  .result-breakdown { font-size: 0.75rem; color: var(--text2); margin-top: 6px; }
  .result-badge {
    font-family: 'Cinzel', serif; font-size: 0.7rem; font-weight: 700;
    padding: 2px 10px; border-radius: 10px; margin-top: 6px;
  }
  .crit-badge { background: rgba(201,168,76,0.2); color: var(--gold2); border: 1px solid var(--gold); }
  .fumble-badge { background: rgba(201,68,68,0.15); color: var(--red2); border: 1px solid var(--red2); }

  .roll-log {
    max-height: 120px; overflow-y: auto; margin-top: 8px;
    border-top: 1px solid var(--border); padding-top: 8px;
  }
  .roll-log-entry {
    display: flex; justify-content: space-between; align-items: center;
    padding: 3px 0; border-bottom: 1px solid rgba(74,63,47,0.2);
    font-size: 0.75rem;
  }
  .roll-log-entry:last-child { border-bottom: none; }
  .roll-log-name { color: var(--text3); }
  .roll-log-val { font-family: 'Cinzel', serif; font-weight: 700; color: var(--gold); }
  .roll-log-val.crit-val { color: var(--gold2); }
  .roll-log-val.fumble-val { color: var(--red2); }

  .char-select-row {
    display: flex; gap: 6px; margin-bottom: 10px; align-items: center;
  }
  .char-avatar {
    width: 28px; height: 28px; border-radius: 50%;
    background: var(--surface3); border: 1px solid var(--border2);
    display: flex; align-items: center; justify-content: center;
    font-size: 0.7rem; font-family: 'Cinzel', serif; color: var(--gold);
    cursor: pointer; transition: all 0.15s; flex-shrink: 0;
  }
  .char-avatar.active { background: var(--gold); color: #1a1208; border-color: var(--gold); }

  .attack-select {
    background: var(--surface3); border: 1px solid var(--border);
    border-radius: var(--radius); color: var(--text); font-family: 'Crimson Pro', serif;
    font-size: 0.9rem; padding: 6px 8px; width: 100%; outline: none;
    transition: border-color 0.2s; margin-bottom: 8px;
  }
  .attack-select:focus { border-color: var(--gold); }

  .roll-btn {
    width: 100%; padding: 12px;
    background: linear-gradient(135deg, var(--surface2), var(--surface3));
    border: 1px solid var(--border2); border-radius: var(--radius);
    font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 700;
    color: var(--text2); cursor: pointer; letter-spacing: 0.08em;
    transition: all 0.2s; margin-top: 8px;
  }
  .roll-btn:hover { border-color: var(--gold); color: var(--gold); background: var(--surface2); }
  .roll-btn:active { transform: scale(0.98); }

  .manual-dice-grid {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 10px;
  }
  .die-btn {
    padding: 8px 4px; text-align: center; border-radius: var(--radius);
    background: var(--surface2); border: 1px solid var(--border);
    font-family: 'Cinzel', serif; font-size: 0.75rem; color: var(--text3);
    cursor: pointer; transition: all 0.15s;
  }
  .die-btn:hover { border-color: var(--gold); color: var(--gold); }
  .die-btn.selected { background: rgba(201,168,76,0.15); border-color: var(--gold); color: var(--gold2); font-weight: 700; }

  .bonus-row { display: flex; gap: 6px; align-items: center; margin-bottom: 8px; }
  .bonus-row label { font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--text3); letter-spacing: 0.06em; white-space: nowrap; }

  
  /* ─── Equipment Search ──────────────────────────────────────────────────── */
  .eq-search-result {
    padding: 10px 12px; border-radius: var(--radius);
    border: 1px solid var(--border); background: var(--surface2);
    cursor: pointer; transition: all 0.15s; margin-bottom: 4px;
  }
  .eq-search-result:hover { border-color: var(--border2); }
  .eq-search-result.selected { border-color: var(--gold); background: rgba(201,168,76,0.08); }
  .eq-name { font-family: 'Cinzel', serif; font-size: 0.85rem; font-weight: 700; color: var(--gold2); }
  .eq-meta { font-size: 0.72rem; color: var(--text3); margin-top: 2px; }
  .eq-props { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .eq-prop {
    font-size: 0.62rem; padding: 1px 7px; border-radius: 10px;
    border: 1px solid var(--border); background: var(--surface3); color: var(--text3);
  }
  .eq-prop.magic { border-color: var(--gold); color: var(--gold2); background: rgba(201,168,76,0.08); }
  .eq-prop.armor-prop { border-color: var(--blue2); color: var(--blue2); }
  .eq-cat-badge {
    font-size: 0.6rem; padding: 1px 6px; border-radius: 10px;
    border: 1px solid; font-family: 'Cinzel', serif; letter-spacing: 0.04em; white-space: nowrap;
  }
  .eq-cat-arma    { border-color: var(--red2);   color: var(--red2); }
  .eq-cat-armatura{ border-color: var(--blue2);  color: var(--blue2); }
  .eq-cat-magico  { border-color: var(--gold);   color: var(--gold); }
  .eq-cat-strumento{ border-color: var(--green2); color: var(--green2); }

  .item-row-expanded { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); margin-bottom: 6px; overflow: hidden; }
  .item-row-main { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; }
  .item-row-main:hover { background: var(--surface2); }
  .item-row-detail { padding: 8px 12px 10px; border-top: 1px solid var(--border); background: var(--surface2); font-size: 0.78rem; color: var(--text2); line-height: 1.5; }
  .item-equip-badge { font-size: 0.6rem; padding: 1px 7px; border-radius: 10px; font-family: 'Cinzel', serif; cursor: pointer; }
  .item-equip-badge.equipped { background: rgba(74,140,92,0.15); border: 1px solid var(--green2); color: var(--green2); }
  .item-equip-badge.unequipped { background: var(--surface3); border: 1px solid var(--border); color: var(--text3); }

  
  /* ─── Monsters Tab ─────────────────────────────────────────────────────── */
  .monsters-layout { display: grid; grid-template-columns: 320px 1fr; gap: 12px; align-items: start; }
  @media (max-width: 860px) { .monsters-layout { grid-template-columns: 1fr; } }

  .monster-list-panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden; position: sticky; top: 60px;
  }
  .monster-list-header {
    padding: 10px 12px; background: var(--surface2); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 8px;
  }
  .monster-list-body { max-height: calc(100vh - 200px); overflow-y: auto; }

  .monster-list-item {
    display: flex; align-items: center; gap: 8px; padding: 8px 12px;
    border-bottom: 1px solid var(--border); cursor: pointer; transition: all 0.15s;
  }
  .monster-list-item:hover { background: var(--surface2); }
  .monster-list-item.active { background: rgba(201,168,76,0.1); border-left: 3px solid var(--gold); }
  .monster-list-item.custom { border-left: 3px solid var(--green2); }
  .monster-cr-badge {
    font-family: 'Cinzel', serif; font-size: 0.65rem; font-weight: 700;
    padding: 2px 6px; border-radius: 6px; min-width: 32px; text-align: center;
    background: var(--surface3); border: 1px solid var(--border); color: var(--gold);
    flex-shrink: 0;
  }
  .monster-cr-badge.lethal { background: rgba(201,68,68,0.15); border-color: var(--red2); color: var(--red2); }
  .monster-cr-badge.easy   { background: rgba(74,140,92,0.15); border-color: var(--green2); color: var(--green2); }
  .monster-list-name { font-size: 0.85rem; font-weight: 600; flex: 1; }
  .monster-list-type { font-size: 0.65rem; color: var(--text3); }

  /* Monster Sheet */
  .monster-sheet {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: var(--radius); overflow: hidden;
  }
  .monster-sheet-header {
    padding: 16px 18px;
    background: linear-gradient(135deg, var(--surface2), var(--surface));
    border-bottom: 1px solid var(--border);
  }
  .monster-sheet-name {
    font-family: 'Cinzel', serif; font-size: 1.4rem; font-weight: 900;
    color: var(--gold2); line-height: 1.1; margin-bottom: 4px;
  }
  .monster-sheet-subtitle { font-size: 0.8rem; color: var(--text3); font-style: italic; margin-bottom: 10px; }
  .monster-sheet-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .monster-tag {
    font-family: 'Cinzel', serif; font-size: 0.6rem; padding: 2px 8px;
    border-radius: 10px; border: 1px solid; letter-spacing: 0.06em;
  }
  .monster-tag.cr    { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,0.1); }
  .monster-tag.hp    { border-color: var(--red2); color: var(--red2); background: rgba(201,68,68,0.08); }
  .monster-tag.ac    { border-color: var(--blue2); color: var(--blue2); background: rgba(74,128,168,0.08); }
  .monster-tag.speed { border-color: var(--text3); color: var(--text3); }

  .monster-abilities {
    display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;
    padding: 12px 16px; border-bottom: 1px solid var(--border);
  }
  .monster-ability {
    text-align: center; background: var(--surface2); border-radius: var(--radius);
    padding: 8px 4px; border: 1px solid var(--border);
  }
  .monster-ability-name { font-family: 'Cinzel', serif; font-size: 0.55rem; color: var(--text3); letter-spacing: 0.08em; }
  .monster-ability-score { font-family: 'Cinzel', serif; font-size: 1.1rem; font-weight: 900; color: var(--text); }
  .monster-ability-mod { font-size: 0.7rem; color: var(--gold); font-weight: 600; }

  .monster-section { padding: 10px 16px; border-bottom: 1px solid var(--border); }
  .monster-section:last-child { border-bottom: none; }
  .monster-section-title {
    font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--text3);
    letter-spacing: 0.1em; margin-bottom: 8px; text-transform: uppercase;
  }

  .monster-action {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 8px 10px; margin-bottom: 6px;
  }
  .monster-action-name {
    font-family: 'Cinzel', serif; font-size: 0.8rem; font-weight: 700; color: var(--gold2);
    margin-bottom: 3px;
  }
  .monster-action-stats { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 4px; }
  .monster-action-stat {
    font-size: 0.68rem; padding: 1px 7px; border-radius: 8px;
    border: 1px solid var(--border); background: var(--surface3); color: var(--text2);
  }
  .monster-action-stat.atk { border-color: var(--red2); color: var(--red2); }
  .monster-action-stat.dmg { border-color: var(--gold); color: var(--gold); }
  .monster-action-desc { font-size: 0.75rem; color: var(--text3); line-height: 1.4; font-style: italic; }

  .legendary-action { 
    border-left: 2px solid var(--gold2); padding-left: 8px; margin-bottom: 6px;
  }
  .legendary-action-name { font-size: 0.78rem; font-weight: 700; color: var(--gold2); }
  .legendary-action-desc { font-size: 0.72rem; color: var(--text3); }

  .trait-block { margin-bottom: 6px; }
  .trait-name { font-size: 0.78rem; font-weight: 700; color: var(--text); }
  .trait-desc { font-size: 0.75rem; color: var(--text2); line-height: 1.4; }

  .monster-saves-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .monster-save-badge {
    font-size: 0.68rem; padding: 2px 8px; border-radius: 8px;
    background: var(--surface3); border: 1px solid var(--border); color: var(--text2);
    font-family: 'Cinzel', serif;
  }
  .monster-empty {
    text-align: center; padding: 60px 20px; color: var(--text3); font-style: italic;
  }

  .add-to-combat-btn {
    width: 100%; padding: 10px; margin: 0;
    background: linear-gradient(135deg, rgba(201,68,68,0.15), rgba(201,68,68,0.08));
    border: 1px solid var(--red2); border-radius: 0;
    font-family: 'Cinzel', serif; font-size: 0.8rem; font-weight: 700;
    color: var(--red2); cursor: pointer; letter-spacing: 0.08em;
    transition: all 0.2s;
  }
  .add-to-combat-btn:hover { background: rgba(201,68,68,0.25); }

  .monster-hp-tracker {
    display: flex; align-items: center; gap: 8px;
    background: var(--surface3); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 6px 10px; margin-top: 6px;
  }
  .monster-hp-tracker label { font-family:'Cinzel',serif; font-size:0.6rem; color:var(--text3); }
  .monster-hp-tracker input { width: 55px; text-align: center; font-family:'Cinzel',serif; font-weight:700; color:var(--red2); }

  

  /* ─── Name Generator ──────────────────────────────────────────────────── */
  .namegen-layout { display: grid; grid-template-columns: 280px 1fr; gap: 0; min-height: 600px; }
  .namegen-controls { border-right: 1px solid var(--border); padding: 14px; overflow-y: auto; -webkit-overflow-scrolling: touch; }
  .namegen-results  { padding: 14px; overflow-y: auto; }

  .namegen-section { margin-bottom: 16px; }
  .namegen-section-title {
    font-family: 'Cinzel', serif; font-size: 0.6rem; color: var(--text3);
    letter-spacing: 0.1em; margin-bottom: 8px;
  }

  .namegen-cat-btn {
    display: block; width: 100%; text-align: left;
    padding: 8px 12px; margin-bottom: 4px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); cursor: pointer;
    font-size: 0.82rem; color: var(--text2); transition: all 0.15s;
  }
  .namegen-cat-btn:hover { border-color: var(--gold); color: var(--gold); }
  .namegen-cat-btn.active { border-color: var(--gold); color: var(--gold2); background: rgba(201,168,76,0.1); font-weight: 700; }

  .namegen-sub-btn {
    display: inline-block; padding: 5px 10px; margin: 3px;
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: 12px; cursor: pointer; font-size: 0.75rem;
    color: var(--text2); transition: all 0.15s;
  }
  .namegen-sub-btn:hover { border-color: var(--gold); color: var(--gold); }
  .namegen-sub-btn.active { background: rgba(201,168,76,0.15); border-color: var(--gold); color: var(--gold2); font-weight: 700; }

  .namegen-gender-row { display: flex; gap: 6px; margin-bottom: 10px; }
  .namegen-gender-btn {
    flex: 1; padding: 7px 4px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    cursor: pointer; font-size: 0.75rem; color: var(--text2);
    font-family: 'Cinzel', serif; text-align: center; transition: all 0.15s;
  }
  .namegen-gender-btn:hover { border-color: var(--gold); color: var(--gold); }
  .namegen-gender-btn.active { background: rgba(201,168,76,0.15); border-color: var(--gold); color: var(--gold2); font-weight: 700; }

  .namegen-mood-wrap { padding: 4px 0 10px; }
  .namegen-mood-labels { display: flex; justify-content: space-between; font-size: 0.6rem; color: var(--text3); font-family: 'Cinzel', serif; margin-bottom: 4px; }
  .namegen-mood-slider { width: 100%; accent-color: var(--gold); cursor: pointer; }
  .namegen-mood-current { text-align: center; font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--gold); margin-top: 4px; }

  .namegen-generate-btn {
    width: 100%; padding: 12px; margin-top: 8px;
    background: linear-gradient(135deg, var(--gold), var(--gold2));
    border: none; border-radius: var(--radius);
    font-family: 'Cinzel', serif; font-size: 0.9rem; font-weight: 700;
    color: #1a1208; cursor: pointer; letter-spacing: 0.08em;
    transition: all 0.2s;
  }
  .namegen-generate-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(201,168,76,0.4); }

  .namegen-results-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border);
  }
  .namegen-results-title { font-family: 'Cinzel', serif; font-size: 0.75rem; color: var(--text3); letter-spacing: 0.08em; }

  .namegen-names-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .namegen-name-card {
    background: var(--surface2); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 10px 14px;
    display: flex; align-items: center; justify-content: space-between;
    transition: all 0.15s; cursor: pointer;
  }
  .namegen-name-card:hover { border-color: var(--gold); background: rgba(201,168,76,0.05); }
  .namegen-name-card.starred { border-color: var(--gold); background: rgba(201,168,76,0.1); }
  .namegen-name-text { font-family: 'Cinzel', serif; font-size: 0.95rem; color: var(--text); }
  .namegen-name-sub  { font-size: 0.65rem; color: var(--text3); margin-top: 2px; }
  .namegen-star-btn  { background: none; border: none; cursor: pointer; font-size: 1.1rem; padding: 2px 4px; color: var(--text3); transition: color 0.15s; }
  .namegen-star-btn:hover { color: var(--gold); }
  .namegen-star-btn.on { color: var(--gold); }

  .namegen-saved-section { margin-top: 20px; padding-top: 14px; border-top: 1px solid var(--border); }
  .namegen-saved-title { font-family: 'Cinzel', serif; font-size: 0.65rem; color: var(--text3); letter-spacing: 0.1em; margin-bottom: 8px; }
  .namegen-saved-item {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; margin: 3px; background: rgba(201,168,76,0.1);
    border: 1px solid var(--gold); border-radius: 12px;
    font-family: 'Cinzel', serif; font-size: 0.8rem; color: var(--gold2);
  }
  .namegen-saved-remove { background: none; border: none; cursor: pointer; color: var(--text3); font-size: 0.9rem; padding: 0 2px; }
  .namegen-saved-remove:hover { color: var(--red2); }

  .namegen-empty { text-align: center; color: var(--text3); font-style: italic; padding: 40px 20px; font-size: 0.85rem; }

  @media (max-width: 700px) {
    .namegen-layout { grid-template-columns: 1fr; }
    .namegen-controls { border-right: none; border-bottom: 1px solid var(--border); }
    .namegen-names-grid { grid-template-columns: 1fr; }
  }

    /* ─── Race & Class Picker ──────────────────────────────────────────────── */
  .rc-picker-btn {
    display: flex; align-items: center; gap: 6px; width: 100%;
    padding: 8px 10px; background: var(--surface2);
    border: 1px solid var(--border); border-radius: var(--radius);
    cursor: pointer; transition: all 0.15s; text-align: left;
  }
  .rc-picker-btn:hover { border-color: var(--gold); }
  .rc-picker-label { font-family:'Cinzel',serif; font-size:0.65rem; color:var(--text3); letter-spacing:0.08em; }
  .rc-picker-value { font-size:0.9rem; font-weight:600; color:var(--text); flex:1; }
  .rc-picker-chevron { color:var(--text3); font-size:0.7rem; }

  .rc-overlay-panel { max-width:700px; }
  @media (max-width: 800px) {
    .rc-grid { grid-template-columns: 1fr; height: auto; }
    .rc-list { border-right: none; border-bottom: 1px solid var(--border); max-height: 200px; overflow-y: auto; }
    .rc-detail { max-height: 50vh; overflow-y: auto; }
  }

  .rc-grid { display:grid; grid-template-columns:200px 1fr; gap:0; height:480px; overflow:hidden; }
  .rc-list { border-right:1px solid var(--border); overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .rc-list-item {
    padding:9px 14px; cursor:pointer; border-bottom:1px solid var(--border);
    font-size:0.85rem; transition:background 0.1s; display:flex; align-items:center; gap:8px;
  }
  .rc-list-item:hover { background:var(--surface2); }
  .rc-list-item.active { background:rgba(201,168,76,0.1); border-left:3px solid var(--gold); color:var(--gold2); font-weight:700; }
  .rc-detail { padding:14px 16px; overflow-y:auto; -webkit-overflow-scrolling:touch; }
  .rc-detail-name { font-family:'Cinzel',serif; font-size:1.1rem; font-weight:900; color:var(--gold2); margin-bottom:4px; }
  .rc-detail-sub { font-size:0.75rem; color:var(--text3); margin-bottom:10px; }
  .rc-detail-section { margin-bottom:10px; }
  .rc-detail-section-title { font-family:'Cinzel',serif; font-size:0.6rem; color:var(--text3); letter-spacing:0.1em; margin-bottom:5px; }
  .rc-trait { margin-bottom:5px; font-size:0.78rem; }
  .rc-trait-name { font-weight:700; color:var(--text); }
  .rc-trait-desc { color:var(--text2); line-height:1.4; }
  .rc-ab-bonus { display:flex; flex-wrap:wrap; gap:5px; }
  .rc-ab-chip {
    font-family:'Cinzel',serif; font-size:0.65rem; padding:2px 8px;
    border-radius:8px; border:1px solid var(--gold); color:var(--gold);
    background:rgba(201,168,76,0.1);
  }
  .rc-feature-level { margin-bottom:6px; }
  .rc-feature-lv-badge {
    font-family:'Cinzel',serif; font-size:0.6rem; color:var(--text3);
    letter-spacing:0.06em; margin-bottom:3px;
  }
  .rc-feature-item {
    font-size:0.75rem; color:var(--text2); padding:2px 0 2px 8px;
    border-left:2px solid var(--border);
  }
  .rc-slot-table { width:100%; border-collapse:collapse; font-size:0.7rem; }
  .rc-slot-table th { font-family:'Cinzel',serif; font-size:0.55rem; color:var(--text3); padding:3px 4px; border-bottom:1px solid var(--border); }
  .rc-slot-table td { text-align:center; padding:2px 4px; color:var(--text2); border-bottom:1px solid rgba(74,63,47,0.2); }
  .rc-slot-table tr.current-lv td { color:var(--gold); font-weight:700; background:rgba(201,168,76,0.08); }

  .rc-apply-btn {
    width:100%; margin-top:10px; padding:10px;
    background:linear-gradient(135deg,var(--gold),var(--gold2));
    border:none; border-radius:var(--radius);
    font-family:'Cinzel',serif; font-size:0.85rem; font-weight:700;
    color:#1a1208; cursor:pointer; letter-spacing:0.08em;
    transition:all 0.2s;
  }
  .rc-apply-btn:hover { transform:translateY(-1px); box-shadow:0 4px 16px rgba(201,168,76,0.4); }
  .rc-apply-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }

  .rc-auto-badge {
    font-size:0.6rem; padding:1px 6px; border-radius:8px;
    border:1px solid var(--green2); color:var(--green2);
    background:rgba(74,140,92,0.1); font-family:'Cinzel',serif;
    vertical-align:middle; margin-left:4px;
  }

  @media (max-width: 600px) {
    .grid-6 { grid-template-columns: repeat(3, 1fr); }
    .grid-3 { grid-template-columns: 1fr 1fr; }
  }

  /* ─── Tablet / touch optimisation (portrait, max 900px) ───────────────
     Attiva su schermi stretti indipendentemente dall'orientamento.       */
  @media (max-width: 1400px) {
    /* bump base font */
    .app { font-size: 16px; }

    input, select, textarea {
      font-size: 1rem !important;
      padding: 10px 12px !important;
      min-height: 44px;
    }
    .btn     { font-size: 0.9rem  !important; padding: 11px 18px !important; min-height: 46px; }
    .btn-sm  { font-size: 0.82rem !important; padding: 9px 13px  !important; min-height: 40px; }
    .tab-btn { font-size: 0.75rem !important; padding: 11px 12px !important; min-height: 46px; }

    .section-header { font-size: 0.78rem !important; padding: 11px 14px !important; }

    .ability-score { font-size: 1.6rem !important; }
    .ability-mod   { font-size: 1.05rem !important; }
    .ability-input { font-size: 1rem !important; min-height: 46px; }
    .ability-label { font-size: 0.7rem !important; }

    .skill-row   { padding: 9px 12px !important; min-height: 46px; }
    .skill-name  { font-size: 0.9rem !important; }
    .skill-bonus { font-size: 1rem !important; }

    .combatant-row { padding: 11px 14px !important; min-height: 54px; }

    .spell-name { font-size: 1rem !important; }
    .spell-card { padding: 11px 14px !important; }
    .spell-level-badge { font-size: 0.7rem !important; padding: 3px 8px !important; }

    .item-row-main { padding: 9px 12px !important; min-height: 50px; }
    .eq-name { font-size: 0.9rem !important; }

    .prestige-pip  { width: 32px !important; height: 32px !important; }
    .prestige-score-display { font-size: 2rem !important; }

    .monster-list-item { padding: 13px 15px !important; min-height: 54px; }
    .monster-list-name  { font-size: 1rem !important; }
    .monster-cr-badge   { font-size: 0.72rem !important; padding: 3px 8px !important; }

    .field label { font-size: 0.75rem !important; margin-bottom: 5px; }

    .header h1    { font-size: 1.15rem !important; }
    .header-tabs  { gap: 4px; }
  }

  /* Solo in portrait: colonna singola nei grid doppi */
  @media (max-width: 1400px) and (orientation: portrait) {
    .grid-2 { grid-template-columns: 1fr !important; }
  }
  /* ── Mobile bottom nav ── */
  .mobile-nav {
    display: none;
    position: fixed; bottom: 0; left: 0; right: 0;
    height: 58px;
    background: linear-gradient(180deg, #1c1810 0%, #0d0b08 100%);
    border-top: 2px solid var(--gold);
    z-index: 200;
    overflow-x: auto; overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .mobile-nav::-webkit-scrollbar { display: none; }
  .mobile-nav-inner {
    display: flex; height: 100%;
    min-width: max-content; padding: 0 6px;
  }
  .mobile-nav-btn {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    min-width: 66px; height: 100%;
    padding: 0 6px; background: none; border: none;
    cursor: pointer; font-family: 'Cinzel', serif;
    color: var(--text3); font-size: 0.58rem;
    letter-spacing: 0.04em; gap: 2px;
    transition: color 0.15s;
    -webkit-tap-highlight-color: transparent;
    border-top: 2px solid transparent;
  }
  .mobile-nav-btn .mnav-icon { font-size: 1.15rem; line-height: 1; }
  .mobile-nav-btn.active { color: var(--gold); border-top-color: var(--gold); }
  .mobile-nav-btn.active .mnav-icon {
    filter: drop-shadow(0 0 5px rgba(212,168,76,0.6));
  }

  @media (max-width: 768px) {
    .mobile-nav  { display: flex; }
    .header-tabs { display: none !important; }
    .main        { padding-bottom: 70px !important; }
  }

  /* ── Dadi flottanti (visibili da ogni tab) ── */
  .dice-fab {
    position: fixed; bottom: 34px; right: 10px; z-index: 8500;
    width: 46px; height: 46px; border-radius: 50%;
    background: var(--surface2); border: 1px solid var(--border2);
    color: var(--text); font-size: 1.25rem; cursor: pointer;
    box-shadow: 0 3px 14px rgba(0,0,0,0.55);
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.12s, border-color 0.12s;
  }
  .dice-fab:hover { transform: scale(1.08); border-color: var(--gold); }
  .dice-fab-last {
    position: absolute; top: -6px; right: -6px;
    background: var(--gold); color: #1a1610;
    font-size: 0.62rem; font-weight: 700; line-height: 1;
    min-width: 18px; padding: 3px 4px; border-radius: 9px;
    font-family: 'Cinzel', serif; text-align: center;
  }
  .dice-tray {
    position: fixed; bottom: 88px; right: 10px; z-index: 8500;
    width: 268px; max-width: calc(100vw - 20px);
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 10px; padding: 12px;
    box-shadow: 0 8px 30px rgba(0,0,0,0.6);
  }
  @media (max-width: 768px) {
    .dice-fab  { bottom: 68px; }
    .dice-tray { bottom: 122px; }
  }

`;



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




// ─── Name Generator ───────────────────────────────────────────────────────────
function NameGenerator() {
  const MOOD_LABELS = ["Eroico","Neutro","Ironico"];
  const MOOD_KEYS   = ["eroico","neutro","ironico"];

  // Categories
  const CATS = [
    { key:"races",    label:"🧬 Personaggi per Razza" },
    { key:"locali",   label:"🏠 Locali & Negozi" },
    { key:"luoghi",   label:"🗺 Luoghi" },
    { key:"epiteti",  label:"⚔ Epiteti & Soprannomi" },
    { key:"cognomi",  label:"🏰 Cognomi & Casate" },
    { key:"oggetti",  label:"✨ Oggetti Magici" },
    { key:"divinita", label:"🌟 Divinità & Culti" },
    { key:"gilde",    label:"🛡 Gilde & Organizzazioni" },
    { key:"navi",     label:"⛵ Navi" },
    { key:"cibi",     label:"🍺 Cibi & Bevande" },
  ];

  const [cat, setCat]         = React.useState("races");
  const [sub, setSub]         = React.useState(null);
  const [gender, setGender]   = React.useState("m");
  const [mood, setMood]       = React.useState(1); // 0=Eroico 1=Neutro 2=Ironico
  const [italianPct, setItalianPct] = React.useState(20); // % di nomi "italiani" nel mix
  const [fullName, setFullName] = React.useState(false);  // razze: aggiunge il cognome
  const [results, setResults] = React.useState([]);

  // Catalogo curato = NAMES_DB inline + categorie extra (navi, cibi)
  const NAMEDATA = React.useMemo(() => ({ ...NAMES_DB, ...EXTRA_CATEGORIES }), []);
  const [saved, setSaved]     = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_saved_names")) || "[]"); } catch { return []; }
  });

  // Persist saved names
  React.useEffect(() => {
    try { safeLsSet(userKey("dnd_saved_names"), JSON.stringify(saved)); } catch {}
  }, [saved]);

  // Mescola in modo uniforme (Fisher-Yates)
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // Conteggio reale dei nomi curati (per l'header)
  const totalCurated = React.useMemo(() => {
    let n = 0;
    const walk = (o) => { for (const v of Object.values(o)) { if (Array.isArray(v)) n += v.length; else if (v && typeof v === "object") walk(v); } };
    walk(NAMEDATA);
    return n;
  }, [NAMEDATA]);

  // Sub-options per category
  const subOptions = React.useMemo(() => {
    const data = NAMEDATA[cat];
    if (!data) return [];
    return Object.keys(data);
  }, [cat, NAMEDATA]);

  // Auto-select first sub when category changes
  React.useEffect(() => {
    if (subOptions.length > 0) setSub(subOptions[0]);
  }, [cat, subOptions.join(",")]);

  // Check if this category has gender
  const hasGender = React.useMemo(() => {
    if (!sub) return false;
    const entry = NAMEDATA[cat]?.[sub];
    if (!entry) return false;
    return "m" in entry || "f" in entry;
  }, [cat, sub]);

  // Check if has neutral gender (n)
  const hasNeutral = React.useMemo(() => {
    if (!sub) return false;
    const entry = NAMEDATA[cat]?.[sub];
    return entry && "n" in entry;
  }, [cat, sub]);

  // La razza selezionata ha il generatore fantasy procedurale?
  const fantasyOn = cat === "races" && !!sub && hasFantasy(sub);

  const generate = () => {
    const moodKey = MOOD_KEYS[mood];
    const moodLabel = MOOD_LABELS[mood];
    const subLabel = sub || cat;

    let items = []; // { name, sub }

    // Cognomi & casate: procedurale, niente liste curate
    if (cat === "cognomi") {
      const list = shuffle([
        ...generateSurnamesMixed(7).map(name => ({ name, sub: "cognome" })),
        ...generateHouses(3).map(name => ({ name, sub: "casata" })),
      ]);
      setResults(list.map((it, i) => ({ id: `${Date.now()}-${i}`, name: it.name, sub: it.sub })));
      return;
    }

    const catData = NAMEDATA[cat];
    if (!catData) return;

    if (cat === "races") {
      const raceData = catData[sub];
      if (!raceData) return;
      const gKey = hasNeutral ? "n" : gender;
      const gData = raceData[gKey];
      const italianPool = gData ? (gData[moodKey] || gData["neutro"] || Object.values(gData)[0] || []) : [];
      const gLabel = hasNeutral ? "neutro" : (gender === "m" ? "maschile" : "femminile");

      if (fantasyOn) {
        // Mix fantasy (maggioranza) + italiano (minoranza) secondo il dosaggio
        const nItalian = Math.round(10 * italianPct / 100);
        const nFantasy = 10 - nItalian;
        const fGender = hasNeutral ? (Math.random() < 0.5 ? "m" : "f") : gender;
        const fantasyNames = generateFantasyNames(sub, fGender, nFantasy);
        const italianNames = shuffle(italianPool).slice(0, Math.min(nItalian, italianPool.length));
        items = shuffle([
          ...fantasyNames.map(name => ({ name, sub: `${subLabel} · ${gLabel} · fantasy` })),
          ...italianNames.map(name => ({ name, sub: `${subLabel} · ${gLabel} · italiano` })),
        ]);
      } else {
        items = shuffle(italianPool).slice(0, 10).map(name => ({ name, sub: `${subLabel} · ${gLabel} · ${moodLabel}` }));
      }

      // Nome completo: aggiunge un cognome adatto alla razza
      if (fullName) items = items.map(it => ({ ...it, name: `${it.name} ${generateSurname(sub)}` }));
    } else if (cat === "epiteti" || cat === "oggetti" || cat === "divinita" || cat === "gilde" || cat === "navi") {
      const pool = catData[moodKey] || catData["neutro"] || [];
      items = shuffle(pool).slice(0, 10).map(name => ({ name, sub: `${subLabel} · ${moodLabel}` }));
    } else {
      const subData = catData[sub];
      if (!subData) return;
      const pool = subData[moodKey] || subData["neutro"] || [];
      items = shuffle(pool).slice(0, 10).map(name => ({ name, sub: `${subLabel} · ${moodLabel}` }));
    }

    if (!items.length) return;

    setResults(items.map((it, i) => ({ id: `${Date.now()}-${i}`, name: it.name, sub: it.sub })));
  };

  const toggleSave = (item) => {
    setSaved(s => s.find(x => x.name === item.name)
      ? s.filter(x => x.name !== item.name)
      : [...s, item]);
  };

  const isSaved = (name) => saved.some(x => x.name === name);

  const catLabel = CATS.find(c => c.key === cat)?.label || cat;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div className="section-header" style={{marginBottom:0}}>
        <span>GENERATORE DI NOMI</span>
        <span style={{fontSize:"0.65rem",color:"var(--text3)"}}>
          {saved.length > 0 ? `${saved.length} nomi salvati` : (fantasyOn ? "∞ generatore fantasy" : `${totalCurated} nomi`)}
        </span>
      </div>

      <div className="namegen-layout" style={{flex:1}}>
        {/* ── LEFT: Controls ── */}
        <div className="namegen-controls">

          {/* Category */}
          <div className="namegen-section">
            <div className="namegen-section-title">CATEGORIA</div>
            {CATS.map(c => (
              <button key={c.key}
                className={`namegen-cat-btn ${cat === c.key ? "active" : ""}`}
                onClick={() => setCat(c.key)}>
                {c.label}
              </button>
            ))}
          </div>

          {/* Sub-category */}
          {subOptions.length > 1 && (
            <div className="namegen-section">
              <div className="namegen-section-title">
                {cat === "races" ? "RAZZA" : "TIPO"}
              </div>
              <div>
                {subOptions.map(s => (
                  <button key={s}
                    className={`namegen-sub-btn ${sub === s ? "active" : ""}`}
                    onClick={() => setSub(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Gender (only for races) */}
          {cat === "races" && !hasNeutral && (
            <div className="namegen-section">
              <div className="namegen-section-title">GENERE</div>
              <div className="namegen-gender-row">
                {[["m","♂ Maschile"],["f","♀ Femminile"]].map(([g,lbl]) => (
                  <button key={g}
                    className={`namegen-gender-btn ${gender === g ? "active" : ""}`}
                    onClick={() => setGender(g)}>
                    {lbl}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Style dosing (solo razze col generatore fantasy) */}
          {fantasyOn && (
            <div className="namegen-section">
              <div className="namegen-section-title">STILE</div>
              <div className="namegen-mood-wrap">
                <div className="namegen-mood-labels">
                  <span>✨ Fantasy</span>
                  <span>🍝 Italiano</span>
                </div>
                <input type="range" min={0} max={100} step={10} value={italianPct}
                  className="namegen-mood-slider"
                  onChange={e => setItalianPct(+e.target.value)} />
                <div className="namegen-mood-current">{100 - italianPct}% fantasy · {italianPct}% italiano</div>
              </div>
            </div>
          )}

          {/* Nome completo (con cognome) — solo razze */}
          {cat === "races" && (
            <div className="namegen-section">
              <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:"0.8rem",color:"var(--text2)"}}>
                <input type="checkbox" checked={fullName} onChange={e => setFullName(e.target.checked)} />
                Nome completo (con cognome)
              </label>
            </div>
          )}

          {/* Mood slider */}
          <div className="namegen-section">
            <div className="namegen-section-title">TONO</div>
            <div className="namegen-mood-wrap">
              <div className="namegen-mood-labels">
                <span>⚔ Eroico</span>
                <span>😏 Ironico</span>
              </div>
              <input type="range" min={0} max={2} value={mood}
                className="namegen-mood-slider"
                onChange={e => setMood(+e.target.value)} />
              <div className="namegen-mood-current">{MOOD_LABELS[mood]}</div>
            </div>
          </div>

          {/* Generate button */}
          <button className="namegen-generate-btn" onClick={generate}>
            ✦ Genera 10 Nomi
          </button>
        </div>

        {/* ── RIGHT: Results ── */}
        <div className="namegen-results">
          {results.length === 0 && saved.length === 0 && (
            <div className="namegen-empty">
              Seleziona una categoria e premi<br />
              <strong>✦ Genera 10 Nomi</strong>
            </div>
          )}

          {results.length > 0 && (<>
            <div className="namegen-results-header">
              <span className="namegen-results-title">RISULTATI · {catLabel}</span>
              <button className="btn btn-sm" onClick={generate} title="Rigenera">↻ Rigenera</button>
            </div>
            <div className="namegen-names-grid">
              {results.map(item => (
                <div key={item.id}
                  className={`namegen-name-card ${isSaved(item.name) ? "starred" : ""}`}
                  onClick={() => toggleSave(item)}>
                  <div>
                    <div className="namegen-name-text">{item.name}</div>
                    <div className="namegen-name-sub">{item.sub}</div>
                  </div>
                  <button className={`namegen-star-btn ${isSaved(item.name) ? "on" : ""}`}
                    onClick={e => { e.stopPropagation(); toggleSave(item); }}>
                    {isSaved(item.name) ? "★" : "☆"}
                  </button>
                </div>
              ))}
            </div>
          </>)}

          {/* Saved names */}
          {saved.length > 0 && (
            <div className="namegen-saved-section">
              <div className="namegen-saved-title">NOMI SALVATI ({saved.length})</div>
              <div>
                {saved.map((item, i) => (
                  <span key={i} className="namegen-saved-item">
                    {item.name}
                    <button className="namegen-saved-remove"
                      onClick={() => setSaved(s => s.filter(x => x.name !== item.name))}>
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <button className="btn btn-sm btn-danger" style={{marginTop:10}}
                onClick={() => { if(window.confirm ? window.confirm("Cancellare tutti i nomi salvati?") : true) setSaved([]); }}>
                Cancella tutti
              </button>
            </div>
          )}
        </div>
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
        abilityScoreIncrease: r.ability
          ? r.ability.map(a => Object.entries(a).map(([k,v])=>`${k.toUpperCase()} +${v}`).join(", ")).join("; ")
          : "",
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
          languages: ir.languages || "Comune",
          abilityScoreIncrease: ir.abilityScoreIncrease || {},
          traits: ir.traits || [],
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
                  {Object.entries(sel.abilityBonuses).filter(([k])=>!k.startsWith("__")).map(([ab,v])=>(
                    <span key={ab} className="rc-ab-chip">{abLabels[ab]||ab} +{v}</span>
                  ))}
                  {Object.keys(sel.abilityBonuses).some(k=>k.startsWith("__")) && (
                    <span className="rc-ab-chip" style={{borderColor:"var(--text3)",color:"var(--text3)"}}>+1 a due a scelta</span>
                  )}
                </div>
              </div>

              {/* Languages */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">LINGUE</div>
                <div style={{fontSize:"0.78rem",color:"var(--text2)"}}>{sel.languages.join(", ")}</div>
              </div>

              {/* Resistances */}
              {sel.resistances.length > 0 && (
                <div className="rc-detail-section">
                  <div className="rc-detail-section-title">RESISTENZE</div>
                  <div style={{fontSize:"0.78rem",color:"var(--blue2)"}}>{sel.resistances.join(", ")}</div>
                </div>
              )}

              {/* Traits */}
              <div className="rc-detail-section">
                <div className="rc-detail-section-title">TRATTI RAZZIALI</div>
                {sel.traits.map((t,i)=>(
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

function CharacterSheet({ char, onChange, onDelete }) {
  const [tab, setTab] = useState("stats");
  const [showRacePicker, setShowRacePicker]   = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [showSubclassPicker, setShowSubclassPicker] = useState(false);
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
    Object.entries(raceData.abilityBonuses).forEach(([ab, bonus]) => {
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
      {showClassPicker && <ErrorBoundary><ClassPicker currentClass={char.class} currentLevel={char.level} onApply={applyClass} onClose={()=>setShowClassPicker(false)} /></ErrorBoundary>}

      {/* Character header */}
      <div className="section" style={{ marginBottom: 12 }}>
        <div className="section-content">
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
          <div className="grid-2" style={{ marginBottom: 10 }}>
            <div className="field">
              <label>Nome Personaggio</label>
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
            <div className="field"><label>Background</label><input value={char.background} onChange={e => update({ background: e.target.value })} /></div>
            <div className="field"><label>Allineamento</label><input value={char.alignment} onChange={e => update({ alignment: e.target.value })} /></div>

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
                  <input placeholder="Nome attacco" value={newAttack.name} onChange={e => setNewAttack(a => ({ ...a, name: e.target.value }))} />
                  <input placeholder="Bonus attacco (es +5)" value={newAttack.atkBonus} onChange={e => setNewAttack(a => ({ ...a, atkBonus: e.target.value }))} />
                  <input placeholder="Dado danno (es 1d8)" value={newAttack.dmgDice} onChange={e => setNewAttack(a => ({ ...a, dmgDice: e.target.value }))} />
                </div>
                <div className="grid-3" style={{ marginBottom: 10 }}>
                  <input placeholder="Bonus danno" value={newAttack.atkBonus2} onChange={e => setNewAttack(a => ({ ...a, dmgBonus: e.target.value }))} />
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
        const languages   = dbRace?.languages    ?? char.raceLanguages    ?? [];
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

            {features && (
              <div className="section">
                <div className="section-header">
                  <span>CARATTERISTICHE DI CLASSE</span>
                  <span style={{fontSize:"0.65rem",color:"var(--text3)"}}>fino a Lv{char.level}</span>
                </div>
                <div className="section-content">
                  {Object.entries(features)
                    .filter(([lv]) => +lv <= char.level)
                    .reverse()
                    .map(([lv, feats]) => feats.length ? (
                      <div key={lv} style={{marginBottom:8}}>
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:"0.6rem",color:"var(--text3)",letterSpacing:"0.08em",marginBottom:3}}>
                          LV {lv} {+lv === char.level && <span style={{color:"var(--gold)"}}>← attuale</span>}
                        </div>
                        {feats.map((f,i) => {
                          const fname = typeof f === "string" ? f : (f?.name || "");
                          const fdesc = typeof f === "string" ? "" : (typeof f?.desc === "string" ? f.desc : "");
                          return (
                            <div key={i} style={{fontSize:"0.78rem",color:"var(--text2)",paddingLeft:8,borderLeft:"2px solid var(--border)",marginBottom:2}}>
                              <strong>{fname}</strong>
                              {fdesc && <span style={{color:"var(--text3)",marginLeft:4,fontSize:"0.73rem"}}>{fdesc.length > 120 ? fdesc.slice(0,120)+"…" : fdesc}</span>}
                            </div>
                          );
                        })}
                      </div>
                    ) : null)}
                </div>
              </div>
            )}
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








function RulesModal({ onClose }) {
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


function SessionNotesPage({ characters }) {
  const TAG_TIPI = ["Evento","Deduzione","PNG","Luogo","Segreto","Altro"];
  const TAG_COLORS = {
    "Evento":    "#c0392b",
    "Deduzione": "#8e44ad",
    "PNG":       "#2980b9",
    "Luogo":     "#27ae60",
    "Segreto":   "#e67e22",
    "Altro":     "#555",
  };

  const [notes, setNotes] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_session_notes")) || "[]"); } catch { return []; }
  });
  const [sessione, setSessione] = React.useState(() => {
    try { return parseInt(localStorage.getItem(userKey("dnd_session_current")) || "1"); } catch { return 1; }
  });
  const [testo, setTesto]       = React.useState("");
  const [tagInput, setTagInput] = React.useState("");
  const [tagsNote, setTagsNote] = React.useState([]);
  const [filtroTags, setFiltroTags] = React.useState([]);
  const [filtroSess, setFiltroSess] = React.useState(null);
  const [editId, setEditId]     = React.useState(null);
  const [showForm, setShowForm] = React.useState(false);
  const textareaRef = React.useRef(null);

  React.useEffect(() => {
    try { safeLsSet(userKey("dnd_session_notes"), JSON.stringify(notes)); } catch {}
  }, [notes]);
  React.useEffect(() => {
    try { safeLsSet(userKey("dnd_session_current"), String(sessione)); } catch {}
  }, [sessione]);

  // tag suggeriti = tipi fissi + nomi personaggi + tag già usati
  const charNames = characters.map(c => c.name).filter(Boolean);
  const usedTags  = [...new Set(notes.flatMap(n => n.tags))];
  const allSuggest = [...new Set([...TAG_TIPI, ...charNames, ...usedTags])];

  const sessions = [...new Set(notes.map(n => n.sessione))].sort((a,b) => b - a);

  const filteredNotes = React.useMemo(() => {
    return notes.filter(n => {
      const matchSess = filtroSess === null || n.sessione === filtroSess;
      const matchTags = filtroTags.length === 0 || filtroTags.every(t => n.tags.includes(t));
      return matchSess && matchTags;
    }).sort((a,b) => b.ts - a.ts);
  }, [notes, filtroSess, filtroTags]);

  const addTag = (t) => {
    const tag = t.trim();
    if (tag && !tagsNote.includes(tag)) setTagsNote(p => [...p, tag]);
    setTagInput("");
  };
  const removeTag = (t) => setTagsNote(p => p.filter(x => x !== t));

  const toggleFiltro = (t) => setFiltroTags(p => p.includes(t) ? p.filter(x=>x!==t) : [...p, t]);

  const openNew = () => {
    setEditId(null);
    setTesto("");
    setTagsNote([]);
    setTagInput("");
    setShowForm(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const openEdit = (note) => {
    setEditId(note.id);
    setTesto(note.testo);
    setTagsNote([...note.tags]);
    setTagInput("");
    setShowForm(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const saveNote = () => {
    if (!testo.trim()) return;
    if (editId) {
      setNotes(p => p.map(n => n.id === editId
        ? { ...n, testo: testo.trim(), tags: tagsNote, editedTs: Date.now() }
        : n));
    } else {
      setNotes(p => [{ id: Date.now().toString(), testo: testo.trim(),
        tags: tagsNote, sessione, ts: Date.now() }, ...p]);
    }
    setShowForm(false);
    setTesto(""); setTagsNote([]); setEditId(null);
  };

  const deleteNote = (id) => {
    if (confirm("Eliminare questa nota?")) setNotes(p => p.filter(n => n.id !== id));
  };

  const tagColor = (t) => TAG_COLORS[t] || "var(--border2)";

  const fmtDate = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString("it-IT",{day:"2-digit",month:"2-digit"})
      + " " + d.toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* ── HEADER ── */}
      <div className="section-header" style={{marginBottom:0,flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{color:"var(--gold)",fontSize:"1.05rem",fontWeight:700}}>📓 Note di Sessione</span>
          <div style={{display:"flex",alignItems:"center",gap:6,
            background:"var(--surface2)",borderRadius:6,padding:"4px 10px",border:"1px solid var(--border)"}}>
            <span style={{fontSize:"0.75rem",color:"var(--text3)"}}>Sessione</span>
            <button onClick={()=>setSessione(s=>Math.max(1,s-1))}
              style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:"1rem",lineHeight:1,padding:"0 2px"}}>‹</button>
            <span style={{fontWeight:700,color:"var(--gold)",minWidth:20,textAlign:"center",fontSize:"0.95rem"}}>{sessione}</span>
            <button onClick={()=>setSessione(s=>s+1)}
              style={{background:"none",border:"none",color:"var(--text2)",cursor:"pointer",fontSize:"1rem",lineHeight:1,padding:"0 2px"}}>›</button>
          </div>
        </div>
        <button className="btn btn-primary" onClick={openNew}
          style={{fontSize:"0.82rem",padding:"7px 14px"}}>
          + Nuova nota
        </button>
      </div>

      {/* ── FILTRI ── */}
      <div style={{padding:"8px 14px",borderBottom:"1px solid var(--border)",flexShrink:0,
        display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
        {/* filtro sessione */}
        <button onClick={()=>setFiltroSess(null)}
          style={{padding:"3px 9px",borderRadius:12,fontSize:"0.75rem",cursor:"pointer",
            background: filtroSess===null ? "var(--gold)" : "var(--surface2)",
            color: filtroSess===null ? "#1a1208" : "var(--text2)",
            border:`1px solid ${filtroSess===null ? "var(--gold)" : "var(--border)"}`,fontWeight:600}}>
          Tutte
        </button>
        {sessions.map(s => (
          <button key={s} onClick={()=>setFiltroSess(filtroSess===s ? null : s)}
            style={{padding:"3px 9px",borderRadius:12,fontSize:"0.75rem",cursor:"pointer",
              background: filtroSess===s ? "var(--gold)" : "var(--surface2)",
              color: filtroSess===s ? "#1a1208" : "var(--text2)",
              border:`1px solid ${filtroSess===s ? "var(--gold)" : "var(--border)"}`,fontWeight:600}}>
            S{s}
          </button>
        ))}
        {sessions.length > 0 && <span style={{color:"var(--border2)",fontSize:"0.8rem"}}>|</span>}
        {/* filtro tag */}
        {[...new Set(notes.flatMap(n=>n.tags))].map(t => (
          <button key={t} onClick={()=>toggleFiltro(t)}
            style={{padding:"3px 9px",borderRadius:12,fontSize:"0.75rem",cursor:"pointer",
              background: filtroTags.includes(t) ? tagColor(t) : "var(--surface2)",
              color: filtroTags.includes(t) ? "#fff" : "var(--text2)",
              border:`1px solid ${filtroTags.includes(t) ? tagColor(t) : "var(--border)"}`,fontWeight:600}}>
            {t}
          </button>
        ))}
      </div>

      {/* ── FORM NUOVA/MODIFICA NOTA ── */}
      {showForm && (
        <div style={{padding:"12px 14px",borderBottom:"1px solid var(--border)",
          background:"var(--surface2)",flexShrink:0}}>
          <textarea ref={textareaRef} value={testo}
            onChange={e=>setTesto(e.target.value)}
            placeholder="Scrivi la nota..."
            rows={3}
            style={{width:"100%",boxSizing:"border-box",resize:"vertical",
              background:"var(--surface)",border:"1px solid var(--border)",
              borderRadius:6,color:"var(--text)",fontSize:"0.9rem",
              padding:"8px 10px",outline:"none",fontFamily:"inherit",lineHeight:1.5}}
          />
          {/* tag selezionati */}
          <div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:7,marginBottom:7}}>
            {tagsNote.map(t => (
              <span key={t} style={{
                padding:"3px 8px",borderRadius:10,fontSize:"0.75rem",fontWeight:600,
                background:tagColor(t),color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",gap:4,
              }} onClick={()=>removeTag(t)}>
                {t} ✕
              </span>
            ))}
          </div>
          {/* input tag + suggerimenti */}
          <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
            <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
              onKeyDown={e=>{ if(e.key==="Enter"||e.key===","){ e.preventDefault(); addTag(tagInput); }}}
              placeholder="+ tag (Invio per aggiungere)"
              style={{flex:"1 1 120px",padding:"5px 9px",background:"var(--surface)",
                border:"1px solid var(--border)",borderRadius:5,color:"var(--text)",fontSize:"0.8rem",outline:"none"}}
            />
            {allSuggest.filter(s=>!tagsNote.includes(s)&&s.toLowerCase().includes(tagInput.toLowerCase()))
              .slice(0,8).map(s => (
              <button key={s} onClick={()=>addTag(s)}
                style={{padding:"3px 8px",borderRadius:10,fontSize:"0.73rem",cursor:"pointer",
                  background:"var(--surface)",border:`1px solid ${tagColor(s)}`,
                  color:tagColor(s),fontWeight:600}}>
                {s}
              </button>
            ))}
          </div>
          <div style={{display:"flex",gap:8,marginTop:10}}>
            <button className="btn btn-primary" onClick={saveNote}
              style={{fontSize:"0.82rem",padding:"7px 18px"}}>
              {editId ? "Salva modifiche" : "Aggiungi nota"}
            </button>
            <button className="btn" onClick={()=>{setShowForm(false);setEditId(null);}}
              style={{fontSize:"0.82rem",padding:"7px 14px"}}>
              Annulla
            </button>
          </div>
        </div>
      )}

      {/* ── LISTA NOTE ── */}
      <div style={{flex:1,overflowY:"auto",padding:"10px 14px"}}>
        {filteredNotes.length === 0 && (
          <div style={{textAlign:"center",color:"var(--text3)",marginTop:48,fontSize:"0.9rem"}}>
            {notes.length === 0
              ? "Nessuna nota ancora. Inizia a scrivere!"
              : "Nessuna nota corrisponde ai filtri selezionati."}
          </div>
        )}
        {filteredNotes.map(note => (
          <div key={note.id} style={{
            background:"var(--surface2)",borderRadius:8,padding:"10px 12px",
            marginBottom:8,border:"1px solid var(--border)",
          }}>
            {/* meta riga */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                <span style={{padding:"2px 7px",borderRadius:10,fontSize:"0.7rem",fontWeight:700,
                  background:"rgba(180,140,50,0.15)",color:"var(--gold)",border:"1px solid var(--border)"}}>
                  S{note.sessione}
                </span>
                {note.tags.map(t => (
                  <span key={t} onClick={()=>toggleFiltro(t)}
                    style={{padding:"2px 7px",borderRadius:10,fontSize:"0.7rem",fontWeight:700,
                      background:tagColor(t),color:"#fff",cursor:"pointer"}}>
                    {t}
                  </span>
                ))}
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center"}}>
                <span style={{fontSize:"0.68rem",color:"var(--text3)"}}>{fmtDate(note.ts)}</span>
                <button onClick={()=>openEdit(note)}
                  style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",
                    fontSize:"0.8rem",padding:"2px 4px"}}>✏</button>
                <button onClick={()=>deleteNote(note.id)}
                  style={{background:"none",border:"none",color:"var(--text3)",cursor:"pointer",
                    fontSize:"0.8rem",padding:"2px 4px"}}>🗑</button>
              </div>
            </div>
            {/* testo */}
            <div style={{fontSize:"0.88rem",color:"var(--text)",lineHeight:1.6,whiteSpace:"pre-wrap"}}>
              {note.testo}
            </div>
            {note.editedTs && (
              <div style={{fontSize:"0.67rem",color:"var(--text3)",marginTop:4}}>
                modificata {fmtDate(note.editedTs)}
              </div>
            )}
          </div>
        ))}
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
const TERRAIN_MONSTER_TYPES = {
  "Dungeon":       ["Non morto","Costrutto","Aberrazione","Umanoide","Demonio"],
  "Foresta":       ["Bestia","Fata","Umanoide","Pianta","Drago"],
  "Pianura":       ["Bestia","Umanoide","Gigante","Drago"],
  "Montagna":      ["Gigante","Drago","Umanoide","Bestia"],
  "Palude":        ["Non morto","Bestia","Umanoide","Demonio"],
  "Grotta":        ["Bestia","Aberrazione","Non morto","Umanoide"],
  "Mare / Costa":  ["Bestia","Umanoide","Elementale"],
  "Città":         ["Umanoide","Costrutto","Non morto"],
  "Sottosuolo":    ["Aberrazione","Non morto","Umanoide","Costrutto"],
  "Deserto":       ["Bestia","Non morto","Umanoide","Elementale"],
  "Tundra":        ["Bestia","Gigante","Non morto","Umanoide"],
  "Piano Infernale":["Demonio","Non morto","Umanoide"],
  "Qualsiasi":     null,
};

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
    const types = TERRAIN_MONSTER_TYPES[terrain];
    const maxCr = partyLevel + 3;
    const minCr = Math.max(0, partyLevel - 5);
    return allMonsters.filter(m => {
      const cr = crToNum(m.cr);
      if (cr > maxCr || cr < minCr) return false;
      if (types && !types.some(t => (m.type||"").toLowerCase().includes(t.toLowerCase()))) return false;
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
      // pick 1–4 random monster types from pool
      const numTypes = 1 + Math.floor(Math.random()*Math.min(3,pool.length));
      const shuffled = [...pool].sort(()=>Math.random()-0.5).slice(0,numTypes);
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

// ─── SpellsPage ────────────────────────────────────────────────────────────────
function SpellsPage() {
  const [query, setQuery]           = React.useState("");
  const [levelFilter, setLevelFilter] = React.useState("");
  const [schoolFilter, setSchoolFilter] = React.useState("");
  const [classFilter, setClassFilter] = React.useState("");
  const [selected, setSelected]     = React.useState(null);

  // Carica gli incantesimi importati UNA volta (non a ogni render: con "Importa
  // tutti" sono ~525, ri-parsare ~1MB a ogni tasto bloccava la ricerca).
  const importedSpells = React.useMemo(() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_spells")) || "[]"); } catch { return []; }
  }, []);
  // Unisce inline (IT) + importati (EN) deduplicando per slug: la versione
  // italiana inline vince. Evita chiavi React duplicate (es. "fireball" =
  // "Palla di Fuoco" inline + "Fireball" importato) che rompevano la lista.
  const allSpells = React.useMemo(() => {
    const map = new Map();
    for (const s of [...SPELLS_DB, ...importedSpells]) {
      const k = s.slug || s.name;
      if (!map.has(k)) map.set(k, s);
    }
    return [...map.values()];
  }, [importedSpells]);

  const schools = React.useMemo(() => [...new Set(allSpells.map(s => s.school).filter(Boolean))].sort(), [allSpells]);
  const classes = React.useMemo(() => [...new Set(allSpells.flatMap(s => s.classes ? s.classes.split(",").map(c=>c.trim()) : []).filter(Boolean))].sort(), [allSpells]);

  const results = React.useMemo(() => allSpells.filter(sp => {
    // Ponte EN↔IT: cerca anche nello slug inglese (es. "fireball" → Palla di Fuoco)
    if (query) {
      const q = searchNorm(query);
      const hay = searchNorm(`${sp.name || ""} ${deSlug(sp.slug)}`);
      if (!hay.includes(q)) return false;
    }
    if (levelFilter !== "" && sp.level !== parseInt(levelFilter)) return false;
    if (schoolFilter && sp.school !== schoolFilter) return false;
    if (classFilter && !(sp.classes || "").toLowerCase().includes(classFilter.toLowerCase())) return false;
    return true;
  }), [allSpells, query, levelFilter, schoolFilter, classFilter]);
  const MAX_SHOWN = 200;
  const shown = results.slice(0, MAX_SHOWN);

  const schoolEmoji = { Evocation:"🔥", Abjuration:"🛡", Conjuration:"✨", Divination:"🔮",
    Enchantment:"💫", Illusion:"👁", Necromancy:"💀", Transmutation:"⚗" };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>

      {/* filtri */}
      <div style={{padding:"10px 12px",borderBottom:"1px solid var(--border)",display:"flex",gap:8,flexWrap:"wrap",flexShrink:0}}>
        <input placeholder="🔍 Cerca incantesimo..." value={query}
          onChange={e=>{setQuery(e.target.value);setSelected(null);}}
          style={{flex:"1 1 160px",minWidth:120}} />
        <select value={levelFilter} onChange={e=>{setLevelFilter(e.target.value);setSelected(null);}} style={{width:90}}>
          <option value="">Tutti i liv.</option>
          {[0,1,2,3,4,5,6,7,8,9].map(l=><option key={l} value={l}>{l===0?"Trucchi":`Liv. ${l}`}</option>)}
        </select>
        <select value={schoolFilter} onChange={e=>{setSchoolFilter(e.target.value);setSelected(null);}} style={{width:110}}>
          <option value="">Tutte le scuole</option>
          {schools.map(s=><option key={s} value={s}>{schoolEmoji[s]||"✦"} {s}</option>)}
        </select>
        <select value={classFilter} onChange={e=>{setClassFilter(e.target.value);setSelected(null);}} style={{width:110}}>
          <option value="">Tutte le classi</option>
          {classes.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{fontSize:"0.7rem",color:"var(--text3)",alignSelf:"center",whiteSpace:"nowrap"}}>
          {results.length} / {allSpells.length}
          {results.length > MAX_SHOWN ? ` (mostro ${MAX_SHOWN})` : ""}
          {importedSpells.length > 0 ? ` · +${importedSpells.length} imp.` : ""}
        </span>
      </div>

      {/* lista + dettaglio */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* lista */}
        <div style={{flex:"0 0 280px",overflowY:"auto",borderRight:"1px solid var(--border)"}}>
          {results.length === 0 && (
            <div style={{padding:24,textAlign:"center",color:"var(--text3)",fontSize:"0.85rem"}}>
              Nessun incantesimo trovato
            </div>
          )}
          {shown.map(sp => (
            <div key={sp.slug || sp.name} onClick={()=>setSelected(selected?.slug===sp.slug ? null : sp)}
              style={{padding:"9px 12px",borderBottom:"1px solid var(--border)",cursor:"pointer",
                background: selected?.slug===sp.slug ? "var(--surface2)" : "transparent",
                borderLeft: selected?.slug===sp.slug ? "3px solid var(--gold)" : "3px solid transparent"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:6}}>
                <span style={{fontWeight:600,fontSize:"0.85rem",color:"var(--gold2)",
                  fontFamily:"'Cinzel',serif",lineHeight:1.2}}>
                  {schoolEmoji[sp.school]||"✦"} {sp.name}
                </span>
                <span className="spell-level-badge" style={{flexShrink:0}}>
                  {sp.level===0?"Trucco":`${sp.level}°`}
                </span>
              </div>
              <div style={{fontSize:"0.7rem",color:"var(--text3)",marginTop:2}}>
                {sp.school}{sp.classes ? ` • ${sp.classes}` : ""}
              </div>
            </div>
          ))}
        </div>

        {/* dettaglio */}
        <div style={{flex:1,overflowY:"auto",padding:"16px"}}>
          {!selected && (
            <div style={{textAlign:"center",color:"var(--text3)",fontSize:"0.85rem",marginTop:40}}>
              Seleziona un incantesimo per vedere i dettagli
            </div>
          )}
          {selected && (
            <div>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12,gap:8}}>
                <div>
                  <div style={{fontSize:"1.15rem",fontWeight:700,color:"var(--gold)",
                    fontFamily:"'Cinzel',serif",marginBottom:4}}>
                    {schoolEmoji[selected.school]||"✦"} {selected.name}
                  </div>
                  <div style={{fontSize:"0.78rem",color:"var(--text3)"}}>
                    {selected.level===0?"Trucco":selected.level===1?"Incantesimo di 1° livello":`Incantesimo di ${selected.level}° livello`}
                    {selected.school ? ` — ${selected.school}` : ""}
                  </div>
                </div>
                <span className="spell-level-badge" style={{fontSize:"0.8rem",padding:"4px 10px"}}>
                  {selected.level===0?"Trucco":`Liv. ${selected.level}`}
                </span>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"6px 16px",
                background:"var(--surface2)",borderRadius:8,padding:"10px 12px",marginBottom:14,
                fontSize:"0.78rem"}}>
                {[
                  ["Tempo di lancio", selected.castingTime],
                  ["Gittata",         selected.range],
                  ["Componenti",      selected.components],
                  ["Durata",         selected.duration],
                  ...(selected.classes ? [["Classi", selected.classes]] : []),
                  ...(selected.source  ? [["Fonte",  selected.source]]  : []),
                ].map(([k,v]) => v ? (
                  <div key={k}>
                    <span style={{color:"var(--text3)",textTransform:"uppercase",
                      fontSize:"0.62rem",letterSpacing:"0.08em"}}>{k}</span>
                    <div style={{color:"var(--text)",fontWeight:600,marginTop:1}}>{v}</div>
                  </div>
                ) : null)}
              </div>

              {selected.desc && (
                <div style={{fontSize:"0.85rem",color:"var(--text2)",lineHeight:1.65,
                  whiteSpace:"pre-wrap",marginBottom:12}}>
                  {selected.desc}
                </div>
              )}
              {selected.higherLevel && (
                <div style={{fontSize:"0.82rem",color:"var(--blue2)",fontStyle:"italic",
                  borderTop:"1px solid var(--border)",paddingTop:10}}>
                  <strong style={{color:"var(--blue2)",fontStyle:"normal"}}>A livelli più alti: </strong>
                  {selected.higherLevel}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShopPage() {
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

function DescriptionsPage() {
  const [tone, setTone] = React.useState("classic");
  const [activeCategory, setActiveCategory] = React.useState("luoghi");
  const [activeSub, setActiveSub] = React.useState("foresta");
  const [picks, setPicks] = React.useState([]);
  const [scene, setScene] = React.useState([]);
  const [copied, setCopied] = React.useState(null);

  // DETAILS_DB inline + toni extra (sfarzoso/inquietante) mergiati per sotto-categoria
  const DETAILS = React.useMemo(() => {
    const out = {};
    for (const [ck, cat] of Object.entries(DETAILS_DB)) {
      out[ck] = { ...cat, sub: {} };
      for (const [sk, sub] of Object.entries(cat.sub)) {
        out[ck].sub[sk] = { ...sub, ...(DETAILS_EXTRA[ck]?.[sk] || {}) };
      }
    }
    return out;
  }, []);

  const TONES = [
    ["classic", "☀ Classico"],
    ["dark", "🌑 Cupo"],
    ["sfarzoso", "👑 Sfarzoso"],
    ["steampunk", "⚙ Steampunk"],
  ];
  const TONE_COLORS = {
    classic:   { accent: "var(--gold)", bg: "rgba(180,140,50,0.10)", border: "var(--gold)",            label: "classico" },
    dark:      { accent: "#d46060",     bg: "rgba(120,20,20,0.18)",  border: "rgba(200,60,60,0.45)",   label: "cupo" },
    sfarzoso:  { accent: "#c9a13b",     bg: "rgba(150,110,30,0.16)", border: "rgba(210,170,70,0.55)",  label: "sfarzoso" },
    steampunk: { accent: "#c98a3a",     bg: "rgba(150,95,40,0.18)",  border: "rgba(190,130,70,0.55)",  label: "steampunk" },
  };

  // Lista dei dettagli per un tono. Il tono "Cupo" unisce dark (DETAILS_DB) + inquietante (extra).
  const listFor = (sub, t) => {
    if (!sub) return [];
    if (t === "dark") return [...(sub.dark || []), ...(sub.inquietante || [])];
    return sub[t] || [];
  };

  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };

  React.useEffect(() => {
    const subs = Object.keys(DETAILS[activeCategory]?.sub || {});
    if (subs.length > 0) setActiveSub(subs[0]);
    setPicks([]); setScene([]);
  }, [activeCategory, DETAILS]);

  const currentSub = DETAILS[activeCategory]?.sub[activeSub];
  const currentList = listFor(currentSub, tone);

  const rollRandom = () => {
    if (currentList.length === 0) return;
    setScene([]);
    setPicks(shuffle(currentList).slice(0, 3));
  };

  // Componi scena: un dettaglio da ogni categoria ambientale, nel tono corrente
  // (fallback su 'classic' dove il tono non è ancora disponibile).
  const SCENE_CATS = ["luoghi", "architettura", "meteo", "suoni", "oggetti"];
  const composeScene = () => {
    setPicks([]);
    const parts = [];
    for (const ck of SCENE_CATS) {
      const cat = DETAILS[ck]; if (!cat) continue;
      const subKeys = Object.keys(cat.sub);
      const sk = subKeys[Math.floor(Math.random() * subKeys.length)];
      let list = listFor(cat.sub[sk], tone);
      if (!list.length) list = cat.sub[sk].classic || [];
      if (!list.length) continue;
      const it = list[Math.floor(Math.random() * list.length)];
      parts.push({ catLabel: cat.label, subLabel: cat.sub[sk].label, key: it.key, note: it.note });
    }
    setScene(parts);
  };

  const copyText = (text) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(text);
    setTimeout(() => setCopied(null), 1500);
  };

  const isDark = tone === "dark";
  const accentColor = TONE_COLORS[tone].accent;
  const cardBg = TONE_COLORS[tone].bg;
  const cardBorder = TONE_COLORS[tone].border;

  return (
    <div style={{display:"flex",height:"calc(100vh - 120px)",gap:0,overflow:"hidden"}}>

      {/* ── Sidebar ── */}
      <div style={{
        width:200, flexShrink:0,
        borderRight:"1px solid var(--border)",
        overflowY:"auto",
        background:"var(--surface)",
        padding:"10px 0",
      }}>
        {/* Tone toggle */}
        <div style={{padding:"10px 14px 14px",borderBottom:"1px solid var(--border)",marginBottom:6}}>
          <div style={{
            fontSize:"0.72rem",fontFamily:"'Cinzel',serif",
            color:"var(--text3)",letterSpacing:"0.1em",marginBottom:8
          }}>TONO</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {TONES.map(([t,label]) => (
              <button key={t}
                onClick={()=>setTone(t)}
                style={{
                  flex:"1 1 calc(50% - 3px)", padding:"5px 4px",
                  fontSize:"0.78rem", fontFamily:"'Cinzel',serif",
                  cursor:"pointer", borderRadius:4,
                  border: `1px solid ${tone===t ? TONE_COLORS[t].accent : "var(--border)"}`,
                  background: tone===t ? TONE_COLORS[t].accent : "var(--surface2)",
                  color: tone===t ? "#1a1208" : "var(--text2)",
                  fontWeight: tone===t ? 700 : 400,
                  transition:"all 0.15s",
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Category tree */}
        {Object.entries(DETAILS).map(([catKey, cat]) => (
          <div key={catKey}>
            <div
              onClick={()=>setActiveCategory(catKey)}
              style={{
                padding:"9px 14px", cursor:"pointer",
                fontSize:"0.85rem", fontWeight:700,
                fontFamily:"'Cinzel',serif", letterSpacing:"0.03em",
                background: activeCategory===catKey ? "var(--surface3)" : "transparent",
                color: activeCategory===catKey ? "var(--gold)" : "var(--text)",
                borderLeft: `3px solid ${activeCategory===catKey ? "var(--gold)" : "transparent"}`,
                transition:"all 0.12s",
              }}>
              {cat.label}
            </div>
            {activeCategory===catKey && Object.entries(cat.sub).map(([subKey, sub]) => (
              <div key={subKey}
                onClick={()=>{ setActiveSub(subKey); setPicks([]); }}
                style={{
                  padding:"7px 14px 7px 26px", cursor:"pointer",
                  fontSize:"0.82rem",
                  background: activeSub===subKey ? "var(--surface2)" : "transparent",
                  color: activeSub===subKey ? "var(--text)" : "var(--text2)",
                  borderLeft: `3px solid ${activeSub===subKey ? "var(--gold)" : "transparent"}`,
                  transition:"all 0.12s",
                }}>
                {sub.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* ── Main area ── */}
      <div style={{flex:1, overflowY:"auto", padding:"20px 24px"}}>

        {/* Header row */}
        <div style={{display:"flex",alignItems:"center",gap:16,marginBottom:20,flexWrap:"wrap"}}>
          <div>
            <div style={{
              fontFamily:"'Cinzel',serif", fontSize:"1.1rem",
              color:"var(--gold)", fontWeight:700, letterSpacing:"0.03em"
            }}>
              {DETAILS[activeCategory]?.label}
              <span style={{color:"var(--text3)",margin:"0 8px",fontWeight:400}}>·</span>
              {currentSub?.label}
            </div>
            <div style={{fontSize:"0.82rem",color:"var(--text3)",marginTop:4}}>
              {currentList.length} dettagli · tono <em style={{color:"var(--text2)"}}>{TONE_COLORS[tone].label}</em>
            </div>
          </div>
          <button
            onClick={composeScene}
            style={{
              marginLeft:"auto", padding:"9px 18px",
              fontSize:"0.9rem", fontFamily:"'Cinzel',serif",
              fontWeight:700, letterSpacing:"0.04em",
              cursor:"pointer", borderRadius:6,
              background:"transparent", color:accentColor,
              border:`1px solid ${accentColor}`, transition:"opacity 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.8"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}
            title="Compone una scena pescando da luogo, architettura, meteo, suoni/odori, oggetti">
            🎬 Componi scena
          </button>
          <button
            onClick={rollRandom}
            style={{
              marginLeft:10, padding:"9px 20px",
              fontSize:"0.9rem", fontFamily:"'Cinzel',serif",
              fontWeight:700, letterSpacing:"0.04em",
              cursor:"pointer", borderRadius:6,
              background:"var(--gold)", color:"#1a1208",
              border:"none", transition:"opacity 0.15s",
            }}
            onMouseEnter={e=>e.currentTarget.style.opacity="0.85"}
            onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            🎲 3 spunti casuali
          </button>
        </div>

        {/* Scena composta */}
        {scene.length > 0 && (
          <div style={{marginBottom:28}}>
            <div style={{fontSize:"0.72rem",fontFamily:"'Cinzel',serif",color:"var(--text3)",letterSpacing:"0.12em",marginBottom:12}}>
              SCENA COMPOSTA · tono {TONE_COLORS[tone].label}
            </div>
            <div onClick={()=>copyText(scene.map(p=>`${p.subLabel}: ${p.key} — ${p.note}`).join("\n"))}
              style={{padding:"16px 18px",borderRadius:8,cursor:"pointer",background:cardBg,border:`1px solid ${cardBorder}`,boxShadow:"0 2px 12px rgba(0,0,0,0.3)"}}>
              {scene.map((p,i)=>(
                <div key={i} style={{marginBottom: i<scene.length-1?10:0}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"0.68rem",color:accentColor,letterSpacing:"0.06em"}}>{p.subLabel.toUpperCase()}</span>
                  <div style={{fontSize:"0.9rem",color:"var(--text)",lineHeight:1.5}}>
                    <strong style={{color:accentColor}}>{p.key}</strong> — {p.note}
                  </div>
                </div>
              ))}
              <div style={{fontSize:"0.72rem",color:"var(--text3)",marginTop:10}}>tocca per copiare l'intera scena</div>
            </div>
          </div>
        )}

        {/* Random picks */}
        {picks.length > 0 && (
          <div style={{marginBottom:28}}>
            <div style={{
              fontSize:"0.72rem", fontFamily:"'Cinzel',serif",
              color:"var(--text3)", letterSpacing:"0.12em", marginBottom:12
            }}>
              SPUNTI CASUALI
            </div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {picks.map((p,i) => {
                const key = `${p.key} — ${p.note}`;
                const isCopied = copied === key;
                return (
                  <div key={i}
                    onClick={() => copyText(key)}
                    style={{
                      flex:"1 1 220px", padding:"14px 18px",
                      borderRadius:8, cursor:"pointer",
                      background: cardBg,
                      border:`1px solid ${isCopied ? "var(--gold2)" : cardBorder}`,
                      opacity: isCopied ? 0.7 : 1,
                      transition:"all 0.15s",
                      boxShadow: isCopied ? "none" : "0 2px 12px rgba(0,0,0,0.3)",
                    }}>
                    <div style={{
                      fontFamily:"'Cinzel',serif", fontSize:"0.95rem",
                      fontWeight:700, color:accentColor, marginBottom:6
                    }}>
                      {p.key}
                    </div>
                    <div style={{fontSize:"0.88rem",color:"var(--text)",lineHeight:1.6}}>
                      {p.note}
                    </div>
                    <div style={{fontSize:"0.72rem",color:"var(--text3)",marginTop:8}}>
                      {isCopied ? "✓ copiato" : "tocca per copiare"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Full list */}
        <div style={{
          fontSize:"0.72rem", fontFamily:"'Cinzel',serif",
          color:"var(--text3)", letterSpacing:"0.12em", marginBottom:12
        }}>
          LISTA COMPLETA
        </div>
        {currentList.length === 0 && (
          <div style={{color:"var(--text3)",fontStyle:"italic",fontSize:"0.85rem",padding:"6px 0",lineHeight:1.5}}>
            Nessun dettaglio per il tono <em>{TONE_COLORS[tone].label}</em> in questa sotto-categoria.
          </div>
        )}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
          {currentList.map((item, i) => {
            const key = `${item.key} — ${item.note}`;
            const isCopied = copied === key;
            return (
              <div key={i}
                onClick={() => copyText(key)}
                onMouseEnter={e => e.currentTarget.style.borderColor = accentColor}
                onMouseLeave={e => e.currentTarget.style.borderColor = isCopied ? accentColor : "var(--border)"}
                style={{
                  padding:"11px 14px", borderRadius:6, cursor:"pointer",
                  background:"var(--surface2)",
                  border:`1px solid ${isCopied ? accentColor : "var(--border)"}`,
                  transition:"border-color 0.15s",
                  lineHeight:1.5,
                }}>
                <span style={{
                  fontFamily:"'Cinzel',serif", fontSize:"0.85rem",
                  fontWeight:700, color:accentColor
                }}>
                  {item.key}
                </span>
                <span style={{color:"var(--border2)",margin:"0 8px",fontSize:"0.8rem"}}>·</span>
                <span style={{fontSize:"0.85rem",color:"var(--text2)"}}>
                  {item.note}
                </span>
                {isCopied && (
                  <span style={{fontSize:"0.72rem",color:"var(--gold2)",marginLeft:10}}>✓</span>
                )}
              </div>
            );
          })}
        </div>
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

  // Regole e condizioni (condizioni già bilingui nel titolo)
  for (const sec of RULES_DB) {
    const secName = sec.label.replace(/^\S+\s+/, "");
    for (const v of sec.voci) {
      push("rule", `${sec.id}-${v.titolo}`, v.titolo, "", secName, { testo: v.testo, sectionLabel: sec.label }, v.testo);
    }
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
            />
          )}
          {!loading && mainTab === "combat" && (
            <CombatTracker characters={characters} pendingCombatant={pendingCombatant} onPendingConsumed={() => setPendingCombatant(null)} />
          )}
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
            setImportedItems(s => [...s, ...items]);
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

function safeLsSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch(e) {
    console.error('[localStorage] quota exceeded for key:', key, e);
    if (!document.getElementById('__ls-toast')) {
      const t = document.createElement('div');
      t.id = '__ls-toast';
      t.textContent = '\u26a0\ufe0f Spazio locale esaurito \u2014 alcuni dati potrebbero non essere salvati.';
      t.style.cssText = [
        'position:fixed','bottom:1.2rem','left:50%','transform:translateX(-50%)',
        'background:#c8903a','color:#0f0e0b','padding:.6rem 1.4rem',
        'border-radius:6px','font-size:.85rem','z-index:99999',
        'font-family:Georgia,serif','box-shadow:0 2px 8px rgba(0,0,0,.5)',
        'pointer-events:none'
      ].join(';');
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 7000);
    }
  }
}

// Migrazione one-time: sposta le vecchie chiavi NON prefissate nello spazio
// dell'utente corrente. Necessaria perché in passato personaggi (STORAGE_KEY) e
// mostri custom (MONSTERS_STORAGE_KEY) venivano salvati senza prefisso utente.
function migrateLegacyKey(plainKey, { merge = false } = {}) {
  try {
    const legacy = localStorage.getItem(plainKey);
    if (legacy == null) return;                 // niente da migrare
    const prefixedK = userKey(plainKey);
    if (prefixedK === plainKey) return;         // nessun utente → nessun prefisso
    const existing = localStorage.getItem(prefixedK);
    if (existing == null) {
      safeLsSet(prefixedK, legacy);             // copia diretta
    } else if (merge) {
      // unione di array deduplicando per id/slug (i dati già nello spazio utente vincono)
      try {
        const a = JSON.parse(existing) || [];
        const b = JSON.parse(legacy) || [];
        const byKey = {};
        for (const x of [...b, ...a]) byKey[x.id ?? x.slug ?? JSON.stringify(x)] = x;
        safeLsSet(prefixedK, JSON.stringify(Object.values(byKey)));
      } catch { /* formati non-array: tengo i dati utente esistenti */ }
    }
    localStorage.removeItem(plainKey);          // pulizia: la migrazione avviene una volta sola
  } catch {}
}

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
