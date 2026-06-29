import React, { useState, useEffect, useCallback } from "react";
import CatalogBrowser from "./CatalogBrowser.jsx";
import ClassChoices from "./ClassChoices.jsx";
import { hasFantasy, generateFantasyNames, generateSurname, generateSurnamesMixed, generateHouses, EXTRA_CATEGORIES } from "./nameForge.js";
import shopExtra from "./shopExtra.json";
import { DETAILS_EXTRA } from "./detailsExtra.js";

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
const saveData = async (data) => {
  try { safeLsSet(userKey(STORAGE_KEY), JSON.stringify(data)); } catch {}
};

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

`;

// ─── Local Spell Database ─────────────────────────────────────────────────────
const SPELLS_DB = [{"slug":"acid-splash","name":"Schizzo Acido","level":0,"school":"Conjuration","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Lanci una bolla di acido. Scegli una creatura entro gittata, o due creature entro 1,5 m l'una dall'altra. Il bersaglio deve superare un tiro salvezza su Destrezza o subire 1d6 danni acido. I danni aumentano a 2d6 al 5° livello, 3d6 all'11° e 4d6 al 17°.","baseDice":[1,6,0]},{"slug":"chill-touch","name":"Tocco Gelido","level":0,"school":"Necromancy","castingTime":"1 azione","range":"36 m","duration":"1 round","components":"V, S","desc":"Crei una mano spettrale nell'area del bersaglio. Effettua un attacco con incantesimo a distanza contro la creatura. In caso di successo subisce 1d8 danni necrotici e non può recuperare PF fino al tuo prossimo turno.","baseDice":[1,8,0]},{"slug":"dancing-lights","name":"Luci Danzanti","level":0,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Crei fino a quattro luci delle dimensioni di una torcia entro gittata. Puoi combinarle in una figura vagamente umanoide di taglia Media. Puoi spostarle fino a 18 m come azione bonus."},{"slug":"druidcraft","name":"Arte dei Druidi","level":0,"school":"Transmutation","castingTime":"1 azione","range":"9 m","duration":"Istantanea","components":"V, S","desc":"Crei un effetto minore legato alla natura: prevedi il meteo, fai sbocciare un fiore, accendi o spegni una piccola fiamma, produci un effetto sensoriale innocuo."},{"slug":"eldritch-blast","name":"Bolide Occulto","level":0,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Istantanea","components":"V, S","desc":"Un fascio di energia crackling verso una creatura entro gittata. Effettua un attacco con incantesimo a distanza. In caso di successo il bersaglio subisce 1d10 danni da forza. Puoi creare più fasci a livelli più alti.","baseDice":[1,10,0]},{"slug":"fire-bolt","name":"Dardo di Fuoco","level":0,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Istantanea","components":"V, S","desc":"Lanci una scintilla di fuoco verso una creatura o un oggetto. Effettua un attacco con incantesimo a distanza. In caso di colpo il bersaglio subisce 1d10 danni da fuoco. Scala a 2d10 al 5° livello, 3d10 all'11°, 4d10 al 17°.","baseDice":[1,10,0]},{"slug":"guidance","name":"Guida","level":0,"school":"Divination","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Tocchi una creatura consenziente. Una volta prima che l'incantesimo termini, il bersaglio può tirare 1d4 e aggiungere il risultato a una prova di caratteristica a sua scelta.","baseDice":[1,4,0]},{"slug":"light","name":"Luce","level":0,"school":"Evocation","castingTime":"1 azione","range":"Contatto","duration":"1 ora","components":"V, M","desc":"Tocchi un oggetto non più grande di 3 m in qualsiasi dimensione. Fino alla fine dell'incantesimo, l'oggetto emette luce brillante in un raggio di 6 m e luce fioca per ulteriori 6 m."},{"slug":"mage-hand","name":"Mano del Mago","level":0,"school":"Conjuration","castingTime":"1 azione","range":"9 m","duration":"1 minuto","components":"V, S","desc":"Appare una mano spettrale fluttuante in un punto a tua scelta. Puoi usarla per manipolare oggetti, aprire porte, versare contenuti, usare strumenti artigianali. Peso massimo 5 kg."},{"slug":"message","name":"Messaggio","level":0,"school":"Transmutation","castingTime":"1 azione","range":"36 m","duration":"1 round","components":"V, S, M","desc":"Sussurri un messaggio e indichi una creatura entro gittata. Il bersaglio sente il messaggio e può risponderti in un sussurro che solo tu puoi sentire."},{"slug":"minor-illusion","name":"Illusione Minore","level":0,"school":"Illusion","castingTime":"1 azione","range":"9 m","duration":"1 minuto","components":"S, M","desc":"Crei un suono o un'immagine di un oggetto entro gittata che dura per la durata. Non puoi creare effetti sia sonori che visivi con un singolo lancio."},{"slug":"poison-spray","name":"Nebbia Velenosa","level":0,"school":"Conjuration","castingTime":"1 azione","range":"3 m","duration":"Istantanea","components":"V, S","desc":"Estendi la mano verso una creatura entro gittata ed emetti una nuvola di gas nocivo. Il bersaglio deve superare un TS su Costituzione o subire 1d12 danni veleno.","baseDice":[1,12,0]},{"slug":"prestidigitation","name":"Prestidigitazione","level":0,"school":"Transmutation","castingTime":"1 azione","range":"3 m","duration":"Fino a 1 ora","components":"V, S","desc":"Trucchetto magico per usi minori: accendi/spegni una fiamma, pulisci un oggetto, raffredda/scalda/insaporisci fino a 30 dm³ di materiale non vivo, crea un simbolo o immagine su una superficie."},{"slug":"produce-flame","name":"Produrre Fiamma","level":0,"school":"Conjuration","castingTime":"1 azione","range":"Sé stesso","duration":"10 minuti","components":"V, S","desc":"Una fiamma non consumante appare nella tua mano. Irradia luce brillante in un raggio di 3 m. Puoi lanciare la fiamma come attacco a distanza (gittata 9 m), causando 1d8 danni da fuoco in caso di successo.","baseDice":[1,8,0]},{"slug":"ray-of-frost","name":"Raggio di Gelo","level":0,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Un raggio azzurrino di luce fredda si dirige verso una creatura entro gittata. Effettua un attacco con incantesimo a distanza. In caso di colpo il bersaglio subisce 1d8 danni da freddo e la sua velocità si riduce di 3 m fino al tuo prossimo turno.","baseDice":[1,8,0]},{"slug":"resistance","name":"Resistenza","level":0,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Tocchi una creatura consenziente. Una volta prima che l'incantesimo finisca, può tirare 1d4 e aggiungere il risultato a un tiro salvezza.","baseDice":[1,4,0]},{"slug":"sacred-flame","name":"Fiamma Sacra","level":0,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Discesa di fiamma simile a radianza cade su una creatura che puoi vedere entro gittata. Il bersaglio deve superare un TS su Destrezza o subire 1d8 danni radianti. Non beneficia di copertura.","baseDice":[1,8,0]},{"slug":"shillelagh","name":"Bastone Sacro","level":0,"school":"Transmutation","castingTime":"1 azione bonus","range":"Contatto","duration":"1 minuto","components":"V, S, M","desc":"Il legno di un randello o bastone che impugni è imbevuto di potere naturale. Per la durata puoi usare la tua caratteristica di incantatore per gli attacchi e i danni dell'arma, che diventano magici (1d8).","baseDice":[1,8,0]},{"slug":"shocking-grasp","name":"Presa Folgorante","level":0,"school":"Evocation","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S","desc":"Il fulmine scocca dalla tua mano. Effettua un attacco con incantesimo in mischia. Hai vantaggio se il bersaglio indossa armatura metallica. In caso di colpo subisce 1d8 danni da fulmine e non può usare reazioni fino al suo prossimo turno.","baseDice":[1,8,0]},{"slug":"spare-the-dying","name":"Salvare il Morente","level":0,"school":"Necromancy","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S","desc":"Tocchi una creatura vivente con 0 PF. Diventa stabile. Non ha effetto sui non-morti o sui costrutti."},{"slug":"thaumaturgy","name":"Taumaturgia","level":0,"school":"Transmutation","castingTime":"1 azione","range":"9 m","duration":"Fino a 1 minuto","components":"V","desc":"Manifesti un piccolo prodigio: la tua voce risuona tre volte più forte, fiamme tremolano, tuoni rimbombano, occhi diventano bianchi o neri, porte tremano. Puoi avere fino a tre effetti attivi."},{"slug":"toll-the-dead","name":"Rintocco Funebre","level":0,"school":"Necromancy","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Indichi una creatura che puoi vedere entro gittata e suona il rintocco di una campana funebre. Deve superare un TS su Saggezza o subire 1d8 danni necrotici. Se ha PF mancanti, i danni diventano 1d12.","baseDice":[1,8,0]},{"slug":"true-strike","name":"Colpo Infallibile","level":0,"school":"Divination","castingTime":"1 azione","range":"9 m","duration":"Concentrazione, fino a 1 round","components":"S","desc":"Estendi la mano e punti il dito verso un bersaglio entro gittata. La tua magia ti concede una visione breve delle difese del bersaglio. Al tuo prossimo turno hai vantaggio al primo attacco contro di esso."},{"slug":"vicious-mockery","name":"Scherno Feroce","level":0,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V","desc":"Scateni una serie di insulti intrisi di magia su una creatura che puoi vedere entro gittata. Se il bersaglio può sentirti, deve superare un TS su Saggezza o subire 1d4 danni psichici e avere svantaggio al prossimo tiro per colpire.","baseDice":[1,4,0]},{"slug":"alarm","name":"Allarme","level":1,"school":"Abjuration","castingTime":"1 minuto (rituale)","range":"9 m","duration":"8 ore","components":"V, S, M","desc":"Imposti un allarme su un'area: una porta, una finestra, o un'area di 6 m per 6 m. Puoi scegliere un allarme mentale (ti sveglia) o sonoro (campana per 10 round)."},{"slug":"animal-friendship","name":"Amicizia con gli Animali","level":1,"school":"Enchantment","castingTime":"1 azione","range":"9 m","duration":"24 ore","components":"V, S, M","desc":"Convinci un animale che non ti attaccherà. L'animale deve superare un TS su Saggezza (CD pari alla tua CD degli incantesimi) o essere incantato per 24 ore."},{"slug":"bane","name":"Bane","level":1,"school":"Enchantment","castingTime":"1 azione","range":"9 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Fino a tre creature a tua scelta entro gittata devono superare un TS su Carisma o subire una penalità di 1d4 a tutti i tiri per colpire e i tiri salvezza per la durata.","baseDice":[1,4,0]},{"slug":"bless","name":"Benedizione","level":1,"school":"Enchantment","castingTime":"1 azione","range":"9 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Benedici fino a tre creature a tua scelta entro gittata. Ogni volta che un bersaglio effettua un tiro per colpire o un tiro salvezza prima che l'incantesimo finisca, può tirare 1d4 e aggiungere il risultato.","higherLevel":"Per ogni livello sopra il 1° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":1},"baseDice":[1,4,0]},{"slug":"burning-hands","name":"Mani Brucianti","level":1,"school":"Evocation","castingTime":"1 azione","range":"Sé stesso (cono 4,5 m)","duration":"Istantanea","components":"V, S","desc":"Emetti un cono di fuoco (4,5 m). Ogni creatura nell'area deve effettuare un TS su Destrezza. In caso di fallimento subisce 3d6 danni da fuoco, la metà in caso di successo.","higherLevel":"Per ogni livello sopra il 1° i danni aumentano di 1d6.","scaling":{"type":"dice","num":1,"sides":6,"per":1,"from":1},"baseDice":[3,6,0]},{"slug":"charm-person","name":"Ammaliare le Persone","level":1,"school":"Enchantment","castingTime":"1 azione","range":"9 m","duration":"1 ora","components":"V, S","desc":"Tenti di ammaliare un umanoide entro gittata. Deve superare un TS su Saggezza o essere incantato da te. Considera te come un amico fidato. L'incantesimo termina se tu o i tuoi compagni attaccate il bersaglio.","higherLevel":"Per ogni livello sopra il 1° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":1}},{"slug":"color-spray","name":"Raggio Colorato","level":1,"school":"Illusion","castingTime":"1 azione","range":"Sé stesso (cono 4,5 m)","duration":"1 round","components":"V, S, M","desc":"Un raggio di luce abbagliante multi-colore si irradia da te. Tira 6d10: il totale indica i PF di creature che vengono accecate, partendo da quella con meno PF.","baseDice":[6,10,0]},{"slug":"command","name":"Comando","level":1,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"1 round","components":"V","desc":"Parli un comando di una parola a una creatura che puoi vedere entro gittata. Deve superare un TS su Saggezza o seguire il comando al suo prossimo turno. Comandi: Avvicinati, Fuggi, Lascia, Giù, Fermati.","higherLevel":"Per ogni livello sopra il 1° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":1}},{"slug":"comprehend-languages","name":"Comprensione dei Linguaggi","level":1,"school":"Divination","castingTime":"1 azione (rituale)","range":"Sé stesso","duration":"1 ora","components":"V, S, M","desc":"Per la durata capisci il significato letterale di qualsiasi lingua parlata che senti. Puoi anche leggere qualsiasi lingua scritta se hai contatto fisico con la superficie."},{"slug":"cure-wounds","name":"Cura delle Ferite","level":1,"school":"Evocation","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S","desc":"Una creatura che tocchi recupera 1d8 + modificatore incantatore PF. Non funziona sui non-morti e i costrutti.","higherLevel":"Per ogni livello sopra il 1° i PF recuperati aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":1},"baseDice":[1,8,0]},{"slug":"detect-magic","name":"Individuazione del Magico","level":1,"school":"Divination","castingTime":"1 azione (rituale)","range":"Sé stesso","duration":"Concentrazione, fino a 10 minuti","components":"V, S","desc":"Per la durata senti la presenza di magia entro 9 m. Puoi usare la tua azione per vedere un'aura tenue attorno a qualsiasi creatura o oggetto magico visibile nell'area."},{"slug":"disguise-self","name":"Travestimento","level":1,"school":"Illusion","castingTime":"1 azione","range":"Sé stesso","duration":"1 ora","components":"V, S","desc":"Fai sembrare diverso il tuo aspetto fisico fino alla fine dell'incantesimo: viso, capelli, caratteristiche facciali, suono della voce, lunghezza, peso, abbigliamento. Non puoi cambiare la tua corporatura di base."},{"slug":"divine-favor","name":"Grazia Divina","level":1,"school":"Evocation","castingTime":"1 azione bonus","range":"Sé stesso","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"La tua preghiera ti consente di risplendere con potere divino. Fino alla fine dell'incantesimo i tuoi attacchi con le armi infliggono 1d4 danni radianti aggiuntivi al colpire.","baseDice":[1,4,0]},{"slug":"entangle","name":"Groviglio","level":1,"school":"Conjuration","castingTime":"1 azione","range":"27 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Erbe e radici spuntano in un'area quadrata di 6 m in un punto entro gittata. Le creature nell'area devono superare un TS su Forza o essere trattenute. Le creature che entrano nell'area devono superare il TS o essere anch'esse trattenute."},{"slug":"expeditious-retreat","name":"Ritirata Rapida","level":1,"school":"Transmutation","castingTime":"1 azione bonus","range":"Sé stesso","duration":"Concentrazione, fino a 10 minuti","components":"V, S","desc":"Puoi usare l'azione Scatto come azione bonus in ogni turno finché l'incantesimo non termina."},{"slug":"faerie-fire","name":"Fuoco Fatuo","level":1,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V","desc":"Ogni oggetto in un cubo di 6 m entro gittata è delineato da luce blu, verde o viola. Anche le creature nell'area sono delineate se falliscono un TS su Destrezza. Gli attacchi contro creature delineate hanno vantaggio."},{"slug":"false-life","name":"Falsa Vita","level":1,"school":"Necromancy","castingTime":"1 azione","range":"Sé stesso","duration":"1 ora","components":"V, S, M","desc":"Fortifica te stesso con un simulacro di vita necrotica. Guadagni 1d4+4 PF temporanei per la durata.","higherLevel":"Per ogni livello sopra il 1° guadagni 5 PF temporanei aggiuntivi.","scaling":{"type":"flat","value":5,"per":1,"from":1},"baseDice":[1,4,4]},{"slug":"feather-fall","name":"Caduta come una Piuma","level":1,"school":"Transmutation","castingTime":"1 reazione","range":"18 m","duration":"1 minuto","components":"V, M","desc":"Scegli fino a cinque creature in caduta entro gittata. La velocità di caduta si riduce a 18 m per round fino alla fine dell'incantesimo. Se la creatura atterra prima che l'incantesimo termini, non subisce danni dalla caduta."},{"slug":"find-familiar","name":"Trovare un Famiglio","level":1,"school":"Conjuration","castingTime":"1 ora (rituale)","range":"3 m","duration":"Istantanea","components":"V, S, M","desc":"Evochi uno spirito famiglio in forma animale. Appare in uno spazio libero entro gittata. I familiari possibili: pipistrello, gatto, granchio, rana, falco, lucertola, polpo, gufo, veleno, ratto, corvo, pesce, serpente marino, rospo, donnola."},{"slug":"fog-cloud","name":"Nuvola di Nebbia","level":1,"school":"Conjuration","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 ora","components":"V, S","desc":"Crei una sfera di nebbia di 6 m di raggio centrata su un punto entro gittata. La sfera si diffonde attorno agli angoli ed è fortemente oscurata. Dura per la durata o finché un vento moderato (almeno 15 km/h) non la disperde.","higherLevel":"Per ogni livello sopra il 1° il raggio aumenta di 6 m."},{"slug":"goodberry","name":"Bacca della Bontà","level":1,"school":"Transmutation","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S, M","desc":"Appaiono fino a dieci bacche magiche nel palmo della tua mano. Una creatura può usare la sua azione per mangiarne una, recuperando 1 PF. Forniscono anche il nutrimento di un pasto completo. Le bacche perdono la loro efficacia dopo 24 ore."},{"slug":"grease","name":"Unto","level":1,"school":"Conjuration","castingTime":"1 azione","range":"18 m","duration":"1 minuto","components":"V, S, M","desc":"Unto viscido copre il suolo in un quadrato di 3 m centrato su un punto entro gittata. Il suolo è terreno difficile. Ogni creatura nell'area quando lanci l'incantesimo deve superare un TS su Destrezza o cadere prona."},{"slug":"healing-word","name":"Parola di Cura","level":1,"school":"Evocation","castingTime":"1 azione bonus","range":"18 m","duration":"Istantanea","components":"V","desc":"Una creatura a tua scelta che puoi vedere entro gittata recupera PF pari a 1d4 + il tuo modificatore da incantatore. Non funziona sui non-morti e i costrutti.","higherLevel":"Per ogni livello sopra il 1° i PF recuperati aumentano di 1d4.","scaling":{"type":"dice","num":1,"sides":4,"per":1,"from":1},"baseDice":[1,4,0]},{"slug":"hellish-rebuke","name":"Vendetta Infernale","level":1,"school":"Evocation","castingTime":"1 reazione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Puoi usare la reazione quando vieni danneggiato da una creatura entro gittata. La creatura viene avvolta in fiamme infernali. Deve superare un TS su Destrezza o subire 2d10 danni da fuoco, la metà in caso di successo.","higherLevel":"Per ogni livello sopra il 1° i danni aumentano di 1d10.","scaling":{"type":"dice","num":1,"sides":10,"per":1,"from":1},"baseDice":[2,10,0]},{"slug":"heroism","name":"Eroismo","level":1,"school":"Enchantment","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Una creatura consenziente che tocchi è inondata di ardore. Finché l'incantesimo dura, la creatura è immune alla condizione spaventato e guadagna PF temporanei pari al tuo modificatore da incantatore all'inizio di ogni suo turno."},{"slug":"hunter-s-mark","name":"Marchio del Cacciatore","level":1,"school":"Divination","castingTime":"1 azione bonus","range":"27 m","duration":"Concentrazione, fino a 1 ora","components":"V","desc":"Scegli una creatura entro gittata e la marchi come tua preda. Finché l'incantesimo dura infliggi 1d6 danni aggiuntivi ogni volta che la colpisci con un'arma, e hai vantaggio alle prove di Saggezza (Percezione) o (Sopravvivenza) per trovarla.","baseDice":[1,6,0]},{"slug":"identify","name":"Identificazione","level":1,"school":"Divination","castingTime":"1 minuto (rituale)","range":"Contatto","duration":"Istantanea","components":"V, S, M","desc":"Scegli un oggetto che devi toccare durante l'incantesimo. Se è un oggetto magico o un altro oggetto imbevuto di magia, apprendi le sue proprietà e come usarle, se richiede attunement e quante cariche ha."},{"slug":"inflict-wounds","name":"Infliggi Ferite","level":1,"school":"Necromancy","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S","desc":"Effettua un attacco con incantesimo in mischia contro una creatura entro la tua portata. In caso di successo il bersaglio subisce 3d10 danni necrotici.","higherLevel":"Per ogni livello sopra il 1° i danni aumentano di 1d10.","scaling":{"type":"dice","num":1,"sides":10,"per":1,"from":1},"baseDice":[3,10,0]},{"slug":"jump","name":"Salto","level":1,"school":"Transmutation","castingTime":"1 azione","range":"Contatto","duration":"1 minuto","components":"V, S, M","desc":"Tocchi una creatura. La sua distanza di salto è triplicata fino alla fine dell'incantesimo."},{"slug":"longstrider","name":"Passo Allungato","level":1,"school":"Transmutation","castingTime":"1 azione","range":"Contatto","duration":"1 ora","components":"V, S, M","desc":"Tocchi una creatura. La velocità di quella creatura aumenta di 3 m fino alla fine dell'incantesimo.","higherLevel":"Per ogni livello sopra il 1° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":1}},{"slug":"magic-missile","name":"Dardo Incantato","level":1,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Istantanea","components":"V, S","desc":"Crei tre dardi di forza magica. Ogni dardo colpisce automaticamente una creatura a tua scelta entro gittata che puoi vedere. Ogni dardo infligge 1d4+1 danni da forza. Puoi dirigere i dardi verso un'unica creatura o verso più bersagli.","higherLevel":"Per ogni livello sopra il 1° l'incantesimo crea un dardo aggiuntivo.","baseDice":[1,4,1]},{"slug":"protection-from-evil-and-good","name":"Protezione dal Male e dal Bene","level":1,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Finché l'incantesimo dura, una creatura consenziente è protetta da aberrazioni, celestiali, elementali, folletti, non-morti e demoni. Non possono essere bersagliati da attacchi contro la volontà."},{"slug":"sanctuary","name":"Santuario","level":1,"school":"Abjuration","castingTime":"1 azione bonus","range":"9 m","duration":"1 minuto","components":"V, S, M","desc":"Proteggi una creatura entro gittata. Ogni creatura che cerca di attaccarla deve prima superare un TS su Saggezza o scegliere un nuovo bersaglio. L'incantesimo termina se il bersaglio attacca o lancia incantesimi dannosi."},{"slug":"shield","name":"Scudo","level":1,"school":"Abjuration","castingTime":"1 reazione","range":"Sé stesso","duration":"1 round","components":"V, S","desc":"Quando vieni colpito da un attacco o sei il bersaglio di dardo incantato, come reazione crei uno scudo invisibile. Guadagni +5 alla CA per quel momento, potenzialmente facendo fallire l'attacco, e sei immune ai dardi incantati."},{"slug":"shield-of-faith","name":"Scudo della Fede","level":1,"school":"Abjuration","castingTime":"1 azione bonus","range":"18 m","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Uno scudo scintillante appare attorno a una creatura entro gittata. +2 alla CA per la durata."},{"slug":"sleep","name":"Sonno","level":1,"school":"Enchantment","castingTime":"1 azione","range":"27 m","duration":"1 minuto","components":"V, S, M","desc":"Questa magia fa scivolare le creature in un sonno magico. Tira 5d8: il totale indica i PF di creature che vengono addormentate, partendo da quella con meno PF. I non-morti e le creature immuni alla condizione affascinato non ne sono influenzate.","higherLevel":"Per ogni livello sopra il 1° i PF disponibili aumentano di 2d8.","scaling":{"type":"dice","num":2,"sides":8,"per":1,"from":1},"baseDice":[5,8,0]},{"slug":"speak-with-animals","name":"Parlare con gli Animali","level":1,"school":"Divination","castingTime":"1 azione (rituale)","range":"Sé stesso","duration":"10 minuti","components":"V, S","desc":"Acquisti la capacità di comprendere e comunicare verbalmente con le bestie per la durata. La conoscenza di molte bestie è limitata dalla loro intelligenza, ma possono darti informazioni sulla vicinanza di luoghi e mostri."},{"slug":"thunderwave","name":"Onda di Tuono","level":1,"school":"Evocation","castingTime":"1 azione","range":"Sé stesso (cubo 4,5 m)","duration":"Istantanea","components":"V, S","desc":"Un'onda di forza tuonante si irradia da te. Ogni creatura in un cubo di 4,5 m deve effettuare un TS su Costituzione. In caso di fallimento subisce 2d8 danni da tuono ed è spinta di 3 m, la metà senza spinta in caso di successo.","higherLevel":"Per ogni livello sopra il 1° i danni aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":1},"baseDice":[2,8,0]},{"slug":"unseen-servant","name":"Servitore Invisibile","level":1,"school":"Conjuration","castingTime":"1 azione (rituale)","range":"18 m","duration":"1 ora","components":"V, S, M","desc":"Crei una forza invisibile e incosciente che esegue semplici compiti al tuo comando finché l'incantesimo dura. Ha CA 10, 1 PF, Forza 2."},{"slug":"witch-bolt","name":"Fulmine Stregonesco","level":1,"school":"Evocation","castingTime":"1 azione","range":"9 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Un raggio di fulmine crackly si collega a una creatura entro gittata. Effettua un attacco con incantesimo a distanza. In caso di successo il bersaglio subisce 1d12 danni da fulmine. Nei turni successivi puoi usare l'azione per causare automaticamente 1d12 danni.","higherLevel":"Per ogni livello sopra il 1° i danni iniziali aumentano di 1d12.","scaling":{"type":"dice","num":1,"sides":12,"per":1,"from":1},"baseDice":[1,12,0]},{"slug":"aid","name":"Aiuto","level":2,"school":"Abjuration","castingTime":"1 azione","range":"9 m","duration":"8 ore","components":"V, S, M","desc":"Il tuo incantesimo rinforza i tuoi alleati con tenacia e determinazione. Scegli fino a tre creature entro gittata. Il massimo dei PF di ogni creatura aumenta di 5 per la durata.","higherLevel":"Per ogni livello sopra il 2° il massimo dei PF aumenta di 5 in più."},{"slug":"alter-self","name":"Alterare Sé Stesso","level":2,"school":"Transmutation","castingTime":"1 azione","range":"Sé stesso","duration":"Concentrazione, fino a 1 ora","components":"V, S","desc":"Assumi una forma diversa. Scegli una di tre opzioni: Adattamento Acquatico (branchie, pinne), Apparenza Naturale (cambia aspetto), o Adattamento al Combattimento (armi naturali 1d6).","baseDice":[1,6,0]},{"slug":"arcane-lock","name":"Serratura Arcana","level":2,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"Finché non viene dissolto","components":"V, S, M","desc":"Tocchi una porta, finestra, cancello o altra entrata chiusa. È bloccata magicamente. Solo tu e le creature che designi possono aprirla normalmente. Tutte le prove per sfondarla o scassinare la serratura hanno svantaggio."},{"slug":"blur","name":"Sfocatura","level":2,"school":"Illusion","castingTime":"1 azione","range":"Sé stesso","duration":"Concentrazione, fino a 1 minuto","components":"V","desc":"Il tuo corpo diventa sfocato, scorrendo e ondeggiando a qualsiasi creatura che ti vede. Per la durata, qualsiasi creatura ha svantaggio ai tiri per colpire contro di te."},{"slug":"branding-smite","name":"Colpo Marchiante","level":2,"school":"Evocation","castingTime":"1 azione bonus","range":"Sé stesso","duration":"Concentrazione, fino a 1 minuto","components":"V","desc":"La prossima volta che colpisci una creatura con un attacco con un'arma prima che l'incantesimo finisca, l'arma brilla con luce astrale mentre la colpisci. L'attacco infligge 2d6 danni radianti aggiuntivi e il bersaglio diventa visibile.","baseDice":[2,6,0]},{"slug":"calm-emotions","name":"Calma Emozioni","level":2,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Tenti di eliminare forti emozioni in un gruppo di persone. Ogni umanoide in una sfera di 6 m centrata su un punto entro gittata deve superare un TS su Carisma. Un bersaglio sopprime qualsiasi effetto che lo rende affascinato o spaventato."},{"slug":"crown-of-madness","name":"Corona della Follia","level":2,"school":"Enchantment","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Una creatura umanoide entro gittata deve superare un TS su Saggezza o diventare affascinata da te per la durata. Una corona di ferro torto appare sulla sua testa. Puoi usare la tua azione per designare una creatura che il bersaglio deve attaccare."},{"slug":"darkness","name":"Oscurità","level":2,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 10 minuti","components":"V, M","desc":"Oscurità magica si diffonde da un punto entro gittata riempiendo una sfera di 4,5 m di raggio. Blocca qualsiasi visione non magica, inclusa la scurovisione. Non può essere dissolta dalla luce non magica."},{"slug":"darkvision","name":"Scurovisione","level":2,"school":"Transmutation","castingTime":"1 azione","range":"Contatto","duration":"8 ore","components":"V, S, M","desc":"Tocchi una creatura consenziente e le concedi scurovisione entro 18 m se non ce l'ha già."},{"slug":"enhance-ability","name":"Potenziare le Capacità","level":2,"school":"Transmutation","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 ora","components":"V, S, M","desc":"Tocchi una creatura e concedi un miglioramento magico. Scegli uno dei seguenti effetti: Forza del Toro (+2d4 PF temp, vantaggio su Forza), Grazia del Gatto (vantaggio su Destrezza), Resistenza dell'Orso (+2d6 PF temp), Intelligenza del Volpe (vantaggio su Int), Saggezza del Gufo (vantaggio su Sag), Fascino della Rosa (vantaggio su Car).","higherLevel":"Per ogni livello sopra il 2° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":2},"baseDice":[2,4,0]},{"slug":"enlarge-reduce","name":"Ingrandire/Rimpicciolire","level":2,"school":"Transmutation","castingTime":"1 azione","range":"9 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Fai crescere o rimpicciolire una creatura o un oggetto che puoi vedere entro gittata. Ingrandire: taglia aumenta di una categoria, +1d4 ai danni delle armi, vantaggio su Forza. Rimpicciolire: taglia diminuisce di una categoria, -1d4 ai danni delle armi, svantaggio su Forza.","baseDice":[1,4,0]},{"slug":"enthrall","name":"Affascinare","level":2,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"1 minuto","components":"V, S","desc":"Pronunci una litania distraente per attirare l'attenzione di quegli intorno a te. Ogni creatura umanoide entro gittata che può sentirti deve superare un TS su Saggezza o avere svantaggio alle prove di Saggezza (Percezione) per individuare qualcuno che non sei tu."},{"slug":"find-steed","name":"Trovare una Cavalcatura","level":2,"school":"Conjuration","castingTime":"10 minuti","range":"9 m","duration":"Istantanea","components":"V, S","desc":"Evochi uno spirito che assume la forma di una cavalcatura insolitamente intelligente, forte e leale. Appare in uno spazio libero entro gittata. La cavalcatura può essere un destriero, un pony, un cammello, un alce, o un mastino da guerra."},{"slug":"flame-blade","name":"Lama di Fiamma","level":2,"school":"Evocation","castingTime":"1 azione bonus","range":"Sé stesso","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Evochi una lama simile a una scimitarra di fuoco puro nella mano libera. La lama è simile a una scimitarra per quanto riguarda l'uso, infligge 3d6 danni da fuoco al colpire e irradia luce brillante in un raggio di 3 m.","higherLevel":"Per ogni due livelli sopra il 2° i danni aumentano di 1d6.","scaling":{"type":"dice","num":1,"sides":6,"per":2,"from":2},"baseDice":[3,6,0]},{"slug":"flaming-sphere","name":"Sfera di Fuoco","level":2,"school":"Conjuration","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Crei una sfera di fuoco di 1,5 m di diametro in uno spazio libero entro gittata. Qualsiasi creatura che finisce il suo turno entro 1,5 m dalla sfera subisce 2d6 danni da fuoco (TS Destrezza per dimezzare). Puoi muoverla come azione bonus.","higherLevel":"Per ogni livello sopra il 2° i danni aumentano di 1d6.","scaling":{"type":"dice","num":1,"sides":6,"per":1,"from":2},"baseDice":[2,6,0]},{"slug":"hold-person","name":"Bloccare le Persone","level":2,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Scegli un umanoide che puoi vedere entro gittata. Il bersaglio deve superare un TS su Saggezza o essere paralizzato per la durata. Al termine di ogni suo turno il bersaglio può ripetere il TS.","higherLevel":"Per ogni livello sopra il 2° puoi bersagliare un umanoide aggiuntivo."},{"slug":"invisibility","name":"Invisibilità","level":2,"school":"Illusion","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 ora","components":"V, S, M","desc":"Una creatura che tocchi diventa invisibile fino alla fine dell'incantesimo. Qualunque cosa il bersaglio indossi o trasporti è invisibile finché rimane in suo possesso. L'incantesimo termina se il bersaglio attacca o lancia un incantesimo.","higherLevel":"Per ogni livello sopra il 2° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":2}},{"slug":"knock","name":"Bussare","level":2,"school":"Transmutation","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V","desc":"Scegli un oggetto entro gittata che è chiuso a chiave, inchiodato, sbarrato, o tenuto chiuso da Serratura Arcana. Un tintinnio forte risuona (udibile a 90 m) e l'oggetto si apre. Rimuove anche Serratura Arcana e si apre un lucchetto."},{"slug":"lesser-restoration","name":"Restaurazione Inferiore","level":2,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S","desc":"Tocchi una creatura e metti fine a una malattia o a una condizione che la affligge. La condizione può essere accecato, sordo, paralizzato, o avvelenato."},{"slug":"levitate","name":"Levitare","level":2,"school":"Transmutation","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Una creatura o un oggetto del peso massimo di 250 kg che puoi vedere entro gittata si solleva verticalmente fino a 6 m e rimane sospeso per la durata. Può muoversi solo orizzontalmente spingendosi su superfici solide."},{"slug":"magic-weapon","name":"Arma Magica","level":2,"school":"Transmutation","castingTime":"1 azione bonus","range":"Contatto","duration":"Concentrazione, fino a 1 ora","components":"V, S","desc":"Tocchi un'arma non magica. Diventa magica, guadagnando +1 ai tiri per colpire e ai tiri per i danni per la durata.","higherLevel":"Lv 4: +2. Lv 6: +3."},{"slug":"mirror-image","name":"Immagine Speculare","level":2,"school":"Illusion","castingTime":"1 azione","range":"Sé stesso","duration":"1 minuto","components":"V, S","desc":"Tre duplicati illusori di te stesso appaiono nel tuo spazio. I duplicati si muovono con te. Ogni volta che una creatura ti attacca, tira 1d20 per determinare se l'attacco colpisce un duplicato: 6+ (3 duplic.), 8+ (2 duplic.), 11+ (1 duplic.).","baseDice":[1,20,0]},{"slug":"misty-step","name":"Passo Nebbioso","level":2,"school":"Conjuration","castingTime":"1 azione bonus","range":"Sé stesso","duration":"Istantanea","components":"V","desc":"Avvolto da un velo di nebbia argentata teletrasporti fino a 9 m in uno spazio libero che riesci a vedere."},{"slug":"moonbeam","name":"Raggio di Luna","level":2,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Un raggio pallido di luce simile alla luna scende su una colonna di 1,5 m di raggio, 12 m di altezza in un punto entro gittata. Ogni creatura che entra nell'area deve superare un TS su Costituzione o subire 2d10 danni radianti.","higherLevel":"Per ogni livello sopra il 2° i danni aumentano di 1d10.","scaling":{"type":"dice","num":1,"sides":10,"per":1,"from":2},"baseDice":[2,10,0]},{"slug":"pass-without-trace","name":"Passare Senza Tracce","level":2,"school":"Abjuration","castingTime":"1 azione","range":"Sé stesso","duration":"Concentrazione, fino a 1 ora","components":"V, S, M","desc":"Un'ombra e un silenzio ti avvolgono te e i tuoi compagni. Per la durata ogni creatura scelta entro 9 m da te (incluso te) guadagna +10 alle prove di Destrezza (Furtività) e non può essere tracciata se non per mezzi magici."},{"slug":"prayer-of-healing","name":"Preghiera di Guarigione","level":2,"school":"Evocation","castingTime":"10 minuti","range":"9 m","duration":"Istantanea","components":"V","desc":"Fino a sei creature a tua scelta che puoi vedere entro gittata recuperano PF pari a 2d8 + il tuo modificatore da incantatore. Non funziona sui non-morti e i costrutti.","higherLevel":"Per ogni livello sopra il 2° i PF recuperati aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":2},"baseDice":[2,8,0]},{"slug":"scorching-ray","name":"Raggio Rovente","level":2,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Istantanea","components":"V, S","desc":"Crei tre raggi di fuoco e li dirigi verso i bersagli entro gittata. Puoi dirigerli verso uno o più bersagli. Effettua un tiro per colpire a distanza per ogni raggio. In caso di successo il bersaglio subisce 2d6 danni da fuoco.","higherLevel":"Per ogni livello sopra il 2° crei un raggio aggiuntivo.","scaling":{"type":"target","per":1,"from":2},"baseDice":[2,6,0]},{"slug":"shatter","name":"Frantumazione","level":2,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S, M","desc":"Un suono assordante scoppia da un punto a tua scelta entro gittata. Ogni creatura in una sfera di 3 m centrata su quel punto deve superare un TS su Costituzione o subire 3d8 danni da tuono. I costrutti e gli oggetti inorganici hanno svantaggio al TS.","higherLevel":"Per ogni livello sopra il 2° i danni aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":2},"baseDice":[3,8,0]},{"slug":"silence","name":"Silenzio","level":2,"school":"Illusion","castingTime":"1 azione (rituale)","range":"36 m","duration":"Concentrazione, fino a 10 minuti","components":"V, S","desc":"Per la durata nessun suono può essere creato dentro o passare attraverso una sfera di 6 m centrata su un punto scelto entro gittata. Le creature e gli oggetti interamente nell'area sono immuni ai danni da tuono e i sordi."},{"slug":"spike-growth","name":"Crescita di Spine","level":2,"school":"Transmutation","castingTime":"1 azione","range":"45 m","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Il suolo in un raggio di 6 m centrato su un punto entro gittata si copre di spine e ramoscelli taglienti. L'area è terreno difficile. Ogni creatura che si muove attraverso l'area subisce 2d4 danni perforanti per ogni 1,5 m di movimento.","baseDice":[2,4,0]},{"slug":"spiritual-weapon","name":"Arma Spirituale","level":2,"school":"Evocation","castingTime":"1 azione bonus","range":"18 m","duration":"1 minuto","components":"V, S","desc":"Crei un'arma spettrale fluttuante nello spazio di una creatura entro gittata. Puoi effettuare un attacco in mischia con incantesimo contro una creatura entro 1,5 m dall'arma, infliggendo 1d8 + mod. incantatore danni da forza. Come azione bonus puoi spostare l'arma.","higherLevel":"Per ogni due livelli sopra il 2° i danni aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":2,"from":2},"baseDice":[1,8,0]},{"slug":"suggestion","name":"Suggestione","level":2,"school":"Enchantment","castingTime":"1 azione","range":"9 m","duration":"Concentrazione, fino a 8 ore","components":"V, M","desc":"Suggerisci un'azione a una creatura entro gittata che può sentirti e che non è immune alla condizione affascinato. Deve superare un TS su Saggezza o seguire la suggestione al meglio delle sue capacità. L'azione non deve essere ovviamente dannosa per sé."},{"slug":"web","name":"Ragnatela","level":2,"school":"Conjuration","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 ora","components":"V, S, M","desc":"Crei un ammasso di fili appiccicosi simili a ragnatele in un cubo di 6 m partendo da un punto entro gittata. Le creature nell'area devono superare un TS su Destrezza o essere trattenute. L'area è terreno difficile. La ragnatela è infiammabile."},{"slug":"animate-dead","name":"Animare i Morti","level":3,"school":"Necromancy","castingTime":"1 minuto","range":"3 m","duration":"Istantanea","components":"V, S, M","desc":"Tocchi ossa o un cadavere di un umanoide di taglia media o piccola. Crei un non-morto: scheletro (dalle ossa) o zombie (dal cadavere). Rimane sotto il tuo controllo per 24 ore.","higherLevel":"Per ogni livello sopra il 3° puoi creare o riaffermare il controllo su due non-morti aggiuntivi."},{"slug":"bestow-curse","name":"Maledire","level":3,"school":"Necromancy","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Tocchi una creatura e deve superare un TS su Saggezza o essere maledetta. Scegli il tipo di maledizione: svantaggio su una caratteristica, penalità ai TS contro di te, azione sprecata a volte, o 1d8 danni necrotici aggiuntivi.","higherLevel":"Lv 4: dura 10 min senza concentrazione. Lv 5: 8 ore. Lv 7: 24 ore. Lv 9: permanente.","baseDice":[1,8,0]},{"slug":"blink","name":"Balzo","level":3,"school":"Transmutation","castingTime":"1 azione","range":"Sé stesso","duration":"1 minuto","components":"V, S","desc":"Tira 1d20 alla fine di ogni tuo turno. Con un 11 o più scompari e arrivi nel Piano Etereo fino all'inizio del tuo prossimo turno. Poi ritorni nello spazio originale o in uno adiacente.","baseDice":[1,20,0]},{"slug":"call-lightning","name":"Invocare i Fulmini","level":3,"school":"Conjuration","castingTime":"1 azione","range":"36 m (altezza 30 m)","duration":"Concentrazione, fino a 10 minuti","components":"V, S","desc":"Una nuvola tempestosa appare in un cilindro di 18 m di raggio. Puoi usare la tua azione per invocare un fulmine che colpisce un punto entro la nuvola: 3d10 danni da fulmine in un cilindro di 1,5 m di raggio (TS Destrezza per dimezzare).","higherLevel":"Per ogni livello sopra il 3° i danni aumentano di 1d10.","scaling":{"type":"dice","num":1,"sides":10,"per":1,"from":3},"baseDice":[3,10,0]},{"slug":"clairvoyance","name":"Chiaroveggenza","level":3,"school":"Divination","castingTime":"10 minuti","range":"1,5 km","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Crei un senso invisibile in un luogo familiare o ovvio entro gittata. Puoi usare la tua azione per vedere o sentire attraverso questo senso con la tua normale capacità sensoriale."},{"slug":"conjure-animals","name":"Evocare Animali","level":3,"school":"Conjuration","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 ora","components":"V, S","desc":"Evochi spiriti feini che assumono forma animale. Scegli uno dei seguenti: 1 bestia GS 2, 2 bestie GS 1, 4 bestie GS 1/2, o 8 bestie GS 1/4. Le bestie compaiono in spazi liberi entro gittata. Sono amichevoli e obbediscono ai tuoi comandi verbali."},{"slug":"counterspell","name":"Contromagia","level":3,"school":"Abjuration","castingTime":"1 reazione","range":"18 m","duration":"Istantanea","components":"S","desc":"Tenti di interrompere una creatura nel processo di lancio di un incantesimo. Se l'incantesimo è di 3° livello o inferiore, ha automaticamente successo. Per incantesimi di 4° o superiore devi effettuare un tiro su caratteristica da incantatore (CD 10 + livello incantesimo)."},{"slug":"daylight","name":"Luce del Giorno","level":3,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"1 ora","components":"V, S","desc":"Una sfera di luce di 18 m di raggio irradia da un punto che scegli entro gittata. La sfera è luce brillante e irradia luce fioca per ulteriori 18 m. Se l'area è sovrapposta all'oscurità creata da un incantesimo di 3° livello o inferiore, quell'incantesimo viene dissolto."},{"slug":"dispel-magic","name":"Dissolvi Magie","level":3,"school":"Abjuration","castingTime":"1 azione","range":"36 m","duration":"Istantanea","components":"V, S","desc":"Scegli una creatura, un oggetto o un effetto magico entro gittata. Qualsiasi incantesimo di 3° livello o inferiore sul bersaglio termina. Per ogni incantesimo di 4° livello o superiore devi superare un tiro su caratteristica da incantatore (CD 10 + livello incantesimo).","higherLevel":"Per ogni livello sopra il 3° termini automaticamente incantesimi di livello pari o inferiore al livello dell'incantesimo usato."},{"slug":"fear","name":"Paura","level":3,"school":"Illusion","castingTime":"1 azione","range":"Sé stesso (cono 9 m)","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Proietti un'immagine fantasmatica delle paure più profonde di una creatura. Ogni creatura in un cono di 9 m deve superare un TS su Saggezza o lasciare cadere tutto ciò che tiene, essere spaventata e muoversi il più lontano possibile da te."},{"slug":"fireball","name":"Palla di Fuoco","level":3,"school":"Evocation","castingTime":"1 azione","range":"45 m","duration":"Istantanea","components":"V, S, M","desc":"Un punto brillante di fuoco vola verso un punto entro gittata e sboccia in una fiamma ruggente. Ogni creatura in una sfera di 6 m deve effettuare un TS su Destrezza, subendo 8d6 danni da fuoco in caso di fallimento, o la metà in caso di successo.","higherLevel":"Per ogni livello sopra il 3° i danni aumentano di 1d6.","scaling":{"type":"dice","num":1,"sides":6,"per":1,"from":3},"baseDice":[8,6,0]},{"slug":"fly","name":"Volare","level":3,"school":"Transmutation","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Tocchi una creatura consenziente. Il bersaglio acquisisce velocità di volo di 18 m per la durata. Quando l'incantesimo termina, il bersaglio cade se è ancora in aria a meno che non possa fermare la caduta.","higherLevel":"Per ogni livello sopra il 3° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":3}},{"slug":"gaseous-form","name":"Forma Gassosa","level":3,"school":"Transmutation","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 ora","components":"V, S, M","desc":"Trasformi una creatura consenziente che tocchi in una nube di vapore per la durata. CA 13, velocità volo 3 m, resistenza a danni non magici, immunità veleno e non-morto, non può parlare, spingere oggetti o lanciare incantesimi."},{"slug":"glyph-of-warding","name":"Glifo di Interdizione","level":3,"school":"Abjuration","castingTime":"1 ora","range":"Contatto","duration":"Finché non viene dissolto o attivato","components":"V, S, M","desc":"Incidi un glifo che fa male ai creature intruse o che contiene un incantesimo immagazzinato. Il glifo può essere quasi invisibile (CD 15 per trovarlo). Quando attivato, scatena 5d8 danni del tipo scelto o l'incantesimo immagazzinato.","baseDice":[5,8,0]},{"slug":"haste","name":"Accelerazione","level":3,"school":"Transmutation","castingTime":"1 azione","range":"9 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Scegli una creatura consenziente entro gittata. La velocità è raddoppiata, ottieni +2 alla CA, vantaggio ai TS su Destrezza e un'azione aggiuntiva a ogni turno (solo Attacco con un'arma, Scatto, Disimpegno, Nascondersi, Usare un Oggetto). Al termine stordita per 1 turno."},{"slug":"hypnotic-pattern","name":"Schema Ipnotico","level":3,"school":"Illusion","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 minuto","components":"S, M","desc":"Crei un motivo contorto e vorticante di colori nell'aria all'interno di un cubo di 9 m. Ogni creatura nell'area deve superare un TS su Saggezza o essere affascinata per la durata (incapace e velocità 0)."},{"slug":"lightning-bolt","name":"Fulmine","level":3,"school":"Evocation","castingTime":"1 azione","range":"Sé stesso (linea 30 m)","duration":"Istantanea","components":"V, S, M","desc":"Un fulmine di elettricità scoppietta dal dito. Ogni creatura in una linea di 30 m per 1,5 m deve superare un TS su Destrezza, subendo 8d6 danni da fulmine in caso di fallimento o la metà in caso di successo.","higherLevel":"Per ogni livello sopra il 3° i danni aumentano di 1d6.","scaling":{"type":"dice","num":1,"sides":6,"per":1,"from":3},"baseDice":[8,6,0]},{"slug":"mass-healing-word","name":"Parola di Cura di Massa","level":3,"school":"Evocation","castingTime":"1 azione bonus","range":"18 m","duration":"Istantanea","components":"V","desc":"Fino a sei creature a tua scelta che puoi vedere entro gittata recuperano PF pari a 1d4 + il tuo modificatore da incantatore.","higherLevel":"Per ogni livello sopra il 3° i PF recuperati aumentano di 1d4.","scaling":{"type":"dice","num":1,"sides":4,"per":1,"from":3},"baseDice":[1,4,0]},{"slug":"plant-growth","name":"Crescita Vegetale","level":3,"school":"Transmutation","castingTime":"1 azione o 8 ore","range":"45 m","duration":"Istantanea","components":"V, S","desc":"Canalizzi la vitalità nelle piante in un luogo. Istantaneamente: piante in un raggio di 30 m diventano vegetazione lussureggiante e difficile (ogni 1,5 m di movimento costa 4,5 m). Alternativa 8 ore: potenzia raccolti per 1 anno."},{"slug":"revivify","name":"Revivifica","level":3,"school":"Necromancy","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S, M","desc":"Tocchi una creatura morta da non più di 1 minuto. Quella creatura torna in vita con 1 PF. Questo incantesimo non può riportare in vita creature che sono morte di vecchiaia né può restaurare parti del corpo mancanti."},{"slug":"slow","name":"Lentezza","level":3,"school":"Transmutation","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Fino a sei creature in un cubo di 12 m devono superare un TS su Saggezza. I falliti: velocità dimezzata, -2 alla CA e ai TS su Destrezza, non possono usare reazioni, e a ogni turno possono usare un'azione O un'azione bonus (non entrambe)."},{"slug":"speak-with-dead","name":"Parlare con i Morti","level":3,"school":"Necromancy","castingTime":"1 azione","range":"3 m","duration":"10 minuti","components":"V, S, M","desc":"Concedi a un cadavere la sembianza di vita, consentendogli di rispondere alle domande. Il cadavere conosce solo ciò che sapeva in vita. Puoi porre fino a cinque domande. Risponde solo nella lingua che conosceva in vita."},{"slug":"spirit-guardians","name":"Guardiani Spirituali","level":3,"school":"Conjuration","castingTime":"1 azione","range":"Sé stesso (raggio 4,5 m)","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Chiami spiriti per proteggerti. Si muovono con te. Le creature scelte devono superare un TS su Saggezza quando entrano nell'area o iniziano il loro turno nell'area, subendo 3d8 danni radianti o necrotici (la metà in caso di successo). L'area è terreno difficile per le creature nemiche.","higherLevel":"Per ogni livello sopra il 3° i danni aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":3},"baseDice":[3,8,0]},{"slug":"vampiric-touch","name":"Tocco Vampirico","level":3,"school":"Necromancy","castingTime":"1 azione","range":"Sé stesso","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"La tua mano irradia energia oscura. Effettua un attacco con incantesimo in mischia contro una creatura. In caso di successo infliggi 3d6 danni necrotici e recuperi PF pari alla metà dei danni inflitti.","higherLevel":"Per ogni livello sopra il 3° i danni aumentano di 1d6.","scaling":{"type":"dice","num":1,"sides":6,"per":1,"from":3},"baseDice":[3,6,0]},{"slug":"wind-wall","name":"Muro di Vento","level":3,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Un muro di forte vento sorge su una superficie entro gittata (fino a 15 m di lunghezza, 4,5 m di altezza, 30 cm di spessore). Ogni creatura che passa attraverso deve superare un TS su Forza o subire 3d8 danni contundenti.","baseDice":[3,8,0]},{"slug":"banishment","name":"Bando","level":4,"school":"Abjuration","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Cerchi di mandare una creatura in un altro piano. Il bersaglio deve superare un TS su Carisma. In caso di fallimento viene bandito. Se originaria di questo piano, torna alla fine dell'incantesimo. Se extraplanare, vi rimane se la concentrazione dura 1 minuto.","higherLevel":"Per ogni livello sopra il 4° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":4}},{"slug":"blight","name":"Avvizzire","level":4,"school":"Necromancy","castingTime":"1 azione","range":"9 m","duration":"Istantanea","components":"V, S","desc":"Energia necrotica travolge una creatura entro gittata. Deve superare un TS su Costituzione subendo 8d8 danni necrotici o la metà in caso di successo. Le piante hanno svantaggio e subiscono i danni massimi.","higherLevel":"Per ogni livello sopra il 4° i danni aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":4},"baseDice":[8,8,0]},{"slug":"confusion","name":"Confusione","level":4,"school":"Enchantment","castingTime":"1 azione","range":"27 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Assalti e torci la mente di fino a sei creature in una sfera di 3 m centrata su un punto entro gittata. Devono superare un TS su Saggezza o essere soggette a comportamenti casuali fino alla fine dell'incantesimo (tira 1d10 ogni turno).","higherLevel":"Per ogni livello sopra il 4° il raggio della sfera aumenta di 1,5 m.","baseDice":[1,10,0]},{"slug":"death-ward","name":"Protezione dalla Morte","level":4,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"8 ore","components":"V, S","desc":"Tocchi una creatura e le concedi protezione dalla morte. La prima volta che il bersaglio dovrebbe scendere a 0 PF a seguito di danni, scende invece a 1 PF. Se il bersaglio è soggetto a un effetto che lo uccide istantaneamente senza subire danni, quell'effetto viene invece annullato."},{"slug":"dimension-door","name":"Porta Dimensionale","level":4,"school":"Conjuration","castingTime":"1 azione","range":"150 m","duration":"Istantanea","components":"V","desc":"Teletrasporti te stesso da dove sei ora a qualsiasi punto entro gittata. Puoi portare con te un oggetto pesante quanto puoi trasportare e una creatura consenziente di taglia Media o più piccola."},{"slug":"dominate-beast","name":"Dominare la Bestia","level":4,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Cerchi di asservire una bestia entro gittata. Deve superare un TS su Saggezza o essere affascinata da te per la durata. Puoi impartirle comandi telepaticamente. Può ripetere il TS ogni volta che subisce danni."},{"slug":"fabricate","name":"Fabbricare","level":4,"school":"Transmutation","castingTime":"10 minuti","range":"36 m","duration":"Istantanea","components":"V, S","desc":"Converti materie prime in prodotti finiti. Taglia Media o più piccola di materia può essere trasformata in oggetti della stessa taglia o più piccoli. Hai bisogno di proficiency con gli strumenti da artigianale relativi."},{"slug":"fire-shield","name":"Scudo di Fuoco","level":4,"school":"Evocation","castingTime":"1 azione","range":"Sé stesso","duration":"10 minuti","components":"V, S, M","desc":"Fiamme sottili avvolgono il tuo corpo shedding luce brillante in 3 m. Scegli fiamme calde (resistenza ai danni da freddo, danno fuoco) o fredde (resistenza ai danni da fuoco, danno freddo). Chi ti colpisce subisce 2d8 danni del tipo scelto.","baseDice":[2,8,0]},{"slug":"freedom-of-movement","name":"Libertà di Movimento","level":4,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"1 ora","components":"V, S, M","desc":"Tocchi una creatura consenziente. Per la durata, il suo movimento non è influenzato dal terreno difficile e gli incantesimi e altri effetti magici non possono ridurre la sua velocità o causarle la condizione paralizzato o trattenuto."},{"slug":"greater-invisibility","name":"Invisibilità Superiore","level":4,"school":"Illusion","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Tu o una creatura che tocchi diventi invisibile finché l'incantesimo dura. Qualunque cosa il bersaglio indossi o trasporti è invisibile con lui. A differenza dell'invisibilità normale, non termina quando attacchi o lanci incantesimi."},{"slug":"guardian-of-faith","name":"Guardiano della Fede","level":4,"school":"Conjuration","castingTime":"1 azione","range":"9 m","duration":"8 ore","components":"V","desc":"Appare un guardiano spettrale di Taglia Grande in uno spazio libero entro gittata. Tutte le creature ostili che si avvicinano entro 3 m devono superare un TS su Destrezza o subire 20 danni radianti. Dopo 60 danni totali infitti, scompare."},{"slug":"ice-storm","name":"Tempesta di Ghiaccio","level":4,"school":"Evocation","castingTime":"1 azione","range":"90 m","duration":"Istantanea","components":"V, S, M","desc":"Grandine di pezzi di ghiaccio dalle dimensioni di un pugno pioggiono verso il basso in un cilindro di 6 m di raggio e 12 m di altezza. Ogni creatura nell'area subisce 2d8 danni contundenti e 4d6 danni da freddo (TS Destrezza per dimezzare). Diventa terreno difficile fino alla fine del turno successivo.","higherLevel":"Per ogni livello sopra il 4° i danni contundenti aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":4},"baseDice":[2,8,0]},{"slug":"locate-creature","name":"Localizzare una Creatura","level":4,"school":"Divination","castingTime":"1 azione","range":"Sé stesso","duration":"Concentrazione, fino a 1 ora","components":"V, S, M","desc":"Descrivi o nomina una creatura familiare a te. Senti la direzione verso la creatura più vicina di quel tipo entro 300 m. Se conosci la creatura specifica, puoi sentire la sua direzione finché si trova entro 300 m."},{"slug":"polymorph","name":"Polimorfismo","level":4,"school":"Transmutation","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 ora","components":"V, S, M","desc":"Trasformi una creatura che puoi vedere entro gittata. Una creatura non consenziente deve superare un TS su Saggezza. Assume la forma di una bestia con GS pari o inferiore a quello della creatura. Mantiene il suo allineamento ma usa le statistiche della bestia."},{"slug":"stoneskin","name":"Pelle di Pietra","level":4,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"Concentrazione, fino a 1 ora","components":"V, S, M (diamanti per 100 mo)","desc":"La carne di una creatura consenziente che tocchi diventa dura come pietra. La creatura ottiene resistenza ai danni non magici contundenti, perforanti e taglienti per la durata."},{"slug":"wall-of-fire","name":"Muro di Fuoco","level":4,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Crei un muro di fuoco su una superficie solida entro gittata (fino a 18 m × 6 m × 30 cm o un anello di 6 m × 6 m). Le creature che iniziano il turno nel muro subiscono 5d8 danni da fuoco. Il muro può essere opaco o trasparente.","higherLevel":"Per ogni livello sopra il 4° i danni aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":4},"baseDice":[5,8,0]},{"slug":"animate-objects","name":"Animare gli Oggetti","level":5,"school":"Transmutation","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Oggetti prendono vita ai tuoi comandi. Scegli fino a dieci oggetti non magici non indossati e non trasportati entro gittata. Come azione bonus muovili fino a 9 m e falli attaccare.","higherLevel":"Per ogni livello sopra il 5° puoi animare due oggetti aggiuntivi."},{"slug":"cloudkill","name":"Nube Mortale","level":5,"school":"Conjuration","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 10 minuti","components":"V, S","desc":"Crei una sfera di nubi giallo-verdognole di 6 m di raggio. È fortemente oscurata. Ogni creatura nell'area deve superare un TS su Costituzione o subire 5d8 danni veleno, la metà in caso di successo. Si sposta di 3 m lontano da te all'inizio del tuo turno.","higherLevel":"Per ogni livello sopra il 5° i danni aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":5},"baseDice":[5,8,0]},{"slug":"cone-of-cold","name":"Cono di Freddo","level":5,"school":"Evocation","castingTime":"1 azione","range":"Sé stesso (cono 18 m)","duration":"Istantanea","components":"V, S, M","desc":"Un soffio di aria fredda emana dalle tue mani. Ogni creatura in un cono di 18 m deve superare un TS su Costituzione, subendo 8d8 danni da freddo in caso di fallimento o la metà in caso di successo.","higherLevel":"Per ogni livello sopra il 5° i danni aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":5},"baseDice":[8,8,0]},{"slug":"conjure-elemental","name":"Evocare un Elementale","level":5,"school":"Conjuration","castingTime":"1 minuto","range":"27 m","duration":"Concentrazione, fino a 1 ora","components":"V, S, M","desc":"Chiami un elementale di GS 5 o inferiore. Appare in uno spazio libero entro gittata. Se perdi concentrazione, l'elementale non viene dissolto ma sfugge al tuo controllo e diventa ostile."},{"slug":"contact-other-plane","name":"Contattare un Altro Piano","level":5,"school":"Divination","castingTime":"1 minuto (rituale)","range":"Sé stesso","duration":"1 minuto","components":"V","desc":"Contatti mentalmente un semidio, lo spirito di un saggio morto o un'entità di un altro piano. Puoi porre cinque domande. Risposte: Sì, No, Forse, Mai, Irrilevante. Hai il 5% di probabilità per livello incantatore di diventare folle."},{"slug":"dominate-person","name":"Dominare le Persone","level":5,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S","desc":"Cerchi di asservire un umanoide entro gittata. Deve superare un TS su Saggezza o essere affascinato da te per la durata. Puoi impartirgli comandi telepaticamente (nessuna azione richiesta). Può ripetere il TS ogni volta che subisce danni.","higherLevel":"Lv 6: dura fino a 10 min. Lv 7: 1 ora. Lv 8: 8 ore."},{"slug":"flame-strike","name":"Colpo di Fiamma","level":5,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S, M","desc":"Una colonna verticale di fuoco divino tuona verso il basso in un cilindro di 3 m di raggio e 12 m di altezza su un punto entro gittata. Ogni creatura nell'area deve superare un TS su Costituzione o subire 4d6 danni da fuoco e 4d6 danni radianti, la metà in caso di successo.","higherLevel":"Per ogni livello sopra il 5° sia i danni da fuoco che quelli radianti aumentano di 1d6.","scaling":{"type":"dice","num":1,"sides":6,"per":1,"from":5},"baseDice":[4,6,0]},{"slug":"greater-restoration","name":"Restaurazione Superiore","level":5,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S, M (polvere di diamante per 100 mo)","desc":"Infigi energia rinvigorente in una creatura che tocchi, annullando un effetto debilitante. Può ridurre di 1 un livello di sfinimento, annullare la condizione affascinato o pietrificato, porre fine a una maledizione, riparare una riduzione massima di PF, o riparare una riduzione a una caratteristica."},{"slug":"hold-monster","name":"Bloccare il Mostro","level":5,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Scegli una creatura che puoi vedere entro gittata. Deve superare un TS su Saggezza o essere paralizzata per la durata. Funziona su qualsiasi tipo di creatura.","higherLevel":"Per ogni livello sopra il 5° puoi bersagliare una creatura aggiuntiva.","scaling":{"type":"target","per":1,"from":5}},{"slug":"insect-plague","name":"Piaga di Insetti","level":5,"school":"Conjuration","castingTime":"1 azione","range":"90 m","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Nugoli di locuste riempiono una sfera di 6 m di raggio centrata su un punto entro gittata. La sfera è fortemente oscurata. Ogni creatura nell'area all'inizio del tuo turno deve superare un TS su Costituzione o subire 4d10 danni perforanti, la metà in caso di successo.","higherLevel":"Per ogni livello sopra il 5° i danni aumentano di 1d10.","scaling":{"type":"dice","num":1,"sides":10,"per":1,"from":5},"baseDice":[4,10,0]},{"slug":"legend-lore","name":"Leggende e Storie","level":5,"school":"Divination","castingTime":"10 minuti","range":"Sé stesso","duration":"Istantanea","components":"V, S, M","desc":"Nomina o descrivi una persona, luogo o oggetto. L'incantesimo porta alla tua mente un breve sommario di leggende significative su ciò che hai menzionato. Più completa la conoscenza, più dettagliata la risposta."},{"slug":"mass-cure-wounds","name":"Cura delle Ferite di Massa","level":5,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Un'ondata di energia curativa irradia da un punto entro gittata. Scegli fino a sei creature in una sfera di 9 m centrata su quel punto. Ognuna recupera 3d8 + modificatore incantatore PF.","higherLevel":"Per ogni livello sopra il 5° i PF recuperati aumentano di 1d8.","scaling":{"type":"dice","num":1,"sides":8,"per":1,"from":5},"baseDice":[3,8,0]},{"slug":"mislead","name":"Fuorviare","level":5,"school":"Illusion","castingTime":"1 azione","range":"Sé stesso","duration":"Concentrazione, fino a 1 ora","components":"S","desc":"Diventi invisibile e al tempo stesso appare un doppelganger illusorio di te stesso nel tuo spazio. Puoi usare la tua azione per muovere il doppelganger fino a due volte la tua velocità e farlo parlare."},{"slug":"passwall","name":"Attraversare i Muri","level":5,"school":"Transmutation","castingTime":"1 azione","range":"9 m","duration":"1 ora","components":"V, S, M","desc":"Un passaggio appare in un muro di legno, gesso o pietra (non metallo) entro gittata. Il passaggio è 1,5 m di larghezza, 2,5 m di altezza e 6 m di profondità. Il passaggio può creare tunnel."},{"slug":"raise-dead","name":"Resuscitare i Morti","level":5,"school":"Necromancy","castingTime":"1 ora","range":"Contatto","duration":"Istantanea","components":"V, S, M (diamante per 500 mo)","desc":"Riporti in vita una creatura morta da non più di 10 giorni, il cui spirito sia libero e consensenziente. La creatura torna con 1 PF. Penalità -4 ai tiri per colpire, TS e prove di caratteristica; si riduce di 1 dopo ogni riposo lungo."},{"slug":"reincarnate","name":"Reincarnazione","level":5,"school":"Transmutation","castingTime":"1 ora","range":"Contatto","duration":"Istantanea","components":"V, S, M (oli e unguenti per 1000 mo)","desc":"Tocchi un umanoide morto o una parte di esso. Se lo spirito è libero e consenziente, la creatura torna in vita in un corpo nuovo. Tira su una tabella per determinare la nuova razza. Recupera tutti i PF."},{"slug":"scrying","name":"Sfera di Cristallo","level":5,"school":"Divination","castingTime":"10 minuti","range":"Sé stesso","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M (sfera di cristallo per 1000 mo)","desc":"Puoi vedere e sentire una creatura specifica scelta come bersaglio. Il bersaglio effettua un TS su Saggezza modificato dalla tua familiarità con esso. In caso di fallimento, un sensore invisibile appare nelle vicinanze del bersaglio."},{"slug":"wall-of-stone","name":"Muro di Pietra","level":5,"school":"Evocation","castingTime":"1 azione","range":"36 m","duration":"Concentrazione, fino a 10 minuti","components":"V, S, M","desc":"Crei un muro non magico di pietra solida. Può essere largo 18 m per 6 m per 15 cm, o curvato. Se appare dove si trovano creature, devono superare un TS su Destrezza o rimanere intrappolate."},{"slug":"chain-lightning","name":"Fulmine a Catena","level":6,"school":"Evocation","castingTime":"1 azione","range":"45 m","duration":"Istantanea","components":"V, S, M","desc":"Crei un fulmine che salta tra i bersagli. Scegli fino a tre bersagli entro 9 m l'uno dall'altro. Ogni bersaglio deve superare un TS su Destrezza o subire 10d8 danni da fulmine, la metà in caso di successo.","higherLevel":"Per ogni livello sopra il 6° puoi bersagliare un bersaglio aggiuntivo.","scaling":{"type":"target","per":1,"from":6},"baseDice":[10,8,0]},{"slug":"disintegrate","name":"Disintegrazione","level":6,"school":"Transmutation","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S, M","desc":"Emetti un raggio verde sottile. Effettua un attacco con incantesimo a distanza. In caso di successo il bersaglio subisce 10d6+40 danni da forza. Se scende a 0 PF, viene ridotto in polvere. Funziona anche su oggetti e strutture magiche.","higherLevel":"Per ogni livello sopra il 6° i danni aumentano di 3d6.","scaling":{"type":"dice","num":3,"sides":6,"per":1,"from":6},"baseDice":[10,6,40]},{"slug":"flesh-to-stone","name":"Pietrificazione","level":6,"school":"Transmutation","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Cerchi di trasformare una creatura che puoi vedere entro gittata in pietra. Il bersaglio deve superare un TS su Costituzione. Dopo tre fallimenti consecutivi diventa pietrificato, dopo tre successi l'effetto termina."},{"slug":"harm","name":"Infliggi Danni","level":6,"school":"Necromancy","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Scateni una malattia devastante su una creatura entro gittata. Deve superare un TS su Costituzione o subire 14d6 danni necrotici, la metà in caso di successo. Il massimo dei PF della creatura si riduce dei danni necrotici subiti fino al riposo lungo.","baseDice":[14,6,0]},{"slug":"heal","name":"Guarisci","level":6,"school":"Evocation","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Scegli una creatura entro gittata. Un'ondata di energia curativa la travolge causandole di recuperare 70 PF. Questo incantesimo annulla anche la cecità, la sordità e qualsiasi malattia.","higherLevel":"Per ogni livello sopra il 6° i PF recuperati aumentano di 10.","scaling":{"type":"flat","value":10,"per":1,"from":6}},{"slug":"mass-suggestion","name":"Suggestione di Massa","level":6,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"24 ore","components":"V, M","desc":"Suggerisci un'azione ragionevole a dodici creature a tua scelta entro gittata che possono sentirti. Devono superare un TS su Saggezza o seguire la suggestione nella misura del possibile.","higherLevel":"Lv 7: dura 10 giorni. Lv 8: 30 giorni. Lv 9: anno e un giorno."},{"slug":"true-seeing","name":"Visione del Vero","level":6,"school":"Divination","castingTime":"1 azione","range":"Contatto","duration":"1 ora","components":"V, S, M","desc":"Concedi alla creatura consenziente che tocchi la capacità di vedere le cose come sono veramente per la durata. La creatura ottiene visione del vero, nota i piani nascosti, vede l'invisibile, vede attraverso le illusioni."},{"slug":"word-of-recall","name":"Parola di Richiamo","level":6,"school":"Conjuration","castingTime":"1 azione","range":"5 m","duration":"Istantanea","components":"V","desc":"Tu e fino a cinque creature consenziente entro gittata teletrasportate istantaneamente a un santuario predeterminato. Devi designare un santuario lanciando questo incantesimo in un luogo sacro alla tua divinità. Puoi avere un solo santuario alla volta."},{"slug":"finger-of-death","name":"Dito della Morte","level":7,"school":"Necromancy","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V, S","desc":"Mandi energia negativa verso una creatura entro gittata. Il bersaglio deve superare un TS su Costituzione o subire 7d8+30 danni necrotici, la metà in caso di successo. Se il bersaglio muore, si alza come zombie sotto il tuo controllo.","baseDice":[7,8,30]},{"slug":"fire-storm","name":"Tempesta di Fuoco","level":7,"school":"Evocation","castingTime":"1 azione","range":"45 m","duration":"Istantanea","components":"V, S","desc":"Fiamme ruggianti appaiono in un'area a tua scelta (10 cubi di 3 m). Ogni creatura nell'area deve superare un TS su Destrezza o subire 7d10 danni da fuoco, la metà in caso di successo. Le piante non magiche nell'area prendono fuoco.","baseDice":[7,10,0]},{"slug":"plane-shift","name":"Spostamento Planare","level":7,"school":"Conjuration","castingTime":"1 azione","range":"Contatto","duration":"Istantanea","components":"V, S, M","desc":"Puoi trasportare fino a otto creature consenziente verso un piano di esistenza diverso. Puoi anche usarlo come attacco: effettua un attacco con incantesimo in mischia contro una creatura ostile. In caso di successo deve superare un TS su Carisma o essere trasportata in un piano casuale."},{"slug":"regenerate","name":"Rigenerazione","level":7,"school":"Transmutation","castingTime":"1 minuto","range":"Contatto","duration":"1 ora","components":"V, S, M","desc":"Tocchi una creatura e stimoli la sua capacità di guarire naturale. Il bersaglio recupera 4d8+15 PF. Per la durata il bersaglio recupera 1 PF all'inizio di ogni suo turno (10 PF/minuto). Arti amputati ricrescono in 2 minuti.","baseDice":[4,8,15]},{"slug":"resurrection","name":"Resurrezione","level":7,"school":"Necromancy","castingTime":"1 ora","range":"Contatto","duration":"Istantanea","components":"V, S, M (diamante per 1000 mo)","desc":"Tocchi un umanoide morto da non più di 100 anni che non sia morto di vecchiaia. Se lo spirito è libero e consenziente, la creatura torna in vita con tutti i PF. Vengono sanate anche malattie e veleni. Arti mancanti vengono restaurati."},{"slug":"reverse-gravity","name":"Gravità Invertita","level":7,"school":"Transmutation","castingTime":"1 azione","range":"30 m","duration":"Concentrazione, fino a 1 minuto","components":"V, S, M","desc":"Inverte la gravità in un cilindro di 15 m di raggio e 30 m di altezza centrato su un punto entro gittata. Tutte le creature e gli oggetti non legati al suolo nell'area cadono verso l'alto."},{"slug":"forcecage","name":"Gabbia di Forza","level":7,"school":"Evocation","castingTime":"1 azione","range":"27 m","duration":"1 ora","components":"V, S, M","desc":"Un cubo immobile di forza magica sorge attorno a un'area scelta entro gittata. Scegli una scatola (3 m con pareti solide) o una gabbia (4,5 m con sbarre). Nulla può attraversare le pareti, ne magico né fisico."},{"slug":"magnificent-mansion","name":"Magione Magnificente","level":7,"school":"Conjuration","castingTime":"1 minuto","range":"90 m","duration":"24 ore","components":"V, S, M","desc":"Crei una porta extradimensionale verso una magione. Fino a 100 creature possono entrare, con servitori spettrali che ubbidiscono ai tuoi desideri. L'interno è equivalente a una magione di 50 camere."},{"slug":"maze","name":"Labirinto","level":8,"school":"Conjuration","castingTime":"1 azione","range":"18 m","duration":"Concentrazione, fino a 10 minuti","components":"V, S","desc":"Bandi una creatura entro gittata in un labirinto extradimensionale. La creatura può effettuare una prova di Int (CD 20) alla fine di ogni turno per scappare. Minotauri e deva escono automaticamente."},{"slug":"mind-blank","name":"Mente Vuota","level":8,"school":"Abjuration","castingTime":"1 azione","range":"Contatto","duration":"24 ore","components":"V, S","desc":"Finché l'incantesimo dura, una creatura consenziente è protetta contro la lettura del pensiero, i danni psichici e gli effetti che potrebbero rilevarne la posizione, cambiarne il tipo di creatura, o costringerla ad agire contro la sua volontà."},{"slug":"power-word-stun","name":"Parola di Potere: Stordire","level":8,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V","desc":"Parli una parola di potere che travolge la mente di una creatura entro gittata. Se il bersaglio ha 150 PF o meno, è stordito. Altrimenti, l'incantesimo non ha effetto. Alla fine di ogni turno può ripetere il TS su Costituzione per terminare l'effetto."},{"slug":"sunburst","name":"Esplosione Solare","level":8,"school":"Evocation","castingTime":"1 azione","range":"45 m","duration":"Istantanea","components":"V, S, M","desc":"Abbagliante luce solare lampeggia dal punto scelto entro gittata irraggiando in una sfera di 18 m. Ogni creatura nell'area subisce 12d6 danni radianti e diventa cieca per 1 minuto (TS Costituzione per dimezzare e non diventare ciechi).","baseDice":[12,6,0]},{"slug":"power-word-kill","name":"Parola di Potere: Uccidere","level":9,"school":"Enchantment","castingTime":"1 azione","range":"18 m","duration":"Istantanea","components":"V","desc":"Pronunci una parola di potere che può compellere una creatura a morire istantaneamente. Se il bersaglio ha 100 PF o meno, muore. Altrimenti l'incantesimo non ha effetto."},{"slug":"time-stop","name":"Blocca il Tempo","level":9,"school":"Transmutation","castingTime":"1 azione","range":"Sé stesso","duration":"Istantanea","components":"V","desc":"Fermi brevemente il flusso del tempo. Nessun'altra creatura si può muovere o agire mentre il tempo è fermato. Tira 1d4+1: ottieni quel numero di turni. Il tempo riprende quando hai esaurito i tuoi turni speciali o agisci su un'altra creatura.","baseDice":[1,4,1]},{"slug":"true-resurrection","name":"Resurrezione Vera","level":9,"school":"Necromancy","castingTime":"1 ora","range":"Contatto","duration":"Istantanea","components":"V, S, M (fiala di acqua santa per 25000 mo)","desc":"Tocchi una creatura morta da non più di 200 anni che non sia morta di vecchiaia. Se lo spirito è libero e consenziente, la creatura è riportata in vita con tutti i PF. Questo incantesimo può restaurare arti mancanti e riportare in vita anche senza un corpo fisico."},{"slug":"wish","name":"Desiderio","level":9,"school":"Conjuration","castingTime":"1 azione","range":"Sé stesso","duration":"Istantanea","components":"V","desc":"L'incantesimo più potente che un mortale possa lanciare. Oltre a duplicare qualsiasi altro incantesimo di 8° livello o inferiore, puoi creare uno degli effetti seguenti: recupera 10 creature a 0 PF, crea un oggetto del valore massimo di 25000 mo, concedi 10 creature resistenza a un danno, o esprimi un desiderio con effetti che il DM determina."}]

// ─── Equipment Database ──────────────────────────────────────────────────────
const EQUIPMENT_DB = [{"slug":"bastone","name":"Bastone","category":"Arma","subcategory":"Semplice Mischia","damage":"1d6","damageType":"Contundente","weight":2,"cost":"2 mo","properties":["Versatile (1d8)"],"ac":null,"notes":""},{"slug":"clava","name":"Clava","category":"Arma","subcategory":"Semplice Mischia","damage":"1d4","damageType":"Contundente","weight":1,"cost":"1 ar","properties":["Leggera"],"ac":null,"notes":""},{"slug":"daga","name":"Daga","category":"Arma","subcategory":"Semplice Mischia","damage":"1d4","damageType":"Perforante","weight":0.5,"cost":"2 mo","properties":["Accurata","Leggera","Lanciabile (6/18)"],"ac":null,"notes":""},{"slug":"falcetto","name":"Falcetto","category":"Arma","subcategory":"Semplice Mischia","damage":"1d4","damageType":"Tagliente","weight":1,"cost":"1 mo","properties":["Leggera"],"ac":null,"notes":""},{"slug":"giavellotto","name":"Giavellotto","category":"Arma","subcategory":"Semplice Mischia","damage":"1d6","damageType":"Perforante","weight":1,"cost":"5 ar","properties":["Lanciabile (9/36)"],"ac":null,"notes":""},{"slug":"lancia","name":"Lancia","category":"Arma","subcategory":"Semplice Mischia","damage":"1d6","damageType":"Perforante","weight":1.5,"cost":"1 mo","properties":["Lanciabile (6/18)","Versatile (1d8)"],"ac":null,"notes":""},{"slug":"maglio","name":"Maglio Leggero","category":"Arma","subcategory":"Semplice Mischia","damage":"1d4","damageType":"Contundente","weight":1,"cost":"2 mo","properties":["Leggera","Lanciabile (6/18)"],"ac":null,"notes":""},{"slug":"mazza","name":"Mazza","category":"Arma","subcategory":"Semplice Mischia","damage":"1d6","damageType":"Contundente","weight":2,"cost":"5 mo","properties":[],"ac":null,"notes":""},{"slug":"randello","name":"Randello","category":"Arma","subcategory":"Semplice Mischia","damage":"1d4","damageType":"Contundente","weight":1,"cost":"1 ar","properties":["Leggera"],"ac":null,"notes":""},{"slug":"arco-corto","name":"Arco Corto","category":"Arma","subcategory":"Semplice Distanza","damage":"1d6","damageType":"Perforante","weight":1,"cost":"25 mo","properties":["Munizioni (24/96)","A Due Mani"],"ac":null,"notes":"Richiede frecce"},{"slug":"balestra-leggera","name":"Balestra Leggera","category":"Arma","subcategory":"Semplice Distanza","damage":"1d8","damageType":"Perforante","weight":2.5,"cost":"25 mo","properties":["Munizioni (24/96)","Caricamento","A Due Mani"],"ac":null,"notes":"Un colpo per turno"},{"slug":"dardo","name":"Dardo","category":"Arma","subcategory":"Semplice Distanza","damage":"1d4","damageType":"Perforante","weight":0.1,"cost":"5 ar","properties":["Accurata","Lanciabile (6/18)"],"ac":null,"notes":""},{"slug":"fionda","name":"Fionda","category":"Arma","subcategory":"Semplice Distanza","damage":"1d4","damageType":"Contundente","weight":0,"cost":"1 ar","properties":["Munizioni (9/36)"],"ac":null,"notes":""},{"slug":"ascia-da-battaglia","name":"Ascia da Battaglia","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Tagliente","weight":2,"cost":"10 mo","properties":["Versatile (1d10)"],"ac":null,"notes":""},{"slug":"ascia-bipenne","name":"Ascia Bipenne","category":"Arma","subcategory":"Marziale Mischia","damage":"1d12","damageType":"Tagliente","weight":3.5,"cost":"30 mo","properties":["Pesante","A Due Mani"],"ac":null,"notes":""},{"slug":"ascia-da-guerra","name":"Ascia da Guerra","category":"Arma","subcategory":"Marziale Mischia","damage":"2d6","damageType":"Tagliente","weight":3,"cost":"15 mo","properties":["Pesante","A Due Mani"],"ac":null,"notes":""},{"slug":"flagello","name":"Flagello","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Perforante","weight":2,"cost":"10 mo","properties":[],"ac":null,"notes":""},{"slug":"lancia-lunga","name":"Lancia Lunga","category":"Arma","subcategory":"Marziale Mischia","damage":"1d10","damageType":"Perforante","weight":3,"cost":"20 mo","properties":["Pesante","Portata","A Due Mani"],"ac":null,"notes":""},{"slug":"luccio","name":"Luccio","category":"Arma","subcategory":"Marziale Mischia","damage":"1d10","damageType":"Perforante","weight":9,"cost":"5 mo","properties":["Portata","A Due Mani"],"ac":null,"notes":""},{"slug":"martello-da-guerra","name":"Martello da Guerra","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Contundente","weight":2,"cost":"15 mo","properties":["Versatile (1d10)"],"ac":null,"notes":""},{"slug":"morningstar","name":"Morningstar","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Perforante","weight":2,"cost":"15 mo","properties":[],"ac":null,"notes":""},{"slug":"piccone-da-guerra","name":"Piccone da Guerra","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Perforante","weight":1,"cost":"5 mo","properties":[],"ac":null,"notes":""},{"slug":"rapier","name":"Rapier","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Perforante","weight":1,"cost":"25 mo","properties":["Accurata"],"ac":null,"notes":""},{"slug":"scimitarra","name":"Scimitarra","category":"Arma","subcategory":"Marziale Mischia","damage":"1d6","damageType":"Tagliente","weight":1.5,"cost":"25 mo","properties":["Accurata","Leggera"],"ac":null,"notes":""},{"slug":"sciabola","name":"Sciabola","category":"Arma","subcategory":"Marziale Mischia","damage":"2d6","damageType":"Tagliente","weight":3,"cost":"50 mo","properties":["Pesante","A Due Mani"],"ac":null,"notes":""},{"slug":"spada-bastarda","name":"Spada Bastarda","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Tagliente","weight":3,"cost":"35 mo","properties":["Versatile (1d10)"],"ac":null,"notes":""},{"slug":"spada-corta","name":"Spada Corta","category":"Arma","subcategory":"Marziale Mischia","damage":"1d6","damageType":"Perforante","weight":1,"cost":"10 mo","properties":["Accurata","Leggera"],"ac":null,"notes":""},{"slug":"spada-lunga","name":"Spada Lunga","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Tagliente","weight":1.5,"cost":"15 mo","properties":["Versatile (1d10)"],"ac":null,"notes":""},{"slug":"spada-a-due-mani","name":"Spadone","category":"Arma","subcategory":"Marziale Mischia","damage":"2d6","damageType":"Tagliente","weight":3,"cost":"50 mo","properties":["Pesante","A Due Mani"],"ac":null,"notes":""},{"slug":"stocco","name":"Stocco","category":"Arma","subcategory":"Marziale Mischia","damage":"1d8","damageType":"Perforante","weight":2,"cost":"20 mo","properties":[],"ac":null,"notes":""},{"slug":"tridente","name":"Tridente","category":"Arma","subcategory":"Marziale Mischia","damage":"1d6","damageType":"Perforante","weight":2,"cost":"5 mo","properties":["Lanciabile (6/18)","Versatile (1d8)"],"ac":null,"notes":""},{"slug":"whip","name":"Frusta","category":"Arma","subcategory":"Marziale Mischia","damage":"1d4","damageType":"Tagliente","weight":1.5,"cost":"2 mo","properties":["Accurata","Portata"],"ac":null,"notes":""},{"slug":"arco-lungo","name":"Arco Lungo","category":"Arma","subcategory":"Marziale Distanza","damage":"1d8","damageType":"Perforante","weight":1,"cost":"50 mo","properties":["Munizioni (45/180)","Pesante","A Due Mani"],"ac":null,"notes":"Richiede frecce"},{"slug":"balestra-a-mano","name":"Balestra a Mano","category":"Arma","subcategory":"Marziale Distanza","damage":"1d6","damageType":"Perforante","weight":1.5,"cost":"75 mo","properties":["Munizioni (9/36)","Leggera","Caricamento"],"ac":null,"notes":""},{"slug":"balestra-pesante","name":"Balestra Pesante","category":"Arma","subcategory":"Marziale Distanza","damage":"1d10","damageType":"Perforante","weight":9,"cost":"50 mo","properties":["Munizioni (30/120)","Pesante","Caricamento","A Due Mani"],"ac":null,"notes":""},{"slug":"rete","name":"Rete","category":"Arma","subcategory":"Marziale Distanza","damage":"—","damageType":"—","weight":1.5,"cost":"1 mo","properties":["Speciale","Lanciabile (1.5/4.5)"],"ac":null,"notes":"Trattiene creatura (TS Forza CD 10)"},{"slug":"armatura-imbottita","name":"Armatura Imbottita","category":"Armatura","subcategory":"Leggera","damage":null,"damageType":null,"weight":4,"cost":"5 mo","properties":["Svantaggio Furtività"],"ac":11,"notes":"CA 11 + mod. DES"},{"slug":"armatura-di-cuoio","name":"Armatura di Cuoio","category":"Armatura","subcategory":"Leggera","damage":null,"damageType":null,"weight":5,"cost":"10 mo","properties":[],"ac":11,"notes":"CA 11 + mod. DES"},{"slug":"armatura-di-cuoio-borchiato","name":"Cuoio Borchiato","category":"Armatura","subcategory":"Leggera","damage":null,"damageType":null,"weight":6.5,"cost":"45 mo","properties":[],"ac":12,"notes":"CA 12 + mod. DES"},{"slug":"armatura-di-pellicce","name":"Pellicce","category":"Armatura","subcategory":"Media","damage":null,"damageType":null,"weight":6,"cost":"10 mo","properties":[],"ac":12,"notes":"CA 12 + mod. DES (max +2)"},{"slug":"armatura-a-scaglie","name":"Armatura a Scaglie","category":"Armatura","subcategory":"Media","damage":null,"damageType":null,"weight":22.5,"cost":"50 mo","properties":["Svantaggio Furtività"],"ac":14,"notes":"CA 14 + mod. DES (max +2)"},{"slug":"corazza","name":"Corazza","category":"Armatura","subcategory":"Media","damage":null,"damageType":null,"weight":10,"cost":"400 mo","properties":[],"ac":14,"notes":"CA 14 + mod. DES (max +2)"},{"slug":"armatura-a-maglie","name":"Cotta di Maglia","category":"Armatura","subcategory":"Media","damage":null,"damageType":null,"weight":20,"cost":"75 mo","properties":["Svantaggio Furtività"],"ac":15,"notes":"CA 15 + mod. DES (max +2)"},{"slug":"armatura-ad-anelli","name":"Armatura ad Anelli","category":"Armatura","subcategory":"Media","damage":null,"damageType":null,"weight":20,"cost":"30 mo","properties":["Svantaggio Furtività"],"ac":14,"notes":"CA 14, senza mod. DES"},{"slug":"armatura-a-stecche","name":"Armatura a Stecche","category":"Armatura","subcategory":"Media","damage":null,"damageType":null,"weight":30,"cost":"75 mo","properties":["Svantaggio Furtività"],"ac":13,"notes":"CA 13 + mod. DES (max +2)"},{"slug":"armatura-a-sbarre","name":"Armatura a Sbarre","category":"Armatura","subcategory":"Pesante","damage":null,"damageType":null,"weight":30,"cost":"30 mo","properties":["Svantaggio Furtività"],"ac":13,"notes":"CA 13, senza mod. DES. For min 13"},{"slug":"armatura-a-scaglie-pesante","name":"Armatura Squamata","category":"Armatura","subcategory":"Pesante","damage":null,"damageType":null,"weight":22.5,"cost":"50 mo","properties":["Svantaggio Furtività"],"ac":14,"notes":"CA 14, senza mod. DES"},{"slug":"mezza-armatura","name":"Mezza Armatura","category":"Armatura","subcategory":"Pesante","damage":null,"damageType":null,"weight":20,"cost":"750 mo","properties":["Svantaggio Furtività"],"ac":15,"notes":"CA 15, senza mod. DES. For min 13"},{"slug":"armatura-completa","name":"Armatura Completa","category":"Armatura","subcategory":"Pesante","damage":null,"damageType":null,"weight":32.5,"cost":"1500 mo","properties":["Svantaggio Furtività"],"ac":18,"notes":"CA 18, senza mod. DES. For min 15"},{"slug":"scudo","name":"Scudo","category":"Armatura","subcategory":"Scudo","damage":null,"damageType":null,"weight":3,"cost":"10 mo","properties":[],"ac":2,"notes":"+2 CA"},{"slug":"scudo-torre","name":"Scudo Torre","category":"Armatura","subcategory":"Scudo","damage":null,"damageType":null,"weight":6,"cost":"50 mo","properties":["Svantaggio Furtività"],"ac":3,"notes":"+2 CA, può dare copertura totale"},{"slug":"spada-+1","name":"Spada +1","category":"Magico","subcategory":"Arma Magica","damage":"1d8","damageType":"Tagliente","weight":1.5,"cost":"—","properties":["Magica","+1 attacco e danni","Versatile (1d10)"],"ac":null,"notes":"Attunement non richiesto. Supera resistenze non magiche."},{"slug":"spada-+2","name":"Spada +2","category":"Magico","subcategory":"Arma Magica","damage":"1d8","damageType":"Tagliente","weight":1.5,"cost":"—","properties":["Magica","+2 attacco e danni"],"ac":null,"notes":"Attunement non richiesto."},{"slug":"spada-+3","name":"Spada +3","category":"Magico","subcategory":"Arma Magica","damage":"1d8","damageType":"Tagliente","weight":1.5,"cost":"—","properties":["Magica","+3 attacco e danni"],"ac":null,"notes":"Attunement non richiesto."},{"slug":"arco-+1","name":"Arco +1","category":"Magico","subcategory":"Arma Magica","damage":"1d8","damageType":"Perforante","weight":1,"cost":"—","properties":["Magica","+1 attacco e danni"],"ac":null,"notes":""},{"slug":"arco-+2","name":"Arco +2","category":"Magico","subcategory":"Arma Magica","damage":"1d8","damageType":"Perforante","weight":1,"cost":"—","properties":["Magica","+2 attacco e danni"],"ac":null,"notes":""},{"slug":"ascia-+1","name":"Ascia +1","category":"Magico","subcategory":"Arma Magica","damage":"1d8","damageType":"Tagliente","weight":2,"cost":"—","properties":["Magica","+1 attacco e danni","Versatile (1d10)"],"ac":null,"notes":""},{"slug":"armatura-+1","name":"Armatura +1","category":"Magico","subcategory":"Armatura Magica","damage":null,"damageType":null,"weight":10,"cost":"—","properties":["Magica","+1 CA"],"ac":15,"notes":"CA base +1. Attunement non richiesto."},{"slug":"armatura-+2","name":"Armatura +2","category":"Magico","subcategory":"Armatura Magica","damage":null,"damageType":null,"weight":10,"cost":"—","properties":["Magica","+2 CA"],"ac":16,"notes":"CA base +2."},{"slug":"scudo-+1","name":"Scudo +1","category":"Magico","subcategory":"Armatura Magica","damage":null,"damageType":null,"weight":3,"cost":"—","properties":["Magica","+3 CA totale"],"ac":3,"notes":"+2 CA scudo +1 magico."},{"slug":"occhiali-degli-aquile","name":"Occhiali degli Aquile","category":"Magico","subcategory":"Oggetto Meraviglioso","damage":null,"damageType":null,"weight":0,"cost":"—","properties":["Attunement","Richiede Attunement"],"ac":null,"notes":"Vantaggio alle prove di Percezione (vista). Puoi vedere chiaramente fino a 1,5 km."},{"slug":"mantello-di-protezione","name":"Mantello di Protezione","category":"Magico","subcategory":"Oggetto Meraviglioso","damage":null,"damageType":null,"weight":0,"cost":"—","properties":["Attunement"],"ac":null,"notes":"+1 CA e TS. Attunement richiesto."},{"slug":"stivali-di-velocita","name":"Stivali di Velocità","category":"Magico","subcategory":"Oggetto Meraviglioso","damage":null,"damageType":null,"weight":0.5,"cost":"—","properties":["Attunement"],"ac":null,"notes":"Velocità raddoppiata, +1 CA, vantaggio TS DES. 1 ora, poi 1d4 giorni di ricarica."},{"slug":"anello-di-protezione","name":"Anello di Protezione","category":"Magico","subcategory":"Oggetto Meraviglioso","damage":null,"damageType":null,"weight":0,"cost":"—","properties":["Attunement"],"ac":null,"notes":"+1 CA e TS. Attunement richiesto."},{"slug":"bacchetta-magica","name":"Bacchetta dei Maghi da Guerra","category":"Magico","subcategory":"Oggetto Meraviglioso","damage":null,"damageType":null,"weight":0.5,"cost":"—","properties":["Attunement","Incantatore"],"ac":null,"notes":"+1 ai tiri per colpire degli incantesimi e alla CD dei TS. Attunement da incantatore."},{"slug":"amuleto-della-salute","name":"Amuleto della Salute","category":"Magico","subcategory":"Oggetto Meraviglioso","damage":null,"damageType":null,"weight":0,"cost":"—","properties":["Attunement"],"ac":null,"notes":"Costituzione diventa 19. Non ha effetto se è già 19+."},{"slug":"cintura-forza-gigante","name":"Cintura della Forza del Gigante delle Pietre","category":"Magico","subcategory":"Oggetto Meraviglioso","damage":null,"damageType":null,"weight":0.5,"cost":"—","properties":["Attunement"],"ac":null,"notes":"Forza diventa 23."},{"slug":"pozione-di-guarigione","name":"Pozione di Guarigione","category":"Magico","subcategory":"Pozione","damage":null,"damageType":null,"weight":0.25,"cost":"50 mo","properties":["Consumabile"],"ac":null,"notes":"Recupera 2d4+2 PF."},{"slug":"pozione-di-guarigione-superiore","name":"Pozione di Guarigione Superiore","category":"Magico","subcategory":"Pozione","damage":null,"damageType":null,"weight":0.25,"cost":"—","properties":["Consumabile"],"ac":null,"notes":"Recupera 4d4+4 PF."},{"slug":"pozione-di-guarigione-suprema","name":"Pozione di Guarigione Suprema","category":"Magico","subcategory":"Pozione","damage":null,"damageType":null,"weight":0.25,"cost":"—","properties":["Consumabile"],"ac":null,"notes":"Recupera 8d4+8 PF."},{"slug":"pozione-di-invisibilita","name":"Pozione di Invisibilità","category":"Magico","subcategory":"Pozione","damage":null,"damageType":null,"weight":0.25,"cost":"—","properties":["Consumabile"],"ac":null,"notes":"Invisibilità per 1 ora o finché si attacca/lancia incantesimi."},{"slug":"pozione-di-volare","name":"Pozione di Volare","category":"Magico","subcategory":"Pozione","damage":null,"damageType":null,"weight":0.25,"cost":"—","properties":["Consumabile"],"ac":null,"notes":"Velocità di volo 18 m per 1 ora."},{"slug":"kit-erboristico","name":"Kit Erboristico","category":"Strumento","subcategory":"Kit","damage":null,"damageType":null,"weight":1.5,"cost":"5 mo","properties":["Strumento Artigianale"],"ac":null,"notes":"Serve per creare pozioni curative, antidoti. Competenza: Natura o Medicina."},{"slug":"kit-da-curare","name":"Kit da Curare","category":"Strumento","subcategory":"Kit","damage":null,"damageType":null,"weight":1.5,"cost":"5 mo","properties":["10 usi"],"ac":null,"notes":"Stabilizza una creatura con 0 PF senza TS su Medicina."},{"slug":"kit-da-scasso","name":"Kit da Scasso","category":"Strumento","subcategory":"Kit","damage":null,"damageType":null,"weight":0.5,"cost":"25 mo","properties":["Competenza richiesta"],"ac":null,"notes":"Strumenti per scassinare serrature e disarmare trappole."},{"slug":"kit-da-travestimento","name":"Kit da Travestimento","category":"Strumento","subcategory":"Kit","damage":null,"damageType":null,"weight":1.5,"cost":"25 mo","properties":["Strumento Artigianale"],"ac":null,"notes":"Strumenti per travestimenti. Competenza: Inganno."},{"slug":"kit-da-avvelenatore","name":"Kit da Avvelenatore","category":"Strumento","subcategory":"Kit","damage":null,"damageType":null,"weight":1,"cost":"50 mo","properties":["Strumento Artigianale"],"ac":null,"notes":"Per preparare, applicare e neutralizzare veleni."},{"slug":"strumenti-da-fabbro","name":"Strumenti da Fabbro","category":"Strumento","subcategory":"Artigianato","damage":null,"damageType":null,"weight":4,"cost":"20 mo","properties":["Strumento Artigianale"],"ac":null,"notes":"Forgiare/riparare metallo. Competenza: Forza o Storia."},{"slug":"strumenti-da-falegname","name":"Strumenti da Falegname","category":"Strumento","subcategory":"Artigianato","damage":null,"damageType":null,"weight":3,"cost":"8 mo","properties":["Strumento Artigianale"],"ac":null,"notes":"Costruire/riparare strutture in legno."},{"slug":"strumenti-da-ladro","name":"Strumenti da Ladro","category":"Strumento","subcategory":"Artigianato","damage":null,"damageType":null,"weight":0.5,"cost":"25 mo","properties":["Competenza richiesta"],"ac":null,"notes":"Alias Kit da Scasso. Includono lima, ganci, specchio."},{"slug":"liuto","name":"Liuto","category":"Strumento","subcategory":"Musicale","damage":null,"damageType":null,"weight":1,"cost":"35 mo","properties":["Strumento Musicale"],"ac":null,"notes":"Competenza: Performance."},{"slug":"flauto","name":"Flauto","category":"Strumento","subcategory":"Musicale","damage":null,"damageType":null,"weight":0.5,"cost":"2 mo","properties":["Strumento Musicale"],"ac":null,"notes":"Competenza: Performance."},{"slug":"tamburo","name":"Tamburo","category":"Strumento","subcategory":"Musicale","damage":null,"damageType":null,"weight":1.5,"cost":"6 mo","properties":["Strumento Musicale"],"ac":null,"notes":"Competenza: Performance."},{"slug":"corno","name":"Corno","category":"Strumento","subcategory":"Musicale","damage":null,"damageType":null,"weight":1,"cost":"3 mo","properties":["Strumento Musicale"],"ac":null,"notes":"Competenza: Performance."},{"slug":"set-da-gioco-scacchi","name":"Set da Gioco: Scacchi dei Draghi","category":"Strumento","subcategory":"Gioco","damage":null,"damageType":null,"weight":0.25,"cost":"1 mo","properties":["Strumento da Gioco"],"ac":null,"notes":"Competenza: Intuizione, Inganno."}];

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
    const mQ = !query || item.name.toLowerCase().includes(query.toLowerCase()) || (item.subcategory||"").toLowerCase().includes(query.toLowerCase());
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

// ─── Monsters Database ───────────────────────────────────────────────────────
const MONSTERS_DB = [{"slug":"bandit","name":"Bandito","cr":"1/8","type":"Umanoide","size":"Media","ac":12,"hp":11,"hpDice":"2d8+2","speed":"9 m","str":11,"dex":12,"con":12,"int":10,"wis":10,"cha":10,"saves":{},"skills":{},"resistances":[],"immunities":[],"senses":"Percezione passiva 10","languages":"Qualsiasi una lingua","actions":[{"name":"Scimitarra","type":"Attacco mischia","bonus":"+3","reach":"1.5 m","targets":1,"damage":"1d6+1","damageType":"Tagliente","desc":""},{"name":"Balestra Leggera","type":"Attacco distanza","bonus":"+3","reach":"24/96 m","targets":1,"damage":"1d8+1","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[],"notes":""},{"slug":"cultist","name":"Cultista","cr":"1/8","type":"Umanoide","size":"Media","ac":12,"hp":9,"hpDice":"2d8","speed":"9 m","str":11,"dex":12,"con":10,"int":10,"wis":11,"cha":10,"saves":{},"skills":{"Inganno":"+2","Religione":"+2"},"resistances":[],"immunities":[],"senses":"Percezione passiva 10","languages":"Qualsiasi una lingua","actions":[{"name":"Coltello","type":"Attacco mischia/distanza","bonus":"+3","reach":"1.5/6 m","targets":1,"damage":"1d4+1","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[{"name":"Fanatico Oscuro","desc":"Ha vantaggio ai TS contro condizioni affascinato e spaventato mentre può vedere il suo idolo."}],"notes":""},{"slug":"giant-rat","name":"Ratto Gigante","cr":"1/8","type":"Bestia","size":"Piccola","ac":12,"hp":7,"hpDice":"2d6","speed":"9 m, nuoto 9 m","str":7,"dex":15,"con":11,"int":2,"wis":10,"cha":4,"saves":{},"skills":{},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 10","languages":"—","actions":[{"name":"Morso","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"1d4+2","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[{"name":"Odorato Acuto","desc":"Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto."},{"name":"Tattiche di Branco","desc":"Vantaggio ai tiri per colpire se almeno un alleato non incapacitato è adiacente al bersaglio."}],"notes":""},{"slug":"kobold","name":"Coboldo","cr":"1/8","type":"Umanoide","size":"Piccola","ac":12,"hp":5,"hpDice":"2d6-2","speed":"9 m","str":7,"dex":15,"con":9,"int":8,"wis":7,"cha":8,"saves":{},"skills":{},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 8","languages":"Draconico","actions":[{"name":"Daga","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"1d4+2","damageType":"Perforante","desc":""},{"name":"Fionda","type":"Attacco distanza","bonus":"+4","reach":"9/36 m","targets":1,"damage":"1d4+2","damageType":"Contundente","desc":""}],"legendaryActions":[],"traits":[{"name":"Sensibilità alla Luce Solare","desc":"Svantaggio ai tiri per colpire e prove di Percezione basate sulla vista in piena luce."},{"name":"Tattiche di Branco","desc":"Vantaggio ai tiri per colpire se almeno un alleato non incapacitato è adiacente al bersaglio."}],"notes":""},{"slug":"skeleton","name":"Scheletro","cr":"1/4","type":"Non-morto","size":"Media","ac":13,"hp":13,"hpDice":"2d8+4","speed":"9 m","str":10,"dex":14,"con":15,"int":6,"wis":8,"cha":5,"saves":{},"skills":{},"resistances":[],"immunities":["Veleno","Esaurimento","Avvelenato"],"senses":"Scurovisione 18 m, Percezione passiva 9","languages":"Comprende le lingue che conosceva in vita","actions":[{"name":"Scimitarra","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"1d6+2","damageType":"Tagliente","desc":""},{"name":"Arco Corto","type":"Attacco distanza","bonus":"+4","reach":"24/96 m","targets":1,"damage":"1d6+2","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[],"notes":"Vulnerabilità: danni contundenti"},{"slug":"zombie","name":"Zombie","cr":"1/4","type":"Non-morto","size":"Media","ac":8,"hp":22,"hpDice":"3d8+9","speed":"6 m","str":13,"dex":6,"con":16,"int":3,"wis":6,"cha":5,"saves":{"WIS":"+0"},"skills":{},"resistances":[],"immunities":["Veleno","Avvelenato","Esaurimento"],"senses":"Scurovisione 18 m, Percezione passiva 8","languages":"Comprende le lingue che conosceva in vita","actions":[{"name":"Colpo Sferrato","type":"Attacco mischia","bonus":"+3","reach":"1.5 m","targets":1,"damage":"1d6+1","damageType":"Contundente","desc":""}],"legendaryActions":[],"traits":[{"name":"Tenacia Non-morta","desc":"Se i danni riducono lo zombie a 0 PF, deve fare un TS su Costituzione (CD 5 + danno) o subire danni necrotici al massimo pari ai PF rimasti — se supera sopravvive con 1 PF."}],"notes":""},{"slug":"goblin","name":"Goblin","cr":"1/4","type":"Umanoide","size":"Piccola","ac":15,"hp":7,"hpDice":"2d6","speed":"9 m","str":8,"dex":14,"con":10,"int":10,"wis":8,"cha":8,"saves":{},"skills":{"Furtività":"+6"},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 9","languages":"Comune, Goblin","actions":[{"name":"Scimitarra","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"1d6+2","damageType":"Tagliente","desc":""},{"name":"Arco Corto","type":"Attacco distanza","bonus":"+4","reach":"24/96 m","targets":1,"damage":"1d6+2","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[{"name":"Fuga Agile","desc":"Può eseguire le azioni Disimpegno e Nascondersi come azione bonus ogni turno."}],"notes":""},{"slug":"wolf","name":"Lupo","cr":"1/4","type":"Bestia","size":"Media","ac":13,"hp":11,"hpDice":"2d8+2","speed":"12 m","str":12,"dex":15,"con":12,"int":3,"wis":12,"cha":6,"saves":{},"skills":{"Percezione":"+3","Furtività":"+4"},"resistances":[],"immunities":[],"senses":"Percezione passiva 13","languages":"—","actions":[{"name":"Morso","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"2d4+2","damageType":"Perforante","desc":"Se il bersaglio è una creatura, deve superare un TS su Forza (CD 11) o cadere prono."}],"legendaryActions":[],"traits":[{"name":"Odorato Acuto","desc":"Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto."},{"name":"Tattiche di Branco","desc":"Vantaggio ai tiri per colpire se almeno un alleato non incapacitato è adiacente al bersaglio."}],"notes":""},{"slug":"orc","name":"Orco","cr":"1/2","type":"Umanoide","size":"Media","ac":13,"hp":15,"hpDice":"2d8+6","speed":"9 m","str":16,"dex":12,"con":16,"int":7,"wis":11,"cha":10,"saves":{},"skills":{"Intimidazione":"+2"},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 10","languages":"Comune, Orchesco","actions":[{"name":"Ascia da Battaglia","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"1d8+3","damageType":"Tagliente","desc":""},{"name":"Giavellotto","type":"Attacco mischia/distanza","bonus":"+5","reach":"1.5/9/36 m","targets":1,"damage":"1d6+3","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[{"name":"Resistenza Aggressiva","desc":"Come azione bonus, può muoversi fino alla sua velocità verso un nemico visibile."}],"notes":""},{"slug":"worg","name":"Vorg","cr":"1/2","type":"Bestia","size":"Grande","ac":13,"hp":26,"hpDice":"4d10+4","speed":"15 m","str":16,"dex":13,"con":13,"int":7,"wis":11,"cha":8,"saves":{},"skills":{"Percezione":"+4"},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 14","languages":"Goblin, Vorg","actions":[{"name":"Morso","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"2d6+3","damageType":"Perforante","desc":"Il bersaglio deve superare un TS su Forza (CD 13) o cadere prono."}],"legendaryActions":[],"traits":[{"name":"Odorato Acuto","desc":"Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto."}],"notes":""},{"slug":"black-bear","name":"Orso Nero","cr":"1/2","type":"Bestia","size":"Media","ac":11,"hp":19,"hpDice":"3d8+6","speed":"12 m, scalata 9 m","str":15,"dex":10,"con":14,"int":2,"wis":12,"cha":7,"saves":{},"skills":{"Percezione":"+3"},"resistances":[],"immunities":[],"senses":"Percezione passiva 13","languages":"—","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Effettua due attacchi: uno con morso e uno con gli artigli."},{"name":"Morso","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"1d6+2","damageType":"Perforante","desc":""},{"name":"Artigli","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"2d6+2","damageType":"Tagliente","desc":""}],"legendaryActions":[],"traits":[{"name":"Odorato Acuto","desc":"Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto."}],"notes":""},{"slug":"bugbear","name":"Buggaio","cr":"1","type":"Umanoide","size":"Media","ac":16,"hp":27,"hpDice":"5d8+5","speed":"9 m","str":15,"dex":14,"con":13,"int":8,"wis":11,"cha":9,"saves":{},"skills":{"Furtività":"+6","Sopravvivenza":"+2"},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 10","languages":"Comune, Goblin","actions":[{"name":"Mazzafrusto","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"2d6+2","damageType":"Perforante","desc":"Se sorprende una creatura, infligge 7 (2d6) danni aggiuntivi."},{"name":"Giavellotto","type":"Attacco mischia/distanza","bonus":"+4","reach":"1.5/9/36 m","targets":1,"damage":"1d6+2","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[{"name":"Forza Bruta","desc":"Un'arma da mischia infligge un dado di danno aggiuntivo quando colpisce (già incluso)."},{"name":"Sorpresa Letale","desc":"Se sorprende una creatura e la colpisce nel primo round, infligge 7 danni extra."}],"notes":""},{"slug":"dire-wolf","name":"Lupo Feroce","cr":"1","type":"Bestia","size":"Grande","ac":14,"hp":37,"hpDice":"5d10+10","speed":"15 m","str":17,"dex":15,"con":15,"int":3,"wis":12,"cha":7,"saves":{},"skills":{"Percezione":"+3","Furtività":"+4"},"resistances":[],"immunities":[],"senses":"Percezione passiva 13","languages":"—","actions":[{"name":"Morso","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"2d6+3","damageType":"Perforante","desc":"Il bersaglio deve superare un TS su Forza (CD 13) o cadere prono."}],"legendaryActions":[],"traits":[{"name":"Odorato Acuto","desc":"Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto."},{"name":"Tattiche di Branco","desc":"Vantaggio ai tiri per colpire se almeno un alleato non incapacitato è adiacente al bersaglio."}],"notes":""},{"slug":"ghoul","name":"Ghoul","cr":"1","type":"Non-morto","size":"Media","ac":12,"hp":22,"hpDice":"5d8","speed":"9 m","str":13,"dex":15,"con":10,"int":7,"wis":10,"cha":6,"saves":{},"skills":{},"resistances":[],"immunities":["Veleno","Esaurimento","Affascinato","Avvelenato"],"senses":"Scurovisione 18 m, Percezione passiva 10","languages":"Comune","actions":[{"name":"Morso","type":"Attacco mischia","bonus":"+2","reach":"1.5 m","targets":1,"damage":"2d6+2","damageType":"Perforante","desc":"Non funziona contro non-morti ed elfi."},{"name":"Artigli","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"2d4+2","damageType":"Tagliente","desc":"Se il bersaglio è una creatura diversa da elfo/non-morto, deve superare TS su Cos CD 10 o essere paralizzato per 1 minuto."}],"legendaryActions":[],"traits":[],"notes":""},{"slug":"harpy","name":"Arpia","cr":"1","type":"Mostruosità","size":"Media","ac":11,"hp":38,"hpDice":"7d8+7","speed":"6 m, volo 12 m","str":12,"dex":13,"con":12,"int":7,"wis":10,"cha":13,"saves":{},"skills":{},"resistances":[],"immunities":[],"senses":"Percezione passiva 10","languages":"Comune","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Effettua due attacchi: uno con artiglio e uno con mazza."},{"name":"Artiglio","type":"Attacco mischia","bonus":"+3","reach":"1.5 m","targets":1,"damage":"2d4+1","damageType":"Tagliente","desc":""},{"name":"Mazza","type":"Attacco mischia","bonus":"+3","reach":"1.5 m","targets":1,"damage":"1d6+1","damageType":"Contundente","desc":""},{"name":"Canto Seducente","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Ogni umanoide entro 90 m che può udirla deve superare TS su Sag CD 11 o essere affascinato per 1 minuto."}],"legendaryActions":[],"traits":[],"notes":""},{"slug":"imp","name":"Diavoletto","cr":"1","type":"Diavolo (Infernale)","size":"Minuscola","ac":13,"hp":10,"hpDice":"3d4+3","speed":"6 m, volo 12 m","str":6,"dex":17,"con":13,"int":11,"wis":12,"cha":14,"saves":{},"skills":{"Inganno":"+4","Intuizione":"+3","Percezione":"+3","Furtività":"+5","Persuasione":"+4"},"resistances":["Freddo; Non magiche Contundente/Perforante/Tagliente"],"immunities":["Fuoco","Veleno","Avvelenato"],"senses":"Scurovisione 36 m, Percezione passiva 13","languages":"Infernale, Comune","actions":[{"name":"Pungiglione (forma vera)","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"1d4+3","damageType":"Perforante","desc":"Il bersaglio deve superare TS su Cos CD 11 o subire 3d6 danni veleno, dimezzati in caso di successo."}],"legendaryActions":[],"traits":[{"name":"Resistenza Magica","desc":"Vantaggio ai TS contro incantesimi e altri effetti magici."},{"name":"Invisibilità","desc":"Può diventare invisibile come azione, finché non attacca."}],"notes":""},{"slug":"ogre","name":"Orchetto","cr":"2","type":"Gigante","size":"Grande","ac":11,"hp":59,"hpDice":"7d10+21","speed":"12 m","str":19,"dex":8,"con":16,"int":5,"wis":7,"cha":7,"saves":{},"skills":{},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 8","languages":"Comune, Gigante","actions":[{"name":"Clava","type":"Attacco mischia","bonus":"+6","reach":"1.5 m","targets":1,"damage":"2d8+4","damageType":"Contundente","desc":""},{"name":"Giavellotto","type":"Attacco mischia/distanza","bonus":"+6","reach":"1.5/9/36 m","targets":1,"damage":"2d6+4","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[],"notes":""},{"slug":"gargoyle","name":"Gargoyle","cr":"2","type":"Elementale","size":"Media","ac":15,"hp":52,"hpDice":"7d8+21","speed":"9 m, volo 18 m","str":15,"dex":11,"con":16,"int":6,"wis":11,"cha":7,"saves":{},"skills":{},"resistances":["Contundente/Perforante/Tagliente da armi non magiche non adamantio"],"immunities":["Veleno","Pietrificato","Avvelenato"],"senses":"Scurovisione 18 m, Percezione passiva 10","languages":"Terrestre","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Effettua due attacchi: morso e artigli."},{"name":"Morso","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"1d6+2","damageType":"Perforante","desc":""},{"name":"Artigli","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"2d6+2","damageType":"Tagliente","desc":""}],"legendaryActions":[],"traits":[{"name":"Postura Falsa","desc":"Mentre rimane immobile, è indistinguibile da una statua."}],"notes":""},{"slug":"ghast","name":"Ghast","cr":"2","type":"Non-morto","size":"Media","ac":13,"hp":36,"hpDice":"8d8","speed":"9 m","str":16,"dex":17,"con":10,"int":11,"wis":10,"cha":8,"saves":{},"skills":{},"resistances":["Necrotico"],"immunities":["Veleno","Esaurimento","Affascinato","Avvelenato"],"senses":"Scurovisione 18 m, Percezione passiva 10","languages":"Comune","actions":[{"name":"Morso","type":"Attacco mischia","bonus":"+3","reach":"1.5 m","targets":1,"damage":"2d8+3","damageType":"Perforante","desc":""},{"name":"Artigli","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"2d6+3","damageType":"Tagliente","desc":"TS Cos CD 10 o paralizzato 1 minuto (non elfi/non-morti)."}],"legendaryActions":[],"traits":[{"name":"Fetore","desc":"Ogni creatura che inizia il turno entro 1.5 m deve superare TS su Cos CD 10 o essere nauseata fino all'inizio del suo turno successivo."},{"name":"Tattiche di Branco","desc":"Vantaggio ai tiri per colpire se almeno un alleato non incapacitato è adiacente al bersaglio."}],"notes":""},{"slug":"mimic","name":"Mimo","cr":"2","type":"Mostruosità","size":"Media","ac":12,"hp":58,"hpDice":"9d8+18","speed":"4.5 m","str":17,"dex":12,"con":15,"int":5,"wis":13,"cha":8,"saves":{},"skills":{"Furtività":"+5"},"resistances":[],"immunities":["Acido","Prono"],"senses":"Scurovisione 18 m, Percezione passiva 11","languages":"—","actions":[{"name":"Pseudopodo","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"1d8+3","damageType":"Contundente","desc":"Il bersaglio deve superare TS su Forza CD 13 o essere agganciato (CD fuga 13)."},{"name":"Morso","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"1d8+3","damageType":"Perforante","desc":"Più 1d8 danni acido. Solo contro creature agganciato."}],"legendaryActions":[],"traits":[{"name":"Forma Falsa","desc":"Mentre immobile assume forma di un oggetto inanimato."},{"name":"Corpo Adesivo","desc":"Il mimo aderisce a tutto ciò che tocca. Una creatura agganciata può fuggire con TS Forza CD 13 come azione."}],"notes":""},{"slug":"owlbear","name":"Orsogufo","cr":"3","type":"Bestia","size":"Grande","ac":13,"hp":59,"hpDice":"7d10+21","speed":"12 m","str":20,"dex":12,"con":17,"int":3,"wis":12,"cha":7,"saves":{},"skills":{"Percezione":"+3"},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 13","languages":"—","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Effettua due attacchi: becco e artigli."},{"name":"Becco","type":"Attacco mischia","bonus":"+7","reach":"1.5 m","targets":1,"damage":"1d10+5","damageType":"Perforante","desc":""},{"name":"Artigli","type":"Attacco mischia","bonus":"+7","reach":"1.5 m","targets":1,"damage":"2d8+5","damageType":"Tagliente","desc":""}],"legendaryActions":[],"traits":[{"name":"Odorato Acuto","desc":"Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto."}],"notes":""},{"slug":"knight","name":"Cavaliere","cr":"3","type":"Umanoide","size":"Media","ac":18,"hp":52,"hpDice":"8d8+16","speed":"9 m","str":16,"dex":11,"con":14,"int":11,"wis":11,"cha":15,"saves":{"COS":"+4","SAG":"+2"},"skills":{},"resistances":[],"immunities":[],"senses":"Percezione passiva 10","languages":"Comune e una altra","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Due attacchi con arma da mischia."},{"name":"Spada a Due Mani","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"2d6+3","damageType":"Tagliente","desc":""},{"name":"Balestra Pesante","type":"Attacco distanza","bonus":"+2","reach":"30/120 m","targets":1,"damage":"1d10","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[{"name":"Ardimento","desc":"Il cavaliere e le creature amichevoli entro 9 m non possono essere spaventati mentre il cavaliere è cosciente."}],"notes":""},{"slug":"werewolf","name":"Licantropo (Lupo)","cr":"3","type":"Umanoide","size":"Media","ac":11,"hp":58,"hpDice":"9d8+18","speed":"9 m (12 m in forma lupo)","str":15,"dex":13,"con":14,"int":10,"wis":11,"cha":10,"saves":{},"skills":{"Percezione":"+4","Furtività":"+3"},"resistances":[],"immunities":["Contundente/Perforante/Tagliente non magiche non argentate"],"senses":"Percezione passiva 14","languages":"Comune (non in forma lupo)","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Due attacchi: uno morso e uno artiglio in forma ibrida."},{"name":"Morso (ibrida/lupo)","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"2d6+2","damageType":"Perforante","desc":"TS Cos CD 12 o contrarre la licantropia del lupo."},{"name":"Artigli (ibrida)","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"2d4+2","damageType":"Tagliente","desc":""}],"legendaryActions":[],"traits":[{"name":"Odorato Acuto","desc":"Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto."},{"name":"Tattiche di Branco","desc":"Vantaggio ai tiri per colpire se almeno un alleato non incapacitato è adiacente al bersaglio."}],"notes":""},{"slug":"banshee","name":"Banshee","cr":"4","type":"Non-morto","size":"Media","ac":12,"hp":58,"hpDice":"13d8","speed":"0 m, volo 12 m (planare)","str":1,"dex":14,"con":10,"int":12,"wis":11,"cha":17,"saves":{"SAG":"+2","CAR":"+5"},"skills":{"Percezione":"+2"},"resistances":["Acido","Fuoco","Fulmine","Tuono; Contundente/Perforante/Tagliente non magiche"],"immunities":["Freddo","Necrotico","Veleno; molte condizioni"],"senses":"Scurovisione 18 m (planare), Percezione passiva 12","languages":"Lingue che conosceva in vita","actions":[{"name":"Tocco Corruttore","type":"Attacco mischia","bonus":"+4","reach":"1.5 m","targets":1,"damage":"3d6","damageType":"Necrotico","desc":""},{"name":"Urlo di Morte","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Ogni creatura entro 18 m (non non-morti) che può sentirla: TS su Cos CD 13 o scende a 0 PF, oppure subisce 3d6+3 danni necrotici. Ricarica dopo riposo lungo."},{"name":"Lamento","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Ogni creatura entro 9 m deve superare TS su Sag CD 13 o essere spaventata fino all'inizio del suo prossimo turno."}],"legendaryActions":[],"traits":[{"name":"Aspetto Orribile","desc":"Ogni umanoide che la veda: TS su Sag CD 13 o spaventato per 1 minuto."},{"name":"Incorporea","desc":"Può attraversare creature e oggetti come terreno difficile. Subisce 5 danni da forza se termina il turno dentro un oggetto."}],"notes":""},{"slug":"ettin","name":"Ettino","cr":"4","type":"Gigante","size":"Grande","ac":12,"hp":85,"hpDice":"10d10+30","speed":"12 m","str":21,"dex":8,"con":17,"int":6,"wis":10,"cha":8,"saves":{},"skills":{"Percezione":"+4"},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 14","languages":"Gigante, Orchesco","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Due attacchi con mazza chiodata."},{"name":"Mazza Chiodata","type":"Attacco mischia","bonus":"+7","reach":"1.5 m","targets":1,"damage":"2d6+5","damageType":"Perforante","desc":""}],"legendaryActions":[],"traits":[{"name":"Due Teste","desc":"Vantaggio alle prove di Saggezza (Percezione) e ai TS contro accecato, affascinato, spaventato, stordito e inconsapevole."},{"name":"Sveglio","desc":"Quando una testa dorme l'altra è sveglia."}],"notes":""},{"slug":"troll","name":"Troll","cr":"5","type":"Gigante","size":"Grande","ac":15,"hp":84,"hpDice":"8d10+40","speed":"9 m","str":18,"dex":13,"con":20,"int":7,"wis":9,"cha":7,"saves":{},"skills":{"Percezione":"+2"},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 12","languages":"Gigante","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Un morso e due artigli."},{"name":"Morso","type":"Attacco mischia","bonus":"+7","reach":"1.5 m","targets":1,"damage":"1d6+4","damageType":"Perforante","desc":""},{"name":"Artigli","type":"Attacco mischia","bonus":"+7","reach":"1.5 m","targets":1,"damage":"2d6+4","damageType":"Tagliente","desc":""}],"legendaryActions":[],"traits":[{"name":"Odorato Acuto","desc":"Vantaggio alle prove di Saggezza (Percezione) basate sull'olfatto."},{"name":"Rigenerazione","desc":"Recupera 10 PF all'inizio di ogni turno. Se subisce danni acido o fuoco, non si rigenera fino al prossimo turno. Muore solo a 0 PF senza rigenerazione."}],"notes":""},{"slug":"vampire-spawn","name":"Progenie Vampirica","cr":"5","type":"Non-morto","size":"Media","ac":15,"hp":82,"hpDice":"11d8+33","speed":"9 m","str":16,"dex":16,"con":16,"int":11,"wis":10,"cha":12,"saves":{"DEX":"+6","SAG":"+3"},"skills":{"Percezione":"+3","Furtività":"+6"},"resistances":["Necrotico; Contundente/Perforante/Tagliente non magiche"],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 13","languages":"Lingue che conosceva in vita","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Due attacchi: uno con artigli e uno con morso."},{"name":"Artigli","type":"Attacco mischia","bonus":"+6","reach":"1.5 m","targets":1,"damage":"2d4+3","damageType":"Tagliente","desc":"Il bersaglio è trattenuto (CD fuga 13) invece dei danni se si vuole."},{"name":"Morso","type":"Attacco mischia","bonus":"+6","reach":"1.5 m","targets":1,"damage":"1d6+3","damageType":"Perforante","desc":"Più 3d6 necrotici. Il max PF del bersaglio si riduce della quantità curata dalla progenie (metà danno necrotico)."}],"legendaryActions":[],"traits":[{"name":"Sensibilità alla Luce Solare","desc":"Svantaggio ai tiri per colpire e alle prove di Percezione alla luce solare."},{"name":"Arrampicata Ragno","desc":"Può scalare superfici difficili, anche soffitti, senza prove."}],"notes":""},{"slug":"hill-giant","name":"Gigante della Collina","cr":"5","type":"Gigante","size":"Enorme","ac":13,"hp":105,"hpDice":"10d12+40","speed":"12 m","str":21,"dex":8,"con":19,"int":5,"wis":9,"cha":6,"saves":{},"skills":{"Percezione":"+2"},"resistances":[],"immunities":[],"senses":"Percezione passiva 12","languages":"Gigante","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Due attacchi con clava."},{"name":"Clava Grande","type":"Attacco mischia","bonus":"+8","reach":"3 m","targets":1,"damage":"3d8+5","damageType":"Contundente","desc":""},{"name":"Lancia un Masso","type":"Attacco distanza","bonus":"+8","reach":"18/72 m","targets":1,"damage":"3d10+5","damageType":"Contundente","desc":""}],"legendaryActions":[],"traits":[],"notes":""},{"slug":"mummy","name":"Mummia","cr":"3","type":"Non-morto","size":"Media","ac":11,"hp":58,"hpDice":"9d8+18","speed":"6 m","str":16,"dex":8,"con":15,"int":6,"wis":10,"cha":12,"saves":{"SAG":"+2","CAR":"+3"},"skills":{},"resistances":["Contundente/Perforante/Tagliente non magiche"],"immunities":["Necrotico","Veleno; varie condizioni"],"senses":"Scurovisione 18 m, Percezione passiva 10","languages":"Lingue che conosceva in vita","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Uno sguardo orribile e un pugno impregnato."},{"name":"Pugno Impregnato","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"2d6+3","damageType":"Contundente","desc":"Più 3d6 necrotici. Il bersaglio è maledetto dalla Maledizione della Mummia se fallisce TS Cos CD 12."},{"name":"Sguardo Orribile","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Un non-morto visibile deve superare TS su Sag CD 11 o essere spaventato fino al termine del prossimo turno della mummia."}],"legendaryActions":[],"traits":[],"notes":""},{"slug":"wyvern","name":"Viverna","cr":"6","type":"Drago","size":"Grande","ac":13,"hp":110,"hpDice":"13d10+39","speed":"6 m, volo 24 m","str":19,"dex":10,"con":16,"int":5,"wis":12,"cha":6,"saves":{},"skills":{"Percezione":"+4"},"resistances":[],"immunities":[],"senses":"Scurovisione 18 m, Percezione passiva 14","languages":"—","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Un morso e uno pungiglione. Non può usarli contro la stessa creatura."},{"name":"Morso","type":"Attacco mischia","bonus":"+7","reach":"3 m","targets":1,"damage":"2d6+4","damageType":"Perforante","desc":""},{"name":"Pungiglione","type":"Attacco mischia","bonus":"+7","reach":"3 m","targets":1,"damage":"2d6+4","damageType":"Perforante","desc":"Più 7d6 veleno. TS Cos CD 15 per dimezzare."},{"name":"Artigli","type":"Attacco mischia","bonus":"+7","reach":"1.5 m","targets":1,"damage":"2d8+4","damageType":"Tagliente","desc":""}],"legendaryActions":[],"traits":[],"notes":""},{"slug":"young-red-dragon","name":"Drago Rosso Giovane","cr":"10","type":"Drago","size":"Grande","ac":18,"hp":178,"hpDice":"17d10+85","speed":"12 m, scalata 12 m, volo 24 m","str":23,"dex":10,"con":21,"int":14,"wis":11,"cha":19,"saves":{"DEX":"+4","COS":"+9","SAG":"+4","CAR":"+8"},"skills":{"Percezione":"+8","Furtività":"+4"},"resistances":[],"immunities":["Fuoco"],"senses":"Scurovisione 18 m, Visione nel Buio 18 m, Percezione passiva 18","languages":"Comune, Draconico","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Un morso e due artigli."},{"name":"Morso","type":"Attacco mischia","bonus":"+10","reach":"3 m","targets":1,"damage":"2d10+6","damageType":"Perforante","desc":"Più 4d6 fuoco."},{"name":"Artigli","type":"Attacco mischia","bonus":"+10","reach":"1.5 m","targets":1,"damage":"2d6+6","damageType":"Tagliente","desc":""},{"name":"Soffio di Fuoco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"16d6","damageType":"Fuoco","desc":"Cono 9 m. TS Destrezza CD 17 per dimezzare. Ricarica 5-6."}],"legendaryActions":[],"traits":[{"name":"Resistenza Leggendaria (3/giorno)","desc":"Se fallisce un TS, può scegliere di superarlo comunque."}],"notes":""},{"slug":"adult-red-dragon","name":"Drago Rosso Adulto","cr":"17","type":"Drago","size":"Enorme","ac":19,"hp":256,"hpDice":"19d12+133","speed":"12 m, scalata 12 m, volo 24 m","str":27,"dex":10,"con":25,"int":16,"wis":13,"cha":21,"saves":{"DEX":"+6","COS":"+13","SAG":"+7","CAR":"+11"},"skills":{"Percezione":"+13","Furtività":"+6"},"resistances":[],"immunities":["Fuoco"],"senses":"Scurovisione 18 m, Visione nel Buio 36 m, Percezione passiva 23","languages":"Comune, Draconico","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Può usare Presenza Spaventosa. Poi un morso e due artigli."},{"name":"Morso","type":"Attacco mischia","bonus":"+14","reach":"3 m","targets":1,"damage":"2d10+8","damageType":"Perforante","desc":"Più 4d6 fuoco."},{"name":"Artigli","type":"Attacco mischia","bonus":"+14","reach":"1.5 m","targets":1,"damage":"2d6+8","damageType":"Tagliente","desc":""},{"name":"Coda","type":"Attacco mischia","bonus":"+14","reach":"4.5 m","targets":1,"damage":"2d8+8","damageType":"Contundente","desc":""},{"name":"Soffio di Fuoco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"18d6","damageType":"Fuoco","desc":"Cono 18 m. TS Destrezza CD 21 per dimezzare. Ricarica 5-6."},{"name":"Presenza Spaventosa","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Ogni creatura entro 36 m consapevole del drago: TS Sag CD 19 o spaventata per 1 minuto."}],"legendaryActions":[{"name":"Rilevare","desc":"Effettua una prova di Saggezza (Percezione)."},{"name":"Attacco con la Coda (1 azione)","desc":"Attacco con la coda."},{"name":"Attacco ad Ala (2 azioni)","desc":"Sbatte le ali: TS Destrezza CD 22 o 2d6+8 danni contundenti e caduta proni. Poi vola fino alla sua velocità di volo."}],"traits":[{"name":"Resistenza Leggendaria (3/giorno)","desc":"Se fallisce un TS, può scegliere di superarlo comunque."}],"notes":""},{"slug":"ancient-red-dragon","name":"Drago Rosso Antico","cr":"24","type":"Drago","size":"Mastodontica","ac":22,"hp":546,"hpDice":"28d20+252","speed":"12 m, scalata 12 m, volo 24 m","str":30,"dex":10,"con":29,"int":18,"wis":15,"cha":23,"saves":{"DEX":"+7","COS":"+16","SAG":"+9","CAR":"+13"},"skills":{"Percezione":"+16","Furtività":"+7"},"resistances":[],"immunities":["Fuoco"],"senses":"Scurovisione 18 m, Visione nel Buio 36 m, Percezione passiva 26","languages":"Comune, Draconico","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Può usare Presenza Spaventosa. Poi un morso e due artigli."},{"name":"Morso","type":"Attacco mischia","bonus":"+17","reach":"4.5 m","targets":1,"damage":"2d10+10","damageType":"Perforante","desc":"Più 4d6 fuoco."},{"name":"Artigli","type":"Attacco mischia","bonus":"+17","reach":"3 m","targets":1,"damage":"2d6+10","damageType":"Tagliente","desc":""},{"name":"Coda","type":"Attacco mischia","bonus":"+17","reach":"6 m","targets":1,"damage":"2d8+10","damageType":"Contundente","desc":""},{"name":"Soffio di Fuoco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"20d6","damageType":"Fuoco","desc":"Cono 27 m. TS Destrezza CD 24 per dimezzare. Ricarica 5-6."},{"name":"Presenza Spaventosa","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Ogni creatura entro 36 m: TS Sag CD 21 o spaventata per 1 minuto."}],"legendaryActions":[{"name":"Rilevare","desc":"Effettua una prova di Saggezza (Percezione)."},{"name":"Attacco con la Coda (1 azione)","desc":"Attacco con la coda."},{"name":"Attacco ad Ala (2 azioni)","desc":"Sbatte le ali: TS Destrezza CD 25 o 2d6+10 danni e caduta proni. Poi vola."}],"traits":[{"name":"Resistenza Leggendaria (3/giorno)","desc":"Se fallisce un TS, può scegliere di superarlo comunque."}],"notes":""},{"slug":"lich","name":"Lich","cr":"21","type":"Non-morto","size":"Media","ac":17,"hp":135,"hpDice":"18d8+54","speed":"9 m","str":11,"dex":16,"con":16,"int":20,"wis":14,"cha":16,"saves":{"COS":"+10","INT":"+12","SAG":"+9"},"skills":{"Arcano":"+18","Percezione":"+9","Intuizione":"+9","Storia":"+12"},"resistances":["Freddo","Fulmine","Necrotico"],"immunities":["Veleno; varie condizioni"],"senses":"Scurovisione 18 m, Visione nel Buio 18 m, Percezione passiva 19","languages":"Comune e cinque altre","actions":[{"name":"Tocco Paralizzante","type":"Attacco mischia","bonus":"+12","reach":"1.5 m","targets":1,"damage":"3d6","damageType":"Freddo","desc":"TS Cos CD 18 o paralizzato per 1 minuto."},{"name":"Sguardo Spaventoso","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Una creatura entro 18 m: TS Sag CD 18 o spaventato per 1 minuto."},{"name":"Scarica Arcana (ricarica 5-6)","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"4d6","damageType":"Forza","desc":"Il lich lancia un lampo di energia. Tre raggi, ognuno con +12 per colpire, portata 18 m."}],"legendaryActions":[{"name":"Cantrip","desc":"Lancia un trucchetto."},{"name":"Tocco Paralizzante (2 azioni)","desc":"Usa il Tocco Paralizzante."},{"name":"Magia Spaventosa (3 azioni)","desc":"Lancia Paura usando uno slot incantesimo."}],"traits":[{"name":"Resistenza Leggendaria (3/giorno)","desc":"Se fallisce un TS, può scegliere di superarlo comunque."},{"name":"Resistenza Magica","desc":"Vantaggio ai TS contro incantesimi e altri effetti magici."},{"name":"Turno degli Incantesimi","desc":"Incantatore di 18° livello. Slot fino al 9° livello."}],"notes":""},{"slug":"mind-flayer","name":"Mangiamenti","cr":"7","type":"Aberrazione","size":"Media","ac":15,"hp":71,"hpDice":"13d8+13","speed":"9 m","str":11,"dex":12,"con":12,"int":19,"wis":17,"cha":17,"saves":{"INT":"+7","SAG":"+6","CAR":"+6"},"skills":{"Arcano":"+7","Inganno":"+6","Intuizione":"+6","Percezione":"+6","Persuasione":"+6","Furtività":"+4"},"resistances":[],"immunities":[],"senses":"Scurovisione 36 m, Percezione passiva 16","languages":"Comune, Sottocomune, Telepatia 18 m","actions":[{"name":"Tentacoli","type":"Attacco mischia","bonus":"+7","reach":"1.5 m","targets":1,"damage":"2d10+4","damageType":"Psichico","desc":"Il bersaglio è afferrato (CD fuga 15). Il mangiamenti non può usare i tentacoli contro un'altra creatura mentre afferra."},{"name":"Estrai Cervello","type":"Attacco mischia","bonus":"+7","reach":"1.5 m","targets":1,"damage":"10d10","damageType":"Perforante","desc":"Solo contro creature afferrate. Il bersaglio muore se ridotto a 0 PF."},{"name":"Scoppio Mentale (ricarica 5-6)","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"4d8+4","damageType":"Psichico","desc":"Cono di 18 m. TS Int CD 15 per dimezzare. Le creature che falliscono sono stordite per 1 minuto."}],"legendaryActions":[],"traits":[{"name":"Resistenza Magica","desc":"Vantaggio ai TS contro incantesimi e altri effetti magici."},{"name":"Incantatore","desc":"Incantatore di 10° livello. Slot fino al 5° livello."}],"notes":""},{"slug":"beholder","name":"Osservatore","cr":"13","type":"Aberrazione","size":"Grande","ac":18,"hp":180,"hpDice":"19d10+76","speed":"0 m, volo 6 m (planare)","str":10,"dex":14,"con":18,"int":17,"wis":15,"cha":17,"saves":{"INT":"+8","SAG":"+7","CAR":"+8"},"skills":{"Percezione":"+12"},"resistances":[],"immunities":["Prono"],"senses":"Scurovisione 36 m, Percezione passiva 22","languages":"Sottocomune","actions":[{"name":"Morso","type":"Attacco mischia","bonus":"+5","reach":"1.5 m","targets":1,"damage":"4d6","damageType":"Perforante","desc":""},{"name":"Raggi degli Occhi","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Usa 3 raggi casuali tra i 10 disponibili (ciascuno contro una creatura diversa entro 90 m)."}],"legendaryActions":[{"name":"Raggio degli Occhi","desc":"Usa uno dei suoi raggi degli occhi casuali."}],"traits":[{"name":"Antimagia dell'Occhio Centrale","desc":"Il cono di antimagia davanti all'occhio centrale sopprime magie e incantesimi nell'area."},{"name":"Resistenza Leggendaria (3/giorno)","desc":"Se fallisce un TS, può scegliere di superarlo comunque."}],"notes":"10 raggi occhio: Mortale, Disintegrante, Telecinetici, Incantatore, Dormiglione, Rallentante, Orrore, Paralizzante, Petrifico, Repulsore."},{"slug":"balor","name":"Balor","cr":"19","type":"Demonio","size":"Enorme","ac":19,"hp":262,"hpDice":"21d12+126","speed":"12 m, volo 24 m","str":26,"dex":15,"con":22,"int":20,"wis":16,"cha":22,"saves":{"FOR":"+14","COS":"+12","SAG":"+9","CAR":"+12"},"skills":{},"resistances":["Freddo","Fulmine"],"immunities":["Fuoco","Veleno; Avvelenato"],"senses":"Scurovisione 36 m, Visione nel Buio 36 m, Percezione passiva 13","languages":"Abissale, Telepatia 36 m","actions":[{"name":"Multiattacco","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Un attacco con la spada fiammeggiante e uno con la frusta."},{"name":"Spada Fiammeggiante","type":"Attacco mischia","bonus":"+14","reach":"3 m","targets":1,"damage":"3d6+8","damageType":"Tagliente","desc":"Più 3d8 danni fuoco."},{"name":"Frusta","type":"Attacco mischia","bonus":"+14","reach":"9 m","targets":1,"damage":"2d6+8","damageType":"Forza","desc":"TS Forza CD 20 o il bersaglio è avvicinato al balor e diventa prono."},{"name":"Teletrasporto","type":"Speciale","bonus":"—","reach":"—","targets":0,"damage":"—","damageType":"—","desc":"Si teletrasporta con l'equipaggiamento in uno spazio libero entro 36 m."}],"legendaryActions":[],"traits":[{"name":"Resistenza Magica","desc":"Vantaggio ai TS contro incantesimi e altri effetti magici."},{"name":"Aura di Fuoco","desc":"All'inizio del turno del balor, ogni creatura entro 1.5 m subisce 10 danni fuoco."},{"name":"Morte Demoniaca","desc":"Quando muore esplode: TS Destrezza CD 20 o 70 (20d6) danni fuoco; metà in caso di successo."}],"notes":""}];

// ─── Magic Items Database (SRD) ─────────────────────────────────────────────
const MAGIC_ITEMS_DB = [{"slug":"chain-mail-of-resistance","name":"Cotta di Maglia della Resistenza","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Non comune","weight":55,"cost":"—","ac":16,"properties":["Richiede competenza nelle armature pesanti"],"notes":"Resistenza a un tipo di danno (scelto alla creazione)"},{"slug":"elven-chain","name":"Cotta degli Elfi","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Raro","weight":20,"cost":"—","ac":14,"properties":["CA 14 + mod. DES (max 2), nessuna penalità furtività"],"notes":"Competenza automatica anche senza addestramento"},{"slug":"armor-of-invulnerability","name":"Armatura dell'Invulnerabilità","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":65,"cost":"—","ac":18,"properties":["Richiede sintonia"],"notes":"Resistenza a tutti i danni non magici. 1/giorno: immunità per 10 minuti"},{"slug":"armor-of-resistance","name":"Armatura della Resistenza","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Raro","weight":45,"cost":"—","ac":16,"properties":["Richiede sintonia"],"notes":"Resistenza a un tipo di danno specifico"},{"slug":"plate-armor-of-etherealness","name":"Armatura Piastre dell'Etere","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":65,"cost":"—","ac":18,"properties":["Richiede sintonia"],"notes":"1/giorno: Piano Etereo per 10 min"},{"slug":"shield-of-missile-attraction","name":"Scudo dell'Attrazione dei Proiettili","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Raro","weight":6,"cost":"—","ac":2,"properties":["Richiede sintonia","Maledetto"],"notes":"Svantaggio ai TS contro armi a distanza. Attira tutti i proiettili"},{"slug":"shield+1","name":"Scudo +1","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Non comune","weight":6,"cost":"—","ac":3,"properties":[],"notes":"+1 bonus CA oltre al normale +2 dello scudo"},{"slug":"shield+2","name":"Scudo +2","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Raro","weight":6,"cost":"—","ac":4,"properties":[],"notes":"+2 bonus CA oltre al normale +2 dello scudo"},{"slug":"shield+3","name":"Scudo +3","category":"Armatura","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":6,"cost":"—","ac":5,"properties":[],"notes":"+3 bonus CA oltre al normale +2 dello scudo"},{"slug":"sword-of-life-stealing","name":"Spada del Furto della Vita","category":"Arma","subcategory":"Oggetto Magico","rarity":"Raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"20 naturale: +10 danno e recuperi 10 PF (non su non-morti/costrutti)"},{"slug":"sword-of-sharpness","name":"Spada dell'Affilatezza","category":"Arma","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"20 naturale: +14 danno e possibile amputazione. Taglia oggetti non magici"},{"slug":"vorpal-sword","name":"Spada Vorpal","category":"Arma","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+3 colpire e danno. 20 naturale: decapitazione istantanea"},{"slug":"dagger-of-venom","name":"Pugnale del Veleno","category":"Arma","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":[],"notes":"+1 colpire e danno. 1/giorno: veleno per 1 minuto (CD 15 Cost o 2d10 veleno e avvelenato)"},{"slug":"flame-tongue","name":"Lingua di Fiamma","category":"Arma","subcategory":"Oggetto Magico","rarity":"Raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Comando: lama in fiamme, +2d6 fuoco. Luce 40 ft. Si spegne se lasciata"},{"slug":"frost-brand","name":"Marchio Glaciale","category":"Arma","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+1d6 freddo. Resistenza al fuoco. 1/ora al tramonto: estingue fiamme vicine"},{"slug":"holy-avenger","name":"Vendicatore Sacro","category":"Arma","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia (solo Paladino)"],"notes":"+3. +2d10 vs non-morti/fiend. Aura di protezione incantesimi 10 ft"},{"slug":"luck-blade","name":"Lama della Fortuna","category":"Arma","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+1. Bonus fortuna. 1/giorno: rilancia qualsiasi tiro. Desideri (1d4-1 cariche)"},{"slug":"nine-lives-stealer","name":"Rubavite","category":"Arma","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+2. 1d6 usi: 7+ danni = TS Cost CD 15 o morte istantanea (non funziona con CoS >25)"},{"slug":"oathbow","name":"Arco del Giuramento","category":"Arma","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":2,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Giura su un nemico: +3d6 vs giurato, svantaggio vs altri. Fino a morte o alba"},{"slug":"sunblade","name":"Lama Solare","category":"Arma","subcategory":"Oggetto Magico","rarity":"Raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+2, 1d8 radiante. Luce solare 15 ft. +1d8 vs non-morti. Spada di Luce"},{"slug":"trident-of-fish-command","name":"Tridente del Comando dei Pesci","category":"Arma","subcategory":"Oggetto Magico","rarity":"Non comune","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"3 cariche: Domina Bestia (bestie acquatiche, CD 15). 1d3 cariche al giorno"},{"slug":"weapon+1","name":"Arma +1","category":"Arma","subcategory":"Oggetto Magico","rarity":"Non comune","weight":2,"cost":"—","ac":null,"properties":[],"notes":"+1 ai tiri per colpire e ai tiri danno"},{"slug":"weapon+2","name":"Arma +2","category":"Arma","subcategory":"Oggetto Magico","rarity":"Raro","weight":2,"cost":"—","ac":null,"properties":[],"notes":"+2 ai tiri per colpire e ai tiri danno"},{"slug":"weapon+3","name":"Arma +3","category":"Arma","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":2,"cost":"—","ac":null,"properties":[],"notes":"+3 ai tiri per colpire e ai tiri danno"},{"slug":"wand-of-fireballs","name":"Bacchetta delle Palle di Fuoco","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"7 cariche. 1-3 cariche: Palla di Fuoco (CD 15, +7 colpire). Recupera 1d6+1/giorno"},{"slug":"wand-of-lightning-bolts","name":"Bacchetta dei Fulmini","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"7 cariche. 1-3 cariche: Fulmine (CD 15, +7). Recupera 1d6+1/giorno"},{"slug":"wand-of-magic-missiles","name":"Bacchetta dei Dardi Magici","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":[],"notes":"7 cariche. 1-3 cariche: Dardo Incantato (slot 1°-3°). Recupera 1d6+1/giorno"},{"slug":"wand-of-paralysis","name":"Bacchetta della Paralisi","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"7 cariche. Paralisi (CD 15, TS Cost). Recupera 1d6+1/giorno"},{"slug":"wand-of-polymorph","name":"Bacchetta del Polimorfo","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"7 cariche. Polimorfo (CD 15). Recupera 1d6+1/giorno"},{"slug":"wand-of-secrets","name":"Bacchetta dei Segreti","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":[],"notes":"3 cariche. Rileva porte e trappole entro 30 ft. Recupera 1d3/giorno"},{"slug":"wand-of-the-war-mage+1","name":"Bacchetta del Mago Guerriero +1","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"+1 ai tiri per colpire degli incantesimi. Ignora mezza copertura"},{"slug":"wand-of-the-war-mage+2","name":"Bacchetta del Mago Guerriero +2","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"+2 ai tiri per colpire degli incantesimi. Ignora mezza copertura"},{"slug":"wand-of-the-war-mage+3","name":"Bacchetta del Mago Guerriero +3","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"+3 ai tiri per colpire degli incantesimi. Ignora mezza copertura"},{"slug":"wand-of-web","name":"Bacchetta della Ragnatela","category":"Bacchetta","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"7 cariche. Ragnatela (CD 15). Recupera 1d6+1/giorno"},{"slug":"rod-of-absorption","name":"Scettro dell'Assorbimento","category":"Scettro","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":2,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Assorbe incantesimi su di te (max 50 livelli totali). Energia usabile come slot"},{"slug":"rod-of-lordly-might","name":"Scettro della Potenza Regale","category":"Scettro","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":2,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Arma +3 trasformabile. 6 funzioni: fulmine, paura, paralisi, fiamma, rabbia, coltello"},{"slug":"rod-of-rulership","name":"Scettro del Dominio","category":"Scettro","subcategory":"Oggetto Magico","rarity":"Raro","weight":2,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"1/giorno: domina creature entro 120 ft (CD 15 SAG, max 300 PF totali) per 8 ore"},{"slug":"ring-of-animal-influence","name":"Anello dell'Influenza sugli Animali","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":[],"notes":"3 cariche. Amicizia Animali (CD 13), Paura Animali (CD 13), Parlare con gli Animali"},{"slug":"ring-of-djinni-summoning","name":"Anello dell'Evocazione del Djinn","category":"Anello","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"1/giorno: evoca un djinn per 1 ora. Obbedisce ai comandi"},{"slug":"ring-of-elemental-command","name":"Anello del Comando Elementale","category":"Anello","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Dominio su un tipo di elementale + resistenze + incantesimi specifici"},{"slug":"ring-of-evasion","name":"Anello dell'Evasione","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"3 cariche. Su TS DES fallito: lo superi. Recupera 1d3/giorno"},{"slug":"ring-of-feather-falling","name":"Anello della Caduta Lenta","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Caduta di Piuma costante mentre indossato"},{"slug":"ring-of-free-action","name":"Anello della Libertà d'Azione","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Ignora terreno difficile. Immune a paralisi e rallentamento magico"},{"slug":"ring-of-invisibility","name":"Anello dell'Invisibilità","category":"Anello","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Invisibilità a volontà. Termina se attacchi o lanci incantesimi"},{"slug":"ring-of-jumping","name":"Anello del Salto","category":"Anello","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Incantesimo Saltare costante (triplo distanza salto)"},{"slug":"ring-of-mind-shielding","name":"Anello della Schermatura Mentale","category":"Anello","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Immune a telepatia. Blocca individuazione pensieri e allineamento"},{"slug":"ring-of-protection","name":"Anello della Protezione","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+1 CA e tiri salvezza"},{"slug":"ring-of-regeneration","name":"Anello della Rigenerazione","category":"Anello","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Recupera 1d6 PF ogni 10 minuti. Membra mozzate ricrescono in 1d6+1 giorni"},{"slug":"ring-of-resistance","name":"Anello della Resistenza","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Resistenza a un tipo di danno (scelto alla creazione)"},{"slug":"ring-of-shooting-stars","name":"Anello delle Stelle Cadenti","category":"Anello","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia (al chiaro di stelle/luna)"],"notes":"6 cariche: scintille, fuochi fatui, palla di fuoco, stelle cadenti"},{"slug":"ring-of-spell-storing","name":"Anello dell'Immagazzinamento di Incantesimi","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Immagazzina fino a 5 livelli di incantesimi. Chiunque può lanciarli"},{"slug":"ring-of-spell-turning","name":"Anello della Deflessione degli Incantesimi","category":"Anello","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Vantaggio ai TS vs incantesimi. Su 20 naturale: rimbalzo sull'incantatore"},{"slug":"ring-of-swimming","name":"Anello del Nuoto","category":"Anello","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Velocità di nuoto 40 piedi"},{"slug":"ring-of-telekinesis","name":"Anello della Telecinesi","category":"Anello","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Telecinesi costante (come l'incantesimo)"},{"slug":"ring-of-the-ram","name":"Anello dell'Ariete","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"3 cariche: forza d'ariete (spinge, danneggia, rompe oggetti). Recupera 1d3/giorno"},{"slug":"ring-of-three-wishes","name":"Anello dei Tre Desideri","category":"Anello","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":0,"cost":"—","ac":null,"properties":[],"notes":"3 cariche: Desiderio. Esaurite le cariche, diventa ordinario"},{"slug":"ring-of-warmth","name":"Anello del Calore","category":"Anello","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Resistenza al freddo. Immune agli effetti climatici del freddo"},{"slug":"ring-of-water-walking","name":"Anello del Camminare sull'Acqua","category":"Anello","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Cammina su qualsiasi superficie liquida come solido"},{"slug":"ring-of-x-ray-vision","name":"Anello della Visione ai Raggi X","category":"Anello","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Azione: vedi attraverso materiali (30 ft). 1 uso/ora: TS Cost CD 15 o esausto"},{"slug":"amulet-of-health","name":"Amuleto della Salute","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Costituzione diventa 19 (se non era già superiore)"},{"slug":"amulet-of-proof-against-detection","name":"Amuleto contro il Rilevamento","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Nascosto da divinazione, Individuazione del Magico, Individuazione del Male"},{"slug":"amulet-of-the-planes","name":"Amuleto dei Piani","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Azione: Trasporto Planare (CD 15 INT o luogo casuale)"},{"slug":"bag-of-holding","name":"Borsa Capiente","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":15,"cost":"—","ac":null,"properties":[],"notes":"Interno 64 ft³, peso massimo 500 lb. Peso sempre 15 lb"},{"slug":"bag-of-tricks","name":"Borsa dei Trucchi","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0.5,"cost":"—","ac":null,"properties":[],"notes":"3 usi/giorno: estrai bestia casuale (grigia/ruggine/sabbia). Dura 1 ora"},{"slug":"belt-of-giant-strength","name":"Cintura della Forza del Gigante","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Varia","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"FOR 21(collina)/23(pietra)/25(gelo/fuoco)/27(nuvola)/29(tempesta)"},{"slug":"boots-of-elvenkind","name":"Stivali degli Elfi","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":[],"notes":"Passi silenziosi. Vantaggio alle prove Furtività che coinvolgono i movimenti"},{"slug":"boots-of-speed","name":"Stivali della Velocità","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Bonus azione: velocità raddoppiata, attacchi di opportunità con svantaggio per 10 min. 1/giorno"},{"slug":"boots-of-striding-and-springing","name":"Stivali del Passo e del Balzo","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Velocità minima 30 ft. Tripla distanza salto"},{"slug":"boots-of-the-winterlands","name":"Stivali delle Terre Invernali","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Terreno ghiacciato non difficile. Resistenza freddo. Sopravvivi a -50°C"},{"slug":"bracers-of-archery","name":"Bracciali del Tiro con l'Arco","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+2 ai tiri danno con archi (non balestre)"},{"slug":"bracers-of-defense","name":"Bracciali della Difesa","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+2 CA se non si indossa armatura e scudo"},{"slug":"brooch-of-shielding","name":"Spilla dello Scudo","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Immune a Dardo Incantato. Resistenza ai danni della forza"},{"slug":"cap-of-water-breathing","name":"Cappello della Respirazione Acquatica","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Respira sott'acqua normalmente"},{"slug":"cape-of-the-mountebank","name":"Mantello del Ciarlatano","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":[],"notes":"1/giorno: Passo Nebbioso (lascia nube di fumo per 1 minuto)"},{"slug":"carpet-of-flying","name":"Tappeto Volante","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Velocità volo 80/60/40 ft (piccolo/medio/grande). Comandi verbali"},{"slug":"cloak-of-displacement","name":"Mantello dello Spostamento","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Svantaggio ai tiri per colpire contro di te. Si disattiva se subisci danni"},{"slug":"cloak-of-elvenkind","name":"Mantello degli Elfi","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Abbassando il cappuccio: vantaggio Furtività, svantaggio alla percezione vs te"},{"slug":"cloak-of-protection","name":"Mantello della Protezione","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+1 CA e tiri salvezza"},{"slug":"cloak-of-the-bat","name":"Mantello del Pipistrello","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Vantaggio Furtività al buio. Trasformazione in pipistrello (fino a 1 ora/giorno)"},{"slug":"cloak-of-the-manta-ray","name":"Mantello della Manta","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":[],"notes":"Respirazione acquatica. Velocità nuoto 60 ft indossando il mantello"},{"slug":"crystal-ball","name":"Sfera di Cristallo","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":7,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Scrutare (CD 17). Varianti: telepatia, chiaroveggenza, lettura del pensiero, veggenza"},{"slug":"cube-of-force","name":"Cubo della Forza","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":0.5,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"36 cariche. Crea barriera energetica con vari effetti (solo gas, solo magia ecc.)"},{"slug":"deck-of-many-things","name":"Mazzo delle Molte Cose","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":0,"cost":"—","ac":null,"properties":[],"notes":"13/22 carte con effetti potenti e pericolosi. Il più temuto oggetto magico"},{"slug":"efreeti-bottle","name":"Bottiglia dell'Efrit","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":1,"cost":"—","ac":null,"properties":[],"notes":"1/giorno: evoca efrit (10% ostile, 10% libero, 80% servizievole x 1h)"},{"slug":"figurine-of-wondrous-power","name":"Figurina della Potenza Prodigiosa","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Varia","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Varie figurine animali che si trasformano in creature reali su comando"},{"slug":"gauntlets-of-ogre-power","name":"Guantoni della Forza dell'Orco","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Forza diventa 19 (se non era già superiore)"},{"slug":"gem-of-seeing","name":"Gemma della Visione","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"3 cariche: Scrutare la Verità per 10 minuti. Recupera 1d3/giorno"},{"slug":"gloves-of-missile-snaring","name":"Guanti dell'Intercettazione dei Proiettili","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Reazione vs proiettile: +1d10+mod DES alla CA. Se uguale o superiore: cattura"},{"slug":"gloves-of-swimming-and-climbing","name":"Guanti del Nuoto e dell'Arrampicata","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Nuoto e arrampicata velocità 40 ft. Nessun malus alle prove"},{"slug":"goggles-of-night","name":"Occhialoni della Notte","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Scurovisione 60 ft (o +60 ft se già hai scurovisione)"},{"slug":"hat-of-disguise","name":"Cappello del Travestimento","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Travestimento a volontà (come l'incantesimo). Appaio come qualsiasi umanoide"},{"slug":"headband-of-intellect","name":"Fascia dell'Intelletto","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Intelligenza diventa 19 (se non era già superiore)"},{"slug":"helm-of-brilliance","name":"Elmo della Brillantezza","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Gemme con incantesimi: Muro di Fuoco, Palla di Fuoco, Raggio di Sole. Resistenza fuoco"},{"slug":"helm-of-comprehending-languages","name":"Elmo della Comprensione delle Lingue","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":3,"cost":"—","ac":null,"properties":[],"notes":"Comprendi qualsiasi lingua parlata o scritta (come l'incantesimo)"},{"slug":"helm-of-telepathy","name":"Elmo della Telepatia","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Individuazione Pensieri a volontà. Comunicazione telepatica 30 ft"},{"slug":"helm-of-teleportation","name":"Elmo della Teleportazione","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"3 cariche: Teletrasporto. Recupera 1d3/giorno"},{"slug":"horn-of-blasting","name":"Corno dell'Esplosione","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":2,"cost":"—","ac":null,"properties":[],"notes":"Cono 30 ft: 5d6 tuono, sordo 1 min (CD 15 Cost). 1/giorno (20% danneggia il corno)"},{"slug":"ioun-stone","name":"Pietra di Ioun","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Varia","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Orbita attorno alla testa. Vari tipi: assorbimento, agilità, forza, fortuna, riservare, ecc."},{"slug":"iron-bands-of-binding","name":"Fasce di Ferro del Legame","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":1,"cost":"—","ac":null,"properties":[],"notes":"Lancia contro creatura Grande o inferiore: imprigiona (TS FOR CD 20 per liberarsi)"},{"slug":"lantern-of-revealing","name":"Lanterna della Rivelazione","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":2,"cost":"—","ac":null,"properties":[],"notes":"Rivela creature e oggetti invisibili nel raggio di luce (30 ft)"},{"slug":"manual-of-bodily-health","name":"Manuale della Salute Corporea","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":5,"cost":"—","ac":null,"properties":[],"notes":"Leggi in 48 ore: Costituzione +2 (max 24). Il libro scompare e riappare in 100 anni"},{"slug":"manual-of-gainful-exercise","name":"Manuale dell'Esercizio Proficuo","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":5,"cost":"—","ac":null,"properties":[],"notes":"Leggi in 48 ore: Forza +2 (max 24). Scompare e riappare in 100 anni"},{"slug":"medallion-of-thoughts","name":"Medaglione dei Pensieri","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"3 cariche: Individuazione Pensieri (CD 13). Recupera 1d3/giorno"},{"slug":"mirror-of-life-trapping","name":"Specchio della Prigionia","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":50,"cost":"—","ac":null,"properties":[],"notes":"12 celle extradimensionali. Imprigiona chi guarda (CD 15 CAR). Rilascio su comando"},{"slug":"necklace-of-adaptation","name":"Collana dell'Adattamento","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Respira in qualsiasi ambiente. Vantaggio vs gas e vapori"},{"slug":"necklace-of-fireballs","name":"Collana delle Palle di Fuoco","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":[],"notes":"3d4 sfere (vari dadi da d6). Lancia come palla di fuoco. CD 15 DES"},{"slug":"periapt-of-health","name":"Periapto della Salute","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Immune a malattie. Resisti veleni (anche accumulati)"},{"slug":"periapt-of-proof-against-poison","name":"Periapto contro il Veleno","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Immune ai veleni (effetti e condizione avvelenato)"},{"slug":"periapt-of-wound-closure","name":"Periapto della Chiusura delle Ferite","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Stabilizza automaticamente a 0 PF. Doppio recupero con Dadi Vita"},{"slug":"pipes-of-haunting","name":"Pipe dell'Angoscia","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":2,"cost":"—","ac":null,"properties":[],"notes":"3 cariche: spaventoso (CD 13 SAG o spaventato 1 min). Recupera 1d3/giorno"},{"slug":"pipes-of-the-sewers","name":"Pipe delle Fogne","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":2,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Evoca 1d3 sciami di ratti. Comandi telepatici. 3 evocazioni/giorno"},{"slug":"portable-hole","name":"Buco Portatile","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Spazio extradimensionale 10 ft profondo, 6 ft diametro. Borsa Capiente = Distorsione"},{"slug":"restorative-ointment","name":"Unguento Ristoratrice","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0.5,"cost":"—","ac":null,"properties":[],"notes":"1d4+1 applicazioni: cura 2d8+2 PF o rimuove una malattia/veleno"},{"slug":"robe-of-eyes","name":"Veste degli Occhi","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Visione 360°, scurovisione 120 ft, vede invisibile. Luce del giorno: cecità temporanea"},{"slug":"robe-of-scintillating-colors","name":"Veste dei Colori Sfavillanti","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"3 cariche: aura abbagliante 30 ft. Attacchi con svantaggio vs te per 1 min"},{"slug":"robe-of-stars","name":"Veste delle Stelle","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"6 stelle rimovibili come Dardo Incantato (5°). Vantaggio TS. Astral Plane"},{"slug":"robe-of-the-archmagi","name":"Veste dell'Arcimago","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia (solo Stregone/Warlock/Mago)"],"notes":"CA 15+DES. Vantaggio TS incantesimi. CD +2. +2 tiri colpire incantesimi"},{"slug":"rod-of-security","name":"Scettro della Sicurezza","category":"Scettro","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":2,"cost":"—","ac":null,"properties":[],"notes":"1/10 giorni: paradiso extradimensionale per 200 creature per 200 giorni"},{"slug":"scarab-of-protection","name":"Scarabeo della Protezione","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"12 cariche. Immune a Non-morti. Su TS incantesimo fallito: usa carica per superarlo"},{"slug":"slippers-of-spider-climbing","name":"Pantofole dell'Arrampicata del Ragno","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0.5,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Arrampicata su pareti verticali e soffitto (velocità normale). Mani libere"},{"slug":"spell-scroll","name":"Pergamena d'Incantesimo","category":"Pergamena","subcategory":"Oggetto Magico","rarity":"Varia","weight":0,"cost":"—","ac":null,"properties":[],"notes":"Contiene un incantesimo. Usa e getta. Classe/livello determinano rarità"},{"slug":"staff-of-fire","name":"Bastone del Fuoco","category":"Bastone","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia (Druido/Stregone/Warlock/Mago)"],"notes":"10 cariche. Mano Bruciante, Palla di Fuoco, Muro di Fuoco. Resistenza Fuoco"},{"slug":"staff-of-frost","name":"Bastone del Gelo","category":"Bastone","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia (Druido/Stregone/Warlock/Mago)"],"notes":"10 cariche. Nebbia, Muro di Ghiaccio, Tempesta di Ghiaccio, Cono di Freddo"},{"slug":"staff-of-healing","name":"Bastone della Guarigione","category":"Bastone","subcategory":"Oggetto Magico","rarity":"Raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia (Bardo/Chierico/Druido)"],"notes":"10 cariche. Cura Ferite, Cura di Massa, Rigenerare. Recupera 1d6+4/giorno"},{"slug":"staff-of-power","name":"Bastone della Potenza","category":"Bastone","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia (incantatore)"],"notes":"+2 CA/colpire/danni. 20 cariche con numerosi incantesimi. Possibile spezzare"},{"slug":"staff-of-swarming-insects","name":"Bastone degli Insetti Sciamanti","category":"Bastone","subcategory":"Oggetto Magico","rarity":"Raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia (Bardo/Chierico/Druido/Stregone/Warlock/Mago)"],"notes":"10 cariche. Nube di insetti, Sciame, ecc. Recupera 1d6+4/giorno"},{"slug":"staff-of-the-magi","name":"Bastone dei Magi","category":"Bastone","subcategory":"Oggetto Magico","rarity":"Leggendario","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia (Stregone/Warlock/Mago)"],"notes":"+2. 50 cariche. Assorbe incantesimi. Enormi poteri. Possibile Grande Esplosione"},{"slug":"staff-of-withering","name":"Bastone del Deperimento","category":"Bastone","subcategory":"Oggetto Magico","rarity":"Raro","weight":4,"cost":"—","ac":null,"properties":["Richiede sintonia (Chierico/Druido/Stregone)"],"notes":"3 cariche: +2d10 necrotico, TS Cost CD 15 o dimezza FOR e DES per 1 ora"},{"slug":"stone-of-controlling-earth-elementals","name":"Pietra del Controllo degli Elementali","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":5,"cost":"—","ac":null,"properties":[],"notes":"1/giorno: evoca un elementale della terra per 1 ora"},{"slug":"stone-of-good-luck","name":"Pietra della Fortuna","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":0,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+1 a prove caratteristica e tiri salvezza"},{"slug":"sun-blade","name":"Lama Solare","category":"Arma","subcategory":"Oggetto Magico","rarity":"Raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+2, 1d8 radiante. Luce solare a comando. +1d8 vs non-morti"},{"slug":"sword-of-dancing","name":"Spada Danzante","category":"Arma","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"+3. Dopo 4 round: lancia in aria, combatte autonomamente per 4 round"},{"slug":"sword-of-wounding","name":"Spada della Piaga","category":"Arma","subcategory":"Oggetto Magico","rarity":"Raro","weight":3,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Su colpo: TS CD 15 Cost o 1d4 extra/round (recupero solo Medico)"},{"slug":"tome-of-clear-thought","name":"Tomo del Pensiero Lucido","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":5,"cost":"—","ac":null,"properties":[],"notes":"Leggi in 48 ore: Intelligenza +2 (max 24). Scompare e riappare in 100 anni"},{"slug":"tome-of-leadership-and-influence","name":"Tomo della Leadership e dell'Influenza","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":5,"cost":"—","ac":null,"properties":[],"notes":"Leggi in 48 ore: Carisma +2 (max 24). Scompare e riappare in 100 anni"},{"slug":"tome-of-understanding","name":"Tomo della Comprensione","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Molto raro","weight":5,"cost":"—","ac":null,"properties":[],"notes":"Leggi in 48 ore: Saggezza +2 (max 24). Scompare e riappare in 100 anni"},{"slug":"winged-boots","name":"Stivali Alati","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Non comune","weight":1,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"Volo 30 ft per 4 ore/giorno (si ricarica all'alba). Non in armatura pesante"},{"slug":"wings-of-flying","name":"Ali del Volo","category":"Oggetto Meraviglioso","subcategory":"Oggetto Magico","rarity":"Raro","weight":2,"cost":"—","ac":null,"properties":["Richiede sintonia"],"notes":"1/giorno: ali per 1 ora, volo 60 ft"}];

// ─── Names Database ─────────────────────────────────────────────────────────
const NAMES_DB = {"races": {"Umano": {"m": {"eroico": ["Aldric", "Beren", "Caelum", "Dorian", "Edric", "Farand", "Gareth", "Hadrian", "Iorveth", "Jorath", "Kaelan", "Loran", "Mordecai", "Nathon", "Orvyn", "Peryn", "Quentin", "Rodric", "Serath", "Torvald", "Uland", "Valdric", "Westin", "Xander", "Yorath", "Zephiran", "Alderian", "Brennoch", "Caelindor", "Draveth", "Eldoran", "Farindel", "Gorvath", "Hadromir", "Irenoth", "Jorvalan", "Keldrath", "Lorindor", "Mordrath", "Narveth", "Oswendel"], "neutro": ["Marco", "Luca", "Pietro", "Dario", "Sergio", "Bruno", "Carlo", "Aldo", "Renzo", "Gino", "Teo", "Nino", "Berto", "Sandro", "Nico", "Fausto", "Italo", "Livio", "Oreste", "Primo", "Armando", "Corrado", "Daniele", "Ernesto", "Fabrizio", "Giacomo", "Lorenzo", "Massimo", "Roberto", "Stefano", "Aurelio", "Celeste", "Donato", "Filippo", "Gerardo"], "ironico": ["Brandolfo", "Scricciolo", "Terzo", "Gobbone", "Nonno", "Bassetto", "Fumetto", "Tontolone", "Sbuffio", "Pancione", "Cagnolone", "Pisolino", "Rotolone", "Starnuto", "Bivacco", "Cialtrone", "Pivellino", "Stravagante", "Rotolone", "Babbione", "Sonnolento", "Impiccione", "Chiassoso", "Pasticcione", "Sbadato"]}, "f": {"eroico": ["Aelara", "Brynn", "Caelia", "Darina", "Elara", "Fiora", "Gwendolyn", "Halia", "Isadora", "Jessa", "Kaela", "Lyra", "Mira", "Nessa", "Orla", "Petra", "Quenya", "Riona", "Sylvara", "Talia", "Ursa", "Valeria", "Wren", "Xena", "Yara", "Zara", "Aelindra", "Brennalia", "Caelindra", "Dravelia", "Eladora", "Farindra", "Gorvitha", "Hadronia", "Irenara", "Jorvalara", "Keldrana", "Lorindra", "Mordrith", "Narvenia", "Oswendia"], "neutro": ["Maria", "Elena", "Anna", "Laura", "Sara", "Giulia", "Chiara", "Marta", "Paola", "Rosa", "Lena", "Nora", "Ada", "Rina", "Dora", "Pia", "Lea", "Ida", "Alba", "Vera", "Arianna", "Carmela", "Daniela", "Ernesta", "Federica", "Giacoma", "Lorenza", "Massima", "Roberta", "Stefania", "Aurelia", "Celeste", "Donata", "Filippa", "Gerarda"], "ironico": ["Brandolina", "Scricciola", "Terza", "Gobbone", "Nonnina", "Bassetta", "Fumetta", "Tontolona", "Sbuffia", "Panciona", "Cagnolona", "Pisolina", "Rotolona", "Starnutina", "Bivacca", "Pasticciona", "Stravagante", "Sonnolenta", "Impicciona", "Chiassosa", "Pivellina", "Babbiona", "Sbadata", "Rotolona", "Cialtrona"]}}, "Elfo Alto": {"m": {"eroico": ["Aedrial", "Caladwen", "Elarion", "Faendal", "Galathil", "Iorveth", "Laeroth", "Mirendel", "Naeris", "Olorin", "Paeris", "Quaelyn", "Raelarion", "Silverael", "Taenarion", "Ulfael", "Vaeldris", "Whaelorn", "Xaelion", "Yaelindra", "Zaeroth", "Aerindel", "Beladon", "Celethil", "Darathor", "Aelindrath", "Caladwenor", "Elarionath", "Faendalar", "Galathilor", "Iorvethian", "Laerothil", "Mirendalar", "Naerisath", "Olorinath", "Paerisael", "Quaelindor", "Raelariath", "Silverdon", "Taenariel"], "neutro": ["Aerin", "Cael", "Elen", "Faen", "Gael", "Iol", "Laer", "Mir", "Nael", "Olor", "Paer", "Qua", "Rael", "Sil", "Taen", "Ulf", "Vael", "Whal", "Xael", "Yael", "Aerindel", "Caelorin", "Elenath", "Faendor", "Gaelion", "Iolindel", "Laerion", "Miraeth", "Naelion", "Olorath"], "ironico": ["Orecchiolungo", "Snobbetto", "Milleanniepoi", "Sempreverde", "Capellibiondi", "Alzanaso", "Superciglio", "Arrogantello", "Belloccio", "Immortalino"]}, "f": {"eroico": ["Aelindra", "Caladria", "Elariel", "Faendra", "Galathiel", "Iorvethia", "Laeriel", "Mirendel", "Naeria", "Olorina", "Paeria", "Quaelindra", "Raelaria", "Silverael", "Taenaria", "Ulfaela", "Vaeldria", "Whaelorn", "Xaelia", "Yaelindra", "Aelindrath", "Caladwenia", "Elarioneth", "Faendaria", "Galathirel", "Iorvethia", "Laerindel", "Mirendalia", "Naerisia", "Olorineth", "Paeriael", "Quaelindra", "Raelindor", "Silvindra", "Taenariel"], "neutro": ["Aela", "Caela", "Elara", "Faela", "Gaela", "Iola", "Laera", "Mira", "Naela", "Olora", "Paera", "Quale", "Raela", "Sila", "Taena", "Ulfa", "Vaela", "Whala", "Xaela", "Yaela", "Aerindel", "Caelorin", "Elenath", "Faendra", "Gaelion", "Iolindra", "Laeriel", "Miraeth", "Naelira", "Olorath"], "ironico": ["Orecchiolunga", "Snobbetta", "Millenniepoi", "Sempreverde", "Capelliplatino", "Alzanasina", "Sopracciglio", "Arrogantella", "Belloccina", "Immortalina"]}}, "Elfo del Bosco": {"m": {"eroico": ["Adran", "Bereth", "Carric", "Daran", "Erevan", "Filarion", "Galinndan", "Hadarai", "Immeral", "Jorildyn", "Kevrel", "Laucian", "Mindartis", "Neiryn", "Ourdir", "Paelias", "Quarion", "Riardon", "Soveliss", "Thamior", "Uthemar", "Vaeril", "Wilvarin", "Xavras", "Yavor", "Zaltarish", "Adrianor", "Berethiel", "Carricoth", "Daranael", "Erevandor", "Filarioth", "Galindael", "Hadarion", "Immerald", "Jorildoth", "Kevrindel", "Laucindor", "Mindorath", "Neirindel", "Ourdival"], "neutro": ["Bram", "Carn", "Dusk", "Elm", "Fern", "Glen", "Holt", "Ivy", "Jay", "Kern", "Leaf", "Moss", "Oak", "Pine", "Reed", "Sage", "Thorn", "Vale", "Wood", "Yew", "Bramwick", "Carndell", "Duskwood", "Elmford", "Ferndale", "Glenwood", "Holtway", "Ivydale", "Jaywick", "Kernwood"], "ironico": ["Saltabranch", "Strusciafelce", "Puzzadiresina", "Nidodicorvo", "Abbracciaquercia", "Mangiaghianda", "Saltatralci", "Dormesullalbero", "Nottambulo", "Scoiattolino"]}, "f": {"eroico": ["Adrie", "Birel", "Chaedi", "Dara", "Enna", "Faral", "Gannayh", "Heian", "Iefal", "Jhaerithe", "Keyleth", "Leshanna", "Mialee", "Naivara", "Oria", "Pyria", "Quelenna", "Rhowyn", "Shanairla", "Thiala", "Uriala", "Vadania", "Waenre", "Xanaphia", "Yaevinn", "Zylvara", "Adrianel", "Birelon", "Chaedith", "Darania", "Ennavel", "Faralia", "Gannieth", "Heianor", "Iefalon", "Jhaerith", "Keylinth", "Leshanor", "Mialeth", "Naivarel", "Orianda"], "neutro": ["Ash", "Birch", "Cedar", "Dawn", "Elm", "Fern", "Glen", "Hazel", "Iris", "Jade", "Laurel", "Maple", "Nell", "Oak", "Pearl", "Quinn", "Rose", "Sage", "Teal", "Uma", "Ashwood", "Birchen", "Cedara", "Dawnfall", "Elmwood", "Fernway", "Glenara", "Hazelia", "Iriswood", "Jadefall"], "ironico": ["Saltabranca", "Strusciafelcia", "Nidodicorva", "Abbracciaquercia", "Mangiaghianda", "Saltatralcia", "Dormesullalbera", "Nottambula", "Scoiattolina", "Fogliolina"]}}, "Nano": {"m": {"eroico": ["Adrik", "Baern", "Darrak", "Eberk", "Fargrim", "Gardain", "Harbek", "Kildrak", "Morgran", "Orsik", "Oskar", "Rangrim", "Rurik", "Taklinn", "Thoradin", "Thorin", "Tordek", "Traubon", "Travok", "Ulfgar", "Veit", "Vonbin"], "neutro": ["Alberik", "Baldur", "Cormac", "Durgin", "Egrim", "Fendar", "Gordak", "Hammar", "Ivar", "Jorik", "Krag", "Lordan", "Marek", "Nargul", "Ornrik", "Pelgur", "Quodark", "Ragnur", "Sordak", "Thordur"], "ironico": ["Panciagrossa", "Barbalunga", "Arrabbiato", "Brontolone", "Pivello", "Bevibirra", "Mangiapietra", "Testadura", "Cortino", "Rugoso", "Sbuffone", "Zoccolo", "Tamburello", "Rintronato", "Battipicco"]}, "f": {"eroico": ["Amber", "Artin", "Audhild", "Bardryn", "Dagnal", "Diesa", "Eldeth", "Falkrunn", "Finellen", "Gunnloda", "Gurdis", "Helja", "Ilde", "Liftrasa", "Mardred", "Riswynn", "Sannl", "Torbera", "Torgga", "Vistra"], "neutro": ["Berta", "Dagma", "Edna", "Frida", "Gerda", "Helga", "Ingrid", "Johanna", "Karin", "Lotta", "Marta", "Nora", "Olga", "Petra", "Ragna", "Sigrid", "Thora", "Ulla", "Vera", "Wanda"], "ironico": ["Panciagrossa", "Barbalunga", "Arrabbiata", "Brontolona", "Pivella", "Bevibirra", "Mangiapietra", "Testadura", "Cortina", "Rugosa", "Sbuffona", "Zoccola", "Tamburella", "Rintronata", "Battipicca"]}}, "Halfling": {"m": {"eroico": ["Alton", "Ander", "Corrin", "Eldon", "Errich", "Finnan", "Garret", "Lindal", "Lyle", "Merric", "Milo", "Osborn", "Perrin", "Reed", "Roscoe", "Wellby"], "neutro": ["Bilbo", "Frodo", "Sam", "Pippin", "Merry", "Tom", "Bob", "Jim", "Ted", "Ned", "Will", "Bill", "Ben", "Dan", "Tim", "Rob", "Joe", "Hal", "Pip", "Bam"], "ironico": ["Piedisperti", "Baffodipaglia", "Mangiatorte", "Sonnacchioso", "Scalzetto", "Capelliricci", "Sempreaffamato", "Trotterello", "Camminacampo", "Borbottino", "Fumapipa", "Zampettino", "Panciottino", "Girogiretto", "Poltroncino"]}, "f": {"eroico": ["Andry", "Bree", "Callie", "Cora", "Euphemia", "Jillian", "Kithri", "Lavinia", "Lidda", "Merla", "Nedda", "Paela", "Portia", "Seraphina", "Shaena", "Trym", "Vani", "Verna", "Wendy"], "neutro": ["Rosie", "Daisy", "Lily", "Violet", "Poppy", "Holly", "Ivy", "Ruby", "Pearl", "Gemma", "Maisie", "Elsie", "Nellie", "Molly", "Polly", "Dolly", "Betsy", "Patsy", "Pansy", "Tansy"], "ironico": ["Piedisperte", "Baffodipaglia", "Mangiatortina", "Sonnacchiosa", "Scalzetta", "Capelliricci", "Sempreaffamata", "Trotterella", "Camminacampo", "Borbottina", "Fumapipa", "Zampettina", "Panciottina", "Girogiretta", "Poltroncina"]}}, "Nano delle Montagne": {"m": {"eroico": ["Borak", "Dagnath", "Forgrim", "Ghorbak", "Hamnar", "Kragnar", "Morgath", "Norgrim", "Orgath", "Ragnar", "Stonebrow", "Thaggrak", "Uggrim", "Vargnor", "Wargrak", "Zagnor"], "neutro": ["Boldar", "Cragmar", "Durin", "Forgold", "Grimholt", "Hammir", "Ironback", "Krag", "Lorrim", "Mordin", "Nordak", "Orfak", "Petrok", "Rugnak", "Stoneback", "Thordak"], "ironico": ["Testadiroccia", "Mangiagranito", "Zappapietra", "Brontolomontagna", "Picconante", "Spaccasassi", "Grugnone", "Musoduro", "Cavapietra", "Rompisassi"]}, "f": {"eroico": ["Bofra", "Dagra", "Forgra", "Ghorbra", "Hamra", "Kragra", "Morgra", "Norgra", "Orgra", "Ragra", "Stonegra", "Thaggra", "Uggra", "Vargra", "Wargra", "Zagra"], "neutro": ["Boldra", "Cragra", "Durina", "Forgolda", "Grimra", "Hammira", "Ironra", "Kragra", "Lorrima", "Mordinra", "Nordra", "Orfra", "Petrora", "Rugnra", "Stonera", "Thordra"], "ironico": ["Testadiroccia", "Mangiagranita", "Zappapietra", "Brontolomontagna", "Picconante", "Spaccasassi", "Grugnona", "Musodura", "Cavapietra", "Rompisassi"]}}, "Tiefling": {"m": {"eroico": ["Akmenos", "Amnon", "Barakas", "Damakos", "Ekemon", "Iados", "Kairon", "Leucis", "Melech", "Mordai", "Morthos", "Pelaios", "Skamos", "Therai", "Ultham", "Zehir", "Akmenoth", "Amnorial", "Barakesh", "Damakoth", "Ekaemon", "Iadokar", "Kaironal", "Leucisar", "Melechor", "Mordaith", "Morthonax", "Pelaiosar", "Skamorah", "Theraith", "Ulthamar", "Zehiroth", "Xarventus", "Vaelthorn", "Pyraxion", "Omnivex"], "neutro": ["Ash", "Blaze", "Cinder", "Dusk", "Ember", "Flare", "Grim", "Haze", "Ink", "Jet", "Knell", "Lurk", "Mire", "Null", "Omen", "Pall", "Ashveil", "Blazorn", "Cinderath", "Duskmal", "Embrion", "Flareax", "Grimvex", "Hazeron", "Inkavar", "Jetthorn", "Knellor", "Lurkath", "Mireval", "Nullivex", "Omenkar", "Pallath", "Quellion", "Ravinth", "Scornal", "Thornval"], "ironico": ["Cornettino", "Codadirospo", "Fuochetto", "Puzzolente", "Rossetto", "Ciuffodifuoco", "Sfrigolino", "Piccante", "Infernozzo", "Diavoletto", "Baffidifumo", "Infernetto", "Cornucopia", "Bruciacchiato", "Fiammiferino", "Cornettino", "Codatorta", "Fumaccio", "Puzzolone", "Rossiccio", "Sfrigolio", "Piccantone", "Bruciacchiato", "Fiammifero", "Infernozzo", "Cornucopia", "Diavolicchio", "Baffodifumo", "Caudifero", "Solforetto"]}, "f": {"eroico": ["Akta", "Anakis", "Bryseis", "Criella", "Damaia", "Ea", "Kallista", "Lerissa", "Makaria", "Nemeia", "Orianna", "Phelaia", "Rieta", "Talitha", "Umbra", "Visera", "Aktarial", "Anakisha", "Bryseith", "Crielath", "Damaitha", "Eakarith", "Kallistha", "Lerissath", "Makarith", "Nemeith", "Oriantha", "Phelaith", "Rietavar", "Talithorn", "Umbraval", "Viserath", "Xarventhi", "Vaelindra", "Pyraxia", "Omnivar"], "neutro": ["Ash", "Blaze", "Cinder", "Dusk", "Ember", "Flare", "Grim", "Haze", "Ink", "Jet", "Knell", "Lurk", "Mire", "Null", "Omen", "Pall", "Ashveil", "Blazorna", "Cinderath", "Duskara", "Embriona", "Flareth", "Grimvex", "Hazeara", "Inkavar", "Jetthorn", "Knellia", "Lurkara", "Mireval", "Nullara", "Omenkara", "Pallath", "Quellia", "Ravinth", "Scornara", "Thornval"], "ironico": ["Cornettina", "Codadirospa", "Fuochetta", "Puzzolente", "Rossetta", "Ciuffodifuoco", "Sfrigolinina", "Piccantina", "Infernozzo", "Diavoletta", "Baffidifumo", "Infernetta", "Cornucopietta", "Bruciacchiata", "Fiammiferina", "Cornettina", "Codatorta", "Fumaccia", "Puzzolona", "Rossiccina", "Sfrigolio", "Piccantina", "Bruciacchiata", "Fiammiferina", "Infernozza", "Cornucopietta", "Diavolessa", "Baffodifumo", "Caudifera", "Solforina"]}}, "Mezzorco": {"m": {"eroico": ["Dorn", "Feng", "Gell", "Henk", "Holg", "Imsh", "Keth", "Krusk", "Mhurren", "Ront", "Shump", "Thokk", "Vorg", "Wund", "Yurk", "Zargash", "Dornakh", "Fengraak", "Gellorn", "Henkrath", "Holgaar", "Imshakk", "Kethaak", "Kruskorn", "Mhurrakh", "Rontaak", "Shumporn", "Thokkaar", "Vorgath", "Wundrak", "Yurkaan", "Zargaash", "Baldrak", "Cragorn", "Draknur", "Ethrak"], "neutro": ["Brak", "Crag", "Drak", "Farg", "Grak", "Hrak", "Jrak", "Krak", "Lrak", "Mrak", "Nrak", "Orak", "Prak", "Qrak", "Rrak", "Srak", "Brakkar", "Cragmal", "Drakorn", "Fargaal", "Grakkar", "Hraknal", "Jrakoor", "Krakorn", "Lrakuur", "Mrakaal", "Nrakorn", "Oraknar", "Praknor", "Qrakaar", "Rraknur", "Srakorn", "Traknal", "Uraknor", "Vraknaal", "Wrakoor"], "ironico": ["Testapicchiata", "Grugnopesante", "Zannone", "Spaccatutto", "Urlatore", "Mangiafango", "Puzzabotte", "Craniopiatto", "Tamburoduro", "Sbatacchiatore", "Rompiportoni", "Braccioneforte", "Nocchepiatte", "Berciante", "Ghignoso", "Testaspessa", "Grugnalone", "Zannaccio", "Urlacchione", "Baccano", "Fangaccio", "Puzzone", "Craniopiatto", "Tamburaccio", "Berciaccio", "RompiPorta", "Braccione", "Nocchiadure", "Sberlaccio", "Ghignaccio"]}, "f": {"eroico": ["Chorn", "Deneh", "Ella", "Fenn", "Gauthak", "Henge", "Iltani", "Jen", "Kansif", "Lave", "Mev", "Neega", "Ovak", "Pethrovin", "Quan", "Shawna", "Chornath", "Denehaar", "Ellakra", "Fennara", "Gauthaar", "Hengath", "Iltanor", "Jenakra", "Kansifar", "Lavenar", "Mevkara", "Neegath", "Ovaknar", "Pethravin", "Quanaar", "Shawnara", "Thokkna", "Ursakra", "Vorgath", "Wundara"], "neutro": ["Brak", "Crag", "Drak", "Farg", "Grak", "Hrak", "Jrak", "Krak", "Lrak", "Mrak", "Nrak", "Orak", "Prak", "Qrak", "Rrak", "Srak", "Brakara", "Cragona", "Drakara", "Fargoona", "Grakona", "Hrakona", "Jrakona", "Krakona", "Lrakona", "Mrakona", "Nrakona", "Orakona", "Prakona", "Qrakona", "Rrakona", "Srakona", "Trakona", "Urakona", "Vrakona", "Wrakona"], "ironico": ["Testapicchiata", "Grugnopesante", "Zannona", "Spaccatutto", "Urlatrice", "Mangiafango", "Puzzabotte", "Craniopiana", "Tamburoduro", "Sbatacchiatrice", "Rompiportoni", "Braccioneforte", "Nocchepiatte", "Berciante", "Ghignosa", "Testaspessa", "Grugnalona", "Zannaccia", "Urlacchiona", "Baccana", "Fangaccia", "Puzzona", "Craniodura", "Tamburaccia", "Berciacciona", "Rompiportoni", "Bracciona", "Nocchiadure", "Sberlaccia", "Ghignaccia"]}}, "Mezz'Elfo": {"m": {"eroico": ["Adrean", "Bereth", "Carric", "Daran", "Erevan", "Filarion", "Galindel", "Hadarai", "Immeral", "Jorildyn", "Kevrel", "Laucian", "Mindartis", "Neiryn", "Ourdir", "Paelias"], "neutro": ["Aiden", "Blake", "Cole", "Drew", "Evan", "Flynn", "Gray", "Hugo", "Ivan", "Jules", "Kane", "Leo", "Miles", "Noah", "Owen", "Paul"], "ironico": ["Mezzoebasta", "Nénésaqualerazza", "Unpocodiqua", "Unpocodila", "Ibrido", "Confuso", "Meticciotto", "Nésì nésì", "Dualità", "Cinquantaecinquanta", "Borderline", "Nonsceglie", "Ambiguo", "Inbilico", "Tramezzo"]}, "f": {"eroico": ["Adrie", "Birel", "Chaedi", "Dara", "Enna", "Faral", "Gannayh", "Heian", "Iefal", "Jhaerithe", "Keyleth", "Leshanna", "Mialee", "Naivara", "Oria", "Pyria"], "neutro": ["Aida", "Blake", "Cleo", "Drew", "Eva", "Faye", "Gray", "Hope", "Ida", "June", "Kate", "Luna", "Mae", "Nora", "Opal", "Prue"], "ironico": ["Mezzaebasta", "Nénésaqualerazza", "Unpocodiqua", "Unpocodila", "Ibrida", "Confusa", "Meticciotta", "Nésì nésì", "Dualità", "Cinquantaecinquanta", "Borderline", "Nonsceglie", "Ambigua", "Inbilico", "Tramezzo"]}}, "Dragonide": {"m": {"eroico": ["Arjhan", "Balasar", "Bharash", "Donaar", "Ghesh", "Heskan", "Kriv", "Medrash", "Mehen", "Nadarr", "Pandjed", "Patrin", "Pijion", "Rhogar", "Shamash", "Shedinn", "Tarhun", "Torinn", "Vishap", "Zedaar"], "neutro": ["Blaze", "Cinder", "Drake", "Ember", "Flare", "Glare", "Haze", "Ignite", "Jet", "Kindle", "Lava", "Melt", "Nova", "Pyro", "Quell", "Rage"], "ironico": ["Draghetto", "Scagliuzza", "Soffiafuoco", "Lucertolone", "Facciadasdrago", "Squamoso", "Codadidrago", "Alucce", "Bruciacchietto", "Fiammella", "Draghino", "Scoreggiafuoco", "Squametta", "Crestina", "Griffetto"]}, "f": {"eroico": ["Akra", "Biri", "Daar", "Farideh", "Havilar", "Jheri", "Kava", "Korinn", "Mishann", "Nala", "Perra", "Raiann", "Sora", "Surina", "Thava", "Uadjit", "Verthisathurgiesh", "Wesk"], "neutro": ["Blaze", "Cinder", "Drake", "Ember", "Flare", "Glare", "Haze", "Ignite", "Jet", "Kindle", "Lava", "Melt", "Nova", "Pyro", "Quell", "Rage"], "ironico": ["Draghetta", "Scagliuzza", "Soffiafuoco", "Lucertolona", "Facciadasdrago", "Squamosa", "Codadidrago", "Alucce", "Bruciacchietta", "Fiammella", "Draghina", "Scoreggiafuoco", "Squametta", "Crestina", "Griffetta"]}}, "Gnomo": {"m": {"eroico": ["Alston", "Alvyn", "Boddynock", "Brocc", "Burgell", "Dimble", "Eldon", "Erky", "Fonkin", "Frug", "Gerbo", "Gimble", "Glim", "Jebeddo", "Kellen", "Namfoodle", "Orryn", "Roondar", "Seebo", "Sindri", "Warryn", "Wrenn", "Zook"], "neutro": ["Bip", "Cog", "Din", "Fig", "Giz", "Hub", "Ink", "Jot", "Kit", "Lek", "Mip", "Nib", "Pip", "Qil", "Riv", "Sil"], "ironico": ["Meccanismino", "Ingranaggietto", "Brillantissimo", "Capocciona", "Esperimentone", "Esplosionzina", "Bollinazzi", "Marchingegno", "Inventucchio", "Caccavella", "Birignao", "Ghirigoro", "Bizzarretto", "Strambetto", "Fantastichino"]}, "f": {"eroico": ["Bimpnottin", "Breena", "Caramip", "Carlin", "Donella", "Duvamil", "Ella", "Ellyjobell", "Ellywick", "Lilli", "Loopmottin", "Lorilla", "Mardnab", "Nissa", "Nyx", "Oda", "Orla", "Roywyn", "Shamil", "Tana", "Waywocket", "Zanna"], "neutro": ["Bip", "Cog", "Din", "Fig", "Giz", "Hub", "Ink", "Jot", "Kit", "Lek", "Mip", "Nib", "Pip", "Qil", "Riv", "Sil"], "ironico": ["Meccanismina", "Ingranaggietta", "Brillantissima", "Capocciona", "Esperimentona", "Esplosionzina", "Bollinazza", "Marchingegna", "Inventucchia", "Caccavella", "Birignao", "Ghirigoro", "Bizzarreta", "Strambetta", "Fantastichina"]}}, "Tabaxi": {"m": {"eroico": ["Sette Fulmini", "Zanna di Tempesta", "Artiglio Silente", "Ombra Veloce", "Occhio di Luna", "Ruggito del Tuono", "Passo di Nebbia", "Salto del Vento", "Zampa Nera", "Occhio di Tigre"], "neutro": ["Coda Lunga", "Orecchio Dritto", "Pelo Morbido", "Baffo Storto", "Zampa Lesta", "Occhio Giallo", "Pelo Grigio", "Coda Bianca", "Artiglio Corto", "Muso Piatto"], "ironico": ["Pelo Arruffato", "Graffia Mobili", "Dormilaggiù", "Spilladipelo", "Ronrona Forte", "Mangiapesce", "Annusa Tutto", "Saltaovunque", "Graffiasofà", "Pisolone"]}, "f": {"eroico": ["Sette Stelle", "Artiglio di Luna", "Ombra di Seta", "Occhio d'Ambra", "Zampa di Vento", "Ruggito Silente", "Passo di Nube", "Salto d'Argento", "Zampa Dorata", "Occhio di Giada"], "neutro": ["Coda Lunga", "Orecchio Dritto", "Pelo Morbido", "Baffo Storto", "Zampa Lesta", "Occhio Giallo", "Pelo Grigio", "Coda Bianca", "Artiglio Corto", "Muso Piatto"], "ironico": ["Pelo Arruffata", "Graffia Mobili", "Dormilassù", "Spilladipelo", "Ronrona Forte", "Mangiapesce", "Annusa Tutto", "Saltaovunque", "Graffiasofà", "Pisolona"]}}, "Genasi": {"m": {"eroico": ["Ignaro", "Zephyros", "Ondalar", "Terrakal", "Pyros", "Ventus", "Aquilon", "Magmar", "Borean", "Cinder", "Fluvius", "Granitos", "Nimbus", "Scorchius", "Tidus"], "neutro": ["Ash", "Blaze", "Brook", "Clay", "Dust", "Ember", "Fog", "Gale", "Haze", "Ice", "Jet", "Lava", "Mist", "Nova", "Ore", "Peat"], "ironico": ["Scoppiettin", "Spruzzino", "Sassetto", "Soffietto", "Bollicina", "Nebbiozza", "Fiammetta", "Terriccio", "Ventarello", "Acquetta", "Fangetto", "Cinerino", "Brisella", "Granellino", "Sbuffone"]}, "f": {"eroico": ["Ignara", "Zephyra", "Ondalara", "Terrakala", "Pyria", "Ventusa", "Aquilona", "Magmara", "Boreana", "Cindera", "Fluvia", "Granita", "Nimba", "Scorchia", "Tidea"], "neutro": ["Ash", "Blaze", "Brook", "Clay", "Dust", "Ember", "Fog", "Gale", "Haze", "Ice", "Jet", "Lava", "Mist", "Nova", "Ore", "Peat"], "ironico": ["Scoppietina", "Spruzzina", "Sassetta", "Soffietta", "Bollicina", "Nebbiozza", "Fiammetta", "Terriccia", "Ventarella", "Acquetta", "Fangetta", "Cinerina", "Brisella", "Granellina", "Sbuffona"]}}, "Aarakocra": {"n": {"eroico": ["Aak", "Cheel", "Daal", "Eerak", "Fawk", "Gaak", "Heerk", "Ikree", "Jaak", "Keerawk", "Leerawk", "Meerawk", "Neerk", "Oork", "Peerk", "Raak", "Skree", "Taak", "Uukar", "Vraak"], "neutro": ["Alata", "Becco", "Coda", "Duna", "Elice", "Falco", "Grano", "Herbst", "Ibis", "Jakar", "Kite", "Lark", "Merlo", "Nibio", "Orione", "Pico"], "ironico": ["Svolazzino", "Piuma Rotta", "Caduta Libera", "Becco Storto", "Ali Corte", "Nido Vuoto", "Cinguettio", "Beccuzzino", "Piuma d'Oro", "Tuttiinvolo", "Saltabranch", "Mangiavermi", "Nidaccio", "Voletto", "Schiaccianoci"]}}, "Kenku": {"n": {"eroico": ["Eco", "Riflesso", "Ombra", "Copia", "Miraggio", "Doppio", "Silhouette", "Fantasma", "Parvenza", "Simulacro"], "neutro": ["Gracchio", "Cornacchia", "Stormo", "Piuma", "Becco", "Coda", "Ala", "Artiglio", "Nido", "Volo"], "ironico": ["Ciarliero", "Copiaeincolla", "Parlaparla", "Mimetto", "Imitazioncina", "Pappagallo", "Ripetitore", "Ecchino", "Fotocopietta", "Rimasugli"]}}, "Tortle": {"n": {"eroico": ["Anamul", "Baka", "Clak", "Damu", "Eket", "Fanzi", "Glon", "Hapu", "Irro", "Jama", "Kota", "Laqu", "Manu", "Nari", "Omek", "Pano"], "neutro": ["Guscio", "Lento", "Saggio", "Quieto", "Paziente", "Calmo", "Sereno", "Stabile", "Fermo", "Solido"], "ironico": ["Gusciotondo", "Camminaadagio", "Milleanni", "Sonnolento", "Lentissimo", "Corazzato", "Ritiratosi", "Guscetto", "Tartarugone", "Aspettaaspetta"]}}}, "locali": {"locanda": {"eroico": ["La Corona Spezzata", "Il Falco d'Argento", "L'Aquila e il Drago", "La Spada Ardente", "Il Mantello del Viandante", "L'Ancora del Destino", "Il Corvo di Mezzanotte", "La Torre del Guardiano", "Il Cavaliere Senza Nome", "L'Alba del Guerriero", "Il Porto delle Tempeste", "La Fiamma Eterna", "Il Vento del Nord", "L'Ombra del Monte", "Il Cervo Bianco", "La Luna Cremisi", "Il Serpente d'Oro", "L'Arco e la Freccia", "Il Pugno di Ferro", "La Volpe Grigia", "La Lancia e il Corvo", "Il Falco Cremisi", "L'Ancora Spezzata", "Il Sigillo del Conte", "La Torre dell'Alba", "Il Mantello Scarlatto", "L'Arco d'Argento", "La Spada del Mattino", "Il Drago Dormiente", "L'Elmo del Guerriero", "La Pietra Rossa", "Il Vento Grigio", "Il Grifone Ardente", "La Catena d'Oro", "L'Orso del Nord", "Il Cerchio di Ferro", "La Luce del Tramonto", "Il Porto Silente", "L'Aquila e la Tempesta", "Il Patto dei Valorosi"], "neutro": ["Da Gordo", "Il Carrettiere", "La Sosta del Viandante", "Il Camino Acceso", "Il Buon Riposo", "La Casa del Pellegrino", "Il Tetto Amico", "Il Focolare", "La Mezza Luna", "Il Passaggio", "Il Crocevia", "La Porta Aperta", "Il Riparo", "Il Bivacco", "La Tappa", "Il Giaciglio Comodo", "Il Viandante Stanco", "La Sosta del Carrettiere", "Il Camino di Pietra", "Il Tetto di Paglia", "Da Mastro Berno", "La Cucina del Mugnaio", "Il Riposo del Pellegrino", "La Locanda del Guado", "Il Mulino e il Pozzo", "Il Canale e la Brace", "Da Zia Ornella", "La Tavola del Contadino", "Il Giaciglio di Paglia", "La Porta del Bosco", "Il Sole e la Luna", "Il Carretto Fermo", "Il Ponte di Legno", "La Sorgente Fredda"], "ironico": ["Il Topo Ubriaco", "La Pulce Contenta", "Il Pagliaccio Storto", "Il Letto Rotto", "Il Porcello Felice", "La Lumaca Veloce", "Il Nano Annoiato", "L'Elfo Caciarone", "Il Drago Stanco", "La Strega Allegra", "Il Goblin Pulito", "Il Fantasma Socievole", "L'Ogre Gentile", "La Sirena a Secco", "Il Bardo Stonato", "La Taverna di Nessuno", "Il Letto di Chiodi", "La Zuppa di Ieri", "Il Fantasma Affittuario", "Il Ratto Servizievole", "L'Oste Brontolone", "La Coperta Umida", "Il Cuscino di Paglia", "Il Bicchiere Ammaccato", "La Stanza del Pianto", "Il Registro dei Debiti", "L'Insegna Caduta", "La Porta che Non Chiude", "Il Fuoco che Puzza", "Da Nessuno in Particolare", "Il Posto Peggiore del Nord"]}, "negozio": {"eroico": ["Forgia dell'Alba", "Emporio delle Meraviglie", "Bottega degli Arcanisti", "La Lama Affilata", "Armeria del Destino", "Il Grimorio Antico", "Mercato delle Stelle", "Bottega dell'Alchimista", "Il Sigillo Rotto", "L'Arsenale del Guerriero", "La Cripta dei Tesori", "Il Deposito degli Eroi", "Emporio dell'Avventuriero", "La Fucina del Drago", "Il Bazar delle Ombre", "Artefici del Destino", "Bottega delle Lame Sacre", "Emporio degli Esploratori", "Il Sigillo dell'Arcanista", "Forgia del Drago Grigio", "Arsenale del Guardiano", "La Cripta degli Oggetti", "Mercato delle Reliquie", "Il Deposito dei Campioni", "Bottega dei Cercatori", "La Fucina dell'Alba", "Armeria del Custode", "Il Grimorio Sigillato", "Emporio del Predestinato", "La Torre degli Attrezzi"], "neutro": ["Articoli da Avventura", "Roba Utile", "Negozio di Tutto", "Il Mercante", "Da Berto il Fabbro", "Attrezzi e Forniture", "Il Deposito", "Merci Varie", "Arnesi e Attrezzi", "Il Bottegaio", "Vendita al Dettaglio", "Forniture Generali", "Il Magazzino", "Accessori da Viaggio", "Equipaggiamento Base", "Il Magazzino del Porto", "Attrezzi da Viaggio di Bertuccio", "Forniture del Mestiere", "Il Banco del Mercante", "Oggetti Pratici e Utili", "Da Mastro Ferruccio", "Il Deposito del Viandante", "Arnesi e Ricambi", "Il Banco degli Scambi", "Forniture per Avventurieri", "Il Rigattiere Onesto", "Tutto per il Viaggio", "La Bottega del Guado", "Articoli Vari di Qualità", "Il Banco di Borgo"], "ironico": ["Roba Usata e Malmessa", "Il Mercante Disonesto", "Offerte Sospette", "Non Chiedere da Dove Viene", "Prezzi Folli Garantiti", "Il Ladro Onesto", "Merce di Dubbia Provenienza", "Occasioni (Forse)", "Il Rigattiere Cieco", "Sconto del 0%", "Compro Tutto Vendo Niente", "Qualcosa per Qualcuno", "Il Bazar del Rimpianto", "Armi (Quasi) Funzionanti", "Potrebbe Esplodere", "Roba Trovata per Strada", "Il Mercante Sospetto di Fiducia", "Prezzi Trattabili (Non Molto)", "Non Chiedere la Ricevuta", "Garanzia Nessuna", "Il Banco del Dubbio", "Merce di Incerta Provenienza", "Il Rigattiere Smemorato", "Tutto Usato Tutto Bello", "Compro Vendo Dimentico", "Il Negozio del Rimpianto", "Articoli con Storia (Brutta)", "Non È Rubato (Forse)", "Il Prezzo È Quello Che È", "Qualcosa per Qualcuno"]}, "osteria": {"eroico": ["La Tavola del Re", "Il Banchetto degli Eroi", "La Sala del Consiglio", "Il Calice d'Oro", "La Dispensa del Mago", "Il Convito dei Campioni", "La Mensa del Guerriero", "Il Focolare degli Eletti", "Il Pasto dell'Avventuriero", "La Cucina delle Leggende", "Il Piatto del Destino", "Il Ristoro del Viandante", "La Tavola degli Eroi Caduti", "Il Banchetto del Condottiero", "La Sala delle Leggende", "Il Convito dei Predestinati", "La Mensa dell'Alba", "Il Calice degli Immortali", "La Dispensa del Drago", "Il Pasto del Campione", "La Cucina del Mago", "Il Focolare dei Valorosi", "La Sala del Grande Nord", "Il Pranzo del Guardiano"], "neutro": ["Da Mamma Orsola", "Il Piatto Pieno", "La Minestra Calda", "Il Pasto del Contadino", "Da Beppe", "Il Fornaio e il Cuoco", "La Pancia Piena", "Il Pranzo del Lavoratore", "La Cucina di Nonna", "Il Boccone Facile", "Pasto e Riposo", "La Tavola Comune", "Da Mastro Olindo il Cuoco", "Il Pasto Caldo della Sera", "La Zuppa di Borgo", "Il Fornaio e la Cantina", "Da Mamma Eleonora", "Il Piatto del Giorno", "La Cucina del Mulino", "Pane e Companatico", "Il Boccone del Viandante", "La Tavola della Comunità", "Il Pranzo del Mercato", "Cucina Semplice e Onesta"], "ironico": ["Il Vomitorium", "Cucina Discutibile", "Roba da Mangiare (Forse)", "Il Cuoco Cieco", "Specialità della Casa (Non Chiedere)", "Il Pesce di Ieri", "Quello Che Avanza", "La Zuppa del Giorno (Sempre la Stessa)", "Il Cuoco Ubriaco", "Mangi e Taci", "Ingredienti Segreti", "Prendere o Lasciare", "Il Menu dell'Orrore", "Sapori Inaspettati", "Il Cuoco Misterioso", "Ingredienti Non Identificati", "La Zuppa Eterna", "Il Minestrone di Ieri e di Oggi", "Sapori Inattesi Garantiti", "Il Menu dell'Ignoto", "Cucina d'Avventura (Anche Troppo)", "Il Piatto che Cambia Colore", "Da Mangiare (Forse)", "Il Boccone Coraggioso", "La Specialità del Caso", "Cibo (Definizione Ampia)"]}}, "luoghi": {"citta": {"eroico": ["Argentveil", "Bronzegate", "Castelmura", "Dragonfall", "Eremont", "Frostholm", "Goldenhaven", "Highwatch", "Ironkeep", "Jadepeak", "Kingsmere", "Lightfall", "Moonveil", "Nightfall", "Oakhaven", "Peakwood", "Queensrest", "Riverstone", "Silverhold", "Thornwall", "Undermount", "Valorkeep", "Whitespire", "Ironhold", "Duskwall"], "neutro": ["Portochiaro", "Castelforte", "Rupe Alta", "Valleverde", "Fondovalle", "Crocevie", "Pietragrossa", "Colle Lungo", "Passo del Nord", "Guado del Fiume", "Borgo Antico", "Villaggio del Mulino", "Pozzo Secco", "Torre Vecchia", "Ponte di Pietra"], "ironico": ["Pantanopuzzolente", "Borghiccio", "Cittaduzza", "Paesotto", "Villaggetto", "Mezzaniente", "Quasiuncittà", "Postaccio", "Luoghetto", "Dovunque", "Nessunposto", "Tantobasta", "Quasilameta", "Erregiù", "Postoqualsiasi"]}, "dungeon": {"eroico": ["Le Grotte dell'Oblio", "Il Labirinto Eterno", "Le Catacombe del Re Caduto", "Il Tempio del Dio Dimenticato", "La Fortezza degli Oscuri", "Le Miniere Maledette", "Il Sepolcro degli Antichi", "La Torre del Negromante", "Il Rifugio del Drago", "Le Prigioni di Ferro", "Il Vault del Lich", "La Cripta Senza Luce", "Il Sanctum Proibito", "Le Rovine della Grande Guerra", "Il Pozzo Senza Fondo"], "neutro": ["Grotta del Nord", "Vecchia Miniera", "Caverna Umida", "Sotterranei Abbandonati", "Rovina del Castello", "Tomba Dimenticata", "Magazzino Sotterraneo", "Bunker Antico", "Galleria dei Nani", "Catacomba Comune"], "ironico": ["Buchetto Buio", "Cantina Umida", "Scantinato Terrificante", "Tana di Qualcosa", "Buco nel Terreno", "Postaccio Sotterraneo", "Grotta del Niente", "Catacombetta", "La Fognatura degli Eroi", "Il Budello Oscuro", "Corridoio Senza Uscita", "Stanzetta con Trappola", "Il Posto Dove Muoiono Tutti"]}, "foresta": {"eroico": ["Bosco di Silverwood", "Foresta di Thornhaven", "Il Bosco Antico", "La Selva dell'Alba", "Il Manto Verde", "Foresta di Moonshadow", "Il Bosco dei Sussurri", "La Selva Eterna", "Il Labirinto di Foglie", "Foresta di Darkwood", "Il Bosco Incantato", "La Selva dei Prodigi"], "neutro": ["Il Bosco Grande", "Alberi del Nord", "Il Fitto", "La Boscaglia", "Selva Comune", "Foresta del Fiume", "Il Boschetto", "Alberi Alti", "La Macchia", "Il Verde"], "ironico": ["Il Bosco Storto", "Alberi Puzzolenti", "La Selva dei Ragni", "Boschetto Sinistro", "Il Fitto Oscuro", "Foresta Maleducata", "La Macchia Urticante", "Alberi Cadenti", "Il Labirinto di Spine", "La Foresta di Chi Sa Cosa"]}}, "epiteti": {"eroico": ["il Valoroso", "la Valorosa", "il Senza Paura", "la Senza Paura", "il Dragonslayer", "la Dragonslayer", "il Portatore di Luce", "la Portatrice di Luce", "il Guardiano", "la Guardiana", "il Flagello dei Non-morti", "la Flagello dei Non-morti", "il Conquistatore", "la Conquistatrice", "il Senza Macchia", "la Senza Macchia", "il Predestinato", "la Predestinata", "il Figlio del Tuono", "la Figlia del Tuono", "il Pugno di Ferro", "la Pugno di Ferro", "il Vendicatore", "la Vendicatrice", "il Latore di Morte", "la Latrice di Morte", "il Campione", "la Campionessa"], "neutro": ["il Vecchio", "la Vecchia", "il Giovane", "la Giovane", "il Rosso", "la Rossa", "il Biondo", "la Bionda", "il Nero", "la Nera", "il Grosso", "la Grossa", "il Magro", "la Magra", "il Basso", "la Bassa", "il Alto", "l'Alta", "lo Zoppo", "la Zoppa", "il Guerriero", "la Guerriera", "il Mago", "la Maga"], "ironico": ["il Maldestro", "la Maldestra", "il Dormiglione", "la Dormigliona", "il Mangione", "la Mangiona", "il Brontolone", "la Brontolona", "il Sempre in Ritardo", "la Sempre in Ritardo", "il Perdipezzi", "la Perdipezzi", "il Dimenticone", "la Dimenticona", "il Mai Sazio", "la Mai Sazia", "il Puzzolente", "la Puzzolente", "il Cascamorto", "la Cascamorta", "il Sognatore", "la Sognatrice", "il Codardo", "la Codarda", "il Parolone", "la Parolona", "il Imbranato", "l'Imbranata"]}, "oggetti": {"eroico": ["Lama dell'Alba Eterna", "Scudo del Guardiano Caduto", "Bastone degli Arcanisti", "Amuleto del Drago d'Argento", "Elmo del Conquistatore", "Anello del Predestinato", "Mantello delle Ombre Dorate", "Arco del Cacciatore Eterno", "Ascia del Re Dimenticato", "Corona del Sovrano Antico", "Spada del Paladino Perduto", "Grimorio del Lich", "Talismano del Sole Nascente", "Stivali del Vento del Nord", "Guanti del Titano", "Torcia della Luce Eterna", "Mappa delle Terre Proibite", "Calice del Destino"], "neutro": ["Spada +1", "Anello di Protezione", "Mantello Utile", "Borsa Capiente", "Bacchetta di Qualcosa", "Amuleto Generico", "Stivali Comodi", "Elmo Robusto", "Scudo Affidabile", "Guanti da Lavoro", "Torcia Magica", "Cintura della Forza", "Occhiali da Lettura", "Pietra del Fuoco", "Fischietto degli Animali"], "ironico": ["Spada che Non Taglia", "Scudo con un Buco", "Bastone del Camminatore (Normale)", "Anello dell'Invisibilità (Solo le Dita)", "Elmo che Fisch", "Mantello dell'Evidenza", "Stivali del 7 Leghe (Solo Andata)", "Amuleto della Sfortuna Lieve", "Pozione di Tosse", "Grimorio con le Pagine Strappate", "Mappa Sbagliata", "Torcia che Gocciola", "Borsa con il Buco", "Spada Arrugginita dell'Eroe", "Guanti Sinistri (Entrambi)", "Frecce che Volano a Destra"]}, "divinita": {"eroico": ["Arathor il Luminoso", "Valdris Portatore di Tempeste", "Miraen la Tessitrice", "Korrath il Distruttore", "Selvaine la Cacciatrice", "Tethys Signore degli Abissi", "Elarion l'Immortale", "Brandor il Forgiaturo", "Nyx la Divoratrice di Stelle", "Auriel la Benedetta", "Zehir il Serpente Eterno", "Morwen la Mietitrice", "Pelor il Radiante", "Vecna il Sussurratore", "Corellon l'Artigiano degli Elfi"], "neutro": ["Il Grande Spirito", "La Madre Terra", "Il Signore del Fuoco", "La Dea del Mare", "Il Custode dei Morti", "La Protettrice", "Il Dio della Guerra", "La Dea della Guarigione", "Il Trickster", "La Signora della Notte", "Il Padre del Cielo", "La Dea della Terra"], "ironico": ["Zot il Piccolo", "Blandor dio dei Lunedì", "Fruzzio l'Indeciso", "Meh la Dea dell'Indifferenza", "Snorb dio dei Raffreddori", "Blandina dea delle Code", "Papiro dio della Burocrazia", "Noia l'Eterno", "Procrastinazion dio di Domani", "Caffeina la Benedetta", "Bivacco dio dei Campeggiatori", "Sonno il Pietoso", "Sbadiglio il Grande"]}, "gilde": {"eroico": ["Ordine della Lama Cremisi", "Fratellanza del Corvo", "Corporazione degli Ombre", "Gilda dei Cercatori", "Lega degli Avventurieri", "Ordine del Drago d'Argento", "Fratellanza del Lupo", "Compagnia dei Predestinati", "Gilda degli Arcanisti", "Lega dei Cacciatori di Taglie", "Ordine della Spada Spezzata", "Fratellanza del Falco", "Corporazione dei Veleni", "Gilda dei Costruttori di Mappe", "Ordine del Mantello Grigio"], "neutro": ["Gilda dei Mercanti", "Corporazione dei Fabbri", "Associazione dei Bardi", "Lega dei Guaritori", "Unione dei Maghi", "Gilda dei Ladri", "Ordine dei Chierici", "Fratellanza dei Guerrieri", "Corporazione degli Alchimisti", "Lega dei Ranger"], "ironico": ["Gilda dei Dormiglioni", "Ordine del Secondo Posto", "Fratellanza dei Falliti Illustri", "Compagnia dei Quasi Eroi", "Lega dei Sempre in Ritardo", "Gilda delle Buone Intenzioni", "Ordine del Tentativo Nobile", "Corporazione dei Perdipezzi", "Associazione dei Quasi Famosi", "Unione dei Quasi Ricchi", "Gilda del Non Era Mia Colpa", "Ordine dei Sopravvissuti per Caso"]}};

// ─── Races Database ─────────────────────────────────────────────────────────
const RACES_DB = [{"slug":"umano","name":"Umano","size":"Medio","speed":30,"abilityBonuses":{"STR":1,"DEX":1,"CON":1,"INT":1,"WIS":1,"CHA":1},"languages":["Comune","Una lingua a scelta"],"traits":[{"name":"Versatile","desc":"+1 a tutte le caratteristiche. Lingua extra a scelta."}],"darkvision":0,"resistances":[]},{"slug":"nano-delle-colline","name":"Nano delle Colline","size":"Medio","speed":25,"abilityBonuses":{"CON":2,"WIS":1},"languages":["Comune","Nanico"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Robustezza Nanica","desc":"+2 PF massimi per livello."},{"name":"Resistenza Nanica","desc":"Vantaggio ai TS contro veleno; resistenza ai danni veleno."},{"name":"Addestramento al Combattimento Nanico","desc":"Competenza con ascia da battaglia, ascia da guerra, martello leggero, martello da guerra."},{"name":"Intuizione Lapidaria","desc":"Vantaggio alle prove di Storia legate all'origine di manufatti in pietra."}],"darkvision":18,"resistances":["Veleno"]},{"slug":"nano-delle-montagne","name":"Nano delle Montagne","size":"Medio","speed":25,"abilityBonuses":{"STR":2,"CON":2},"languages":["Comune","Nanico"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Resistenza Nanica","desc":"Vantaggio ai TS contro veleno; resistenza ai danni veleno."},{"name":"Addestramento al Combattimento Nanico","desc":"Competenza con ascia da battaglia, ascia da guerra, martello leggero, martello da guerra."},{"name":"Addestramento con l'Armatura Nanica","desc":"Competenza con armature leggere e medie."}],"darkvision":18,"resistances":["Veleno"]},{"slug":"elfo-alto","name":"Elfo Alto","size":"Medio","speed":30,"abilityBonuses":{"DEX":2,"INT":1},"languages":["Comune","Elfico","Una lingua a scelta"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Sensi Acuti","desc":"Competenza nell'abilità Percezione."},{"name":"Discendenza Fatata","desc":"Vantaggio ai TS contro affascinato; non può essere addormentato magicamente."},{"name":"Trance","desc":"Invece di dormire, medita 4 ore (equivale a 8 ore di riposo lungo)."},{"name":"Addestramento Elfico alle Armi","desc":"Competenza con spada lunga, spada corta, arco corto, arco lungo."},{"name":"Trucchetto","desc":"Conosce un trucchetto da mago."}],"darkvision":18,"resistances":[]},{"slug":"elfo-del-bosco","name":"Elfo del Bosco","size":"Medio","speed":35,"abilityBonuses":{"DEX":2,"WIS":1},"languages":["Comune","Elfico"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Sensi Acuti","desc":"Competenza nell'abilità Percezione."},{"name":"Discendenza Fatata","desc":"Vantaggio ai TS contro affascinato; non può essere addormentato magicamente."},{"name":"Trance","desc":"Invece di dormire, medita 4 ore."},{"name":"Addestramento Elfico alle Armi","desc":"Competenza con spada lunga, spada corta, arco corto, arco lungo."},{"name":"Piede Agile","desc":"Può tentare di nascondersi quando oscurato leggermente."}],"darkvision":18,"resistances":[]},{"slug":"halfling-piedelesto","name":"Halfling Piedelesto","size":"Piccolo","speed":25,"abilityBonuses":{"DEX":2,"CHA":1},"languages":["Comune","Halfling"],"traits":[{"name":"Fortuna","desc":"Quando tira 1 su d20 per attacco, prova o TS, può ritirare e deve usare il nuovo risultato."},{"name":"Coraggioso","desc":"Vantaggio ai TS contro la condizione spaventato."},{"name":"Agilità Halfling","desc":"Può muoversi attraverso lo spazio di qualsiasi creatura di taglia superiore."},{"name":"Naturalmente Furtivo","desc":"Può tentare di nascondersi dietro creature di taglia Media o superiore."}],"darkvision":0,"resistances":[]},{"slug":"halfling-stoutfoot","name":"Halfling Stoutfoot","size":"Piccolo","speed":25,"abilityBonuses":{"DEX":2,"CON":1},"languages":["Comune","Halfling"],"traits":[{"name":"Fortuna","desc":"Quando tira 1 su d20 per attacco, prova o TS, può ritirare e deve usare il nuovo risultato."},{"name":"Coraggioso","desc":"Vantaggio ai TS contro la condizione spaventato."},{"name":"Agilità Halfling","desc":"Può muoversi attraverso lo spazio di qualsiasi creatura di taglia superiore."},{"name":"Resistenza Stoutfoot","desc":"Vantaggio ai TS contro veleno; resistenza ai danni veleno."}],"darkvision":0,"resistances":["Veleno"]},{"slug":"dragonide","name":"Dragonide","size":"Medio","speed":30,"abilityBonuses":{"STR":2,"CHA":1},"languages":["Comune","Draconico"],"traits":[{"name":"Ascendenza Draconico","desc":"Scegli un tipo di drago: determina il soffio e la resistenza."},{"name":"Soffio","desc":"Azione: area 5×9m (o cono 4.5m). TS DES/COS/COS CD 8+mod CON+bonus comp. 2d6 danni, scala con livello."},{"name":"Resistenza ai Danni","desc":"Resistenza al tipo di danno associato all'ascendenza."}],"darkvision":0,"resistances":["Da ascendenza draconico"]},{"slug":"gnomo-delle-foreste","name":"Gnomo delle Foreste","size":"Piccolo","speed":25,"abilityBonuses":{"INT":2,"DEX":1},"languages":["Comune","Gnomesco"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Astuzia Gnomica","desc":"Vantaggio ai TS su INT, SAG e CAR contro magia."},{"name":"Illusionista Naturale","desc":"Può lanciare Immagine Minore una volta per riposo lungo (INT)."},{"name":"Parla con le Bestie","desc":"Può comunicare con animali piccoli tramite suoni e gesti."}],"darkvision":18,"resistances":[]},{"slug":"gnomo-delle-rocce","name":"Gnomo delle Rocce","size":"Piccolo","speed":25,"abilityBonuses":{"INT":2,"CON":1},"languages":["Comune","Gnomesco"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Astuzia Gnomica","desc":"Vantaggio ai TS su INT, SAG e CAR contro magia."},{"name":"Conoscitore degli Ingranaggi","desc":"Proficiency in Indagare; vantaggio alle prove INT su aggeggi alchemici, costrutti e oggetti simili."}],"darkvision":18,"resistances":[]},{"slug":"mezzelfo","name":"Mezz'Elfo","size":"Medio","speed":30,"abilityBonuses":{"CHA":2,"__choice2__":1},"languages":["Comune","Elfico","Una lingua a scelta"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Discendenza Fatata","desc":"Vantaggio ai TS contro affascinato; non può essere addormentato magicamente."},{"name":"+1 a due caratteristiche a scelta","desc":"Scegli due caratteristiche diverse: ognuna riceve +1."},{"name":"Versatilità nelle Competenze","desc":"Competenza in due abilità a scelta."}],"darkvision":18,"resistances":[]},{"slug":"mezzorco","name":"Mezzorco","size":"Medio","speed":30,"abilityBonuses":{"STR":2,"CON":1},"languages":["Comune","Orchesco"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Minaccioso","desc":"Competenza nell'abilità Intimidazione."},{"name":"Resistenza Implacabile","desc":"Una volta per riposo lungo, quando scende a 0 PF può scegliere di scendere a 1 PF."},{"name":"Attacchi Selvaggi","desc":"Con un colpo critico in mischia, tira uno dei dadi danno aggiuntivo."}],"darkvision":18,"resistances":[]},{"slug":"tiefling","name":"Tiefling","size":"Medio","speed":30,"abilityBonuses":{"INT":1,"CHA":2},"languages":["Comune","Infernale"],"traits":[{"name":"Scurovisione","desc":"18 m di scurovisione."},{"name":"Resistenza Infernale","desc":"Resistenza ai danni fuoco."},{"name":"Eredità Infernale","desc":"Lv1: Thaumaturgia. Lv3: Delirio Infernale 1/riposo lungo. Lv5: Tenebre 1/riposo lungo."}],"darkvision":18,"resistances":["Fuoco"]}];

// ─── Classes Database ────────────────────────────────────────────────────────
const CLASSES_DB = [{"slug":"barbaro","name":"Barbaro","hitDie":12,"savingThrows":["STR","CON"],"armorProf":["Leggera","Media","Scudi"],"weaponProf":["Semplici","Marziali"],"skillChoices":2,"skills":["Addestrare Animali","Atletica","Intimidazione","Natura","Percezione","Sopravvivenza"],"spellcasting":null,"slots":{"1":[0,0,0,0,0,0,0,0,0],"2":[0,0,0,0,0,0,0,0,0],"3":[0,0,0,0,0,0,0,0,0],"4":[0,0,0,0,0,0,0,0,0],"5":[0,0,0,0,0,0,0,0,0],"6":[0,0,0,0,0,0,0,0,0],"7":[0,0,0,0,0,0,0,0,0],"8":[0,0,0,0,0,0,0,0,0],"9":[0,0,0,0,0,0,0,0,0],"10":[0,0,0,0,0,0,0,0,0],"11":[0,0,0,0,0,0,0,0,0],"12":[0,0,0,0,0,0,0,0,0],"13":[0,0,0,0,0,0,0,0,0],"14":[0,0,0,0,0,0,0,0,0],"15":[0,0,0,0,0,0,0,0,0],"16":[0,0,0,0,0,0,0,0,0],"17":[0,0,0,0,0,0,0,0,0],"18":[0,0,0,0,0,0,0,0,0],"19":[0,0,0,0,0,0,0,0,0],"20":[0,0,0,0,0,0,0,0,0]},"features":{"1":["Rabbia (2/riposo lungo, +2 danni)","Difesa Senza Armatura (10+mod CON+mod DES)"],"2":["Attacco Sconsiderato","Fiuto del Pericolo"],"3":["Cammino Primordiale"],"4":["Miglioramento Caratteristica"],"5":["Attacco Extra","Movimento Rapido (+3m in rabbia)"],"6":["Caratteristica Cammino Primordiale"],"7":["Istinto Ferino","Movimento Istintivo"],"8":["Miglioramento Caratteristica"],"9":["Critico Brutale (1 dado)"],"10":["Caratteristica Cammino Primordiale"],"11":["Rabbia Implacabile"],"12":["Miglioramento Caratteristica"],"13":["Critico Brutale (2 dadi)"],"14":["Caratteristica Cammino Primordiale"],"15":["Spirito Persistente"],"16":["Miglioramento Caratteristica"],"17":["Critico Brutale (3 dadi)","Rabbia (6/riposo lungo)"],"18":["Potenza Indomita"],"19":["Miglioramento Caratteristica"],"20":["Campione Primordiale (+4 FOR/COS)"]}},{"slug":"bardo","name":"Bardo","hitDie":8,"savingThrows":["DEX","CHA"],"armorProf":["Leggera"],"weaponProf":["Semplici","Balestra a mano","Spada lunga","Rapier","Spada corta"],"skillChoices":3,"skills":["Acrobazia","Arcano","Atletica","Indagare","Inganno","Intuizione","Intimidazione","Medicina","Natura","Percezione","Persuasione","Rapidità di Mano","Religione","Rappresentazione","Sopravvivenza","Storia"],"spellcasting":"CHA","slots":{"1":[2,0,0,0,0,0,0,0,0],"2":[3,0,0,0,0,0,0,0,0],"3":[4,2,0,0,0,0,0,0,0],"4":[4,3,0,0,0,0,0,0,0],"5":[4,3,2,0,0,0,0,0,0],"6":[4,3,3,0,0,0,0,0,0],"7":[4,3,3,1,0,0,0,0,0],"8":[4,3,3,2,0,0,0,0,0],"9":[4,3,3,3,1,0,0,0,0],"10":[4,3,3,3,2,0,0,0,0],"11":[4,3,3,3,2,1,0,0,0],"12":[4,3,3,3,2,1,0,0,0],"13":[4,3,3,3,2,1,1,0,0],"14":[4,3,3,3,2,1,1,0,0],"15":[4,3,3,3,2,1,1,1,0],"16":[4,3,3,3,2,1,1,1,0],"17":[4,3,3,3,2,1,1,1,1],"18":[4,3,3,3,3,1,1,1,1],"19":[4,3,3,3,3,2,1,1,1],"20":[4,3,3,3,3,2,2,1,1]},"features":{"1":["Incantesimi","Ispirazione Bardica (d6)"],"2":["Canto di Riposo (d6)","Tuttofare"],"3":["Collegio Bardico","Competenza con Strumenti"],"4":["Miglioramento Caratteristica"],"5":["Ispirazione Bardica (d8)","Fonte d'Ispirazione"],"6":["Controincantesimo","Caratteristica Collegio Bardico"],"7":[],"8":["Miglioramento Caratteristica"],"9":["Canto di Riposo (d8)"],"10":["Ispirazione Bardica (d10)","Segreti Magici (2)","Miglioramento Caratteristica"],"11":[],"12":["Miglioramento Caratteristica"],"13":["Canto di Riposo (d10)"],"14":["Segreti Magici (2)","Caratteristica Collegio Bardico"],"15":["Ispirazione Bardica (d12)"],"16":["Miglioramento Caratteristica"],"17":["Canto di Riposo (d12)"],"18":["Segreti Magici (2)"],"19":["Miglioramento Caratteristica"],"20":["Ispirazione Superiore"]}},{"slug":"chierico","name":"Chierico","hitDie":8,"savingThrows":["WIS","CHA"],"armorProf":["Leggera","Media","Scudi"],"weaponProf":["Semplici"],"skillChoices":2,"skills":["Storia","Intuizione","Medicina","Persuasione","Religione"],"spellcasting":"WIS","slots":{"1":[2,0,0,0,0,0,0,0,0],"2":[3,0,0,0,0,0,0,0,0],"3":[4,2,0,0,0,0,0,0,0],"4":[4,3,0,0,0,0,0,0,0],"5":[4,3,2,0,0,0,0,0,0],"6":[4,3,3,0,0,0,0,0,0],"7":[4,3,3,1,0,0,0,0,0],"8":[4,3,3,2,0,0,0,0,0],"9":[4,3,3,3,1,0,0,0,0],"10":[4,3,3,3,2,0,0,0,0],"11":[4,3,3,3,2,1,0,0,0],"12":[4,3,3,3,2,1,0,0,0],"13":[4,3,3,3,2,1,1,0,0],"14":[4,3,3,3,2,1,1,0,0],"15":[4,3,3,3,2,1,1,1,0],"16":[4,3,3,3,2,1,1,1,0],"17":[4,3,3,3,2,1,1,1,1],"18":[4,3,3,3,3,1,1,1,1],"19":[4,3,3,3,3,2,1,1,1],"20":[4,3,3,3,3,2,2,1,1]},"features":{"1":["Incantesimi","Dominio Divino"],"2":["Incanalare Divinità (1/riposo)","Caratteristica Dominio"],"3":["Caratteristica Dominio"],"4":["Miglioramento Caratteristica"],"5":["Distruggi Non-morti (CR 1/2)"],"6":["Incanalare Divinità (2/riposo)","Caratteristica Dominio"],"7":[],"8":["Miglioramento Caratteristica","Distruggi Non-morti (CR 1)","Caratteristica Dominio"],"9":[],"10":["Intervento Divino"],"11":["Distruggi Non-morti (CR 2)"],"12":["Miglioramento Caratteristica"],"13":[],"14":["Distruggi Non-morti (CR 3)"],"15":[],"16":["Miglioramento Caratteristica"],"17":["Distruggi Non-morti (CR 4)","Caratteristica Dominio"],"18":["Incanalare Divinità (3/riposo)"],"19":["Miglioramento Caratteristica"],"20":["Intervento Divino migliorato"]}},{"slug":"druido","name":"Druido","hitDie":8,"savingThrows":["INT","WIS"],"armorProf":["Leggera","Media","Scudi (non metallo)"],"weaponProf":["Clava","Daga","Dardo","Giavellotto","Mazza","Bastone","Scimitarra","Fionda","Lancia"],"skillChoices":2,"skills":["Arcano","Addestrare Animali","Intuizione","Medicina","Natura","Percezione","Religione","Sopravvivenza"],"spellcasting":"WIS","slots":{"1":[2,0,0,0,0,0,0,0,0],"2":[3,0,0,0,0,0,0,0,0],"3":[4,2,0,0,0,0,0,0,0],"4":[4,3,0,0,0,0,0,0,0],"5":[4,3,2,0,0,0,0,0,0],"6":[4,3,3,0,0,0,0,0,0],"7":[4,3,3,1,0,0,0,0,0],"8":[4,3,3,2,0,0,0,0,0],"9":[4,3,3,3,1,0,0,0,0],"10":[4,3,3,3,2,0,0,0,0],"11":[4,3,3,3,2,1,0,0,0],"12":[4,3,3,3,2,1,0,0,0],"13":[4,3,3,3,2,1,1,0,0],"14":[4,3,3,3,2,1,1,0,0],"15":[4,3,3,3,2,1,1,1,0],"16":[4,3,3,3,2,1,1,1,0],"17":[4,3,3,3,2,1,1,1,1],"18":[4,3,3,3,3,1,1,1,1],"19":[4,3,3,3,3,2,1,1,1],"20":[4,3,3,3,3,2,2,1,1]},"features":{"1":["Druido","Incantesimi"],"2":["Forma Selvatica (CR 1/4 — no volare/nuotare)","Circolo Druidico"],"3":[],"4":["Forma Selvatica (CR 1/2 — no volare)","Miglioramento Caratteristica"],"5":[],"6":[],"7":[],"8":["Forma Selvatica (CR 1)","Miglioramento Caratteristica"],"9":[],"10":[],"11":[],"12":["Miglioramento Caratteristica"],"13":[],"14":[],"15":[],"16":["Miglioramento Caratteristica"],"17":[],"18":["Corpo Senza Tempo","Magia delle Bestie"],"19":["Miglioramento Caratteristica"],"20":["Forma Selvatica Arcana"]}},{"slug":"guerriero","name":"Guerriero","hitDie":10,"savingThrows":["STR","CON"],"armorProf":["Tutte","Scudi"],"weaponProf":["Semplici","Marziali"],"skillChoices":2,"skills":["Acrobazia","Addestrare Animali","Atletica","Storia","Intuizione","Intimidazione","Percezione","Sopravvivenza"],"spellcasting":null,"slots":{"1":[0,0,0,0,0,0,0,0,0],"2":[0,0,0,0,0,0,0,0,0],"3":[0,0,0,0,0,0,0,0,0],"4":[0,0,0,0,0,0,0,0,0],"5":[0,0,0,0,0,0,0,0,0],"6":[0,0,0,0,0,0,0,0,0],"7":[0,0,0,0,0,0,0,0,0],"8":[0,0,0,0,0,0,0,0,0],"9":[0,0,0,0,0,0,0,0,0],"10":[0,0,0,0,0,0,0,0,0],"11":[0,0,0,0,0,0,0,0,0],"12":[0,0,0,0,0,0,0,0,0],"13":[0,0,0,0,0,0,0,0,0],"14":[0,0,0,0,0,0,0,0,0],"15":[0,0,0,0,0,0,0,0,0],"16":[0,0,0,0,0,0,0,0,0],"17":[0,0,0,0,0,0,0,0,0],"18":[0,0,0,0,0,0,0,0,0],"19":[0,0,0,0,0,0,0,0,0],"20":[0,0,0,0,0,0,0,0,0]},"features":{"1":["Stile di Combattimento","Secondo Respiro (1/riposo breve)"],"2":["Impeto (1/riposo breve)"],"3":["Archetipo del Guerriero"],"4":["Miglioramento Caratteristica"],"5":["Attacco Extra (2 attacchi)"],"6":["Miglioramento Caratteristica"],"7":["Caratteristica Archetipo"],"8":["Miglioramento Caratteristica"],"9":["Tattiche Indomabili"],"10":["Caratteristica Archetipo"],"11":["Attacco Extra (3 attacchi)"],"12":["Miglioramento Caratteristica"],"13":["Indomabile (1/riposo lungo)"],"14":["Miglioramento Caratteristica"],"15":["Caratteristica Archetipo"],"16":["Miglioramento Caratteristica"],"17":["Impeto (2/riposo breve)","Attacco Extra (4 attacchi)"],"18":["Caratteristica Archetipo"],"19":["Miglioramento Caratteristica"],"20":["Indomabile (3/riposo lungo)"]}},{"slug":"ladro","name":"Ladro","hitDie":8,"savingThrows":["DEX","INT"],"armorProf":["Leggera"],"weaponProf":["Semplici","Balestra a mano","Spada lunga","Rapier","Spada corta"],"skillChoices":4,"skills":["Acrobazia","Atletica","Inganno","Intuizione","Intimidazione","Indagare","Percezione","Rappresentazione","Persuasione","Rapidità di Mano","Furtività"],"spellcasting":null,"slots":{"1":[0,0,0,0,0,0,0,0,0],"2":[0,0,0,0,0,0,0,0,0],"3":[0,0,0,0,0,0,0,0,0],"4":[0,0,0,0,0,0,0,0,0],"5":[0,0,0,0,0,0,0,0,0],"6":[0,0,0,0,0,0,0,0,0],"7":[0,0,0,0,0,0,0,0,0],"8":[0,0,0,0,0,0,0,0,0],"9":[0,0,0,0,0,0,0,0,0],"10":[0,0,0,0,0,0,0,0,0],"11":[0,0,0,0,0,0,0,0,0],"12":[0,0,0,0,0,0,0,0,0],"13":[0,0,0,0,0,0,0,0,0],"14":[0,0,0,0,0,0,0,0,0],"15":[0,0,0,0,0,0,0,0,0],"16":[0,0,0,0,0,0,0,0,0],"17":[0,0,0,0,0,0,0,0,0],"18":[0,0,0,0,0,0,0,0,0],"19":[0,0,0,0,0,0,0,0,0],"20":[0,0,0,0,0,0,0,0,0]},"features":{"1":["Attacco Furtivo (1d6)","Gergo dei Ladri","Maestria (2 abilità)"],"2":["Azione Scaltra"],"3":["Archetipo del Ladro","Trucchi del Mestiere"],"4":["Miglioramento Caratteristica"],"5":["Attacco Furtivo (3d6)","Schivata Prodigiosa"],"6":["Maestria (2 abilità)"],"7":["Attacco Furtivo (4d6)","Elusione"],"8":["Miglioramento Caratteristica"],"9":["Attacco Furtivo (5d6)","Caratteristica Archetipo"],"10":["Miglioramento Caratteristica"],"11":["Attacco Furtivo (6d6)","Talento Affidabile"],"12":["Miglioramento Caratteristica"],"13":["Attacco Furtivo (7d6)","Caratteristica Archetipo"],"14":["Occhi Ciechi"],"15":["Attacco Furtivo (8d6)","Mente Scivolosa"],"16":["Miglioramento Caratteristica"],"17":["Attacco Furtivo (9d6)","Caratteristica Archetipo"],"18":["Attacco Furtivo (10d6)","Elusività"],"19":["Miglioramento Caratteristica"],"20":["Attacco Furtivo (10d6)","Colpo del Destino"]}},{"slug":"mago","name":"Mago","hitDie":6,"savingThrows":["INT","WIS"],"armorProf":[],"weaponProf":["Daga","Dardo","Fionda","Bastone","Balestra leggera"],"skillChoices":2,"skills":["Arcano","Storia","Intuizione","Indagare","Medicina","Religione"],"spellcasting":"INT","slots":{"1":[2,0,0,0,0,0,0,0,0],"2":[3,0,0,0,0,0,0,0,0],"3":[4,2,0,0,0,0,0,0,0],"4":[4,3,0,0,0,0,0,0,0],"5":[4,3,2,0,0,0,0,0,0],"6":[4,3,3,0,0,0,0,0,0],"7":[4,3,3,1,0,0,0,0,0],"8":[4,3,3,2,0,0,0,0,0],"9":[4,3,3,3,1,0,0,0,0],"10":[4,3,3,3,2,0,0,0,0],"11":[4,3,3,3,2,1,0,0,0],"12":[4,3,3,3,2,1,0,0,0],"13":[4,3,3,3,2,1,1,0,0],"14":[4,3,3,3,2,1,1,0,0],"15":[4,3,3,3,2,1,1,1,0],"16":[4,3,3,3,2,1,1,1,0],"17":[4,3,3,3,2,1,1,1,1],"18":[4,3,3,3,3,1,1,1,1],"19":[4,3,3,3,3,2,1,1,1],"20":[4,3,3,3,3,2,2,1,1]},"features":{"1":["Incantesimi","Recupero Arcano"],"2":["Tradizione Arcana"],"3":[],"4":["Miglioramento Caratteristica"],"5":[],"6":["Caratteristica Tradizione Arcana"],"7":[],"8":["Miglioramento Caratteristica"],"9":[],"10":["Caratteristica Tradizione Arcana"],"11":[],"12":["Miglioramento Caratteristica"],"13":[],"14":["Caratteristica Tradizione Arcana"],"15":[],"16":["Miglioramento Caratteristica"],"17":[],"18":["Maestria degli Incantesimi"],"19":["Miglioramento Caratteristica"],"20":["Firma degli Incantesimi"]}},{"slug":"monaco","name":"Monaco","hitDie":8,"savingThrows":["STR","DEX"],"armorProf":[],"weaponProf":["Semplici","Spada corta"],"skillChoices":2,"skills":["Acrobazia","Atletica","Storia","Intuizione","Religione","Furtività"],"spellcasting":null,"slots":{"1":[0,0,0,0,0,0,0,0,0],"2":[0,0,0,0,0,0,0,0,0],"3":[0,0,0,0,0,0,0,0,0],"4":[0,0,0,0,0,0,0,0,0],"5":[0,0,0,0,0,0,0,0,0],"6":[0,0,0,0,0,0,0,0,0],"7":[0,0,0,0,0,0,0,0,0],"8":[0,0,0,0,0,0,0,0,0],"9":[0,0,0,0,0,0,0,0,0],"10":[0,0,0,0,0,0,0,0,0],"11":[0,0,0,0,0,0,0,0,0],"12":[0,0,0,0,0,0,0,0,0],"13":[0,0,0,0,0,0,0,0,0],"14":[0,0,0,0,0,0,0,0,0],"15":[0,0,0,0,0,0,0,0,0],"16":[0,0,0,0,0,0,0,0,0],"17":[0,0,0,0,0,0,0,0,0],"18":[0,0,0,0,0,0,0,0,0],"19":[0,0,0,0,0,0,0,0,0],"20":[0,0,0,0,0,0,0,0,0]},"features":{"1":["Difesa Senza Armatura","Arti Marziali (1d4)"],"2":["Ki (2 punti)","Passo del Vento","Pioggia di Colpi","Movimento Senza Armatura (+3m)"],"3":["Tradizione Monastica","Deviare Proiettili"],"4":["Miglioramento Caratteristica","Caduta Lenta"],"5":["Attacco Extra","Colpo Stordente","Arti Marziali (1d6)"],"6":["Colpi di Ki","Movimento Senza Armatura (+4.5m)","Caratteristica Tradizione"],"7":["Elusione","Calma delle Emozioni"],"8":["Miglioramento Caratteristica"],"9":["Salto Infallibile","Arti Marziali (1d6)","Movimento Senza Armatura (+6m)"],"10":["Purità del Corpo"],"11":["Caratteristica Tradizione","Arti Marziali (1d8)"],"12":["Miglioramento Caratteristica"],"13":["Lingua del Sole e della Luna"],"14":["Anima di Diamante","Movimento Senza Armatura (+7.5m)"],"15":["Mente Senza Tempo","Arti Marziali (1d8)"],"16":["Miglioramento Caratteristica"],"17":["Caratteristica Tradizione","Arti Marziali (1d10)"],"18":["Corpo Vuoto","Movimento Senza Armatura (+9m)"],"19":["Miglioramento Caratteristica"],"20":["Essere Perfetto","Arti Marziali (1d10)"]}},{"slug":"paladino","name":"Paladino","hitDie":10,"savingThrows":["WIS","CHA"],"armorProf":["Tutte","Scudi"],"weaponProf":["Semplici","Marziali"],"skillChoices":2,"skills":["Atletica","Intuizione","Intimidazione","Medicina","Persuasione","Religione"],"spellcasting":"CHA","slots":{"1":[0,0,0,0,0,0,0,0,0],"2":[2,0,0,0,0,0,0,0,0],"3":[3,0,0,0,0,0,0,0,0],"4":[3,0,0,0,0,0,0,0,0],"5":[4,2,0,0,0,0,0,0,0],"6":[4,2,0,0,0,0,0,0,0],"7":[4,3,0,0,0,0,0,0,0],"8":[4,3,0,0,0,0,0,0,0],"9":[4,3,2,0,0,0,0,0,0],"10":[4,3,2,0,0,0,0,0,0],"11":[4,3,3,0,0,0,0,0,0],"12":[4,3,3,0,0,0,0,0,0],"13":[4,3,3,1,0,0,0,0,0],"14":[4,3,3,1,0,0,0,0,0],"15":[4,3,3,2,0,0,0,0,0],"16":[4,3,3,2,0,0,0,0,0],"17":[4,3,3,3,1,0,0,0,0],"18":[4,3,3,3,1,0,0,0,0],"19":[4,3,3,3,2,0,0,0,0],"20":[4,3,3,3,2,0,0,0,0]},"features":{"1":["Senso del Divino","Imposizione delle Mani (5 PF/livello)"],"2":["Stile di Combattimento","Incantesimi","Smitare Divino"],"3":["Salute Divina","Giuramento Sacro"],"4":["Miglioramento Caratteristica"],"5":["Attacco Extra"],"6":["Aura di Protezione (+mod CAR ai TS, 3m)"],"7":["Caratteristica Giuramento Sacro"],"8":["Miglioramento Caratteristica"],"9":[],"10":["Aura di Coraggio (immunità spaventato, 3m)"],"11":["Smitare Divino Migliorato"],"12":["Miglioramento Caratteristica"],"13":[],"14":["Purificazione per Contatto"],"15":["Caratteristica Giuramento Sacro"],"16":["Miglioramento Caratteristica"],"17":[],"18":["Aura migliorata (9m)"],"19":["Miglioramento Caratteristica"],"20":["Caratteristica Giuramento Sacro"]}},{"slug":"ranger","name":"Ranger","hitDie":10,"savingThrows":["STR","DEX"],"armorProf":["Leggera","Media","Scudi"],"weaponProf":["Semplici","Marziali"],"skillChoices":3,"skills":["Addestrare Animali","Atletica","Intuizione","Indagare","Natura","Percezione","Furtività","Sopravvivenza"],"spellcasting":"WIS","slots":{"1":[0,0,0,0,0,0,0,0,0],"2":[2,0,0,0,0,0,0,0,0],"3":[3,0,0,0,0,0,0,0,0],"4":[3,0,0,0,0,0,0,0,0],"5":[4,2,0,0,0,0,0,0,0],"6":[4,2,0,0,0,0,0,0,0],"7":[4,3,0,0,0,0,0,0,0],"8":[4,3,0,0,0,0,0,0,0],"9":[4,3,2,0,0,0,0,0,0],"10":[4,3,2,0,0,0,0,0,0],"11":[4,3,3,0,0,0,0,0,0],"12":[4,3,3,0,0,0,0,0,0],"13":[4,3,3,1,0,0,0,0,0],"14":[4,3,3,1,0,0,0,0,0],"15":[4,3,3,2,0,0,0,0,0],"16":[4,3,3,2,0,0,0,0,0],"17":[4,3,3,3,1,0,0,0,0],"18":[4,3,3,3,1,0,0,0,0],"19":[4,3,3,3,2,0,0,0,0],"20":[4,3,3,3,2,0,0,0,0]},"features":{"1":["Nemico Prescelto","Esploratore Naturale"],"2":["Stile di Combattimento","Incantesimi"],"3":["Archetipo del Ranger","Primitività"],"4":["Miglioramento Caratteristica"],"5":["Attacco Extra"],"6":["Nemico Prescelto (2 tipi)","Esploratore Naturale (2 terreni)"],"7":["Caratteristica Archetipo"],"8":["Miglioramento Caratteristica","Passo della Terra"],"9":[],"10":["Nascondersi Nella Natura","Esploratore Naturale (3 terreni)"],"11":["Caratteristica Archetipo"],"12":["Miglioramento Caratteristica"],"13":[],"14":["Nemico Prescelto (3 tipi)","Occhi della Caccia"],"15":["Caratteristica Archetipo"],"16":["Miglioramento Caratteristica"],"17":[],"18":["Senso Selvatico","Scivolare Senza Tracce"],"19":["Miglioramento Caratteristica"],"20":["Nemico del Cacciatore"]}},{"slug":"stregone","name":"Stregone","hitDie":6,"savingThrows":["CON","CHA"],"armorProf":[],"weaponProf":["Daga","Dardo","Fionda","Bastone","Balestra leggera"],"skillChoices":2,"skills":["Arcano","Inganno","Intuizione","Intimidazione","Persuasione","Religione"],"spellcasting":"CHA","slots":{"1":[2,0,0,0,0,0,0,0,0],"2":[3,0,0,0,0,0,0,0,0],"3":[4,2,0,0,0,0,0,0,0],"4":[4,3,0,0,0,0,0,0,0],"5":[4,3,2,0,0,0,0,0,0],"6":[4,3,3,0,0,0,0,0,0],"7":[4,3,3,1,0,0,0,0,0],"8":[4,3,3,2,0,0,0,0,0],"9":[4,3,3,3,1,0,0,0,0],"10":[4,3,3,3,2,0,0,0,0],"11":[4,3,3,3,2,1,0,0,0],"12":[4,3,3,3,2,1,0,0,0],"13":[4,3,3,3,2,1,1,0,0],"14":[4,3,3,3,2,1,1,0,0],"15":[4,3,3,3,2,1,1,1,0],"16":[4,3,3,3,2,1,1,1,0],"17":[4,3,3,3,2,1,1,1,1],"18":[4,3,3,3,3,1,1,1,1],"19":[4,3,3,3,3,2,1,1,1],"20":[4,3,3,3,3,2,2,1,1]},"features":{"1":["Incantesimi","Origine Stregonesca"],"2":["Punti Stregoneria (2)","Metamagia (2 opzioni)"],"3":[],"4":["Miglioramento Caratteristica"],"5":[],"6":["Caratteristica Origine Stregonesca"],"7":[],"8":["Miglioramento Caratteristica"],"9":[],"10":["Metamagia (3 opzioni)"],"11":[],"12":["Miglioramento Caratteristica"],"13":[],"14":["Caratteristica Origine Stregonesca"],"15":[],"16":["Miglioramento Caratteristica"],"17":["Metamagia (4 opzioni)"],"18":["Caratteristica Origine Stregonesca"],"19":["Miglioramento Caratteristica"],"20":["Restaurazione Stregonesca"]}},{"slug":"warlock","name":"Warlock","hitDie":8,"savingThrows":["WIS","CHA"],"armorProf":["Leggera"],"weaponProf":["Semplici"],"skillChoices":2,"skills":["Arcano","Inganno","Storia","Intimidazione","Indagare","Natura","Religione"],"spellcasting":"CHA","slots":{"1":[1,0,0,0,0,0,0,0,0],"2":[2,0,0,0,0,0,0,0,0],"3":[0,2,0,0,0,0,0,0,0],"4":[0,2,0,0,0,0,0,0,0],"5":[0,0,2,0,0,0,0,0,0],"6":[0,0,2,0,0,0,0,0,0],"7":[0,0,0,2,0,0,0,0,0],"8":[0,0,0,2,0,0,0,0,0],"9":[0,0,0,0,2,0,0,0,0],"10":[0,0,0,0,2,0,0,0,0],"11":[0,0,0,0,3,0,0,0,0],"12":[0,0,0,0,3,0,0,0,0],"13":[0,0,0,0,3,0,0,0,0],"14":[0,0,0,0,3,0,0,0,0],"15":[0,0,0,0,3,0,0,0,0],"16":[0,0,0,0,3,0,0,0,0],"17":[0,0,0,0,4,0,0,0,0],"18":[0,0,0,0,4,0,0,0,0],"19":[0,0,0,0,4,0,0,0,0],"20":[0,0,0,0,4,0,0,0,0]},"features":{"1":["Patrono Ultraterreno","Incantesimi del Patto"],"2":["Invocazioni Occulte (2)"],"3":["Dono del Patto"],"4":["Miglioramento Caratteristica"],"5":["Invocazioni Occulte (5)"],"6":["Caratteristica Patrono"],"7":[],"8":["Miglioramento Caratteristica"],"9":[],"10":["Caratteristica Patrono"],"11":["Arcano Mistico (6°)"],"12":["Miglioramento Caratteristica"],"13":["Arcano Mistico (7°)"],"14":["Caratteristica Patrono"],"15":["Arcano Mistico (8°)"],"16":["Miglioramento Caratteristica"],"17":["Arcano Mistico (9°)"],"18":[],"19":["Miglioramento Caratteristica"],"20":["Incantatore Supremo"]}}];

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

  // Read directly from localStorage every time the component renders
  const importedSpells = (() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_spells")) || "[]"); } catch { return []; }
  })();
  const allSpells = [...SPELLS_DB, ...importedSpells];

  const results = allSpells.filter(sp => {
    const matchQuery = !query || sp.name.toLowerCase().includes(query.toLowerCase());
    const matchLevel = levelFilter === "" || sp.level === parseInt(levelFilter);
    return matchQuery && matchLevel;
  }).slice(0, 100);

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
                <div key={sp.slug} className={`spell-result ${selected?.slug === sp.slug ? "selected" : ""}`} onClick={() => setSelected(selected?.slug === sp.slug ? null : sp)}>
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
    const mQ = !query || m.name.toLowerCase().includes(query.toLowerCase());
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
    const lq = q.toLowerCase();
    return MONSTERS_DB.filter(m => m.name.toLowerCase().includes(lq)).slice(0, 8);
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


// ─── Descriptions Database ───────────────────────────────────────────────────
const DETAILS_DB = {
  luoghi: {
    label: "🏔 Luoghi",
    sub: {
      foresta: {
        label: "Foresta",
        classic: [
          { key: "luce filtrata", note: "raggi obliqui tra le chiome, polline nell'aria" },
          { key: "sottobosco fitto", note: "felci alte fino alle ginocchia, difficile avanzare" },
          { key: "radici esposte", note: "grandi radici affioranti che formano archi naturali" },
          { key: "muschio ovunque", note: "ricopre pietre, tronchi, persino i rami bassi" },
          { key: "silenzio innaturale", note: "nessun verso di uccello, solo il vento" },
          { key: "odore di resina", note: "intenso dopo la pioggia, quasi medicinale" },
          { key: "funghicolori", note: "macchie rosse e arancioni ai piedi degli alberi" },
          { key: "ruscello nascosto", note: "si sente ma non si vede, il terreno è più morbido" },
          { key: "albero caduto antico", note: "tronco marcio largo quanto una carrozza, coperto di vita" },
          { key: "ragnatele pesanti di rugiada", note: "brillano tra i rami, quasi ornamentali" },
          { key: "tracce animali", note: "impronte nel fango, pelo su un ramo spezzato" },
          { key: "nodo di rovi", note: "intricato, sembra quasi intenzionale" },
        ],
        dark: [
          { key: "alberi storti", note: "tronchi contorti come in agonia, nessun ramo dritto" },
          { key: "funghi pallidi", note: "biancastri, senza odore, crescono in cerchio perfetto" },
          { key: "terra nera", note: "quasi oleosa sotto i piedi, lascia macchie scure" },
          { key: "rami secchi ovunque", note: "scricchiolano a ogni passo, impossibile muoversi in silenzio" },
          { key: "odore di marcio", note: "dolciastro, pesante, si attacca ai vestiti" },
          { key: "luce assente", note: "le chiome bloccano tutto, neanche a mezzogiorno c'è ombra chiara" },
          { key: "ossa animali", note: "sparse, alcune ancora con pelle secca, nessun segno di predatore" },
          { key: "silenzio pesante", note: "come ovatta nelle orecchie, persino i passi sembrano attutiti" },
          { key: "rovi con spine lunghe", note: "lunghe un dito, qualcosa vi ha lasciato brandelli di tessuto" },
          { key: "radici che salgono", note: "emergono dal terreno in modo anomalo, quasi cercando qualcosa" },
          { key: "nido abbandonato", note: "enorme, fatto di ossa e fango, a tre metri d'altezza" },
          { key: "albero bruciato", note: "carbonizzato al centro, il fuoco era dall'interno" },
        ],
      },
      dungeon: {
        label: "Dungeon / Grotta",
        classic: [
          { key: "stillicidio", note: "gocce regolari nell'oscurità, creano piccole pozze" },
          { key: "eco amplificato", note: "ogni passo risuona come fosse doppio" },
          { key: "odore di pietra umida", note: "minerale, freddo, penetrante" },
          { key: "torcia che trema", note: "corrente d'aria da qualche apertura non visibile" },
          { key: "stalattiti basse", note: "alcune arrivano quasi al pavimento, camminare chinati" },
          { key: "pavimento scivoloso", note: "alghe e umidità, difficile mantenere l'equilibrio" },
          { key: "porta arrugginita", note: "i cardini cedono, il cigolio riecheggia lontano" },
          { key: "mosaico sbiadito", note: "sul pavimento, quasi cancellato dal passaggio, figure impossibili da decifrare" },
          { key: "corrente d'aria fredda", note: "da una direzione precisa, odore di profondo" },
          { key: "graffiti antichi", note: "sul muro, incisi con qualcosa di affilato, non una lingua comune" },
          { key: "cadavere antico", note: "mummificato dall'aria secca, ancora con l'armatura" },
          { key: "pozza luminescente", note: "alghe blu-verdi sul fondo, luce fioca ma reale" },
        ],
        dark: [
          { key: "odore di sangue vecchio", note: "metallico, stantio, impregnato nelle pietre" },
          { key: "catene al muro", note: "i polsi nei fermagli sono consunti, qualcuno ci ha passato anni" },
          { key: "macchie scure sul soffitto", note: "troppo regolari per essere naturali" },
          { key: "denti sul pavimento", note: "sparsi, di diverse dimensioni, nessun osso intorno" },
          { key: "muffe nere", note: "crescono in pattern geometrici, le pareti intorno sono calde" },
          { key: "scale verso il basso", note: "l'aria diventa sempre più pesante, sempre più calda" },
          { key: "porta sbarrata dall'interno", note: "qualcuno che scappava ha preferito restare chiuso dentro" },
          { key: "iscrizioni cancellate", note: "qualcuno ha lavorato a lungo per renderle illeggibili" },
          { key: "altare rovesciato", note: "incrinato, le macchie sul piano sono vecchie di decenni" },
          { key: "voce lontana", note: "impossibile dire se umana, impossibile localizzarla" },
          { key: "aria immobile", note: "nessuna corrente, la fiamma della torcia è perfettamente dritta" },
          { key: "impronte di piedi nudi", note: "nella polvere, si fermano nel mezzo del corridoio e non ricominciamo" },
        ],
      },
      città: {
        label: "Città / Borgo",
        classic: [
          { key: "mercato mattutino", note: "voci sovrapposte, odore di pane e concime" },
          { key: "lastricato sconnesso", note: "pietre consumate dal passaggio di generazioni" },
          { key: "insegne colorate", note: "appese sulle porte, alcune sbiadite, alcune nuove di pittura" },
          { key: "bambini che rincorrono", note: "attraversano la via senza guardare, spariscono in un vicolo" },
          { key: "odore di fumo di cucina", note: "grasso e legna, il pranzo si prepara nelle case" },
          { key: "fontana centrale", note: "il punto di ritrovo, le donne lavano, i vecchi osservano" },
          { key: "campanile", note: "le ore scandiscono la vita del borgo, si sente ovunque" },
          { key: "cane randagio", note: "segue i passanti a distanza, non si avvicina" },
          { key: "muri imbiancati", note: "calce fresca su alcune facciate, lavori in corso" },
          { key: "carri in transito", note: "lenti, carichi, i buoi indifferenti al traffico intorno" },
          { key: "vicolo ombreggiato", note: "fresco d'estate, si intravedono cassette di verdura" },
          { key: "guardie alla porta", note: "annoiate ma attente, valutano ogni entrata" },
        ],
        dark: [
          { key: "mendicanti agli angoli", note: "troppi per una città così piccola, qualcosa li ha cacciati da altrove" },
          { key: "finestre sbarrate", note: "durante il giorno, le persiane chiuse dall'interno" },
          { key: "odore di scarico", note: "i canali non scorrono come dovrebbero" },
          { key: "guardie armate pesanti", note: "non per proteggere, per controllare chi passa" },
          { key: "negozi chiusi senza avviso", note: "metà delle botteghe serrate, polvere sulle insegne" },
          { key: "bambini che non giocano", note: "stanno fermi a guardare, non sorridono ai passanti" },
          { key: "manifesti strappati", note: "qualcuno ha rimosso di fretta qualcosa dai muri" },
          { key: "conversazioni che si interrompono", note: "quando i PG si avvicinano, il silenzio arriva prima di loro" },
          { key: "odore di bruciato vecchio", note: "un edificio a metà via è annerito, nessuno lo ripara" },
          { key: "palo della gogna", note: "recente, qualcuno ci è rimasto abbastanza a lungo" },
          { key: "mercenari forestieri", note: "troppi, troppo ben equipaggiati, non si sa per chi lavorano" },
          { key: "corvo sul campanile", note: "uno solo, enorme, sembra seguire i movimenti dei PG" },
        ],
      },
      rovine: {
        label: "Rovine",
        classic: [
          { key: "erba tra le pietre", note: "cresce in ciuffi ordinati nelle crepe del pavimento" },
          { key: "muro diroccato", note: "rimane in piedi per metà, l'altra metà è un cumulo di macerie" },
          { key: "arco ancora integro", note: "sopravvissuto al crollo di tutto il resto, quasi sfida la gravità" },
          { key: "rampicanti ovunque", note: "hanno coperto le decorazioni, le pietre sembrano vive" },
          { key: "pozzanghere nei pavimenti", note: "il tetto non c'è più, la pioggia ha scavato vasche" },
          { key: "frammenti di affresco", note: "colori ancora vivaci in piccole porzioni, il resto perduto" },
          { key: "colonna spezzata", note: "il capitello è lì vicino, rotolato di lato" },
          { key: "porta monumentale", note: "ancora in piedi, non porta da nessuna parte" },
          { key: "eco strano", note: "le pareti rimaste creano risonanze inattese" },
          { key: "uccelli che nidificano", note: "nelle nicchie delle statue, il guano ha scolorito il marmo" },
          { key: "iscrizione parziale", note: "metà leggibile, dedicata a qualcuno o qualcosa di dimenticato" },
          { key: "gradini consumati", note: "il centro di ogni gradino è incavato dal passaggio di secoli" },
        ],
        dark: [
          { key: "odore di cenere vecchia", note: "penetra nel naso, non viene dalla zona, viene dalle mura stesse" },
          { key: "scheletri non sepolti", note: "tra le macerie, in pose che raccontano una fine rapida" },
          { key: "simboli su ogni pietra", note: "incisi dopo la costruzione, con qualcosa di appuntito e frettoloso" },
          { key: "nessun animale", note: "nessun uccello, nessun insetto, un silenzio innaturale" },
          { key: "calore residuo", note: "le pietre sono leggermente più calde del dovuto" },
          { key: "pozzo sigillato", note: "pietre pesanti sopra, qualcuno ha voluto che restasse chiuso" },
          { key: "sangue secco antico", note: "tra le pietre, troppo per un incidente" },
          { key: "porta aperta verso il basso", note: "scale che scendono nel buio, aria calda che sale" },
          { key: "statue decapitate", note: "le teste non ci sono, non sono cadute: qualcuno le ha rimosse" },
          { key: "cerchio bruciato", note: "al centro della sala principale, il fuoco era controllato" },
          { key: "resti di accampamento recente", note: "cenere ancora tiepida, qualcuno era qui stanotte" },
          { key: "pareti che trasudano", note: "umidità anormale, la pietra è sempre bagnata" },
        ],
      },
    },
  },
  locande: {
    label: "🍺 Locande",
    sub: {
      esterno: {
        label: "Esterno",
        classic: [
          { key: "insegna dipinta", note: "un animale o un oggetto, i colori tengono ancora" },
          { key: "botti accatastate", note: "fuori dalla porta, alcune vuote, alcune no" },
          { key: "luce calda dalle finestre", note: "promessa di caldo e cibo in una notte fredda" },
          { key: "stalla al lato", note: "si sentono i cavalli, odore di fieno e letame" },
          { key: "clienti che fumano fuori", note: "appoggiate al muro, pipa in mano, occhi bassi" },
          { key: "pozza nel cortile", note: "la pioggia e il passaggio di carri l'hanno creata" },
          { key: "cane della locanda", note: "pigro sull'uscio, grugna ma non abbaia" },
          { key: "finestre opache", note: "il vapore interno appanna il vetro dall'interno" },
        ],
        dark: [
          { key: "insegna mezza caduta", note: "un cardine ceduto, cigoliante nel vento" },
          { key: "finestre con sbarre", note: "non per proteggere i clienti, per tenere qualcosa dentro" },
          { key: "odore di bruciato", note: "non di cucina, di paglia, di un incendio recente domato a stento" },
          { key: "clienti che guardano arrivare", note: "si fermano a valutare, non per curiosità" },
          { key: "nessuna stalla", note: "o è vuota, o i cavalli vengono portati altrove" },
          { key: "porta rinforzata", note: "sbarre di ferro nuove su legno vecchio" },
          { key: "nessuna luce fuori", note: "la locanda non vuole attirare attenzione" },
          { key: "un ubriaco nel fango", note: "non è chiaro se dorme o è peggio" },
        ],
      },
      sala: {
        label: "Sala Comune",
        classic: [
          { key: "fuoco nel camino", note: "crepita, manda ombre lunghe sui muri" },
          { key: "travi basse", note: "i più alti si chinano istintivamente" },
          { key: "odore di birra versata", note: "impregnato nel legno del pavimento da anni" },
          { key: "bardo nell'angolo", note: "qualcuno che suona, non tutti ascoltano" },
          { key: "tavoli incisi", note: "nomi, cuori, messaggi, date — anni di clienti" },
          { key: "trofei al muro", note: "una testa di cinghiale, qualche arma arrugginita" },
          { key: "oste che asciuga bicchieri", note: "osserva tutto senza sembrare osservare" },
          { key: "gruppo di giocatori", note: "dadi o carte, tensione bassa e concentrata" },
          { key: "bambino del locandiere", note: "porta piatti troppo grandi per lui, non perde un colpo" },
          { key: "cane sotto il tavolo", note: "aspetta qualcosa di cadere, non aspetta invano" },
        ],
        dark: [
          { key: "silenzio quando si entra", note: "le conversazioni si abbassano, le teste si girano" },
          { key: "tavoli distanziati", note: "nessuno vuole essere troppo vicino agli altri" },
          { key: "odore di sudore e alcol", note: "pesante, chiuso, le finestre non vengono mai aperte" },
          { key: "oste diffidente", note: "risponde a monosillabi, tiene le mani sotto il bancone" },
          { key: "clienti con cappucci", note: "dentro, al caldo, coperti — non vogliono essere visti" },
          { key: "macchie al soffitto", note: "non è pioggia, è venuta dall'interno" },
          { key: "porta sul retro sempre aperta", note: "qualcuno entra ed esce senza passare dalla sala" },
          { key: "fuoco quasi spento", note: "nessuno lo alimenta, fa abbastanza freddo" },
          { key: "rissa vecchia nei muri", note: "uno specchio incrinato, una sedia riparata male" },
          { key: "ragazzino di guardia", note: "seduto all'ingresso, sparisce nel retro se arriva qualcuno" },
        ],
      },
      camere: {
        label: "Camere",
        classic: [
          { key: "coperta di lana spessa", note: "pesante, calda, un po' ruvida" },
          { key: "finestra con vista sul cortile", note: "si sente la stalla, si vede il pozzo" },
          { key: "catino e brocca", note: "acqua fresca la sera, tiepida al mattino" },
          { key: "candela sul comodino", note: "un mozzicone quasi al termine, nessuno l'ha cambiata" },
          { key: "gancio dietro la porta", note: "per giacca e borsa, il legno è consumato" },
          { key: "pavimento che scricchiola", note: "si sente ogni passo del vicino di stanza" },
          { key: "tetto basso con travi", note: "profumo di legno vecchio, quasi rassicurante" },
          { key: "cuscino imbottito di paglia", note: "scomodo ma asciutto" },
        ],
        dark: [
          { key: "serratura che non chiude bene", note: "la chiave gira, ma il meccanismo è allentato" },
          { key: "odore di muffa nel materasso", note: "umidità accumulata, meglio dormire sopra la coperta" },
          { key: "macchia sul soffitto", note: "di forma vaga, la camera sopra ha avuto problemi" },
          { key: "finestra che non si apre", note: "o inchiodata o gonfiata dal legno, non si sa" },
          { key: "rumore dal muro", note: "topi, probabilmente topi" },
          { key: "graffi sulla porta interna", note: "dall'interno, a livello basso, come se qualcuno cercasse di uscire" },
          { key: "letto troppo stretto", note: "per una persona sola, a malapena" },
          { key: "specchio coperto", note: "con un panno, non si sa perché" },
        ],
      },
    },
  },
  negozi: {
    label: "🏪 Negozi",
    sub: {
      fabbro: {
        label: "Fabbro / Armaiolo",
        classic: [
          { key: "calore dell'incudine", note: "si sente a metri di distanza, l'aria vibra" },
          { key: "odore di metallo caldo", note: "acre, metallico, mescola con il fumo del carbone" },
          { key: "lame appese", note: "in fila ordinata, alcune lucide, alcune ancora grezze" },
          { key: "cane da guardia", note: "grosso, tranquillo, non abbaia ma non si sposta" },
          { key: "mani del fabbro", note: "come carta vetrata, le bruciature vecchie sono bianche" },
          { key: "campioni sulla parete", note: "un'ascia, uno scudo, esempi di lavoro passato" },
          { key: "polvere di limatura", note: "riflette la luce del fuoco, sembra oro nell'aria" },
          { key: "apprendista al mantice", note: "ritmico, instancabile, guarda tutto senza dire nulla" },
        ],
        dark: [
          { key: "armi non in vendita", note: "alcune sono riposte, il fabbro non le mostra spontaneamente" },
          { key: "odore di sangue mischiato", note: "con il ferro, qualcosa è stato affilato di recente dopo un uso" },
          { key: "marchi non riconoscibili", note: "su alcune lame, non corrispondono a nessuna gilda nota" },
          { key: "fabbro che fa domande", note: "vuole sapere per cosa serve, prima di vendere" },
          { key: "porta sul retro sbarrata", note: "pesante, due serrature, non porta alla stalla" },
          { key: "manette e catene in vendita", note: "con la stessa cura delle armi" },
          { key: "apprendista silenzioso", note: "non guarda negli occhi, risponde solo se interpellato direttamente" },
          { key: "prezzi non esposti", note: "il fabbro decide il prezzo dopo aver visto il cliente" },
        ],
      },
      erborista: {
        label: "Erborista / Alchimista",
        classic: [
          { key: "odore sovrapposto", note: "lavanda, zolfo, menta, qualcosa di dolce sotto tutto" },
          { key: "fasci di erbe secche", note: "appesi al soffitto, oscurano la luce" },
          { key: "boccette colorate in fila", note: "rosso, verde, ambra, etichettate con scrittura minuta" },
          { key: "gatto sul bancone", note: "impettito tra i flaconi, indifferente ai clienti" },
          { key: "bilancina precisa", note: "al centro del lavoro, i pesi ordinati per misura" },
          { key: "libro aperto con annotazioni", note: "margini pieni di correzioni, alcune cancellate con forza" },
          { key: "mortaio con residui", note: "qualcosa di verde, non ancora lavato" },
          { key: "campioni di funghi essiccati", note: "in teca di vetro, alcuni molto rari dall'aspetto" },
        ],
        dark: [
          { key: "erbe senza etichetta", note: "alcune boccette, il proprietario sa cosa contengono" },
          { key: "odore chimico sotto tutto", note: "qualcosa che non dovrebbe stare in un negozio comune" },
          { key: "ingredienti di origine animale", note: "ossa, occhi, qualcosa di non identificabile in soluzione" },
          { key: "tenda che divide il retrobottega", note: "il proprietario non vuole che si veda oltre" },
          { key: "libro chiuso con lucchetto", note: "sul ripiano alto, irraggiungibile per i clienti" },
          { key: "cicatrici chimiche sulle mani", note: "il proprietario indossa guanti, ma si intravedono" },
          { key: "cliente che esce frettolosamente", note: "cappuccio alzato, nulla in mano di visibile" },
          { key: "veleni registrati separatamente", note: "o così dice il proprietario" },
        ],
      },
      mercante: {
        label: "Mercante Generico",
        classic: [
          { key: "odore di spezie e legno", note: "casse aperte, stoffe piegate, oggetti da ogni dove" },
          { key: "bilancia sempre a portata", note: "il mercante pesa prima di tutto" },
          { key: "mappa delle rotte sul muro", note: "segnata a mano, alcune città marcate in rosso" },
          { key: "ragazzo di bottega", note: "riordina, porta, registra tutto su un taccuino" },
          { key: "merci da lontano", note: "seta, spezie, qualcosa di esotico in una cassa" },
          { key: "prezzi trattabili ma difficili", note: "il mercante sospira ma alla fine cede sempre un po'" },
          { key: "cassa forte sotto il bancone", note: "ben visibile, come ammonimento" },
          { key: "clienti che aspettano", note: "in fila informale, con l'aria di chi è abituato ad aspettare" },
        ],
        dark: [
          { key: "merci senza provenienza", note: "belle, economiche, nessuna spiegazione sulla fonte" },
          { key: "registri in codice", note: "il libro mastro è cifrato, parzialmente" },
          { key: "guardia del corpo discreta", note: "non è un commesso, lo capisce chiunque" },
          { key: "merce identica a qualcosa di rubato", note: "difficile dirlo con certezza" },
          { key: "porta sul retro sempre aperta", note: "qualcuno entra spesso, non compra nulla" },
          { key: "prezzi diversi per stranieri", note: "il mercante li riconosce subito" },
          { key: "nessuna ricevuta", note: "offre moneta senza documentazione" },
          { key: "informazioni in vendita", note: "più che la merce stessa" },
        ],
      },
    },
  },
  png: {
    label: "👤 PNG Umanoidi",
    sub: {
      umano: {
        label: "Umano",
        classic: [
          // ♂ maschile
          { key: "mascella quadrata", note: "volto dai tratti marcati, ombra di barba anche di mattina" },
          { key: "mani da lavoratore", note: "callose, con nocche consumate, più grandi di quanto ci si aspetti" },
          { key: "postura militare", note: "schiena dritta anche seduto, non lo abbandona mai" },
          { key: "cicatrice sul sopracciglio", note: "vecchia, quasi invisibile, ma la tocca quando è nervoso" },
          { key: "voce profonda calibrata", note: "parla piano, obbliga ad avvicinarsi per sentire" },
          { key: "gioiello unico maschile", note: "un anello di famiglia o un ciondolo militare, non si toglie mai" },
          // ♀ femminile
          { key: "capelli raccolti con cura", note: "nodo stretto o treccia, nessun ciuffo fuori posto" },
          { key: "mani curate nonostante il lavoro", note: "unghie corte, qualche cicatrice, ma si prende cura" },
          { key: "sguardo che valuta prima di parlare", note: "una pausa misurabile tra domanda e risposta" },
          { key: "veste pratica ma con un dettaglio curato", note: "un bordo ricamato, una spilla, qualcosa che sceglie ogni giorno" },
          { key: "riso diretto e breve", note: "ride davvero, non per cortesia, ma smette subito" },
          // neutro
          { key: "sguardo diretto", note: "guarda negli occhi, aspetta la stessa cosa in cambio" },
          { key: "odore di tabacco e sapone", note: "si prende cura di sé ma i vizi restano" },
          { key: "parlata regionale marcata", note: "alcune consonanti dure, vocali allungate in modo insolito" },
          { key: "abitudine nervosa", note: "tamburella le dita, si tocca l'anello, qualcosa di involontario" },
          { key: "memoria per i nomi", note: "ricorda come ti chiami anche dopo mesi, lo usa subito" },
          { key: "sorriso ritardato", note: "arriva dopo un attimo di valutazione, ma è genuino" },
        ],
        dark: [
          { key: "occhi che non sorridono mai", note: "la bocca lo fa, gli occhi no" },
          { key: "mani pulite su un lavoro sporco", note: "cura anomala per chi fa quello che fa" },
          { key: "cicatrici da coltello sul palmo", note: "da chi ha preso una lama a mano nuda" },
          { key: "pausa calcolata prima di rispondere", note: "anche per domande innocue" },
          { key: "non si siede mai di spalle alla porta", note: "educato, silenzioso, sistematico" },
          { key: "vestiti troppo buoni per il quartiere", note: "di qualità, tenuti bene, fuori posto" },
          { key: "risata senza calore", note: "risposta sociale, non emozione" },
          { key: "odore chimico sotto il sapone", note: "quasi nascosto, ma presente" },
          { key: "voce piatta", note: "nessuna inflessione emotiva, neanche quando il contenuto è carico" },
          { key: "denti rovinati tranne uno d'oro", note: "qualcuno ha pagato per quello" },
          { key: "cicatrice da ustione sul collo", note: "vecchia, non ne parla" },
          { key: "sguardo che registra tutto", note: "nota ogni uscita, ogni volto, senza sembrare che guardi" },
        ],
      },
      nano: {
        label: "Nano",
        classic: [
          // ♂
          { key: "barba intrecciata con perle", note: "ore di lavoro, riflette lo stato sociale" },
          { key: "petto largo quanto le spalle", note: "struttura massiccia che rende difficile valutarne l'età" },
          { key: "tatuaggio di clan sul collo", note: "non lo nasconde, è una presentazione" },
          { key: "voce che risuona nei corridoi", note: "non urla, parla e basta, il volume è quello" },
          // ♀
          { key: "barba curata e orgogliosa", note: "intrecciata finemente, accessoriata con cura" },
          { key: "mani da scalpellina", note: "dita corte e forti, sa valutare la qualità della pietra al tatto" },
          { key: "capelli raccolti in elmo o cuffia", note: "funzionalità prima di tutto, anche fuori dal lavoro" },
          { key: "portamento regale nonostante la statura", note: "cammina come se occupasse più spazio di quanto ne abbia" },
          // neutro
          { key: "passo pesante e deliberato", note: "ogni passo conta, nessuno è sprecato" },
          { key: "orgoglio visibile nel mestiere", note: "non arroganza, certezza nel proprio valore" },
          { key: "odore di pietra e metallo", note: "non importa quanto tempo stia fuori dalla montagna" },
          { key: "rispetto per il lavoro altrui", note: "esamina con occhio critico, ma apprezza la qualità" },
          { key: "birra mai rifiutata", note: "anche la peggiore, è un gesto da ricambiare" },
          { key: "lealtà visibile", note: "al suo compagno, alla sua parola, alla sua gilda" },
          { key: "memoria precisa per i torti", note: "ricorda ogni insulto, non lo dice ma non lo dimentica" },
        ],
        dark: [
          { key: "barba trascurata", note: "per un nano è segno di vergogna o lutto profondo" },
          { key: "senza simboli di clan", note: "rimossi o coperti — esule o rinnegato" },
          { key: "parla poco delle miniere", note: "cambia discorso se qualcuno ci arriva" },
          { key: "diffidenza sistematica", note: "non per carattere, per esperienza specifica" },
          { key: "risponde con domande", note: "mai risposte dirette se può evitarlo" },
          { key: "ascia sempre a portata", note: "non sul dorso — in mano o a lato, sempre raggiungibile" },
          { key: "cicatrici da collasso minerario", note: "schiacciato o bruciato, qualcosa è andato storto sottoterra" },
          { key: "maledice sottovoce in nanico", note: "quando pensa che nessuno lo senta" },
          { key: "occhi abituati al buio", note: "strizza gli occhi alla luce, non se ne scusa" },
          { key: "beve in silenzio", note: "senza condividere, senza guardare, senza smettere" },
        ],
      },
      elfo: {
        label: "Elfo",
        classic: [
          // ♂
          { key: "lineamenti androgini precisi", note: "difficile definirli senza usare la parola 'perfetto'" },
          { key: "capelli lunghi e liberi", note: "si muovono anche senza vento, come se seguissero pensieri propri" },
          { key: "mani lunghe e affusolate", note: "ogni gesto è calibrato, anche quello involontario" },
          // ♀
          { key: "altezza che sorprende", note: "più alta di quanto ci si aspetti, portamento ancora più marcato" },
          { key: "capelli intrecciati con foglie secche", note: "non decorazione — memento di un luogo specifico" },
          { key: "voce che scende di un tono quando è seria", note: "il cambiamento è piccolo ma inequivocabile" },
          // neutro
          { key: "movimenti precisi", note: "nessuno sprecato, quasi coreografici" },
          { key: "età impossibile da determinare", note: "il viso dice una cosa, gli occhi ne dicono un'altra" },
          { key: "interesse per i dettagli", note: "nota la lavorazione di un oggetto prima del suo scopo" },
          { key: "odore di legno e resina", note: "della foresta, anche a distanza di anni" },
          { key: "sguardo che fissa troppo a lungo", note: "per i ritmi umani — per i suoi è normale" },
          { key: "voce calibrata", note: "parla lentamente, ogni parola ha peso" },
          { key: "memoria prodigiosa", note: "ricorda conversazioni di decenni fa, alla lettera" },
          { key: "distacco gentile", note: "cordiale ma sempre a una distanza precisa" },
          { key: "arco sempre curato", note: "anche in città, anche a riposo, mai trascurato" },
          { key: "pausa prima di rispondere", note: "non esitazione — valutazione" },
        ],
        dark: [
          { key: "occhi vuoti", note: "l'immortalità ha consumato qualcosa di essenziale" },
          { key: "nessuna nostalgia", note: "parla del passato senza emozione, come un archivio" },
          { key: "cicatrici che non si spiegano", note: "gli elfi guariscono in fretta, quelle sono rimaste" },
          { key: "disprezzo sottile per i mortali", note: "controllato, mai esplicito, sempre presente" },
          { key: "non dorme mai visibilmente", note: "in trance, ma gli occhi restano aperti e lui è altrove" },
          { key: "porta qualcosa di spezzato", note: "un amuleto, un'arma rotta, non lo getta via" },
          { key: "ride raramente", note: "e quando lo fa sembra quasi pratica" },
          { key: "silenzio prima di ogni risposta importante", note: "troppo lungo, troppo vuoto" },
          { key: "non usa nomi propri", note: "dice 'tu' o 'questo umano' — un distacco preciso" },
          { key: "guarda le stelle anche di giorno", note: "distoglie lo sguardo dal livello degli occhi, spesso" },
        ],
      },
      gnomo: {
        label: "Gnomo",
        classic: [
          // ♂
          { key: "capelli a ciuffo laterale impossibile", note: "sembra intenzionale, probabilmente non lo è" },
          { key: "tasche cucite aggiuntive ovunque", note: "sulla giacca, sulle braghe, persino nel cappello" },
          { key: "occhiali da lavoro sempre in fronte", note: "raramente sugli occhi, sempre lì come emblema" },
          // ♀
          { key: "capelli colorati con qualcosa di chimico", note: "brillano in modo innaturale, odore lieve di zolfo" },
          { key: "grembiule con macchie di molti colori", note: "un archivio di progetti passati" },
          { key: "risata che precede il discorso", note: "ha già capito cosa vuole dire prima che tu finisca la domanda" },
          // neutro
          { key: "energia in eccesso", note: "si muove mentre parla, parla mentre si muove" },
          { key: "curiosità genuina", note: "fa domande senza filtro, non è scortesia" },
          { key: "progetto sempre in corso", note: "qualcosa da costruire, sistemare, migliorare" },
          { key: "memoria selettiva", note: "ricorda tutto dei meccanismi, dimentica i nomi" },
          { key: "ridacchia spesso da solo", note: "per cose che solo lui ha notato" },
          { key: "non sente il freddo", note: "o non lo ammette — in ogni caso non cambia vestiti" },
          { key: "contatta gli occhi brevemente", note: "poi lo sguardo va altrove, sull'oggetto, sul meccanismo" },
          { key: "spiega anche quando non viene chiesto", note: "dettagliatamente, con gioia, inarrestabile" },
        ],
        dark: [
          { key: "umorismo come scudo", note: "la battuta arriva prima di ogni emozione difficile" },
          { key: "ossessione specifica", note: "un problema solo, ci pensa sempre, non se ne distacca" },
          { key: "non parla della famiglia", note: "cambia discorso, ride, riparte da qualcos'altro" },
          { key: "congegni non finiti ovunque", note: "ha iniziato, non ha finito, non si sa perché" },
          { key: "magia che sfugge al controllo", note: "piccole cose, quasi accidentali, non sempre innocue" },
          { key: "paranoia tecnologica", note: "non usa oggetti che non ha costruito lui" },
          { key: "paura degli spazi aperti", note: "preferisce soffitte, sotterranei, luoghi chiusi" },
          { key: "invenzione che ha fatto male", note: "non lo dice, ma porta il peso di qualcosa che è andato storto" },
          { key: "tono che si abbassa all'improvviso", note: "dal chiacchiericcio al silenzio piatto, senza transizione" },
        ],
      },
      halfling: {
        label: "Halfling",
        classic: [
          // ♂
          { key: "piedi grandi e pelosi", note: "niente scarpe, il pavimento freddo non è un problema" },
          { key: "pipa sempre a portata", note: "accesa o spenta, è un'estensione della mano" },
          { key: "sorriso che arriva prima delle parole", note: "disarmante, genuino, impossibile da ignorare" },
          // ♀
          { key: "capelli ricci indomabili", note: "ornati con fiori secchi o nastri colorati" },
          { key: "gonna ampia con tasche profonde", note: "ci entra molto più di quanto sembri" },
          { key: "voce più forte del dovuto", note: "abituata a farsi sentire in mezzo a gente più alta" },
          // neutro
          { key: "statura che sorprende verso il basso", note: "non ci si fa l'abitudine, arriva sempre a livello della cintura" },
          { key: "agilità naturale", note: "si muove tra la folla senza toccare nessuno" },
          { key: "appetito rumoroso", note: "mangia con soddisfazione visibile, non se ne scusa" },
          { key: "curiosità per i dettagli domestici", note: "nota subito la qualità del pane, la freschezza della birra" },
          { key: "fortuna percepita come normale", note: "si aspetta che le cose vadano bene, spesso è così" },
          { key: "rete sociale estesa", note: "conosce qualcuno ovunque vada, o conosce qualcuno che conosce qualcuno" },
          { key: "memoria per il cibo", note: "descrive pasti di dieci anni fa con precisione estatica" },
          { key: "coraggio silenzioso", note: "non lo dimostra, non lo nega, è semplicemente lì" },
        ],
        dark: [
          { key: "sorriso che non si spegne mai", note: "anche quando sarebbe inappropriato, anche quando è paura" },
          { key: "troppo a proprio agio negli spazi stretti", note: "si muove nell'ombra con familiarità inquietante" },
          { key: "dita veloci", note: "non necessariamente per cattiveria, è istinto" },
          { key: "sa sempre dov'è l'uscita", note: "lo nota entrando, automaticamente, senza pensarci" },
          { key: "storia familiare che non torna", note: "i dettagli cambiano ad ogni racconto" },
          { key: "occhi che seguono le mani degli altri", note: "non le facce — le mani" },
          { key: "voce che si abbassa nei locali affollati", note: "si confonde nel rumore di fondo intenzionalmente" },
          { key: "non dorme con la porta aperta", note: "mai, neanche in un posto sicuro" },
        ],
      },
      tiefling: {
        label: "Tiefling",
        classic: [
          // ♂
          { key: "corna lucide curate", note: "lucidate ogni mattina, è questione di dignità" },
          { key: "coda che si muove con le emozioni", note: "la controlla, ma non sempre, non del tutto" },
          { key: "voce con risonanza bassa", note: "come se parlasse da una stanza grande in un corpo piccolo" },
          // ♀
          { key: "pelle dai riflessi violacei", note: "alla luce del fuoco diventa quasi iridescente" },
          { key: "corna arcuate all'indietro", note: "eleganti, come ornamento naturale" },
          { key: "capelli che non seguono la gravità del tutto", note: "si muovono come sott'acqua, lentamente" },
          // neutro
          { key: "occhi unicolore senza pupilla visibile", note: "oro, rosso, bianco — qualcosa che non lascia indifferenti" },
          { key: "pelle calda al tatto", note: "più di quanto dovrebbe, anche d'inverno" },
          { key: "odore di zolfo lieve", note: "quasi speziato, più nota di quanto vorrebbe" },
          { key: "abituato agli sguardi", note: "non ci fa caso, o finge molto bene di non farcelo" },
          { key: "lealtà come scelta consapevole", note: "non la dà per scontata, la dichiara esplicitamente" },
          { key: "nome scelto con cura", note: "non quello di nascita, uno scelto per sé — lo porta con orgoglio" },
          { key: "senso dell'umorismo tagliente", note: "ride per primo di sé, prima che qualcuno possa farlo" },
          { key: "gestualità contenuta", note: "sa di attirare l'attenzione, quindi si muove meno" },
        ],
        dark: [
          { key: "coda nervosa", note: "si agita quando mente, quando è in pericolo, quando è arrabbiato" },
          { key: "sorriso che rivela denti appuntiti", note: "lo sa, lo usa con intenzione" },
          { key: "storia di rifiuto leggibile", note: "non la racconta, ma si vede in come si aspetta di essere trattato" },
          { key: "diffidenza preventiva", note: "presuppone il peggio, viene smentito, riprende da capo" },
          { key: "occhi che brillano al buio", note: "una luce rossa o dorata, appena percettibile" },
          { key: "tocca le corna quando è teso", note: "gesto inconsapevole, frequente" },
          { key: "nome demoniaco che emerge sotto stress", note: "qualcuno lo conosce, lui preferisce che non sia così" },
          { key: "brucia leggermente al tocco sacro", note: "involontario, imbarazzante, non pericoloso" },
          { key: "non entra nelle chiese senza motivo", note: "non per paura, per stanchezza dell'attenzione che ne deriva" },
        ],
      },
      mezzorco: {
        label: "Mezzorco",
        classic: [
          // ♂
          { key: "zanne inferiori appena visibili", note: "non prominenti, ma presenti quando parla o sorride" },
          { key: "struttura imponente", note: "spalle larghe, collo corto, occupa più spazio fisico di chiunque altro" },
          { key: "cicatrici rituali sulle braccia", note: "volontarie, non di battaglia, parte di qualcosa di importante" },
          // ♀
          { key: "pelle verde-grigiastra con tono bronzeo", note: "alla luce diretta ha calore, all'ombra diventa fredda" },
          { key: "altezza che mette a disagio gli altri", note: "non lei — solo gli altri" },
          { key: "voce bassa e diretta", note: "non aggressiva, ma non lascia spazio a interpretazioni" },
          // neutro
          { key: "presa della mano che richiede calibrazione", note: "stringe forte per istinto, si sta allenando a non farlo" },
          { key: "tra due mondi e a proprio agio in nessuno", note: "lo sa, non ne fa una tragedia, per lo più" },
          { key: "onestà bruta", note: "dice quello che pensa, poi si chiede se era il momento giusto" },
          { key: "ride di pancia", note: "quando ride davvero, si sente" },
          { key: "rispetta la forza in tutte le forme", note: "fisica, mentale, morale — sa riconoscerle tutte" },
          { key: "senso pratico assoluto", note: "taglia dritto al problema, le cerimonie lo annoiano" },
          { key: "fedeltà lenta ma totale", note: "ci vuole tempo a guadagnarsela, dopo è incondizionata" },
        ],
        dark: [
          { key: "sguardo che valuta la minaccia per istinto", note: "entra in un posto e calcola chi potrebbe essere un problema" },
          { key: "passato nelle tribù che non racconta", note: "non per vergogna, per proteggere chi ascolta" },
          { key: "rabbia che sale in fretta", note: "sa gestirla, ma il momento in cui arriva è visibile" },
          { key: "preferisce il perimetro della stanza", note: "schiena al muro, visuale libera" },
          { key: "fiducia che si guadagna lentamente", note: "è stato tradito abbastanza da non darlo per scontato" },
          { key: "marchio di schiavitù coperto", note: "bracciale, guanto, manica — qualcosa lo nasconde sempre" },
          { key: "non chiede aiuto", note: "mai, per nessuna ragione, fino a quando è troppo tardi" },
          { key: "conosce il valore del silenzio", note: "non parla se non ha qualcosa da dire, il che è raro e preciso" },
        ],
      },
    },
  },
  architettura: {
    label: "🏛 Dettagli Architettonici",
    sub: {
      porte: {
        label: "Porte & Ingressi",
        classic: [
          { key: "soglia consumata", note: "il passaggio di anni si vede nel legno" },
          { key: "battente di ferro a forma animale", note: "leone, drago, serpente — il simbolo della casa" },
          { key: "arco in pietra squadrata", note: "chiave di volta con un volto scolpito" },
          { key: "porta a due ante asimmetriche", note: "una più alta, una più larga, aggiunta in un secondo momento" },
          { key: "stipiti incisi", note: "simboli apotropaici, nomi, preghiere in lingue diverse" },
          { key: "lucchetto grande su porta piccola", note: "la sicurezza non è proporzionale all'entrata" },
          { key: "tenda invece della porta", note: "pesante, colorata, un modo di dire che si è benvenuti" },
          { key: "porta con spioncino", note: "all'altezza degli occhi, il vetro è opaco" },
        ],
        dark: [
          { key: "porta sbarrata dall'esterno", note: "non per proteggere chi è dentro" },
          { key: "marchi bruciati sullo stipite", note: "non decorativi, avvertimento o marchio di proprietà" },
          { key: "chiodi nel legno", note: "decine, irregolari, qualcuno era molto arrabbiato" },
          { key: "porta nuova su muro vecchio", note: "non c'era prima, è stata aperta di recente" },
          { key: "sangue secco sulla soglia", note: "vecchio, quasi scomparso, ma presente" },
          { key: "portone troppo pesante", note: "per quello che dovrebbe contenere" },
          { key: "senza maniglia interna", note: "si può entrare, non uscire senza aiuto" },
          { key: "graffi alla base", note: "dal lato sbagliato" },
        ],
      },
      scale: {
        label: "Scale & Corridoi",
        classic: [
          { key: "corrimano levigato", note: "da generazioni di mani, il legno è quasi metallico" },
          { key: "scalino più basso dell'ultimo", note: "si inciampa sempre, tutti ci inciampano" },
          { key: "affresco sul soffitto del corridoio", note: "sbiadito ma ancora leggibile, una scena di battaglia o di pace" },
          { key: "nicchia con statua", note: "un santo, un antenato, un dio minore" },
          { key: "pavimento a scacchi", note: "bianco e nero, qualche tessera mancante, sostituita male" },
          { key: "corridoio più stretto verso la fine", note: "percettibilmente, crea disagio" },
          { key: "finestra strombata", note: "profonda, con seduta in pietra, luce obliqua" },
          { key: "tappeto consumato al centro", note: "bordato di filo d'oro, era prezioso" },
        ],
        dark: [
          { key: "scala senza ringhiera verso il basso", note: "in un posto dove serve, manca" },
          { key: "corridoio che non finisce dove dovrebbe", note: "la geometria non torna" },
          { key: "macchie sul soffitto", note: "a intervalli regolari, come se qualcuno fosse stato trascinato" },
          { key: "scalino cavo", note: "suona vuoto, non per caso" },
          { key: "specchio in fondo al corridoio", note: "riflette qualcosa di leggermente diverso dalla realtà" },
          { key: "porta murata", note: "i mattoni sono più nuovi del muro, segnano dove c'era qualcosa" },
          { key: "odore di umidità che cresce", note: "più si scende, più è forte, non è acqua normale" },
          { key: "impronte nel pavimento polveroso", note: "vanno in una direzione, non tornano" },
        ],
      },
      soffitti: {
        label: "Soffitti & Volte",
        classic: [
          { key: "volta a botte decorata", note: "costolature in rilievo, stelle o rose in chiave" },
          { key: "travi a vista", note: "di legno scuro, appese con ganci per cibarie, attrezzi, fiori secchi" },
          { key: "rosone di pietra", note: "al centro, dove si concentra l'occhio in una stanza alta" },
          { key: "ragnatele decorative in alto", note: "troppo in alto per rimuoverle, parte del paesaggio" },
          { key: "buca nel soffitto tappata male", note: "riparazione frettolosa, il legno non è dello stesso tipo" },
          { key: "fumaiolo al centro", note: "aperto, la pioggia entra quando non c'è fuoco" },
          { key: "anello di ferro", note: "dal soffitto, per appendere qualcosa, forse una culla, forse qualcos'altro" },
          { key: "stalattiti artificiali", note: "in una sala di rappresentanza, imitano la natura" },
        ],
        dark: [
          { key: "uncini senza spiegazione", note: "a intervalli regolari, troppo bassi per essere decorativi" },
          { key: "soffitto che scende", note: "verso un lato, troppo regolare per essere un cedimento" },
          { key: "fori nel soffitto", note: "piccoli, a griglia, per cosa non è chiaro" },
          { key: "corde che scendono", note: "verso l'alto nel buio, non si vede dove portano" },
          { key: "macchie scure concentrate", note: "sopra un punto preciso del pavimento" },
          { key: "iscrizioni sul soffitto", note: "leggibili solo sdraiati, qualcuno le ha messe lì apposta" },
          { key: "pannello mobile", note: "si intravede il bordo, non si capisce come aprirlo" },
          { key: "caldo anomalo in alto", note: "il fuoco non spiega la temperatura" },
        ],
      },
    },
  },

  meteo: {
    label: "🌦 Meteo & Atmosfera",
    sub: {
      nebbia: {
        label: "Nebbia & Foschia",
        classic: [
          { key: "nebbia mattutina bassa", note: "copre le caviglie, i piedi spariscono camminando" },
          { key: "silenzio attutito", note: "i suoni perdono bordi, tutto arriva smorzato" },
          { key: "rugiada sulle superfici", note: "ogni pianta, ogni sasso, ogni trave è bagnato di fresco" },
          { key: "alito visibile", note: "ogni respiro disegna una nuvola bianca" },
          { key: "profumo di terra bagnata", note: "intenso, quasi organico, penetrante" },
          { key: "sagome che si dissolvono", note: "qualcuno a dieci passi diventa un'ombra a venti" },
          { key: "luce diffusa senza ombre", note: "tutto è ugualmente illuminato, i volumi spariscono" },
          { key: "gocce sui capelli", note: "senza pioggia, l'umidità si condensa su tutto" },
          { key: "strade vuote più del solito", note: "la gente rimanda, preferisce aspettare che passi" },
          { key: "lanterne come punti gialli", note: "visibili prima delle fonti che le producono" },
          { key: "suono di passi prima della persona", note: "arriva dall'ovunque, poi la figura emerge" },
          { key: "animali fermi", note: "gli uccelli non volano, i cani non escono — qualcosa li trattiene" },
        ],
        dark: [
          { key: "nebbia che non si muove col vento", note: "rimane ferma, non obbedisce alla brezza" },
          { key: "odore di palude", note: "sotto la foschia, qualcosa di putrescente" },
          { key: "figure che si muovono nella nebbia", note: "potrebbero essere animali, potrebbero no" },
          { key: "nebbia più densa verso il basso", note: "come se nascondesse il terreno intenzionalmente" },
          { key: "freddo che non si spiega", note: "fa più freddo della nebbia giustificherebbe" },
          { key: "voce lontana nell'ovatta", note: "non si capisce cosa dice, non si capisce da dove viene" },
          { key: "nebbia che non entra nelle case", note: "si ferma alle soglie, come rispettasse i confini" },
          { key: "lanterna che si spegne nella nebbia", note: "non c'è vento, la fiamma muore e basta" },
          { key: "sensazione di essere seguiti", note: "i passi dietro smettono quando ci si ferma" },
          { key: "nebbia colorata di grigio verdastro", note: "non è naturale, l'occhio lo sa" },
        ],
      },
      tempesta: {
        label: "Tempesta & Pioggia",
        classic: [
          { key: "tuono lontano che cresce", note: "arriva in tre ondate, ogni volta più vicino" },
          { key: "vento che gira la direzione", note: "le bandiere non sanno dove puntare" },
          { key: "odore di ozono", note: "secco, elettrico, precede il fulmine" },
          { key: "cielo verde prima del temporale", note: "luce innaturale che fa sembrare tutto malato" },
          { key: "pioggia che viene di lato", note: "il cappuccio non serve, tutto si bagna uguale" },
          { key: "grandine improvvisa", note: "dura trenta secondi, lascia tutto bianco e ammaccato" },
          { key: "pozzanghere che crescono visibilmente", note: "il terreno non assorbe più, corre verso il basso" },
          { key: "strade di terra che diventano fango", note: "ogni passo affonda, ogni passo costa energia" },
          { key: "fulmine che illumina tutto per un istante", note: "ogni dettaglio visibile, poi buio totale" },
          { key: "animali che cercano riparo", note: "i cavalli tirano, i cani si rannicchiano" },
          { key: "tetto che cigola sotto il vento", note: "le travi lavorano, qualcosa è allentato" },
          { key: "pioggia sul fuoco del campo", note: "il fuoco resiste, poi non resiste più" },
        ],
        dark: [
          { key: "tempesta che non si sposta", note: "stazionaria sopra un punto preciso da ore" },
          { key: "fulmini senza tuono", note: "lampi silenziosi, la distanza non giustifica il silenzio" },
          { key: "pioggia calda", note: "a temperatura sbagliata, come se venisse dal basso" },
          { key: "odore di bruciato nella pioggia", note: "il fulmine ha colpito vicino, ma non si vede dove" },
          { key: "tempesta che segue il gruppo", note: "si sposta con loro, cambiando direzione di vento" },
          { key: "acqua scura", note: "la pioggia lascia tracce grigio-nere sulle superfici chiare" },
          { key: "tuono che suona come una voce", note: "quasi articolato, quasi riconoscibile" },
          { key: "animali completamente assenti", note: "nessun uccello, nessun roditore, nessun insetto" },
        ],
      },
      caldo: {
        label: "Caldo & Siccità",
        classic: [
          { key: "aria che trema sull'orizzonte", note: "l'effetto calore distorce le distanze" },
          { key: "polvere su tutto", note: "si posa sulle spalle, sui capelli, si mangia e si beve" },
          { key: "silenzio di mezzogiorno", note: "nessuno si muove nelle ore centrali se può evitarlo" },
          { key: "ombra come risorsa preziosa", note: "la gente si sposta seguendo le zone d'ombra" },
          { key: "odore di erba secca e polvere calda", note: "quasi dolciastro, penetrante" },
          { key: "insetti ovunque", note: "ronzio costante di fondo, inevitabile" },
          { key: "acqua che vale oro", note: "il pozzo è il centro della vita sociale in questi giorni" },
          { key: "animali torpidi", note: "i cavalli sudano stando fermi, i cani giacciono a bocca aperta" },
          { key: "pelli sudate e appiccicose", note: "il tessuto si attacca, si tende a parlare meno" },
          { key: "notte che non rinfresca", note: "il calore delle pietre dura fino all'alba" },
        ],
        dark: [
          { key: "siccità da mesi", note: "i campi sono spacche, i ruscelli sono fango" },
          { key: "caldo innaturale fuori stagione", note: "è il momento sbagliato dell'anno per questo" },
          { key: "odore di putrefazione accelerata", note: "il caldo porta a maturazione tutto, anche quello che non dovrebbe" },
          { key: "terra che si spacca in pattern geometrici", note: "troppo regolari per essere naturali" },
          { key: "animali morti lungo la strada", note: "senza segni di predatori, solo calore e sete" },
          { key: "caldo che emerge dal suolo", note: "le pietre sono più calde sopra che sotto" },
          { key: "vento caldo che porta sabbia fine", note: "entra in ogni crepa, nei denti, negli occhi" },
        ],
      },
      freddo: {
        label: "Freddo & Neve",
        classic: [
          { key: "respiro come vapore", note: "ogni espirazione è visibile, lunga, voluttuosa" },
          { key: "neve fresca sul terreno", note: "silenzia i passi, cambia la geometria di tutto" },
          { key: "ghiaccio sulle superfici d'acqua", note: "sottile ai bordi, spesso al centro, riflette il cielo" },
          { key: "dita che diventano gonfie", note: "i guanti non bastano dopo un'ora" },
          { key: "odore di fumo di legna da lontano", note: "promessa di caldo, guida verso i luoghi abitati" },
          { key: "silenzio della neve", note: "il mondo diventa attutito, quasi privo di echi" },
          { key: "brina sui rami", note: "ogni ramoscello cristallizzato, fragile, bellissimo" },
          { key: "stella del mattino sopra la neve", note: "la luce si moltiplica, tutto sembra più luminoso del solito" },
          { key: "impronte nella neve fresca", note: "raccontano chi è passato e quando, senza margini" },
          { key: "cielo bianco piatto", note: "nessuna nuvola definita, solo luce diffusa da ovunque" },
        ],
        dark: [
          { key: "freddo che penetra l'armatura", note: "il metallo diventa nemico, brucia al tatto" },
          { key: "neve che cade senza vento", note: "dritta, silenziosa, ostinata" },
          { key: "bufera che cancella la strada", note: "le impronte spariscono in secondi" },
          { key: "freddo innaturale in un posto preciso", note: "un singolo punto che congela l'aria intorno" },
          { key: "neve che non si scioglie al sole", note: "rimane anche nelle ore più calde, sempre uguale" },
          { key: "alberi spezzati dal ghiaccio", note: "rami enormi a terra, schioccati come legno verde" },
          { key: "silenzio assoluto nella bufera", note: "il rumore del vento copre tutto, poi cessa all'improvviso" },
          { key: "animali congelati in posa", note: "non morti di freddo — congelati nel mezzo di un movimento" },
        ],
      },
    },
  },
  suoni: {
    label: "👂 Suoni & Odori",
    sub: {
      natura: {
        label: "Natura & Ambiente",
        classic: [
          { key: "grilli a ondate", note: "crescono e calano ritmicamente, quasi orchestrati" },
          { key: "foglie nel vento", note: "sussurro leggero che cambia tono col tipo di albero" },
          { key: "ruscello nascosto", note: "costante, ovunque, fonte di calma involontaria" },
          { key: "verso di gufo", note: "tre sillabe, pause precise, lontano" },
          { key: "odore di terra bagnata", note: "petrichor — arriva prima della pioggia, dopo è più forte" },
          { key: "profumo di resina", note: "pini o abeti nelle vicinanze, quasi medicinale" },
          { key: "odore di fiori selvatici", note: "dolce, non identificabile con precisione, pervasivo" },
          { key: "ronzio di api", note: "costante, rassicurante, indica un campo fiorito vicino" },
          { key: "odore di mare lontano", note: "sale e iodio, indica la direzione senza mostrarla" },
          { key: "canto di fringuello mattutino", note: "quattro note, pausa, quattro note — ritmo immutabile" },
          { key: "gracidio di rane", note: "acqua ferma vicina, paludi, stagni" },
          { key: "odore di fungo umido", note: "sottobosco, legno morto, decomposizione lenta" },
          { key: "vento tra le erbe alte", note: "come onde, un rumore oceanico su terra asciutta" },
          { key: "odore di fieno secco", note: "campi d'estate, fienili, cavalli ben tenuti" },
        ],
        dark: [
          { key: "silenzio improvviso degli animali", note: "i grilli smettono insieme, senza transizione" },
          { key: "odore di zolfo", note: "lieve, costante, senza fonte visibile" },
          { key: "verso animale non identificabile", note: "troppo grave per essere un uccello, troppo acuto per essere qualcos'altro" },
          { key: "odore dolciastro di decomposizione", note: "qualcosa di grande è morto vicino, non si vede" },
          { key: "foglie che si muovono senza vento", note: "in una zona precisa, le altre stanno ferme" },
          { key: "odore di bruciato freddo", note: "cenere vecchia, non recente, viene dalla terra stessa" },
          { key: "suono di grattare sottoterra", note: "intermittente, ritmico, troppo regolare per essere un animale" },
          { key: "odore metallico nell'aria", note: "come prima di un fulmine, ma senza nuvole" },
          { key: "eco che risponde troppo tardi", note: "il suono torna dopo una pausa innaturale" },
          { key: "verso di corvo ripetuto esattamente", note: "stesso tono, stessa pausa — non sta cantando, sta segnalando" },
        ],
      },
      urbano: {
        label: "Città & Insediamenti",
        classic: [
          { key: "odore di pane del mattino", note: "il fornaio ha iniziato ore fa, il profumo arriva fino alla strada" },
          { key: "campanile che batte le ore", note: "si conta automaticamente, si torna a quello che si stava facendo" },
          { key: "voci sovrapposte al mercato", note: "non si sente nulla di preciso, si sente tutto" },
          { key: "odore di letame di cavallo", note: "strade trafficate, inevitabile, ci si fa l'abitudine" },
          { key: "martello del fabbro in lontananza", note: "ritmico, metallico, orienta nella città" },
          { key: "odore di fritto", note: "grasso caldo, cibo di strada, stomaco che risponde" },
          { key: "risate da una finestra aperta", note: "alta, breve, familiare" },
          { key: "odore di conciatura", note: "quartiere dei pellettieri — penetrante, riconoscibile da lontano" },
          { key: "ruote sul selciato", note: "cigolio e battito sulle pietre irregolari" },
          { key: "odore di birra versata", note: "nei pressi di una locanda, impregnato nel legno" },
          { key: "strillone mattutino", note: "voce acuta, parole incomprensibili dalla distanza" },
          { key: "odore di cera di candela", note: "chiesa o scriptorium nelle vicinanze" },
          { key: "acqua del canale", note: "odore di acqua ferma con sottofondo di marciume" },
          { key: "bambini che gridano mentre giocano", note: "distante, allegro, non si distinguono le parole" },
        ],
        dark: [
          { key: "silenzio di quartiere sbagliato", note: "nessuna voce alle finestre, nessun bambino" },
          { key: "odore di sangue nell'aria", note: "macello vicino, o qualcos'altro vicino" },
          { key: "passi che si fermano quando ci si ferma", note: "potrebbe essere un'eco, probabilmente no" },
          { key: "odore di oppio o tabacco strano", note: "dolciastro, pesante, da una finestra semichiusa" },
          { key: "conversazione che si spezza", note: "si sentivano voci, poi nulla — troppo preciso per essere caso" },
          { key: "odore di veleno", note: "amaro, quasi floreale, inspiegabile in quel posto" },
          { key: "campana che suona fuori ora", note: "non è il turno, non è l'orario — qualcuno la sta tirando" },
          { key: "strisciare su pietra", note: "nel vicolo buio, troppo pesante per essere un ratto" },
          { key: "odore di incendio recente", note: "cenere bagnata, legno carbonizzato, poca distanza" },
          { key: "voce che chiede aiuto", note: "bassa, quasi un sussurro, una sola volta, non si ripete" },
        ],
      },
      interni: {
        label: "Interni & Ambienti Chiusi",
        classic: [
          { key: "crepitio del fuoco", note: "irregolare, caldo, rassicurante nel buio" },
          { key: "odore di cibo che cuoce", note: "stufato, spezie, pane — qualcuno si prende cura di qualcosa" },
          { key: "scricchiolio del pavimento di legno", note: "sotto ogni passo, peggio vicino alle pareti" },
          { key: "odore di cera e libri vecchi", note: "biblioteca o studio, polvere e custodia" },
          { key: "tintinnio di vetro", note: "laboratorio o taverna, qualcosa che si muove" },
          { key: "odore di lanterna a olio", note: "fumo sottile, grasso caldo, riconoscibile" },
          { key: "eco in stanza grande", note: "le voci si sdoppiano leggermente, si parla più piano" },
          { key: "odore di pietra umida", note: "cantina o sotterraneo, minerale e freddo" },
          { key: "ticchettio di orologio", note: "regolare, insistente, si nota solo quando si smette" },
          { key: "odore di lavanda secca", note: "cassetti, armadi, qualcuno ha curato questo posto" },
          { key: "cigolìo di porta o finestra", note: "il legno lavora, l'aria cambia" },
          { key: "odore di tabacco impregnato nei muri", note: "anni di fumo, indelebile" },
          { key: "goccia nell'oscurità", note: "regolare, da qualche parte in alto, ipnotica" },
          { key: "odore di sangue secco", note: "metallico, stantio, vecchio di ore o giorni" },
        ],
        dark: [
          { key: "silenzio assoluto dove non dovrebbe esserci", note: "nessun insetto, nessun topo, nessun respiro" },
          { key: "odore di zolfo in spazio chiuso", note: "pesante, non si disperde, più forte verso il centro" },
          { key: "suono di qualcosa che respira", note: "ritmico, pesante, da dietro una parete" },
          { key: "odore dolciastro di decadenza", note: "qualcosa di organico in decomposizione, vicino" },
          { key: "cigolìo senza causa", note: "il pavimento lavora senza che nessuno cammini" },
          { key: "odore di magia bruciata", note: "come ozono con nota di metallo, residuo di un incantesimo" },
          { key: "sussurri tra i muri", note: "non si capiscono le parole, si capisce solo che ci sono" },
          { key: "temperatura che cala a passi", note: "ogni stanza più fredda, ogni porta aperta peggiora" },
        ],
      },
    },
  },
  oggetti: {
    label: "🎒 Oggetti & Dettagli",
    sub: {
      trovati: {
        label: "Oggetti Trovati",
        classic: [
          { key: "moneta straniera consumata", note: "di un paese o regno non identificabile, vecchia di generazioni" },
          { key: "lettera a metà", note: "interrotta nel mezzo di una frase, nessuna firma" },
          { key: "chiave senza serratura", note: "bella, lavorata, portata con cura evidente" },
          { key: "dado fortunato", note: "un lato consunto più degli altri, troppo usato per caso" },
          { key: "miniatura su avorio", note: "ritratto di qualcuno, non si sa chi, tecnica raffinata" },
          { key: "fiala sigillata con cera nera", note: "vuota o quasi, non si sa cosa contenesse" },
          { key: "guanto singolo di buona fattura", note: "il paio non c'è, questo è stato tenuto" },
          { key: "ciondolo spezzato", note: "l'anello di attacco è rotto, qualcuno lo portava e lo ha perso" },
          { key: "agenda con pagine strappate", note: "alcune rimosse con cura, il resto è codificato" },
          { key: "pettine di osso intagliato", note: "personale, usato, ancora con qualche capello" },
          { key: "frammento di mappa", note: "senza legenda né punti cardinali, un quarto di qualcosa" },
          { key: "dente intagliato come sigillo", note: "di animale grande, con un simbolo non noto" },
          { key: "boccetta di profumo vuota", note: "odore quasi svanito, dolce e speziato" },
          { key: "statuetta rozza di divinità", note: "fatta a mano, molto usata, consumata dalle preghiere" },
        ],
        dark: [
          { key: "dente umano dentro un sacchetto", note: "non un ricordo — un avvertimento o un trofeo" },
          { key: "specchio che non riflette bene", note: "la superficie è integra, ma qualcosa nell'immagine è sbagliato" },
          { key: "lista di nomi cancellati uno a uno", note: "ne rimane uno solo, non cancellato" },
          { key: "bambola con capelli veri", note: "dello stesso colore di qualcuno nel gruppo" },
          { key: "coltello con tacche sul manico", note: "quindici tacche, precise, intenzionali" },
          { key: "diario che non inizia dall'inizio", note: "le prime pagine sono state rimosse o bruciate" },
          { key: "mano di gloria avvolta in tela", note: "secca, orribile, ancora con le unghie" },
          { key: "occhio di vetro", note: "troppo realistico, troppo ben fatto" },
          { key: "bracciale di costrizione rotto", note: "forzato dall'interno, le incisioni di contenimento sono sfregiate" },
          { key: "lettera d'amore che finisce in minaccia", note: "la calligrafia cambia a metà pagina" },
        ],
      },
      arredo: {
        label: "Arredo & Suppellettili",
        classic: [
          { key: "tavolo con usura al centro", note: "generazioni di gomiti e piatti hanno levigato il legno" },
          { key: "tappeto consumato in un percorso", note: "rivela il cammino abituale di chi ci vive" },
          { key: "scaffale con libri non in ordine", note: "qualcuno li usa davvero, non sono decorazione" },
          { key: "candele di diverse altezze", note: "nessuna nuova, ognuna in un diverso stadio di vita" },
          { key: "cassetto che non chiude del tutto", note: "il legno si è gonfiato, qualcosa spinge dall'interno" },
          { key: "quadro storto che nessuno raddrizza", note: "ci si fa l'abitudine, poi si smette di vederlo" },
          { key: "vaso con fiori secchi", note: "erano stati belli, nessuno li ha buttati" },
          { key: "specchio con macchie di umidità", note: "ai bordi, il riflesso è distorto nelle zone periferiche" },
          { key: "orologio fermo", note: "segna un'ora precisa, non si sa da quando" },
          { key: "sedia con cuscino consumato su un lato", note: "qualcuno si siede sempre dalla stessa parte" },
          { key: "tazza dimenticata", note: "ancora con resti di qualcosa dentro, non recente" },
          { key: "mappa alle pareti con segni a mano", note: "rotte, cerchi, croci — la storia di qualcuno" },
          { key: "finestra sempre socchiusa", note: "un oggetto la tiene aperta, il gancio è rotto" },
        ],
        dark: [
          { key: "macchia sul muro coperta con un quadro", note: "il quadro è posizionato in modo strano per coprire qualcosa" },
          { key: "catene nascoste sotto il letto", note: "fissate al telaio, non decorative" },
          { key: "specchio coperto con un telo", note: "in ogni stanza, non si capisce il motivo" },
          { key: "tavolo con simboli incisi sotto", note: "visibili solo abbassandosi, non decorativi" },
          { key: "porta con sei serrature", note: "dall'interno, alcune nuovissime, alcune antiche" },
          { key: "cassetto con doppio fondo mal costruito", note: "si vede che c'è, non si capisce come aprirlo" },
          { key: "cibo lasciato come offerta", note: "fresco, davanti a qualcosa di non identificabile" },
          { key: "finestre sbarrate dall'interno con chiodi", note: "recenti, frettolosi, qualcuno aveva paura" },
          { key: "letto usato sul lato sbagliato", note: "le lenzuola sono consumate dove non dovrebbero essere" },
          { key: "buco nel muro tappato con stracci", note: "a livello degli occhi, guardava dentro, non fuori" },
        ],
      },
      indossati: {
        label: "Abbigliamento & Accessori",
        classic: [
          { key: "mantello rammendato in più punti", note: "con filo di colore leggermente diverso — storia visibile" },
          { key: "stivali consumati ai talloni", note: "mesi di strada, ben tenuti nonostante tutto" },
          { key: "fibbia incisa con iniziali", note: "regalo o ricordo, portata con cura" },
          { key: "guanti con le dita tagliate", note: "funzionalità sopra l'eleganza, scelta deliberata" },
          { key: "sciarpa dalle mille lavaggi", note: "il colore originale è quasi scomparso, ma è morbida" },
          { key: "cintura con troppi fori", note: "il peso è cambiato nel tempo, i fori lo raccontano" },
          { key: "cappello deformato dal portarlo", note: "prende la forma di chi lo usa, non del produttore" },
          { key: "anello che non si toglie", note: "l'impronta sulla pelle è permanente" },
          { key: "spilla con un significato non ovvio", note: "simbolo di gilda, ordine, o credenza personale" },
          { key: "borsa con una tasca segreta mal nascosta", note: "il doppio strato di cuoio si vede appena" },
          { key: "medaglione che nasconde qualcosa", note: "si apre, dentro c'è un ritratto o un ciuffo di capelli" },
          { key: "abito di qualità indossato male", note: "troppo formale per chi lo porta, regalo o bottino" },
        ],
        dark: [
          { key: "macchie scure su tessuto scuro", note: "il tentativo di nasconderle le rende più visibili" },
          { key: "guanto su una sola mano", note: "nasconde qualcosa, non il freddo" },
          { key: "mantello troppo lungo per la statura", note: "nasconde, non veste" },
          { key: "gancio al posto della mano", note: "funzionale, ben usato, non se ne parla" },
          { key: "cicatrice da corda ai polsi", note: "vecchia, guarita male, perennemente coperta" },
          { key: "abito di qualcuno più grande", note: "troppo largo, troppo lungo — non è il suo" },
          { key: "medaglione di un ordine sciolto", note: "portarlo è illegale in alcune giurisdizioni" },
          { key: "marchio di proprietà sul collo", note: "coperto dal colletto, visibile solo in certi movimenti" },
        ],
      },
    },
  },
};

// ─── Descriptions Page ───────────────────────────────────────────────────────

const SHOP_DB = {
  categorie: [
    { key: "armi_mischia_semplici",  label: "Armi da Mischia Semplici" },
    { key: "armi_distanza_semplici", label: "Armi a Distanza Semplici" },
    { key: "armi_mischia_marziali",  label: "Armi da Mischia Marziali" },
    { key: "armi_distanza_marziali", label: "Armi a Distanza Marziali" },
    { key: "armature_leggere",       label: "Armature Leggere" },
    { key: "armature_medie",         label: "Armature Medie" },
    { key: "armature_pesanti",       label: "Armature Pesanti" },
    { key: "scudi",                  label: "Scudi" },
    { key: "pozioni",                label: "Pozioni & Elisir" },
    { key: "strumenti",              label: "Strumenti & Kit" },
    { key: "avventura",              label: "Equipaggiamento da Avventura" },
    { key: "illuminazione",          label: "Illuminazione" },
    { key: "contenitori",            label: "Contenitori & Trasporto" },
    { key: "cibo_bevande",           label: "Cibo & Bevande" },
    { key: "animali",                label: "Animali & Trasporti" },
    { key: "veicoli",                label: "Veicoli" },
    { key: "servizi",                label: "Servizi" },
  ],
  items: [
    // ── ARMI DA MISCHIA SEMPLICI ─────────────────────────────────────────
    { id:"am01", cat:"armi_mischia_semplici", nome:"Bastone", en:"Quarterstaff",
      costo_mo:0, costo_ma:2, peso_kg:2,
      danno:"1d6 contundente (1d8 a due mani)", proprieta:["Versatile"],
      note:"Arma semplice da mischia versatile, può essere usata a una o due mani." },
    { id:"am02", cat:"armi_mischia_semplici", nome:"Clava", en:"Club",
      costo_mo:0, costo_ma:1, peso_kg:1,
      danno:"1d4 contundente", proprieta:["Leggera"],
      note:"Arma semplice economica, usata dai più inesperti." },
    { id:"am03", cat:"armi_mischia_semplici", nome:"Daga", en:"Dagger",
      costo_mo:2, costo_ma:0, peso_kg:0.5,
      danno:"1d4 perforante", proprieta:["Accurata","Leggera","Lanciabile (raggio 6/18 m)"],
      note:"Piccola lama affilata, facile da nascondere. Può essere lanciata." },
    { id:"am04", cat:"armi_mischia_semplici", nome:"Falcetto", en:"Sickle",
      costo_mo:1, costo_ma:0, peso_kg:1,
      danno:"1d4 tagliente", proprieta:["Leggera"],
      note:"Lama ricurva agricola, usata come arma d'emergenza." },
    { id:"am05", cat:"armi_mischia_semplici", nome:"Giavellotto", en:"Javelin",
      costo_mo:0, costo_ma:5, peso_kg:1,
      danno:"1d6 perforante", proprieta:["Lanciabile (raggio 9/36 m)"],
      note:"Asta da lancio leggera, efficace a breve distanza." },
    { id:"am06", cat:"armi_mischia_semplici", nome:"Lancia", en:"Spear",
      costo_mo:1, costo_ma:0, peso_kg:1.5,
      danno:"1d6 perforante (1d8 a due mani)", proprieta:["Lanciabile (raggio 6/18 m)","Versatile"],
      note:"Asta da combattimento con punta in metallo, versatile e bilanciata." },
    { id:"am07", cat:"armi_mischia_semplici", nome:"Mazza", en:"Mace",
      costo_mo:5, costo_ma:0, peso_kg:2,
      danno:"1d6 contundente", proprieta:[],
      note:"Arma da impatto con testa in metallo, semplice ma efficace." },
    { id:"am08", cat:"armi_mischia_semplici", nome:"Mazzafrusto", en:"Flail",
      costo_mo:10, costo_ma:0, peso_kg:1,
      danno:"1d8 contundente", proprieta:[],
      note:"Catena con sfera metallica, difficile da parare con gli scudi." },
    { id:"am09", cat:"armi_mischia_semplici", nome:"Martello leggero", en:"Light Hammer",
      costo_mo:2, costo_ma:0, peso_kg:1,
      danno:"1d4 contundente", proprieta:["Leggera","Lanciabile (raggio 6/18 m)"],
      note:"Martello leggero da lancio, equilibrato per combattimento ravvicinato." },
    { id:"am10", cat:"armi_mischia_semplici", nome:"Randello", en:"Greatclub",
      costo_mo:0, costo_ma:2, peso_kg:5,
      danno:"1d8 contundente", proprieta:["A due mani"],
      note:"Pesante tronco nodoso, rozzo ma devastante." },
    // ── ARMI A DISTANZA SEMPLICI ─────────────────────────────────────────
    { id:"ad01", cat:"armi_distanza_semplici", nome:"Arco corto", en:"Shortbow",
      costo_mo:25, costo_ma:0, peso_kg:1,
      danno:"1d6 perforante", proprieta:["Munizioni (raggio 24/96 m)","A due mani"],
      note:"Arco compatto, ideale per esploratori e arcieri a cavallo." },
    { id:"ad02", cat:"armi_distanza_semplici", nome:"Balestra leggera", en:"Light Crossbow",
      costo_mo:25, costo_ma:0, peso_kg:2.5,
      danno:"1d8 perforante", proprieta:["Munizioni (raggio 24/96 m)","A due mani","Ricarica"],
      note:"Balestra compatta, potente ma lenta da ricaricare." },
    { id:"ad03", cat:"arni_distanza_semplici", nome:"Fionda", en:"Sling",
      costo_mo:0, costo_ma:1, peso_kg:0,
      danno:"1d4 contundente", proprieta:["Munizioni (raggio 9/36 m)"],
      note:"Frombola in cuoio, usa sfere di pietra o metallo come proiettili." },
    { id:"ad04", cat:"armi_distanza_semplici", nome:"Dardo", en:"Dart",
      costo_mo:0, costo_ma:5, peso_kg:0.125,
      danno:"1d4 perforante", proprieta:["Accurata","Lanciabile (raggio 6/18 m)"],
      note:"Piccolo proiettile aguzzo, spesso avvelenato dai ladri." },
    // ── ARMI DA MISCHIA MARZIALI ─────────────────────────────────────────
    { id:"mm01", cat:"armi_mischia_marziali", nome:"Ascia da battaglia", en:"Battleaxe",
      costo_mo:10, costo_ma:0, peso_kg:2,
      danno:"1d8 tagliente (1d10 a due mani)", proprieta:["Versatile"],
      note:"Ascia da combattimento con lama larga, equilibrata e letale." },
    { id:"mm02", cat:"armi_mischia_marziali", nome:"Ascia da guerra", en:"Greataxe",
      costo_mo:30, costo_ma:0, peso_kg:3.5,
      danno:"1d12 tagliente", proprieta:["Pesante","A due mani"],
      note:"Ascia enorme a due mani, massima potenza distruttiva." },
    { id:"mm03", cat:"armi_mischia_marziali", nome:"Flagello", en:"Whip",
      costo_mo:2, costo_ma:0, peso_kg:1.5,
      danno:"1d4 tagliente", proprieta:["Accurata","Portata"],
      note:"Frusta da combattimento, permette attacchi a 3 m di distanza." },
    { id:"mm04", cat:"armi_mischia_marziali", nome:"Lancia da torneo", en:"Lance",
      costo_mo:10, costo_ma:0, peso_kg:3,
      danno:"1d12 perforante", proprieta:["Portata","Speciale"],
      note:"Lunga lancia da cavaliere, svantaggio in mischia ravvicinata." },
    { id:"mm05", cat:"armi_mischia_marziali", nome:"Martello da guerra", en:"Warhammer",
      costo_mo:15, costo_ma:0, peso_kg:2,
      danno:"1d8 contundente (1d10 a due mani)", proprieta:["Versatile"],
      note:"Martello pesante da battaglia, spezza armature e ossa." },
    { id:"mm06", cat:"armi_mischia_marziali", nome:"Morningstar", en:"Morningstar",
      costo_mo:15, costo_ma:0, peso_kg:2,
      danno:"1d8 perforante", proprieta:[],
      note:"Mazza con punte metalliche, combina danni contundenti e perforanti." },
    { id:"mm07", cat:"armi_mischia_marziali", nome:"Picca", en:"Pike",
      costo_mo:5, costo_ma:0, peso_kg:9,
      danno:"1d10 perforante", proprieta:["Pesante","Portata","A due mani"],
      note:"Asta lunga con punta acuminata, eccellente contro cavalieri." },
    { id:"mm08", cat:"armi_mischia_marziali", nome:"Pugnale", en:"Shortsword",
      costo_mo:10, costo_ma:0, peso_kg:1,
      danno:"1d6 perforante", proprieta:["Accurata","Leggera"],
      note:"Spada corta e maneggevole, ideale per combattenti agili." },
    { id:"mm09", cat:"armi_mischia_marziali", nome:"Alabarda", en:"Halberd",
      costo_mo:20, costo_ma:0, peso_kg:3,
      danno:"1d10 tagliente", proprieta:["Pesante","Portata","A due mani"],
      note:"Asta con ascia e punta, versatile contro fanti e cavalieri." },
    { id:"mm10", cat:"armi_mischia_marziali", nome:"Rapier", en:"Rapier",
      costo_mo:25, costo_ma:0, peso_kg:1,
      danno:"1d8 perforante", proprieta:["Accurata"],
      note:"Stocco elegante da duellante, preciso e letale." },
    { id:"mm11", cat:"armi_mischia_marziali", nome:"Sciabola", en:"Scimitar",
      costo_mo:25, costo_ma:0, peso_kg:1.5,
      danno:"1d6 tagliente", proprieta:["Accurata","Leggera"],
      note:"Lama ricurva da cavaliere, veloce e affilata." },
    { id:"mm12", cat:"armi_mischia_marziali", nome:"Spada a due mani", en:"Greatsword",
      costo_mo:50, costo_ma:0, peso_kg:3,
      danno:"2d6 tagliente", proprieta:["Pesante","A due mani"],
      note:"La più grande delle spade, infligge danni devastanti." },
    { id:"mm13", cat:"armi_mischia_marziali", nome:"Spada da cavaliere", en:"Longsword",
      costo_mo:15, costo_ma:0, peso_kg:1.5,
      danno:"1d8 tagliente (1d10 a due mani)", proprieta:["Versatile"],
      note:"Spada lunga classica, equilibrio ideale tra velocità e potenza." },
    { id:"mm14", cat:"armi_mischia_marziali", nome:"Tridente", en:"Trident",
      costo_mo:5, costo_ma:0, peso_kg:2,
      danno:"1d6 perforante (1d8 a due mani)", proprieta:["Lanciabile (raggio 6/18 m)","Versatile"],
      note:"Asta a tre punte, usata dai guerrieri del mare." },
    { id:"mm15", cat:"armi_mischia_marziali", nome:"Frusta da guerra", en:"War Pick",
      costo_mo:5, costo_ma:0, peso_kg:1,
      danno:"1d8 perforante", proprieta:[],
      note:"Piccone da battaglia, perfora facilmente le armature." },
    // ── ARMI A DISTANZA MARZIALI ─────────────────────────────────────────
    { id:"md01", cat:"armi_distanza_marziali", nome:"Arco lungo", en:"Longbow",
      costo_mo:50, costo_ma:0, peso_kg:1,
      danno:"1d8 perforante", proprieta:["Munizioni (raggio 45/180 m)","Pesante","A due mani"],
      note:"Il più potente degli archi, gittata straordinaria e danni elevati." },
    { id:"md02", cat:"armi_distanza_marziali", nome:"Balestra a mano", en:"Hand Crossbow",
      costo_mo:75, costo_ma:0, peso_kg:1.5,
      danno:"1d6 perforante", proprieta:["Munizioni (raggio 9/36 m)","Leggera","Ricarica"],
      note:"Balestra compatta usabile con una mano sola." },
    { id:"md03", cat:"armi_distanza_marziali", nome:"Balestra pesante", en:"Heavy Crossbow",
      costo_mo:50, costo_ma:0, peso_kg:9,
      danno:"1d10 perforante", proprieta:["Munizioni (raggio 30/120 m)","Pesante","A due mani","Ricarica"],
      note:"La balestra più potente, lenta ma devastante contro le armature." },
    { id:"md04", cat:"armi_distanza_marziali", nome:"Rete", en:"Net",
      costo_mo:1, costo_ma:0, peso_kg:1.5,
      danno:"—", proprieta:["Speciale","Lanciabile (raggio 1.5/4.5 m)"],
      note:"Avvolge il bersaglio (trattenuto, CD 10 Forza per liberarsi). Max taglia Grande." },
    // ── ARMATURE LEGGERE ─────────────────────────────────────────────────
    { id:"al01", cat:"armature_leggere", nome:"Armatura imbottita", en:"Padded Armor",
      costo_mo:5, costo_ma:0, peso_kg:4,
      danno:"CA 11 + mod. DES", proprieta:["Svantaggio Furtività"],
      note:"Strati di tessuto imbottito, protezione minima ma economica." },
    { id:"al02", cat:"armature_leggere", nome:"Armatura di cuoio", en:"Leather Armor",
      costo_mo:10, costo_ma:0, peso_kg:5,
      danno:"CA 11 + mod. DES", proprieta:[],
      note:"Cuoio indurito, protezione base per ladri e rangers." },
    { id:"al03", cat:"armature_leggere", nome:"Armatura di cuoio borchiato", en:"Studded Leather Armor",
      costo_mo:45, costo_ma:0, peso_kg:6.5,
      danno:"CA 12 + mod. DES", proprieta:[],
      note:"Cuoio rinforzato con borchie metalliche, ottimo compromesso." },
    // ── ARMATURE MEDIE ───────────────────────────────────────────────────
    { id:"ame01", cat:"armature_medie", nome:"Armatura di cuoio indurito", en:"Hide Armor",
      costo_mo:10, costo_ma:0, peso_kg:6,
      danno:"CA 12 + mod. DES (max 2)", proprieta:[],
      note:"Pelli grezze cucite insieme, usata dai barbari e dai druidi." },
    { id:"ame02", cat:"armature_medie", nome:"Cotta di maglia", en:"Chain Shirt",
      costo_mo:50, costo_ma:0, peso_kg:10,
      danno:"CA 13 + mod. DES (max 2)", proprieta:[],
      note:"Anelli metallici intrecciati a copertura del torso." },
    { id:"ame03", cat:"armature_medie", nome:"Armatura a scaglie", en:"Scale Mail",
      costo_mo:50, costo_ma:0, peso_kg:22.5,
      danno:"CA 14 + mod. DES (max 2)", proprieta:["Svantaggio Furtività"],
      note:"Scaglie metalliche sovrapposte, simile alla pelle di un drago." },
    { id:"ame04", cat:"armature_medie", nome:"Corazza", en:"Breastplate",
      costo_mo:400, costo_ma:0, peso_kg:10,
      danno:"CA 14 + mod. DES (max 2)", proprieta:[],
      note:"Piastra metallica per il petto e la schiena, elegante e funzionale." },
    { id:"ame05", cat:"armature_medie", nome:"Armatura a lamelle", en:"Half Plate",
      costo_mo:750, costo_ma:0, peso_kg:20,
      danno:"CA 15 + mod. DES (max 2)", proprieta:["Svantaggio Furtività"],
      note:"Copertura parziale in piastre, migliore protezione senza armatura completa." },
    // ── ARMATURE PESANTI ─────────────────────────────────────────────────
    { id:"ap01", cat:"armature_pesanti", nome:"Armatura ad anelli", en:"Ring Mail",
      costo_mo:30, costo_ma:0, peso_kg:18,
      danno:"CA 14", proprieta:["Svantaggio Furtività"],
      note:"Anelli di metallo cuciti su cuoio, protezione antica e rozza." },
    { id:"ap02", cat:"armature_pesanti", nome:"Cotta di maglia completa", en:"Chain Mail",
      costo_mo:75, costo_ma:0, peso_kg:27.5,
      danno:"CA 16", proprieta:["Svantaggio Furtività","Requisito FOR 13"],
      note:"Copertura completa di anelli metallici, protezione eccellente." },
    { id:"ap03", cat:"armature_pesanti", nome:"Armatura a bande", en:"Splint Armor",
      costo_mo:200, costo_ma:0, peso_kg:30,
      danno:"CA 17", proprieta:["Svantaggio Furtività","Requisito FOR 15"],
      note:"Strisce verticali di metallo su un substrato di maglie." },
    { id:"ap04", cat:"armature_pesanti", nome:"Armatura a piastre", en:"Plate Armor",
      costo_mo:1500, costo_ma:0, peso_kg:32.5,
      danno:"CA 18", proprieta:["Svantaggio Furtività","Requisito FOR 15"],
      note:"Protezione massima: piastre metalliche su ogni parte del corpo." },
    // ── SCUDI ────────────────────────────────────────────────────────────
    { id:"sc01", cat:"scudi", nome:"Scudo", en:"Shield",
      costo_mo:10, costo_ma:0, peso_kg:3,
      danno:"+2 CA", proprieta:[],
      note:"Difesa standard in legno o metallo, +2 alla Classe Armatura." },
    // ── POZIONI ──────────────────────────────────────────────────────────
    { id:"po01", cat:"pozioni", nome:"Pozione di Guarigione", en:"Potion of Healing",
      costo_mo:50, costo_ma:0, peso_kg:0.5,
      danno:"2d4+2 PF recuperati", proprieta:["Consumabile"],
      note:"La pozione più comune. Recupera 2d4+2 punti ferita." },
    { id:"po02", cat:"pozioni", nome:"Pozione di Guarigione Superiore", en:"Potion of Greater Healing",
      costo_mo:150, costo_ma:0, peso_kg:0.5,
      danno:"4d4+4 PF recuperati", proprieta:["Consumabile"],
      note:"Versione potenziata. Recupera 4d4+4 punti ferita." },
    { id:"po03", cat:"pozioni", nome:"Pozione di Guarigione Superiore (eccellente)", en:"Potion of Superior Healing",
      costo_mo:500, costo_ma:0, peso_kg:0.5,
      danno:"8d4+8 PF recuperati", proprieta:["Consumabile"],
      note:"Guarigione eccellente. Recupera 8d4+8 punti ferita." },
    { id:"po04", cat:"pozioni", nome:"Pozione di Guarigione Suprema", en:"Potion of Supreme Healing",
      costo_mo:1350, costo_ma:0, peso_kg:0.5,
      danno:"10d4+20 PF recuperati", proprieta:["Consumabile"],
      note:"La più potente guarigione in bottiglia. Recupera 10d4+20 punti ferita." },
    { id:"po05", cat:"pozioni", nome:"Pozione di Veleno", en:"Potion of Poison",
      costo_mo:100, costo_ma:0, peso_kg:0.5,
      danno:"3d6 veleno + avvelenato", proprieta:["Consumabile","Maledetta"],
      note:"Sembra innocua ma infligge 3d6 danni veleno e la condizione avvelenato (CD 13 COS)." },
    { id:"po06", cat:"pozioni", nome:"Pozione di Forza del Gigante (della Collina)", en:"Potion of Hill Giant Strength",
      costo_mo:200, costo_ma:0, peso_kg:0.5,
      danno:"FOR 21 per 1 ora", proprieta:["Consumabile"],
      note:"Forza diventa 21 per 1 ora (se non era già superiore)." },
    { id:"po07", cat:"pozioni", nome:"Pozione di Forza del Gigante (delle Pietre)", en:"Potion of Stone Giant Strength",
      costo_mo:450, costo_ma:0, peso_kg:0.5,
      danno:"FOR 23 per 1 ora", proprieta:["Consumabile"],
      note:"Forza diventa 23 per 1 ora." },
    { id:"po08", cat:"pozioni", nome:"Pozione di Forza del Gigante (del Fuoco)", en:"Potion of Fire Giant Strength",
      costo_mo:450, costo_ma:0, peso_kg:0.5,
      danno:"FOR 25 per 1 ora", proprieta:["Consumabile"],
      note:"Forza diventa 25 per 1 ora." },
    { id:"po09", cat:"pozioni", nome:"Pozione di Forza del Gigante (delle Nuvole)", en:"Potion of Cloud Giant Strength",
      costo_mo:1250, costo_ma:0, peso_kg:0.5,
      danno:"FOR 27 per 1 ora", proprieta:["Consumabile"],
      note:"Forza diventa 27 per 1 ora." },
    { id:"po10", cat:"pozioni", nome:"Pozione di Forza del Gigante (delle Tempeste)", en:"Potion of Storm Giant Strength",
      costo_mo:1250, costo_ma:0, peso_kg:0.5,
      danno:"FOR 29 per 1 ora", proprieta:["Consumabile"],
      note:"Forza diventa 29 per 1 ora. La più potente pozione di forza." },
    { id:"po11", cat:"pozioni", nome:"Pozione di Invisibilità", en:"Potion of Invisibility",
      costo_mo:180, costo_ma:0, peso_kg:0.5,
      danno:"Invisibile per 1 ora", proprieta:["Consumabile"],
      note:"Il bevitore diventa invisibile per 1 ora. Termina se attacca o lancia incantesimi." },
    { id:"po12", cat:"pozioni", nome:"Pozione di Volo", en:"Potion of Flying",
      costo_mo:500, costo_ma:0, peso_kg:0.5,
      danno:"Velocità di volo 18 m per 1 ora", proprieta:["Consumabile"],
      note:"Concede velocità di volo pari alla velocità di movimento per 1 ora." },
    { id:"po13", cat:"pozioni", nome:"Pozione di Respirazione Acquatica", en:"Potion of Water Breathing",
      costo_mo:180, costo_ma:0, peso_kg:0.5,
      danno:"Respiro sott'acqua per 1 ora", proprieta:["Consumabile"],
      note:"Permette di respirare sott'acqua per 1 ora." },
    { id:"po14", cat:"pozioni", nome:"Pozione di Scalare", en:"Potion of Climbing",
      costo_mo:75, costo_ma:0, peso_kg:0.5,
      danno:"Velocità scalata = velocità movimento per 1 ora", proprieta:["Consumabile"],
      note:"Concede velocità di arrampicata per 1 ora." },
    { id:"po15", cat:"pozioni", nome:"Pozione di Riduzione", en:"Potion of Diminution",
      costo_mo:270, costo_ma:0, peso_kg:0.5,
      danno:"Riduzione taglia per 1d4 ore", proprieta:["Consumabile"],
      note:"Come l'incantesimo Rimpicciolire. Taglia si riduce di una categoria." },
    { id:"po16", cat:"pozioni", nome:"Pozione di Crescita", en:"Potion of Growth",
      costo_mo:270, costo_ma:0, peso_kg:0.5,
      danno:"Aumento taglia per 1d4 ore", proprieta:["Consumabile"],
      note:"Come l'incantesimo Ingrandire. Taglia aumenta di una categoria, +1d4 danni." },
    { id:"po17", cat:"pozioni", nome:"Pozione di Resistenza", en:"Potion of Resistance",
      costo_mo:300, costo_ma:0, peso_kg:0.5,
      danno:"Resistenza a un tipo di danno per 1 ora", proprieta:["Consumabile"],
      note:"Concede resistenza a un tipo di danno scelto per 1 ora." },
    { id:"po18", cat:"pozioni", nome:"Pozione di Controllo del Respiro", en:"Potion of Heroism",
      costo_mo:180, costo_ma:0, peso_kg:0.5,
      danno:"1d10+4 PF temporanei per 1 ora + eroismo", proprieta:["Consumabile"],
      note:"Come incantesimo Eroismo: immunità a Spaventato + PF temp per 1 ora." },
    { id:"po19", cat:"pozioni", nome:"Pozione di Mente Lucida", en:"Potion of Mind Reading",
      costo_mo:180, costo_ma:0, peso_kg:0.5,
      danno:"Individuazione Pensieri per 1 ora", proprieta:["Consumabile"],
      note:"Come l'incantesimo Individuazione Pensieri (CD 13 Saggezza)." },
    { id:"po20", cat:"pozioni", nome:"Antidoto universale", en:"Universal Solvent",
      costo_mo:50, costo_ma:0, peso_kg:0.1,
      danno:"Rimuove adesivi e sostanze appiccicose", proprieta:["Consumabile"],
      note:"Scioglie qualsiasi adesivo, incluso il corpo adesivo del mimo." },
    { id:"po21", cat:"pozioni", nome:"Olio scivoloso", en:"Oil of Slipperiness",
      costo_mo:480, costo_ma:0, peso_kg:0.5,
      danno:"Libertà di Movimento per 8 ore", proprieta:["Consumabile"],
      note:"Applicato sul corpo: come Libertà di Movimento per 8 ore." },
    { id:"po22", cat:"pozioni", nome:"Olio d'affilatura", en:"Oil of Sharpness",
      costo_mo:3000, costo_ma:0, peso_kg:0.5,
      danno:"+3 a colpire e danno per 1 ora", proprieta:["Consumabile"],
      note:"Applicato su un'arma: +3 ai tiri per colpire e ai danni per 1 ora." },
    { id:"po23", cat:"pozioni", nome:"Olio di etheralness", en:"Oil of Etherealness",
      costo_mo:1900, costo_ma:0, peso_kg:0.5,
      danno:"Piano Etereo per 1 ora", proprieta:["Consumabile"],
      note:"Applicato al corpo: il portatore può entrare nel Piano Etereo." },
    // ── STRUMENTI ────────────────────────────────────────────────────────
    { id:"st01", cat:"strumenti", nome:"Kit del guaritore", en:"Healer's Kit",
      costo_mo:5, costo_ma:0, peso_kg:1.5,
      danno:"10 usi: stabilizza creature a 0 PF", proprieta:["Consumabile (10 usi)"],
      note:"10 usi. Stabilizza creature a 0 PF senza prove. Standard dei guaritori." },
    { id:"st02", cat:"strumenti", nome:"Kit del ladro", en:"Thieves' Tools",
      costo_mo:25, costo_ma:0, peso_kg:0.5,
      danno:"Scassinare serrature, disinnescare trappole", proprieta:[],
      note:"Lima, spilli, specchietto, pinze, trivella. Necessari per scassinare." },
    { id:"st03", cat:"strumenti", nome:"Kit del travestimento", en:"Disguise Kit",
      costo_mo:25, costo_ma:0, peso_kg:1.5,
      danno:"Travestimento con prova Inganno/Storia", proprieta:[],
      note:"Cosmetici, capelli posticci, abiti di riserva per cambiare identità." },
    { id:"st04", cat:"strumenti", nome:"Kit da falsario", en:"Forgery Kit",
      costo_mo:15, costo_ma:0, peso_kg:1,
      danno:"Falsificare documenti", proprieta:[],
      note:"Diversi tipi di inchiostro, penne, carta, cera, sigilli." },
    { id:"st05", cat:"strumenti", nome:"Kit da erborista", en:"Herbalism Kit",
      costo_mo:5, costo_ma:0, peso_kg:1.5,
      danno:"Creare antidoti e pozioni di guarigione", proprieta:[],
      note:"Sacchetti, forbici, mortaio, flaconi: per preparare rimedi naturali." },
    { id:"st06", cat:"strumenti", nome:"Kit da avvelenatore", en:"Poisoner's Kit",
      costo_mo:50, costo_ma:0, peso_kg:1,
      danno:"Creare e applicare veleni", proprieta:[],
      note:"Flaconi, provette, guanti di cuoio, mortaio. Per preparare sostanze tossiche." },
    { id:"st07", cat:"strumenti", nome:"Strumenti da artigiano (vari)", en:"Artisan's Tools",
      costo_mo:5, costo_ma:0, peso_kg:2.5,
      danno:"Lavoro artigianale specializzato", proprieta:[],
      note:"Fabbro 20mo, calzolaio 5mo, carpentiere 8mo, cuoiaio 5mo, muratore 10mo, ecc." },
    { id:"st08", cat:"strumenti", nome:"Strumenti musicali (vari)", en:"Musical Instruments",
      costo_mo:5, costo_ma:0, peso_kg:1,
      danno:"Prove di Rappresentazione", proprieta:[],
      note:"Cornamusa 30mo, liuto 35mo, flauto 2mo, tamburo 6mo, violino 30mo, ecc." },
    { id:"st09", cat:"strumenti", nome:"Kit da navigatore", en:"Navigator's Tools",
      costo_mo:25, costo_ma:0, peso_kg:1,
      danno:"Navigazione e orientamento marino", proprieta:[],
      note:"Sestante, bussola, cartine, penna e inchiostro, righello." },
    { id:"st10", cat:"strumenti", nome:"Set da gioco (vari)", en:"Gaming Set",
      costo_mo:1, costo_ma:0, peso_kg:0.5,
      danno:"Prove di Intuizione durante il gioco", proprieta:[],
      note:"Dadi 1mo, carte 5ma, scacchi di drago 1mo, dragonchess 1mo." },
    // ── EQUIPAGGIAMENTO DA AVVENTURA ──────────────────────────────────────
    { id:"av01", cat:"avventura", nome:"Corda (canapa, 15 m)", en:"Rope, Hempen (50 ft)",
      costo_mo:1, costo_ma:0, peso_kg:5,
      danno:"CA 11, 2 PF", proprieta:[],
      note:"15 m di corda di canapa resistente. Regge 1.000 kg. Può essere tagliata." },
    { id:"av02", cat:"avventura", nome:"Corda (seta, 15 m)", en:"Rope, Silk (50 ft)",
      costo_mo:10, costo_ma:0, peso_kg:2.5,
      danno:"CA 11, 2 PF", proprieta:[],
      note:"15 m di corda di seta leggera e resistente. +2 alle prove di Atletica per arrampicarsi." },
    { id:"av03", cat:"avventura", nome:"Rampino", en:"Grappling Hook",
      costo_mo:2, costo_ma:0, peso_kg:2,
      danno:"Aggancio a sporgenze", proprieta:[],
      note:"Gancio metallico da lanciare, usato con la corda per scalare." },
    { id:"av04", cat:"avventura", nome:"Piccone da minatore", en:"Miner's Pick",
      costo_mo:2, costo_ma:0, peso_kg:5,
      danno:"Scavare pietra e terra", proprieta:[],
      note:"Attrezzo robusto per minatori. Può essere usato come arma improvvisata." },
    { id:"av05", cat:"avventura", nome:"Vanga", en:"Shovel",
      costo_mo:2, costo_ma:0, peso_kg:2.5,
      danno:"Scavare terra", proprieta:[],
      note:"Pala robusta. Indispensabile per nascondere tesori o disseppellirli." },
    { id:"av06", cat:"avventura", nome:"Zaino", en:"Backpack",
      costo_mo:2, costo_ma:0, peso_kg:2.5,
      danno:"Capienza 30 kg / 1 m³", proprieta:[],
      note:"Zaino standard da avventuriero. Il complemento base di ogni esplorazione." },
    { id:"av07", cat:"avventura", nome:"Sacca", en:"Pouch",
      costo_mo:0, costo_ma:5, peso_kg:0.5,
      danno:"Capienza 3 kg / 200 cm³", proprieta:[],
      note:"Piccola borsa in cuoio per tenere monete e oggetti minuti." },
    { id:"av08", cat:"avventura", nome:"Tenda (2 persone)", en:"Tent, Two-Person",
      costo_mo:2, costo_ma:0, peso_kg:10,
      danno:"Riparo per 2 persone", proprieta:[],
      note:"Riparo portatile per 2 persone. Protezione da intemperie." },
    { id:"av09", cat:"avventura", nome:"Sacco a pelo", en:"Bedroll",
      costo_mo:1, costo_ma:0, peso_kg:3.5,
      danno:"Riposo confortevole", proprieta:[],
      note:"Stuoia e coperta arrotolate, necessarie per il riposo lungo in esplorazione." },
    { id:"av10", cat:"avventura", nome:"Acciarino", en:"Tinderbox",
      costo_mo:0, costo_ma:5, peso_kg:0.5,
      danno:"Accendere fuochi (1 azione)", proprieta:[],
      note:"Acciarino, esca e scatola. Accende fuochi in condizioni secche in 1 azione." },
    { id:"av11", cat:"avventura", nome:"Coltello da tasca", en:"Hunting Trap",
      costo_mo:0, costo_ma:2, peso_kg:0.5,
      danno:"Tagliare corde, aprire pacchi", proprieta:[],
      note:"Piccolo coltello multiuso, non conta come arma." },
    { id:"av12", cat:"avventura", nome:"Trappola (da caccia)", en:"Hunting Trap",
      costo_mo:5, costo_ma:0, peso_kg:12.5,
      danno:"1d4 perforante + trattenuto", proprieta:[],
      note:"Scatto quando calpestata. CD 13 FOR per liberarsi o rompere la catena." },
    { id:"av13", cat:"avventura", nome:"Catena (3 m)", en:"Chain (10 ft)",
      costo_mo:5, costo_ma:0, peso_kg:5,
      danno:"CA 10, 10 PF", proprieta:[],
      note:"3 m di catena in ferro. Può essere usata come legaccio o per catene a mani." },
    { id:"av14", cat:"avventura", nome:"Arpione", en:"Crowbar",
      costo_mo:2, costo_ma:0, peso_kg:2.5,
      danno:"Vantaggio Forza su leve e porte chiuse", proprieta:[],
      note:"Sbarra metallica, vantaggio alle prove di Forza per fare leva." },
    { id:"av15", cat:"avventura", nome:"Rampicante", en:"Climber's Kit",
      costo_mo:25, costo_ma:0, peso_kg:6,
      danno:"Non cadere quando si scala", proprieta:[],
      note:"Pitons, guanti, cintura, ganci: non si può cadere durante l'arrampicata (speciale)." },
    { id:"av16", cat:"avventura", nome:"Spyglass (cannocchiale)", en:"Spyglass",
      costo_mo:1000, costo_ma:0, peso_kg:0.5,
      danno:"Visione ×2 a distanza", proprieta:[],
      note:"Ingrandisce gli oggetti distanti di 2 volte." },
    { id:"av17", cat:"avventura", nome:"Carta geografica o pergamena", en:"Map or Scroll Case",
      costo_mo:1, costo_ma:0, peso_kg:0.5,
      danno:"Custodire documenti", proprieta:[],
      note:"Cilindro di cuoio o metallo per proteggere mappe e pergamene." },
    { id:"av18", cat:"avventura", nome:"Clessidra", en:"Hourglass",
      costo_mo:25, costo_ma:0, peso_kg:0.5,
      danno:"Misurare il tempo (1 ora)", proprieta:[],
      note:"Misura 1 ora con precisione. Utile per calcolare le ore di guardia." },
    { id:"av19", cat:"avventura", nome:"Specchio (acciaio)", en:"Mirror, Steel",
      costo_mo:5, costo_ma:0, peso_kg:0.25,
      danno:"Vedere dietro angoli, deflettere sguardi", proprieta:[],
      note:"Piccolo specchio d'acciaio, utile contro basilischi e gorgoni." },
    { id:"av20", cat:"avventura", nome:"Simbolo sacro", en:"Holy Symbol",
      costo_mo:5, costo_ma:0, peso_kg:0.25,
      danno:"Focus da incantesimo (sacerdotale)", proprieta:[],
      note:"Amuleto, emblema o reliquia: focus per incantesimi di Chierici e Paladini." },
    { id:"av21", cat:"avventura", nome:"Borsa componenti", en:"Component Pouch",
      costo_mo:25, costo_ma:0, peso_kg:1,
      danno:"Focus da incantesimo (arcano)", proprieta:[],
      note:"Sacca con componenti materiali per incantesimi. Alternativa al bastone arcanico." },
    { id:"av22", cat:"avventura", nome:"Bastone arcanico", en:"Arcane Focus",
      costo_mo:10, costo_ma:0, peso_kg:1,
      danno:"Focus da incantesimo (arcano)", proprieta:[],
      note:"Cristallo, bacchetta, sfera o bastone: focus per Maghi, Stregoni, Warlock." },
    { id:"av23", cat:"avventura", nome:"Libro degli incantesimi (vuoto)", en:"Spellbook",
      costo_mo:50, costo_ma:0, peso_kg:1.5,
      danno:"100 pagine per incantesimi", proprieta:[],
      note:"100 pagine di vellum con copertina in cuoio. Fondamentale per i maghi." },
    { id:"av24", cat:"avventura", nome:"Inchiostro (flacone)", en:"Ink (1 ounce bottle)",
      costo_mo:10, costo_ma:0, peso_kg:0,
      danno:"Scrivere pergamene e libri", proprieta:[],
      note:"Flacone di inchiostro nero, sufficiente per riempire un libro degli incantesimi." },
    { id:"av25", cat:"avventura", nome:"Penna di calligrafia", en:"Ink Pen",
      costo_mo:0, costo_ma:2, peso_kg:0,
      danno:"Scrittura", proprieta:[],
      note:"Penna d'oca per scrivere. Necessaria con l'inchiostro." },
    // ── ILLUMINAZIONE ─────────────────────────────────────────────────────
    { id:"il01", cat:"illuminazione", nome:"Torcia", en:"Torch",
      costo_mo:0, costo_ma:1, peso_kg:0.5,
      danno:"Luce brillante 6 m + fioca 6 m per 1 ora / 1d4 fuoco", proprieta:[],
      note:"Illumina per 1 ora. Può essere usata come arma improvvisata (1d4 fuoco)." },
    { id:"il02", cat:"illuminazione", nome:"Lanterna schermata", en:"Hooded Lantern",
      costo_mo:5, costo_ma:0, peso_kg:1,
      danno:"Luce brillante 9 m + fioca 9 m per 6 ore (olio)", proprieta:[],
      note:"Con coperchio abbassabile: solo luce fioca 2 m. Usa 1 flacone olio/6 ore." },
    { id:"il03", cat:"illuminazione", nome:"Lanterna a bullseye", en:"Bullseye Lantern",
      costo_mo:10, costo_ma:0, peso_kg:1,
      danno:"Cono luce brillante 18 m + fioca 18 m per 6 ore", proprieta:[],
      note:"Proietta luce in cono. Più direzionale della lanterna schermata." },
    { id:"il04", cat:"illuminazione", nome:"Olio (flacone)", en:"Oil (flask)",
      costo_mo:0, costo_ma:1, peso_kg:0.5,
      danno:"6 ore di luce per lanterna / 5 danni fuoco lanciato", proprieta:["Consumabile"],
      note:"Combustibile per lanterne. Lanciato: CD 13 DES o 5 danni fuoco (CD 10 soffio)." },
    { id:"il05", cat:"illuminazione", nome:"Candela", en:"Candle",
      costo_mo:0, costo_ma:1, peso_kg:0,
      danno:"Luce fioca 1,5 m per 1 ora", proprieta:[],
      note:"Solo luce fioca in un raggio di 1,5 m. Fragile ma economica." },
    // ── CONTENITORI ───────────────────────────────────────────────────────
    { id:"co01", cat:"contenitori", nome:"Barile", en:"Barrel",
      costo_mo:2, costo_ma:0, peso_kg:35,
      danno:"Capienza ~115 litri", proprieta:[],
      note:"Contenitore in legno per liquidi o viveri. Copre un adulto accucciato." },
    { id:"co02", cat:"contenitori", nome:"Cassa", en:"Chest",
      costo_mo:5, costo_ma:0, peso_kg:11,
      danno:"Capienza 30 kg / 350 litri", proprieta:[],
      note:"Cassa in legno con serratura. Spesso usata per nascondere tesori." },
    { id:"co03", cat:"contenitori", nome:"Borraccia", en:"Waterskin",
      costo_mo:0, costo_ma:2, peso_kg:2.5,
      danno:"4 litri di acqua", proprieta:[],
      note:"Contenitore in pelle per liquidi. Indispensabile in ambienti aridi." },
    { id:"co04", cat:"contenitori", nome:"Otre (grande)", en:"Jug",
      costo_mo:0, costo_ma:2, peso_kg:2,
      danno:"4 litri", proprieta:[],
      note:"Brocca o contenitore in terracotta per liquidi." },
    { id:"co05", cat:"contenitori", nome:"Fiaschetta", en:"Flask",
      costo_mo:0, costo_ma:2, peso_kg:0.5,
      danno:"0,5 litri", proprieta:[],
      note:"Piccolo contenitore in metallo, pratico per bevande alcoliche." },
    { id:"co06", cat:"contenitori", nome:"Tenda grande (10 persone)", en:"Tent, 10-person",
      costo_mo:100, costo_ma:0, peso_kg:20,
      danno:"Riparo per 10 persone", proprieta:[],
      note:"Grande tenda per gruppi numerosi o accampamenti base." },
    // ── CIBO & BEVANDE ─────────────────────────────────────────────────────
    { id:"cb01", cat:"cibo_bevande", nome:"Razione (1 giorno)", en:"Rations (1 day)",
      costo_mo:0, costo_ma:5, peso_kg:1,
      danno:"Nutrimento per 1 giorno", proprieta:[],
      note:"Carne essiccata, frutta secca, biscotti: cibo compresso per avventurieri." },
    { id:"cb02", cat:"cibo_bevande", nome:"Birra (boccale)", en:"Ale (mug)",
      costo_mo:0, costo_ma:4, peso_kg:0.5,
      danno:"Bevanda alcolica", proprieta:[],
      note:"Boccale di birra di qualità media. Prezzo di locanda standard." },
    { id:"cb03", cat:"cibo_bevande", nome:"Vino (bottiglia)", en:"Wine, Common (pitcher)",
      costo_mo:0, costo_ma:2, peso_kg:1.5,
      danno:"Bevanda alcolica", proprieta:[],
      note:"Brocca di vino comune. 2 ma/brocca o 10 ma/bottiglia." },
    { id:"cb04", cat:"cibo_bevande", nome:"Vino pregiato (bottiglia)", en:"Wine, Fine (bottle)",
      costo_mo:10, costo_ma:0, peso_kg:1.5,
      danno:"Bevanda di lusso", proprieta:[],
      note:"Bottiglia di vino di qualità. Adatta a nobili e banchetti." },
    { id:"cb05", cat:"cibo_bevande", nome:"Pasto di locanda (modesto)", en:"Modest Meal",
      costo_mo:0, costo_ma:3, peso_kg:0,
      danno:"Nutrimento per 1 giorno", proprieta:[],
      note:"Pasto caldo semplice in osteria: zuppa, pane, pesce o carne." },
    { id:"cb06", cat:"cibo_bevande", nome:"Pasto di locanda (lussuoso)", en:"Wealthy Meal",
      costo_mo:5, costo_ma:0, peso_kg:0,
      danno:"Nutrimento per 1 giorno + beneficio sociale", proprieta:[],
      note:"Più portate, vino incluso. Utile per incontrare nobili e mercanti." },
    // ── ANIMALI ─────────────────────────────────────────────────────────
    { id:"an01", cat:"animali", nome:"Cavallo da battaglia", en:"Warhorse",
      costo_mo:400, costo_ma:0, peso_kg:0,
      danno:"Velocità 18 m, trasporta 240 kg", proprieta:[],
      note:"Addestrato al combattimento. CA 11, PF 19. Può attaccare." },
    { id:"an02", cat:"animali", nome:"Cavallo da tiro", en:"Draft Horse",
      costo_mo:50, costo_ma:0, peso_kg:0,
      danno:"Velocità 12 m, trasporta 420 kg", proprieta:[],
      note:"Grande e robusto, ideale per carri e lavori agricoli." },
    { id:"an03", cat:"animali", nome:"Cavallo da sella", en:"Riding Horse",
      costo_mo:75, costo_ma:0, peso_kg:0,
      danno:"Velocità 18 m, trasporta 240 kg", proprieta:[],
      note:"Il cavallo standard per il viaggio. Economico e affidabile." },
    { id:"an04", cat:"animali", nome:"Pony", en:"Pony",
      costo_mo:30, costo_ma:0, peso_kg:0,
      danno:"Velocità 12 m, trasporta 75 kg", proprieta:[],
      note:"Cavalcatura piccola, ideale per halfling e gnomi." },
    { id:"an05", cat:"animali", nome:"Mulo", en:"Mule",
      costo_mo:8, costo_ma:0, peso_kg:0,
      danno:"Velocità 12 m, trasporta 210 kg", proprieta:[],
      note:"Resistente e affidabile su terreni accidentati. Non adatto al combattimento." },
    { id:"an06", cat:"animali", nome:"Cammello", en:"Camel",
      costo_mo:50, costo_ma:0, peso_kg:0,
      danno:"Velocità 15 m, trasporta 240 kg", proprieta:[],
      note:"Ideale per deserti. Sopravvive senza acqua per giorni." },
    { id:"an07", cat:"animali", nome:"Elefante", en:"Elephant",
      costo_mo:200, costo_ma:0, peso_kg:0,
      danno:"Velocità 12 m, trasporta 660 kg", proprieta:[],
      note:"Cavalcatura enorme usata in guerra. CA 13, PF 76." },
    { id:"an08", cat:"animali", nome:"Sella da cavallo", en:"Riding Saddle",
      costo_mo:10, costo_ma:0, peso_kg:12.5,
      danno:"Vantaggio per non cadere", proprieta:[],
      note:"Sella standard per cavalieri. Richiesta per non scivolare in combattimento." },
    { id:"an09", cat:"animali", nome:"Sella militare", en:"Military Saddle",
      costo_mo:20, costo_ma:0, peso_kg:15,
      danno:"Vantaggio mantenimento sella in combattimento", proprieta:[],
      note:"Sella rinforzata per il combattimento. Difficile da disarcionare." },
    { id:"an10", cat:"animali", nome:"Stalla (notte per cavallo)", en:"Stabling (per day)",
      costo_mo:0, costo_ma:5, peso_kg:0,
      danno:"Riposo e nutrimento per cavalcatura", proprieta:[],
      note:"Mangiatoia, paglia e cura per una cavalcatura per una notte." },
    // ── VEICOLI ───────────────────────────────────────────────────────────
    { id:"ve01", cat:"veicoli", nome:"Carretto", en:"Cart",
      costo_mo:15, costo_ma:0, peso_kg:100,
      danno:"Trasporto 270 kg", proprieta:[],
      note:"Piccolo veicolo a due ruote, richiede un animale da tiro." },
    { id:"ve02", cat:"veicoli", nome:"Carro", en:"Wagon",
      costo_mo:35, costo_ma:0, peso_kg:200,
      danno:"Trasporto 400 kg", proprieta:[],
      note:"Veicolo a quattro ruote con sponde, richiede due animali da tiro." },
    { id:"ve03", cat:"veicoli", nome:"Slitta", en:"Sled",
      costo_mo:20, costo_ma:0, peso_kg:150,
      danno:"Trasporto 300 kg su neve/ghiaccio", proprieta:[],
      note:"Slitta su pattini, efficiente su neve e ghiaccio." },
    { id:"ve04", cat:"veicoli", nome:"Barca a remi", en:"Rowboat",
      costo_mo:50, costo_ma:0, peso_kg:75,
      danno:"Velocità acquatica: 2 nodi", proprieta:[],
      note:"Piccola imbarcazione per fiumi e laghi. Massimo 3 persone." },
    { id:"ve05", cat:"veicoli", nome:"Barca a vela", en:"Sailing Ship",
      costo_mo:10000, costo_ma:0, peso_kg:0,
      danno:"Velocità: 3 nodi, equipaggio 20", proprieta:[],
      note:"Nave da trasporto media. PF 300, soglia danno 15, CA 15." },
    { id:"ve06", cat:"veicoli", nome:"Nave da guerra", en:"Warship",
      costo_mo:25000, costo_ma:0, peso_kg:0,
      danno:"Velocità: 2.5 nodi, equipaggio 60+40 marines", proprieta:[],
      note:"Nave militare con ram e baliste. PF 500, soglia danno 20, CA 15." },
    // ── SERVIZI ──────────────────────────────────────────────────────────
    { id:"sv01", cat:"servizi", nome:"Pernottamento (povero)", en:"Lodging, Squalid",
      costo_mo:0, costo_ma:7, peso_kg:0,
      danno:"Dormire sul pavimento di una taverna", proprieta:[],
      note:"Paglia, lerciume, compagnia dubbia. Il minimo per un tetto." },
    { id:"sv02", cat:"servizi", nome:"Pernottamento (modesto)", en:"Lodging, Poor",
      costo_mo:0, costo_ma:1, peso_kg:0,
      danno:"Stanza condivisa, letto pulito", proprieta:[],
      note:"Camera condivisa con altri avventurieri. Pulizia accettabile." },
    { id:"sv03", cat:"servizi", nome:"Pernottamento (agiato)", en:"Lodging, Modest",
      costo_mo:5, costo_ma:0, peso_kg:0,
      danno:"Camera singola, colazione inclusa", proprieta:[],
      note:"Camera privata con letto comodo. Standard per mercanti in viaggio." },
    { id:"sv04", cat:"servizi", nome:"Pernottamento (lussuoso)", en:"Lodging, Wealthy",
      costo_mo:2, costo_ma:0, peso_kg:0,
      danno:"Suite, servizio incluso", proprieta:[],
      note:"Stanza elegante con servizio in camera. Adatto a nobili." },
    { id:"sv05", cat:"servizi", nome:"Traghetto o passaggio", en:"Passage, Ship",
      costo_mo:1, costo_ma:0, peso_kg:0,
      danno:"Passaggio su nave per km/giorno", proprieta:[],
      note:"Circa 1 mo per giornata di viaggio su nave mercantile." },
    { id:"sv06", cat:"servizi", nome:"Messenger", en:"Messenger",
      costo_mo:0, costo_ma:2, peso_kg:0,
      danno:"Consegna messaggio entro la città", proprieta:[],
      note:"2 ma per recapito in città. Prezzi variabili per lunghe distanze." },
    { id:"sv07", cat:"servizi", nome:"Guardia del corpo (giorno)", en:"Hireling, Skilled",
      costo_mo:2, costo_ma:0, peso_kg:0,
      danno:"Guardia armata per 8 ore", proprieta:[],
      note:"Mercenario qualificato: 2 mo/giorno. Non-qualificato: 2 ma/giorno." },
    { id:"sv08", cat:"servizi", nome:"Spia", en:"Hireling, Expert",
      costo_mo:50, costo_ma:0, peso_kg:0,
      danno:"Informazioni o servizi specializzati", proprieta:[],
      note:"Esperto (spia, assassino, esploratore): fino a 50 mo/giorno." },
  ],
};



const RULES_DB = [
  {
    id: "azioni",
    label: "⚔ Azioni in Combattimento",
    colore: "#c0392b",
    voci: [
      { titolo: "Attaccare", testo: "Effettua uno o più attacchi contro un bersaglio entro gittata. Alcune classi ottengono attacchi aggiuntivi (Attacco Extra)." },
      { titolo: "Lanciare un incantesimo", testo: "Lanci un incantesimo con tempo di lancio di 1 azione. Incantesimi con tempo diverso (1 azione bonus, 1 reazione) seguono regole separate." },
      { titolo: "Scatto", testo: "Guadagni movimento extra pari alla tua velocità. Con velocità 9 m puoi muoverti fino a 18 m in totale nel turno." },
      { titolo: "Disimpegno", testo: "Il tuo movimento non provoca attacchi di opportunità per il resto del turno." },
      { titolo: "Schivare", testo: "Fino al tuo prossimo turno: chiunque ti attacchi ha svantaggio (se riesci a vederlo) e tu hai vantaggio ai TS su Destrezza." },
      { titolo: "Aiutare", testo: "Aiuti un alleato: ha vantaggio al prossimo tiro per colpire o prova di caratteristica contro un bersaglio entro 1,5 m da te." },
      { titolo: "Nascondersi", testo: "Prova di Furtività (CD decisa dal DM). Se riesce: sei nascosto. Perdi lo stato se ti muovi in zone illuminate o attacchi." },
      { titolo: "Prepararsi", testo: "Dichiari un trigger e un'azione. Quando il trigger si verifica puoi usare la reazione per compiere l'azione." },
      { titolo: "Cercare", testo: "Prova di Percezione o Indagare per trovare qualcosa di nascosto." },
      { titolo: "Usare un oggetto", testo: "Interagisci con un secondo oggetto nel turno (il primo è gratuito), o usi un oggetto con proprietà speciale." },
      { titolo: "Azione bonus", testo: "Disponibile solo se una feature, incantesimo o abilità lo specifica. Non puoi scegliere liberamente di compiere un'azione bonus." },
      { titolo: "Reazione", testo: "1 reazione per round (si recupera all'inizio del tuo turno). Usabile in risposta a un trigger anche nel turno degli altri." },
      { titolo: "Attacco di opportunità", testo: "Quando un nemico lascia la tua portata senza usare Disimpegno: puoi usare la reazione per attaccarlo una volta." },
    ]
  },
  {
    id: "condizioni",
    label: "🔴 Condizioni",
    colore: "#8e44ad",
    voci: [
      { titolo: "Accecato", testo: "Non può vedere. Fallisce automaticamente prove basate sulla vista. Svantaggio ai tiri per colpire. Chi lo attacca ha vantaggio." },
      { titolo: "Affascinato", testo: "Non può attaccare o colpire con incantesimi la fonte del fascino. La fonte ha vantaggio alle interazioni sociali con lui." },
      { titolo: "Assordato", testo: "Non può sentire. Fallisce automaticamente prove basate sull'udito." },
      { titolo: "Avvelenato", testo: "Svantaggio ai tiri per colpire e alle prove di caratteristica." },
      { titolo: "Esaurito", testo: "6 livelli: 1=svantaggio prove, 2=velocità ÷2, 3=svantaggio attacchi/TS, 4=PF max ÷2, 5=velocità 0, 6=morte. Ogni riposo lungo rimuove 1 livello." },
      { titolo: "Furtivo (nascosto)", testo: "Svantaggio agli attacchi contro creature che non lo vedono. Non può essere bersaglio di attacchi da chi non sa dove si trova." },
      { titolo: "Incapacitato", testo: "Non può compiere azioni né reazioni." },
      { titolo: "Invisibile", testo: "Impossibile vederlo senza sensi speciali. Vantaggio ai tiri per colpire, svantaggio contro chi lo attacca. Può ancora essere sentito/annusato." },
      { titolo: "Paralizzato", testo: "Incapacitato, non può muoversi né parlare. Fallisce TS FOR e DES. Chi lo attacca ha vantaggio. Colpi entro 1,5 m = critico automatico." },
      { titolo: "Pietrificato", testo: "Trasformato in sostanza solida. Incapacitato, peso ×10, non invecchia. Immunità veleni/malattie. Resistenza a tutti i danni. Fallisce TS FOR e DES." },
      { titolo: "Prono", testo: "Svantaggio ai tiri per colpire. Attacchi in mischia contro di lui: vantaggio. Attacchi a distanza: svantaggio. Rialzarsi costa metà del movimento." },
      { titolo: "Spaventato", testo: "Svantaggio a prove e tiri per colpire mentre vede la fonte della paura. Non può avvicinarsi volontariamente alla fonte." },
      { titolo: "Stordito", testo: "Incapacitato, non può muoversi, parla con difficoltà. Fallisce TS FOR e DES. Chi lo attacca ha vantaggio." },
      { titolo: "Trattenuto", testo: "Velocità 0. Svantaggio ai tiri per colpire. Attacchi contro di lui: vantaggio. Svantaggio ai TS su Destrezza." },
    ]
  },
  {
    id: "cd",
    label: "🎲 Difficoltà (CD)",
    colore: "#2980b9",
    voci: [
      { titolo: "Banale · CD 5", testo: "Quasi chiunque riesce. Scalare una parete con molti appigli, ricordare un fatto comune." },
      { titolo: "Facile · CD 10", testo: "Persona media con un po' di sforzo. Sfondare una porta non rinforzata, nuotare in acque calme." },
      { titolo: "Medio · CD 15", testo: "Richiede competenza o talento. Scassinare una serratura semplice, scalare una parete liscia con corda." },
      { titolo: "Difficile · CD 20", testo: "Sfida anche per gli esperti. Individuare una porta segreta ben nascosta, persuadere un nobile diffidente." },
      { titolo: "Molto difficile · CD 25", testo: "Impresa straordinaria. Scassinare una serratura di qualità, ricordare conoscenze arcane oscure." },
      { titolo: "Quasi impossibile · CD 30", testo: "Limite delle capacità mortali. Solo i più grandi eroi ci riescono." },
      { titolo: "Tiro contrapposto", testo: "Entrambe le parti tirano: chi ottiene il risultato più alto vince. In caso di parità, vince chi ha avviato l'azione (di solito l'attaccante)." },
    ]
  },
  {
    id: "movimento",
    label: "🏃 Movimento & Terreno",
    colore: "#27ae60",
    voci: [
      { titolo: "Terreno difficile", testo: "Ogni metro di movimento costa 2 m. Neve profonda, acquitrini, macerie, mobili rovesciati." },
      { titolo: "Scatto", testo: "Azione: movimento extra = velocità base. Con velocità 9 m puoi percorrere fino a 18 m totali." },
      { titolo: "Scalare", testo: "Costa 1 m extra per metro scalato (terreno difficile). Con velocità di arrampicata: nessun costo extra." },
      { titolo: "Nuotare", testo: "Costa 1 m extra per metro nuotato. Con velocità di nuoto: nessun costo extra." },
      { titolo: "Saltare (lungo)", testo: "Con rincorsa (3 m): salti Forza in piedi. Senza rincorsa: metà. Richiede sufficiente spazio per atterrare." },
      { titolo: "Saltare (alto)", testo: "Con rincorsa: 0,9 m + mod. Forza. Senza rincorsa: metà. Puoi estendere le braccia di altri 0,9 m." },
      { titolo: "Caduta", testo: "1d6 danni contundenti per ogni 3 m caduti (max 20d6 = 60 m). Atterra prono. Caduta su creatura: TS DES CD 15 entrambi, chi cade subisce i danni." },
      { titolo: "Strisciare", testo: "Movimento da prono: costa 1 m extra per metro. Considera terreno difficile." },
      { titolo: "Spazio di una creatura", testo: "Piccola/Media: 1,5×1,5 m. Grande: 3×3 m. Enorme: 4,5×4,5 m. Mastodontica: 6×6 m o più." },
      { titolo: "Muoversi attraverso", testo: "Puoi muoverti nello spazio di alleati e creature di taglia molto diversa dalla tua (almeno 2 categorie). Lo spazio di un nemico è terreno difficile." },
    ]
  },
  {
    id: "luce",
    label: "💡 Luce & Visibilità",
    colore: "#f39c12",
    voci: [
      { titolo: "Luce brillante", testo: "Visibilità normale. Torcia: 6 m. Lanterna: 9 m. Incantesimo Luce: 6 m brillante + 6 m fioca." },
      { titolo: "Luce fioca", testo: "Zona di penombra tra luce e buio. Svantaggio alle prove di Percezione basate sulla vista." },
      { titolo: "Oscurità", testo: "Nessuna luce non magica. Creature senza scurovisione sono effettivamente cieche." },
      { titolo: "Oscurità magica", testo: "Supera la luce non magica e la scurovisione. Solo visione del vero o sensi speciali funzionano." },
      { titolo: "Scurovisione", testo: "Vede nella luce fioca come se fosse brillante, nel buio come se fosse fioca. Non distingue i colori nel buio." },
      { titolo: "Visione nel buio", testo: "Vede perfettamente anche nell'oscurità totale entro un certo raggio. Non influenzata dalla luce fioca." },
      { titolo: "Creatura nascosta", testo: "Attacchi contro di lei: svantaggio. I suoi attacchi: vantaggio. Deve ancora essere in una posizione valida." },
      { titolo: "Copertura ½", testo: "+2 CA e TS DES. Muretto, mobili, altra creatura." },
      { titolo: "Copertura ¾", testo: "+5 CA e TS DES. Feritoia, fessura, tronco spesso." },
      { titolo: "Copertura totale", testo: "Non può essere bersaglio diretto di attacchi o incantesimi. Deve comunque subire effetti ad area." },
    ]
  },
  {
    id: "morte",
    label: "💀 Morte & Stabilizzazione",
    colore: "#555",
    voci: [
      { titolo: "0 punti ferita", testo: "Caduta prono e inizio dei tiri salvezza sulla morte. Se i danni in eccesso raggiungono il PF massimo: morte istantanea." },
      { titolo: "Tiro salvezza sulla morte", testo: "All'inizio del tuo turno: d20 senza modificatori. 10+: successo. 1-9: fallimento. 3 successi: stabile. 3 fallimenti: morte." },
      { titolo: "1 naturale", testo: "Conta come 2 fallimenti nel tiro salvezza sulla morte." },
      { titolo: "20 naturale", testo: "Torni a 1 PF immediatamente." },
      { titolo: "Danni a 0 PF", testo: "Ogni colpo subito a 0 PF conta come 1 fallimento. Un colpo critico conta come 2 fallimenti." },
      { titolo: "Stabilizzazione", testo: "Azione di Medicina CD 10 o incantesimo di cura: la creatura è stabile. Non tira più TS sulla morte ma rimane a 0 PF." },
      { titolo: "Creatura stabile", testo: "Dopo 1d4 ore recupera 1 PF e si sveglia. Senza cure rimane incosciente." },
      { titolo: "Riprendere conoscenza", testo: "Qualsiasi cura (anche 1 PF) fa tornare cosciente la creatura con i PF curati." },
    ]
  },
  {
    id: "concentrazione",
    label: "🔮 Concentrazione",
    colore: "#16a085",
    voci: [
      { titolo: "Come funziona", testo: "Puoi mantenere un solo incantesimo di concentrazione alla volta. Lanciarne un secondo termina il primo automaticamente." },
      { titolo: "Danni e CD", testo: "Ogni volta che subisci danni: TS Costituzione CD 10 o metà dei danni subiti (se superiore). Fallimento = concentrazione persa." },
      { titolo: "Altre interruzioni", testo: "Incapacitato, morto, o Dissolvi Magie: concentrazione persa automaticamente." },
      { titolo: "Guerra Magica", testo: "Se due incantatori hanno lo stesso incantesimo attivo (es. Guardiani Spirituali), entrambi mantengono il proprio." },
      { titolo: "Accelerazione (Haste)", testo: "Concentrazione. Velocità ×2, +2 CA, vantaggio TS DES, azione extra limitata. Allo scadere: stordito 1 turno." },
      { titolo: "Muro di Fuoco", testo: "Concentrazione, 1 min. 5d8 fuoco a chi inizia il turno nel muro. TS DES per dimezzare." },
      { titolo: "Guardiani Spirituali", testo: "Concentrazione, 10 min. 3d8 radianti/necrotici a chi entra o inizia nel raggio 4,5 m. TS SAG per dimezzare." },
      { titolo: "Invisibilità", testo: "Concentrazione, 1 ora. Termina per il bersaglio se attacca o lancia incantesimi." },
      { titolo: "Volare", testo: "Concentrazione, 10 min. Velocità di volo 18 m. Cade se la concentrazione si interrompe." },
      { titolo: "Sfocatura", testo: "Concentrazione, 1 min. Chiunque ti attacchi ha svantaggio (si disattiva se subisci danni)." },
      { titolo: "Schema Ipnotico", testo: "Concentrazione, 1 min. TS SAG o affascinato + velocità 0. Si interrompe se danneggiato o scosso." },
      { titolo: "Paura", testo: "Concentrazione, 1 min. Cono 9 m. TS SAG o lascia cadere oggetti + spaventato + si allontana." },
      { titolo: "Lentezza", testo: "Concentrazione, 1 min. Fino a 6 bersagli: velocità ÷2, -2 CA e TS DES, 1 azione O 1 azione bonus per turno." },
      { titolo: "Raggio di Luna", testo: "Concentrazione, 1 min. Colonna 1,5 m raggio. 2d10 radianti a chi entra. TS COS per dimezzare." },
    ]
  },
  {
    id: "riposi",
    label: "🌙 Riposi",
    colore: "#2c3e50",
    voci: [
      { titolo: "Riposo breve (1 ora)", testo: "Spendi Dadi Vita: tira e aggiungi mod. COS per recuperare PF. Alcune feature si ricaricano (es. Seconda Vita del Barbaro, Dissolvi Magie del Warlock)." },
      { titolo: "Riposo lungo (8 ore)", testo: "Recupera tutti i PF e metà dei Dadi Vita totali (min 1). Si recuperano slot incantesimo, feature giornaliere, 1 livello esaurimento." },
      { titolo: "Max 1 riposo lungo/24h", testo: "Non puoi beneficiare di più di un riposo lungo ogni 24 ore." },
      { titolo: "Interruzione riposo breve", testo: "Almeno 1 ora senza attività intensa. Combattere, lanciare incantesimi o marciare lo interrompe." },
      { titolo: "Interruzione riposo lungo", testo: "Se interrotto prima delle 8 ore: nessun beneficio. Puoi dormire e fare la guardia a turni purché si completino le 8 ore." },
      { titolo: "Dadi Vita", testo: "Pari al livello del personaggio. Tipo = dado PF della classe. Recuperi metà (arrotondato per difetto) dopo ogni riposo lungo." },
    ]
  },
  {
    id: "sorpresa",
    label: "⚡ Sorpresa & Iniziativa",
    colore: "#e74c3c",
    voci: [
      { titolo: "Sorpresa", testo: "Il DM decide chi è sorpreso all'inizio del combattimento. Di solito: prova di Furtività del gruppo nascosto vs Percezione passiva dei bersagli." },
      { titolo: "Round di sorpresa", testo: "Le creature sorprese non possono agire nel primo round (né azione, né azione bonus, né reazione). Possono muoversi." },
      { titolo: "Iniziativa", testo: "Tutti tirano 1d20 + mod. Destrezza. Il DM tira per gruppi di mostri identici (o singolarmente per maggior caos)." },
      { titolo: "Parità iniziativa", testo: "Tra PG: decidono loro l'ordine. Tra PNG: decide il DM. Tra PG e PNG: decide il DM o si ritira." },
      { titolo: "Ritardare il turno", testo: "Non è una regola ufficiale 5e, ma molti DM la usano: puoi scegliere di agire dopo nella stessa round, spostando la tua posizione nell'ordine." },
      { titolo: "Iniziativa passiva", testo: "Opzione casa: usa 10 + mod. DES invece di tirare, per velocizzare l'inizio del combattimento." },
    ]
  },
];


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

  const importedSpells = (() => {
    try { return JSON.parse(localStorage.getItem(userKey("dnd_imported_spells")) || "[]"); } catch { return []; }
  })();
  const allSpells = [...SPELLS_DB, ...importedSpells];

  const schools = [...new Set(allSpells.map(s => s.school).filter(Boolean))].sort();
  const classes = [...new Set(allSpells.flatMap(s => s.classes ? s.classes.split(",").map(c=>c.trim()) : []).filter(Boolean))].sort();

  const results = allSpells.filter(sp => {
    if (query && !sp.name.toLowerCase().includes(query.toLowerCase())) return false;
    if (levelFilter !== "" && sp.level !== parseInt(levelFilter)) return false;
    if (schoolFilter && sp.school !== schoolFilter) return false;
    if (classFilter && !(sp.classes || "").toLowerCase().includes(classFilter.toLowerCase())) return false;
    return true;
  });

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
          {importedSpells.length > 0 ? ` (+${importedSpells.length} imp.)` : ""}
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
          {results.map(sp => (
            <div key={sp.slug} onClick={()=>setSelected(selected?.slug===sp.slug ? null : sp)}
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

function App() {
  const [characters, setCharacters] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mainTab, setMainTab] = useState("characters");
  const [showRules, setShowRules] = useState(false); // "characters" | "combat" | "monsters"
  const [pendingCombatant, setPendingCombatant] = useState(null);
  const [showImport, setShowImport] = useState(false);
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

  useEffect(() => {
    if (!loading) saveData({ characters, activeId });
  }, [characters, activeId, loading]);

  // importedSpells and importedItems are saved to localStorage inside the import handler directly
  // No useEffect here — it would overwrite localStorage on mount with the initial (possibly empty) state

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
          <button className="btn btn-sm" style={{fontSize:"0.65rem",marginLeft:8}} onClick={()=>setShowRules(true)} title="Tabelle di riferimento">📋 Regole</button>
          <button className="btn btn-sm" style={{fontSize:"0.65rem",marginLeft:8}} onClick={()=>setShowImport(true)} title="Importa da 5e.tools">
            📥 Importa
          </button>
          <div className="header-tabs">
            <button className={`tab-btn ${mainTab === "characters" ? "active" : ""}`} onClick={() => setMainTab("characters")}>Personaggi</button>
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
