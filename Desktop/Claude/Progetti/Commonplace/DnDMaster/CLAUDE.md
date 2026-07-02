# DnDMaster — Gestionale per Dungeon Master (D&D 5e)

App **React 18 + Vite + PWA**, interfaccia in italiano. **Nessun backend**: persistenza su `localStorage` (prefissata per-utente). Offline-first, pensata per tablet.

## Avvio / build
- `npm run dev` — Vite, porta 5175 (incrementa se occupata). Oppure doppio click su `avvia-gestionale.bat`.
- `npm run build` — genera `dist/` (PWA con service worker).

## Struttura file
- `src/App.jsx` — **cuore dell'app (~5.5k righe)**: App/AppRoot/LoginScreen, CharacterSheet (+ picker razza/classe/sottoclasse, equipaggiamento, incantesimi del PG), CombatTracker (+ DiceRoller, incontri), MonstersPage (+ statblock, form, Open5e), EncounterGeneratorPage, Import5eTools (parser 5e.tools), `buildSearchEntries()`.
- `src/data/` — **DB di gioco puri** (export const, zero logica): `spells` (180), `monsters` (37), `equipment`, `magicItems`, `names`, `races`, `classes`, `details`, `shop`, `rules`.
- `src/styles.js` — il CSS globale (template string iniettata da App).
- `src/storage.js` — **helper di persistenza** (`userKey`, `safeLsSet`, `getStoredUser`/`storeUser`/`clearUser`, `migrateLegacyKey`): è il seme del futuro layer Supabase — ogni nuova lettura/scrittura localStorage deve passare da qui.
- Pagine autonome: `src/NameGenerator.jsx`, `RulesModal.jsx`, `SessionNotesPage.jsx`, `SpellsPage.jsx`, `ShopPage.jsx`, `DescriptionsPage.jsx`.
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
- Import: valida `app:"DnDMaster"`, **chiede conferma** (sovrascrive le chiavi omonime), poi `window.location.reload()`.
- Esclusi: `dnd_auth_user` (auth globale) e la cache IndexedDB del catalogo/indice mostri (rigenerabile, sarebbe decine di MB).

## Persistenza (localStorage)
- Chiavi **prefissate per utente** via `userKey(key)` → `${user}__${key}`. `safeLsSet` gestisce il quota-exceeded (toast).
- Utenti app: **Olengard** (auto-login) e **Manu**. Auth *cosmetica* (hash SHA-256 nel sorgente + auto-login).
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

## Roadmap (prossimo grande step)
**Supabase**: introdurre un **layer di persistenza unico** (oggi incapsula localStorage, domani Supabase) → sync cross-device + isolamento utente reale + auth vera. Vedi memoria `dnd-master-roadmap`.
