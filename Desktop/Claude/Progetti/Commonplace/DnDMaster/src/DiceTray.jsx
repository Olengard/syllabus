import React from "react";

// ─── Parser e tiratore di dadi ───────────────────────────────────────────────
// Supporta espressioni tipo "d20", "3d6+2", "2d8+1d6-1". Ritorna null se
// l'espressione non è valida (usato anche dalla palette ⌘K per riconoscerla).
export function parseDice(expr) {
  const s = (expr || "").toLowerCase().replace(/\s+/g, "");
  if (!s || !/^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/.test(s)) return null;
  if (!s.includes("d")) return null; // un numero secco non è un tiro
  const terms = [];
  const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const sign = m[1] === "-" ? -1 : 1;
    if (m[3] !== undefined) {
      const n = m[2] === "" ? 1 : parseInt(m[2]);
      const sides = parseInt(m[3]);
      if (n < 1 || n > 100 || sides < 2 || sides > 1000) return null; // limiti sani
      terms.push({ kind: "dice", sign, n, sides });
    } else {
      terms.push({ kind: "flat", sign, value: parseInt(m[4]) });
    }
  }
  return terms;
}

export function rollDice(expr) {
  const terms = parseDice(expr);
  if (!terms) return null;
  let total = 0;
  const parts = [];
  for (const t of terms) {
    if (t.kind === "dice") {
      const rolls = Array.from({ length: t.n }, () => 1 + Math.floor(Math.random() * t.sides));
      const sum = rolls.reduce((a, b) => a + b, 0);
      total += t.sign * sum;
      parts.push(`${t.sign < 0 ? "-" : ""}${t.n}d${t.sides} [${rolls.join(", ")}]`);
    } else {
      total += t.sign * t.value;
      parts.push(`${t.sign < 0 ? "-" : "+"}${t.value}`);
    }
  }
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    expr: expr.toLowerCase().replace(/\s+/g, ""),
    total,
    breakdown: parts.join(" "),
    at: Date.now(),
  };
}

// Vantaggio/svantaggio: 2d20, tieni il più alto/basso (+ eventuale bonus).
export function rollAdvantage(kind, bonus = 0) {
  const a = 1 + Math.floor(Math.random() * 20);
  const b = 1 + Math.floor(Math.random() * 20);
  const kept = kind === "adv" ? Math.max(a, b) : Math.min(a, b);
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    expr: kind === "adv" ? "vantaggio" : "svantaggio",
    total: kept + bonus,
    breakdown: `2d20 [${a}, ${b}] → ${kept}${bonus ? (bonus > 0 ? `+${bonus}` : bonus) : ""}`,
    at: Date.now(),
  };
}

const QUICK = [4, 6, 8, 10, 12, 20, 100];

// ─── Vassoio dadi flottante (visibile da ogni tab) ───────────────────────────
const MULTS = [1, 2, 3, 4, 5, 6, 8, 10];

export default function DiceTray({ history, onRoll, onClear }) {
  const [open, setOpen] = React.useState(false);
  const [expr, setExpr] = React.useState("");
  const [err, setErr] = React.useState(false);
  const [mult, setMult] = React.useState(1); // quanti dadi al tap (es. ×3 + d6 = 3d6)
  const inputRef = React.useRef(null);

  const doRoll = (e) => {
    const r = rollDice(e);
    if (!r) { setErr(true); return; }
    setErr(false);
    onRoll(r);
  };

  const submit = () => {
    if (!expr.trim()) return;
    doRoll(expr);
  };

  const last = history[0];

  return (
    <>
      {/* FAB — mostra anche l'ultimo risultato quando il vassoio è chiuso */}
      <button className="dice-fab" onClick={() => setOpen(o => !o)} title="Dadi (tira senza cambiare schermata)">
        🎲{!open && last && <span className="dice-fab-last">{last.total}</span>}
      </button>

      {open && (
        <div className="dice-tray">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: "0.72rem", color: "var(--gold)", letterSpacing: "0.06em" }}>🎲 DADI</span>
            <button onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--text2)", fontSize: "1.05rem", cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>

          {/* moltiplicatore: ×3 poi tap su d6 = 3d6 (resta attivo per ritirare) */}
          <div style={{ display: "flex", gap: 4, marginBottom: 6, alignItems: "center" }}>
            <span style={{ fontSize: "0.66rem", color: "var(--text3)", flexShrink: 0 }}>N°</span>
            {MULTS.map(m => (
              <button key={m} onClick={() => setMult(m)}
                style={{
                  flex: 1, minWidth: 0, padding: "3px 0", fontSize: "0.7rem", cursor: "pointer",
                  borderRadius: 5, lineHeight: 1.4,
                  border: `1px solid ${mult === m ? "var(--gold)" : "var(--border)"}`,
                  background: mult === m ? "var(--gold)" : "var(--surface2)",
                  color: mult === m ? "#1a1208" : "var(--text2)",
                  fontWeight: mult === m ? 700 : 400,
                }}>{m}</button>
            ))}
          </div>

          {/* dadi rapidi */}
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
            {QUICK.map(s => (
              <button key={s} className="btn btn-sm dice-quick-btn" style={{ flex: 1, minWidth: 36 }}
                onClick={() => doRoll(`${mult > 1 ? mult : ""}d${s}`)}>
                {mult > 1 ? `${mult}d${s}` : `d${s}`}
              </button>
            ))}
          </div>

          {/* vantaggio / svantaggio */}
          <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
            <button className="btn btn-sm" style={{ flex: 1, fontSize: "0.68rem", color: "var(--green2)" }}
              onClick={() => onRoll(rollAdvantage("adv"))}>⬆ Vantaggio</button>
            <button className="btn btn-sm" style={{ flex: 1, fontSize: "0.68rem", color: "var(--red2)" }}
              onClick={() => onRoll(rollAdvantage("dis"))}>⬇ Svantaggio</button>
          </div>

          {/* formula libera */}
          <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
            <input
              ref={inputRef}
              value={expr}
              onChange={e => { setExpr(e.target.value); setErr(false); }}
              onKeyDown={e => e.key === "Enter" && submit()}
              placeholder="es. 3d6+2"
              style={{ flex: 1, fontSize: "0.8rem", border: err ? "1px solid var(--red)" : undefined }}
            />
            <button className="btn btn-sm btn-primary" onClick={submit}>Tira</button>
          </div>

          {/* cronologia */}
          <div style={{ maxHeight: 180, overflowY: "auto" }}>
            {history.length === 0 && (
              <div style={{ fontSize: "0.72rem", color: "var(--text3)", textAlign: "center", padding: "10px 0" }}>
                Nessun tiro ancora.
              </div>
            )}
            {history.map((r, i) => (
              <div key={r.id} style={{
                display: "flex", alignItems: "baseline", gap: 8, padding: "4px 6px",
                borderRadius: 5, background: i === 0 ? "var(--surface3)" : "transparent",
              }}>
                <span style={{ fontSize: i === 0 ? "1.15rem" : "0.9rem", fontWeight: 700, color: i === 0 ? "var(--gold2)" : "var(--text)", minWidth: 30, textAlign: "right" }}>
                  {r.total}
                </span>
                <span style={{ fontSize: "0.7rem", color: "var(--text2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.expr} · {r.breakdown}
                </span>
              </div>
            ))}
          </div>
          {history.length > 0 && (
            <button onClick={onClear} style={{ background: "none", border: "none", color: "var(--text3)", fontSize: "0.66rem", cursor: "pointer", textDecoration: "underline", marginTop: 6, padding: 0 }}>
              svuota cronologia
            </button>
          )}
        </div>
      )}
    </>
  );
}
