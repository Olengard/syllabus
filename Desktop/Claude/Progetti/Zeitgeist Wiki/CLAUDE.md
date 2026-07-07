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

# Estrarre il testo di un PDF in un .txt di lavoro NELLO SCRATCHPAD (mai nel vault),
# con un marcatore per pagina così i grep citano la pagina del PDF:
#   for i, page in enumerate(doc): out.append(f"\n===== PAGINA {i+1} =====\n" + page.get_text())
# (usa fitz/pymupdf; script usa-e-getta nello scratchpad di sessione)

# Estrarre mappe/immagini da un PDF in Master/_allegati/<sottocartella>/
python _scripts/estrai_immagini.py "_fonti/ZG02_Skyseer.pdf" avv02
python _scripts/estrai_immagini.py "_fonti/ZG02_Skyseer.pdf" avv02 --pagine 40-60 --min 200 --dry-run

# Estrarre statblocchi 5e da un PDF in JSON 5e.tools, importabile in DnDMaster
# (vedi sezione "Statblocchi → DnDMaster")
python _scripts/estrai_statblocchi.py "_fonti/ZG03_Digging_For_Lies.pdf" --pagine 66-90 --out "_fonti/mostri.json"
python _scripts/estrai_statblocchi.py "_fonti/ZG04_Always_On_Time.pdf" --out "_fonti/mostri.json" --aggiungi
python _scripts/estrai_statblocchi.py "_fonti/ZG05_Caldron_Born.pdf" --dry-run
```
Validi una modifica con `controlla.py` (convenzioni spoiler/formato) più, se serve, `export_players.py --dry-run` (conteggio pagine player-safe) e `genera_stub.py --dry-run` (link irrisolti). **Dopo una passata di rifinitura manuale alle pagine, esegui sempre `controlla.py`**: intercetta i segreti finiti per sbaglio fuori dai callout.

## Architettura: due vault, una fonte di verità
- **`Master/`** — il vault Obsidian completo, **con tutti gli spoiler**. È l'unica cosa che si modifica a mano.
- **`Players/`** — vault per i giocatori, **generato** da `export_players.py`. Mai modificarlo a mano (viene ricreato da zero a ogni run; è in `.gitignore`).
- **`_fonti/`** — i PDF delle avventure. **Git-ignored** (pesanti, protetti da copyright). Il contenuto della wiki è **parafrasi/riassunto** del materiale, non riproduzione integrale. Vedi *Le fonti PDF* più sotto.
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

## Le fonti PDF (`_fonti/`)
- **`ZG_players_guide_5th_edition-1.pdf`** (60 pp.) — materiale *player-facing*: la **guida della città di Flint è qui** (Part 3, pp. 2-9: distretti, sindaci, tempi di viaggio, mappa città + subrail), più piani/cosmologia noti ai giocatori e regole RHC.
- **`ZG_Campaign_guide.pdf`** (27 pp.) — overview da GM: fazioni, celle Ob, sinossi delle 13 avventure. È *corta*: il dettaglio vero sta nei PDF-avventura o nella Player's Guide.
- **`ZG_1` … `ZG_6`** — le avventure 1-6. Le avventure **7-13 non hanno PDF**: per loro esistono solo le sinossi della Campaign Guide.
- ⚠️ **ZG02/03/04 sono file COMPLETI** (Part One+Two+Three in un unico PDF), ma il **TOC incorporato si ferma alla Part One** e il frontespizio dice solo "Part One": non fidarsi, verificare con `grep -inE "^part (one|two|three)"` sul testo estratto. (Già costato un errore in una scheda.)
- Per verificare fatti: estrai il testo nello scratchpad con marcatori `===== PAGINA N =====` (vedi Comandi), poi `grep -in` sul `.txt` — così i riscontri citano la pagina del PDF, da riportare in **Fonti** della scheda.

## Statblocchi → DnDMaster
`_scripts/estrai_statblocchi.py` converte gli statblocchi 5e di un PDF-avventura in un JSON **formato 5e.tools** (`{"monster": [...]}`) che si importa in **DnDMaster** (tab Mostri → Importa → file JSON → tipo *monster*; finisce nei mostri custom `dnd_custom_monsters_v1`, dedup per nome — reimportare non duplica). Già generato: `_fonti/zeitgeist_mostri_avv3-4.json` (50 statblocchi: ZG03 Atto 3 + ZG04 completa).

Metodo e gotcha (dettagli nel docstring dello script):
- Riconosce gli statblocchi dalla riga taglia/tipo ("Medium humanoid (human), neutral evil"), nome sulla riga sopra; poi campi standard e paragrafi "Nome. testo" per tratti/azioni.
- **Le frasi meccaniche restano in inglese 5e** ("+7 to hit", "Hit: 14 (2d8+5) piercing damage"): `parse5eMonster` in DnDMaster estrae bonus/danni/gittata **via regex sull'inglese** — tradurle rompe l'import. Testo libero (tratti, note) può essere in qualsiasi lingua.
- **Sbordo narrativo**: l'ultimo statblocco prima del testo di scena tende ad assorbire paragrafi spuri; le euristiche di stop coprono il grosso, i residui si fissano nei dizionari `DROP_FROM`/`MERGE_PREV`/`EXTRA` in testa allo script (es. *Jaime the Weevil*, spezzato in due da una sidebar in ZG04). Dopo ogni estrazione **leggere il riepilogo a video** riga per riga: azioni con nomi "da frase" = narrativa infiltrata.
- L'auto-verifica finale replica le regex dell'app e segnala azioni d'attacco senza bonus/danno estraibili — alcuni avvisi sono legittimi (la rete di Jerrial, l'Ovipositor, il Golden Doppelganger "same as target").
- Copyright: il JSON resta in **`_fonti/`** (git-ignored), come immagini e PDF.

## Tassonomia del Master (e perché)
`00 Indici` (pagine-MOC di navigazione) · `01 Avventure` (1 scheda per avventura, con `data_in_gioco` in a.o.v., `livello_party`, atto, rivelazione, ganci) · `02 Personaggi` · `03 Fazioni` · `04 Luoghi` · `05 Misteri e Indizi` (tracker "cosa sa il party vs. cosa è vero") · `06 Cosmologia e Storia` · `07 Concetti e Regole` · `08 Oggetti e Reliquie` · `09 Sessioni` · `_template` (8 modelli, esclusi dagli script) · `_allegati` (mappe/immagini) · `_stub` (segnaposto generati, da riclassificare).

**Distinzione importante tra due viste del mistero:**
- `00 Indici/Indice delle Rivelazioni` = cosa il *manuale* prevede venga svelato e quando (vista regista).
- `05 Misteri e Indizi` = cosa il *party reale* ha scoperto (si aggiorna dopo le sessioni).

## Convenzioni di scrittura
- **Lingua:** italiano, **nomi propri in inglese** (allineati ai PDF: Obscurati, Risur, Lya Jierre…).
- **Date in-fiction:** anni in **a.o.v.** (*After Our Victory*); la campagna va dal 500 al 502 a.o.v.
- **Sezione "Cronologia …":** ogni scheda di PNG/fazione/luogo/oggetto ne ha una, e àncora il soggetto alle avventure (es. `**[[05 - Cauldron-Born|Avv. 5]]** — ...`). È il meccanismo che situa temporalmente gli eventi: è la convenzione più importante da mantenere. L'heading varia **di proposito** per tipo di scheda: Personaggi → *"Cronologia delle apparizioni"* · Fazioni → *"Cronologia del coinvolgimento"* · Luoghi → *"Cronologia degli eventi"* · Oggetti → *"Cronologia"*. Non uniformarli.
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
- **`controlla.py` vede solo i leak *strutturali*** (callout mancanti, frontmatter, pipe). I leak **semantici** — uno spoiler scritto in chiaro nel corpo di una pagina `player_safe: true` — non può coglierli: quando tocchi una pagina condivisibile, rileggi il testo *come lo leggerebbe un giocatore*. (È già successo: la vecchia scheda di Flint esportava ai giocatori il segreto del governatore.)
- I tre script condividono convenzioni **duplicate** (`SECRET_FM_KEYS`, `SECRET_HEADINGS`, `ATTACH_EXTS`, gestione del pipe escapato): se ne modifichi una in `export_players.py`, allineala anche in `controlla.py` e `genera_stub.py`.
- All'apertura del vault, Obsidian può creare una nota di benvenuto di default (`Benvenuto.md` con `[[crea un collegamento]]`): è rumore, si può cancellare.
- `estrai_statblocchi.py` è indipendente dal vault (legge e scrive solo in `_fonti/`) ma dipende dal formato di import di **DnDMaster** (`parse5eMonster` in `src/App.jsx` di quell'app): se quel parser cambia, riverificare con un import di prova.
