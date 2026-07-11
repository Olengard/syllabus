---
name: app-single-file
description: Modificare le app monolitiche della suite - Footnote, ListenS, Marginalia, Dashboard, Home. Usa quando il lavoro tocca uno dei loro index.html (1500+ righe con React inline), i loro sw.js o le loro Vercel Function in api/. Attivazione esatta - il file da modificare è un index.html sotto una di queste cinque cartelle.
---

# App single-file (Footnote, ListenS, Marginalia, Dashboard, Home)

## Anatomia

Tutta l'app vive in **un solo `index.html`**: CSS, componenti React e logica inline,
trasformati nel browser da **`@babel/standalone` pinnato alla major 7** (CDN). Niente
bundler, niente `node_modules`. Accanto: `sw.js` (service worker con cache versionata,
es. `footnote-v27`), `manifest.json`, eventuale `api/` con Vercel Function
(`claude.js` proxy AI in Footnote, `feed.js` proxy RSS in ListenS).
Marginalia segue il "pattern Footnote". Home e Dashboard sono le più semplici.

## Quando NON usare questa skill

- BookShelf, NoteS, Ledger, DnDMaster, Syllabus: sono app Vite con src/ — mondo diverso.
- `BookShelf/public/listens.html`: NON è il sorgente di ListenS — è una COPIA.
  Il sorgente vero è `ListenS/index.html`; `Suite/sync_listens.bat` copia
  **ListenS → BookShelf/public** (la direzione fu invertita nel 2026-06 dopo che per mesi
  rischiava di cancellare il lavoro copiando al contrario). Non modificare mai la copia.

## Procedura

1. Orientati con Grep (nomi funzione/componente), non leggendo il file intero.
2. Modifica con gli strumenti standard (Edit). ⚠️ Se lavori via Desktop Commander:
   storicamente `edit_block` **corrompe i caratteri accentati UTF-8** in alcuni file
   (caso documentato: `Syllabus generate.js`). Se il testo da inserire contiene accenti
   e usi DC, passa da PowerShell o verifica i byte dopo.
3. Attento alla sintassi: JSX dentro `<script type="text/babel">` — un errore di parsing
   Babel = **schermata bianca totale** senza stack utile. Modifiche piccole e verificate.
4. Ogni modifica destinata al deploy richiede il **bump della versione cache in `sw.js`**
   (vedi `deploy-suite`).
5. Se tocchi ListenS: dopo la modifica esegui `Suite/sync_listens.bat` (o copia manuale
   ListenS → BookShelf/public) per riallineare la copia della Suite locale.
6. Verifica nel browser (browser pane): apri l'app, controlla console (zero errori) e
   il flusso toccato.

## Comandi

```bash
# orientarsi in un monolite
grep -n "function NomeComponente\|const NomeComponente" Footnote/index.html

# versione SW attuale
grep -oE "(footnote|listens|marginalia)-v[0-9]+" */sw.js

# sanity check dopo modifiche: parità di tag script e graffe sospette
grep -c "<script" Footnote/index.html && grep -c "</script>" Footnote/index.html
```

## Barra di qualità

- App aperta nel browser dopo la modifica: nessuna schermata bianca, console pulita,
  flusso toccato esercitato. SW bumpato se si deploya. Copia ListenS riallineata.

## Checklist di verifica

- [ ] Ho modificato il SORGENTE (non la copia in BookShelf/public)?
- [ ] L'app si apre e la console è pulita?
- [ ] Accenti/UTF-8 integri nel punto modificato?
- [ ] SW bumpato (se si va in deploy)?
- [ ] sync_listens.bat eseguito (se ListenS)?

## Errori comuni

- Aggiornare la versione di `@babel/standalone` o togliere il pin `@7` → pagina bianca
  (bug storico risolto pinnando: non "modernizzare" il CDN).
- Aggiungere `import`/`require` di pacchetti npm: non c'è bundler. Le librerie entrano
  via CDN esm.sh (es. `jsonrepair`) o non entrano.
- Dimenticare che il SW serve la cache: "la modifica non si vede" in locale/prod →
  versione cache non bumpata o SW registrato vecchio. Mai reintrodurre l'hack
  "unregister+reload" (causava doppi reload): il pattern giusto è network-first
  su index.html (già presente in Footnote/Syllabus).
- Ridurre `max_tokens` o accorpare le chiamate AI di Footnote "per semplificare":
  la struttura a chiamate piccole parallele + `repairCard` è la cura di anni di
  JSON troncati. Non regredirla.

## Cosa segnalare a Stefano

- Qualsiasi corruzione UTF-8 trovata (anche pre-esistente).
- Divergenze tra `ListenS/index.html` e la copia in `BookShelf/public/`.
- Modifiche alle Vercel Function in `api/` (toccano il perimetro di sicurezza:
  vedi `sicurezza-api-key`).
