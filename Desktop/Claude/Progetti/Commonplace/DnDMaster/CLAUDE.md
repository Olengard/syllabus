# DnDMaster — Gestionale per Dungeon Master (D&D 5e)

App **React 18 + Vite + PWA**, interfaccia in italiano. Persistenza **offline-first**: cache `localStorage` (prefissata per-utente) + **sync Supabase** (tabella `dnd_saves` sul progetto Commonplace condiviso, auth email+password). Pensata per tablet.

## Avvio / build / test
- `npm run dev` — Vite, porta 5175 (incrementa se occupata). Oppure doppio click su `avvia-gestionale.bat`.
- `npm run build` — genera `dist/` (PWA con service worker).
- Deploy (solo su autorizzazione esplicita): `npm run build`, poi `npx netlify deploy --prod --dir dist` da questa cartella — il sito è già linkato via `.netlify/state.json` → `dnd.commonplaceapp.org`. Il SW è gestito da vite-plugin-pwa (`autoUpdate`): nessun bump manuale; `sw.js` a radice è un residuo non registrato.
- `npm test` — Vitest (116 test sulle funzioni pure: dadi, norm/deSlug, storage, sync). **Lancialo dopo ogni modifica a `DiceTray`, `GlobalSearch`, `storage`, `sync`** — e aggiungi test se estrai altre funzioni pure (config in `vitest.config.js`, separata da vite.config.js).

