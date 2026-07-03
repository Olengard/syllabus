# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Cos'è questo progetto
Wiki **da master** (in italiano) per la campagna *Zeitgeist: The Gears of Revolution* (EN Publishing, 13 avventure, liv. 1→20). Non è codice applicativo: è un **vault Obsidian** in Markdown più alcuni script Python di supporto. È uno strumento di **riferimento/preparazione fuori dal tavolo**, ottimizzato per i collegamenti incrociati tra sottotrame.

Interlocutore: il master della campagna. Risponde in italiano. Scrive lui la prosa finale — vedi *Divisione del lavoro*.

## Comandi
Richiede Python 3 + `pip install pymupdf` (solo per estrarre testo dai PDF).

```bash
# Generare il vault giocatori da Master/ (rigenera Players/ da zero)
python _scripts/export_players.py
python _scripts/export_players.py --dry-run      # elenca solo cosa esporterebbe
# oppure doppio click su _scripts/esporta_giocatori.bat

# Creare pagine-segnaposto per ogni [[link]] non ancora scritto ("lista della spesa")
python _scripts/genera_stub.py
python _scripts/genera_stub.py --dry-run
# oppure _scripts/genera_stub.bat

# Lint anti-spoiler: player_safe mancante, heading segreto senza callout,
# pipe non escapato nelle tabelle, allegati mancanti (exit 1 se ci sono errori)
python _scripts/controlla.py
# oppure _scripts/controlla.bat

# Estrarre il testo di un PDF (con TOC) in un file di lavoro, per analizzarlo
python <scratchpad>/extract.py "_fonti/NOME.pdf" out.txt   # usa fitz (pymupdf)

# Estrarre mappe/immagini da un PDF in Master/_allegati/<sottocartella>/
python _scripts/estrai_immagini.py "_fonti/ZG02_Skyseer.pdf" avv02
python _scripts/estrai_immagini.py "_fonti/ZG02_Skyseer.pdf" avv02 --pagine 40-60 --min 200 --dry-run
```
Validi una modifica con `controlla.py` (convenzioni spoiler/formato) più, se serve, `export_players.py --dry-run` (conteggio pagine player-safe) e `genera_stub.py --dry-run` (link irrisolti). **Dopo una passata di rifinitura manuale alle pagine, esegui sempre `controlla.py`**: intercetta i segreti finiti per sbaglio fuori dai callout.

## Architettura: due vault, una fonte di verità
- **`Master/`** — il vault Obsidian completo, **con tutti gli spoiler**. È l'unica cosa che si modifica a mano.
- **`Players/`** — vault per i giocatori, **generato** da `export_players.py`. Mai modificarlo a mano (viene ricreato da zero a ogni run; è in `.gitignore`).
- **`_fonti/`** — i PDF delle avventure. **Git-ignored** (pesanti, protetti da copyright). Il contenuto della wiki è **parafrasi/riassunto** del materiale, non riproduzione integrale.
- **`Master/_allegati/`** — mappe/immagini (spesso estratte dai PDF con `estrai_immagini.py`). **Git-ignored** come `_fonti/`: materiale protetto + binari pesanti → restano in locale, sync fuori da Git. Si incorporano con `![[nome.png]]` (o `![[nome.png|500]]` per la larghezza).
- **`_scripts/`** — utilità Python + wrapper `.bat`.

