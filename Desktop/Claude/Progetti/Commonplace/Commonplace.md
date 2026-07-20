# Commonplace â€” Project Reference

> Documento di contesto per la suite di app personali di Stefano.
> Da condividere all'inizio di ogni sessione Cowork o Claude.
> Ultimo aggiornamento: 2026-07-20 -- Sessione #27 (Opus 4.8). **▶ DnDMaster è CHIUSO: le prossime sessioni tornano sul resto di Commonplace, ripartendo da `piano-di-lavoro.md` (punto 3: giro di debug Syllabus/Footnote/ListenS).** In #27: trovata la ROOT CAUSE del "non vedo le modifiche" — **non era la cache**, il tab 🤝 Tavolo era assente dalla **bottom nav mobile** (sotto i 768px `.header-tabs` è `display:none`), quindi irraggiungibile su telefono pur essendo nel bundle; fix di 1 riga, deployato e **confermato da Stefano**. Fatto anche l'**auto-popolamento del Combat Tracker dai vitali** (snapshot all'avvio + ↻ per-PG, niente Realtime) e chiusa la coda dei **dadi vita del riposo lungo** (estratto `hitDiceAfterLongRest` + 4 test; la formula era già corretta). 186 test verdi. ⚠️ Deploy+push del tracker **da autorizzare**. — Precedente #26 (Opus 4.8): **nessun blocco obbligatorio aperto** sulle schede condivise DnD — **blocchi 3b + 3c + A + rifiniture FATTI, deployati e pushati** (tab 🤝 Tavolo: giocatore cura la scheda, master assegna + diff/accept + vitali live via Realtime **verificato**; blocco A = condizioni + dadi vita come campi persistenti; RPC `join_campaign` fixata). **Stefano valuta di CHIUDERE DnD domani e passare ad altro progetto** (candidato naturale se si continua: auto-popolamento del Combat Tracker dai vitali live). TO-DO futuri (non urgenti): campagna-scopare il roster del master, feedback master→giocatore (v2), auto-popolamento combat tracker dai vitali. **Non verificato a runtime**: recupero dadi vita del riposo lungo (ispezione). ✅ **3b+3c deployati e live** (Netlify, verificato: bundle contiene `Tavolo`/`join_campaign`) e **pushati** su GitHub; portano anche il blocco 1 ora live. Follow-up `backup.js` **chiuso** (3 tabelle aggiunte, cp-backup ridistribuito). Dettaglio in `DnDMaster/CLAUDE.md`, sezione «Schede condivise coi giocatori». — Precedente #25 (Opus 4.8, handover da Fable 5): Blocchi 1 (schede per-PG, deployate e live), 2 (tabelle `campaigns`/`dnd_shared_chars`) e 3a (`campaign_members` + RPC `join_campaign` + helper RLS) FATTI su pchld. ⚠️ follow-up: aggiungere le 3 tabelle a `Backup/api/backup.js` + redeploy cp-backup prima dei dati veri. — **Blocco 1 schede condivise DnD deployato**: schede personaggio ora una-riga-per-PG (`char:<id>` + indice `dnd_char_index_v1`), motore di sync esteso (char-key dinamiche, `markDeleted`/tombstone), migrazione non distruttiva (blob `dnd5e-master-v1` intatto = rollback) — su Netlify, **verificato live da Stefano**. Prima: design schede condivise esteso al **modello a campagna** (multi-master, join-code) e verifica primo backup Ledger 19/07 (✅ `projects.bogav`, 70 transazioni). Stato: piano-di-lavoro.md; diario in coda. — Precedente (#24). **Giro debug+features su segnalazioni di Stefano**: DnD (slot importate FIXATI, chip CD/attacco, ricerca incantesimi in italiano via dizionario 138 voci, design schede-giocatori ratificato), ListenS (pulsanti auto ⏮⏭, limite Android Auto chiarito), Digest (icona scura). Tutto deployato e verificato. Stato: piano-di-lavoro.md; diario in coda. In sospeso: ~~verifica primo backup Ledger (mattina del 19/07)~~ → ✅ **verificato 2026-07-19** (Opus): `backup-2026-07-19.json` (cron 05:07 UTC) contiene `projects.bogav` con 11 tabelle Ledger, `transactions` 70 righe, zero tabelle in errore; il 18/07 non ha ancora `bogav` — il 19 è il primo, come da RIPRISTINO.md.

---

## ðŸ—ºï¸ Cos'Ã¨ Commonplace

Commonplace Ã¨ un ecosistema di app personali costruite attorno alla vita intellettuale e culturale di Stefano: letture, ascolti, note, documenti, video di qualitÃ , finanze personali e gioco di ruolo. Le app condividono un design system comune (Playfair Display, Lora, DM Mono, palette calda su crema `#fffdf0`) e dati su Supabase (progetti `pchldmiavycxzpkzochn` e `llvqoiyvzloloobjiloe`; il localStorage resta come cache locale).

**Stack di sviluppo:** React, Vite, React Native/Expo, Supabase, Flask/Python. Tutto sviluppato su Windows PC con PowerShell. Desktop Commander MCP per file e processi senza copy-paste.

---

## ðŸ—ï¸ Architettura generale

```
Commonplace
â”‚
â”œâ”€â”€ Cultural Suite
â”‚   â”œâ”€â”€ BookShelf       â†’ React SPA vanilla, Vite (porta 5173) â€” server centrale
â”‚   â”œâ”€â”€ Footnote        â†’ Vite + React, HTML statico
â”‚   â”œâ”€â”€ ListenS         â†’ Vite + React (html in public di BookShelf)
â”‚   â””â”€â”€ NoteS / ReadS   â†’ Vite PWA (Vercel) + Expo SDK 52
â”‚
â”œâ”€â”€ Digest / NewS       â†’ Vercel Functions + Supabase pchld (DigestV/) — dal 2026-07-12
â”œâ”€â”€ DnD Master          â†’ Vite PWA (Netlify)
â”œâ”€â”€ Platea / VideoS     â†’ Expo SDK 52 (EAS build)
â”œâ”€â”€ ReadS               â†’ Expo SDK 52 (EAS build, staged)
â””â”€â”€ Ledger              â†’ Vite PWA (Vercel)
```