## Struttura file
- `src/App.jsx` — **cuore dell'app (~5.5k righe)**: App/AppRoot/LoginScreen, CharacterSheet (+ picker razza/classe/sottoclasse, equipaggiamento, incantesimi del PG), CombatTracker (+ DiceRoller, incontri), MonstersPage (+ statblock, form, Open5e), EncounterGeneratorPage, Import5eTools (parser 5e.tools), `buildSearchEntries()`.
- `src/data/` — **DB di gioco puri** (export const, zero logica): `spells` (180), `monsters` (37), `equipment`, `magicItems`, `names`, `races`, `classes`, `details`, `shop`, `rules`.
- `src/styles.js` — il CSS globale (template string iniettata da App).
- `src/storage.js` — **layer di persistenza locale** (`K`, `loadJSON`/`saveJSON`, `userKey`, `safeLsSet`, `readRaw`/`writeRaw`, auth mirror, `migrateLegacyKey`, `setSaveListener`): ogni lettura/scrittura localStorage deve passare da qui. `saveJSON` avvisa il motore di sync via listener.
- `src/sync.js` — **motore di sync Supabase** (`createSyncEngine`, testato): pull completo al login (prima del mount di App), push debounced (2.5s) delle chiavi sporche, coda persistita per-utente (`dnd_sync_dirty_v1`) + memoria `updated_at` (`dnd_sync_meta_v1`). Conflitti: last-write-wins **per chiave**; una chiave sporca in locale vince sul remoto. `markAllForPush()` per il post-restore. Offline: si lavora sulla cache, la coda riparte all'evento `online`/al riavvio.
- `src/supabaseClient.js` — client Supabase (progetto Commonplace condiviso `pchldmiavycxzpkzochn`, chiave publishable, tabella `dnd_saves` con RLS owner-only: `user_id, key, value jsonb, updated_at`, PK composta).
- Pagine autonome: `src/NameGenerator.jsx`, `RulesModal.jsx`, `SessionNotesPage.jsx`, `SpellsPage.jsx`, `ShopPage.jsx`, `DescriptionsPage.jsx`, `CampaignPage.jsx`.
- `src/campaign.js` — **registro Campagna** (puro, testato): parser delle schede markdown della wiki Obsidian (frontmatter YAML → voce con riassunto/campi/sezioni). Il tab 🗺 Campagna importa i `.md` (multi-selezione), le voci finiscono in ⌘K (tipi 🎭/🏰/🏛/🗺) e nei pin di Sessione. Chiave `dnd_campaign_v1`. Whitelist `IMPORT_TIPI`; le voci `manual: true` non vengono sovrascritte dagli import.
- La palette ⌘K indicizza anche i **dati personali**: note di sessione (📓), incontri salvati (⚡), nomi salvati (🏷) — letti da localStorage in `buildSearchEntries` a ogni apertura.
- Il tab 📌 Sessione ha un **cruscotto** (`SessionDashboard` in SessionPage.jsx): orologio di gioco in-game (chiave `dnd_game_clock_v1`, helper puri `advanceClock`/`clockTime` testati) + riposo lungo (PF/slot/TS morte del party, +8h) e breve (+PF per PG, +1h). Riceve `characters`/`onUpdateCharacters` da App.
- Scheda PG: ⭐ ispirazione (toggle accanto al nome, campo `char.inspiration`, stella sui chip); form attacchi con **datalist armi** da `EQUIPMENT_DB` (`weaponToAttack`: accurata/finesse→max(FOR,DES), distanza/ranged→DES, competenza inclusa) — il nome libero resta per attacchi custom.
- Scheda PG (fix 2026-07-07): campo **Linguaggi** (`char.languages`, prefill dalla razza se vuoto); **CA automatica** (`computeArmorClass`: migliore armatura posseduta + DES per tier + scudo; `char.acAuto` — attiva sui personaggi nuovi, i vecchi restano manuali finché non si clicca il badge ⚙; digitare la CA a mano la disattiva); **slot incantesimi senza fallback** (prima un fallback da full caster dava slot anche ai Rogue: ora 0 di default, si impostano da classe o con ✎ manuale); parser oggetti 5e.tools mappa i **codici proprietà** (F→Accurata ecc.) e mischia/distanza, così anche gli importati EN attaccano con la caratteristica giusta.
- Scheda PG: **BackgroundPicker** (background importati → nome + competenze skill via mappa `SKILL_EN_TO_IT`, campo libero invariato); allineamento con datalist dei 9 classici; **CARATTERISTICHE DI CLASSE filtrate per sottoclasse** (i privilegi delle altre sottoclassi sono esclusi dal blocco base confrontando i nomi con `subclassFeaturesByLevel`) con pin ★ → blocco "IN EVIDENZA" a descrizione completa (`char.pinnedFeatures`).
- `src/encounter.js` — **coerenza tematica del generatore incontri** (puro, testato): `canonMonsterType` (tipi IT inline + EN importati), `TYPE_AFFINITY` (àncora + tipi affini: demoni+cultisti, drago+servitori, branchi omogenei...), `TERRAIN_CANON`. Il generatore sceglie un'àncora e completa solo con tipi affini.
- Catalogo (`CatalogBrowser`): segna "✓ importato" leggendo l'archivio locale (`loadImportedNames`, match per nome), bottone ↻ per reimportare, "Importa mancanti (N)" salta i già presenti. Dal 2026-07-18 ha il tab **⚔ Oggetti** (`getItems` in catalog.js: items-base.json 124 armi/armature/attrezzi + items.json ~1650 magici e vari, uniti e in cache IndexedDB); NON incluso in "Importa tutto il catalogo" (per la quota si importa selettivamente o con "Importa mancanti" dal tab). `parse5eItem` estrae anche danno (`dmg1`/`dmg2`→"Versatile (…)", `dmgType` S/P/B→IT), gittata e costo (⚠️ `value` 5e.tools è in monete di RAME → convertito mo/ma/mr); le note sono cappate a 1500 caratteri (quota localStorage). Il datalist armi della scheda usa `useWeaponSuggest()` = EQUIPMENT_DB + armi importate con danno (dedupe per slug, inline vince).
- `src/main.jsx` — bootstrap + ErrorBoundary.
- `src/catalog.js` — fetch dati 5e.tools dal mirror GitHub + cache **IndexedDB**.
- `src/CatalogBrowser.jsx` — UI "Catalogo online" dentro il modale **📥 Importa** (ricerca per nome, "Importa tutti").
- `src/ClassChoices.jsx` — tab **🎓 Privilegi** della scheda PG: ASI/talenti (effetto sulle caratteristiche), optional features (infusioni/invocazioni/…), elenco privilegi.
- `src/nameForge.js` — generatore nomi **fantasy procedurale** per razza (tabelle fonetiche), cognomi/casate, categorie curate extra (navi, cibi); usato dal tab ✨ Nomi.
- `src/shopExtra.json` — ampliamento del tab Prezzi (oggetti mondani 5e.tools, generato offline; ~385 voci EN), mergiato con `SHOP_DB` in `ShopPage`.
- `src/detailsExtra.js` — toni extra (sfarzoso, inquietante→Cupo, steampunk/Zeitgeist) per il tab 📖 Descrizioni; mergiato con `DETAILS_DB` in `DescriptionsPage`, che ha anche il generatore "Componi scena".
- `src/GlobalSearch.jsx` — **palette di ricerca globale** (pulsante 🔍 Cerca / scorciatoia Ctrl-Cmd+K): cerca tra incantesimi, mostri, oggetti magici, oggetti del tab Prezzi, regole e condizioni, con dettaglio inline per la consultazione live. Esporta `norm()` (normalizza accenti/maiuscole) e `deSlug()` (slug→inglese) riusati anche dai filtri dei singoli tab. L'indice è costruito da `buildSearchEntries()` in `App.jsx`.
- `src/BackupRestore.jsx` — modale **💾 Backup**: esporta/importa in `.json` tutti i dati locali dell'utente (vedi sotto).
- `src/DiceTray.jsx` — **dadi globali**: FAB 🎲 flottante (visibile da ogni tab) con dadi rapidi, Vantaggio/Svantaggio, formula libera e cronologia persistita (30 tiri). Esporta `parseDice`/`rollDice`/`rollAdvantage`; la palette ⌘K li usa per la riga "🎲 Tira" quando la query è una formula (es. `2d8+3`).
- `src/SessionPage.jsx` — tab **📌 Sessione**: elementi pinnati col 📌 dai risultati della palette, raggruppati per tipo ed espandibili (riusa `TYPE_META`/`TYPE_ORDER`/`Detail` esportati da GlobalSearch). I pin sono **snapshot** salvati per utente: restano anche se l'import cambia.