### Modello spoiler (il cuore del sistema)
Ogni pagina ha nel frontmatter `player_safe: true|false`. I segreti dentro pagine condivisibili stanno in callout Obsidian:
```
> [!segreto-dm]
> ...testo riservato al master...
```
`export_players.py` fa quattro cose, in quest'ordine logico:
1. copia in `Players/` **solo** le pagine `player_safe: true`;
2. rimuove i blocchi `> [!segreto-dm]` (e l'heading dedicato sopra, es. `## Verità nascoste (DM)`) e i campi-frontmatter segreti (`SECRET_FM_KEYS`: obiettivo_reale, verita, segreti, livello_spoiler, player_safe);
3. **"slinka"** i `[[link]]` verso pagine non esportate → diventano testo semplice (niente link rotti che rivelino l'esistenza di pagine segrete). I link a pagine esportate restano;
4. copia in `Players/_allegati/` **solo gli allegati referenziati** dalle pagine esportate (per estensione: `ATTACH_EXTS`). La raccolta avviene **dopo** la rimozione dei callout segreti, quindi una mappa incorporata solo dentro un `[!segreto-dm]` **non** viene esportata.

Conseguenza pratica: quando scrivi una pagina `player_safe: true`, **metti sempre i segreti in un callout `[!segreto-dm]`**, non nel testo normale — vale anche per le mappe "soluzione": `![[dungeon.png]]` dentro il callout resta al master.

## Tassonomia del Master (e perché)
`00 Indici` (pagine-MOC di navigazione) · `01 Avventure` (1 scheda per avventura, con `data_in_gioco` in a.o.v., `livello_party`, atto, rivelazione, ganci) · `02 Personaggi` · `03 Fazioni` · `04 Luoghi` · `05 Misteri e Indizi` (tracker "cosa sa il party vs. cosa è vero") · `06 Cosmologia e Storia` · `07 Concetti e Regole` · `08 Oggetti e Reliquie` · `09 Sessioni` · `_template` (8 modelli, esclusi dagli script) · `_allegati` (mappe/immagini) · `_stub` (segnaposto generati, da riclassificare).

**Distinzione importante tra due viste del mistero:**
- `00 Indici/Indice delle Rivelazioni` = cosa il *manuale* prevede venga svelato e quando (vista regista).
- `05 Misteri e Indizi` = cosa il *party reale* ha scoperto (si aggiorna dopo le sessioni).

## Convenzioni di scrittura
- **Lingua:** italiano, **nomi propri in inglese** (allineati ai PDF: Obscurati, Risur, Lya Jierre…).
- **Date in-fiction:** anni in **a.o.v.** (*After Our Victory*); la campagna va dal 500 al 502 a.o.v.
- **Sezione "Cronologia delle apparizioni":** ogni scheda di PNG/fazione/luogo/oggetto la ha, e àncora il soggetto alle avventure (es. `**[[05 - Cauldron-Born|Avv. 5]]** — ...`). È il meccanismo che situa temporalmente gli eventi: è la convenzione più importante da mantenere.
- **Link nelle tabelle:** il pipe va **escapato** come `[[Pagina\|alias]]`. Gli script normalizzano `\|`→`|` e tolgono il backslash finale dal target — se modifichi il parsing dei link, preserva questo o ricompariranno falsi "link mancanti".
- Nuove pagine: parti dal template in `_template/` corrispondente.

## Livelli di profondità e cadenza di lavoro
Le avventure si approfondiscono per livelli: **T0** sinossi · **T1** struttura atti→scene + PNG ricorrenti + indizi-chiave + ganci (lo sweet spot della wiki) · **T2** copertura completa (tutti i PNG/luoghi come pagine, mappe, clue-tracking) solo per l'avventura imminente · **T3** statblocchi (di nicchia). Strategia: **breadth a T1 su tutte, T2 just-in-time** sull'avventura che si sta per giocare. Stato e cadenza concordata sono nella memoria di progetto `zeitgeist-wiki` (l'utente dice "step N" a inizio sessione).

### Divisione del lavoro
- **Claude:** estrazione fatti dai PDF + scaffolding + *tutti* i `[[link]]` + cronologie + coerenza tra pagine.
- **Utente:** riscrive/rifinisce la prosa (tono, note da tavolo). Non produrre prosa "definitiva" pensando sia intoccabile.
- Periodicamente: passata di consistenza/linking sulle pagine che l'utente ha espanso.

## Gotcha
- `Players/` e `_fonti/` sono in `.gitignore`; non versionarli e non condividere il `Master/`.
- All'apertura del vault, Obsidian può creare una nota di benvenuto di default (`Benvenuto.md` con `[[crea un collegamento]]`): è rumore, si può cancellare.
- Bonus futuro (binario separato): estrarre gli statblocchi dei mostri dai PDF → JSON importabili in **DnDMaster**. Serve prima lo schema mostri di quell'app.
