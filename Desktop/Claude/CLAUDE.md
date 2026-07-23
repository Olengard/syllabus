# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Cos'è questa cartella

Workspace personale multi-progetto di Stefano (interazione e commit in **italiano**). Ogni sottocartella di `Progetti/` è un progetto indipendente; questo file è la mappa, i dettagli operativi stanno nei CLAUDE.md di progetto.

## ⚠️ Git — leggere prima di qualunque commit

- **La radice del repo è `C:\Users\Test` (l'intero profilo utente Windows), non questa cartella.** Conseguenze:
  - **Mai** `git add -A`, `git add .` o commit "di tutto": aggiungi sempre **path espliciti** dei file toccati.
  - `git status` produce rumore: warning "could not open directory" (cartelle di sistema Windows, innocui) e molti file personali untracked — ignorali.
  - Nei diff/log i path iniziano con `Desktop/Claude/...`.
- Remote: `github.com/Olengard/syllabus.git` (nome storico, contiene tutto il workspace). **Push solo su richiesta esplicita.**
- Flusso: branch di lavoro → commit → `git merge --ff-only` su `main` → branch cancellato.
- Messaggi in italiano, prefisso per progetto: `feat(dnd)`, `fix(zeitgeist)`, `docs(ledger)`, …
- **Sessioni Claude parallele committano sullo stesso repo e sullo stesso branch attivo** (es. una sessione DnD e una Zeitgeist insieme): prima di merge/rebase controlla `git log` — trovare commit altrui intercalati è normale. `git rebase --autostash main` risolve; i duplicati identici vengono saltati da git. Il working tree ha modifiche permanentemente sporche in altri sottoprogetti: non stasharle né committarle.

## Mappa dei progetti

**Con CLAUDE.md dedicato (leggilo prima di lavorarci):**
- `Progetti/Commonplace/DnDMaster/` — gestionale DM per D&D 5e (React+Vite PWA, localStorage, test Vitest).
- `Progetti/Commonplace/Ledger/` — finanza familiare (React+Vite PWA, Supabase, Vercel).
- `Progetti/Commonplace/Cru/` — cantina vini (single-file PWA, multi-utente). ⚠️ Casi unici: Supabase su un **secondo account** (progetto `fqdcc…`, il MCP non lo gestisce), **repo git proprio** `github.com/Olengard/cru`, e un tranello di deploy sull'email git.
- `Progetti/Zeitgeist Wiki/` — vault Obsidian (Markdown, non codice) per la campagna Zeitgeist; script Python di supporto.

**Ecosistema Commonplace** (`Progetti/Commonplace/`): suite di app personali (letture, ascolti, note, video, finanze, GdR) con design system comune. Il documento di riferimento è **`Progetti/Commonplace/Commonplace.md`**: architettura, Supabase, deploy, stato per app (header = ultimo stato; diario in coda). Le priorità correnti stanno in **`Progetti/Commonplace/piano-di-lavoro.md`**. App: BookShelf (hub, porta 5173), Footnote, ListenS, NoteS/ReadS (anche Expo), Digest (Vercel+Supabase, sorgenti in `DigestV/`), Platea (Expo, su Supabase pchld dal 2026-07), Dashboard, Marginalia, Home, Syllabus, Cru (cantina vini, multi-utente). Backend: quasi tutto sul progetto Supabase `pchld…`; Ledger su `bogav…`; **Cru su un progetto dedicato `fqdcc…` di un secondo account** (vedi `Cru/CLAUDE.md`). Collaudo live della suite: `node Progetti/Commonplace/Suite/collauda.cjs`.

**Per ogni lavoro complesso su Commonplace, leggi prima `Progetti/Commonplace/MANUALE-OPERATIVO.md`** (metodo: ambito, prove, proporzione, verifica, incertezze, chiusura — con autotest finale in 7 domande) e usa le skill operative in `Progetti/Commonplace/.claude/skills/` (git/matrioska, deploy, sicurezza API key, Supabase, diario, verifica, single-file, triage, migrazione Digest).

**Altri progetti** (`Progetti/Chess`, `China`, `DnD`, `Minorca`, `Personal Wiki`, `Story_Wiki`): materiale personale o dormiente, nessuna convenzione particolare.

## File sciolti

I file sparsi in questa cartella e in `Progetti/Commonplace/` (`tmp_*`, `patch_*`, `read_*`, `fix_*`, `deploy_*`, `diagnose*`) sono **script una tantum storici** di sessioni passate: non fanno parte di nessuna app, non usarli come riferimento e non preoccuparti di mantenerli.

## Comandi

Non esistono build/test globali: ogni app ha i suoi (`npm run dev/build`, ecc.) documentati nel proprio CLAUDE.md o `package.json`. Gli script temporanei vanno nella scratchpad di sessione, non in queste cartelle.
