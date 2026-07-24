import React from "react";
import { supabase } from "./supabaseClient.js";
import { createSharedSync } from "./sharedSync.js";
import { diffAdmin, applyAccepted, adminHash, hasPendingAdmin, diffPrestige, mergePlayerPrestige } from "./sharedChar.js";
import { K, loadJSON, saveJSON } from "./storage.js";

// Tab 🤝 Tavolo: schede condivise coi giocatori (blocco 3c).
// Due ruoli nella stessa pagina (un utente può essere sia master sia giocatore):
//  • Giocatore: entra in campagna col join-code, cura le schede che il master gli
//    ha assegnato (riusa la CharacterSheet via renderSheet). Le modifiche tornano
//    al master nella riga condivisa (vitali live + amministrativo).
//  • Master: crea campagne, vede i membri, ASSEGNA un PG del suo roster, e per
//    ogni scheda condivisa vede i vitali live (sola lettura) e un pannello
//    diff/accept per l'amministrativo. La copia del master resta la verità.
// Tutto il trasporto è in sharedSync.js (RLS = sicurezza); qui solo la UI.

const shared = createSharedSync(supabase);

const rowKey = (r) => `${r.campaign_id}/${r.player_uid}/${r.char_id}`;
const loadSeen = () => loadJSON(K.sharedSeen, {}) || {};
const saveSeen = (map) => saveJSON(K.sharedSeen, map);

// ── Riquadro vitali (live, sola lettura per il master) ───────────────────────
function VitaliView({ char }) {
  const c = char || {};
  const spent = Object.entries(c.usedSpellSlots || {}).filter(([, n]) => n > 0);
  const ds = c.deathSaves || { successes: 0, failures: 0 };
  const hasDeath = ds.successes || ds.failures;
  const conds = c.conditions || [];
  const hdLeft = c.level != null ? Math.max(0, c.level - (c.hitDiceUsed || 0)) : null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", fontSize: "0.78rem", color: "var(--text2)" }}>
      <span title="Punti ferita">❤️ <b>{c.currentHp ?? "—"}</b>{c.maxHp ? ` / ${c.maxHp}` : ""}</span>
      {c.tempHp ? <span title="PF temporanei">🛡 +{c.tempHp}</span> : null}
      {hdLeft != null ? <span title="Dadi vita rimasti">🎲 {hdLeft}/{c.level}</span> : null}
      {c.inspiration ? <span title="Ispirazione">⭐</span> : null}
      {spent.length > 0 && (
        <span title="Slot incantesimo spesi">🔮 {spent.map(([lv, n]) => `L${lv}:${n}`).join(" ")}</span>
      )}
      {hasDeath ? <span title="Tiri salvezza contro morte">💀 {ds.successes}✓/{ds.failures}✗</span> : null}
      {conds.map((cond) => (
        <span key={cond} style={{ fontSize: "0.7rem", padding: "1px 7px", borderRadius: 10, background: "var(--red2, #c0392b)", color: "#fff" }}>{cond}</span>
      ))}
    </div>
  );
}

