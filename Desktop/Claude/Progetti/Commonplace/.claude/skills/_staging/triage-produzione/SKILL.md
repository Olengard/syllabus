---
name: triage-produzione
description: Diagnosticare un'app della suite rotta in produzione. Usa quando Stefano riporta che un'app live non funziona - pagina bianca, 403, dati spariti, errori, "non si vede la modifica". Attivazione esatta - il problema riguarda un sito *.commonplaceapp.org (o Render/Netlify) e non il codice locale.
---

# Triage produzione

## Principio

Diagnosi PRIMA della cura: ognuno dei guasti storici della suite ha una firma osservabile
da terminale. Non redeployare "per vedere se si sistema" — il redeploy cieco maschera la
root cause e può peggiorare (SW, env var).

## Quando NON usare questa skill

- Il problema si riproduce anche in locale → è un bug di codice: `sviluppo-e-verifica`.
- Serve un'azione da dashboard che spetta a Stefano (restore Supabase, env var, DNS):
  tu diagnostichi e prepari, lui clicca.

## Procedura — controlli in quest'ordine

1. **L'app risponde?** `curl -sI https://app.commonplaceapp.org/` — codice HTTP:
   - **403 con header Vercel** → Deployment Protection riattivata da sola (gotcha storico):
     vercel.com → Team Settings → Security → Deployment Protection → Disabled. (Azione di Stefano.)
   - **404/DNS** → dominio/alias Vercel scollegato dal progetto giusto (successo a Syllabus:
     dominio che puntava a un deployment vecchio).
2. **Versione live vs locale** (pagina bianca o "modifica che non si vede"):
   `curl -s https://app.../sw.js | head -3` e confronta con il `sw.js` locale.
   Live più vecchio → manca un deploy o un bump SW. Uguali ma comportamento vecchio →
   cache SW sul client: bump versione + redeploy.
3. **Supabase in pausa** (dati spariti, login che non va, app "svuotata"):
   `nslookup <project>.supabase.co` — se il DNS non risolve, il progetto dorme
   (free tier, 7 giorni). Restore dal dashboard + keep-alive cron-job.org. È stata la
   causa madre dell'"impermanenza" di Platea/Dashboard.
4. **Render cold start** (Digest lento o "non raggiungibile"): free tier, sleep dopo
   15 min. Il frontend riprova da solo (3 tentativi, 20s). Non è un guasto: aspetta ~30s
   e riprova prima di toccare qualsiasi cosa.
5. **Errori console/rete nel browser** (browser pane sull'URL live): errori Babel →
   sintassi/pin CDN (vedi `app-single-file`); 401/500 dal proxy AI → env var
   `ANTHROPIC_API_KEY` mancante sul progetto Vercel (nuovi progetti non ereditano le env)
   o chiave revocata.
6. **Dati sbagliati ma app viva** → `supabase-commonplace`: schema reale vs atteso, RLS.

## Comandi

```bash
curl -sI https://footnote.commonplaceapp.org/ | head -5      # HTTP status
curl -s https://footnote.commonplaceapp.org/sw.js | head -3  # versione live
grep -oE "footnote-v[0-9]+" Footnote/sw.js                    # versione locale
nslookup pchldmiavycxzpkzochn.supabase.co                      # Supabase sveglio?
# marker di una modifica nel bundle live (app Vite)
ASSET=$(curl -s https://bookshelf.commonplaceapp.org/ | grep -oE '/assets/index-[^"]+\.js' | head -1); \
curl -s "https://bookshelf.commonplaceapp.org$ASSET" | grep -c "MARKER"
```

## Barra di qualità

- Root cause identificata CON la prova (output di un comando), non per ipotesi.
- Nessun redeploy/riavvio eseguito prima della diagnosi, né senza autorizzazione.
- Fix verificato live dopo l'applicazione (stesso comando che mostrava il guasto).

## Checklist di verifica

- [ ] Ho la firma osservabile del guasto (output curl/nslookup/console)?
- [ ] Ho escluso le cause "ambientali" (403, pausa, cold start) prima di toccare il codice?
- [ ] Il fix è stato riverificato live con lo stesso strumento?
- [ ] Root cause annotata nel diario di sessione?

## Errori comuni

- Redeploy immediato "per sicurezza" → se era Deployment Protection o Supabase in pausa,
  hai solo aggiunto rumore.
- Diagnosticare via documentazione invece che via curl: lo stato dichiarato nei .md è
  spesso indietro rispetto alla produzione (verificato più volte).
- Dimenticare che il SW mente: il client può servire una versione vecchia anche a deploy
  riuscito. La versione in `curl /sw.js` è la verità del server, non del telefono di Stefano
  (lì serve un paio di reload, o reinstallare la PWA nei casi estremi).
- Confondere gli account/progetti Supabase (pchld vs llv vs Ledger).

## Cosa segnalare a Stefano

- Root cause + prova + fix proposto, in quest'ordine, PRIMA di applicare qualsiasi cura
  che tocchi produzione.
- Azioni da dashboard che spettano a lui (restore, env var, Deployment Protection, DNS).
- Se il guasto ha perso dati utente (e quali): esiste il backup giornaliero
  (`Backup/`, progetto Vercel cp-backup, repo GitHub privato, JSON upsertabili via REST).
