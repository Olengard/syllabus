---
name: diario-di-sessione
description: Chiudere una sessione di lavoro lasciando memoria utilizzabile. Usa alla fine di OGNI sessione su Commonplace, o dopo aver completato un blocco di lavoro significativo (fix deployato, migration eseguita, root cause trovata). Attivazione esatta - il lavoro è concluso o Stefano saluta/chiede di chiudere.
---

# Diario di sessione — Commonplace.md

## Perché esiste

`Progetti/Commonplace/Commonplace.md` è la memoria del progetto: 1000+ righe di voci datate
per sessione. È il contratto di continuità tra un operatore e il successivo. Una sessione
senza voce nel diario è lavoro che la prossima sessione non saprà di avere.

## Quando NON usare questa skill

- Non riscrivere o "riordinare" le voci storiche: sono un log, il valore è nell'accumulo.
- Non usarla per documentazione di architettura di una singola app: quella va nel
  CLAUDE.md dell'app (DnDMaster e Ledger ne hanno uno; aggiornalo se cambi le convenzioni).

## Procedura

1. A fine lavoro, aggiungi una voce in Commonplace.md con questo formato consolidato:

   ```markdown
   ## AAAA-MM-GG — Sessione #N
   - ✅ **App: titolo del fix/feature** — cosa, e SOPRATTUTTO la root cause se c'era un bug
     (le root cause scritte qui hanno risolto bug ricorrenti: stale closure, SW cache,
     max_tokens, hash() randomizzato...)
   - ⚠️ **Azioni richieste:** ciò che spetta a Stefano (env var, SQL, DNS, restore)
   ```

   Il numero di sessione prosegue l'ultimo presente nel file.
2. Aggiorna la **riga "Ultimo aggiornamento"** in cima al file (data + sintesi di una riga).
3. Aggiorna lo **Stato attuale** della sezione dell'app toccata (es. "✅ Funzionante —
   ridistribuito AAAA-MM-GG").
4. Se hai cambiato convenzioni/architettura di DnDMaster o Ledger → aggiorna il loro CLAUDE.md.
5. Committa il diario insieme al lavoro (skill `commit-suite`), prefisso `docs(commonplace)`
   se il commit è solo documentale.

## Comandi

```bash
# ultima sessione numerata presente
grep -oE "Sessione #[0-9]+" "Progetti/Commonplace/Commonplace.md" | sort -t'#' -k2 -n | tail -1

# le voci più recenti
grep -n "^## 20" "Progetti/Commonplace/Commonplace.md" | head -10
```

## Barra di qualità

- Un operatore che legge SOLO la tua voce deve poter riprendere il lavoro: root cause,
  file toccati, cosa resta da fare, cosa spetta a Stefano.
- Le azioni richieste sono distinte dal lavoro fatto (⚠️ vs ✅).
- Stato dell'app aggiornato dove l'hai cambiato.

## Checklist di verifica

- [ ] Voce datata aggiunta con numero sessione corretto?
- [ ] Root cause scritte per ogni bug risolto?
- [ ] "Ultimo aggiornamento" in cima al file aggiornato?
- [ ] "Stato attuale" delle app toccate aggiornato?
- [ ] ⚠️ Azioni richieste elencate (o "nessuna")?
- [ ] Diario committato?

## Errori comuni

- Scrivere solo COSA si è fatto senza il PERCHÉ (la root cause è la parte che vale).
- Lasciare "⚠️ da fare" già fatti: se hai verificato che un'azione pendente è stata
  eseguita (es. una migration), aggiorna la voce vecchia con un ✅ e la data di verifica.
- Fidarsi del diario come fotografia dello stato: è un log storico. Chi legge deve
  verificare empiricamente; chi scrive deve datare tutto per rendere possibile la verifica.
- Dimenticare il file: il lavoro "si vede" in git, ma il contesto vive solo qui.

## Cosa segnalare a Stefano

- Le azioni richieste (env var, SQL, DNS, restore, deploy da autorizzare) — a voce a fine
  sessione, oltre che nel file.
- Discrepanze trovate tra diario e realtà (documentate con la prova).
