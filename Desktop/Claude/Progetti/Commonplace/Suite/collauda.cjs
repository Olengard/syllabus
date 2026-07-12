#!/usr/bin/env node
/**
 * COMMONPLACE — Collaudo automatico della suite live (2026-07-12, Sessione #21)
 *
 * Verifica in un colpo solo che la produzione sia sana:
 *   - ogni app risponde 200
 *   - i service worker servono la versione attesa (il "deploy senza bump SW"
 *     è l'errore più frequente della storia del progetto)
 *   - gli endpoint API rifiutano richieste non autorizzate/invalide
 *     (401/400 attesi: un 200 qui = chiavi API esposte o auth rotta)
 *   - i gateway Supabase rispondono
 *   - il backup su GitHub è fresco (ultimo commit < 30h; richiede le
 *     credenziali git del PC di Stefano — altrove viene saltato con WARN)
 *
 * Uso:   node collauda.js            (tutto)
 *        node collauda.js --no-backup  (salta il check backup, ~2s più veloce)
 *
 * Quando aggiorni un SW (bump versione) AGGIORNA la costante SW_MIN qui sotto:
 * il collaudo controlla ">= versione minima", quindi un bump non rompe il
 * collaudo, ma alzare il minimo dopo il deploy rende il check significativo.
 *
 * Exit code = numero di FAIL (0 = tutto verde). I WARN non contano come FAIL.
 */

const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

// ── Aspettative (osservate live il 2026-07-12) ──────────────────────────────
const SW_MIN = { footnote: 28, listens: 13, marginalia: 1, bookshelf: 1, syllabus: 3 };

const CHECKS = [
  // [nome, url, metodo, body, status attesi]
  ["home", "https://commonplaceapp.org", "GET", null, [200]],
  ["bookshelf", "https://bookshelf.commonplaceapp.org", "GET", null, [200]],
  ["footnote", "https://footnote.commonplaceapp.org", "GET", null, [200]],
  ["listens", "https://listens.commonplaceapp.org", "GET", null, [200]],
  ["notes", "https://notes.commonplaceapp.org", "GET", null, [200]],
  ["dashboard", "https://dash.commonplaceapp.org", "GET", null, [200]],
  ["digest", "https://digest.commonplaceapp.org", "GET", null, [200]],
  ["ledger", "https://ledger.commonplaceapp.org", "GET", null, [200]],
  ["dndmaster", "https://dnd.commonplaceapp.org", "GET", null, [200]],
  ["marginalia", "https://marginalia.commonplaceapp.org", "GET", null, [200]],
  ["syllabus", "https://syllabus.commonplaceapp.org", "GET", null, [200]],
  // API: SENZA credenziali devono rifiutare. Un 200 qui è un ALLARME ROSSO.
  ["digest API auth", "https://digest.commonplaceapp.org/api/feeds", "GET", null, [401]],
  // Proxy AI: auth Supabase verificata PRIMA del body → un body anche vuoto senza
  // login deve dare 401 (non più 400: il 400 mascherava un body valido non autenticato).
  ["footnote proxy AI", "https://footnote.commonplaceapp.org/api/claude", "POST", "{}", [401]],
  ["listens proxy feed", "https://listens.commonplaceapp.org/api/feed", "GET", null, [400, 401]],
  ["notes trascrizione", "https://notes.commonplaceapp.org/api/transcribe", "POST", "{}", [401]],
  ["notes whisper", "https://notes.commonplaceapp.org/api/whisper", "POST", "{}", [401]],
  // Gateway Supabase: 401 "No API key" = il progetto è su e risponde.
  ["supabase pchld", "https://pchldmiavycxzpkzochn.supabase.co/rest/v1/", "GET", null, [401]],
  ["supabase bogav (Ledger)", "https://bogavweypmgyxwmdpsqm.supabase.co/rest/v1/", "GET", null, [401]],
];

// SW vite-plugin-pwa (autoUpdate, nessuna versione manuale): basta il 200.
const SW_VITE = ["notes", "ledger", "dnd"];

const BACKUP_REPO = "https://github.com/Olengard/commonplace-backups.git";
const BACKUP_MAX_ORE = 30; // cron alle 5:00 UTC: >30h = ha saltato un giro

