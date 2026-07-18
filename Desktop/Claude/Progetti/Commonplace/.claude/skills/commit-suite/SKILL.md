---
name: commit-suite
description: Committare in sicurezza nel workspace Commonplace. Usa per QUALSIASI operazione git (status, add, commit, branch, merge) su file sotto Progetti/Commonplace. Attivazione esatta - stai per eseguire un comando git, o hai finito una modifica e va congelata in git.
---

# Commit nella matrioska Commonplace

## Il fatto fondamentale

**La radice del repo esterno è `C:\Users\Test` — l'intero profilo Windows.** Nei diff i path
iniziano con `Desktop/Claude/...`. Dentro Commonplace vivono inoltre **repo git annidati e
indipendenti**: `Dashboard/`, `Digest/`, `Ledger/`, `NoteS/`, `Syllabus/app/`.
Verificato 2026-07-11: il repo esterno **non traccia affatto** Dashboard/Digest/Ledger/NoteS
(risultano solo cartelle untracked — non aggiungerle mai); solo `Syllabus/app` è registrato
come gitlink (submodule di fatto), quindi è l'unico che richiede il doppio commit.

## Quando NON usare questa skill

- Per il push: **il push si fa solo su richiesta esplicita di Stefano**, mai di tua iniziativa.
- ⚠️ **MAI push dal repo annidato `Syllabus/app`** (verificato 2026-07-11): il suo `origin`
  è lo STESSO remote del repo esterno (`github.com/Olengard/syllabus.git`) ma con storia
  incompatibile — la `main` remota appartiene al repo esterno. Un push normale verrebbe
  rifiutato; un `--force` cancellerebbe l'intero workspace remoto. I commit di Syllabus/app
  restano locali (il deploy passa da Vercel CLI, git non serve). ⚠️ Corollario scoperto
  il 2026-07-18: il progetto Vercel di Syllabus aveva ANCHE l'integrazione Git collegata
  a questo remote — ogni push rideployava un Syllabus stantio sopra i fix CLI. Scollegata
  (vercel git disconnect): NON ricollegarla; se Syllabus "regredisce da solo", controllare
  gli alias *-git-main-* del progetto.
- Per repo estranei a Commonplace (DnDMaster segue le stesse regole ma ha il suo CLAUDE.md;
  Zeitgeist Wiki ha convenzioni proprie).

## Procedura

1. Identifica DOVE vivono i file toccati:
   - dentro `Dashboard/`, `Digest/`, `Ledger/`, `NoteS/`, `Syllabus/app/` → si committa
     **da dentro quella cartella**, nel repo annidato (direttamente su `main`).
   - altrove sotto Commonplace → repo esterno, da `C:\Users\Test\Desktop\Claude`.
2. Se hai committato in `Syllabus/app`, aggiorna poi il gitlink nel repo esterno
   (`git add Progetti/Commonplace/Syllabus/app`) con un commit `chore(syllabus)`.
3. Nel repo esterno: branch di lavoro → commit → `git merge --ff-only` su `main` → cancella il branch.
4. **`git add` solo con path espliciti.** Mai `git add -A`, `git add .`, `git add Progetti/`.
5. Messaggi in italiano, prefisso per app: `feat(bookshelf)`, `fix(footnote)`, `docs(ledger)`,
   `chore(syllabus)`, `feat(listens)`…
6. Prima del merge controlla `git log --oneline -10`: **sessioni Claude parallele committano
   sullo stesso branch** — commit altrui intercalati sono normali. Se il ff-only fallisce,
   `git rebase --autostash main` dal branch di lavoro.

## Comandi

```bash
# stato SOLO di Commonplace (il resto del repo è rumore permanente: ignoralo)
cd "C:/Users/Test/Desktop/Claude" && git status --short -- Progetti/Commonplace

# repo annidato
cd "C:/Users/Test/Desktop/Claude/Progetti/Commonplace/Ledger" && git status --short

# controllo segreti PRIMA del commit (deve restituire zero righe)
git diff --cached | grep -nE "sk-ant|VITE_[A-Z_]*KEY *=|service_role"

# flusso repo esterno
git checkout -b lavoro-breve
git add Progetti/Commonplace/App/file1 Progetti/Commonplace/App/file2
git commit -m "fix(app): descrizione in italiano"
git checkout main && git merge --ff-only lavoro-breve && git branch -d lavoro-breve
```

## Barra di qualità

- `git show --stat HEAD` mostra **solo** i file che intendevi committare.
- Zero segreti nel diff (grep sopra pulito).
- Se un gitlink compare come `-dirty` nel diff, PRIMA committa dentro il repo annidato,
  POI il gitlink: mai committare un riferimento a uno stato dirty.

## Checklist di verifica

- [ ] Ho committato dal repo giusto (annidato vs esterno)?
- [ ] Path espliciti, nessun file personale o di altra app trascinato dentro?
- [ ] Messaggio italiano con prefisso corretto?
- [ ] ff-only riuscito e branch cancellato?
- [ ] Nessun push non richiesto?

## Errori comuni

- `git add .` dalla radice → committerebbe l'intero profilo Windows. **Mai.**
- Committare `Syllabus/app` (gitlink) dimenticando il commit interno → il riferimento
  punta a uno stato inesistente per chiunque cloni.
- Stashare o committare i file "permanentemente sporchi" di altri sottoprogetti del
  working tree: non sono tuoi, lasciali stare.
- Farsi ingannare dai warning "could not open directory" di `git status`: innocui, ignorali.

## Cosa segnalare a Stefano

- Commit intercalati di un'altra sessione trovati prima del merge (di norma è tutto ok, ma dillo).
- Qualsiasi segreto trovato nel diff → FERMATI, non committare, segnala subito.
- Un repo annidato con modifiche non committate che non hai fatto tu.