## Ricerca & ponte EN↔IT
- Lo **slug** dei dati inline è in inglese (es. `name:"Palla di Fuoco"`, `slug:"fireball"`): `deSlug(slug)` ricava il nome EN, quindi cercare in inglese trova l'italiano **senza tabelle di traduzione**.
- Il ponte è applicato sia alla palette globale sia ai filtri di Incantesimi, Mostri, ricerca equip e ricerca rapida mostri del combat (tutti usano `searchNorm`+`deSlug`).
- Limite: un elemento **solo importato** (EN, senza controparte inline IT) non si trova cercando in italiano — non esiste la sua traduzione.

## Backup
- 💾 Backup esporta tutte le chiavi localStorage dell'utente **senza prefisso** (così un backup è ripristinabile in un altro account); riepilogo leggibile in cima.
- Import: valida `app:"DnDMaster"`, **chiede conferma** (sovrascrive le chiavi omonime), poi chiama `markAllForPush()` (il restore diventa la verità: tutto ri-pushato, il pull al reload non lo sovrascrive) e `window.location.reload()`.
- Esclusi: `dnd_auth_user`/`dnd_auth_uid` (auth globale), le chiavi di stato sync (`SYNC_STATE_KEYS`, locali al device) e la cache IndexedDB del catalogo/indice mostri (rigenerabile, sarebbe decine di MB).

