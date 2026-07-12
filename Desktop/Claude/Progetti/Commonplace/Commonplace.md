# Commonplace â€” Project Reference

> Documento di contesto per la suite di app personali di Stefano.
> Da condividere all'inizio di ogni sessione Cowork o Claude.
> Ultimo aggiornamento: 2026-07-12 -- Sessione #21. Migrazione Digest→Vercel+Supabase: SQL eseguito su pchld (dg_feeds/dg_preferences con RLS), backend DigestV completato (aggiunto preferences.js mancante + fallback 403 cookie), frontend DigestV con login Supabase suite scritto e verificato in locale. ⚠️ Restano: migra-dati.ps1 (serve password Digest), deploy digest-app (autorizzazione), test parità sui feed reali, cutover DNS. ⚠️ Aperto da #20: progetto Supabase llvqoiyvzloloobjiloe non visibile dall'account MCP — stato da chiarire.

---

## ðŸ—ºï¸ Cos'Ã¨ Commonplace

Commonplace Ã¨ un ecosistema di app personali costruite attorno alla vita intellettuale e culturale di Stefano: letture, ascolti, note, documenti, video di qualitÃ , finanze personali e gioco di ruolo. Le app condividono un design system comune (Playfair Display, Lora, DM Mono, palette calda su crema `#fffdf0`) e dati (attualmente localStorage condiviso, migrazione a Supabase pianificata per aprile 2026).

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
â”œâ”€â”€ Digest / NewS       â†’ Flask/Python + PostgreSQL (Railway)
â”œâ”€â”€ DnD Master          â†’ Vite PWA (Netlify)
â”œâ”€â”€ Platea / VideoS     â†’ Expo SDK 52 (EAS build)
â”œâ”€â”€ ReadS               â†’ Expo SDK 52 (EAS build, staged)
â””â”€â”€ Ledger              â†’ Vite PWA (Vercel)
```

**Infrastruttura condivisa:**
- **Supabase:** 
  - NoteS, Platea â€” progetto `llvqoiyvzloloobjiloe`
  - **BookShelf, Footnote, ListenS â€” progetto `pchldmiavycxzpkzochn`** (stesso di NoteS, login unificato) âœ… migrazione completata 2026-03-29
  - âš ï¸ Configurare keep-alive via cron-job.org per tutti i progetti Supabase (free tier si mette in pausa dopo 1 settimana di inattivitÃ )
- **Render:** Digest â€” `https://digest-blqp.onrender.com` (migrato da Railway 2026-03-31). Free tier, sleep dopo 15min.
- **Vercel:** NoteS, Ledger â€” dominio `commonplaceapp.org` (acquistato 2026-03-24, DNS Vercel)
- **Netlify:** DnD Master â€” sottodominio `dnd.commonplaceapp.org`
- **Railway:** Digest/NewS (PostgreSQL persistente)
- **localStorage condiviso:** Cultural Suite â€” migrazione a Supabase completata per BookShelf, Footnote, ListenS (2026-03-29). NoteS giÃ  su Supabase.
- **Hub launcher locale:** `Claude/Progetti/Commonplace/Suite/avvia_suite.bat`
- **PROSSIMA SESSIONE — Migrazione Digest → Vercel+Supabase:** piano completo in `Digest/piano-migrazione-vercel.md` (architettura, SQL dg_feeds/dg_preferences, migrazione dati, rischi, ordine lavori). Nel frattempo: ping cron-job.org ogni 10 min su digest-blqp.onrender.com/api/auth/status come palliativo anti-sleep.
- **MEMORIA (2026-06-12, Sessione #19):** in Digest — endpoint `/api/memoria` (auth) + card "✦ Memoria" sopra i feed. Riemersioni DETERMINISTICHE sulla data (hash, zero AI, zero costi): citazione in esergo da cp_quotes (1 giorno su 3 pesca tra le preferite), anniversario di lettura (stesso mese anni passati), riscoperta (libro ≥4★ letto ≥2 anni fa), wishlist che invecchia, "un anno fa" da cp_log/cp_items. Cache giornaliera in preferences (memoria_cache). Richiede env `SUPABASE_SERVICE_KEY` (pchld service_role) su Render. Deploy: push fatto, Render rideploya da solo.
- **BACKUP AUTOMATICO (2026-06-12, Sessione #19):** cartella `Backup/`, progetto Vercel `cp-backup`, cron giornaliero 5:00 UTC → `api/backup.js` scarica tutte le tabelle utente di pchld + llv (service_role, paginato; esclusi `videos`/`sync_log` rigenerabili) e i feed/preferenze di Digest, poi committa `backups/backup-YYYY-MM-DD.json` + `latest.json` su repo GitHub privato. Env richieste: CRON_SECRET, SUPABASE_PCHLD_SERVICE_KEY, SUPABASE_LLV_SERVICE_KEY, GITHUB_TOKEN, GITHUB_REPO, DIGEST_PASSWORD (opz.). Trigger manuale: /api/backup?secret=… Ripristino: i JSON sono upsertabili via REST.
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

**Tech stack:** Flask/Python + PostgreSQL (Railway)

**Cartella:** `Claude/Progetti/Commonplace/Digest/`

**Deploy:** Railway (migrato da SQLite a PostgreSQL per persistenza)

**FunzionalitÃ :**
- Feed RSS italiani
- Preferenze sincronizzate server-side
- Layout mobile responsive con hamburger drawer
- gevent workers per digest call lunghe
- Accesso da: Windows PC (proxy corporate, `verify=False`), secondo PC, OnePlus 13

**Stato attuale:** ✅ Live su Render (verificato 2026-07-11: /api/auth/status → 200). 🔄 **Migrazione a Vercel+Supabase in corso** (Sessione #21, 2026-07-12): `DigestV/` pronto — SQL eseguito su pchld, backend e frontend completi, verifica locale OK. Restano: migrazione dati, deploy, test parità, cutover DNS. Stato dettagliato in `Digest/piano-migrazione-vercel.md`.

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

**Stato attuale:** 🔶 Revisione completa 2026-06-11 (Sessione #18, Fable 5) — in attesa di build EAS. ⚠️ PRIMA DI TUTTO: riattivare il progetto Supabase llvqoiyvzloloobjiloe (in pausa!).

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
| **Railway ANTHROPIC_API_KEY** | Digest/Footnote | Aggiungere env var su Railway per attivare proxy Footnote |
| **digest.commonplaceapp.org** | Digest | Configurare custom domain in Railway |

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
- Digest (Railway): nessun conflitto locale

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
- **⚠️ Azioni richieste (in ordine):**
  1. ~~Migrazione dati~~ ✅ fatta (33 feed, vedi sopra).
  2. **Deploy `digest-app`** (progetto Vercel NUOVO da `DigestV/`): autorizzare il deploy;
     env richieste su Vercel: `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_KEY` (pchld).
  3. Dopo il deploy: test di parità sui 33 feed reali (confronto errori vecchio vs nuovo,
     attenzione ai 403 da IP Vercel), digest 4 tipi, memoria, riassunti → solo con ok
     esplicito: cutover DNS `digest.commonplaceapp.org` → sospendere Render (NON cancellare,
     rollback 2 settimane) → spegnere ping cron-job.org → aggiornare cp-backup (dg_* da
     Supabase al posto di fetchDigest, e lì muore anche il 401).
  4. Nella nuova app: riassegnare le categorie feed (Impostazioni → Categorie feed).
