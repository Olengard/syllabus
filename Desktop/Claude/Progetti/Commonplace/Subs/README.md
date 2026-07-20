# Subs — abbonamenti ricorrenti

App personale a file singolo. Nessuna build, nessuna dipendenza: `index.html` si apre
col browser e funziona. I dati stanno nel `localStorage` del browser.

## Uso

Doppio clic su `index.html`. In alternativa, per collaudarla come la vede il browser
su HTTP: `python -m http.server 5183 --directory .` (configurato anche come
`subs-static` in `Claude/.claude/launch.json`).

⚠️ **Il `localStorage` è legato all'indirizzo di apertura.** Aprire l'app come
`file://...` e come `http://localhost:5183` produce due archivi separati: gli
abbonamenti inseriti da una parte non compaiono dall'altra. Scegli un modo e usa
sempre quello.

## Due computer

Non c'è sincronizzazione automatica. Il giro è manuale e volutamente semplice:

1. Sul computer aggiornato: **Esporta** → salva `subs-AAAA-MM-GG.json`.
2. Porta il file sull'altro computer (chiavetta, mail, cloud).
3. Lì: **Importa** → il file *sostituisce* tutti gli abbonamenti presenti.

L'import è una sostituzione integrale, non una fusione: chiede conferma mostrando
quante voci verranno rimpiazzate. Sta a te sapere quale lato è il più recente —
se modifichi entrambi i computer prima di sincronizzare, le modifiche di uno dei
due vanno perse. In pratica: esporta subito dopo aver messo mano ai dati.

L'import accetta sia il pacchetto completo prodotto da Esporta, sia un array nudo
di abbonamenti. Le righe malformate vengono scartate e contate nel messaggio.

## Se un giorno vuoi pubblicarla

`vercel.json` e `deploy_subs.bat` sono già pronti (stesso schema di `Home/`).
Servirebbe il sottodominio `subs.commonplaceapp.org`. Al 2026-07-20 la scelta è
stata di tenerla **solo locale**, quindi la card **non** è stata aggiunta a
`Home/index.html`. Se cambi idea, va inserita nella sezione "Collaterali":

```html
<a class="app-card collateral" href="https://subs.commonplaceapp.org">
  <div class="app-icon sym">&#x21BB;</div>
  <div class="app-name">Subs</div>
  <div class="app-desc">Abbonamenti ricorrenti: costi, rinnovi e spesa mensile.</div>
</a>
```

Nota: pubblicata, l'app sarebbe raggiungibile da chiunque abbia l'indirizzo. I dati
però restano nel `localStorage` di ogni singolo browser, quindi un visitatore
vedrebbe l'app vuota, non i tuoi abbonamenti.

## Struttura dei dati

Chiave `localStorage`: `subs.abbonamenti.v1`.

```json
{ "id": "…", "nome": "Netflix", "costo": 12.99, "ciclo": "mensile",
  "rinnovo": "2026-08-17", "categoria": "Streaming", "metodo": "Carta Visa" }
```

`ciclo` è `"mensile"` o `"annuale"`; `rinnovo` è sempre `AAAA-MM-GG`. I confronti
fra date avvengono su stringhe ISO, per non incappare in fusi orari e ora legale.
Il tasto **Rinnovato** avanza la data al primo ciclo non ancora passato, tenendo il
giorno del mese quando possibile (31 gennaio + 1 mese → 28/29 febbraio).
