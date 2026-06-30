# Zeitgeist Wiki

Wiki da **master** per la campagna *Zeitgeist: The Gears of Revolution* (EN Publishing, 13 avventure, livelli 1→20). Vault **Obsidian** in Markdown, pensato per la consultazione e la preparazione fuori dal tavolo.

## Struttura del progetto
```
Zeitgeist Wiki/
├─ Master/      ← il vault Obsidian principale (APRI QUESTA cartella in Obsidian). Contiene tutti gli spoiler.
├─ Players/     ← vault per i giocatori, GENERATO dallo script (non modificarlo a mano). Ignorato da git.
├─ _fonti/      ← i PDF delle avventure (ignorati da git: pesanti e protetti da copyright).
└─ _scripts/    ← utilità Python.
```

### Il vault Master
Aperto come vault in Obsidian (`Master/`). Cartelle:
- **00 Indici** — pagine-mappa: [[Home]], Cronologia della Campagna, Indice delle Rivelazioni, Mappa delle Fazioni, Dramatis Personae.
- **01 Avventure** — una scheda per ciascuna delle 13 avventure (con *data in gioco*, *livello*, *rivelazione chiave*, *ganci* verso le altre).
- **02 Personaggi**, **03 Fazioni**, **04 Luoghi** — ogni scheda importante ha una **Cronologia delle apparizioni** che la àncora alle avventure.
- **05 Misteri e Indizi** — tracker "cosa sa il party vs. cosa è vero".
- **06 Cosmologia e Storia**, **07 Concetti e Regole**, **08 Oggetti e Reliquie**, **09 Sessioni**.
- **_template** — modelli per nuove pagine (Settings → Templates → cartella `_template`).

## Spoiler e separazione Master / Players
Ogni pagina ha nel frontmatter `player_safe: true|false`. I segreti dentro pagine condivisibili stanno in callout:
```
> [!segreto-dm]
> ...testo riservato al master...
```
Lo script `export_players.py`:
1. copia in `Players/` **solo** le pagine `player_safe: true`;
2. **rimuove** i blocchi `[!segreto-dm]` e i campi-frontmatter segreti;
3. trasforma i `[[link]]` verso pagine non esportate in **testo semplice** (niente link rotti che rivelino pagine segrete).

## Comandi
Servono Python 3 e `pip install pymupdf` (solo per estrarre testo dai PDF).
- **Generare il vault giocatori:** doppio click su `_scripts/esporta_giocatori.bat` (o `python _scripts/export_players.py`). Aggiungi `--dry-run` per simulare.
- **Creare i segnaposto mancanti:** `_scripts/genera_stub.bat` — crea una pagina-stub per ogni `[[collegamento]]` non ancora scritto (la tua "lista della spesa"). `--dry-run` per vedere prima.

## Sincronizzazione (mobile)
Il vault sta nel repo git. Su telefono: app **Obsidian** + plugin **Git** per il `pull`. `Players/` e `_fonti/` sono esclusi da git (`.gitignore`).

## Convenzioni
- Lingua: **italiano**, con **nomi propri in inglese** (allineati ai PDF).
- Date in-fiction in **a.o.v.** (*After Our Victory*); la campagna va dal 500 al 502 a.o.v.
- I contenuti sono **riassunti/parafrasi** del materiale che possiedi, per uso personale di gioco — non riproduzioni integrali.
