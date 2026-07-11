---
name: sviluppo-e-verifica
description: Avviare l'ambiente di sviluppo e dimostrare che una modifica funziona davvero. Usa quando inizi a lavorare su un'app della suite, quando devi lanciare test, e SEMPRE quando "la modifica non si vede". Attivazione esatta - stai per avviare un dev server, hai appena modificato codice e devi verificarlo, o build/test sono verdi ma il comportamento osservato è vecchio.
---

# Sviluppo e verifica nella suite

## Porte fisse (non cambiarle)

| App | Porta | Avvio |
|---|---|---|
| BookShelf (serve anche la Suite) | 5173 | `npx vite` / `npm run dev` |
| NoteS | 5174 | `npm run dev` |
| DnDMaster | 5175 | `npm run dev` |
| Ledger | 5177 | `npm run dev` |
| Syllabus | 3000 | `npx vercel dev --listen 3000` (serve frontend + proxy `api/`) |

Le app single-file (Footnote, ListenS, Marginalia, Dashboard, Home) non hanno dev server
proprio: si aprono come file o si servono staticamente.

## Quando NON usare questa skill

- Non avviare un dev server per modifiche che il browser non può esercitare (script batch,
  SQL, documentazione).
- Syllabus con `npm run dev` liscio: il proxy `api/claude.js` non gira → l'AI fallisce
  sempre. Usa `vercel dev`.

## La regola del server unico

**MAI due dev server Vite sulla stessa cartella.** Se la porta risponde già (Stefano usa i
`.bat` di avvio), usa quel server: due watcher confliggono e il perdente serve **moduli
stantii con status 200** — il bug più subdolo del workspace. Se un server è in stato zombie
(watcher morto), chiedi a Stefano di chiuderlo o killalo tu, poi avviane UNO.

## Procedura

1. Prima di avviare: la porta risponde già? (comando sotto) Se sì, NON avviare un secondo server.
2. Fai la modifica.
3. **Verifica che il server serva il codice nuovo** — non fidarti del reload:
   `curl localhost:PORTA/src/File.jsx | grep "<pezzo di codice nuovo>"`.
4. Lancia i test dove esistono:
   - **DnDMaster:** `npm test` — obbligatorio dopo modifiche a `DiceTray`, `GlobalSearch`,
     `storage`, `sync`. Se estrai altre funzioni pure, aggiungi test.
   - **Ledger:** `npm run test` + `npm run lint` (ha errori PRE-esistenti noti:
     contano solo i NUOVI) + `sql/trigger_tests.sql` se tocchi i trigger.
5. Prova il flusso reale nel browser (browser pane): l'osservazione del comportamento
   è la prova, non il build verde.
6. App Vite prima del deploy: `npm run build` deve passare.

## Comandi

```bash
# la porta è già occupata da un server vivo?
curl -s -o /dev/null -w "%{http_code}" http://localhost:5175/

# il server serve davvero il codice nuovo? (LA verifica anti-zombie)
curl -s http://localhost:5175/src/App.jsx | grep -c "codiceAppenaScritto"

# test
cd DnDMaster && npm test
cd Ledger && npm run test && npm run lint
```

## Barra di qualità

- La modifica è stata OSSERVATA funzionare (browser o curl del comportamento), non solo
  compilare. Test verdi dove esistono. Nessun secondo server avviato.

## Checklist di verifica

- [ ] Un solo dev server per cartella?
- [ ] curl conferma che il server serve il codice nuovo?
- [ ] Test lanciati (DnDMaster/Ledger) e verdi?
- [ ] Flusso esercitato nel browser?
- [ ] `npm run build` verde se si va verso il deploy?

## Errori comuni

- Avviare `npm run dev` senza controllare la porta → doppio watcher → codice stantio con 200.
- "Build e test verdi quindi funziona" → il server zombie serviva comunque il vecchio codice.
- Farsi bloccare dagli errori lint pre-esistenti di Ledger: sono noti, guarda solo i tuoi.
- In DnDMaster, fare `JSON.parse` di localStorage a ogni render (già bloccò la ricerca
  con ~525 incantesimi): memoizza.
- Cambiare porta a un'app per "risolvere" un conflitto: le porte sono contratti
  (Supabase redirect URLs, .bat di Stefano).

## Cosa segnalare a Stefano

- Un server zombie trovato attivo (chiedi prima di killare processi suoi).
- Test rossi che non dipendono dalla tua modifica.
- Nuovi errori lint introdotti e corretti (o perché restano).