## Persistenza (localStorage + Supabase)
- Chiavi **prefissate per utente** via `userKey(key)` → `${user}__${key}`. `safeLsSet` gestisce il quota-exceeded (toast).
- **Auth vera Supabase** (email+password, AuthScreen con login/registrati/reset). Il "profilo" (= prefisso localStorage storico) si risolve dall'account: `display_name` dei metadati → mappa `EMAIL_PROFILE` (olengard@gmail.com → Olengard) → parte locale dell'email, normalizzato sui canonici `Olengard`/`Manu`. La sessione persiste (niente più auto-login hardcoded); avvio **offline** possibile via specchi locali `dnd_auth_user`/`dnd_auth_uid`.
- Flusso all'avvio (AppRoot): sessione → profilo → `migrateLegacyKey` → **pull remoto** → mount di App (che legge localStorage al mount). Badge in basso a destra: pallino stato sync (verde ok, oro in corso, grigio offline, rosso errore) + utente + logout (flush prima di uscire).
- `loadJSON`/`saveJSON` restano **sincroni** sulla cache locale: i componenti non sanno nulla del backend. Solo le chiavi del registro `K` sincronizzano.
- I personaggi (debounce 400ms, `flushSave` con chiave catturata alla modifica) marcano la chiave sporca **alla modifica** (`sync.markDirty` nell'effect), non al flush; il push rilegge comunque il valore corrente e il confronto raw pre/post upsert evita di perdere scritture in volo.
- Chiavi principali: `STORAGE_KEY` (personaggi), `dnd_custom_monsters_v1` (mostri), `dnd_imported_*` (catalogo), `dnd_combat_v2`, `dnd_encounters_v2`, `dnd_session_notes`, `dnd_saved_names`, `dnd_session_pins_v1` (pin Sessione), `dnd_dice_history_v1` (tiri).
- Migrazione legacy → spazio utente in `migrateLegacyKey` (in `AppRoot`).
- **Salvataggio personaggi debounced (400ms)** in `App` (`flushSave`): flush immediato su pagehide/visibilitychange/unmount; la chiave utente è catturata **alla modifica**, non al flush (evita scritture su chiave sbagliata durante il logout). Non tornare al salvataggio sincrono per-keystroke.
- **Ritratto PG**: `char.portrait` è un JPEG base64 ridimensionato a max 512px da `resizeImage()` (~30-60KB); il riquadro è `CharacterPortrait` nell'header della scheda.

## Dati esterni
- **Mirror 5e.tools**: `https://raw.githubusercontent.com/5etools-mirror-3/5etools-2014-src/main/data` (CORS aperto). Usato dal catalogo e per l'indice mostri globale (cache IndexedDB, una volta per dispositivo).
- **Open5e API** per la ricerca mostri online in `MonstersPage`.
- I parser 5e.tools (`parse5eMonster`, `parse5eSpell`, `parse5eClass`, …) stanno dentro `Import5eTools`; `runImport(type, data)` è il punto unico riusato sia dall'import da file sia dal catalogo.

## Convenzioni
- UI e commenti in **italiano**. I contenuti importati da 5e.tools restano in **inglese**.
- Git: prefisso commit `feat(dnd)` / `fix(dnd)`, messaggio in italiano; si lavora con branch + **merge fast-forward su `main`**; push solo su richiesta.
- Repo radice in `Desktop/Claude` (remote `github.com/Olengard/syllabus`); DnDMaster è un sottoprogetto. `.gitignore` esclude `node_modules/`, `dist/`, `outputs/`.

## Gotcha
- `App.jsx` è ancora grande (~5.5k righe): orientati con **Grep**. I DB in `src/data/` sono su righe singole lunghissime (JSON compattato).
- Dopo modifiche ai parser delle classi, le classi già importate vanno **reimportate** dal catalogo per avere i campi nuovi.
- L'indice mostri e i dati del catalogo sono in cache **per-dispositivo** (IndexedDB).
- **Performance**: NON fare `JSON.parse` di localStorage a ogni render (con ~525 incantesimi importati bloccava la ricerca) → memoizza il caricamento; limita le liste renderizzate (slice).
- **Collisione slug IT/EN**: inline è in italiano ma con slug inglesi (es. "Palla di Fuoco" → slug `fireball`), come gli importati EN → deduplicare le liste combinate per slug (inline vince) per evitare chiavi React duplicate.
- Pattern attuale per leggere gli importati: alcune pagine ri-leggono localStorage a ogni apertura (la cache non si aggiorna se importi mentre la pagina è montata; basta rientrare nel tab).
- **Un solo dev server**: se la 5175 risponde già (avvia-gestionale.bat dell'utente), NON avviarne un secondo — due watcher Vite sulla stessa cartella confliggono e quello perdente serve moduli stantii con status 200. Se "non vedo la modifica" con build/test verdi: `curl localhost:PORTA/src/File.jsx | grep <codice nuovo>`.
- I **dati importati vecchi** possono avere forme diverse da quelle attese (es. razze con `abilityScoreIncrease` stringa invece di `abilityBonuses` oggetto): quando cambi un parser, aggiungi la conversione di compatibilità nel punto di lettura (vedi `parseAsiLegacy`) e normalizza alla forma dei dati inline.
- Il bump tablet (`@media max-width:1400px`) imposta padding/min-height dei `.btn` con `!important`: gli stili inline compatti nei componenti vengono scavalcati — serve una regola CSS con specificità maggiore (vedi `.dice-tray .btn`).

## Roadmap
**Supabase fase 2B: FATTA (2026-07-07)** — auth vera + sync cross-device via `dnd_saves`. Limite noto e accettato: conflitti last-write-wins per chiave intera (es. tutti i PG in un blob) — se servisse, spezzare `characters` in una riga per PG senza cambiare l'API. Vedi memoria `dnd-master-roadmap`.

**Schede condivise coi giocatori (design 2026-07-18, richiesto da Stefano — DA IMPLEMENTARE, ~2-3 sessioni):**
principio non negoziabile: **la copia del Master è sempre la verità**. Disegno:
1. *Prerequisito*: spezzare `characters` in una riga per PG (già previsto sopra) — senza, il
   last-write-wins sul blob renderebbe la condivisione un tritacarne di sovrascritture.
2. Tabella `dnd_shared_chars` (player_uid, char_id, char jsonb, updated_at) su pchld, RLS:
   il giocatore scrive SOLO la propria riga; il Master (uid Olengard) legge tutte. Il giocatore
   usa la STESSA app (ha già login/registrazione): vede e cura solo la sua scheda.
3. *Modello a PROPOSTA, niente merge automatico*: gli aggiornamenti del giocatore NON toccano
   la copia del Master. Nella vista Master un badge "📬 aggiornamento da <giocatore>" apre il
   DIFF (PF, slot, equip, livello) con "Accetta" / "Ignora". Il controllo del diff è anche
   l'anti-cheat naturale.
4. In sessione fa fede lo schermo del Master (il combat tracker usa già le sue copie); il
   giocatore aggiorna la scheda "amministrativa" (level up, acquisti) fuori sessione.
Problemi previsti e mitigati dal disegno: conflitti concorrenti (risolti dal modello a
proposta), cheating/errori (diff visibile), offline (coda sync esistente), privacy (RLS
per riga: un giocatore non vede schede altrui né mostri/note del Master).
**Decisioni ratificate da Stefano (2026-07-18):** modello a proposta approvato; requisito:
i giocatori devono avere il catalogo 5e.tools completo → GIÀ VERO (dnd_imported_* è
per-utente, ogni account ha il suo 📥 Importa: zero lavoro). Conseguenza di design:
la scheda condivisa viaggia con SNAPSHOT completi (incantesimi/attacchi/privilegi
materializzati nel char, come i pin di Sessione) — MAI riferimenti per nome da risolvere
nell'archivio del Master, che potrebbe non avere gli stessi import del giocatore.
