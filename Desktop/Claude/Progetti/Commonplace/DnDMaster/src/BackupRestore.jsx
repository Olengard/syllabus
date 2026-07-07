import React from "react";
import { markAllForPush, SYNC_STATE_KEYS } from "./sync.js";

// Backup/ripristino di TUTTI i dati locali dell'utente corrente (personaggi,
// mostri custom, import 5e.tools, combattimento, incontri, note, nomi salvati…).
// Paracadute prima di Supabase: localStorage è per-device e non sincronizza.
// NB: la cache del catalogo 5e.tools e l'indice mostri stanno in IndexedDB e si
// riscaricano da soli — non servono nel backup (sarebbero decine di MB).

const APP_TAG = "DnDMaster";

function download(filename, text) {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function humanBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function BackupModal({ user, onClose }) {
  const prefix = user ? `${user}__` : "";
  const fileRef = React.useRef(null);
  const [msg, setMsg] = React.useState(null);

  // Raccoglie le chiavi localStorage dell'utente corrente, salvandole SENZA il
  // prefisso utente: così un backup è ripristinabile anche in un altro account.
  const collect = React.useCallback(() => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (prefix && !k.startsWith(prefix)) continue;
      const plain = prefix ? k.slice(prefix.length) : k;
      if (plain === "dnd_auth_user" || plain === "dnd_auth_uid") continue; // l'auth è globale: mai nel backup
      if (SYNC_STATE_KEYS.includes(plain)) continue; // stato di sync: locale al device
      data[plain] = localStorage.getItem(k);
    }
    return data;
  }, [prefix]);

  // Riepilogo leggibile, calcolato una volta all'apertura.
  const summary = React.useMemo(() => {
    const data = collect();
    const len = (key) => { try { const v = JSON.parse(data[key]); return Array.isArray(v) ? v.length : 0; } catch { return 0; } };
    let personaggi = 0;
    try { personaggi = (JSON.parse(data["dnd5e-master-v1"])?.characters || []).length; } catch {}
    return {
      blocchi: Object.keys(data).length,
      bytes: Object.values(data).reduce((n, v) => n + (v ? v.length : 0), 0),
      righe: [
        ["Personaggi", personaggi],
        ["Mostri personalizzati", len("dnd_custom_monsters_v1")],
        ["Incantesimi importati", len("dnd_imported_spells")],
        ["Classi importate", len("dnd_imported_classes")],
        ["Incontri salvati", len("dnd_encounters_v2")],
        ["Nomi salvati", len("dnd_saved_names")],
      ],
    };
  }, [collect]);

  const doExport = () => {
    const data = collect();
    const payload = {
      app: APP_TAG, kind: "backup", version: 1,
      exportedAt: new Date().toISOString(), user: user || null, data,
    };
    const stamp = new Date().toISOString().slice(0, 10);
    download(`dndmaster-backup-${(user || "dati").toLowerCase()}-${stamp}.json`, JSON.stringify(payload));
    setMsg({ type: "ok", text: "Backup esportato nei Download." });
  };

  const onFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // consente di re-importare lo stesso file
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try { parsed = JSON.parse(reader.result); }
      catch { setMsg({ type: "err", text: "File illeggibile (JSON non valido)." }); return; }
      if (!parsed || parsed.app !== APP_TAG || typeof parsed.data !== "object" || !parsed.data) {
        setMsg({ type: "err", text: "Questo file non è un backup di DnDMaster." });
        return;
      }
      const keys = Object.keys(parsed.data);
      const from = parsed.user ? ` (da "${parsed.user}")` : "";
      const ok = window.confirm(
        `Ripristinare ${keys.length} blocchi di dati${from} nell'account "${user}"?\n\n` +
        `I dati attuali con le stesse chiavi verranno SOVRASCRITTI. ` +
        `Consigliato su un account vuoto o per ripristinare un backup.`
      );
      if (!ok) return;
      try {
        for (const [plain, value] of Object.entries(parsed.data)) {
          if (plain === "dnd_auth_user" || plain === "dnd_auth_uid") continue;
          if (SYNC_STATE_KEYS.includes(plain)) continue;
          if (typeof value !== "string") continue;
          localStorage.setItem(prefix + plain, value);
        }
        // I dati ripristinati diventano la verità: vanno ri-pushati tutti, e il
        // pull al reload non deve sovrascriverli (azzera la memoria di sync).
        markAllForPush();
      } catch {
        setMsg({ type: "err", text: "Errore nel ripristino (forse spazio locale insufficiente)." });
        return;
      }
      setMsg({ type: "ok", text: "Ripristino completato. Ricarico l'app…" });
      setTimeout(() => window.location.reload(), 900);
    };
    reader.readAsText(file);
  };

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div onClick={handleBackdrop} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 9200,
      display: "flex", alignItems: "center", justifyContent: "center", padding: 12,
    }}>
      <div style={{
        background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 10,
        width: "100%", maxWidth: 460, maxHeight: "88vh",
        display: "flex", flexDirection: "column", overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
      }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--gold)" }}>💾 Backup dei dati</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: "1.3rem", cursor: "pointer", lineHeight: 1, padding: "0 4px" }}>✕</button>
        </div>

        <div style={{ padding: "14px 16px", overflowY: "auto" }}>
          <p style={{ fontSize: "0.82rem", color: "var(--text2)", lineHeight: 1.6, marginBottom: 12 }}>
            Salva o ripristina tutti i tuoi dati dell'account <b>{user}</b> (personaggi,
            mostri, import, combattimento, incontri, note, nomi). Il catalogo 5e.tools
            non serve nel backup: si riscarica da solo.
          </p>

          {/* riepilogo */}
          <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px", marginBottom: 14 }}>
            {summary.righe.map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", lineHeight: 1.7 }}>
                <span style={{ color: "var(--text3)" }}>{label}</span>
                <span style={{ color: "var(--text)" }}>{val}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border)", color: "var(--text3)" }}>
              <span>{summary.blocchi} blocchi</span>
              <span>{humanBytes(summary.bytes)}</span>
            </div>
          </div>

          {/* azioni */}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={doExport}>⬇ Esporta backup</button>
            <button className="btn" style={{ flex: 1 }} onClick={() => fileRef.current?.click()}>⬆ Importa backup</button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} style={{ display: "none" }} />

          {msg && (
            <div style={{
              marginTop: 12, fontSize: "0.8rem", padding: "8px 10px", borderRadius: 6,
              color: msg.type === "err" ? "#f0a0a0" : "var(--green2)",
              background: msg.type === "err" ? "rgba(200,60,60,0.12)" : "rgba(78,158,98,0.12)",
              border: `1px solid ${msg.type === "err" ? "rgba(200,60,60,0.4)" : "rgba(78,158,98,0.4)"}`,
            }}>
              {msg.text}
            </div>
          )}

          <p style={{ fontSize: "0.72rem", color: "var(--text3)", lineHeight: 1.6, marginTop: 14 }}>
            ⚠ Il ripristino sovrascrive i dati esistenti con le stesse chiavi. L'import
            chiede conferma. Tieni il file <i>.json</i> al sicuro: contiene tutti i tuoi dati.
          </p>
        </div>
      </div>
    </div>
  );
}
