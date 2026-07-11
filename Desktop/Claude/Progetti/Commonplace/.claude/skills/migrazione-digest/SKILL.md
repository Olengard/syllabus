---
name: migrazione-digest
description: Eseguire la migrazione di Digest da Render a Vercel+Supabase. Usa quando Stefano chiede di lavorare alla migrazione di Digest, o quando una sessione ha spazio per avanzarla (priorità 2 dopo manutenzione/bugfix). Attivazione esatta - il lavoro riguarda spostare Digest via da Render, le sue nuove API serverless, o le tabelle dg_feeds/dg_preferences.
---

# Migrazione Digest → Vercel + Supabase

## Fonte di verità

**`Digest/piano-migrazione-vercel.md`** (preparato 2026-06-12): architettura target, SQL,
migrazione dati, rischi, ordine dei lavori. **Leggilo per intero prima di scrivere una riga.**
Questa skill non lo sostituisce: aggiunge le regole d'ingaggio e i punti di non ritorno.

Stato attuale: Flask (`server.py`) su Render free tier (`digest-blqp.onrender.com`),
cold start 15 min mitigato da ping cron-job.org. Target: statico su Vercel + funzioni
serverless `api/` + dati su Supabase `pchld…` con login unificato della suite.

## Quando NON usare questa skill

- Per bugfix di Digest com'è oggi (Flask su Render): quelli si fanno su `server.py`
  e si deployano con git push del repo annidato `Digest/` (autorizzazione richiesta).
- Se c'è manutenzione/bugfix urgente in coda: la migrazione è priorità 2, cede il passo.
- Non iniziare il cutover DNS di tua iniziativa: è il punto di non ritorno, decisione di Stefano.

## Procedura (macro-fasi, dal piano)

1. **Leggi il piano** + `server.py` (gli endpoint attuali sono la specifica di parità).
2. **SQL su pchld**: `dg_feeds` (con colonna `category`) e `dg_preferences`, entrambe con
   RLS own-data. Verifica lo schema post-creazione (skill `supabase-commonplace`).
3. **API serverless** in `Digest/api/` (o nuovo progetto `digest-app`): `feeds.js`,
   `articles.js` (ID **md5 stabili** — mai `hash()` randomizzato, è la lezione storica),
   `digest.js` (prompt v2, usage+costi, maxDuration 120), `memoria.js` (port identico,
   deterministico sulla data), `claude.js` (proxy autenticato, pattern Footnote).
4. **Sicurezza**: JWT Supabase verificato server-side su ogni endpoint; `ANTHROPIC_API_KEY`
   e `SUPABASE_SERVICE_KEY` solo nelle env Vercel (skill `sicurezza-api-key`).
5. **Migrazione dati una tantum** via REST: feeds+preferences da Render → Supabase
   (mappando `digest_feed_cats` → colonna `category`). Lo stato "letto" resta in
   localStorage (stessi ID md5): non toccarlo.
6. **Test di parità PRIMA del cutover**: i ~40 feed reali (rischio 403 da IP datacenter:
   `BROWSER_HEADERS` + fallback), digest per categoria, memoria, riassunti articolo.
7. **Cutover** (solo con l'ok di Stefano): DNS `digest.commonplaceapp.org` → nuovo progetto.
   **Render si sospende, non si cancella** — resta come rollback per 2 settimane.
8. Aggiorna Home (link), Commonplace.md (voce di sessione + sezione Digest), e il
   ping cron-job.org (non serve più su Render; valuta se serve altrove).

## Comandi

```bash
# specifica di parità: gli endpoint attuali
grep -n "@app.route" Digest/server.py

# test parità post-deploy (esempi)
curl -s https://<nuovo>.vercel.app/api/articles -H "Authorization: Bearer <jwt>" | head -c 400
curl -sI https://digest-blqp.onrender.com/api/auth/status   # il vecchio è ancora vivo (rollback)
```

## Barra di qualità

- Parità funzionale dimostrata endpoint per endpoint prima del cutover.
- ID articolo/feed stabili (md5) — un utente non perde lo stato "letto".
- Zero segreti client-side; ogni endpoint autenticato.
- Rollback possibile in ogni momento fino a +2 settimane dal cutover.

## Checklist di verifica

- [ ] Piano letto integralmente? server.py compreso?
- [ ] Tabelle create con RLS e schema verificato?
- [ ] Tutti gli endpoint portati e testati con i feed reali?
- [ ] Dati migrati e contati (n. feed prima = dopo)?
- [ ] Cutover autorizzato esplicitamente? Render sospeso ma NON cancellato?
- [ ] Home + diario aggiornati?

## Errori comuni

- Rigenerare gli ID con logiche nuove → orfanizza stato letto e digest salvati
  (già successo con `hash()` Python randomizzato: fu la root cause delle
  "classificazioni perse").
- Cutover DNS prima del test sui feed reali: il rischio 403 da IP Vercel è concreto
  e si vede solo coi feed veri.
- Cancellare Render subito "per pulizia" → niente rollback.
- Dimenticare `INSECURE_SSL`/proxy aziendale: dal PC di Stefano alcuni fetch passano
  da un proxy corporate; i test dal suo browser possono differire dai tuoi.
- Ricreare l'auth a password custom: l'auth target è quella Supabase della suite.

## Cosa segnalare a Stefano

- Prima di iniziare: conferma che la sessione va dedicata a questo (priorità 2).
- Feed che falliscono dal nuovo backend (lista esatta, con status code).
- Costi stimati per digest se cambiano rispetto a oggi (~$0.03-0.08 con Sonnet).
- Il momento del cutover DNS: proposta + attesa del suo ok esplicito.