// ── Helpers ─────────────────────────────────────────────────────────────────
// NB: execSync su Windows passa da cmd.exe → il "buco nero" è NUL, non /dev/null
const NULLDEV = process.platform === "win32" ? "NUL" : "/dev/null";
function curl(url, method = "GET", body = null, timeout = 20) {
  let cmd = `curl -s -o ${NULLDEV} -w "%{http_code}" --max-time ${timeout} -X ${method}`;
  if (body) cmd += ` -H "Content-Type: application/json" -d "${body.replace(/"/g, '\\"')}"`;
  cmd += ` "${url}"`;
  try { return parseInt(execSync(cmd, { timeout: (timeout + 5) * 1000 }).toString().trim(), 10); }
  catch { return 0; } // 0 = irraggiungibile/timeout
}
function curlBody(url, timeout = 15) {
  try { return execSync(`curl -s --max-time ${timeout} "${url}"`, { timeout: (timeout + 5) * 1000 }).toString(); }
  catch { return ""; }
}

let fails = 0, warns = 0;
const pad = (s, n) => (s + " ".repeat(n)).slice(0, n);
function ok(nome, dettaglio) { console.log(`  OK    ${pad(nome, 26)} ${dettaglio}`); }
function fail(nome, dettaglio) { fails++; console.log(`  FAIL  ${pad(nome, 26)} ${dettaglio}`); }
function warn(nome, dettaglio) { warns++; console.log(`  WARN  ${pad(nome, 26)} ${dettaglio}`); }

// ── 1. App e API ────────────────────────────────────────────────────────────
console.log("\n═══ Collaudo Commonplace — " + new Date().toLocaleString("it-IT") + " ═══\n");
console.log("── App e API live ──");
for (const [nome, url, metodo, body, attesi] of CHECKS) {
  const code = curl(url, metodo, body);
  if (attesi.includes(code)) ok(nome, `${code}`);
  else fail(nome, `atteso ${attesi.join("/")}, ricevuto ${code}${code === 200 && attesi[0] !== 200 ? "  ⚠️ ENDPOINT APERTO?" : ""}`);
}

// ── 2. Service worker ───────────────────────────────────────────────────────
console.log("\n── Service worker (versione minima) ──");
for (const [app, vmin] of Object.entries(SW_MIN)) {
  const body = curlBody(`https://${app}.commonplaceapp.org/sw.js`);
  const m = body.match(new RegExp(`${app}-v(\\d+)`));
  if (!m) { fail(`sw ${app}`, "versione non trovata in sw.js"); continue; }
  const v = parseInt(m[1], 10);
  if (v >= vmin) ok(`sw ${app}`, `v${v} (min v${vmin})`);
  else fail(`sw ${app}`, `v${v} SOTTO il minimo v${vmin}: deploy vecchio servito?`);
}
for (const app of SW_VITE) {
  const host = app === "dnd" ? "dnd.commonplaceapp.org" : `${app}.commonplaceapp.org`;
  const code = curl(`https://${host}/sw.js`);
  if (code === 200) ok(`sw ${app} (vite-pwa)`, "200");
  else fail(`sw ${app} (vite-pwa)`, `sw.js risponde ${code}`);
}

// ── 3. Backup freschezza ────────────────────────────────────────────────────
if (!process.argv.includes("--no-backup")) {
  console.log("\n── Backup (repo privato GitHub) ──");
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cpb-check-"));
  try {
    execSync(`git clone --depth 1 --no-checkout --filter=blob:none -q "${BACKUP_REPO}" "${tmp}"`, { timeout: 60000 });
    const iso = execSync(`git -C "${tmp}" log -1 --format=%cI`).toString().trim();
    const ore = (Date.now() - new Date(iso).getTime()) / 3.6e6;
    if (ore <= BACKUP_MAX_ORE) ok("backup", `ultimo commit ${ore.toFixed(1)}h fa (${iso.slice(0, 10)})`);
    else fail("backup", `ultimo commit ${ore.toFixed(0)}h fa: il cron ha saltato? (max ${BACKUP_MAX_ORE}h)`);
  } catch (e) {
    warn("backup", "repo non raggiungibile da questa macchina (servono le credenziali git di Stefano)");
  } finally {
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
  }
}

// ── Esito ───────────────────────────────────────────────────────────────────
console.log(`\n═══ Esito: ${fails === 0 ? "TUTTO VERDE ✅" : fails + " FAIL ❌"}${warns ? ` (${warns} warn)` : ""} ═══\n`);
process.exit(fails);
