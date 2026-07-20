# DnDMaster — Gestionale per Dungeon Master (D&D 5e)

App **React 18 + Vite + PWA**, interfaccia in italiano. Persistenza **offline-first**: cache `localStorage` (prefissata per-utente) + **sync Supabase** (tabella `dnd_saves` sul progetto Commonplace condiviso, auth email+password). Pensata per tablet.

## Manuale d'uso

`Manuale DnD Master.docx` (radice del progetto, 2026-07-20) — manuale per gli utenti finali,
scritto per essere condiviso con gli amici del tavolo. Struttura: cap. 3 **autosufficiente per
i giocatori** (entrare col codice, curare la scheda, cosa arriva al master subito vs. cosa passa
dall'approvazione), cap. 4 per il master, cap. 5 riferimento rapido + tabella «chi vede cosa»,
cap. 6 problemi comuni. Generato con `docx` (npm), poi **rivisto a mano da Stefano**: la versione
in repo è la sua. ⚠️ **Non rigenerarlo dallo script**: sovrascriveresti le sue revisioni —
per le correzioni editare il .docx direttamente.
⚠️ **Il cap. 4 rivela il meccanismo dei segreti** (voci di prestigio nascoste/rinominabili):
non svela nessun segreto specifico, ma dandolo ai giocatori sanno che l'app può mostrare nomi
diversi. Se serve, farne una versione «solo giocatori» senza il cap. 4.
⚠️ **Da tenere allineato**: parla di tab, flussi e comportamenti che cambiano col codice.

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
- **I tab principali sono elencati in DUE posti**: `.header-tabs` in `App.jsx` (desktop) e la
  **bottom nav mobile** (`<nav className="mobile-nav">`, stesso file, in fondo al render) —
  sotto i 768px `.header-tabs` è `display:none !important` (styles.js) e la navigazione passa
  interamente alla bottom nav. Aggiungere un tab in un solo elenco lo rende **irraggiungibile**
  sull'altro formato, senza alcun errore. Successo col tab 🤝 Tavolo, invisibile su telefono
  dal deploy 3c fino al 2026-07-20: la diagnosi iniziale ("cache PWA") era sbagliata, il
  bundle era giusto — `grep -c Tavolo` sul bundle live dava 1 invece di 2.
- **Un solo dev server**: se la 5175 risponde già (avvia-gestionale.bat dell'utente), NON avviarne un secondo — due watcher Vite sulla stessa cartella confliggono e quello perdente serve moduli stantii con status 200. Se "non vedo la modifica" con build/test verdi: `curl localhost:PORTA/src/File.jsx | grep <codice nuovo>`.
- I **dati importati vecchi** possono avere forme diverse da quelle attese (es. razze con `abilityScoreIncrease` stringa invece di `abilityBonuses` oggetto): quando cambi un parser, aggiungi la conversione di compatibilità nel punto di lettura (vedi `parseAsiLegacy`) e normalizza alla forma dei dati inline.
- Il bump tablet (`@media max-width:1400px`) imposta padding/min-height dei `.btn` con `!important`: gli stili inline compatti nei componenti vengono scavalcati — serve una regola CSS con specificità maggiore (vedi `.dice-tray .btn`).

## Roadmap
**Supabase fase 2B: FATTA (2026-07-07)** — auth vera + sync cross-device via `dnd_saves`. Limite noto e accettato: conflitti last-write-wins per chiave intera (es. tutti i PG in un blob) — se servisse, spezzare `characters` in una riga per PG senza cambiare l'API. Vedi memoria `dnd-master-roadmap`.

**Schede condivise coi giocatori (design 2026-07-18, esteso al modello a campagna
2026-07-19 — richiesto da Stefano, DA IMPLEMENTARE):**
principio non negoziabile: **la copia del Master è sempre la verità**.

*I 4 pilastri (invariati):*
1. *Prerequisito*: spezzare `characters` in una riga per PG (vedi 2B sopra) — senza, il
   last-write-wins sul blob renderebbe la condivisione un tritacarne di sovrascritture.
   ✅ **FATTO (blocco 1, 2026-07-19, Opus)**: schede sotto `char:<id>` + indice
   `dnd_char_index_v1` (ordine/activeId); motore di sync esteso alle char-key dinamiche
   (`isCharKey`, `markDeleted` con coda tombstone `dnd_sync_deleted_v1`, pull/push/restore
   per-PG); migrazione one-time NON distruttiva dal blob (`dnd5e-master-v1` tenuto INTATTO
   come rollback, split in `AppRoot` prima del pull). `App.jsx`: `loadAllChars` + save-effect
   che scrive/marca SOLO il PG modificato (confronto per identità), cancellazione via
   `sync.markDeleted`. 13 test nuovi (129 totali verdi), build verde. ⏳ **Collaudo live
   sul roster reale di olengard = AL DEPLOY** (login → migrazione reale + push per-PG; farlo
   al deploy minimizza la finestra a versioni miste con la PWA vecchia). Rollback: torna al
   codice vecchio, il blob è ancora la verità.
2. *Modello a PROPOSTA, niente merge automatico*: gli aggiornamenti del giocatore NON toccano
   la copia del Master. Nella vista Master un badge "📬 aggiornamento da <giocatore>" apre il
   DIFF (PF, slot, equip, livello) con "Accetta" / "Ignora". Il diff è anche l'anti-cheat
   naturale (forte quanto l'attenzione del master: va bene per un gioco tra amici, non è una
   proprietà di sicurezza).
3. *Snapshot completi*: la scheda condivisa viaggia con incantesimi/attacchi/privilegi
   **materializzati nel char** (come i pin di Sessione) — MAI riferimenti per nome da
   risolvere nell'archivio del Master, che potrebbe avere import 5e.tools diversi dal
   giocatore. Requisito "giocatore ha il catalogo completo" → GIÀ VERO (`dnd_imported_*`
   è per-utente, ogni account ha il suo 📥 Importa).
4. In sessione fa fede lo schermo del Master (il combat tracker usa già le sue copie); il
   giocatore aggiorna la scheda "amministrativa" (level up, acquisti) fuori sessione.

*Modello a CAMPAGNA (ratificato 2026-07-19).* L'app è multi-master: **più master
indipendenti, ognuno con più campagne, giocatori e PG diversi per campagna**. La campagna è
l'aggregato che rende netti sia il raggruppamento sia la RLS (e cancella l'uid-master
cablato: "essere master" = possedere ≥1 campagna, non un'identità hardcoded). Bozza schema
(pchld):
```
campaigns(id, master_uid, name, join_code, created_at)         -- 1 proprietario per campagna
dnd_shared_chars(campaign_id, player_uid, char_id, char jsonb, updated_at, status)
   PK (campaign_id, player_uid, char_id)
   RLS SELECT: player_uid = auth.uid()
            OR campaign_id IN (select id from campaigns where master_uid = auth.uid())
   RLS INSERT/UPDATE/DELETE: solo il giocatore sulla PROPRIA riga (player_uid = auth.uid())
```
- **Ingresso in campagna = join-code** (il master lo genera, lo passa fuori-app, il giocatore
  lo inserisce). Membership **implicita**: sei nella campagna se hai una scheda lì / hai usato
  il code. Niente tabella membri né flusso di approvazione nella v1.
- **Un solo proprietario per campagna** (niente co-DM; i giocatori non sono co-master).
- Il layer condiviso (`campaigns` + `dnd_shared_chars`) vive **fuori** dal motore `dnd_saves`
  attuale: percorso di sync a sé (l'affermazione "l'offline lo copre la coda esistente" è
  ottimistica — quella coda è specifica di `dnd_saves`).

✅ **Blocco 2 FATTO (2026-07-19, Opus)** — migration `dnd_schede_condivise_blocco2` su pchld:
tabelle `campaigns` + `dnd_shared_chars` con RLS (8 policy verificate, RLS attiva). Scelte:
- `campaigns` **owner-only** (tutte le policy `auth.uid() = master_uid`); `join_code` colonna
  (default random 6 char, unique).
- `dnd_shared_chars` (PK `campaign_id, player_uid, char_id`; `char jsonb`; FK→campaigns
  on delete cascade): giocatore sulla PROPRIA riga (`auth.uid() = player_uid`) OR master via
  `campaign_id in (select id from campaigns where master_uid = auth.uid())`.
- **RLS NON ricorsiva** di proposito: campaigns non referenzia dnd_shared_chars → il
  riferimento è a senso unico, niente "infinite recursion in policy". Conseguenza v1: il
  giocatore NON fa SELECT diretta su `campaigns` (niente nome campagna via query) — glielo
  darà la RPC di join nel blocco 3.
- **NON ancora fatti (blocco 3):** RPC `join_campaign` (SECURITY DEFINER: valida il code,
  crea la riga-slot del giocatore → lo rende visibile al master), e la UI.
- ⚠️ **Follow-up prima che ci siano dati veri:** aggiungere `campaigns` e `dnd_shared_chars`
  a `Backup/api/backup.js` (lista pchld) + redeploy cp-backup — **lezione `dnd_saves`**
  (tabella nata a luglio e mai backuppata per settimane). Ora sono vuote, quindi non urge,
  ma va fatto col blocco 3 (aggiungere anche `campaign_members`).

### Blocco 3 — decisioni di dettaglio ratificate (2026-07-19)

**Flusso join+seed (dec. 1) = Flow 2 (membership esplicita).** Tabella
`campaign_members(campaign_id, player_uid, display_name, joined_at)`. Il giocatore entra con
la RPC `join_campaign(code)` (SECURITY DEFINER: valida il code, registra la membership,
ritorna id+nome campagna) → diventa visibile al master. Il master **assegna** creando la riga
`dnd_shared_chars` con `char_id = l'id della sua copia di roster` (push-down, linking pulito,
nessuna riconciliazione). RLS non ricorsiva via helper SECURITY DEFINER `is_campaign_master` /
`is_campaign_member`.

**Partizione dei campi (dec. 2) — 3 bucket + esclusioni** (sui campi reali di `defaultChar`):
- ① **Vitali** (live, giocatore autoritativo, auto-sync, no approvazione): `currentHp`,
  `tempHp`, `usedSpellSlots`, `deathSaves`, `inspiration`. In v1 il master li **vede** in
  sola lettura (auto-popolamento del combat tracker fasato a dopo).
- ② **Amministrativo** (propose → accept): `level`, `xp`, `maxHp`, `abilities`,
  `savingThrows`, `skills`, `armorClass`(+`acAuto`), `speed`, `passivePerception`, `spells`,
  `spellSlots` (massimi), `equipment`, `currency`, `attacks`, `choices`, `race`/`class`/
  `subclass`/`background`/`alignment`/`languages`/`name`, testo di ruolo (`traits`/`ideals`/
  `bonds`/`flaws`/`notes`).
- ④ **Del master** (fuori dallo scope del giocatore, anti-cheat): `prestige`, `reputation`.
- **Escluso dal diff**: `id`, `player`; `portrait` (solo flag "ritratto cambiato", niente
  diff); `acAuto` (viaggia con `armorClass`); `pinnedFeatures` (vista locale, non condivisa);
  `initiative` (combattimento = schermo master).

**UX accept (dec. 3):** badge "📬 aggiornamento da <giocatore>" quando i campi ② divergono
tra copia-di-roster del master e riga condivisa. Pannello diff raggruppato (scalari + sintesi
array), **check per riga, tutti spuntati di default, deselezionabili**; gli **array sono un
checkbox intero** (accetta/rifiuta l'intero cambiamento dell'array, NON per-oggetto — il merge
per-elemento è fuori v1). "Accetta" copia i campi spuntati nella copia del master; "Ignora"/
parziale = `lastSeenHash` dello snapshot amministrativo (il badge sparisce, ricompare solo a
nuova modifica del giocatore). **Flusso a senso unico (B1):** un campo non accettato resta
nella scheda del giocatore, NON nel master (divergono; in v1 il giocatore non è avvisato).
v2: feedback "accettato", correzioni master→giocatore, `prestige`/`reputation` in lettura
(tutti flussi master→giocatore).

**Ordine implementativo blocco 3:** 3a DB (`campaign_members` + helper + RPC `join_campaign`
+ `campaigns` SELECT ai membri) → 3b client sync del layer condiviso (fuori dal motore
`dnd_saves`, due canali) → 3c UI (vista giocatore; vista master con assegna + diff/accept +
vitali live).

✅ **3a FATTO (2026-07-19, Opus)** — migration `dnd_schede_condivise_blocco3a_membership` su
pchld (verificata): tabella `campaign_members` (RLS: membro vede la propria riga, master vede
i membri delle sue campagne; **nessuna policy INSERT** → l'unico ingresso è la RPC); helper
`SECURITY DEFINER` `is_campaign_master`/`is_campaign_member` (spezzano la ricorsione mutua di
RLS); RPC `join_campaign(code, display_name)` (SECURITY DEFINER, valida il code → registra la
membership idempotente → ritorna id+nome campagna; grant solo a `authenticated`); `campaigns`
SELECT esteso ai membri via helper.

✅ **3b FATTO (2026-07-19, Opus)** — moduli client del layer condiviso, FUORI dal motore
`dnd_saves`, con `npm test` verde (129 baseline → **167**, +38) e build verde:
- `src/sharedChar.js` (**puro**, nessuna dip. Supabase/localStorage): partizione dei campi
  reali di `defaultChar` — `VITALI_FIELDS` (`currentHp,tempHp,usedSpellSlots,deathSaves,
  inspiration`; conditions/hitDice NON esistono ancora come campi PG → entreranno qui con una
  riga quando aggiunti alla scheda, blocco A concordato), `ADMIN_FIELDS`, `MASTER_ONLY_FIELDS`
  (`prestige,reputation`), esclusi. `pickVitali`/`pickAdmin`; `diffAdmin` (accept per-CAMPO
  top-level; array `equipment/spells/attacks` a blocco con sintesi conteggi; `armorClass`
  trascina `acAuto`; `portrait` solo flag, mai base64 nel diff); `applyAccepted` (immutabile,
  deep-clone); `adminHash`+`hasPendingAdmin` per il badge 📬 (hash breve del ritratto).
- `src/sharedSync.js` (trasporto, wrapper su `supabase`, RLS = sicurezza): `createCampaign`,
  `listMyCampaigns(uid)`, `listMembers`, `seedSharedChar` (push-down, upsert), `listSharedFor
  Master`, `deleteSharedChar`; `joinCampaign` (RPC, mappa `CODICE_NON_VALIDO`), `listSharedFor
  Me(uid)`, `upsertMySharedChar`; `subscribeSharedForMaster` (Realtime).
- Migration `dnd_schede_condivise_blocco3b_realtime` su pchld (verificata): `dnd_shared_chars`
  aggiunta a `supabase_realtime` (vitali live al master senza refresh; REPLICA IDENTITY di
  default = PK, basta ai DELETE). **Realtime ratificato da Stefano 2026-07-19** (i vitali sono
  LWW sola-lettura per il master; l'accept amministrativo resta manuale tra le sessioni).
- Test: `sharedChar.test.js` (26), `sharedSync.test.js` (12, fake-client per 3 tabelle+rpc+
  canale). **Nessuna modifica** a `App.jsx`/`sync.js`/`storage.js` (il wiring è il 3c).
- **Non deployato** (build locale; il deploy Netlify porta anche il blocco 1 non ancora live).

✅ **3c FATTO (2026-07-19, Opus) — UI, verificata end-to-end live su account reale:**
- Nuovo tab **🤝 Tavolo** (`SharedTablePage.jsx`; «Campagna» era già l'import wiki). Un utente
  può essere sia master sia giocatore (toggle di ruolo). Trasporto tutto in `sharedSync.js`.
- **Vista Giocatore:** "Entra in campagna" (join-code) + lista schede assegnate; apre e cura
  la scheda **riusando `CharacterSheet`** — passata da `App.jsx` come prop `renderSheet` per
  evitare l'**import circolare** (CharacterSheet vive dentro App.jsx). Le modifiche fanno un
  upsert debounced (800ms) della riga condivisa. Guardia aggiunta: il bottone "Elimina
  Personaggio" della CharacterSheet ora è condizionale a `onDelete` (nella vista condivisa è
  nascosto). Impatto su `App.jsx`: solo import + tab + mount + questa guardia.
- **Vista Master:** crea campagna + join-code (copiabile), membri, **assegna un PG esistente
  del roster** (scelta di Stefano: campagna già in corso → `char_id` = id del roster, linking
  automatico), vitali live in sola lettura, pannello **diff per-campo** (`diffAdmin`) con
  accept selettivo → `applyAccepted` → `updateChar` (fluisce su `dnd_saves`). `lastSeenHash`
  per il badge in `K.sharedSeen` (sincronizzato). Realtime via `subscribeSharedForMaster`.
- `sharedSync.js`: aggiunto `listVisibleCampaigns` (nomi campagna lato giocatore) + test.
  Totale **168 test verdi**, build verde.
- ⚠️ **BUG del 3a corretto (root cause):** la RPC `join_campaign` falliva al **primo join
  reale** con *"column reference campaign_id is ambiguous"* — `on conflict (campaign_id,
  player_uid)` era ambiguo con il parametro OUT omonimo `campaign_id` di `RETURNS TABLE`. Fix:
  `on conflict on constraint campaign_members_pkey` (migration `fix_join_campaign_ambiguous_
  campaign_id`). Il 3a era documentato "verificato" ma la RPC non era mai stata chiamata.
- **Collaudo E2E** (Olengard, un account: entra nella propria campagna, è master+giocatore):
  crea → join → assegna → il giocatore modifica Lv → badge 📬 → diff (`level`/`maxHp`/
  `spellSlots`) → accept → roster aggiornato. Dati di prova poi ripuliti; PG di test
  ripristinato. **Non verificato in isolamento: il Realtime vero** (gli update passavano anche
  via refresh manuali). Cosmetico: allineamento checkbox/etichetta nel pannello diff.
- **Non deployato/non pushato.** Il deploy porterà anche il blocco 1 (migrazione roster già
  avvenuta sull'account reale al login col dev server, non distruttiva).

✅ **3b+3c DEPLOYATI** (2026-07-19, Netlify, verificato live: bundle contiene `Tavolo`/
`join_campaign`) e **pushati** (`main`→origin). Follow-up backup **chiuso**: le 3 tabelle
aggiunte a `Backup/api/backup.js`, cp-backup ridistribuito (`Backup/` è fuori da git).

✅ **Blocco A FATTO (2026-07-19, Opus) — condizioni + dadi vita come campi persistenti:**
- `defaultChar`: `hitDiceUsed: 0` (max = livello; tipo dado = `char.hitDie`, già impostato dal
  picker classe, fallback d8) e `conditions: []`. Retro-riempiti sui PG esistenti dal merge di
  `defaultChar()` all'avvio.
- `CharacterSheet` (blocco COMBATTIMENTO): controllo **DADI VITA** (`n/max dX` con −/+ per
  spendere/recuperare) sotto i PF; riga **CONDIZIONI** con chip toggle che **riusano
  `COND_META`/`CONDITIONS`** (le stesse del Combat Tracker), attive colorate.
- `SessionPage` riposo lungo: recupera **metà dadi vita** (min 1), oltre a PF/slot/TS morte.
- `VITALI_FIELDS += ["conditions","hitDiceUsed"]` (sono contatori che si consumano in gioco →
  sync live nelle schede condivise; il master li vede in `VitaliView`, con le condizioni come
  chip e i dadi vita rimasti). **NON** amministrativi (niente diff/accept). Test aggiornati.
- 168 test verdi, build verde. **Verificato in-app** (spesa dado vita + toggle condizione
  persistiti su `char:<id>`; PG di test ripristinato). **Deployato 2026-07-19** (Netlify) coi
  fix rifiniture.

✅ **Rifiniture FATTE (2026-07-19, Opus):**
- **Realtime VERIFICATO in isolamento** (due tab, stessa sessione Olengard): la tab master in
  `subscribeSharedForMaster` si aggiorna **senza refresh** quando il giocatore (altra tab)
  modifica la riga condivisa — provati sia un vitale (PF 38→12, `VitaliView` live) sia il badge
  📬 amministrativo. Postgres_changes rispetta la RLS (arriva solo al master della campagna).
- **Cosmetico diff RISOLTO (era un bug):** il checkbox del pannello diff ereditava
  `input{width:100%}` globale → largo 1227px, spingeva etichetta e valore fuori schermo. Fix:
  `width:16` sul checkbox + `justify-content:flex-start`/`text-transform:none` sulla riga.
  Verificato coi bounding-rect (checkbox 16px, campi impacchettati a sinistra).

**Prossimo:** nessun blocco aperto obbligatorio. Il recupero dadi vita del riposo lungo è
**coperto da test** (2026-07-20): estratto come helper puro `hitDiceAfterLongRest` in
`SessionPage.jsx` (pattern di `advanceClock`), 4 casi in `SessionPage.test.js` — la formula
era già corretta, nessun cambio di comportamento. 172 test verdi. TO-DO futuri sotto.

*Ambito v1:* campagna-scopare **solo il layer condiviso** (giocatore→master). Il **roster
locale del master resta globale** per ora (scoparlo tocca la persistenza `characters` + il
motore di sync: rimandato).

*Decisioni ratificate (2026-07-19):*
- **Seed + linking (era #1+#3): il master semina (push-down).** Il master crea il PG nel suo
  roster e lo spinge in `dnd_shared_chars`: la riga condivisa nasce **col `char_id` del
  master** → il linking roster↔scheda condivisa è automatico e permanente (nessuna UI di
  aggancio). Flusso comodo: il master crea uno **scheletro** (nome/razza/classe/livello,
  assegnato al giocatore), il giocatore lo **completa** (caratteristiche, equip, incantesimi).
  Ordine: il giocatore entra prima in campagna col join-code (così il master ne vede l'uid),
  poi il master assegna. Coerente col principio "la copia del master è la verità".
- **Granularità Accetta (era #2): DUE CANALI di sync diversi nella stessa scheda.**
  1. *Canale VITALI (live, autorità pratica al giocatore, niente approvazione, LWW):* i
     contatori che deplettano in gioco — **PF correnti, PF temporanei, dadi vita rimasti,
     slot incantesimo SPESI, TS contro morte, condizioni**. Il giocatore li aggiorna in
     tempo reale, il master li vede live. Motivazione: al tavolo il master non tiene traccia
     dei PF di tutti, il giocatore sì; così i PF arrivano allo schermo del master invece di
     essere digitati a mano.
  2. *Canale AMMINISTRATIVO (propose → accept, tra sessioni, master = verità):* la struttura
     — **livello, PF MAX, caratteristiche, competenze, CA base, incantesimi noti/preparati,
     slot MASSIMI, equipaggiamento, talenti/ASI, privilegi, background**. Accetta **v1
     tutto-o-niente** con diff leggibile e raggruppato; per-campo sui soli scalari eventuale
     v2 (gli array equip/incantesimi restano a blocco: diffarli per-voce è troppo per la v1).
  Confine netto: **struttura/roster = amministrativo; contatori che si consumano in gioco =
  vitali.** (PF *max* amministrativo / PF *correnti* live; slot *massimi* amministrativo /
  slot *spesi* live.) **Override del master sempre disponibile su qualunque campo, vitali
  inclusi** — il principio "master = verità" regge dove conta (struttura + override).
  Diff amministrativo: escludere ritratto base64 (solo flag "ritratto cambiato"),
  timestamp/metadati, `activeId`.
- *Consumo dei vitali dal combat tracker:* fasato — prima il master **vede** i PF live nella
  vista schede condivise; l'auto-popolamento del tracker (iniziativa/HP nel round) è
  rifinitura successiva (il tracker oggi è comunque poco usato).

✅ **Auto-popolamento Combat Tracker FATTO (2026-07-20, Opus)** — ultimo pezzo previsto dal
design ("il consumo dei vitali dal tracker è fasato a dopo"). I PG entrano in combattimento
coi **PF correnti, condizioni e TS morte** riportati dai giocatori invece che coi valori del
roster.
- **SNAPSHOT, non live** (scelta di Stefano): si applica in `confirmSetupAndRun` e sul bottone
  **↻** della riga di ogni PG. Durante lo scontro il tracker resta la copia di lavoro del
  master — coerente con "in sessione fa fede lo schermo del Master": i danni che registra lui
  non vengono sovrascritti dal client del giocatore. **Conseguenza: nessuna subscription
  Realtime nel tracker**, solo una fetch on-demand (niente da tenere vivo, niente da smontare).
- `sharedChar.applyVitaliToCombatant(combatant, sharedChar)` — puro e immutabile: versa
  `currentHp`/`conditions`/`deathSaves`, **non tocca** `maxHp`/`ac`/`note`/`effects` (del
  master) né **`dead`** (dichiarare un PG KO è decisione del master). PF a 0 sono un valore
  valido, non un campo assente (test di regressione apposta).
- `sharedSync.vitaliByCharId(uid)` — mappa `char_id → char` su tutte le campagne del master.
  Il linking è **gratis**: `char_id` = id della copia di roster (push-down del seed).
- `confirmSetupAndRun` è **best-effort**: se il layer condiviso non risponde (offline, nessuna
  campagna) il combattimento parte coi valori del roster invece di bloccarsi.
- Le condizioni **riusano i badge già presenti** in `CombatantRow` → zero UI nuova.
- ⚠️ **Limite:** i **TS morte sono in sola lettura** e compaiono solo a 0 PF. Il combattente
  del tracker non ha un editor di TS morte (esiste solo nella scheda PG) e aggiungerlo era
  fuori proporzione: li tira il giocatore, il master li guarda. Se servisse renderli
  editabili, è UI nuova in `CombatantRow`.
- 172 → **186 test verdi**. **Non verificato in-app**: il flusso completo richiede login +
  una campagna con un giocatore assegnato; verificate a runtime la console pulita (nessun
  ciclo di import) e `applyVitaliToCombatant` eseguita nel browser via dynamic import.

✅ **Visibilità per-voce del prestigio FATTA (2026-07-20, #27)** — chiude il punto qui sotto.
Il giocatore traccia la propria reputazione, il master decide cosa vede. Due metadati
opzionali sulla voce di `prestige`: **`hidden`** (non lascia mai il device del master) e
**`alias`** (il giocatore la vede sotto un altro nome). Caso reale: Teofilo crede di avere 2
con la «Famiglia», il master sa che è il «Clero».
- `sharedChar.js`: `publicPrestige` (forma pubblica; non fa trapelare nemmeno i metadati —
  sapere che una voce HA un alias è mezzo segreto svelato), `diffPrestige` (variazioni
  etichettate col nome VERO), `mergePlayerPrestige` (riconcilia **per ID, solo i valori**).
- ⚠️ **`mergePlayerPrestige` è ciò che impedisce a un accept di distruggere le voci segrete**:
  il giocatore rimanda meno voci di quante ne abbia il master (le nascoste mancano), quindi
  sostituire la lista le cancellerebbe. C'è un test chiamato `REGRESSIONE` apposta.
- La sanificazione sta nel **trasporto** (`sharedSync.seedSharedChar` → `sanificaPerGiocatore`),
  non nella UI: nessun chiamante futuro può dimenticarsene. Toglie anche i `MASTER_ONLY_FIELDS`.
- `prestige` esce da `MASTER_ONLY_FIELDS`; **`reputation` resta** (dichiarato in `defaultChar`
  ma non usato da nessuna UI: il tab 🏛 mostra solo `prestige`).
- Badge 📬: `hasPendingAdmin` considera anche `diffPrestige` e `adminHash` include id+valore
  delle voci — senza, una modifica al solo prestigio non accendeva il badge e dopo un «Ignora»
  non sarebbe più ricomparso.
- UI: nel tab 🏛 (solo vista master, dietro la nuova prop **`secretsEditable`** di
  `CharacterSheet`) ogni voce ha un occhio 👁/🙈 e un campo «il giocatore la vede come…».
  Nel pannello diff le variazioni compaiono come `prestige:<id>` accanto ai campi
  amministrativi; l'accept le smista su `mergePlayerPrestige`.
- **Deployato e verificato live** (bundle: `il giocatore la vede come`, `prestige-alias-input`).

✅ **Campagna-scoping del roster FATTO (2026-07-20, #27)** — il roster del master non è più
globale. Le campagne del roster sono **locali e indipendenti** da quelle condivise del tab
Tavolo (scelta di Stefano: funzionano senza giocatori collegati e offline).
- `src/roster.js` (**puro**, 21 test): `filterByCampaign`, `countByCampaign`, `add`/`rename`/
  `removeCampaign`, `filterAfterRemoval`, `activeAfterFilter`. ⚠️ Da non confondere con
  `campaign.js`, che è il parser della wiki Obsidian: ambiti diversi. Chiavi nuove
  `K.rosterCampaigns` / `K.rosterFilter` (`K.campaign` è la wiki).
- **Filtro rigoroso**: i PG non assegnati si vedono solo con «Tutte». Due conseguenze gestite:
  un PG nuovo **eredita la campagna del filtro attivo** (altrimenti sparirebbe appena creato)
  e al cambio filtro il PG aperto passa al primo visibile.
- **Eliminare una campagna non cancella i PG**: tornano fra i non assegnati (anche quelli con
  `campaignId` orfano, vedi `countByCampaign`), e il filtro torna a «Tutte».
- Il filtro agisce su **barra PG, setup del Combat Tracker e cruscotto Sessione**: un riposo
  lungo non cura più i PG di un'altra storia.
- 232 test verdi.

### ⚠️ Da decidere PRIMA di assegnare un PG a un giocatore vero — ✅ RISOLTO (vedi sopra)

**Visibilità per-voce di `prestige`/`reputation`.** Stato verificato oggi: `seedSharedChar`
riceve il char **intero** (`seedSharedChar(sel.id, assignMember, c.id, c)` in
`SharedTablePage.jsx`), quindi `prestige`/`reputation` finiscono nella riga condivisa; la RLS
`dsc_select_own` permette al giocatore di leggere **tutta** la propria riga, e `CharacterSheet`
(riusata dalla vista giocatore) ha un tab **🏛 Reputazione** che li mostra **editabili**.
`MASTER_ONLY_FIELDS` esiste ma è usato **solo** da `diffAdmin`/test: **nessuno filtra il seed**.
Il roster del master resta protetto (il diff esclude quei campi → le modifiche del giocatore
non rientrano), il problema è **in lettura**.

**Non è però un bug da tappare filtrando i campi** (decisione di Stefano, 2026-07-20): ha senso
che i giocatori vedano la propria reputazione. Il requisito reale è **selettivo per-VOCE**:
alcune fazioni sono note al PG, altre no — es. *Clero* e *Famiglia* sono la stessa entità ma i
personaggi non lo sanno, quindi devono vedere il prestigio con la Famiglia e non quello col
Clero. Serve quindi un **flag di visibilità sulla singola voce** di `prestige`/`reputation`
(deciso dal master), applicato **al seed** in `sharedSync.js` — non nella UI, così vale per
qualunque chiamante futuro — più il test "la riga condivisa non contiene mai le voci nascoste".
Da valutare insieme: cosa mostrare al giocatore nel tab 🏛 (le sole voci visibili) e se le sue
modifiche lì debbano tornare al master o essere in sola lettura.
⚠️ **Finché non è deciso, assegnare un PG espone al giocatore TUTTE le voci di prestigio**
(`defaultChar` popola `prestige` di suo → riguarda ogni PG, non è un caso raro).
Oggi `dnd_shared_chars` è **vuota** (verificato): nessun dato reale ancora esposto.

*TO-DO futuri (fuori v1):* flussi master→giocatore v2 (feedback "accettato", correzioni);
**iniziativa nei vitali** — oggi `initiative` è in `EXCLUDED_FIELDS` per scelta di design
("combattimento = schermo del master"), portarla ai vitali significa cambiare quel principio;
campagna-scopare il roster locale del master + filtro campagna nella UI; eventuale tabella
inviti se il join-code non bastasse; TS morte editabili nel tracker.
**Ridimensionato (verificato 2026-07-20):** il "multi-utente vero" NON è un prerequisito per
far entrare giocatori reali — `profileFromSession` (App.jsx) fa `return canon || raw`, quindi
un account diverso da Olengard/Manu ottiene **il proprio** prefisso, non collassa sui canonici.
Unico caso di collisione: due utenti con lo stesso local-part di email **sullo stesso device**.
