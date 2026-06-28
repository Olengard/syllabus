# DnDMaster — Gestionale per Dungeon Master (D&D 5e)

App **React 18 + Vite + PWA**, interfaccia in italiano. **Nessun backend**: persistenza su `localStorage` (prefissata per-utente). Offline-first, pensata per tablet.

## Avvio / build
- `npm run dev` — Vite, porta 5175 (incrementa se occupata). Oppure doppio click su `avvia-gestionale.bat`.
- `npm run build` — genera `dist/` (PWA con service worker).

## Struttura file
- `src/App.jsx` — **monolite (~9k righe)**: tutti i componenti + i DB di gioco inline (`MONSTERS_DB`, `SPELLS_DB`, `EQUIPMENT_DB`, `NAMES_DB`, `SHOP_DB`, `RACES_DB`, `CLASSES_DB`, `DETAILS_DB`, `RULES_DB`). Stili CSS in template string `styles`.
- `src/main.jsx` — bootstrap + ErrorBoundary.
- `src/catalog.js` — fetch dati 5e.tools dal mirror GitHub + cache **IndexedDB**.
- `src/CatalogBrowser.jsx` — UI "Catalogo online" dentro il modale **📥 Importa** (ricerca per nome, "Importa tutti").
- `src/ClassChoices.jsx` — tab **🎓 Privilegi** della scheda PG: ASI/talenti (effetto sulle caratteristiche), optional features (infusioni/invocazioni/…), elenco privilegi.
- `src/nameForge.js` — generatore nomi **fantasy procedurale** per razza, cognomi/casate, categorie curate extra (navi, cibi).
- `src/shopExtra.json` — ampliamento del tab Prezzi (oggetti mondani 5e.tools, generato offline; ~385 voci EN).

## Persistenza (localStorage)
- Chiavi **prefissate per utente** via `userKey(key)` → `${user}__${key}`. `safeLsSet` gestisce il quota-exceeded (toast).
- Utenti app: **Olengard** (auto-login) e **Manu**. Auth *cosmetica* (hash SHA-256 nel sorgente + auto-login).
- Chiavi principali: `STORAGE_KEY` (personaggi), `dnd_custom_monsters_v1` (mostri), `dnd_imported_*` (catalogo), `dnd_combat_v2`, `dnd_encounters_v2`, `dnd_session_notes`, `dnd_saved_names`.
- Migrazione legacy → spazio utente in `migrateLegacyKey` (in `AppRoot`).

## Dati esterni
- **Mirror 5e.tools**: `https://raw.githubusercontent.com/5etools-mirror-3/5etools-2014-src/main/data` (CORS aperto). Usato dal catalogo e per l'indice mostri globale (cache IndexedDB, una volta per dispositivo).
- **Open5e API** per la ricerca mostri online in `MonstersPage`.
- I parser 5e.tools (`parse5eMonster`, `parse5eSpell`, `parse5eClass`, …) stanno dentro `Import5eTools`; `runImport(type, data)` è il punto unico riusato sia dall'import da file sia dal catalogo.

## Convenzioni
- UI e commenti in **italiano**. I contenuti importati da 5e.tools restano in **inglese**.
- Git: prefisso commit `feat(dnd)` / `fix(dnd)`, messaggio in italiano; si lavora con branch + **merge fast-forward su `main`**; push solo su richiesta.
- Repo radice in `Desktop/Claude` (remote `github.com/Olengard/syllabus`); DnDMaster è un sottoprogetto. `.gitignore` esclude `node_modules/`, `dist/`, `outputs/`.

## Gotcha
- `App.jsx` è enorme: orientati con **Grep**, non rileggerlo tutto. I DB inline sono JSON su righe singole lunghissime.
- Dopo modifiche ai parser delle classi, le classi già importate vanno **reimportate** dal catalogo per avere i campi nuovi.
- L'indice mostri e i dati del catalogo sono in cache **per-dispositivo** (IndexedDB).

## Roadmap (prossimo grande step)
**Supabase**: introdurre un **layer di persistenza unico** (oggi incapsula localStorage, domani Supabase) → sync cross-device + isolamento utente reale + auth vera. Vedi memoria `dnd-master-roadmap`.
