---
name: deploy-suite
description: Pubblicare un'app Commonplace in produzione. Usa quando le modifiche sono finite e vanno rese visibili online, o quando Stefano chiede di deployare. Attivazione esatta - stai per eseguire deploya.bat, npx vercel --prod, un push che triggera Render, o un build Netlify.
---

# Deploy della suite Commonplace

## Regola d'ingaggio (non negoziabile)

**Il deploy richiede l'autorizzazione esplicita di Stefano, ogni volta.** E a lavoro ultimato,
anche se non ti viene chiesto nulla, chiudi sempre con:
> "Per vedere le modifiche bisogna deployare: vuoi che lo faccia io?"

## Quando NON usare questa skill

- Modifiche non ancora verificate in locale (prima `sviluppo-e-verifica`).
- Platea/ReadS: il "deploy" è una build EAS, processo diverso e a bassa priorità — non
  improvvisare, chiedi.
- Se l'autorizzazione non è arrivata in QUESTA conversazione: chiedila, non presumerla.

## Mappa dei canali di deploy (verificata 2026-07-11)

| App | Canale | Comando |
|---|---|---|
| BookShelf, Ledger, Syllabus | Vercel (build Vite) | `BookShelf/deploya.bat`; Ledger e Syllabus: `npm run build` + `npx vercel --prod` dalla cartella (Syllabus: da `Syllabus/app/`) |
| NoteS | Vercel (build Vite) | nessuno script: `npm run build` + `npx vercel --prod` dalla cartella |
| Footnote, ListenS, Marginalia | Vercel (file statici) | `deploya.bat` nella cartella |
| Home, Dashboard | Vercel (file statici) | `Home/deploy_home.bat`, `Dashboard/deploy_dashboard.bat` |
| DnDMaster | Netlify (`dnd.commonplaceapp.org`) | `npm run build`, poi `npx netlify deploy --prod --dir dist` dalla cartella — sito già linkato via `.netlify/state.json` (verificato 2026-07-11: bundle dist = bundle live) |
| Digest | Render (autodeploy) | `git push` del repo annidato `Digest/` (il push è già un deploy: serve autorizzazione) |

## Chi ha il service worker (verificato 2026-07-11)

- **Bump manuale obbligatorio** in `sw.js` prima del deploy: **Footnote** (`Footnote/sw.js`),
  **ListenS** (`ListenS/sw.js`), **Marginalia** (`Marginalia/sw.js`),
  **BookShelf** (`BookShelf/public/sw.js`), **Syllabus** (`Syllabus/app/public/sw.js`).
- **Nessun bump manuale**: NoteS, Ledger, DnDMaster usano `vite-plugin-pwa` con
  `registerType: autoUpdate` (i client si aggiornano dopo 1-2 reload). Il file
  `DnDMaster/sw.js` a radice è un residuo NON registrato: ignoralo, non bumparlo.
- **Nessun SW**: Home e Dashboard (pagine statiche semplici).

## Procedura

1. Chiedi autorizzazione (o verifica di averla per QUESTO deploy).
2. Se l'app è nella lista "bump manuale obbligatorio": **bumpa la versione cache in `sw.js`**
   (`footnote-v27` → `v28`) PRIMA del deploy. Senza bump i client installati continuano
   a servire la versione vecchia.
3. App Vite: `npm run build` deve passare. Se fallisce, il deploy è annullato.
4. Esegui il deploy dal canale giusto (tabella sopra).
5. **Verifica live** (vedi comandi): il deploy non è finito finché non l'hai osservato online.
   Collaudo completo della suite in un comando: `node Suite/collauda.cjs` (2026-07-12 —
   HTTP, versioni SW, auth API, gateway Supabase, freschezza backup). Dopo un bump SW
   alza la versione minima in `SW_MIN` dentro lo script.
6. Annota il deploy nella voce di sessione di `Commonplace.md` (skill `diario-di-sessione`).

## Comandi

Tutti i path sono relativi a `C:\Users\Test\Desktop\Claude\Progetti\Commonplace`.

```bash
# bump SW (esempio Footnote) — controlla il numero attuale, incrementa di 1
grep -oE "footnote-v[0-9]+" Footnote/sw.js

# deploy Vercel dalla cartella dell'app
cd Footnote && npx vercel --prod

# VERIFICA LIVE: la versione SW deployata
curl -s https://footnote.commonplaceapp.org/sw.js | head -3

# VERIFICA LIVE: un marker della modifica nel bundle (app Vite)
ASSET=$(curl -s https://bookshelf.commonplaceapp.org/ | grep -oE '/assets/index-[^"]+\.js' | head -1)
curl -s "https://bookshelf.commonplaceapp.org$ASSET" | grep -c "MARKER_DELLA_MODIFICA"
```

## Barra di qualità

- SW bumpato se l'app ne ha uno. Build verde. Verifica live positiva (curl mostra la
  versione/marker nuovi). Stefano informato dell'esito con la prova.

## Checklist di verifica

- [ ] Autorizzazione esplicita ricevuta per questo deploy?
- [ ] SW bumpato (se presente)?
- [ ] `npm run build` verde (app Vite)?
- [ ] curl post-deploy conferma la versione nuova live?
- [ ] Nessuna env var mancante sul progetto Vercel (vedi Errori comuni)?
- [ ] Commonplace.md aggiornato?

## Errori comuni

- Deploy senza bump SW → "ho deployato ma non si vede niente". È l'errore più frequente
  della storia del progetto.
- `npx vercel` con token CLI scaduto → serve `vercel login` (è capitato: expiresAt 2026-04).
  Se fallisce l'auth, segnala a Stefano invece di riprovare.
- Progetto Vercel NUOVO: le env var **non si propagano da sole** — `ANTHROPIC_API_KEY`
  (mai VITE_), `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` vanno impostate a mano
  su vercel.com → Settings → Environment Variables.
- 403 improvviso post-deploy → Vercel Deployment Protection riattivata da sola:
  Team Settings → Security → Deployment Protection → Disabled.
- Dedurre "è deployato" dai documenti: Commonplace.md è spesso indietro. Fa fede solo il curl.

## Cosa segnalare a Stefano

- Esito del deploy CON la prova (output curl).
- Build fallita: output d'errore, nessun tentativo di deploy.
- Env var mancanti o token scaduto (azioni che spettano a lui sul dashboard).
- Qualsiasi 403/Deployment Protection incontrato.
