---
name: sicurezza-api-key
description: Proteggere le API key - priorità assoluta del progetto. Usa OGNI VOLTA che il lavoro tocca chiavi, variabili d'ambiente, chiamate ad Anthropic/OpenAI, nuovi endpoint api/, form di login, o file .env. Attivazione esatta - stai scrivendo o modificando codice che usa una chiave, o stai per committare/deployare codice che potrebbe contenerne una.
---

# Sicurezza delle API key

## Il contesto (perché è la regola suprema)

La chiave Anthropic di questo progetto **è già stata rubata due volte**, entrambe le volte
perché stava nel client (costante nel bundle, `VITE_ANTHROPIC_API_KEY` nel build). La bonifica
è costata sessioni intere. **L'impossibilità di leakare una API key è la priorità assoluta
del progetto** — dichiarata da Stefano, non derogabile per nessuna feature o scorciatoia.

## Quando NON usare questa skill

Mai "non usarla": se il dubbio è se si applichi, si applica. L'unica eccezione concettuale:
le **anon key di Supabase** (`VITE_SUPABASE_ANON_KEY`) sono pubbliche per design — le
protegge la RLS, non il segreto. Non confonderle con le chiavi vere.

## Le regole

1. **`ANTHROPIC_API_KEY` (e `OPENAI_API_KEY`, e le `service_role` Supabase) vivono SOLO
   nelle env server-side**: Vercel → Settings → Environment Variables, o Render → Environment.
2. **Mai il prefisso `VITE_` su un segreto**: qualunque `VITE_*` finisce nel bundle pubblico.
3. Il client chiama **sempre un proxy serverless** (`api/claude.js`, pattern
   Footnote/Syllabus/NoteS; `/api/claude` Flask in Digest) — mai Anthropic direttamente.
4. Ogni proxy deve avere: **autenticazione** (lezione Digest: `/api/claude` era aperto e
   chiunque poteva bruciare crediti) e un **tetto `max_tokens`**.
5. Niente chiavi in: localStorage, URL/query string, log, messaggi d'errore mostrati
   all'utente, commit, file d'esempio (`.env.example` va con i campi VUOTI).
6. `.env` è nel `.gitignore` di ogni app: verificalo prima di committare in una cartella nuova.

## Procedura (quando tocchi codice con chiavi)

1. Chiediti: questa stringa/variabile può arrivare al browser? Se sì, riprogetta.
2. Nuova funzionalità AI → riusa il pattern proxy esistente della stessa app.
3. Prima di ogni commit e ogni deploy: esegui il grep dei segreti (sotto).
4. Nuovo progetto Vercel → imposta le env a mano (non si ereditano) e verifica che la
   chiave NON sia richiesta al client come fallback permanente.

## Comandi

```bash
# grep dei segreti su ciò che stai per committare (deve dare zero righe)
git diff --cached | grep -nE "sk-ant-|sk-proj-|service_role|VITE_[A-Z_]*(KEY|SECRET|TOKEN) *= *[^ ]"

# scansione di una cartella app prima del deploy (esclude ciò che non parte)
grep -rnE "sk-ant-|sk-proj-" --include="*.js" --include="*.jsx" --include="*.html" \
  --exclude-dir=node_modules --exclude-dir=dist .

# verifica che .env sia ignorato
git check-ignore .env && echo OK
```

## Barra di qualità

- Zero segreti nel client, nel repo e nei log. Proxy autenticato con tetto token.
- Se hai anche solo il sospetto di un leak, il lavoro si ferma finché non è chiarito.

## Checklist di verifica

- [ ] grep segreti pulito su diff e cartella?
- [ ] La chiave sta solo nelle env del provider (Vercel/Render)?
- [ ] Il client passa dal proxy? Il proxy è autenticato e ha max_tokens?
- [ ] `.env` ignorato da git? `.env.example` vuoto?

## Errori comuni

- "La metto nel client solo per il test locale" → è così che è stata rubata. No.
- Copiare il pattern di un file vecchio che aveva la chiave client-side (ce ne sono
  nei log storici): i pattern validi sono quelli POST giugno 2026.
- Committare un `.env` in una cartella nuova senza `.gitignore`.
- Stampare la chiave in un log di debug del proxy ("per vedere se è definita"):
  usa `Boolean(process.env.ANTHROPIC_API_KEY)`.

## Cosa segnalare a Stefano

- QUALSIASI chiave trovata in codice client, repo o log → subito, con il path esatto,
  proponendo revoca su console.anthropic.com + sostituzione nelle env + redeploy.
- Endpoint proxy trovati senza auth o senza tetto token.
- Un `.env` non ignorato da git.
