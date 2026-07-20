# Commonplace — Piano di lavoro

> Ultimo aggiornamento: **2026-07-20 — Sessione #27** (il piano di aprile resta
> in coda come archivio). Fonte di verità sullo STATO è `Commonplace.md` (header + diario);
> questo file elenca solo le PRIORITÀ. Regole operative: MANUALE-OPERATIVO.md + skill in
> `.claude/skills/`. Priorità ratificate (#20): 1) manutenzione/bugfix, 2) sprint build.
>
> **▶ DnDMaster è CHIUSO (2026-07-20, #27)**: schede condivise complete e live, Combat
> Tracker auto-popolato dai vitali, code aperte chiuse. Non è più una priorità — quel che
> resta (loot tables, Capacitor) sta nei punti 5-6 come lavoro opzionale. **Le prossime
> sessioni tornano sul resto di Commonplace: si riparte dal punto 3.**

## Stato per app (sintesi al 2026-07-17 — verifica sempre con `node Suite/collauda.cjs`)

| App | Stato |
|---|---|
| BookShelf, Footnote (SW v28), ListenS (v13), NoteS, Marginalia, Home | ✅ live; proxy AI protetti (#21) |
| Digest | ✅ Vercel+Supabase (`DigestV/`), migrato #21 |
| Dashboard | ✅ login suite, su pchld (#21) |
| Syllabus | ✅ v5 — incidente chiave chiuso (#21) |
| **Platea** | ✅ **migrata a pchld 7/7** (#21-22), build d065eef6 collaudata |
| DnDMaster | ✅ **CHIUSO #27** — 2B + schede condivise coi giocatori (tab 🤝 Tavolo) + Combat Tracker dai vitali; 186 test |
| Ledger | ✅ funzionante — backup ATTIVO dal 2026-07-18 (verifica primo giro: backup del 19/07 con `projects.bogav`) |
| ReadS | 🔶 staged: build EAS da lanciare |

## Priorità (2026-07-17)

1. ~~**[Stefano — minuti]** Chiusure Fase 7: pausa progetto llv, env `SUPABASE_LLV_SERVICE_KEY`
   via da cp-backup, dismissione cron-job.org + sospensione Render (~26/07), verifica
   backup del giorno dopo.~~ → ✅ **FATTE (Stefano, 2026-07-19)**: llv **in pausa —
   verificato** (REST HTTP 000, vs pchld 401), env llv rimossa da cp-backup, cron-job.org
   dismesso; Render `digest-blqp` ora dorme (503, ping rimosso) — **sospensione formale
   ancora slated ~26/07**. Ancora aperti (minori, non-chiusura): categorie feed Digest da
   riassegnare, una generazione da loggato nelle 4 app AI.
2. ~~Backup Ledger (bogav)~~ ✅ **FATTO 2026-07-18**: env impostata da Stefano, 11 tabelle
   in backup.js, deployato, RIPRISTINO.md con la procedura Ledger trigger-aware
   (disable trigger user → ripristino → enable + trigger_tests.sql). ~~⚠️ Verifica del
   19/07: il backup deve avere `projects.bogav.transactions` (70 righe al 18/07).~~
   ✅ **verificato 2026-07-19** (Opus): `backup-2026-07-19.json` ha `projects.bogav`
   con le 11 tabelle Ledger — `transactions` 70 righe, zero tabelle in errore; il 18/07
   non ha ancora `bogav` (il 19 è il primo). Nota: la env sorgente è
   `SUPABASE_BOGAV_SERVICE_KEY` (in `backup.js`), non `LLV`.
3. **GIRO DI DEBUG: Syllabus, Footnote, ListenS** — 🔶 **fatto a metà (#28, 2026-07-20)**.
   Syllabus e Footnote fatti, su tre richieste concrete di Stefano che hanno avuto la
   precedenza sull'ispezione sistematica: bottone «Completa scheda» riparato (era cieco su
   5 sezioni su 11) + menu di rigenerazione a spunte in Footnote; risorse «già note» e
   progressione a tappe in Syllabus. ⚠️ **Committati ma NON deployati** (Footnote SW v29,
   Syllabus SW v6): al deploy alzare anche `SW_MIN` in `Suite/collauda.cjs`.
   → **RESTA: ListenS** — il giro di debug e la valutazione del miglioramento generale.
   → **DA DECIDERE: i tre bug latenti di Syllabus** trovati in #28 (tabella `sl_resources`
   morta, `updateCurriculum` con chiavi non-colonna, `supabase-migration.sql` obsoleto):
   nessuno visibile oggi, dettaglio e opzioni in coda a `Commonplace.md`.
4. **[Claude/insieme] Ledger push notifications** (pre-APK, architetturalmente delicata).
   L'**export CSV/PDF** invece è adatto a Opus.
5. **Sprint build**: ReadS (EAS, pronto da marzo); prossima build Platea quando il lotto
   è maturo (in coda: resume archive GIÀ nel codice, avviso categoria AdminScreen,
   sync per-canale dal pulsante admin); Capacitor DnD (dopo loot tables) e Ledger (dopo 4).
6. **[Opus-friendly]** Loot tables DnDMaster; export Ledger; pulizie (commenti llv
   stantii in NoteS, decidere il vecchio TODO "Tag Vault UI"); test manuali della
   checklist pre-build (input strani, offline).
7. **Chiusura periodo Fable**: passata finale di handover per Opus (questo file +
   Commonplace.md + eventuale diario).

---

# ARCHIVIO — Piano di aprile 2026 (storico, Sessione #11)

---

## Stato attuale (al 2026-04-09)

| App | Stato | Note |
|---|---|---|
| BookShelf | ✅ Funzionante | Scrive su Supabase `bs_books` |
| Footnote | ✅ Funzionante | SW v26, fix cross-origin, fix podcast/film in risorse |
| ListenS | ✅ Funzionante | SW v12, Android Auto, stall recovery, header compatto |
| NoteS | ✅ Funzionante | Fix audio journal (scheduleSave + DOM sync), deploy |
| Dashboard | ✅ v2 live | Supabase, dati reali cp_items/cp_log, deploy ok |
| Platea | 🔶 Staged | Rating UI aggiunto (modal 5★), pronto per build |
| ReadS | ✅ Staged | Pronto per build EAS |
| Ledger | ✅ Funzionante | Capacitor APK pronto |
| DnD Master | 🔶 Staged | Build non urgente |

---

## Prossime sessioni

### Priorità alta

| # | Task | Note |
|---|---|---|
| 1 | ~~**Dashboard v2**~~ | ✅ Sessione #11 — Supabase live su dash.commonplaceapp.org |
| 2 | **Testing completo suite** — BookShelf, ListenS, Footnote, interazioni cross-app | Flusso completo da mobile e desktop |
| 3 | ~~**Platea**~~ — watch tracker + rating + integrazione `cp_items` | ✅ Sessione #11 — rating modal 5★ staged |

### Priorità media

| # | Task | Note |
|---|---|---|
| 4 | **cp-tags.js** — utility Tag Vault (autocomplete + fuzzy warning) | Condivisa tra app |
| 5 | ~~**NoteS**~~ — campo `item_id` + `cp_log` 'noted' + UI "Collega a item" | ✅ Sessione #11 — deploy ok |

### Completati sessione #11
- ✅ Dashboard v2 — Supabase live
- ✅ Platea rating modal — staged (build sprint 13/4)
- ✅ ListenS — pulsante "Esporta JSON" (⬇ header), SW v13
- ✅ NoteS — cp_log 'noted' su Supabase + campo item_id + UI "Collega a item" nel toolbar

### Calendario sprint

| Data | Task |
|---|---|
| entro 13/4 | Test suite (BookShelf, ListenS, Footnote, cross-app) |
| entro 13/4 | **Ledger** — notifiche push + export CSV/PDF |
| entro 13/4 | DnD Master / Digest (se tempo) |
| **14/4** | Checklist sicurezza (ErrorBoundary, localStorage try/catch, isolamento utente DnD, Digest secret_key) |
| **14/4** | Build sprint: ReadS (EAS) → Platea (EAS) → Ledger (Capacitor APK) → verifica post-build |

### Priorità medio-bassa — Migrazione ListenS su Supabase

ListenS usa attualmente localStorage (singolo dispositivo, telefono). La migrazione a Supabase
è utile solo per sync cross-device; non è urgente, ma va fatta senza perdere dati.

**Procedura sicura (da fare in sequenza):**
1. Sul telefono, aprire ListenS → esportare/copiare i dati localStorage prima di qualsiasi deploy
   (o aggiungere temporaneamente un pulsante "Esporta JSON" nella UI)
2. Importare il JSON in Supabase (`ls_podcasts`, `ls_queue`, `ls_episodes`, ecc.)
3. Deploy nuova versione ListenS che legge/scrive su Supabase
4. Verificare che tutto sia presente sul telefono prima di cancellare il localStorage

⚠️ Non deployare la versione Supabase senza prima aver salvato i dati mobile. Il localStorage
sul browser del telefono non è accessibile dall'esterno — va estratto dall'interno dell'app stessa.

---

## Build sprint · 13 aprile+

Nell'ordine indicato, in un unico blocco:

| # | Build | Stato | Prerequisiti |
|---|---|---|---|
| B1 | **ReadS** — EAS (Expo) | ✅ pronto | — |
| B2 | **Platea** — EAS (Expo) | 🔶 quasi | finalizzare watch tracker |
| B3 | **Ledger** — Capacitor APK | ✅ pronto | — |
| B4 | Verifica post-build su tutti i dispositivi | — | — |

---

## Dashboard v2 · Post-build

Dopo i build, con Supabase attivo:
- Tag Vault UI nella dashboard
- Sidebar connessioni attive (per tag, cross-app)
- Auth unificata suite
- ListenS → Supabase (se non già fatto prima)

---

## Note operative

- Ogni sessione: caricare `Commonplace.md` + `data-model.md`
- Le DDL Supabase sono già in `supabase-migration.sql`
- Desktop Commander: usare sempre `execSync` con `cwd` per build/deploy (non `cd` in cmd)
