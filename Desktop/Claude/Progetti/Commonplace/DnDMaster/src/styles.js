// Foglio di stile globale dell'app (template string iniettata da App).
// ─── Styles ───────────────────────────────────────────────────────────────────
export const styles = `
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

    /* Header su due righe: titolo+azioni sopra, tab sotto a tutta larghezza
       (scorrevoli in orizzontale se non entrano) */
    .header { flex-wrap: wrap; row-gap: 8px; padding-bottom: 8px; }
    .header-tabs {
      gap: 4px;
      width: 100%; order: 10;
      overflow-x: auto; overflow-y: hidden;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: none;
    }
    .header-tabs::-webkit-scrollbar { display: none; }
    .tab-btn { white-space: nowrap; flex-shrink: 0; }

    /* Lo spazio di lavoro usa tutta la larghezza del tablet */
    .main { max-width: none; }
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
  /* Bottoni del vassoio dadi: compatti e centrati anche col bump tablet
     (che imposta padding/min-height dei .btn con !important) */
  .dice-tray .btn {
    display: flex; align-items: center; justify-content: center;
    padding: 8px 4px !important;
    min-height: 38px !important;
    font-size: 0.74rem !important;
    white-space: nowrap;
  }

  @media (max-width: 768px) {
    .dice-fab  { bottom: 68px; }
    .dice-tray { bottom: 122px; }
  }

`;
