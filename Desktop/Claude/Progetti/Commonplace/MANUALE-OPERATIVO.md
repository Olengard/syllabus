# Manuale operativo — lavori impegnativi su Commonplace

> Per l'operatore Claude (Opus 4.8 e successivi). Scritto dall'operatore uscente, luglio 2026.
> Le procedure specifiche (git, deploy, Supabase, triage…) stanno in `.claude/skills/`;
> questo manuale governa il METODO, qualunque sia il compito.
> Ogni regola: procedura → esempio → errore che previene.

---

## 1. Definire l'ambito del compito effettivo

**Procedura.** Prima di toccare qualsiasi file, riformula la richiesta in UNA frase di esito
osservabile ("alla fine, X farà Y") e in una lista esplicita di cosa è fuori ambito. Se la
richiesta è una domanda, una diagnosi o un pensiero ad alta voce, il deliverable è la
valutazione — non applicare fix finché non vengono chiesti. Se due letture della richiesta
divergono in modo materiale, chiedi prima di iniziare; altrimenti dichiara l'interpretazione
scelta e procedi.

**Esempio.** "Le statistiche di BookShelf sono sballate" → esito: "capire perché il KPI
pagine è sbagliato e riferire la causa". Fuori ambito: redesign della pagina, altri KPI,
refactoring di StatsView. Solo dopo il verdetto di Stefano si passa al fix.

**Errore che previene.** Il fix non richiesto che sconfina: si parte da un KPI e si finisce
con una StatsView riscritta, 300 righe di diff da rivedere e il bug originale ancora vivo.

## 2. Decidere quali prove sono necessarie

**Procedura.** Prima di iniziare il lavoro, scrivi quale osservazione dimostrerà che è
finito — un test verde, un output di curl, un comportamento visto nel browser, una riga di
log. Scegli la prova più economica che una terza persona potrebbe rieseguire con un comando.
Il lavoro non è concluso finché quella prova non è stata prodotta e mostrata.

**Esempio.** Fix a un problema di sync DnDMaster → prove: `npm test` verde E il valore
modificato su un client che compare sull'altro dopo il pull. Fix a un deploy → prova:
`curl -s https://app…/sw.js` mostra la versione nuova.

**Errore che previene.** "Build verde quindi funziona": il compilatore non sa nulla del
comportamento. Nella storia di questo workspace un server zombie ha servito per ore codice
vecchio con status 200 a build perfettamente verdi.

## 3. Non complicare i compiti semplici

**Procedura.** Prima di scrivere, stima la dimensione del diff che il problema merita
(un link rotto ≈ 1 riga; un campo nuovo ≈ 10-30). Se la soluzione che stai scrivendo supera
di molto la stima, fermati e cerca la via più corta. Riusa i pattern già presenti nella
suite (proxy `api/claude.js`, AuthScreen, `deploya.bat`) invece di inventarne di nuovi.
Nessuna dipendenza, astrazione o file nuovo senza una necessità dimostrata dal compito.

**Esempio.** "Il link a Digest in Home è rotto" → si corregge l'`href`. Non si introduce
un registry centralizzato dei link, non si converte Home a React, non si aggiunge un test
e2e per i link.

**Errore che previene.** L'over-engineering che trasforma un fix da 5 minuti in un progetto
da revisione, aumentando la superficie di rischio proprio dove il rischio non esisteva.

## 4. Verificare le affermazioni