// ── Pannello diff/accept amministrativo (master) ─────────────────────────────
function DiffPanel({ rosterChar, sharedChar, onAccept, onIgnore, onClose }) {
  const diffAmm = React.useMemo(() => diffAdmin(rosterChar, sharedChar), [rosterChar, sharedChar]);
  // Il prestigio ha un canale suo: si confronta per ID e si etichetta col nome
  // VERO (il master deve leggere «Clero», non l'alias che vede il giocatore).
  // Le voci nascoste non compaiono: non sono modificabili da chi non le vede.
  const diffPrest = React.useMemo(
    () => diffPrestige(rosterChar?.prestige, sharedChar?.prestige).map((p) => ({
      field: `prestige:${p.id}`, kind: "prestige",
      label: `🏛 ${p.name}`, summary: `${p.before} → ${p.after}`,
    })),
    [rosterChar, sharedChar],
  );
  const diff = React.useMemo(() => [...diffAmm, ...diffPrest], [diffAmm, diffPrest]);
  // Check per campo, tutti spuntati di default (deselezionabili).
  const [checked, setChecked] = React.useState(() => new Set(diff.map((d) => d.field)));
  const toggle = (f) => setChecked((s) => { const n = new Set(s); n.has(f) ? n.delete(f) : n.add(f); return n; });

  if (diff.length === 0) {
    return (
      <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginTop: 8 }}>
        <div style={{ color: "var(--text3)", fontSize: "0.82rem" }}>Nessuna differenza amministrativa: la tua copia è già allineata.</div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button className="btn btn-sm" onClick={onClose}>Chiudi</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, marginTop: 8 }}>
      <div style={{ fontSize: "0.72rem", color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        Aggiornamento dal giocatore — spunta i campi da accettare
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {diff.map((d) => (
          <label key={d.field} style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 8, fontSize: "0.82rem", textTransform: "none", letterSpacing: "normal", cursor: "pointer" }}>
            <input type="checkbox" checked={checked.has(d.field)} onChange={() => toggle(d.field)} style={{ flex: "0 0 auto", width: 16, height: 16, margin: 0 }} />
            <span style={{ flex: "0 0 130px", fontWeight: 600 }}>{d.label || d.field}</span>
            <span style={{ color: "var(--text2)" }}>
              {d.kind === "array" ? `📦 ${d.summary} oggetti` : d.kind === "portrait" ? "🖼 ritratto cambiato" : d.kind === "object" ? "modificato" : d.summary}
            </span>
          </label>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}>
        <button className="btn btn-sm" onClick={onClose}>Annulla</button>
        <button className="btn btn-sm" onClick={onIgnore} title="Nascondi il badge finché il giocatore non modifica di nuovo">Ignora</button>
        <button className="btn btn-sm btn-primary" onClick={() => onAccept([...checked])} disabled={checked.size === 0}>
          Accetta selezionati ({checked.size})
        </button>
      </div>
    </div>
  );
}