**Infrastruttura condivisa:**
- **Supabase:** 
  - **TUTTA la suite (tranne Ledger) — progetto `pchldmiavycxzpkzochn`**: BookShelf, Footnote, ListenS, NoteS, Syllabus, DnDMaster, Digest, Marginalia, cp layer, e **Platea/Dashboard dal 2026-07-12** (migrazione da llv, Fase 7 chiusa 2026-07-17). Ledger sta su `bogavweypmgyxwmdpsqm`.
  - ~~`llvqoiyvzloloobjiloe`~~ — **DISMESSO** (Fase 7, 2026-07-17): delta verificati ZERO, dati su pchld, storici nei backup. Resta solo da mettere in PAUSA dal suo dashboard (account separato: Stefano); cancellabile dopo qualche settimana.
  - Keep-alive: NON più via cron-job.org → **pg_cron su pchld** (`cron.job`: sync-videos settimanale un-canale-per-chiamata; pchld è comunque usato ogni giorno — vedi diario #22).
- **Render:** ~~Digest~~ — `digest-blqp.onrender.com` resta SOLO come rollback fino a ~2026-07-26, poi da sospendere (Digest è su Vercel dal 2026-07-12; spegnere anche il ping cron-job.org)
- **Vercel:** NoteS, Ledger, Digest (progetto `digest-app`) â€” dominio `commonplaceapp.org` (acquistato 2026-03-24, DNS Vercel)
- **Netlify:** DnD Master â€” sottodominio `dnd.commonplaceapp.org`
- **Railway:** ~~Digest/NewS~~ — dismesso (il Postgres free è scaduto ~fine giugno 2026; dati ora su Supabase pchld)
- **localStorage condiviso:** Cultural Suite â€” migrazione a Supabase completata per BookShelf, Footnote, ListenS (2026-03-29). NoteS giÃ  su Supabase.
- **Hub launcher locale:** `Claude/Progetti/Commonplace/Suite/avvia_suite.bat`
- ✅ **Migrazione Digest → Vercel+Supabase COMPLETATA** (2026-07-12, Sessione #21): vedi sezione Digest e diario #21. Il ping cron-job.org su digest-blqp va spento insieme alla sospensione Render (tiene sveglio un server che non serve più).
- **MEMORIA (2026-06-12, Sessione #19):** in Digest — endpoint `/api/memoria` (auth) + card "✦ Memoria" sopra i feed. Riemersioni DETERMINISTICHE sulla data (hash, zero AI, zero costi): citazione in esergo da cp_quotes (1 giorno su 3 pesca tra le preferite), anniversario di lettura (stesso mese anni passati), riscoperta (libro ≥4★ letto ≥2 anni fa), wishlist che invecchia, "un anno fa" da cp_log/cp_items. Cache giornaliera in preferences (memoria_cache). Richiede env `SUPABASE_SERVICE_KEY` (pchld service_role) su Render. Deploy: push fatto, Render rideploya da solo.
- **BACKUP AUTOMATICO (2026-06-12, Sessione #19):** cartella `Backup/`, progetto Vercel `cp-backup`, cron giornaliero 5:00 UTC → `api/backup.js` scarica tutte le tabelle utente di pchld + llv (service_role, paginato; esclusi `videos`/`sync_log` rigenerabili) e i feed/preferenze di Digest, poi committa `backups/backup-YYYY-MM-DD.json` + `latest.json` su repo GitHub privato. Env richieste: CRON_SECRET, SUPABASE_PCHLD_SERVICE_KEY, SUPABASE_LLV_SERVICE_KEY, GITHUB_TOKEN, GITHUB_REPO, DIGEST_PASSWORD (opz.). Trigger manuale: /api/backup?secret=… Ripristino: i JSON sono upsertabili via REST. → **AGGIORNAMENTO 2026-07-12 (#21):** DIGEST_PASSWORD rimossa (Digest su Supabase: tabelle dg_* nella lista pchld, insieme a dnd_saves); la procedura di ripristino è ora **TESTATA e documentata in `Backup/RIPRISTINO.md`** (cavia prima, jsonb_populate_recordset + on conflict, ordine FK, sequence — NON improvvisare via REST anon). ⚠️ Ledger (bogav) NON è incluso nel backup.
- **MARGINALIA — Commonplace Book (2026-06-11, Sessione #18):** nuova app autonoma in `Marginalia/` (single-file, pattern Footnote). Tabella `cp_quotes` su pchld (vedi `Marginalia/cp_quotes-migration.sql`, include backfill della tabella quotes di NoteS). NoteS specchia automaticamente le citazioni in cp_quotes a ogni salvataggio (preservando `favorite`; le citazioni rimosse dalla nota escono dal libro; cleanup anche su delete nota). Funzioni: citazione del giorno ("in esergo oggi", deterministica sulla data), ricerca full-text, filtri autore/tag/preferite, ordinamento recenti/antiche/a caso, aggiunta e modifica citazioni native (id `mg_`; quelle `ns_` si modificano in NoteS), export txt/json. Deploy: primo `deploya.bat` crea il progetto Vercel; dominio suggerito marginalia.commonplaceapp.org.
- **CP LAYER UNIFICATO (2026-06-11, Sessione #18):** cp_items + cp_log vivono su pchldmiavycxzpkzochn (vedi `cp-layer-2026-06.sql`), con user_id e RLS; righe user_id NULL ammesse per Platea (senza login). BookShelf, ListenS e NoteS ci scrivono via Supabase (prima: isole localStorage o progetto llv in pausa); Platea via cp.ts (dalla prossima build EAS). Backfill bs_books incluso nello SQL; storico llv→pchld con `cp-copy-history.ps1`. Questo layer è il prerequisito di Commonplace Book, Memoria e Dashboard.

---

## ðŸ“š Footnote *(ex Reading Buddy)*

**Scopo:** Strutturare le sessioni di lettura con supporto AI.

**Tech stack:** Vite + React (+ HTML statico in `Footnote/`)

**Cartella:** `Claude/Progetti/Commonplace/Footnote/`

**FunzionalitÃ  completate:**
- AI reading cards (analisi AI per ogni libro)
- Chat sessions separate e rinominabili, con contesto indipendente
- Migrazione automatica delle chat vecchie
- Profilo lettore
- Suggerimenti AI (ðŸ’¡)
- Bridge con BookShelf e ListenS
- Collections
- Export PDF
- Note per libro collassabili (autosave, incluse nel PDF)
- Ricerca nella libreria
- Badge di stato (incluso "in corso")

**Connessioni con altre app:**
- Legge dati da BookShelf (status, libreria) â€” bottone `â€  FN` in ogni scheda libro
- Bridge con ListenS
- Condivide localStorage con l'intera Cultural Suite

**Deploy:** Vercel â€” `footnote.commonplaceapp.org` âœ…

**Supabase:** progetto `pchldmiavycxzpkzochn` â€” tabella `fn_books`. Auth email+password. RLS attiva. âœ… 2026-03-29

**Stato attuale:** âœ… Completo con Supabase

**Icone:** âœ… `favicon.png` + `icon-512.png` generati. `<link rel="icon">` + `<apple-touch-icon>` in `index.html` â€” 2026-03-26

**Aggiornamento 2026-06-09 (Sessione #18 — revisione qualità):**
- Schede molto più ricche: 8 domande di riflessione, 6 spunti diario, 4 podcast + 6 libri + 4 film; nuove sezioni "Passi da non perdere" e "Piccolo Glossario" (anche nel PDF export)
- Modelli differenziati: `claude-opus-4-8` per schede e analisi collezioni (MODEL_CARD), `claude-sonnet-4-6` per chat (MODEL_CHAT)
- Robustezza: flusso a 2 chiamate anche senza file (meno troncamenti), helper `claudeJson` con 1 retry automatico su parse fallito, `fillCardDefaults` contro schede monche
- Prompt anti-genericità: solo opere esistenti, collegamenti specifici, risorse anche in italiano
- Fix: rimosso blocco unregister SW in <head> che causava un reload extra a ogni visita; sw.js → v27; vercel.json maxDuration 60→120 (se il deploy fallisse per limiti di piano, riportare a 60)
- ⚠️ API key compromessa: revocare la vecchia su console.anthropic.com, impostare la nuova come `ANTHROPIC_API_KEY` su Vercel (progetto footnote-app) e rideployare
- Fix "risorse correlate vuote" (bug storico): `related` era l'ultimo campo del JSON → ogni troncamento lo mangiava e jsonrepair mascherava l'errore. Ora: `ensureRelated()` (chiamata di recupero dedicata se <8 risorse totali) + bottone "✦ Completa le risorse correlate" nelle schede esistenti con risorse scarse
- Fix definitivo troncamenti (anche Controversie): eliminata la chiamata monolitica parte-2 → 3 chiamate piccole in PARALLELO (guidePrompt, questionsPrompt, relatedPrompt via Promise.allSettled). Aggiunti `looksTruncated()` (testo senza punteggiatura finale = tronco), `cardNeedsRepair()`, `repairCard()` (ripara solo i gruppi incompleti) e bottone "🩹 Completa scheda" nell'header della Dashboard — appare solo se la scheda ha sezioni vuote/tronche, utile anche per aggiornare le schede vecchie alle nuove quantità

**Roadmap:**
- Integrazione NoteS (deferred ad aprile con Supabase)
- Migrazione a Supabase condiviso (aprile)

**Note tecniche:** variabili interne (`_readingBuddyId`, `rb_books`, `BUDDY_KEY`) mantenute invariate per compatibilitÃ  localStorage â€” solo i testi visibili sono stati aggiornati a "Footnote".

---

## ðŸ“– BookShelf

**Scopo:** Gestione della libreria personale â€” libri letti, in lettura, da leggere.

**Tech stack:** React SPA, JavaScript/CSS vanilla (no build system esterno), servito da Vite

**Cartella:** `Claude/Progetti/Commonplace/BookShelf/`
- Avvio: `npx vite` â†’ `http://localhost:5173`

**Nota importante:** BookShelf Ã¨ il **server centrale della Suite**. `avvia_suite.bat` avvia Vite di BookShelf e serve la home di Commonplace via `http://localhost:5173/suite.html`.

**FunzionalitÃ :**
- Tracking libri con metadata e stato di lettura
- Collections
- Statistiche con grafici (KPI, autori, chart per anno, generi/temi âœ… aggiornati)
- Import/export
- Drag-and-drop reordering
- Design warm serif, offline-first, no external libraries

**Connessioni:** Fonte dati principale per Reading Buddy e ListenS

**Deploy:** Vercel â€” `bookshelf.commonplaceapp.org` âœ…

**Supabase:** progetto `pchldmiavycxzpkzochn` â€” tabelle `bs_books`, `bs_collections`, `bs_goals`. Auth email+password. RLS attiva. âœ… 2026-03-29

**Note import JSON:** `processImport` ora fa upsert su Supabase (fix 2026-03-29 â€” prima perdeva i dati al refresh).

**Aggiornamento 2026-06-11 (Sessione #18 — revisione Fable 5):**
- FIX ordine libreria: loadFromSupabase non aveva ORDER BY → "ordine aggiunta" era l'ordine arbitrario del DB, diverso a ogni reload. Ora order by added_at desc
- FIX drag&drop illusorio: il riordino non veniva MAI sincronizzato (solo stato locale, sovrascritto al reload). Ora persiste col trucco del midpoint: al drop il libro spostato riceve added_at a metà tra i vicini — 1 sola riga aggiornata, zero modifiche schema
- FIX import obiettivi rotto da sempre: processImport scriveva una colonna `target` INESISTENTE su bs_goals (errore inghiottito). Rimosso l'upsert ridondante: ci pensa l'effect di sync con goal_books/goal_pages
- FIX import libri non normalizzati: un JSON con libri senza array `tags` mandava in crash l'intera libreria (filtri e render assumono tags array). Ora normalizzazione completa in ingresso (tags, rating, status, id, addedAt)
- deleteBook ora ripulisce il libro dalle collezioni (prima restavano id orfani in book_ids)
- Pulizia integrazione: rimossa la scrittura localStorage rb_books nel bottone "Apri in FN" — integrazione morta dal deploy su sottodomini (il deep-link via Supabase basta e funziona)
- STATISTICHE: nuova card "Ritmo di lettura" (proiezione fine anno libri/pagine, confronto vs obiettivo, delta vs anno precedente alla stessa data), KPI media pagine/libro, griglie responsive (auto-fit) per mobile
- NOTA ARCHITETTURALE: cp_items/cp_log/cp_tags qui scrivono su localStorage mentre Platea li scrive su Supabase (progetto diverso!) — il "layer unificato" è due isole. Da unificare in una sessione dedicata

**Stato attuale:** ✅ Revisionato 2026-06-11 — da deployare (deploya.bat)

**Icone:** âœ… `public/favicon.png` + `icon-192.png` + `icon-512.png` generati. `<link rel="icon">` + `<apple-touch-icon>` in `index.html` â€” 2026-03-26

---

## ðŸŽ§ ListenS

**Scopo:** Podcast player e gestore degli ascolti, integrato nella Cultural Suite.

**Tech stack:** Vite + React (html in `public/` di BookShelf, non app autonoma)

**Cartella:** `Claude/Progetti/Commonplace/ListenS/` (solo copia statica)
- Il file sorgente vero Ã¨ `Claude/Progetti/Commonplace/BookShelf/public/listens.html`
- Aggiornato con `sync_listens.bat`

**FunzionalitÃ  completate:**
- iTunes Discovery (ðŸ‡ºðŸ‡¸ðŸ‡¬ðŸ‡§ðŸ‡®ðŸ‡¹)
- Player con resume
- Drag-and-drop queue
- Collections
- Bridge con Reading Buddy
- Tab "Da ascoltare dopo" (ðŸ• con badge, azioni per episodio)
- Fix Acast feed lookup via iTunes title search fallback
- Fix Vite CDN script
- **Home tab (â—‰)** â€” feed episodi recenti non ascoltati da tutti i podcast seguiti + card "Continua ad ascoltare" â€” 2026-03-26
- **Sleep timer** â€” pulsante player (â¾/Nm), ciclo offâ†’15â†’30â†’45â†’60â†’off, pausa automatica â€” 2026-03-26
- **Segna come ascoltato** â€” toggle â—‹/âœ“ manuale per episodio nella vista espansa â€” 2026-03-26

**Connessioni:** Bridge bidirezionale con Reading Buddy; condivide localStorage con Cultural Suite

**Stato attuale:** ✅ Revisione completa 2026-06-11 (Sessione #18, Fable 5). ⚠️ Da fare: eseguire `ListenS/ls_migration_2026-06.sql` nel SQL editor di Supabase PRIMA del deploy, poi deploya.bat (ListenS) e deploy Syllabus. → ✅ verificato 2026-07-11 (Sessione #20): migration GIÀ eseguita (colonne presenti su pchld) e revisione GIÀ live (stableEpId nel bundle, SW v13).

**Aggiornamento 2026-06-11 (Sessione #18 — revisione Fable 5):**
- SCOPERTA CHIAVE: la "migrazione Supabase ✅" di ListenS esisteva solo nel log — l'app era 100% localStorage, zero righe Supabase. Footnote scriveva suggerimenti in ls_podcasts che nessuno leggeva. E "condivide localStorage con la suite" è falso dal deploy su sottodomini separati (localStorage non attraversa le origin)
- SUPABASE VERO: auth email+password (stesso account suite), load/save ls_podcasts (con cache episodi), ls_collections, ls_queue (coda+dopo), ls_positions (resume cross-device, sync ≤1/30s); localStorage resta come cache; migrazione localStorage→account al primo login con conferma; soft delete
- Richiede `ls_migration_2026-06.sql` (in cartella ListenS): aggiunge a ls_podcasts status/source/episodes/itunes_id/updated_at/deleted_at e a ls_collections color/episodes
- INTEGRAZIONE: i suggerimenti di Footnote (ls_podcasts) ora COMPAIONO in wishlist; Syllabus ha il pulsante "+ ListenS" sulle risorse podcast (addToListenS in supabase.js); il dettaglio podcast risolve il feed anche per titolo via iTunes (copre i suggerimenti arrivati senza feed_url)
- FIX ID episodi: senza guid ricevevano id CASUALE a ogni fetch → posizioni/ascoltati orfani. Ora stableEpId (hash audio_url) + mergeEpisodes che preserva played/posizione anche se il guid cambia
- FIX refresh: il fetch del dettaglio ora PERSISTE gli episodi (prima restava solo a video e la Home mostrava episodi fossili); auto-refresh dei podcast seguiti al login (throttle 30 min) + pulsante ↻ manuale nell'header; rimosso il salvataggio in handlePlay che sovrascriveva i flag con la posizione dell'episodio precedente
- RICERCA: casella + ordinamento (recenti/vecchi) nel dettaglio podcast; nuova tab "⌕ Cerca" globale su podcast, episodi in libreria, collezioni e "Dopo"
- FIX SW: rimosso blocco debug che de-registrava il service worker a ogni avvio (PWA azzoppata); rimosso anche l'overlay window.onerror di debug
- ⚠️ TRAPPOLA DISINNESCATA: sync_listens.bat copiava BookShelf/public/listens.html (aprile) SOPRA ListenS/index.html — avrebbe cancellato mesi di lavoro. Direzione invertita (ListenS → BookShelf/public) e copia allineata

**Deploy:** Vercel â€” https://listens.commonplaceapp.org âœ… (alias: https://listens-app.vercel.app)
- Media Session API: lock screen controls, Bluetooth/CarPlay âœ… 2026-03-25
- PWA installabile: manifest.json + sw.js + icone â™ª âœ… 2026-03-25
- Feed completo: nessun limit XML, re-fetch sempre, toggle "Mostra tutti (N)" âœ… 2026-03-25
- Proxy server-side `/api/feed` (Vercel Function): fetch RSS lato server, nessun CORS, episodi illimitati âœ… 2026-03-25
  - Fallback: corsproxy.io â†’ allorigins.win â†’ codetabs.com â†’ rss2json (10 ep)

**Supabase:** progetto `pchldmiavycxzpkzochn` â€” tabelle `ls_podcasts`, `ls_collections`, `ls_positions`, `ls_queue`. Auth email+password. RLS attiva. âœ… 2026-03-29

**Roadmap:**
- Note per episodio (secondario)
- Integrazione cp_items + cp_log (aprile, task 7)

**âš ï¸ Dipendenza tecnica:**
- `sync_listens.bat` â†’ spostato in `Suite/` insieme ad `avvia_suite.bat`

---

## ðŸ“ NoteS / ReadS

### NoteS

**Scopo:** App per annotazioni multipiattaforma (web PWA).

**Tech stack:** React/Vite PWA

**Cartella:** `Claude/Progetti/Commonplace/NoteS/`

**Deploy:** Vercel â€” https://notes.commonplaceapp.org

**FunzionalitÃ :**
- Soft delete via `deleted_at` per sync cross-device affidabile
- AI ReadingAssistant con 6 prompt di analisi + free-text
- Export HTML/TXT
- Tag
- PWA installabile su Android
- Supabase keep-alive configurato via cron-job.org

**Bug aperti:**
- Journal audio recording: testo non inserito, `onResult` non si attiva  â†’ risolto 2026-03-26; scheduleSave mancante + DOM sync â†’ risolto 2026-04-09

**Aggiornamento 2026-06-11 (Sessione #18 — revisione Fable 5):**
- CHIAVI SERVER-SIDE: transcribe.js (Anthropic) e whisper.js (OpenAI) ora usano ANTHROPIC_API_KEY e OPENAI_API_KEY dalle env di Vercel (progetto notes-app), con header dal client come fallback legacy. Rimossa la costante-trappola `ANTHROPIC_API_KEY=""` nel client ("inserisci qui la chiave" = chiave nel bundle pubblico = come è stata rubata l'altra). Rimosso il blocco client "API key mancante": ora registra sempre, l'eventuale errore arriva dal proxy
- FIX impermanenza sync: il debounce di 2s perdeva il sync server se chiudevi la scheda subito dopo aver scritto (nota solo nel localStorage di quel dispositivo). Aggiunto flush immediato su pagehide/visibilitychange
- NOTA: il dropdown "Collega a item" legge cp_items dal progetto llvqoiyvzloloobjiloe — lo stesso che era IN PAUSA (vedi Platea): quando dorme, il collegamento e cp_log falliscono in silenzio. Il cron keep-alive di Platea ora protegge anche questo
- Architettura sync (realtime, soft delete, tombstone 60s, merge local-recent) verificata: ben fatta, nessun intervento necessario

**Roadmap (aprile):**
- Migrazione a Supabase condiviso
- Integrazione con Reading Buddy e ListenS

---

### ReadS

**Scopo:** Document reader personale (mobile).

**Tech stack:** React Native / Expo SDK 52

**Cartella:** `Claude/Progetti/Commonplace/ReadS/`

**FunzionalitÃ :**
- Persistenza posizione di lettura per documento
- Note per documento
- Preferenze font/dark mode per documento
- Deep-link con NoteS
- Design armonizzato con suite (Playfair Display, Lora, DM Mono, palette calda)

**Stato attuale:** ðŸ”¶ Staged â€” in attesa di EAS build (aprile)

**Icone:** âœ… Generate â€” `assets/images/icon.png`, `android-icon-foreground.png`, `android-icon-background.png`, `android-icon-monochrome.png`, `splash-icon.png`, `favicon.png` â€” 2026-03-26

---

## ðŸ“¡ Digest / NewS

**Scopo:** Lettore di feed RSS personalizzato, focalizzato su notizie italiane.

**Tech stack:** Vercel Functions (Node) + Supabase pchld (`dg_feeds`/`dg_preferences`) — ex Flask/Python

**Cartella:** `Claude/Progetti/Commonplace/DigestV/` (il vecchio Flask in `Digest/` è archivio storico + piano migrazione)

**Deploy:** Vercel — progetto `digest-app`, dominio `digest.commonplaceapp.org`

**FunzionalitÃ :**
- Feed RSS italiani
- Preferenze sincronizzate server-side
- Layout mobile responsive con hamburger drawer
- gevent workers per digest call lunghe
- Accesso da: Windows PC (proxy corporate, `verify=False`), secondo PC, OnePlus 13

**Stato attuale:** ✅ **MIGRATO a Vercel+Supabase** (Sessione #21, 2026-07-12): `digest.commonplaceapp.org` → progetto Vercel `digest-app` (sorgenti in `DigestV/`), dati su pchld (`dg_feeds`/`dg_preferences`), login suite, chiavi solo server-side. Test di parità passato (531 articoli, digest ~$0.055). Render (`digest-blqp`) = rollback fino a ~2026-07-26, poi sospendere; `Digest/` (Flask) resta come archivio storico. ⚠️ Categorie feed da riassegnare nella UI.

**Aggiornamento 2026-06-10 (Sessione #18 — revisione Fable 5):**
- FIX "classificazioni/letture perse": gli ID di articoli e feed usavano `hash()` Python, randomizzato a ogni processo — su Render (free tier, sleep dopo 15 min) gli ID cambiavano a ogni risveglio, orfanizzando stato letto e riassunti. Ora `stable_id()` con md5. NOTA: al primo deploy lo stato letto si azzera un'ultima volta (gli ID cambiano schema), poi resta stabile per sempre
- FIX "feed non aggiungibili": aggiunto autodiscovery — se incolli l'URL di un sito (non del feed), il server cerca il feed nei `<link rel=alternate>` e nei percorsi convenzionali (/feed, /rss, /atom.xml…) e salva quello vero. Accept header ora include i MIME RSS/Atom
- FIX "digest non generati": (1) la chiave era richiesta al browser — ora `ANTHROPIC_API_KEY` server-side con fallback legacy; (2) i riassunti articolo chiamavano Anthropic DIRETTAMENTE dal browser senza header CORS richiesto e con modello obsoleto `claude-sonnet-4-20250514` → fallivano sempre; ora passano da /api/claude; (3) timeout 60→110s
- SICUREZZA: /api/claude era SENZA autenticazione (chiunque poteva bruciare crediti) → ora @auth_required + tetto max_tokens 8000. verify=False rimosso verso Anthropic (resta per i feed; `INSECURE_SSL=1` per PC dietro proxy aziendale)
- COSTI: digest culture/science usano solo i feed della categoria corrispondente (meno token input, più pertinenza); risposta include usage e costo stimato (~$0.03-0.08/digest con Sonnet), mostrato nel footer del modal; ultimo digest salvato per tipo nelle preferences server → "↺ Rivedi l'ultimo digest salvato (gratis)" nel chooser
- QUALITÀ: prompt digest riscritto (collegare le notizie, contesto, dedup multi-fonte, "Da seguire", selezione con gusto); data in italiano (prima usciva in inglese per il locale C del server)
- UX risveglio Render: il frontend ora riprova da solo (3 tentativi, attesa 20s) con messaggio "il server si sta svegliando" invece dell'immediato "Server non raggiungibile" al cold start del free tier

---

## ðŸ‰ DnD Master

**Scopo:** Gestionale D&D 5e per sessioni in presenza â€” personaggi e combattimento.

**Tech stack:** React/Vite PWA

**Cartella:** `Claude/Progetti/Commonplace/DnDMaster/`

**Deploy:** Netlify â€” https://dnd.commonplaceapp.org (alias: https://steady-kitsune-9c0fda.netlify.app)

**FunzionalitÃ :**
- Import encounter da JSON (â¬† Importa JSON)
- Note encounter visibili durante il combattimento come banner compatto
- Tab Incantesimi con ricerca/filtro per livello/scuola/classe
- Generatore encounter (âš¡ Genera) con soglie XP ufficiali 5e, filtri terreno/difficoltÃ , ottimizzazione 200 tentativi
- **Auth Supabase** (email+password, progetto condiviso `pchldmiavycxzpkzochn`) + **sync cross-device** via tabella `dnd_saves` (KV per-utente, RLS) — 2026-07-07, fase 2B
  - Utenti: Olengard (olengard@gmail.com), Manu (si registra dall'app, Nome "Manu")
  - Offline-first: cache localStorage per-utente, push debounced con coda persistita, pull al login
- SVG flowchart `flusso_sessione.html` per riferimento sessione
- **Mobile bottom nav** â€” nav bar fisso â‰¤768px con tutti i 9 tab, scroll orizzontale, gold attivo â€” 2026-03-26

**Stato attuale:** âœ… Funzionante — ridistribuito 2026-07-07 (versione 2B: catalogo 5e.tools, palette ⌘K, registro Campagna, dadi globali, Supabase). Il dettaglio vive in `DnDMaster/CLAUDE.md`.
**2026-07-19 (Opus):** schede personaggio migrate a **per-PG** (`char:<id>` + indice `dnd_char_index_v1`) — prerequisito delle schede condivise; deployato su Netlify e verificato live. Il blob `dnd5e-master-v1` è tenuto intatto come rollback.

**Roadmap:**
- Tabelle loot casuali
- Capacitor APK (solo dopo che tutte le modifiche sono finalizzate)

---

## ðŸŽ¬ Platea / VideoS

**Scopo:** Aggregatore culturale video di qualitÃ  â€” Netflix-style.

**Tech stack:** React Native / Expo SDK 52

**Cartelle:**
- **Dev:** `Claude/Progetti/Commonplace/Platea/`
- **EAS build:** `C:/VideoS/` âš ï¸ non spostare â€” cartella usata per i build EAS

**Backend:** Supabase (stesso progetto di NoteS)

**FunzionalitÃ :**
- UI Netflix-style
- RPC `search_videos` fixata
- Navigation stack con back support
- Swipe gestures, fade transitions
- Watch progress resume
- Saved videos (toggle cuore â™¥)

**Stato attuale:** ✅ **MIGRAZIONE A PCHLD COMPLETATA — TUTTE LE 7 FASI** (2026-07-12 → 2026-07-17): dati e sync su pchld, build EAS `preview` (d065eef6) installata e collaudata sul telefono (end-to-end verificato: watch_progress + cp scrivono su pchld), backup coperto da cp-backup, sync settimanale via pg_cron un-canale-per-chiamata, llv dismesso (delta zero; pausa dal dashboard a carico di Stefano). Storia completa: `Platea/piano-migrazione-pchld.md`. In coda per la PROSSIMA build: resume archive (`start=` già in PlayerScreen), avviso categoria in AdminScreen, sync per-canale dal pulsante admin.

**Aggiornamento 2026-06-11 (Sessione #18 — revisione Fable 5):**
- CAUSA MADRE DELL'IMPERMANENZA TROVATA: il progetto Supabase llvqoiyvzloloobjiloe è IN PAUSA (free tier, 1 settimana di inattività) — DNS inesistente, verificato dal PC di Stefano. Quando dorme, tutta Platea si svuota. Il warning keep-alive era nel log da marzo, mai eseguito. Rimedio: restore dal dashboard + cron settimanale su cron-job.org che invoca sync-videos (tiene sveglio E sincronizza)
- SYNC v6 (supabase/functions/sync-videos): YouTube ora via UPLOADS PLAYLIST del canale (1 unità quota/pagina, elenco completo anche del catalogo storico) invece dell'endpoint search (100 unità/pagina, risultati parziali). Errori API (quota esaurita ecc.) ora propagati nel sync_log: prima la sync falliva in silenzio con "ok, 0 video" — ecco i "contenuti che non si trovano". Deploy: `npx supabase functions deploy sync-videos` dalla cartella Platea (dopo il restore!)
- PLAYLIST PERSONALI: nuove tabelle pl_playlists/pl_playlist_videos (supabase/playlists-migration.sql, da eseguire nel SQL editor del progetto llvqoiyvzloloobjiloe), tab Salvati→"Raccolte" con Salvati/Playlist, pulsante ▤+ nel player per aggiungere a playlist (con creazione al volo)
- Robustezza client: errori di saveProgress/toggleSave non più inghiottiti (prima il ♥ poteva mentire e il progresso perdersi in silenzio); tsconfig esclude la Edge Function Deno dal typecheck (6 errori fantasma rimossi); typecheck pulito
- C:\VideoS ALLINEATO: la cartella build EAS era ferma a marzo e MANCAVA cp.ts (una build sarebbe fallita: PlayerScreen lo importa). Copiati cp.ts, supabase.ts, PlayerScreen, SavedScreen, tsconfig. Ricordare: ogni modifica in Platea/ va copiata in C:\VideoS prima della build
- NOTA: niente expo-updates → le modifiche app si vedono solo con una nuova build EAS (quota permettendo)

**Icona:** âœ… B1 (grande â€œPâ€ Georgia, amber `#c8903a`) generata e applicata a tutti gli asset Expo â€” 2026-03-26

**Roadmap (post-build):**
- Pulizia contenuti (filtro anime adult)
- Aggiunta canali jazz
- Verifica post-build

---

## ðŸ’° Ledger

**Scopo:** App finanza personale completa (PWA).

**Tech stack:** React/Vite PWA

**Cartella:** `Claude/Progetti/Commonplace/Ledger/`

**Deploy:** Vercel â€” https://ledger.commonplaceapp.org

**FunzionalitÃ :**
- Conti multipli: corrente, risparmio, investimento, obiettivo, buoni pasto, gift card, contante
- Metodi di pagamento, logica split payment
- Flusso pending/conferma carte di credito
- Transazioni e trasferimenti ricorrenti
- Ricarica automatica buoni pasto
- Budget tracking
- Gestione benefit con scadenza/conversione gift card
- Storico investimenti
- Dashboard con liquiditÃ  reale
- Riepilogo annuale con Recharts
- Analisi storica spese
- Design editoriale (crema `#fffdf0`, Inter, palette warm stone)

**Stato attuale:** âœ… Funzionante

**Bug aperti:** nessuno noto al momento.

**Roadmap:**
- Capacitor Android APK (aprile â€” sprint consolidato)
- Push notification native
- Export CSV/PDF

---

## ðŸ—“ï¸ Roadmap aprile 2026 â€” Sprint consolidato

> Regola: i build si fanno UNA VOLTA, solo quando tutte le modifiche sono finalizzate.

### Pre-build (da fare prima dello sprint)

| Task | App | Note |
|---|---|---|
| ~~**Supabase migration**~~ | ~~BookShelf + Footnote + ListenS~~ | âœ… Completato 2026-03-29 â€” login email+password, RLS, migrazione localStorage automatica al primo accesso |
| **Loot tables** | DnD Master | Feature mancante prima del build Capacitor |
| **Push notifications** | Ledger | Da aggiungere prima del build Capacitor |
| **Export CSV/PDF** | Ledger | Da aggiungere prima del build Capacitor |
| ~~**Railway ANTHROPIC_API_KEY**~~ | Digest/Footnote | Superato: chiavi server-side su Vercel (Footnote `api/`, Digest `digest-app`) |
| ~~**digest.commonplaceapp.org**~~ | Digest | ✅ 2026-07-12 — dominio sul progetto Vercel `digest-app` |

### Sprint build

| App | Build | Note |
|---|---|---|
| ReadS | EAS (Expo) | Staged, pronto |
| Platea | EAS (Expo) | Staged, quota esaurita â€” disponibile in aprile |
| DnD Master | Capacitor APK | Dopo loot tables |
| Ledger | Capacitor APK | Dopo push notifications + export |
| Cultural Suite | â€” | Migrazione Supabase condiviso (BookShelf, NoteS, ListenS) in aprile |

---

## ðŸ§° Note tecniche trasversali

### Design system
- Font: Playfair Display, Lora, DM Mono
- Palette: crema `#fffdf0`, warm stone, Inter (Ledger)
- Principio: warm serif, offline-first dove possibile

### Path e script critici
- `Suite/avvia_suite.bat` â†’ `C:\Users\Test\Desktop\Claude\Progetti\Commonplace\...` âœ… aggiornato
- `Suite/sync_listens.bat` â†’ `C:\Users\Test\Desktop\Claude\Progetti\Commonplace\...` âœ… aggiornato
- `DnDMaster/avvia-gestionale.bat` â†’ `C:\Users\Test\Desktop\Claude\Progetti\Commonplace\DnDMaster` âœ… aggiornato (era su path `oleng`)
- `C:\VideoS\` â†’ cartella EAS build Platea, non spostare (Ã¨ separata da `Platea/`)

### Porte locali
- BookShelf (Vite): `5173` (serve anche la Suite)
- NoteS (Vite): `5173` âš ï¸ conflitto se avviata insieme a BookShelf
- DigestV: server statico locale porta `5180` (launch.json `digestv-static`)

### Supabase â€” keep-alive âš ï¸
Il free tier si mette in pausa dopo 7 giorni di inattivitÃ . Configurare ping via cron-job.org per ogni progetto Supabase attivo (giÃ  fatto per NoteS, verificare per Platea).

### Dati condivisi
- `libreria_2026-02-18.json` â€” snapshot libreria sul Desktop
- `profilo lettore.txt` â€” profilo lettore sul Desktop
- localStorage condiviso tra BookShelf, Reading Buddy, ListenS, NoteS (fino ad aprile)

### Struttura dati libro BookShelf (`libreria-personale-v1`)
```js
{
  id,            // Date.now().toString(36) + random â€” usare come source_id in cp_items (prefisso 'bs_')
  title, originalTitle, author, publisher, year, pages,
  currentPage,   // pagina corrente (per "in corso")
  readMonth, readYear,  // data lettura completata (per cp_log 'finished')
  rating,        // 0â€“5, mezze stelle
  tags: [],      // array stringhe â€” da migrare in cp_item_tags via CpTags.addTag()
  notes,         // testo libero
  cover,         // URL copertina (Open Library)
  isbn,
  status,        // 'letto' | 'in corso' | 'da leggere' | 'wishlist' | 'abbandonato'
  _readingBuddyId,  // opzionale â€” link a Footnote (chiave interna mantenuta per compatibilitÃ )
  source: { bookId }  // opzionale â€” altro riferimento Footnote
}
```

### cp-tags.js â€” chiavi localStorage usate
- `cp_tags_registry` â€” registry centralizzato { tag: { display, count, apps[], aliases[], last_used } }
- `cp_item_tags` â€” array { id, item_id, tag, tagged_by_app, tagged_at }

---

## ðŸ—‚ï¸ TODO suite

### Fase 1 â€” Data model + Dashboard (prima di aprile)
> Schema completo: vedi `data-model.md`

- [x] Scrivere `cp-tags.js` â€” utility condivisa Tag Vault âœ… 2026-03-24
  - ES module: `BookShelf/src/cp-tags.js` (import/export, per Vite/React)
  - Browser IIFE: `BookShelf/public/cp-tags.js` (window.CpTags, per Footnote/ListenS/Dashboard)
  - Funzioni: suggestTags, warnSimilar (stemmer italiano), resolveAlias, addTag, removeTag,
    getTagsForItem, getItemsForTag, getAllTags, addAlias, renameTag
  - Smoke test 18/18 âœ…

- [x] **Fix residuo App.jsx** âœ… 2026-03-24 â€” aggiornato a `/footnote.html` + label "Footnote"

- [x] **Script migrazione one-time** `migrate-to-cp.js` âœ… 2026-03-24
  - File: `BookShelf/public/migrate-to-cp.js` â€” da incollare nella console di Firefox su localhost:5173
  - Legge `libreria-personale-v1`, scrive `cp_items` (id: `'bs_'+book.id`), `cp_log`, tag via CpTags
  - Idempotente (rieseguibile senza duplicati)

- [x] **BookShelf: integrazione cp-tags in BookForm** âœ… 2026-03-24
  - Autocomplete: mentre si digita, mostra suggerimenti da `CpTags.suggestTags()` con `â†©` cliccabili
  - Fuzzy warning: riga arancione `âš  simile a: ...` se `CpTags.warnSimilar()` trova match â€” cliccabile per usare tag esistente
  - Graceful degradation: se `window.CpTags` non disponibile, tutto funziona come prima
  - **âš ï¸ Prerequisito**: `cp-tags.js` deve essere caricato nella pagina. Da aggiungere in `index.html` di BookShelf:
    `<script src="/cp-tags.js"></script>` prima del bundle Vite

- [x] **BookShelf: live writes a ogni salvataggio libro** âœ… 2026-03-24
  - `syncCpData(book, prevBook)` in App.jsx: aggiorna `cp_items`, scrive `cp_log` su cambio status, diff tag via CpTags
  - `cp-tags.js` caricato in `index.html` prima del bundle React

- [x] **Dashboard v1** âœ… 2026-03-24 â€” `BookShelf/public/dashboard.html`
  - Statistiche rapide (totale, letti, letti quest'anno, tag, in corso)
  - Sezione "In corso": card con copertina, barra avanzamento pagine, tag, link Footnote
  - Registro eventi: ultimi 20 eventi cp_log con icona tipo e data
  - Connessioni tag: top 8 tag con â‰¥2 elementi, raggruppati visivamente
  - Bottone "â†º Aggiorna" per ricaricare dati live da localStorage
  - Link Dashboard aggiunto nell'header di suite.html (bottone "â—‰ Dashboard")

### Fase 2 â€” Espansione (aprile, con Supabase)
- [x] Migrazione Supabase condiviso â€” Cultural Suite âœ… 2026-03-29 (BookShelf, Footnote, ListenS)
- [x] Auth unificata suite âœ… 2026-03-29 (email+password, progetto `pchldmiavycxzpkzochn`)
- [x] **ListenS: integrazione cp_items + cp_log** âœ… 2026-03-25
  - `syncCpListen(episode, podcast, status, eventType, meta)` â€” utility in listens.html
  - `play()`: scrive cp_items (status: in_progress) + cp_log (started) ad ogni nuovo episodio
  - `onEndedRef`: scrive cp_items (status: done) + cp_log (listened, progress_pct: 100) al termine
  - ID deterministici: `ls_{episode.id}` per cp_items, `ls_ev_{episode.id}_{eventType}` per cp_log
- [x] Platea: watch tracker + cp_items + cp_log âœ… 2026-03-24
  - Nuovo file `src/lib/cp.ts`: `syncCpItem()` + `logCpEvent()` con ID deterministici
  - `PlayerScreen.tsx`: cp writes su apertura video (started/watching) e fine YouTube (finished/watched)
  - `supabase/cp-migration.sql`: tabelle cp_items + cp_log da eseguire nel SQL Editor
  - [x] âœ… **Eseguito**: `supabase/cp-migration.sql` nel SQL Editor del progetto Supabase (`llvqoiyvzloloobjiloe`) â€” 2026-03-25
- [x] **NoteS: campo item_id opzionale + cp_log 'noted'** âœ… 2026-03-25
  - `item_id` aggiunto a noteToRows, rowsToNote, createNote (tutti i tipi)
  - `syncNoteToSupabase`: scrive evento `noted` in localStorage cp_log quando item_id Ã¨ valorizzato (idempotente: id `ns_ev_{note_id}_noted`)
  - SQL migration: `NoteS/supabase/add-item-id.sql` â€” âœ… Eseguito 2026-03-25
  - UI "Collega a item" (dropdown cp_items) â† deferred post-Supabase migration
- [ ] Tag Vault UI nella dashboard
- [ ] Dashboard v2 con sidebar tag e connessioni attive

### Sicurezza & qualitÃ  â€” checklist pre-build (check completato 2026-03-24)

> âš ï¸ Tutte le voci qui sotto vanno completate o consapevolmente accettate PRIMA dello sprint build di aprile.

**GiÃ  risolti**
- [x] NoteS Supabase RLS: verificato âœ… â€” tutte e 4 le tabelle restituiscono 0 righe senza JWT utente
- [x] Footnote API key: rischio documentato e accettato (uso personale, chiave in localStorage)
- [x] Zero console.log con dati sensibili in tutti i file analizzati âœ…
- [x] Digest DATABASE_URL da env var (non hardcoded) âœ…

**ðŸ”´ Da fare â€” Sicurezza**
- [x] DnD Master: `dnd_imported_*`, `dnd_custom_monsters_v1`, `dnd_saved_names`, `dnd_session_*` migrati via `userKey()` â€” utenti Manu/Olengard isolati [OK] 2026-03-26
- [x] Digest: Flask `secret_key` da env var `SECRET_KEY` con generateValue:true (Render) [OK] 2026-04-16

**ðŸŸ¡ Da fare â€” Robustezza**
- [x] ErrorBoundary: BookShelf, NoteS, DnDMaster, Ledger, ListenS [OK] 2026-03-26 + Footnote, Syllabus [OK] 2026-04-16
- [x] safeLsSet + toast: BookShelf, NoteS, DnDMaster, ListenS [OK] 2026-03-26. Footnote: LS.set() solo per preferenze (Supabase primario). Syllabus: Supabase only, n/a. [OK] 2026-04-16
- [x] ListenS: proxy server-side `/api/feed` (Vercel Function) come fonte primaria â€” i 3 CORS proxy di terze parti restano solo come fallback âœ… 2026-03-25

**ðŸŸ¢ Da fare â€” ScalabilitÃ  e qualitÃ **
- [ ] BookShelf: tutta la libreria caricata in memoria al mount â€” accettabile fino a ~300 libri. Valutare paginazione/virtualizzazione se la libreria supera quella soglia prima del build
- [ ] BookShelf / tutte le app: verificare comportamento con input inattesi (emoji, caratteri accentati, stringhe lunghe >500 caratteri, stringhe vuote) â€” test manuale pre-build
- [ ] Tutte le app: test manuale offline â€” cosa succede se internet cade durante l'uso? Verificare che i dati locali non vadano persi
- [ ] DnD Master: nessun limite sulla dimensione dei JSON importabili â€” valutare se aggiungere una validazione minima
- [ ] Open Library (BookShelf): debounce giÃ  presente, ma nessun retry su errore di rete â€” accettabile, da documentare

### Altro
- [x] Homepage Commonplace â€” `commonplaceapp.org` deployata su Vercel âœ… 2026-03-27
- [x] ListenS: mobile UX â€” nav scroll, FullPlayerSheet, PlayerBar 2 righe, Android Auto, font 17px âœ… 2026-03-29
- [x] ListenS: ReferenceError `onMarkPlayed is not defined` fixato â€” mancava dalla destructuring di `PodcastDetailView` props âœ… 2026-03-27
- [x] ListenS: SyntaxError sleep timer fixato, SW cache v3 âœ… 2026-03-28
- [x] BookShelf + Footnote: PWA installabile (manifest.json + sw.js) âœ… 2026-03-28
- [x] Footnote: AI proxy via Digest Railway (no API key nel browser) âœ… 2026-03-28
- [x] Fix bug audio recording in NoteS (`onResult` non si attiva) âœ… 2026-03-26
- [ ] Configurare Supabase keep-alive per Platea (verificare se giÃ  fatto)
- [ ] Abilitare Last.fm scrobbling in Qobuz (errore in corso, riprovare) â†’ prerequisito per integrazione musica in dashboard
- [x] Risolvere conflitto porta 5173 tra BookShelf e NoteS âœ… 2026-03-26 (NoteSâ†’5174, DnDMasterâ†’5175, Ledgerâ†’5177)
- [x] Consolidare cartelle app in `Claude/Progetti/Commonplace/` âœ… fatto il 2026-03-22

## 2026-04-01 â€” Sessione #6

- âœ… **ListenS: 5 bug risolti in un unico deploy (SW v10)**
  1. `removePodcast` non cancellava da Supabase (solo upsert, mai delete) â†’ podcast "cancellati" riapparivano al reload. Fix: aggiunto `sb.delete().eq('id',id)` in `removePodcast`.
  2. `podcast_data` in queue/later caricato da Supabase non aveva `cover_url` â†’ copertine mancanti. Fix: normalizzazione `normPod()` al momento del caricamento.
  3. `useEffect([user])` si triggera due volte â†’ `getSession()` + `onAuthStateChange(INITIAL_SESSION)` impostano `user` con due oggetti diversi (stesso ID). React ricarica due volte da Supabase. Fix: deps cambiato in `[user?.id]`.
  4. `updateEpisodes` usava closure stantia su `podcasts` â†’ 5 fetch concorrenti si sovrascrivevano, solo l'ultima sopravviveva. Fix: sostituito con `setPodcasts(prev => ...)` (functional update).
  5. `HomeView` useEffect con deps `[]` girava una sola volta al mount quando `podcasts` era ancora `[]` â†’ home non mostrava mai episodi. Fix: deps cambiato in `[podcasts]`, aggiunto `fetchingRef` per evitare fetch duplicati.

---

## 2026-03-31 â€” Sessione #5

- âœ… **Footnote: root cause REALE identificato** â€” Il problema NON era Railway ma il limite `max_tokens` ai call site. `initPrompt()` genera un JSON con overview 2-3 paragrafi + 9 sezioni: ~1500-1800 token di risposta. Con `max_tokens=1800` Claude si ferma esattamente a metÃ  JSON â†’ `Unterminated string at position ~6200`.
- âœ… **Footnote: fix max_tokens** â€” `1800 â†’ 4000` (init + regen libro), `1200 â†’ 2000` (cross-analysis collezione).
- âœ… **Footnote: timeout Vercel** â€” `maxDuration: 60` in vercel.json ignorato su piano Hobby (hard cap 10s). Fix: riscritta `api/claude.js` con streaming Node.js (`res.flushHeaders()` + `res.write()` + `for await`). Client aggiornato per leggere risposta in streaming con `ReadableStream`. Nessun timeout perchÃ© i dati scorrono continuamente.
- âœ… **Footnote: JSON malformato da Claude** â€” Sostituita la `fixJson()` artigianale (gestiva solo newline e virgolette) con la libreria `jsonrepair` caricata da `esm.sh`. Gestisce qualsiasi JSON malformato da LLM in modo sistematico. SW `v6â†’v13`.
- âœ… **ANTHROPIC_API_KEY** â€” Aggiunta su Vercel da utente.
- âœ… **Railway** â€” Non piÃ¹ necessario per Footnote (migrato su Vercel). **Digest ancora su Railway** â€” da migrare prima che scada la trial.
- ðŸ”² **DA FARE: Migrare Digest da Railway** â€” `Digest/server.py` Ã¨ un'app Flask Python con PostgreSQL. Opzioni: Render (free tier, Flask nativo, DB PostgreSQL gratuito 90gg), Fly.io (3 VM gratuite, no sleep). Da pianificare in una sessione dedicata.
- ðŸ”² **DA TESTARE: Footnote** â€” Testare con piÃ¹ libri diversi per confermare che jsonrepair risolve definitivamente gli errori JSON.

---

## 2026-03-30 â€” Sessione #4

- âœ… **Footnote: root cause JSON error identificato** â€” I call site di `claude()` passano `maxTokens=1800` esplicitamente, sovrascrivendo il default. 1800 token â‰ˆ 7200 char â†’ JSON â‰ˆ 7210 byte â†’ Railway tronca a ~6100 byte â†’ `Unterminated string`. La posizione varia perchÃ© ogni risposta ha contenuto diverso.
- âœ… **Footnote: proxy migrato da Railway a Vercel** â€” Creato `Footnote/api/claude.js` (serverless function Vercel, stesso pattern di `ListenS/api/feed.js`). Nessun limite di dimensione risposta. `API_URL` aggiornato da URL Railway a `/api/claude` (stesso dominio, nessun CORS).
- âœ… **SW cache** â€” Footnote `v5â†’v6`.
- âœ… **Deploy** â€” Footnote ridistribuito su Vercel.
- âš ï¸ **Azione richiesta (una tantum)** â€” Aggiungere `ANTHROPIC_API_KEY` su Vercel: Dashboard â†’ footnote-app â†’ Settings â†’ Environment Variables.

---

## 2026-03-30 â€” Sessione #3

- âœ… **ListenS: cover_url fix (root cause)** â€” `savePodcasts` ora salva `cover: pod.cover||pod.cover_url||pod.artwork||''`. `updateEpisodes` propaga `cover_url` dal feed RSS. HomeView auto-fetch passa `d.cover_url` â†’ copertine persistono anche dopo reinstall/logout.
- âœ… **ListenS: coda audio robusta** â€” `findIndex` con fallback su `audio_url`, guard contro `episode.audio_url` vuoto, `.catch()` su `audio.play()` per evitare blocchi silenziosi.
- âœ… **Footnote: JSON truncation risolto** â€” `max_tokens` ridotto 1500â†’800 per restare sotto il limite Railway (~6064 byte). `server.py` era giÃ  corretto su Railway (restituisce solo `text`).
- âœ… **SW cache** â€” ListenS `v8â†’v9`, Footnote `v4â†’v5`.
- âœ… **Deploy** â€” ListenS e Footnote ridistribuiti su Vercel.

---

## 2026-03-30 â€” Sessione #2

- Service Worker: **ListenS** giÃ  a `v8`, **Footnote** giÃ  a `v4` â€” nessuna modifica necessaria.
- âœ… **BookShelf: link ListenS corretto** â€” `href="/listens.html"` â†’ `href="https://listens.commonplaceapp.org"` (link rotto nel nav in alto).
- âœ… **BookShelf: paginazione spostata sotto Tag/Collezioni** â€” rimossa da posizione destra (`justifyContent:space-between`) e riorganizzata in colonna verticale sotto i filtri. PiÃ¹ comoda su schermi stretti.
- âœ… **ListenS: Home tab fix** â€” filtro `p.episodes?.length` rimosso: mostrava "Aggiungi podcast" anche con podcast seguiti. `HomeView` riceve ora `onUpdateEpisodes` e fa auto-fetch al mount per ogni podcast con `episodes:[]`.
- âœ… **Deploy** â€” ListenS, Footnote, BookShelf tutti ridistribuiti su Vercel.


## 2026-03-30 â€” Sessione

- âœ… **BookShelf: filtri â†’ dropdown** â€” Stato, Voto min, Collezione convertiti da tag cliccabili a `<select>` compatti. PiÃ¹ comodi su mobile, meno ingombro.
- âœ… **BookShelf: click copertina in griglia** â€” Prima non faceva nulla (o mostrava solo le note). Ora apre direttamente la scheda di modifica del libro.
- âœ… **Footnote: top nav scroll** â€” `overflowX:'auto'` sull'header, `flexShrink:0` su logo e pulsanti destra, `gap:8` al posto di `justifyContent:'space-between'`. Ora scorre su mobile.
- âœ… **ListenS: copertine podcast non persistevano** â€” Aggiunto `cover_url: r.cover` nel mapping da Supabase (i componenti usano `cover_url`, ma Supabase salva/restituisce `cover`). Fix anche sul fallback localStorage.
- âœ… **ListenS: duplicati in Discovery** â€” `DiscoveryView` ora riceve prop `podcasts` e verifica se il podcast Ã¨ giÃ  in lista (per titolo o feed_url). Il badge "aggiunto" persiste anche dopo riavvio.
- âœ… **Deploy bat fix** â€” Aggiunti `set PATH=%PATH%;C:\Program Files\nodejs` in tutti i `deploya.bat` (BookShelf, Footnote, ListenS) e `C:\Program Files\Git\cmd` in `deploya_railway.bat` (Digest). Errore "npx non riconosciuto" risolto.
- âš ï¸ **Footnote: Unterminated String JSON** â€” Il fix lato client Ã¨ giÃ  presente (`return data.text`). Il fix `server.py` (Railway) Ã¨ pronto ma non ancora deployato. **Azione richiesta: aprire `Digest/deploya_railway.bat`.**
## 2026-03-29 â€” Sessione #2 (Supabase migration + icona)

- âœ… **Supabase migration completata** â€” BookShelf, Footnote, ListenS migrati su progetto `pchldmiavycxzpkzochn`
  - SQL schema eseguito (8 tabelle: `bs_books`, `bs_collections`, `bs_goals`, `fn_books`, `ls_podcasts`, `ls_collections`, `ls_positions`, `ls_queue`)
  - Auth email+password, RLS attiva su tutte le tabelle
  - Migrazione automatica localStorage â†’ Supabase al primo login (window.confirm)
  - Posizioni podcast: merge Supabase+localStorage al login, sync periodica ogni 30s
- âœ… **ListenS: auth guard** aggiunto (schermata loading + redirect AuthScreen se non autenticato)
- âœ… **ListenS: SW cache** bump `listens-v5 â†’ v6`, redeploy Vercel
- âœ… **BookShelf: import JSON fix** â€” `processImport` ora fa upsert su Supabase (prima perdeva i dati al refresh)
- âœ… **BookShelf: redeploy** su `bookshelf.commonplaceapp.org`
- âœ… **Icona Commonplace**: `Suite/commonplace-icon.svg` + `Suite/favicon.svg` â€” simbolo âœ¦ amber su sfondo `#0f0e0b`, coerente con suite. `Suite/index.html` aggiornato a `favicon.svg`.

**âš ï¸ Azioni richieste (una tantum):**
- Aprire ciascuna app, fare login, confermare migrazione dati localStorage quando richiesto
- Verificare Supabase keep-alive via cron-job.org per progetto `pchldmiavycxzpkzochn`

---

## 2026-03-29 â€” Sessione

- âœ… ListenS: revisione mobile UX completa â€” deployato su Vercel
  - **Nav bar**: overflow-x scroll orizzontale su mobile (`className="nav-tabs"`), scrollbar nascosta
  - **Font**: `font-size: 17px` su body per leggibilitÃ  mobile
  - **PlayerBar**: refactor a 2 righe â€” riga 1: cover+titolo (tapâ†’FullPlayer)+play; riga 2: âˆ’15s/+15s/speed/sleep/tempo
  - **FullPlayerSheet**: nuovo componente full-screen â€” slider progress, â†º15/play/â†»15, speed, sleep, descrizione episodio
  - **Autoplay coda**: fix stale closure â€” `playFnRef.current` invece di `player.play` catturato al mount
  - **Android Auto**: `seekto` handler + `setPositionState` (scrubber in sync) + `nexttrack`/`previoustrack` Media Session
  - **Descrizione podcast**: mostrata in `PodcastRow` (Discovery/search), max 2 righe

---

## 2026-03-27 â€” Sessione

- âœ… ListenS: `ReferenceError: onMarkPlayed is not defined` fixato â€” `onMarkPlayed` mancava dalla destructuring dei props di `PodcastDetailView` (era passato dall'App ma non dichiarato nel parametro della funzione). Una riga aggiunta â†’ bug risolto.
- âœ… ListenS: redeploy Vercel

---

## 2026-03-28 â€” Sessione #2
- âœ… BookShelf: link a Footnote aggiornato â†’ `https://footnote.commonplaceapp.org` (era `/footnote.html` relativo, 3 occorrenze)
- âœ… Footnote: "Reading Buddy" rimosso dall'header UI e dal footer PDF â†’ ora dice "Footnote"
- âœ… BookShelf + Footnote: redeploy Vercel con tutte le fix

---

## 2026-03-28 â€” Sessione #1
- âœ… ListenS: bug root cause trovato â€” parentesi mancante nel gestore sleep timer (`opts[(indexOf...` â†’ `opts[indexOf...`) â†’ SyntaxError Babel â†’ schermata bianca. Fixato e deployato
- âœ… ListenS: SW cache bump `listens-v2 â†’ v3` (forzava versione rotta dalla cache)
- âœ… ListenS: aggiunto `window.onerror` visibile a schermo per debug futuro (tecnica diagnostica riutilizzabile)
- âœ… BookShelf: aggiunto `manifest.json` + `sw.js` â†’ installabile come PWA
- âœ… Footnote: aggiunto `manifest.json` + `sw.js` â†’ installabile come PWA
- âœ… BookShelf: deployato su Vercel (include fix default status â†’ `"da leggere"` + PWA)
- âœ… Footnote: proxy AI via Digest Railway â€” `API_URL` â†’ `/api/claude` su Railway, chiave API rimossa dal browser
- âœ… Digest: aggiunto endpoint `/api/claude` (server-side proxy per Footnote, usa `ANTHROPIC_API_KEY` env var)
- âœ… Homepage: favicon SVG "C" amber su sfondo scuro aggiunta e deployata
- âœ… Supabase migration pianificata (domenica/lunedÃ¬): BookShelf + Footnote, login obbligatorio, profilo su Supabase

**âš ï¸ Azione richiesta (una tantum):**
- **Railway â†’ Variables**: aggiungere `ANTHROPIC_API_KEY = sk-ant-...` per attivare il proxy Footnote
- **Railway â†’ Networking**: configurare custom domain `digest.commonplaceapp.org`

---

## 2026-03-27 â€” Sessione completata
- âœ… Homepage `commonplaceapp.org`: deployata su Vercel (sezione Suite + Collaterali)
- âœ… Digest: link aggiornato a `https://web-production-566bf.up.railway.app/` (Railway, in attesa DNS `digest.commonplaceapp.org`)
- âœ… Homepage: ReadS spostato nella sezione Collaterali (stessa riga di Ledger e DnD Master)
- âœ… BookShelf: default status nuovo libro â†’ `"da leggere"` (era `"letto"`)
- âœ… `deploy_home.bat` creato in `Home/`
- âœ… commonplace.md aggiornato

---

## 2026-03-26 â€” Sessione completata
- âœ… ListenS: Home tab + sleep timer + segna ascoltato
- âœ… DnD Master: mobile bottom nav (tutti 9 tab, â‰¤768px)
- âœ… Icone: F/B/R (Footnote, BookShelf, ReadS) PNG + favicon in index.html
- âœ… Platea icona B1 documentata
- âœ… icon-preview.html aggiornato â€” suite completa (N L D P F B R)
- âœ… Digest: modello â†’ `claude-sonnet-4-6`, error hint crediti API (server.py + index.html)
- âœ… DnD Master: 29 chiavi localStorage â†’ `userKey()` (imported + session + names + monsters)
- âœ… DnD Master: rebuild dist (`index-CavcuQ-E.js`)
- âœ… Robustezza: porte Vite uniche (BookShelf:5173, NoteS:5174, DnDMaster:5175, Ledger:5177)
- âœ… ErrorBoundary aggiunto in main.jsx (BookShelf, NoteS, DnDMaster, Ledger) e ListenS index.html
- âœ… `safeLsSet` + toast DOM in tutte le app (BookShelf, NoteS, DnDMaster, ListenS) â€” gestione limite localStorage
- âœ… NoteS audio: modello â†’ `claude-sonnet-4-6`, JSON.parse resiliente con fallback, log step
- âœ… ListenS: redeploy Vercel (ErrorBoundary + safeLsSet)
- âœ… DnDMaster: rebuild dist (`index-Btf3jl4X.js`)
- âœ… Hotfix `safeLsSet`: replace globale aveva sostituito anche la riga interna alla funzione â†’ ricorsione infinita â†’ schermata bianca. Fixato in BookShelf, NoteS, DnDMaster, ListenS. DnDMaster rebuild + ListenS redeploy Vercel.

---

## 2026-03-31 â€” Sessione #7

- âœ… ListenS: 5 bug fixati in un unico deploy â€” auth double-load (`[user?.id]`), phantom podcasts (`delete()` esplicito su Supabase), stale closure (`setPodcasts(prev=>...)`), cover_url normalization, home episodes (`useEffect([podcasts])` + `fetchingRef`) â€” SW v10
- âœ… Footnote: streaming Node.js su Vercel (`res.flushHeaders()` + `res.write()`) â†’ bypass timeout 10s Hobby plan. `jsonrepair` da `esm.sh` â†’ gestisce tutti i JSON malformati da Claude. SW v13
- âœ… Digest: migrato da Railway a **Render** (`https://digest-blqp.onrender.com`). Fix `postgres://` â†’ `postgresql://`. Aggiunti `runtime.txt` e `render.yaml`. Home aggiornata.
- âœ… Dashboard v1: costruita (`Dashboard/index.html`). Legge `cp_items` + `cp_log` da localStorage. Stats, "in corso", "ultimi finiti", log attivitÃ  per giorno. VerrÃ  deployata su `dash.commonplaceapp.org`.
- âœ… Home: Dashboard aggiunta alla griglia app.

**âš ï¸ Azioni richieste:**
- **Dashboard:** creare repo Git + deploy Vercel su `dash.commonplaceapp.org`
- **Digest custom domain:** configurare CNAME `digest` â†’ `digest-blqp.onrender.com` su DNS Vercel + aggiungere custom domain su Render
- **cp_items/cp_log cross-domain:** le app scrivono su localStorage per-subdomain â†’ Dashboard non puÃ² leggerli direttamente. Fix futuro: sync `cp_items` + `cp_log` su Supabase (stesso progetto `pchldmiavycxzpkzochn`)

---

## 2026-04-02 â€” Sessione #9

- âœ… **Footnote: messaggi chat che sparivano dopo il 2Â° scambio** â€” `setMsgs` catturava `msgs` e `allSessions` dalla chiusura del render; la callback async di `claude()` sovrascriveva il messaggio utente con dati stantii. Fix: `setAllSessions(prev => ...)` con `activeIdRef` aggiornato via `useEffect`, piÃ¹ un `useEffect([allSessions])` con `didMountRef` per propagare `onSaveSessions` in modo reattivo. Stale closure eliminata.
- âœ… **Footnote: podcast assenti nei consigli** â€” Claude ometteva il campo `podcasts` perchÃ© il prompt non lo richiedeva esplicitamente. Fix: aggiunta istruzione `IMPORTANT: the "podcasts" array must always contain exactly 2 real podcast recommendations...` sia in `initPrompt()` che in `initPrompt2()`. Migliora anche la qualitÃ  delle schede `related` con show name + episode/topic + motivo del collegamento.
- âœ… **Footnote: importa da BookShelf non trovava tutti i libri** â€” L'implementazione precedente leggeva `localStorage('libreria-personale-v1')` â€” impossibile cross-origin da `footnote.commonplaceapp.org`. Fix: `onImportBS` ora Ã¨ async e legge direttamente da Supabase `bs_books` (filtrato per `user_id`). Richiede login.
- âœ… **Footnote: libri importati sparivano al reload** â€” `saveBooks(b, syncBook)` scriveva su Supabase solo se passato un secondo argomento singolo; l'import chiamava `saveBooks([...books,...newOnes])` senza `syncBook` â†’ solo localStorage â†’ al reload (che legge da Supabase) i libri mancavano. Fix: `saveBooks` ora accetta `syncBooks` come array o singolo libro, fa un unico `upsert` bulk. L'import passa `newOnes` come secondo argomento.
- âœ… **Footnote: SW v20** â€” deploy pronto (commit `f75f4ff`). Lanciare `deploya.bat`.

**âš ï¸ Azioni richieste:**
- **Eseguire su Supabase** (progetto `pchldmiavycxzpkzochn` â†’ SQL Editor) se non giÃ  fatto:
  ```sql
  ALTER TABLE fn_books ADD COLUMN IF NOT EXISTS data JSONB DEFAULT NULL;
  ```
- **Dashboard:** puntare `dash.commonplaceapp.org` su Vercel DNS (progetto `cp-dashboard` giÃ  deployato)
- **Footnote:** lanciare `deploya.bat` per pubblicare SW v20

---

## 2026-04-01 â€” Sessione #8

- âœ… Digest: migrazione Render completata. URL confermato: `https://digest-blqp.onrender.com`. Home aggiornata e pushata su GitHub.
- âœ… Dashboard v1: deployata. Creato repo Git, `vercel.json`, `deploy_dashboard.bat`. Deploy via Vercel CLI (progetto `cp-dashboard`). Da puntare a `dash.commonplaceapp.org`.
- âœ… Footnote: streaming robusta â€” `reader.read()` throw catturato con fallback su risposta parziale. Errori Anthropic SSE (`__STREAM_ERR__`) propagati al client. File size limit 3MB prima dell'invio.
- âœ… Footnote: max_tokens generazione scheda 4000 â†’ 8000.
- âœ… Footnote: `api/claude.js` ora cattura eventi `error` dentro lo stream SSE e li scrive come `__STREAM_ERR__:message` â€” client mostra il messaggio reale invece di "risposta vuota".
- âœ… Footnote: campi vuoti con file â€” split in **2 chiamate API**. Call 1 (con file): `overview`, `context`, `keyChapters`, `keyConcepts` (4000 tokens). Call 2 (senza file, usa contesto call 1): `readingGuide`, `focusQuestions`, `controversies`, `readingJournal`, `related` (4000 tokens). Senza file: singola chiamata da 6000 token invariata.
- âœ… Footnote: duplicazione schede â€” `useEffect([user?.id])` (stesso fix ListenS) + guard `p.find()` sul deep-link da BookShelf.
- âœ… Footnote: scheda sparisce dopo reload â€” `fn_books` mancava colonna `data JSONB`. Fix: `bookToRow` ora salva `data`, `rowToBook` ora la ripristina. Migration SQL: `ALTER TABLE fn_books ADD COLUMN IF NOT EXISTS data JSONB DEFAULT NULL;` â€” **da eseguire su Supabase progetto `pchldmiavycxzpkzochn`**.
- âœ… Footnote: "Importa da BookShelf giÃ  presenti" â€” era conseguenza del bug sopra (libri in Supabase senza data, check titolo/autore li trovava come giÃ  presenti). Risolto indirettamente.
- âœ… Footnote: SW v18

**âš ï¸ Azione richiesta:**
```sql
-- Supabase â†’ progetto pchldmiavycxzpkzochn â†’ SQL Editor
ALTER TABLE fn_books ADD COLUMN IF NOT EXISTS data JSONB DEFAULT NULL;
```

**Next steps:**
- Dashboard: puntare `dash.commonplaceapp.org` su Vercel DNS (deploy `cp-dashboard` giÃ  fatto)
- NoteS: fix bug audio note
- Supabase sync `cp_items`/`cp_log` â†’ Dashboard v2
- Testing approfondito suite completa: BookShelf, ListenS, Footnote, interazioni cross-app
- Build sprint: Platea (watch tracker), ReadS

---

## 2026-04-07 â€” Sessione #9

### Footnote
- âœ… **Chat risposte troncate** â€” limite token chat 1000 â†’ 2000; aggiunta istruzione sysPrompt "be focused and concise, 2-3 paragraphs per reply"
- âœ… **Podcast mancanti nelle risorse correlate** â€” root cause: campo `podcasts` era l'ultimo nel JSON â†’ veniva tagliato dal limite token. Fix: `podcasts` spostato PRIMO nell'oggetto `related`; conteggi espliciti nel prompt (2 podcast, 3 libri, 2 film)
- âœ… **+ListenS non funzionava** â€” cross-origin localStorage (subdomini diversi). Fix: `addPodcastToListenS()` scrive direttamente su Supabase `ls_podcasts`
- âœ… **â†’BookShelf e â†’Wishlist non funzionavano** â€” stesso bug cross-origin. Fix: `exportToBookShelf()` e `addSuggestionToWishlist()` scrivono su Supabase `bs_books`
- âœ… **Film/documentari mancanti dalle risorse** â€” stesso fix prompt con conteggi espliciti
- âœ… **Pulsante â†º Rigenera** â€” aggiunto in Dashboard (accanto a Esporta PDF) per rigenerare scheda esistente senza cancellare il libro
- âœ… **Footnote SW v26** â€” deploy con tutti i fix

### ListenS
- âœ… **Android Auto / nexttrack stale closure** â€” `player.currentRef.current?.episode?.id` invece di `player.episode?.id` catturato al mount; MediaMetadata con artwork multi-size e campo `album`
- âœ… **Coda auto-remove dopo ascolto** â€” `markEpisodePlayed(played=true)` ora filtra anche la coda (`ls_queue`)
- âœ… **Blocchi audio casuali (stall recovery)** â€” `audio.preload='auto'`; listener `stalled` con timeout 2s + reload src + seek; listener `playing` cancella timer; listener `error` resetta stato; `.catch()` su tutti i `audio.play()`; pulizia stallTimer nel cleanup useEffect
- âœ… **Header compatto** â€” padding ridotto (`12px 22px` â†’ `8px 16px`), logo piÃ¹ piccolo, pulsanti `â†` e `+ RSS` ridimensionati
- âœ… **ListenS SW v12** â€” deploy pronto, lanciare `deploya.bat`

**âš ï¸ Azioni richieste:**
- **ListenS:** lanciare `deploya.bat` nella cartella ListenS per pubblicare SW v12
- **Debug ListenS** da fare nella prossima sessione (Chrome non raggiungibile stasera)

## 2026-04-09 â€” Sessione #11

- âœ… **Dashboard v2** â€” `Dashboard/index.html` riscritto con Supabase client (progetto `llvqoiyvzloloobjiloe`, anon key, no auth richiesta). Legge `cp_items` + `cp_log` via query diretta. Mapping field Platea: `subtitle` â†’ creator, `event_at` â†’ date, `metadata.rating` â†’ stelle. Status `watching/watched` normalizzati. Pulsante "â†º aggiorna". Status bar con timestamp e conteggio live. Deployato su `dash.commonplaceapp.org`.
- âœ… **Platea â€” rating UI** â€” `PlayerScreen.tsx`: aggiunto `Modal` import, state `ratingModal`/`pendingRating`, modal 5 stelle dopo YouTube 'ended' (con opzione "salta"). `cp.ts`: `syncCpItem` accetta ora `rating?: number` opzionale, scritto in `metadata.rating`. Modifiche staged â€” build nel sprint 13 aprile.
- âœ… **NoteS â€” integrazione cp_log + item_id + UI "Collega a item"** â€” `src/App.jsx`: aggiunto secondo client Supabase (`cpSupabase` â†’ progetto `llvqoiyvzloloobjiloe`); `syncNoteToSupabase` ora scrive evento `noted` in `cp_log`; `NotesApp` carica `cpItems` da Supabase e li passa a `NoteEditor`; aggiunto state `itemId`/`itemIdRef`/`showItemPicker`; `scheduleSave` include `item_id`; toolbar NoteEditor: se nota collegata mostra ðŸ”— titolo + Ã— (rimuovi), altrimenti bottone "ðŸ”— collega item" con picker dropdown raggruppato per tipo (max 30 per gruppo). Build Vite âœ…, deploy Vercel `notes.commonplaceapp.org` âœ…
- âœ… **ListenS â€” Esporta JSON** â€” `exportJSON()` aggiunta in `App()`: raccoglie tutte le chiavi `ls_*` e `cp_*` da localStorage, genera download `.json` con data. Pulsante â¬‡ nell'header accanto al toggle dark/light. SW v12 â†’ v13. Deployato su `listens.commonplaceapp.org`.

## 2026-04-09 â€” Sessione #10

### NoteS
- âœ… **Bug audio note journal** â€” due fix in `src/App.jsx`:
  1. `scheduleSave()` mancante nell'`onResult` journal dell'`AudioRecorder` â€” il contenuto veniva aggiunto allo state React ma mai persistito su Supabase. Fix: aggiunto `scheduleSave()` dopo i `setEntries`.
  2. `JournalEntry` DOM non aggiornato quando l'audio aggiungeva testo a un'entry esistente â€” `useEffect` dipendeva solo da `[entry.id]`. Fix: aggiunto secondo `useEffect([entry.content])` con guard `entry.content !== contentRef.current` per sincronizzare il DOM solo in caso di aggiornamento esterno (non durante la digitazione).
- âœ… Build Vite + deploy Vercel (production) â€” `notes-6l5c84z9g`
- âœ… Git commit: `fix: NoteS audio note journal â€” scheduleSave + DOM sync`

### Dashboard
- âœ… **DNS `dash.commonplaceapp.org`** â€” deploy `--prod --yes --name cp-dashboard`; `vercel domains add dash.commonplaceapp.org` aggiunge il dominio al progetto `cp-dashboard`. Verificato: HTTP 200, "Dashboard â€” Commonplace" in produzione.

### ListenS (Q&A)
- Confermato: Supabase non necessario per ListenS. L'app Ã¨ usata quasi esclusivamente da un singolo dispositivo (telefono), quindi localStorage Ã¨ sufficiente. Supabase aggiungerebbe valore solo per sync cross-device, non prioritario.

**Next steps:**
- Testing approfondito suite completa: BookShelf, ListenS, Footnote, interazioni cross-app
- Supabase sync `cp_items`/`cp_log` â†’ Dashboard v2
- Build sprint: Platea (watch tracker), ReadS

---

## Syllabus

**Scopo:** Curriculum builder AI-powered per percorsi di studio personali umanistici e culturali.

**Tech stack:** React + Vite SPA, Anthropic API via proxy serverless `/api/claude` (Vercel Function), Supabase

**Cartella:** `Claude/Progetti/Commonplace/Syllabus/app/`

**GitHub:** `olengard/syllabus`

**Deploy:** Vercel -- `syllabus.commonplaceapp.org`

**Supabase:** progetto `pchldmiavycxzpkzochn` (stesso di BookShelf/Footnote/ListenS)
- Tabelle: `sl_curricula`, `sl_resources`, `sl_reference_items`, `sl_connections`, `sl_chats`
- Colonna `raw_data jsonb` in `sl_curricula`: salva output AI completo, fonte primaria al caricamento
- Auth email+password, RLS attiva

**AI:** proxy serverless `api/claude.js` (pattern Footnote) — ⚠️ FINO AL 2026-06-09 la chiave era nel bundle client (`VITE_ANTHROPIC_API_KEY` + direct browser access): quasi certamente la causa del furto della chiave. Bonificato.
- Chips di fuoco: `claude-haiku-4-5-20251001` (step 2 wizard, veloce)
- Generazione curriculum: `claude-opus-4-8`, 2 chiamate parallele (risorse || extra) + top-up risorse mancanti + riparazione progetto finale tronco
- Chat affinamento: `claude-sonnet-4-6` con protocollo azioni (add/remove risorse, progetto finale)
- `ANTHROPIC_API_KEY` (senza VITE_) nelle Vercel env vars — usata solo dal proxy
- Dev locale: `npx vercel dev` (avvia_syllabus.bat aggiornato, porta 3000)

**Funzionalita completate:**
- Wizard 6 step: argomento, aree di fuoco (AI-generated), tempo/livello, punti fermi, connessioni, generazione
- Generazione AI con streaming SSE -- nessun timeout, risposta incrementale
- Persistenza Supabase con raw_data JSONB come fonte primaria (bypass problemi schema cache PostgREST)
- Export PDF (apre nuova scheda stampabile con layout editoriale)
- Cancellazione percorsi (pulsante x su card + pulsante Elimina in vista dettaglio, con confirm)
- Bottoni link alle app della suite (BookShelf, Footnote, ListenS, Platea)
- PWA installabile: manifest.json + sw.js, icone 192/512px
- Mobile responsive: useMobile hook, FAB bottom-right, sidebar nascosta su mobile
- Auth email+password (stesso pattern BookShelf/ListenS)

**Icone:** coerenti con suite -- sfondo scuro `#0f0e0b`, accento amber `#c8903a`

**Note tecniche critiche:**
- `generate.js` scritto in ASCII puro: Desktop Commander corrompe caratteri UTF-8 accentati nelle stringhe. Mai usare edit_block con testo italiano su questo file -- usare PowerShell.
- `raw_data jsonb` e' la fonte primaria per risorse e sezioni di riferimento al caricamento. Le tabelle figlie `sl_resources` e `sl_reference_items` sono secondarie (problemi schema cache PostgREST ricorrenti).
- Streaming SSE in `callClaude()`: timeout 30s solo per handshake iniziale, poi lettura stream senza limite temporale.
- Cartella locale: `Syllabus/app/` mappa sulla root del repo `olengard/syllabus` (src/ e' direttamente nella root del repo, non dentro app/).

**SQL eseguiti su Supabase `pchldmiavycxzpkzochn`:**
- `sl_curricula`: aggiunte colonne `description`, `focus_areas`, `time_commitment`, `level`, `must_haves`, `progress_pct`, `status`, `updated_at`, `progetto_finale`, `ai_suggestions`, `raw_data`
- `sl_resources`: aggiunta colonna `description`
- `sl_reference_items`: aggiunta colonna `label`; RLS INSERT policy aggiunta
- `NOTIFY pgrst, 'reload schema'` eseguito dopo ogni ALTER TABLE

**Stato attuale:** Funzionante — revisione completa 2026-06-09 (Sessione #18). ⚠️ Da fare: impostare nuova `ANTHROPIC_API_KEY` su Vercel (progetto Syllabus) + redeploy.

**Aggiornamento 2026-06-09 (Sessione #18 — revisione Fable 5):**
- SICUREZZA: eliminata `VITE_ANTHROPIC_API_KEY` dal client (era nel bundle pubblico → causa probabile del furto chiave). Creato proxy `api/claude.js`, vercel.json con maxDuration 120 e rewrites che escludono /api/, .env bonificato con avvertenza
- Generazione: Opus 4.8, 2 chiamate parallele (titolo+risorse || referenceSections+progetto+suggerimenti) = niente troncamenti; top-up automatico se le risorse sono sotto il target; riparazione progetto finale tronco (`looksTruncated`)
- Modulazione: aggiunto `levelHint()` — il livello cambia la NATURA delle risorse (principiante: opere-ponte ordinate; esperto: fonti primarie + 2 opere che un esperto non conosce). Target risorse ritoccati (9/13/18/24)
- FIX progress tracking (rotto da sessione #17): `handleToggleResource` era annidata dentro `handleDeleteResource`, il checkbox non esisteva in ResourceCard, la barra di progresso era dentro il pannello rigenera. Ora: cerchietto ✓ su ogni risorsa, barra nell'header, progress_pct salvato
- Chat "Affina il percorso" REALE (era un segnaposto): Sonnet con contesto del percorso, protocollo azioni (add_resource/remove_resource/update_final_project) applicate e salvate, cronologia persistita su sl_chats (tabelle esistenti, prima inutilizzate)
- Wizard: `focusNote` (aspetto specifico) ora entra nelle aree di fuoco; `connection` (step 5) ora crea davvero la connessione al salvataggio. Prima entrambi raccolti e ignorati
- Nota: il vecchio problema "DC corrompe UTF-8 in generate.js" non si è ripresentato (verificato byte per byte: accenti e regex integri)
- FIX tassonomia risorse (2026-06-10): "Risorse non testuali" mostrava in realtà la fase "other" (testi di ampliamento). Ora i testi si dividono per fase (primarie / secondarie+ampliamenti) e la sezione non testuale raccoglie davvero film/documentari/podcast per TIPO; prompt aggiornato con quota 20-30% di media non testuali dove pertinente
- FIX schermata bianca post-deploy (2026-06-10): sw.js era cache-first su index.html → dopo ogni deploy serviva l'index vecchio con bundle inesistenti. Ora network-first con cache come fallback offline (pattern Footnote), CACHE v3→v4, /api/ mai intercettato, header no-cache su /sw.js in vercel.json. Stessa malattia che Footnote "curava" con l'hack unregister+reload

**Roadmap:**
- Integrazione reale con BookShelf/ListenS (aggiunta diretta da Syllabus alle altre app)
- Inclusione in Dashboard Commonplace (cp_items/cp_log per percorsi completati)

---


## 2026-04-16 -- Sessione #17

- [x] Curriculum.jsx: ResourceCard -- checkbox per marcare risorsa come completata
- [x] Curriculum.jsx: handleToggleResource() -- aggiorna localResources, ricalcola progress_pct, salva raw_data in Supabase
- [x] Curriculum.jsx: progress bar nell'header -- "X/Y completate" + barra amber con transizione
- [x] Build Vite + deploy Vercel (bundle CVCah2NA, 448 kB)
- [x] digest.commonplaceapp.org -- CNAME su Vercel DNS -> Render (digest-blqp.onrender.com) OK
- File modificati: Curriculum.jsx
## 2026-04-16 -- Sessione #16

- [x] supabase.js: aggiunta loadBookShelfTitles() -- carica Set dei titoli bs_books dell'utente
- [x] Curriculum.jsx: ResourceCard ora mostra "checkmark BookShelf" (verde, non cliccabile) se il libro e' gia' in BookShelf
      Matching case-insensitive sul titolo; il check avviene al mount del componente Curriculum
- [x] Curriculum.jsx: modifica percorso -- titolo e descrizione editabili inline (icona matita nell'header)
- [x] Curriculum.jsx: elimina singola risorsa -- pulsante x per risorsa, aggiorna raw_data in Supabase
- [x] Curriculum.jsx: pannello "Rigenera risorse" -- checkboxes per selezionare risorse da mantenere come punti fermi,
      chiama generateCurriculum con mustHaves, salva nuovo raw_data
- [x] App.jsx: aggiunto handleCurriculumUpdate(id, patch) + onUpdate prop passato a Curriculum
- [x] Syllabus note tecniche: generate.js max_tokens ora 8192; repairJson() aggiunta
- [x] Build Vite + deploy Vercel (bundle Clpn2PX_, 447 kB)
- File modificati: supabase.js, Curriculum.jsx, App.jsx
## 2026-04-16 -- Sessione #15

- [x] Diagnosi dominio: syllabus.commonplaceapp.org puntava a deployment vecchio (bundle COsPEBfy), non al progetto "app" attivo (app-zeta-gules-42.vercel.app)
- [x] generate.js: maxTokens da 4096 -> 8192 per generateCurriculum (prevenzione troncatura su percorsi lunghi)
- [x] generate.js: aggiunta repairJson() -- parsing in 3 passi: normale / chiusura strutturale / backtrack
      Evita errore "Risposta AI non parsabile" anche se il JSON arriva parzialmente troncato
- [x] sw.js: cache bumped da v2 a v3 (force refresh service worker)
- [x] Deploy: il nuovo deploy ha automaticamente risolto il domain alias (Aliased: syllabus.commonplaceapp.org)
- [x] Verifica live: bundle BrpKyNwo ora servito correttamente su syllabus.commonplaceapp.org
- File modificati: generate.js, sw.js
## 2026-04-16 -- Sessione #14

- [x] generate.js: targetResourceCount aggiornato -- percorso "aperto" genera 22 risorse (era 9 default)
- [x] generate.js: aggiunta funzione durationHint() -- calibra struttura e distribuzione fasi per durata:
      poche settimane (5 ris, 60% primary), 2-3 mesi (8 ris), 6 mesi (12 ris), anno (16 ris), aperto (22 ris, corpus tematico)
- [x] App.jsx: wizardPrefill state + openWizard ora passa il prefill al Wizard (era ignorato)
- [x] Wizard.jsx: prop prefill = null; useEffect inizializza topic; quickGenerate() con chip default
- [x] Wizard.jsx: step 1 biforcato -- modalita prefill mostra "Genera subito" + "Personalizza passo per passo"
- [x] Build Vite + deploy Vercel (bundle 440 kB, +3 kB)
- File modificati: generate.js, App.jsx, Wizard.jsx

## 2026-04-16 -- Sessione #13

- [x] Aggiunta card Syllabus (link a syllabus.commonplaceapp.org) in commonplaceapp.org
- [x] Homepage: icona Dashboard cambiata da sym/muted a amber; link rapido "-> dashboard" in header
- [x] Dashboard (dash.commonplaceapp.org): ricerca trasversale cp_items + NoteS + Syllabus con debounce 320ms
- [x] Dashboard: empty state migliorato con spiegazione del registro e link alle app
- [x] Dashboard: secondo client Supabase sb1 (pchldmiavycxzpkzochn) per NoteS + Syllabus
- [x] Syllabus: favicon.svg e icone PNG (32/192/512px) rigenerate con stile suite (sfondo scuro + S amber)
- [x] Deploy: Home, Dashboard, Syllabus (build Vite + Vercel --prod)
- File modificati: Home/index.html, Dashboard/index.html, Syllabus/app/public/favicon.svg + *.png

### Next steps
- Last.fm / Qobuz integrazione album tracking in ListenS
- Ledger: push notifications + export CSV/PDF (pre-build)
- DnD Master: loot tables (pre-build)
- digest.commonplaceapp.org custom domain su Render
- Sprint build: ReadS EAS, Platea EAS, Ledger Capacitor APK, DnD Master Capacitor APK
- Syllabus roadmap: progress tracking, integrazione BookShelf/ListenS, cp_log percorsi completati

## 2026-04-16 -- Sessione #12

- [x] Checklist sicurezza completata:
  - Digest: secret_key da env [OK]
  - DnD Master: userKey() isolation [OK] (era gia fatto il 2026-03-26, doc obsoleto)
  - ErrorBoundary: aggiunto a Footnote (index.html) e Syllabus (main.jsx) -- deploy entrambi
  - safeLsSet: gia presente nelle app principali. Footnote (solo preferenze, Supabase primario). Syllabus (Supabase only).
  - Zero console.log con dati sensibili [OK]
  - Rischi documentati e accettati: Syllabus VITE_ANTHROPIC_API_KEY in bundle, NoteS anon key Supabase hardcoded

### Next steps (post sessione #12)
- Last.fm / Qobuz integrazione album tracking
- Ledger: push notifications + export CSV/PDF
- DnD Master: loot tables
- digest.commonplaceapp.org custom domain su Render
- Sprint build: ReadS EAS, Platea EAS, Ledger Capacitor APK, DnD Master Capacitor APK
- Syllabus roadmap: progress tracking, integrazione BookShelf/ListenS, cp_log percorsi completati
## 2026-04-15 -- Sessione Syllabus (suite entry)

- Syllabus entra nella suite Commonplace come app per curriculum builder AI-powered
- Stack: React + Vite SPA, Supabase (progetto `pchldmiavycxzpkzochn`), Anthropic API streaming SSE
- Deploy: `syllabus.commonplaceapp.org` su Vercel, GitHub `olengard/syllabus`
- Wizard 6 step completato con generazione AI reale (claude-sonnet-4-6)
- Persistenza Supabase con raw_data JSONB come fonte primaria (bypass ricorrenti problemi schema cache)
- PDF export con layout editoriale, cancellazione percorsi con confirm
- Link alle app della suite: BookShelf, Footnote, ListenS, Platea
- Prompt AI: include risorse italiane alla pari delle anglofone

## 2026-05-05 -- Sessione #18 (debug 403 Syllabus + Footnote)

- [x] Causa identificata: Vercel Deployment Protection attivata automaticamente su Syllabus e Footnote
- [x] Fix: disabilitata da Team Settings > Security > Deployment Protection per entrambi i progetti
- [x] Syllabus: torna accessibile su web e mobile dopo il fix
- [x] Footnote mobile: disinstallare e reinstallare PWA per svuotare cache service worker
- [x] Nota aggiunta: token CLI Vercel scaduto (expiresAt ~2026-04-17) -- eseguire `vercel login` prima del prossimo deploy da CLI

### Gotcha -- Vercel Deployment Protection
La protezione puo' essere abilitata automaticamente da Vercel (cambio policy Hobby plan).
Se le app mostrano 403 Forbidden con ID `cdgX::...`, controllare:
vercel.com > Team Settings > Security > Deployment Protection > impostare "Disabled" per tutti i progetti in produzione.
- generate.js riscritto in ASCII puro per compatibilita Desktop Commander
- Streaming SSE implementato: risolve timeout su generazioni lunghe
- [x] Bug: handleCurriculumUpdate era annidato dentro onDelete per una graffa mancante → ReferenceError a runtime quando si apre un curriculum
- [x] Fix: rimossa graffa extra, funzione spostata a livello componente in App.jsx
- [x] Bug: env vars Supabase mancanti su Vercel progetto Syllabus → NetworkError al login
- [x] Fix: aggiunte VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ANTHROPIC_API_KEY nelle env vars Vercel
- [x] Committate e pushate modifiche locali pendenti (Curriculum.jsx, Wizard.jsx, generate.js, supabase.js, main.jsx, icons)
- [x] App Syllabus verificata funzionante: login, apertura curriculum, interazioni OK

### Gotcha -- Vercel env vars
Le variabili d'ambiente non si propagano automaticamente ai nuovi progetti Vercel.
Dopo ogni nuovo progetto o re-deploy su progetto vuoto, verificare:
vercel.com > Progetto > Settings > Environment Variables
Valori Syllabus: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ANTHROPIC_API_KEY (vedi .env locale)




## 2026-07-11 — Sessione #20 (consegna Fable 5)

- ✅ **Commit del lavoro pendente della #18** (verificato: era già tutto live su Vercel prima del commit):
  BookShelf (ritmo di lettura, proiezioni, griglie responsive, pulizia rb_books), Footnote (schede v27),
  Home (card Syllabus/Dashboard), Syllabus (bonifica proxy committata nel repo annidato `102f8e6` + gitlink).
- ✅ **Verifiche di stato reale** (documentazione vs produzione):
  - `ls_migration_2026-06.sql` GIÀ eseguita su pchld; revisione ListenS GIÀ live (stableEpId, SW v13)
  - ANTHROPIC_API_KEY nuova attiva (Footnote v27 live funzionante)
  - Ledger = progetto Supabase `bogavweypmgyxwmdpsqm` (tabelle accounts/transactions/… verificate via MCP)
  - DnDMaster deploya via **Netlify CLI** (`.netlify/state.json`, bundle dist = bundle live) — documentato nel suo CLAUDE.md
  - ⚠️ progetto Supabase `llvqoiyvzloloobjiloe` (Platea/cp/Dashboard) NON visibile dall'account MCP: altra org, altro account o cancellato? Da chiarire prima di lavorare su Platea/Dashboard v2
- ✅ **Libreria skill operative** in `Progetti/Commonplace/.claude/skills/` (9 skill + README, committate e approvate):
  commit-suite, deploy-suite, sicurezza-api-key, supabase-commonplace, diario-di-sessione,
  sviluppo-e-verifica, app-single-file, triage-produzione, migrazione-digest.
  Scritte per Opus 4.8/Sonnet; revisione in 3 fasi (fattuale, usabilità, sicurezza) completata.
- **Regole cardine ratificate da Stefano**: deploy solo con autorizzazione esplicita per singolo deploy
  + promemoria a fine lavoro ("per vedere le modifiche bisogna deployare: vuoi che lo faccia io?");
  nessuna API key mai client-side (priorità assoluta). Priorità operative: 1) manutenzione/bugfix,
  2) migrazione Digest→Vercel+Supabase (piano in Digest/piano-migrazione-vercel.md), 3) sprint build.

- ✅ **Push** del repo esterno su `github.com/Olengard/syllabus` (`d5c53a8..125c833` + coda sessione).
  ⚠️ **TRAPPOLA SCOPERTA E DOCUMENTATA** (in `commit-suite`): il repo annidato `Syllabus/app` ha come
  origin lo STESSO remote del workspace ma storia incompatibile — la `main` remota appartiene al
  workspace. MAI push da `Syllabus/app` (un --force cancellerebbe il workspace remoto); i suoi commit
  restano locali, il deploy passa da Vercel CLI.
- ✅ **MANUALE-OPERATIVO.md** creato (radice Commonplace): il metodo per i lavori impegnativi —
  8 regole (ambito, prove, proporzione, verifica, strumenti-prima-delle-ipotesi, incertezze,
  fermarsi, calibrazione) + test di autovalutazione in 7 domande. Linkato dal README delle skill.

**⚠️ Azioni richieste:** nessuna.

## 2026-07-12 — Sessione #21

- ✅ **Digest: migrazione Vercel+Supabase — fasi 1-4 completate** (commit `12b1bb4` repo esterno,
  `d8822e7` repo annidato Digest per il piano aggiornato):
  - **SQL eseguito su pchld** via MCP: `dg_feeds` (con colonna `category`) + `dg_preferences`,
    schema e RLS verificati (1 policy own-data ciascuna, `information_schema` + `pg_policies`).
  - **Backend `DigestV/api/` completato**: trovate e colmate 2 lacune rispetto a server.py —
    (1) mancava **`preferences.js`** (il frontend usa GET/POST `/api/preferences` per feed
    prioritari, ultimi digest, collapsed cats); (2) `fetchFeed` non aveva il **fallback 403**
    di server.py — ora su 403 visita la homepage, raccoglie i cookie e ritenta con
    Referer+Cookie. Sintassi esbuild OK su tutti i 7 file.
  - **Frontend `DigestV/index.html`**: login Supabase della suite (signInWithPassword, sessione
    persistente supabase-js, logout+email in Impostazioni), `apiFetch` con Bearer access_token,
    categorie lette/scritte su `dg_feeds.category` (PATCH immediato, niente più
    `digest_feed_cats` in preferences), DELETE con `?id=`, **niente API key client-side**
    (rimossi input chiave e indirizzo server), rimosso il retry "server che si sveglia"
    (niente più cold start), sw.js network-first (mai cache su `/api/`) + manifest → PWA.
  - **Verifica**: JS inline sintassi OK; `fetchFeed` testato da Node su feed reali — BBC,
    Internazionale, Repubblica OK; **ilpost.it 403 anche via curl dal PC** (WAF anti-bot a
    monte, probabilmente fallisce anche dal Render attuale — da confrontare nel test di
    parità). Rendering verificato su server statico locale (launch.json `digestv-static`,
    porta 5180): login screen, modali, pannello Account, zero errori console.
- ✅ **Migrazione dati COMPLETATA** (2026-07-12, secondo blocco): **33 feed in `dg_feeds`**
  (33 URL distinti, tutti su user olengard@gmail.com, category 'news' — le categorie sono
  da riassegnare nella nuova UI: sul vecchio server `digest_feed_cats` era vuoto).
  Percorso accidentato, tre root cause trovate:
  - **401 al primo tentativo**: il vecchio script calcolava il token sha256 in locale e non
    validava la password → riscritto con login reale a `/api/auth` + `ErrorAction Stop`.
  - **Bug PS 5.1**: `Invoke-RestMethod` emette l'array JSON come singolo oggetto →
    `@(comando)` lo lascia annidato e il ForEach collassa 33 feed in 1 riga spazzatura
    (ripulita). Fix nel commento dello script: assegnare a variabile, poi `@($var)`.
    Alla fine i 33 feed (identici a `Digest/feeds.json`, verificato id-per-id) sono stati
    inseriti direttamente via SQL MCP.
  - **Preferenze del vecchio server VUOTE** (zero chiavi: niente categorie, niente feed
    prioritari, niente memoria_cache): il DB Render risulta più giovane del previsto —
    coerente con la scadenza del Postgres free (90gg da fine marzo ≈ fine giugno).
  - ⚠️ **DIFETTO SCOPERTO — cp-backup**: la sezione `digest` dei backup è in errore
    `HTTP 401` in TUTTI i backup dal 2026-06-12 a oggi (env `DIGEST_PASSWORD` su Vercel
    cp-backup errata o assente). Nessun backup Digest è mai esistito. Diventa moot dopo
    il cutover (backup leggerà dg_* da Supabase, già nel piano), ma va sistemato lì.
- ✅ **Deploy `digest-app` + test di parità PASSATO** (2026-07-12, terzo blocco, autorizzato):
  progetto Vercel nuovo `digest-app` (digest-app-olengards-projects.vercel.app), env impostate
  da Stefano, Deployment Protection disabilitata da Stefano (il default sui progetti nuovi
  redirige tutto all'SSO Vercel — 302, stesso gotcha del 403 cdgX). Il test sui feed REALI
  ha trovato e risolto 3 bug del backend nuovo:
  - **"URI malformed" (pagina in errore con dati carichi)**: `cleanHtml` JS troncava con
    `slice(0,300)` per unità UTF-16 → emoji spezzata → surrogata orfana →
    `encodeURIComponent` esplodeva in `renderArticles` e il catch di `loadAll` mascherava
    tutto da "API non raggiungibili". Il `[:300]` Python era immune. Fix: taglio per code
    point (`[...s].slice(0,300)`).
  - **"Entity expansion limit exceeded" (Guardian, Free Jazz, Public Domain Review)**:
    protezione anti-DoS di fast-xml-parser oltre 1000 entità. Fix: `processEntities:false`
    + `decodeXml()` proprio, applicato ANCHE ai link (un `&amp;` non decodificato
    cambierebbe l'md5 → ID diversi dal vecchio server → stato letto orfano).
  - **Jacobin 0 articoli**: Atom senza `<link>`, URL solo in `<id>` — server.py aveva il
    fallback (`entry.link or entry.id`), il ramo Atom nuovo no. Fix: fallback su id http.
  - **Esito finale: 531 articoli da 26/33 feed, 7 errori "fisiologici"** (DRB feed
    genuinamente vuoto — verificato sul raw; The Wire 404 URL morto; Weird Fiction Review
    timeout anche dal PC locale; Jazz Times/Dissent/New Statesman/Paris Review 403 WAF).
    Memoria OK (citazione da cp_quotes, cache in dg_preferences), riassunto AI OK (proxy),
    digest generalista OK (116 articoli, 6113→2446 token, ~$0.055, salvato in
    `digest_last_general`). API senza login → 401 su tutti gli endpoint (verificato curl).
- ✅ **CUTOVER ESEGUITO** (2026-07-12, quarto blocco, autorizzato da Stefano):
  - DNS: dominio `digest.commonplaceapp.org` aggiunto al progetto `digest-app` + rimosso
    il CNAME verso `digest-blqp.onrender.com` (rec_1e6d17a2…). Verificato: DNS risolve su
    IP Vercel, `/` → 200 col nuovo sw.js, `/api/feeds` → 401 senza login. Il vecchio
    frontend non registrava SW → nessuna cache fantasma; localStorage (stato letto) intatto.
  - Home: card Digest ora punta a `digest.commonplaceapp.org` (prima: URL Render diretto).
    Deployata e verificata live (curl sul href).
  - cp-backup: `dg_feeds`+`dg_preferences` aggiunte alle tabelle pchld, RIMOSSO
    `fetchDigest`/DIGEST_PASSWORD (era rotto da sempre: 401 in ogni backup). Deployato
    (READY). ⚠️ Non verificabile subito senza CRON_SECRET: controllare che
    `backup-2026-07-13.json` contenga `pchld.dg_feeds` (33 righe).
    NB: `Backup/api/backup.js` modificato+deployato ma la cartella Backup/ resta fuori
    da git come dal #19 (fa fede il deploy Vercel).
- **⚠️ Azioni richieste:**
  1. **Stefano — dismissione Render** (con calma, entro ~2 settimane): sospendere il
     servizio `digest-blqp` su Render (NON cancellarlo: è il rollback) e spegnere il ping
     su cron-job.org (ora tiene sveglio un server che non serve più a nessuno).
  2. Nella nuova app: riassegnare le categorie feed (Impostazioni → Categorie feed).
  3. Domattina: verificare `backup-2026-07-13.json` nel repo commonplace-backups
     (deve avere `pchld.dg_feeds`).

**Appendice #21 (sera) — check llvqoiyvzloloobjiloe (aperto da #20): RISOLTO.**
- Il progetto è **VIVO e ATTIVO**: REST `200` con la anon key di `Platea/.env`
  (`videos` popolata), auth endpoint su. Non è in pausa e non è cancellato.
- **Non è visibile dall'MCP perché vive su un ALTRO account/org**: l'org collegata
  all'MCP ("Anonima Olengatta") contiene solo `pchld` (NoteS) e `bogav` (Ledger) —
  i 2 slot del free tier sono pieni, probabile ragione storica dello sdoppiamento.
  Quale account ospiti llv lo sa solo Stefano (da recuperare per dismissione/export).
- Nota di passaggio: `videos` è leggibile con la sola anon key senza login — coerente
  col design di Platea senza auth, ma da ricontrollare in sede di migrazione.
- **Proposta registrata — migrare llv → pchld PRIMA della build EAS di Platea**, così
  una sola build incorpora env nuove + revisione #18. A favore: tutto su un account
  MCP-visibile, keep-alive unico, fine del rischio pausa, allineamento col cp layer
  già su pchld (cp.ts di Platea punta GIÀ a pchld), Dashboard v2 e il dropdown
  "Collega a item" di NoteS smettono di dipendere da un progetto fantasma. Percorso
  dati: `videos`/`sync_log` si rigenerano con sync-videos (da rideployare su pchld
  + repoint cron-job); il resto (saved, progress, playlists) dovrebbe essere nei backup
  giornalieri di cp-backup (sezione llv, documentata dal #19 — VERIFICARE le righe llv
  in `latest.json` come primo passo della migrazione).
- **Piano completo scritto: `Platea/piano-migrazione-pchld.md`** (inventario verificato
  tabella per tabella via REST — videos 11.390, channels 37, carousels 40, saved 8,
  progress 10, pl_* vuote, continue_watching=vista, RPC search_videos — 7 fasi, rischi,
  prerequisiti Stefano in Fase 0). Sessione dedicata; l'export dati NON richiede le
  credenziali llv (tutto anon-readable), servono solo per DDL vista/RPC e YOUTUBE_API_KEY.

**Appendice #21 (tarda sera) — Migrazione Platea/Dashboard llv→pchld: FASI 0-5 ESEGUITE.**
Dettaglio operativo e stato fase-per-fase in `Platea/piano-migrazione-pchld.md` (fa fede
quello); qui la sintesi e le root cause:
- ✅ **Fase 0**: DDL llv archiviati in `Platea/supabase/llv-schema-2026-07-12.md` (colonne,
  vincoli, indici, vista `continue_watching`, RPC `search_videos`, enum `video_source`/
  `content_category`). GOTCHA scoperto: l'SQL editor Supabase mostra solo l'ULTIMO
  statement di un blocco — le query di ricognizione vanno eseguite una alla volta.
  Backup llv verificato in `latest.json` (solo struttura, zero contenuti letti).
- ✅ **Fasi 1-2**: schema IDENTICO ricreato su pchld (migration `platea_llv_schema`;
  vincoli confrontati riga per riga) e dati trasferiti SERVER-TO-SERVER con l'estensione
  Postgres `http` (installata su pchld): pchld legge il REST di llv con la anon key,
  zero passaggi dal PC. Conteggi identici (videos 11.390, channels 37, carousels 40,
  saved 8, progress 10); sequence riallineate; RLS a perimetro (anon scrive solo dove
  l'app scrive: saved/progress/pl_* + channels/carousels/carousel_videos per AdminScreen;
  videos/sync_log sola lettura). Collaudo REST+RPC+RLS passato.
- ✅ **Fase 3**: `sync-videos` v6 deployata su pchld via MCP e collaudata con un canale
  archive.org (non richiede YouTube key): 2000 upsert, +8 video nuovi reali, sync_log ok.
- ✅ **Fase 4**: `Platea/.env` → pchld; `cp.ts` semplificato (client unico, rimossa la
  anon key pchld hardcoded); `npx tsc --noEmit` pulito; copiati in `C:\VideoS` (diff ok).
- ✅ **Fase 5**: **NoteS non richiedeva nulla** (già unificato dal #18: `cpSupabase =
  supabase`; la voce di piano veniva da una nota stantia — i documenti mentono, il codice
  no). **Dashboard**: il solo repoint l'avrebbe SVUOTATA (RLS own-data su cp: l'anonimo
  vede solo `user_id NULL`, 1 item su 37; su llv "vedeva tutto" ma erano dati fermi a
  giugno) → aggiunto login suite (pattern DigestV), client unico pchld, logout in header.
  Verificata in locale (porta 5181) e DEPLOYATA su dash.commonplaceapp.org (autorizzata,
  READY, marker verificati via curl). Commit annidato `b6512d2` (congela anche la v2 di
  aprile mai committata). Nel suo `.gitignore` c'è una riga `.vercel` duplicata dal CLI.
- ✅ **cp-backup**: `dnd_saves` MANCAVA dai backup (tabella nata il 07/07, dopo la stesura
  di backup.js del #19) → aggiunta e deployato (READY). Notato anche: manca
  `backup-2026-07-11.json` (il cron ha saltato un giorno — tenere d'occhio).
- **⚠️ Azioni richieste (Stefano):**
  1. Secret `YOUTUBE_API_KEY` sul dashboard pchld (Edge Functions → Secrets) — senza,
     i canali YouTube falliranno alla prossima sync (gli archive già funzionano).
  2. cron-job.org: ripuntare il job sync a POST
     `https://pchldmiavycxzpkzochn.supabase.co/functions/v1/sync-videos` con header
     `Authorization: Bearer <anon key pchld>`. NON spegnere ancora il ping/llv (rollback).
  3. Collaudo Dashboard: login su dash.commonplaceapp.org con le credenziali suite —
     deve mostrare ~37 item invece di 1.
  4. Domattina, nel backup: `pchld.dg_feeds` (33), `pchld.dnd_saves` (15), file del
     giorno presente.
  5. Quando pronto: **Fase 6** build EAS da `C:\VideoS` (incorpora migrazione + revisione
     #18), poi **Fase 7** dismissione llv (delta dati, cp-backup senza sezione llv,
     pausa progetto) — procedure nel piano.

**Appendice #21 (notte) — Costruire per il futuro: collaudo automatico + ripristino testato.**
Due strumenti pensati per la consegna a Opus: trasformano "fidati ma verifica" da prosa
a comandi eseguibili.
- ✅ **`Suite/collauda.cjs` — collaudo automatico della suite live** (`node Suite/collauda.cjs`):
  26 check in ~60s — HTTP di tutte le 11 app, versioni minime dei 5 SW manuali (SW_MIN
  nello script, da alzare a ogni bump), SW vite-pwa, endpoint API che devono rifiutare
  richieste anonime (un 200 lì = chiavi esposte), gateway Supabase, freschezza backup
  (<30h, via clone leggero del repo privato). Esit code = numero di FAIL. Prima
  esecuzione: TUTTO VERDE. Agganciato alle skill deploy-suite (verifica post-deploy)
  e triage-produzione (mossa zero). GOTCHA: estensione .cjs obbligatoria
  (C:\Users\Test\package.json dichiara "type":"module"); in Node/cmd.exe il null device
  è NUL, non /dev/null.
- ✅ **`Backup/RIPRISTINO.md` — procedura di ripristino TESTATA**: 2 righe di
  bs_collections ripristinate da latest.json in tabella-cavia su pchld, confronto al
  byte con l'originale (2/2 identiche), upsert idempotente provato, e il metodo di
  verifica ha rilevato una discrepanza introdotta per errore (prova che il confronto
  morde). Documentati: struttura del JSON, ripristino per-tabella (cavia prima, sempre),
  sequence, ordine FK, user_id/RLS (mai via anon key), scenario disastro totale, e i
  BUCHI del backup: Ledger (bogav) NON è mai stato incluso in cp-backup, videos/sync_log
  esclusi per design, utenti auth non backuppati.
- ✅ **Skill triage-produzione aggiornata** con due correzioni figlie di oggi: il test
  nslookup per i progetti Supabase in pausa NON è più affidabile (il DNS Cloudflare
  risolve comunque — test giusto: REST 401 = vivo) e il punto "Render cold start" è
  marcato storico (Digest è su Vercel dal cutover).
- ⚠️ **Scoperta da approfondire (task separato creato)**: `footnote /api/claude` e
  `notes /api/transcribe` rispondono 400 a body invalido senza credenziali — se un body
  VALIDO senza auth ottiene 200, i proxy AI sono aperti (stessa falla corretta su Digest
  nel #18). Da verificare e nel caso proteggere senza rompere i client.
- ⚠️ **Nota per Stefano**: cp-backup non copre Ledger (bogav) — valutare se aggiungere
  le sue tabelle a backup.js (env SUPABASE_BOGAV_SERVICE_KEY da creare) in una sessione
  futura.

**Appendice #21 (chiusura task proxy AI aperti) — CONFERMATO e CORRETTO nel codice.**
La falla del punto ⚠️ qui sopra è reale: i tre proxy AI erano **completamente aperti**.
- **Conferma per ispezione** (NON sparata dal vivo, per non bruciare crediti):
  `Footnote/api/claude.js`, `NoteS/api/transcribe.js`, `NoteS/api/whisper.js` non
  verificavano NULLA. Un body valido senza credenziali sarebbe filato dritto ad
  Anthropic/OpenAI con la chiave del server → 200 e crediti a carico nostro per chiunque.
  Il 400 visto il 07/12 era solo la validazione del body (in transcribe/whisper la chiave
  legacy `x-api-key`/`x-openai-key` mancante dava 400), a valle di zero controllo d'accesso.
  **Perché `collauda.cjs` era verde**: mandava `POST {}` e accettava `[400,401]` — il 400
  passava come "rifiutato" mascherando il caso body-valido-senza-auth. Punto cieco chiuso.
- **Fix (schema uguale a Digest #18, adattato alla suite)**: ogni proxy ora richiede la
  **sessione Supabase della suite**. Verifica dependency-free e senza segreti nuovi:
  `GET {SB_URL}/auth/v1/user` con la sola **anon key** (pubblica, già nei bundle) + il JWT
  dell'utente come Bearer; 200+id → passa, altrimenti **401** PRIMA di toccare la chiave.
  Stesso progetto `pchld` di tutta la suite. Il fallback legacy `x-api-key`/`x-openai-key`
  resta (utile solo se già loggati) — non indebolisce nulla, l'auth è a monte.
- **Client aggiornati per NON rompere nulla**: `Footnote/index.html` (`claude()`) e
  `NoteS/src/App.jsx` (helper `cpAuthHeader()`, 3 fetch: 2 transcribe + 1 whisper) ora
  passano `Authorization: Bearer <access_token>` dalla sessione già attiva. Ogni utente
  reale è loggato (signInWithPassword), quindi il flusso è invariato per loro.
- **Verifica locale**: `npm run build` NoteS OK (dist rigenerato, sw.js vite-pwa aggiornato
  → nessun bump manuale lì). Footnote servito in locale (porta 5199): login screen,
  **zero errori console** = parse Babel/JSX integro. Grep segreti pulito (solo un
  placeholder d'input `sk-ant-…`). **SW Footnote bumpato v27→v28** (index.html modificato).
- **`Suite/collauda.cjs` irrobustito**: `SW_MIN.footnote` 27→28; i check dei proxy passano
  da `[400,401]` a **`[401]` secco** (footnote claude, notes transcribe) + aggiunto
  **notes whisper**. Questi 3 diventeranno verdi SOLO dopo il deploy (finché la prod è
  vecchia, segnalano correttamente "proxy ancora aperto").
- **⚠️ Azione richiesta (Stefano) — AUTORIZZARE IL DEPLOY**: due progetti Vercel distinti,
  **niente env nuove da impostare** (usa la anon key pubblica già nota):
  1. Progetto **Footnote** → deploy (`Footnote/deploya.bat` o push): serve `index.html`
     nuovo + `api/claude.js` + `sw.js` v28.
  2. Progetto **notes-app** (NoteS) → deploy: build da `src/App.jsx` + `api/transcribe.js`
     + `api/whisper.js`.
  Post-deploy: `node Suite/collauda.cjs` deve dare i 3 check proxy a 401 e i SW verdi;
  poi login su Footnote e NoteS e provare una generazione/trascrizione (deve funzionare
  da loggati). Modifiche solo nel repo, **non deployate**: la prod resta esposta finché
  Stefano non autorizza.
- ✅ **DEPLOY ESEGUITO E VERIFICATO** (2026-07-12 sera, autorizzato da Stefano):
  `npx vercel --prod` su **footnote-app** (dpl_EzyDQz6…, READY, alias footnote.commonplaceapp.org)
  e **notes-app** (dpl_5iRVNC…, READY). **Prova live decisiva**: i tre proxy colpiti con un
  body VALIDO senza credenziali (`messages` popolato, il caso che prima dava 200) → tutti
  **401**. SW Footnote live = `footnote-v28`. `node Suite/collauda.cjs` **TUTTO VERDE** (18
  app/API + 8 SW + backup 15.7h). Nota: al primissimo giro un FAIL transitorio "sw footnote
  versione non trovata" per edge-cache subito dopo il deploy; sparito al secondo giro (curl
  diretto mostrava già v28). Falla proxy AI chiusa in produzione su Footnote e NoteS.
  Resta aperto **Syllabus** (stesso pattern, task separato `task_bf14b869`).
- ✅ **Syllabus — fix di codice applicato e committato** (2026-07-12 notte): stesso pattern
  JWT su `Syllabus/app/api/claude.js` (`verifyUser` via GoTrue, 401 senza login), client
  `callClaude()` passa il Bearer, SW `syllabus-v4`→`v5`. `npm run build` verde. Commit nel
  repo annidato `Syllabus/app` (`4e8ccda`), gitlink aggiornato nell'esterno.
- 🔴 **INCIDENTE DI SICUREZZA scoperto verificando lo stato live di Syllabus**: il bundle
  **in produzione** (`syllabus.commonplaceapp.org`, versione live `syllabus-v3`) contiene
  una **chiave Anthropic reale, completa (108 char, prefisso `sk-ant-api03-wh…`), hardcoded**
  in una funzione del bundle, e chiama `api.anthropic.com` **direttamente dal client**.
  È scaricabile pubblicamente ORA. Causa: la **revisione #18** di Syllabus (commit `102f8e6`,
  che spostava la chiave server-side) fu **committata ma MAI deployata** — il ⚠️ "impostare
  ANTHROPIC_API_KEY su Vercel Syllabus + redeploy" era rimasto in sospeso, quindi la prod è
  ferma alla versione pre-#18 con la chiave nel client. Il deploy del fix odierno **rimuove**
  la chiave dal bundle (v5 usa il proxy), ma è **BLOCCATO** finché non si agisce.
- **⚠️🔴 AZIONI RICHIESTE A STEFANO — in quest'ordine, urgenti:**
  1. **REVOCARE subito** la chiave `sk-ant-api03-wh…` su console.anthropic.com (è pubblica
     da quando l'attuale build di Syllabus è online: va considerata compromessa a prescindere
     dal deploy).
  2. Creare una **nuova** `ANTHROPIC_API_KEY` e impostarla come env **server-side** sul
     progetto Vercel di Syllabus (mai `VITE_`).
  3. Solo allora autorizzare il **deploy di Syllabus** (`cd Syllabus/app && npm run build &&
     npx vercel --prod`): porta live v5, che elimina la chiave dal client e chiude anche il
     proxy aperto. Verifica post-deploy: `curl` del bundle senza `sk-ant`, e
     `POST {}` a `/api/claude` senza login → 401. Aggiungere a `collauda.cjs` il check
     `syllabus proxy AI` a `[401]` e `SW_MIN.syllabus` → 5.
  4. Controllare se la stessa chiave revocata era usata altrove (altre env Vercel) per non
     rompere altre app col ricambio.
- ✅ **RISOLTO — Syllabus deployato e verificato** (2026-07-13, autorizzato; Stefano ha
  creato la nuova chiave, impostata la env su Vercel progetto `app`, e **disabilitato la
  vecchia**): `npm run build` + `npx vercel --prod`. **Prova live**: SW `syllabus-v5`; il
  bundle live (`/assets/index-I9LBs5Nd.js`) **NON contiene più** né `sk-ant-…` né
  `api.anthropic.com` (leak eliminato dalla produzione); `POST` con body valido a
  `/api/claude` senza login → **401**. `collauda.cjs` aggiornato (check `syllabus proxy AI`
  a 401, `SW_MIN.syllabus`→5) e **TUTTO VERDE**. ⚠️ NON verificata da qui la generazione
  *da loggato* (serve la sessione utente): che la nuova chiave sia valida lo conferma una
  singola prova di generazione in Syllabus — da fare.
- 🔴 **CONSEGUENZA della disabilitazione della vecchia chiave — DA VERIFICARE SUBITO**: se
  quella chiave (ora disattivata) era **riusata come `ANTHROPIC_API_KEY` server-side** anche
  in altri progetti Vercel, la loro AI è **rotta adesso** (500 "key non valida"). Progetti
  che chiamano Anthropic, ognuno con la SUA env: **footnote-app**, **notes-app** (solo la
  parte Anthropic `/api/transcribe`; `/api/whisper` usa `OPENAI_API_KEY`, non toccata),
  **digest-app**. Non è ispezionabile il valore delle env (segrete): verificare provando la
  generazione da loggato in ognuna, oppure impostare la nuova chiave (riusabile) in tutti e
  tre e redeployare. Syllabus (progetto `app`) è già a posto.
- ✅ **CHIUSO — chiave ricreata e redeploy fatti da Stefano** (2026-07-13): nuova
  `ANTHROPIC_API_KEY` impostata su **footnote-app**, **notes-app** e **digest-app**, e le tre
  app rideployate da lui. **Collaudo finale `node Suite/collauda.cjs` TUTTO VERDE**: 11 app a
  200, i 4 proxy AI (footnote/notes-transcribe/notes-whisper/syllabus) + digest a **401** su
  richiesta anonima, SW footnote-v28 / syllabus-v5 / gli altri ai minimi, backup fresco.
  ⚠️ Resta l'unica cosa non osservabile da terminale: la **generazione da loggato** in
  ciascuna app (conferma che la nuova chiave sia valida end-to-end) — la dà l'uso reale.
- ℹ️ **Nota su Vercel env "Sensitive"**: irrilevante per il leak pubblico (a tenere la chiave
  fuori dal bundle è il nome NON-`VITE_` + uso server-only, già garantito). Il flag rende la
  env write-only sul dashboard (difesa in profondità contro accesso lato Vercel), non contro
  il client. Su footnote è stata lasciata non-sensitive: accettabile per progetto personale;
  volendo irrigidire, ricreare la var con "Sensitive" spuntato (non convertibile a toggle) +
  redeploy.

**Fine Sessione #21 (blocco sicurezza proxy AI).** Consegnata a Fable 5 (non Opus: il modello
non era cambiato in-sessione, chiarito a Stefano). Commit: NoteS `8e07af2`, Syllabus/app
`4e8ccda`, esterni `5b6e8a3`/`aef981d`/`ac56c54`. Nessun push (non richiesto).

## 2026-07-15 — Sessione #22

- ✅ **Review indipendente del blocco sicurezza proxy AI** (chiuso il 13/07 dalla sessione
  parallela): codice verificato (tutti e 3 i proxy validano il JWT contro GoTrue
  `/auth/v1/user`, non un check decorativo), prove live rifatte (body VALIDO senza auth
  → 401 su footnote/syllabus/notes; bundle Syllabus senza `sk-ant`; collauda TUTTO VERDE).
  Pushati i 4 commit del blocco che erano rimasti locali (`d331c75..5bc072d`).
- ✅ **Backup verificati**: 13/07 con `dg_feeds` 33 + `dnd_saves` 15 (i fix del #21
  funzionano), file del 14 e 15 presenti (il cron non salta più), sezione digest legacy
  sparita, `dg_preferences` 2→6 (il nuovo Digest è in uso).
- ✅ **Platea FASE 6 — build EAS ESEGUITA** (autorizzata): build `preview` Android
  **finished** su progetto Expo VideoS2, id `d065eef6-85ee-4c77-b4cd-824ef7024ca8`.
  Il pre-flight ha salvato la build tre volte:
  - `C:\VideoS` aveva le **icone di marzo VECCHIE** (l'icona B1 del 26/03 era solo in
    Platea/) e `app.json` con `userInterfaceStyle: light` invece di `dark` → allineati
    prima del lancio (direzione SEMPRE Platea → C:\VideoS).
  - Junk rimosso (autorizzato): `src/src/` e `assets/fonts/fonts/` — copie annidate
    accidentali del 9-10 marzo, zero import (verificato con grep).
  - Meccanismo env CONFERMATO: in C:\VideoS `.env` è tracciato e NON gitignorato
    (a differenza di Platea/) → EAS lo impacchetta e cuoce le EXPO_PUBLIC_* nel binario.
    Non "correggere" mai quel .gitignore: è così apposta.
  - `YOUTUBE_API_KEY` su pchld VERIFICATA funzionante (sync actmusic: status ok in
    sync_log = l'API YouTube ha risposto).
  ⚠️ Resta il collaudo sul telefono (Stefano): installare l'APK dal link Expo, poi home
  popolata, ricerca, ♥, resume, playlist, e righe `pl_*` nuove in cp_items su pchld.
- ✅ **cron-job.org PENSIONATO per Supabase → pg_cron su pchld** (Stefano riporta
  fallimenti frequenti su tutte le app; cause probabili: ping keep-alive non autenticati
  → 401 = "failed" per cron-job E dubbia attività reale sul DB; timeout sui cold start).
  Installata `pg_cron` (migration `pg_cron_sync_e_keepalive`), 2 job ATTIVI e collaudati
  nel contesto worker (job di test ogni minuto: 5/5 succeeded, poi rimosso):
  - `sync-videos-settimanale` — lunedì 05:00 UTC, invoca la Edge Function su pchld
    (extensions.http, timeout 300s);
  - `keepalive-llv` — ogni giorno 04:30 UTC, query REST **autenticata** su llv (attività
    vera). ⚠️ Da spegnere in Fase 7: `select cron.unschedule('keepalive-llv');`
  Osservabilità: `select * from cron.job;` e `cron.job_run_details` via MCP.
- **⚠️ Azioni richieste (Stefano):**
  1. Installare l'APK Platea sul OnePlus (link build Expo qui sopra) e fare il collaudo;
     dirlo a Claude per la verifica cp_items lato server → poi si apre la **Fase 7**.
  2. cron-job.org: i job Supabase (keep-alive, sync llv) si possono SPEGNERE già ora
     (sostituiti da pg_cron); il ping Digest/Render si spegne insieme alla sospensione
     di Render (~26/07). A quel punto cron-job.org si può dismettere del tutto.
  3. Invariate dal #21: generazione da loggato nelle 4 app AI (conferma nuova chiave),
     categorie feed Digest.

**Appendice #22 — Collaudo telefono Platea: PASSATO, con 2 bug diagnosticati e sistemati.**
Esito Stefano: home popolata, ricerca ok, video youtube+archive partono, salvati presenti
con resume, caroselli si aggiornano. Verifica server: watch_progress + cp_items/cp_log
scrivono su pchld (5+5 righe la sera del collaudo) — **end-to-end della migrazione CHIUSO**.
I due difetti riportati:
- ✅ **"Non aggiunge caroselli"** — FALSO ALLARME sull'insert (la riga arrivava al DB):
  il carosello "Ronnie Scott" era stato creato in categoria **cinema** ma il canale è
  **jazz**, e il fetch incrocia `category` del carosello e `channel_id` → intersezione
  vuota → carosello invisibile. Fix DATO (update a jazz), zero build. Backlog prossima
  build: avviso in AdminScreen quando categoria carosello ≠ categoria del canale.
- ✅ **"Continua a guardare riparte da zero" (i salvati no)** — root cause: il player
  YouTube riceve `start: initialPosition`, l'embed **archive.org no** (nessun parametro).
  Non dipende dal punto d'ingresso ma dalla SORGENTE (la lista "continua" era piena di
  archive). Bug da sempre, mascherato dall'impermanenza di llv. Fix in
  `PlayerScreen.tsx` (`&start=` anche sull'embed archive), tsc ok, copiato in C:\VideoS —
  **attivo alla PROSSIMA build EAS** (niente expo-updates).
- 🔴→✅ **SCOPERTA STRUTTURALE: la sync completa muore a ~150s** (limite wall-clock
  Edge Function; 4 run la sera del collaudo — 3 dal pulsante AdminScreen di Stefano che
  riprovava, 1 nostra — tutte uccise a metà, righe sync_log rimaste 'running', ora chiuse
  con errore esplicativo). Su llv era uguale e nessuno se n'era accorto. Cura: il job
  pg_cron `sync-videos-settimanale` ora invoca la funzione **UN CANALE PER CHIAMATA**
  (loop plpgsql, ogni chiamata ~5-40s ≪ 150s, un canale fallito non blocca gli altri) —
  collaudato su 2 canali. Cumulando le run parziali, **tutti i 37 canali attivi hanno
  avuto una sync 'ok'**: il dubbio di Stefano ("non so se sincronizza tutto") è risolto.
  Backlog prossima build: anche il pulsante sync di AdminScreen dovrebbe iterare
  per canale (oggi la sync completa da app muore a 150s come da cron).

**Appendice #22 (chiusura) — FASE 7 ESEGUITA: llv dismesso, migrazione Platea COMPLETA.**
- ✅ **Delta llv 12→16/07: ZERO** su watch_progress, saved_videos, cp_items, cp_log,
  channels, carousels (verificato via REST con filtro sul cutoff 2026-07-12T18Z):
  la build vecchia non è mai stata usata dopo la migrazione. Nessuna ricopia.
- ✅ **cp-backup aggiornato e deployato** (READY): sezione llv rimossa, le 7 tabelle
  utente di Platea (`channels`,`watch_progress`,`saved_videos`,`carousels`,
  `carousel_videos`,`pl_playlists`,`pl_playlist_videos`) ora nella lista pchld
  (`videos`/`sync_log` restano esclusi: rigenerabili). Verifica domattina: il backup
  deve avere `pchld.channels` (37) ecc.
- ✅ **`cron.unschedule('keepalive-llv')`** eseguito: in `cron.job` resta solo
  `sync-videos-settimanale` (un canale per chiamata).
- ✅ Documentazione allineata: infrastruttura Supabase in testa a questo file (pchld =
  tutta la suite tranne Ledger; llv barrato DISMESSO), sezione Platea (✅ 7/7), skill
  `supabase-commonplace` (mappa progetti), `Backup/RIPRISTINO.md` (sezione llv solo nei
  backup storici ≤17/07).
- **⚠️ Azioni richieste (Stefano):**
  1. Mettere in PAUSA il progetto `llvqoiyvzloloobjiloe` dal suo dashboard (account
     separato) — NON cancellarlo per qualche settimana (i backup storici + la pausa
     sono il rollback); poi si può eliminare.
  2. Vercel cp-backup: la env `SUPABASE_LLV_SERVICE_KEY` non serve più (eliminabile).
  3. cron-job.org: tutti i job della suite sono ormai sostituiti (pg_cron) o inutili
     (Digest su Vercel): spegnere/dismettere quando vuoi, insieme alla sospensione di
     Render (~26/07).
  4. Domattina: backup con `pchld.channels`/`saved_videos`/`watch_progress` presenti.

## 2026-07-18 — Sessione #23

- ✅ **DnDMaster: tab ⚔ Oggetti nel Catalogo online** (richiesta di Stefano pre-sessione
  D&D: "l'equipaggiamento è l'unica parte sguarnita") — deployato su Netlify e verificato
  live (marker nel bundle). 124 armi/armature/attrezzi base (items-base.json) + ~1.650
  oggetti magici e vari (items.json) dal mirror 5e.tools, cache IndexedDB, stessa UX
  delle altre categorie (✓ importato, ↻, "Importa mancanti"); escluso da "Importa tutto"
  per la quota. La filiera import oggetti ESISTEVA già (parse5eItem, runImport('item'),
  merge per slug): mancava solo la voce a catalogo + tre buchi chiusi:
  - `parse5eItem` non estraeva il DANNO → armi importate inutilizzabili per l'auto-attacco.
    Ora: dmg1/dmg2 ("Versatile (1d10)"), dmgType S/P/B→IT, gittata.
  - BUG pre-esistente: `value` di 5e.tools è in monete di RAME, il parser lo mostrava
    come oro ("Longsword 1500 mo") → ora converte mo/ma/mr. Gli oggetti importati in
    passato restano col costo vecchio finché non si reimportano (↻).
  - Il datalist armi della scheda usava solo EQUIPMENT_DB inline → `useWeaponSuggest()`
    include gli importati con danno (dedupe slug, inline vince).
  Note cappate a 1500 char (quota localStorage). Verifica: 116/116 Vitest, build verde,
  parser validato sui dati REALI del mirror (Longsword/Longbow/Plate/Bag of Holding),
  app avviata pulita in locale; dettaglio operativo nel CLAUDE.md di DnDMaster.
- **⚠️ Azioni richieste:** Stefano al primo avvio: 📥 Importa → Catalogo → ⚔ Oggetti
  ("Importa mancanti" o selettivo), poi in scheda PG provare un attacco con un'arma
  importata (autocompilazione). Nient'altro.

**Appendice #23 — Backup Ledger ATTIVO (l'ultimo dato scoperto della suite).**
- ✅ Env `SUPABASE_BOGAV_SERVICE_KEY` impostata da Stefano su Vercel cp-backup; sezione
  `bogav` aggiunta a `Backup/api/backup.js` (11 tabelle: accounts, transactions,
  transfers, categories, payment_methods, recurring_transactions, budgets,
  benefit_budgets, benefit_conversions, meal_voucher_usages, investment_updates —
  tutte dati utente, nessuna rigenerabile) e deployata (READY).
- ✅ `Backup/RIPRISTINO.md`: nuova sezione **Ledger trigger-aware** — i saldi sono
  mantenuti da trigger, un ripristino ingenuo di transactions li APPLICHEREBBE DUE
  VOLTE: procedura = disable trigger user sulle 4 tabelle → ripristino in ordine FK
  (saldi dal backup) → enable + verifica pg_trigger + trigger_tests.sql.
- ℹ️ Nota tecnica: `list_tables` MCP mostrava 0 righe su TUTTE le tabelle bogav
  (statistiche stantie, mai ANALYZE) — i conteggi veri erano sani (70 transazioni).
  Non fidarsi dei row count di list_tables: contare con execute_sql.
- **⚠️ Azioni richieste:** domattina (19/07) verificare che il backup contenga
  `projects.bogav` (transactions ≈70). Con questo, TUTTI i dati utente della suite
  hanno un backup giornaliero con procedura di ripristino documentata e testata.

**Appendice #23 — INCIDENTE Syllabus "API key is invalid": auto-deploy Git fantasma. RISOLTO.**
Al collaudo da loggato di Stefano, Syllabus rispondeva "API key is invalid 401" e poi
"VITE_ANTHROPIC_API_KEY mancante nel .env". Diagnosi (con prove):
- La `ANTHROPIC_API_KEY` sul progetto Vercel `app` era ancora quella VECCHIA di giugno
  (mai aggiornata il 13/07, a differenza di footnote/notes/digest) → aggiornata da
  Stefano; eliminata anche la env-relitto `VITE_ANTHROPIC_API_KEY` (73 giorni, era
  la porta del leak originale).
- MA il vero mostro: **il progetto Vercel `app` aveva l'integrazione Git collegata al
  repo del workspace** (prova: alias `app-git-main-…`): OGNI push su main rideployava
  Syllabus da sorgente stantio pre-#18 (bundle con chiamata diretta api.anthropic.com,
  SW v3), SCAVALCANDO il fix v5 deployato via CLI il 13/07. I "deploy fantasma" (16h e
  20min prima) coincidevano coi nostri push. Il collaudo `collauda.cjs` l'ha inchiodato:
  `syllabus proxy AI 405` + `sw v3 SOTTO il minimo v5`.
- FIX (autorizzato): `npx vercel git disconnect` sul progetto `app` (l'integrazione NON
  doveva esistere: il canale documentato è SOLO la CLI) + rebuild e redeploy v5.
  VERIFICA live: SW v5, bundle senza api.anthropic.com né sk-ant, proxy 401 con body
  valido, collaudo tutto verde. Il push di questo stesso commit è il contro-test:
  nessun nuovo deployment deve apparire sul progetto `app`.
- LEZIONE per il futuro: se un fix Vercel "regredisce da solo", controllare gli alias
  `*-git-main-*` (= integrazione Git attiva) prima di incolpare cache o SW.

**Appendice #23 — ListenS: giro completo (persistenza, favicon, presentazione, discovery, UI mobile). DEPLOYATO, SW v14.**
- ✅ **Persistenza**: infrastruttura VERIFICATA sana (PK user_id+episode_id e RLS own-data
  sul DB; i fix #18 — stableEpId, soft delete — live da tempo: i problemi storici erano lì).
  Induriti per l'uso in auto/corsa: flush POSIZIONE immediato su pausa/background/pagehide
  (prima: solo throttle 30s → fino a 30s persi cross-device se l'app veniva uccisa);
  errori upsert non più inghiottiti (console.warn); BUG FIXATO: a fine episodio
  savePosition(id,0) era un NO-OP per la guardia pos<3 → la posizione non si azzerava
  mai e l'episodio finito ripartiva dalla coda (ora resetPosition dedicata).
- ✅ **Favicon** web aggiunta (link rel=icon su icon-192, mancava solo il tag).
- ✅ **Presentazione podcast** nella scheda: la UI c'era già ma description era quasi
  sempre vuota (classifiche/suggerimenti arrivano senza) → fallback dalla description
  del canale RSS (feedDesc), già recuperata da fetchFeed e mai usata.
- ✅ **DISCOVERY — bug storico**: 6 categorie su 8 mostravano la classifica SBAGLIATA
  (ID generi Apple scombinati: "Filosofia"=1523 apriva la trance, "Storia"=1314 la
  religione, "News"=1533 la scienza, "Scienza"=1318 la tecnologia...). ID verificati
  UNO A UNO sul vivo e corretti (Cultura 1324, Scienza 1533, Storia 1487, Filosofia
  1443, News 1489, Tecnologia 1318) + NUOVI: Documentari (1543) e "⭐ Top" generale
  dal nuovo endpoint mantenuto rss.marketingtools.apple.com (v2, il vecchio
  rss.itunes resta per i generi che il v2 non supporta).
- ✅ **UI mobile** (uso in auto/corsa): Play episodi 34→44px, controlli riga 2 della
  PlayerBar ~28→40px (skip/velocità/timer), skip FullPlayer 38px con più area,
  Play barra 46→52px.
- Verifiche: boot pulito su server statico locale (porta 5182, launch.json
  listens-static), tag script bilanciati, deploy Vercel + curl live (SW v14, favicon,
  categorie nuove nel bundle), collauda TUTTO VERDE (SW_MIN.listens→14). Copia Suite
  riallineata (ListenS → BookShelf/public, andrà live col prossimo deploy BookShelf).
- **⚠️ Azioni richieste (Stefano):** collaudo sul telefono, vedi checklist a voce.

## 2026-07-18/19 — Sessione #24 (serale)

- ✅ **Digest: icona PWA a sfondo scuro** — era rimasta crema (#f5f0e8) nel MANIFEST
  (la favicon.svg era già scura): ora #1a1a1a + ✦ oro, SW v2, deployata. Le icone
  installate si aggiornano male: rimuovere e ri-aggiungere l'app alla home.
- ✅ **DnDMaster: slot incantesimi al cambio livello** — ROOT CAUSE: syncClassToLevel
  cercava la classe SOLO in CLASSES_DB (inline IT) → con una classe importata dal
  catalogo (nome EN) aggiornava il livello senza toccare gli slot ("non sempre" =
  dipendeva dall'origine della classe). Ora `findClassData` (inline+importate, riuso
  computeSlots). BONUS trovato: applicare una classe importata PERDEVA la caratteristica
  da incantatore (campo `spellcastingAbility` minuscolo di 5e.tools vs `spellcasting`
  inline) → fallback+uppercase. Per i PG esistenti: ritoccare il livello ricalcola tutto.
- ✅ **DnDMaster: chip CD incantesimi e Attacco** nel pannello slot (8+BP+mod / BP+mod,
  fallback dal DB classe per PG con caratteristica mancante). Deployato con gli slot.
- ✅ **ListenS: pulsanti auto ⏮⏭ funzionanti** — la Media Session non gestiva
  previoustrack/nexttrack (che è ciò che il volante manda via AVRCP): ora ⏮=-15s
  ⏭=+30s. SW v16, deployato. CHIARITO il limite: una PWA NON può comparire tra le
  app di Android Auto (servono nativo+Play Store) — flusso corretto: avvio dal
  telefono, controlli da volante/schermo. Eventuale wrapper nativo = progetto a parte.
- ✅ **DnDMaster: ricerca incantesimi in ITALIANO per gli importati EN** — dizionario
  ufficiale IT→EN (`data/spellNamesIT.js`, 138 voci curate) come alias nell'indice
  della palette e nel filtro SpellsPage: "dardo tracciante"→Guiding Bolt. Copre il
  limite documentato del ponte EN↔IT per gli incantesimi; mostri/oggetti restano
  solo-EN (stesso schema se servirà). Deployato e verificato nel bundle live.
- ✅ **DnDMaster: DESIGN "schede condivise coi giocatori"** scritto in roadmap
  (CLAUDE.md) e RATIFICATO da Stefano: account player/master, modello a PROPOSTA
  (diff + Accetta/Ignora, la copia del Master è SEMPRE la verità), prerequisito
  split per-PG, schede-SNAPSHOT (mai riferimenti all'archivio del master), catalogo
  già per-utente (zero lavoro). Stima 2-3 sessioni — pronto per Fable o Opus.
- **⚠️ Azioni richieste (Stefano):** domattina (dopo le ~7:20) verifica backup con
  `projects.bogav` (~70 transazioni) — la fa Claude su richiesta; sul tablet:
  ritoccare il livello dei PG con classe importata (ricalcolo slot), controllare i
  chip CD, cercare "dardo tracciante"; ri-aggiungere l'icona Digest alla home.

## 2026-07-19 — Sessione #25 (Opus 4.8, handover da Fable 5)

- ✅ **Verifica primo backup Ledger (19/07)** — `backup-2026-07-19.json` (cron 05:07 UTC)
  ha `projects.bogav` con le 11 tabelle Ledger, `transactions` **70 righe**, zero tabelle
  in errore; il 18/07 non ha ancora `bogav` (il 19 è il primo, come da RIPRISTINO.md).
  Ispezione diretta del repo privato `commonplace-backups`. Nota: la env sorgente è
  `SUPABASE_BOGAV_SERVICE_KEY` (in `backup.js`) — il piano #2 citava `LLV` per errore.
  Header + piano-di-lavoro #2 annotati. Commit `f9f9db1`.
- ✅ **Design schede condivise DnD → modello a campagna (ratificato)** — esteso da
  "master unico" a **multi-master, più campagne per master**: la campagna è l'aggregato
  (`campaigns.master_uid` + `dnd_shared_chars.campaign_id`, RLS via subquery) — elimina
  l'uid-master cablato. Join-code con membership implicita, un proprietario per campagna.
  Sciolte le 3 decisioni: (1)+(3) seed = **il master semina** (push-down; linking
  roster↔scheda automatico via `char_id` del master); (2) **due canali di sync** — vitali
  live player-autoritativi (PF correnti, slot spesi, TS morte, condizioni) + amministrativo
  propose/accept tutto-o-niente, **override del master sempre**. Design in `DnDMaster/CLAUDE.md`.
  Commit `37d3ad2`.
- ✅ **Blocco 1 schede condivise: schede personaggio PER-PG — IMPLEMENTATO e DEPLOYATO** —
  prerequisito del design. **Root idea:** il last-write-wins per chiave intera sul blob
  `characters` rendeva impossibile accettare l'update di un PG senza clobberare gli altri →
  dal blob unico a una **riga per PG** (`char:<id>`) + indice `dnd_char_index_v1`
  (ordine/activeId).
  - `sync.js`: char-key dinamiche (`isCharKey`); `markDeleted` con coda **tombstone**
    (`dnd_sync_deleted_v1`) — cancellare un PG toglie la riga da `dnd_saves`, senza la quale
    ripullerebbe come fantasma; pull/push per-PG; `markAllForPush` (restore) include le char-key.
  - `storage.js`: API per-PG + **migrazione one-time NON distruttiva** (`migrateCharsToPerPG`
    in `AppRoot` prima del pull) — il blob `dnd5e-master-v1` resta **INTATTO come rollback**;
    le nuove righe le scopre e pusha `pullAll` (`charKeysLocal`).
  - `App.jsx`: `loadAllChars` (indice + righe); save-effect che scrive/marca **solo il PG
    modificato** (confronto per identità: `updateChar` sostituisce solo il suo oggetto);
    cancellazione via `sync.markDeleted`. `BackupRestore`: conteggio PG dall'indice.
  - **13 test nuovi (129 totali verdi)**, build verde. Deploy Netlify verificato live
    (marker `dnd_char_index_v1` nel bundle) e **collaudo end-to-end confermato da Stefano**
    (roster reale caricato identico, edit di un PG persistito, altri PG intatti). Commit `ae1e2ab`.
- ⚠️ **Azioni richieste (Stefano):** nessuna urgente da questa sessione. Solo da sapere: se un
  device ha la PWA DnD vecchia in cache può servire 1-2 reload per passare al codice nuovo
  (autoUpdate). Restano gli item tablet della #24 (chip CD, ecc.), già suoi.
- ✅ **Blocco 2 schede condivise: schema su pchld** — migration `dnd_schede_condivise_blocco2`:
  `campaigns` (owner-only) + `dnd_shared_chars` (giocatore su propria riga; master su tutte le
  righe delle sue campagne), **RLS non ricorsiva** (campaigns solo-master, riferimento a senso
  unico), 8 policy + RLS attiva verificate, `join_code` colonna. Join RPC + UI = blocco 3.
  ⚠️ **prima dei dati veri**: aggiungere le due tabelle a `Backup/api/backup.js` (lista pchld)
  + redeploy cp-backup (lezione `dnd_saves`).
- ✅ **Chiusure Fase 7 confermate (Stefano, 2026-07-19)** — llv **in pausa (verificato: REST
  HTTP 000 vs pchld 401)**, env `SUPABASE_LLV_SERVICE_KEY` rimossa da cp-backup, cron-job.org
  dismesso; Render `digest-blqp` ora dorme (503, ping rimosso), sospensione formale ~26/07.
  piano-di-lavoro #1 aggiornato.
- **Prossimo (schede condivise):** blocco 3 = RPC `join_campaign` (SECURITY DEFINER) + UI
  (vista giocatore; vista master con diff Accetta/Ignora sul canale amministrativo + vitali
  live). Prima: sciogliere le 3 decisioni di dettaglio (linking al primo share, campi nel
  diff, seed scheletro).

## 2026-07-19 — Sessione #26 (Opus 4.8)

Schede condivise DnD **blocchi 3b + 3c completati e verificati end-to-end live** (dettaglio
tecnico in `DnDMaster/CLAUDE.md`, sezione «Schede condivise»).

- ✅ **Blocco 3b — moduli client di sync (fuori dal motore `dnd_saves`)**: `sharedChar.js`
  (puro: partizione vitali/amministrativo sui campi reali di `defaultChar`, `diffAdmin`
  per-campo con array a blocco, `applyAccepted`, `adminHash`/badge) + `sharedSync.js`
  (trasporto Supabase: campagne, membri, seed push-down, RPC join, `upsertMySharedChar`,
  Realtime). Migration `dnd_schede_condivise_blocco3b_realtime` (tabella `dnd_shared_chars`
  in publication `supabase_realtime`). **38 test nuovi** (129→**168** verdi).
- ✅ **Blocco 3c — UI**: nuovo tab **🤝 Tavolo** (`SharedTablePage.jsx`; il nome «Campagna»
  era già preso dall'import wiki). Vista Giocatore = riusa la **CharacterSheet** sulla riga
  condivisa (passata come prop `renderSheet`, per evitare l'import circolare — CharacterSheet
  vive in `App.jsx`; guardia su `onDelete` per nascondere l'elimina). Vista Master = crea
  campagna + join-code, assegna un **PG esistente del roster** (scelta di Stefano: campagna
  già in corso), vitali live in sola lettura, pannello diff/accept per-campo. `lastSeenHash`
  in `K.sharedSeen` (sincronizzato). Impatto su `App.jsx`: solo import + tab + mount + guardia.
- ✅ **BUG del blocco 3a trovato e corretto (root cause):** la RPC `join_campaign` falliva
  al **primo join reale** con *"column reference campaign_id is ambiguous"* — il target
  `on conflict (campaign_id, player_uid)` era ambiguo con il parametro OUT omonimo `campaign_id`
  di `RETURNS TABLE`. Fix: `on conflict on constraint campaign_members_pkey` (migration
  `fix_join_campaign_ambiguous_campaign_id`). **Il 3a era documentato come "verificato" ma la
  RPC non era mai stata chiamata davvero** — emerso solo col collaudo E2E.
- ✅ **Collaudo E2E live su account reale (Olengard)** — trucco a un account: Olengard entra
  nella *propria* campagna (la RPC registra chiunque, master incluso) ed è sia master sia
  giocatore. Giro completo verificato: crea campagna → join → assegna Norana → il giocatore
  modifica Lv5→6 (`salvato ✓`) → badge 📬 lato master → diff (`level` 5→6, `maxHp` 38→45,
  `spellSlots`) → accept → roster a Lv6. Poi **dati di prova ripuliti** (3 tabelle a 0) e
  **Norana ripristinata esattamente a Lv5/maxHp 38/slot {1:4,2:3,3:2}** (il cambio livello
  ricalcola in discesa; valori confrontati col blob intatto).
- ⚠️ **Non verificato in isolamento:** il **Realtime** vero (postgres_changes) — nel collaudo
  gli aggiornamenti passavano anche via refresh manuali; serve una prova a due client/finestre.
  Cosmetico: allineamento checkbox/etichetta nel pannello diff da rifinire.
- ✅ **Deploy + push fatti (autorizzati da Stefano)**: DnDMaster deployato su Netlify
  (dnd.commonplaceapp.org) — verificato live (bundle contiene `Tavolo` e `join_campaign`);
  porta anche il **blocco 1** ora live. `main` pushato su GitHub (`fa22756..ea05141`,
  origin allineato). **Follow-up backup #25 CHIUSO**: `campaigns`, `dnd_shared_chars`,
  `campaign_members` aggiunte alla lista pchld in `Backup/api/backup.js`, cp-backup
  ridistribuito su Vercel (READY). ⚠️ prova del contenuto al **prossimo cron** (05:07 UTC):
  le 3 tabelle appariranno nel JSON (ora vuote). `Backup/` è fuori da git (deploy via Vercel CLI).
- ⚠️ **Solo da sapere:** la **migrazione blocco 1 è già avvenuta sull'account reale** durante il
  collaudo (login col dev server nuovo): `migrateCharsToPerPG` ha spezzato il roster in righe
  `char:<id>` su `dnd_saves` reale — **non distruttivo, blob `dnd5e-master-v1` intatto**.
- ✅ **Blocco A — condizioni + dadi vita (campi persistenti della scheda)**: `defaultChar`
  guadagna `conditions: []` e `hitDiceUsed: 0` (max = livello, dado = `char.hitDie` dalla
  classe). Nella `CharacterSheet` (blocco COMBATTIMENTO): controllo **DADI VITA** (−/+) e riga
  **CONDIZIONI** a chip toggle che riusano `COND_META`/`CONDITIONS` del Combat Tracker. Riposo
  lungo recupera metà dadi vita. Entrambi entrano in `VITALI_FIELDS` → sync live al master
  (`VitaliView` mostra dadi vita rimasti + condizioni). 168 test verdi, build verde.
  **Verificato in-app** (spesa dado + toggle condizione persistiti; PG di test ripristinato).
  Non verificato a runtime: il recupero dadi vita del riposo lungo (ispezione).
- ✅ **Rifiniture**: **Realtime VERIFICATO in isolamento** (due tab: la vista master si aggiorna
  senza refresh quando il giocatore modifica — vitale PF 38→12 e badge 📬); **cosmetico diff
  RISOLTO** (era un bug: il checkbox ereditava `input{width:100%}` globale → 1227px, spingeva
  fuori schermo etichetta/valore; fix `width:16`). Blocco A + rifiniture **deployati** (Netlify)
  e **pushati**.
- **Prossimo:** nessun blocco obbligatorio aperto. TO-DO futuri: campagna-scopare il roster del
  master, feedback master→giocatore (v2), auto-popolamento combat tracker dai vitali.

## 2026-07-20 — Sessione #27 (Opus 4.8)

**DnDMaster chiuso.** Root cause del "non vedo le modifiche" trovata (NON era la cache),
auto-popolamento del Combat Tracker fatto, code aperte chiuse. Dettaglio tecnico in
`DnDMaster/CLAUDE.md`.

- ✅ **ROOT CAUSE — il tab 🤝 Tavolo era invisibile su mobile (la diagnosi di #26 era
  SBAGLIATA).** #26 aveva concluso "cache PWA, servono 1-2 reload" perché il bundle live
  conteneva i marker giusti. Falso: sotto i 768px `.header-tabs` è `display:none !important`
  (styles.js) e la navigazione passa alla **bottom nav mobile**, che elencava 11 tab su 12 —
  mancava proprio `shared`. Sul telefono di Stefano il tab non era raggiungibile **in nessun
  modo**, pur essendo nel bundle. L'indizio che ha chiuso il caso: `grep -c "Tavolo"` sul
  bundle live dava **1** invece di 2 (solo la barra desktop). Fix di **una riga**; deployato
  e **confermato da Stefano sul telefono**. Perché era sfuggito: il collaudo E2E di #26 era
  a due tab **desktop**, l'unico formato dove il tab si vedeva.
  → **Lezione annotata nei Gotcha di `DnDMaster/CLAUDE.md`**: i tab vanno aggiunti in DUE
  posti (`.header-tabs` + `mobile-nav`), altrimenti sono irraggiungibili su un formato
  senza dare alcun errore.
- ✅ **Combat Tracker auto-popolato dai vitali dei giocatori** — i PG entrano in combattimento
  con PF correnti, condizioni e TS morte riportati dai giocatori sulle schede condivise
  (prima il master li ridigitava). **SNAPSHOT, non live** (scelta di Stefano): all'avvio dello
  scontro + bottone **↻ per-PG**; durante il combattimento il tracker resta la copia di lavoro
  del master — coerente con "in sessione fa fede lo schermo del Master", niente sovrascritture
  a sorpresa dei danni che registra lui. Conseguenza architetturale: **nessuna subscription
  Realtime**, solo una fetch quando serve. `sharedChar.applyVitaliToCombatant` (puro; non tocca
  maxHp/ac/note/effects né `dead`) + `sharedSync.vitaliByCharId(uid)`. Il linking è gratis:
  `char_id` = id del roster (push-down del seed). Le condizioni riusano i badge già presenti
  nella riga → **zero UI nuova**. 172 → **186 test verdi**.
  ⚠️ **Limite dichiarato:** i TS morte sono in **sola lettura** e appaiono solo a 0 PF — il
  combattente del tracker non ha un editor di TS morte (esiste solo nella scheda PG) e
  aggiungerlo era fuori proporzione. Li tira il giocatore, il master li guarda.
- ✅ **Coda di #26 chiusa: recupero dadi vita del riposo lungo.** Era "non verificato a
  runtime". Estratto `hitDiceAfterLongRest()` da `longRest` come helper puro (pattern di
  `advanceClock` nello stesso file) e coperto con 4 casi: arrotondamento per difetto, minimo 1
  ai livelli bassi, floor a zero, PG senza i campi. **La formula era già corretta** — nessun
  cambio di comportamento, ma ora una regressione la fa fallire.
- **Verifiche fatte:** 186 test verdi, build verde, app montata sul dev server con **console
  pulita** (nessun ciclo di import: `App.jsx` ora importa il layer condiviso) e
  `applyVitaliToCombatant` **eseguita nel browser reale** via dynamic import, con l'esito
  atteso. **NON verificato:** il flusso completo del tracker in-app (richiede login + una
  campagna con un giocatore assegnato) — lo scioglie Stefano al primo combattimento vero.
- ⚠️ **Azioni richieste:** nessuna sul dashboard. Da autorizzare: **deploy Netlify + push**
  del tracker (il fix del tab Tavolo è già live e pushato).

**Coda di #27 — nota di sicurezza/design emersa a fine sessione (da una domanda di Stefano:
«c'è differenza tra account master e account giocatore?»).**

- **Non esistono tipi di account**: "essere master" = possedere una campagna, "essere giocatore"
  = avere una riga in una campagna altrui; lo stesso account fa entrambe le cose (il toggle nel
  tab Tavolo è solo una vista locale).
- ✅ **Note, registro Campagna, roster, incontri sono al sicuro** — verificato sulle policy reali
  di pchld: `dnd_saves SELECT → auth.uid() = user_id`, owner-only **a livello Postgres**. Un
  giocatore non li legge nemmeno via API a mano. Il suo tab Campagna mostra i suoi dati (vuoti).
- ⚠️ **Ma il PG assegnato viaggia INTERO**: `seedSharedChar(..., c)` manda tutto il char,
  `prestige`/`reputation` compresi; `dsc_select_own` fa leggere al giocatore l'intera riga e
  `CharacterSheet` (riusata dalla vista giocatore) ha il tab 🏛 Reputazione **editabile**.
  `MASTER_ONLY_FIELDS` è usato solo dal diff/test: **nessuno filtra il seed**. Il roster del
  master resta protetto (il diff esclude quei campi); il problema è **in lettura**.
  `dnd_shared_chars` è **vuota** (verificato) → nessun dato reale ancora esposto.
- **Decisione di Stefano: NON si filtra il campo.** Ha senso che i giocatori vedano la propria
  reputazione; serve invece una **visibilità per-VOCE** decisa dal master (es. *Clero* e
  *Famiglia* sono la stessa entità ma i PG non lo sanno: devono vedere Famiglia, non Clero).
  **Valuta con calma** — nessun lavoro avviato. Spec e punto d'intervento (al seed, in
  `sharedSync.js`) in `DnDMaster/CLAUDE.md`. ⚠️ **Da sciogliere prima di assegnare il primo PG
  a un giocatore vero.**
- ✅ **Ridimensionato il "multi-utente vero"**: `profileFromSession` fa `return canon || raw`,
  quindi un terzo account ottiene il **proprio** prefisso e non collassa su Olengard/Manu →
  **non è un prerequisito** per far giocare altri. Unica collisione: stesso local-part di email
  sullo stesso device.
- ⚠️ **Scarto segnalato sull'auto-popolamento**: il backlog diceva "HP/**iniziativa**", ma
  l'iniziativa NON è inclusa e non per svista — `initiative` sta in `EXCLUDED_FIELDS` per la
  scelta "combattimento = schermo del master". Portarla ai vitali è una **decisione di design**
  da cambiare, non un bug (lavoro piccolo, ~mezz'ora).
- **Prova del backup:** le 3 tabelle sono in `Backup/api/backup.js` (verificato, riga 34); il
  contenuto del JSON di stamattina **non è verificabile dall'operatore** (repo privato, `gh` non
  installato, token solo su Vercel) → resta a Stefano, o si autoconferma.

**Seconda parte di #27 (2026-07-20) — DnD riaperto su richiesta di Stefano: due feature.**

- ✅ **Visibilità per-voce del prestigio** (nata dalla domanda «c'è differenza tra account
  master e account giocatore?», vedi nota sopra). Il requisito reale **non era nascondere il
  campo**: ha senso che i giocatori traccino la propria reputazione, ma alcune voci vanno
  **aliasate**. Caso principe: Teofilo vede «Famiglia: 2», il master sa che quel 2 è del
  «Clero» perché le connessioni non sono ancora emerse; gli Obscurati non devono comparire
  affatto. Implementati `hidden` e `alias` per-voce, con la sanificazione **nel trasporto**
  (`sharedSync.seedSharedChar`) e non nella UI. **Il punto delicato**: il giocatore rimanda
  meno voci di quante ne ha il master, quindi un accept ingenuo avrebbe **cancellato le voci
  segrete** — la riconciliazione è per ID e tocca solo i valori (`mergePlayerPrestige`, test
  `REGRESSIONE`). Esteso anche il badge 📬, che sul solo prestigio non si accendeva.
  **Deployato e verificato live.**
- ✅ **Campagna-scoping del roster**: campagne **locali** (indipendenti dal tab Tavolo →
  funzionano offline e senza giocatori), filtro su **barra PG + setup combattimento + riposi**.
  Filtro rigoroso (i non assegnati solo con «Tutte»), con le due trappole gestite: un PG nuovo
  eredita la campagna del filtro (altrimenti spariva appena creato) e eliminare una campagna
  non cancella i suoi PG. Nuovo modulo puro `src/roster.js` (21 test).
  ⚠️ **Non deployato**: il deploy del prestigio è live, questo no.
- **211 → 232 test verdi.** Verifiche: build verde, console pulita, logica e layout provati nel
  browser reale (il select del filtro a 230px non sfonda la barra — stesso gotcha
  `input{width:100%}` che aveva colpito il checkbox del diff).
- **Ridimensionata la stima di backlog**: il campagna-scoping era archiviato come "tocca
  persistenza/sync, più grosso", ma quella valutazione **precedeva il blocco 1**: con le schede
  già per-PG è bastato un campo sul char e un filtro, senza toccare il motore di sync.
- **Non verificato in-app** (dietro login): l'aspetto dei controlli 👁/alias nel tab 🏛 e del
  selettore campagna nella barra. Da guardare al primo utilizzo.