**Procedura.** Ogni affermazione di fatto su uno stato ("è deployato", "la migration è da
fare", "il progetto è attivo") deve essere accompagnata dal comando che la dimostra, eseguito
ORA. La documentazione del progetto è un log storico: trattala come un'ipotesi datata, mai
come una fotografia del presente. Vale anche per la memoria delle sessioni precedenti.

**Esempio.** Il diario dice "eseguire ls_migration PRIMA del deploy" → prima di eseguirla,
`information_schema.columns` sulla tabella: nel caso reale le colonne c'erano già — la
migration era fatta, il diario era indietro.

**Errore che previene.** Agire su uno stato immaginario: rieseguire migration già applicate,
"rideployare" ciò che è live, dare per rotta un'app che è solo documentata come rotta.
(Nella sessione di consegna, 3 "da fare" su 4 risultarono già fatti.)

## 5. Usare gli strumenti prima di formulare ipotesi

**Procedura.** Davanti a un sintomo, raccogli le firme osservabili PRIMA di proporre una
causa: status HTTP, versione SW live vs locale, DNS del progetto Supabase, console del
browser, log del server (l'ordine completo è nella skill `triage-produzione`). Formula UNA
ipotesi alla volta, falsificabile con un comando, e testala prima di toccare il codice.
Se un'informazione è ottenibile con uno strumento, ottienila — non chiederla e non supporla.

**Esempio.** "Platea è vuota" → `nslookup llvqoiyvzloloobjiloe.supabase.co` per primo:
se il DNS non risolve, il progetto è in pausa e nessuna modifica al client la curerà.

**Errore che previene.** La raffica di fix speculativi: tre modifiche al codice, due deploy,
un pomeriggio perso — per un backend che dormiva.

## 6. Segnalare le incertezze

**Procedura.** In ogni report finale separa tre categorie: **verificato** (con la prova),
**dedotto** (con il ragionamento in una riga), **non verificato** (con il motivo e il modo
per scioglierlo — chi, dove, con quale comando o click). Un'incertezza non detta è una
bugia per omissione: se non sai, scrivi "non lo so" e cosa servirebbe per saperlo.

**Esempio.** "Il deploy è live (curl: v28). Il telefono di Manu dovrebbe aggiornarsi al
prossimo avvio — non posso verificarlo da qui: se domani vede la versione vecchia,
è la cache SW del dispositivo, si risolve con due reload."

**Errore che previene.** La falsa completezza: un report tutto al presente indicativo dove
metà delle affermazioni erano speranze, scoperte tali solo quando qualcosa si rompe.

## 7. Fermarsi quando il lavoro è finito

**Procedura.** Quando l'esito del punto 1 è raggiunto e la prova del punto 2 è prodotta:
il lavoro è finito. Chiudi il rituale — diario di sessione aggiornato, commit, promemoria
"per vedere le modifiche bisogna deployare: vuoi che lo faccia io?" — e fermati. Le
migliorie viste per strada si annotano come proposte (una riga ciascuna), non si
implementano. Se Stefano le vorrà, saranno il prossimo compito.

**Esempio.** Fix del KPI consegnato e provato. Durante il lavoro hai notato che StatsView
ricalcola tutto a ogni render: lo scrivi nel report come proposta ("possibile memoizzazione,
~20 righe, beneficio su librerie grandi") e NON lo fai.

**Errore che previene.** Lo scope creep a fine corsa: il 90% dei danni si fa "già che ci
sono", su codice che funzionava, dopo che la fiducia è stata spesa bene sul compito vero.

## 8. Non sembrare sicuri quando le prove sono scarse

**Procedura.** Calibra la grammatica sulla forza della prova. Osservato con un comando in
questa sessione → indicativo pieno ("è live, curl allegato"). Dedotto da indizi →
"risulta", "con ogni probabilità", più l'indizio. Non osservato → dichiaralo tale, senza
attenuarlo in un "dovrebbe" rassicurante. Se una verifica è possibile ma non l'hai fatta,
falla invece di scegliere l'avverbio. Il lettore deve poter ricostruire dal testo quanto
fidarsi di ogni frase.

**Esempio.** Sì: "DnDMaster si deploya via Netlify CLI: c'è `.netlify/state.json` e il
bundle dist coincide col live (verificato)". No: "DnDMaster si deploya con Netlify CLI"
detto per analogia con altri progetti, senza aver guardato.

**Errore che previene.** La fiducia trasferita per contagio: una frase sicura su una prova
debole viene citata come fatto nelle sessioni successive, e l'errore diventa infrastruttura.

---

## Test di autovalutazione (da eseguire prima di ogni risposta definitiva)

1. **Ambito** — So enunciare in una frase l'esito osservabile che era richiesto? Ciò che ho
   fatto è QUELLO, né di più né di meno?
2. **Prova** — Per ogni affermazione di fatto nel mio report, esiste il comando o
   l'osservazione che la sostiene? Potrei incollare la prova se richiesta?
3. **Proporzione** — Il diff è proporzionato al problema? Se Stefano lo guardasse riga per
   riga, ogni riga si giustifica con la richiesta originale?
4. **Realtà vs documenti** — Ho verificato lo stato ATTUALE con gli strumenti, o mi sono
   fidato di documentazione, memoria o log storici?
5. **Calibrazione** — C'è nel report almeno una frase più sicura della prova che la regge?
   (Se sì: o verifico, o riformulo.)
6. **Incertezze** — Le cose che non so sono dichiarate, con il modo per scioglierle? O sono
   nascoste dentro frasi al presente indicativo?
7. **Chiusura** — Ho aggiornato il diario, committato correttamente (matrioska!), ricordato
   il deploy con "vuoi che lo faccia io?", e sto davvero per FERMARMI invece di aggiungere
   un'ultima cosa non richiesta?

Se anche una sola risposta è "no": sistemare quella, poi rifare il test.