// ── Pannello Master ──────────────────────────────────────────────────────────
function MasterPanel({ uid, characters, onUpdateChar }) {
  const [campaigns, setCampaigns] = React.useState([]);
  const [sel, setSel] = React.useState(null);          // campagna selezionata
  const [members, setMembers] = React.useState([]);
  const [rows, setRows] = React.useState([]);          // schede condivise della campagna
  const [newName, setNewName] = React.useState("");
  const [assignMember, setAssignMember] = React.useState("");
  const [assignChar, setAssignChar] = React.useState("");
  const [diffFor, setDiffFor] = React.useState(null);  // rowKey aperto nel diff
  const [msg, setMsg] = React.useState("");
  const [seenTick, setSeenTick] = React.useState(0);   // forza il ricalcolo badge dopo saveSeen

  const refreshCampaigns = React.useCallback(async () => {
    try { setCampaigns(await shared.listMyCampaigns(uid)); } catch (e) { setMsg(e.message); }
  }, [uid]);

  const refreshSel = React.useCallback(async (campaignId) => {
    if (!campaignId) return;
    try {
      const [m, r] = await Promise.all([shared.listMembers(campaignId), shared.listSharedForMaster(campaignId)]);
      setMembers(m); setRows(r);
    } catch (e) { setMsg(e.message); }
  }, []);

  React.useEffect(() => { refreshCampaigns(); }, [refreshCampaigns]);
  React.useEffect(() => { if (sel) refreshSel(sel.id); }, [sel, refreshSel]);

  // Realtime: vitali/badge live sulla campagna selezionata, senza refresh.
  React.useEffect(() => {
    if (!sel) return;
    const unsub = shared.subscribeSharedForMaster(sel.id, () => refreshSel(sel.id));
    return unsub;
  }, [sel, refreshSel]);

  const createCampaign = async () => {
    const name = newName.trim(); if (!name) return;
    try { const c = await shared.createCampaign(name); setNewName(""); await refreshCampaigns(); setSel(c); }
    catch (e) { setMsg(e.message); }
  };

  const assign = async () => {
    if (!assignMember || !assignChar) return;
    const c = characters.find((x) => String(x.id) === assignChar);
    if (!c) return;
    try {
      await shared.seedSharedChar(sel.id, assignMember, c.id, c);
      setAssignChar(""); setMsg(`Assegnato «${c.name}».`); await refreshSel(sel.id);
    } catch (e) { setMsg(e.message); }
  };

  const unassign = async (r) => {
    if (!confirm("Ritirare questa scheda condivisa? La copia del giocatore verrà rimossa.")) return;
    try { await shared.deleteSharedChar(r.campaign_id, r.player_uid, r.char_id); await refreshSel(sel.id); }
    catch (e) { setMsg(e.message); }
  };

  // Ri-invia al giocatore nomi/alias/visibilità della reputazione dalla copia di
  // roster del master (i suoi valori restano). Serve dopo aver cambiato un alias
  // o nascosto una voce: il seed li applica solo all'assegnazione.
  const refreshRep = async (r) => {
    const rosterChar = characters.find((c) => String(c.id) === r.char_id);
    if (!rosterChar) return;
    try {
      await shared.refreshSharedPrestige(r.campaign_id, r.player_uid, r.char_id, rosterChar);
      setMsg(`Reputazione aggiornata per il giocatore su «${r.char?.name || rosterChar.name}».`);
      await refreshSel(sel.id);
    } catch (e) { setMsg(e.message); }
  };

  const seen = loadSeen();
  const memberName = (puid) => members.find((m) => m.player_uid === puid)?.display_name || puid.slice(0, 8);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Crea / seleziona campagna */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={sel?.id || ""} onChange={(e) => setSel(campaigns.find((c) => c.id === e.target.value) || null)} style={{ minWidth: 180 }}>
          <option value="">— scegli una campagna —</option>
          {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input placeholder="Nuova campagna…" value={newName} onChange={(e) => setNewName(e.target.value)} style={{ width: 170 }} />
        <button className="btn btn-sm btn-primary" onClick={createCampaign} disabled={!newName.trim()}>+ Crea</button>
      </div>

      {sel && (
        <>
          {/* Join code + membri */}
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>Codice d'ingresso:</span>
              <code style={{ fontSize: "1rem", letterSpacing: "0.12em", background: "var(--surface)", padding: "2px 8px", borderRadius: 4 }}>{sel.join_code}</code>
              <button className="btn btn-sm" onClick={() => { try { navigator.clipboard?.writeText(sel.join_code); setMsg("Codice copiato."); } catch {} }}>Copia</button>
              <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>Passalo ai giocatori fuori dall'app; loro entrano dalla vista Giocatore.</span>
            </div>
            <div style={{ marginTop: 8, fontSize: "0.8rem", color: "var(--text2)" }}>
              Membri: {members.length === 0 ? <i>nessuno ancora — attendi che entrino col codice.</i> : members.map((m) => m.display_name || m.player_uid.slice(0, 8)).join(", ")}
            </div>
          </div>

          {/* Assegna un PG del roster */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>Assegna PG:</span>
            <select value={assignMember} onChange={(e) => setAssignMember(e.target.value)} style={{ minWidth: 150 }}>
              <option value="">— giocatore —</option>
              {members.map((m) => <option key={m.player_uid} value={m.player_uid}>{m.display_name || m.player_uid.slice(0, 8)}</option>)}
            </select>
            <select value={assignChar} onChange={(e) => setAssignChar(e.target.value)} style={{ minWidth: 150 }}>
              <option value="">— personaggio del roster —</option>
              {characters.map((c) => <option key={c.id} value={String(c.id)}>{c.name}{c.level ? ` (Lv${c.level})` : ""}</option>)}
            </select>
            <button className="btn btn-sm btn-primary" onClick={assign} disabled={!assignMember || !assignChar}>Assegna</button>
          </div>

          {/* Schede condivise */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rows.length === 0 && <div style={{ color: "var(--text3)", fontSize: "0.82rem" }}>Nessuna scheda condivisa in questa campagna.</div>}
            {rows.map((r) => {
              const rosterChar = characters.find((c) => String(c.id) === r.char_id);
              const pending = rosterChar ? hasPendingAdmin(rosterChar, r.char, seen[rowKey(r)]) : false;
              const key = rowKey(r);
              return (
                <div key={key} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <b style={{ fontSize: "0.9rem" }}>{r.char?.name || "(senza nome)"}</b>
                    <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>giocatore: {memberName(r.player_uid)}</span>
                    {pending && (
                      <button className="btn btn-sm" style={{ background: "var(--gold)", color: "var(--bg)" }}
                        onClick={() => setDiffFor(diffFor === key ? null : key)}>📬 aggiornamento</button>
                    )}
                    {!pending && rosterChar && (
                      <button className="btn btn-sm" onClick={() => setDiffFor(diffFor === key ? null : key)}>Confronta</button>
                    )}
                    {!rosterChar && <span style={{ fontSize: "0.72rem", color: "var(--red2)" }}>⚠ il PG non è più nel tuo roster</span>}
                    {rosterChar && (
                      <button className="btn btn-sm"
                        title="Ri-invia al giocatore nomi, alias e visibilità della reputazione (i suoi valori restano invariati)"
                        onClick={() => refreshRep(r)}>🏛 Aggiorna reputazione</button>
                    )}
                    <button className="btn btn-sm btn-danger" style={{ marginLeft: "auto" }} onClick={() => unassign(r)}>Ritira</button>
                  </div>
                  <div style={{ marginTop: 8 }}><VitaliView char={r.char} /></div>
                  {diffFor === key && rosterChar && (
                    <DiffPanel
                      rosterChar={rosterChar}
                      sharedChar={r.char}
                      onClose={() => setDiffFor(null)}
                      onIgnore={() => { const s = loadSeen(); s[key] = adminHash(r.char); saveSeen(s); setSeenTick((t) => t + 1); setDiffFor(null); }}
                      onAccept={(fields) => {
                        // Due canali: i campi amministrativi passano da
                        // applyAccepted; le voci di prestigio (`prestige:<id>`)
                        // da mergePlayerPrestige, che riconcilia per ID e non
                        // tocca mai le voci nascoste o i nomi veri.
                        const idsPrestigio = fields
                          .filter((f) => f.startsWith("prestige:"))
                          .map((f) => f.slice("prestige:".length));
                        const campiAmm = fields.filter((f) => !f.startsWith("prestige:"));
                        let updated = applyAccepted(rosterChar, r.char, campiAmm);
                        if (idsPrestigio.length) {
                          const proposte = (r.char.prestige || [])
                            .filter((e) => idsPrestigio.includes(String(e.id)));
                          updated = { ...updated, prestige: mergePlayerPrestige(rosterChar.prestige, proposte) };
                        }
                        onUpdateChar(updated);
                        const s = loadSeen(); s[key] = adminHash(r.char); saveSeen(s); setSeenTick((t) => t + 1);
                        setDiffFor(null); setMsg(`Accettati ${fields.length} campi su «${updated.name}».`);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
      {msg && <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>{msg}</div>}
      <span style={{ display: "none" }}>{seenTick}</span>
    </div>
  );
}

// ── Pannello Giocatore ───────────────────────────────────────────────────────
function PlayerPanel({ uid, renderSheet }) {
  const [rows, setRows] = React.useState([]);
  const [campNames, setCampNames] = React.useState({});
  const [code, setCode] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [msg, setMsg] = React.useState("");
  const [editing, setEditing] = React.useState(null);  // { row, char }
  const [saveState, setSaveState] = React.useState("");
  const timer = React.useRef(null);

  const refresh = React.useCallback(async () => {
    try {
      const [r, camps] = await Promise.all([shared.listSharedForMe(uid), shared.listVisibleCampaigns()]);
      setRows(r);
      setCampNames(Object.fromEntries(camps.map((c) => [c.id, c.name])));
    } catch (e) { setMsg(e.message); }
  }, [uid]);

  React.useEffect(() => { refresh(); }, [refresh]);

  const join = async () => {
    const c = code.trim(); if (!c) return;
    try { const res = await shared.joinCampaign(c, displayName.trim() || null); setCode(""); setMsg(`Entrato in «${res.campaignName}».`); await refresh(); }
    catch (e) { setMsg(e.message); }
  };

  // Modifica di una scheda condivisa: aggiorna lo stato locale e pusha la riga
  // (debounce 800ms — vitali+amministrativo viaggiano insieme).
  const onSheetChange = (updated) => {
    setEditing((ed) => ed && { ...ed, char: updated });
    setSaveState("salvataggio…");
    clearTimeout(timer.current);
    const row = editing.row;
    timer.current = setTimeout(async () => {
      try { await shared.upsertMySharedChar(row.campaign_id, uid, row.char_id, updated); setSaveState("salvato ✓"); }
      catch (e) { setSaveState("errore di salvataggio"); setMsg(e.message); }
    }, 800);
  };

  const closeEditor = async () => {
    clearTimeout(timer.current);
    // flush finale prima di chiudere
    if (editing) { try { await shared.upsertMySharedChar(editing.row.campaign_id, uid, editing.row.char_id, editing.char); } catch {} }
    setEditing(null); setSaveState(""); refresh();
  };

  if (editing) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-sm" onClick={closeEditor}>← Torna alle schede</button>
          <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{campNames[editing.row.campaign_id] || ""}</span>
          <span style={{ fontSize: "0.72rem", color: "var(--text3)", marginLeft: "auto" }}>{saveState}</span>
        </div>
        {renderSheet(editing.char, onSheetChange)}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Entra in campagna */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--text3)" }}>Entra in campagna:</span>
        <input placeholder="Codice" value={code} onChange={(e) => setCode(e.target.value)} style={{ width: 120, letterSpacing: "0.1em" }} />
        <input placeholder="Il tuo nome (opz.)" value={displayName} onChange={(e) => setDisplayName(e.target.value)} style={{ width: 150 }} />
        <button className="btn btn-sm btn-primary" onClick={join} disabled={!code.trim()}>Entra</button>
      </div>

      {/* Le mie schede condivise */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.length === 0 && <div style={{ color: "var(--text3)", fontSize: "0.82rem" }}>Nessuna scheda assegnata. Entra in una campagna e attendi che il master te ne assegni una.</div>}
        {rows.map((r) => (
          <div key={rowKey(r)} style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <b style={{ fontSize: "0.9rem" }}>{r.char?.name || "(senza nome)"}</b>
            {r.char?.level ? <span style={{ fontSize: "0.72rem", opacity: 0.6 }}>Lv{r.char.level}</span> : null}
            <span style={{ fontSize: "0.72rem", color: "var(--text3)" }}>{campNames[r.campaign_id] || ""}</span>
            <button className="btn btn-sm btn-primary" style={{ marginLeft: "auto" }} onClick={() => setEditing({ row: r, char: r.char })}>Apri scheda</button>
          </div>
        ))}
      </div>
      {msg && <div style={{ fontSize: "0.76rem", color: "var(--text3)" }}>{msg}</div>}
    </div>
  );
}

// ── Pagina ───────────────────────────────────────────────────────────────────
export default function SharedTablePage({ uid, characters, onUpdateChar, renderSheet }) {
  const [role, setRole] = React.useState("player"); // player | master
  if (!uid) return <div className="section" style={{ padding: 16, color: "var(--text3)" }}>Accedi per usare le schede condivise.</div>;
  return (
    <div className="section" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "auto", padding: 16, gap: 14 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button className={`btn btn-sm ${role === "player" ? "btn-primary" : ""}`} onClick={() => setRole("player")}>🎲 Giocatore</button>
        <button className={`btn btn-sm ${role === "master" ? "btn-primary" : ""}`} onClick={() => setRole("master")}>👑 Master</button>
      </div>
      {role === "player"
        ? <PlayerPanel uid={uid} renderSheet={renderSheet} />
        : <MasterPanel uid={uid} characters={characters} onUpdateChar={onUpdateChar} />}
    </div>
  );
}
