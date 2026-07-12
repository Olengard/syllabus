# Commonplace — Piano di lavoro · Aprile 2026

> ⚠️ **DOCUMENTO STORICO** (fermo alla Sessione #11, aprile 2026) — NON è il piano corrente.
> Fa fede **`Commonplace.md`**: intestazione (stato ultimo), sezioni per app e diario di sessione in coda.
> Priorità operative correnti (ratificate in Sessione #20): 1) manutenzione/bugfix, 2) ~~migrazione Digest → Vercel+Supabase~~ ✅ completata #21, 3) sprint build (ReadS/Platea EAS, DnD/Ledger Capacitor).

> Ultimo aggiornamento: 2026-04-09 — Sessione #11
> Priorità: chiusura suite + test + build sprint

---

## Stato attuale (al 2026-04-09)

| App | Stato | Note |
|---|---|---|
| BookShelf | ✅ Funzionante | Scrive su Supabase `bs_books` |
| Footnote | ✅ Funzionante | SW v26, fix cross-origin, fix podcast/film in risorse |
| ListenS | ✅ Funzionante | SW v12, Android Auto, stall recovery, header compatto |
| NoteS | ✅ Funzionante | Fix audio journal (scheduleSave + DOM sync), deploy |
| Dashboard | ✅ v2 live | Supabase, dati reali cp_items/cp_log, deploy ok |
| Platea | 🔶 Staged | Rating UI aggiunto (modal 5★), pronto per build |
| ReadS | ✅ Staged | Pronto per build EAS |
| Ledger | ✅ Funzionante | Capacitor APK pronto |
| DnD Master | 🔶 Staged | Build non urgente |

---

## Prossime sessioni

### Priorità alta

| # | Task | Note |
|---|---|---|
| 1 | ~~**Dashboard v2**~~ | ✅ Sessione #11 — Supabase live su dash.commonplaceapp.org |
| 2 | **Testing completo suite** — BookShelf, ListenS, Footnote, interazioni cross-app | Flusso completo da mobile e desktop |
| 3 | ~~**Platea**~~ — watch tracker + rating + integrazione `cp_items` | ✅ Sessione #11 — rating modal 5★ staged |

### Priorità media

| # | Task | Note |
|---|---|---|
| 4 | **cp-tags.js** — utility Tag Vault (autocomplete + fuzzy warning) | Condivisa tra app |
| 5 | ~~**NoteS**~~ — campo `item_id` + `cp_log` 'noted' + UI "Collega a item" | ✅ Sessione #11 — deploy ok |

### Completati sessione #11
- ✅ Dashboard v2 — Supabase live
- ✅ Platea rating modal — staged (build sprint 13/4)
- ✅ ListenS — pulsante "Esporta JSON" (⬇ header), SW v13
- ✅ NoteS — cp_log 'noted' su Supabase + campo item_id + UI "Collega a item" nel toolbar

### Calendario sprint

| Data | Task |
|---|---|
| entro 13/4 | Test suite (BookShelf, ListenS, Footnote, cross-app) |
| entro 13/4 | **Ledger** — notifiche push + export CSV/PDF |
| entro 13/4 | DnD Master / Digest (se tempo) |
| **14/4** | Checklist sicurezza (ErrorBoundary, localStorage try/catch, isolamento utente DnD, Digest secret_key) |
| **14/4** | Build sprint: ReadS (EAS) → Platea (EAS) → Ledger (Capacitor APK) → verifica post-build |

### Priorità medio-bassa — Migrazione ListenS su Supabase

ListenS usa attualmente localStorage (singolo dispositivo, telefono). La migrazione a Supabase
è utile solo per sync cross-device; non è urgente, ma va fatta senza perdere dati.

**Procedura sicura (da fare in sequenza):**
1. Sul telefono, aprire ListenS → esportare/copiare i dati localStorage prima di qualsiasi deploy
   (o aggiungere temporaneamente un pulsante "Esporta JSON" nella UI)
2. Importare il JSON in Supabase (`ls_podcasts`, `ls_queue`, `ls_episodes`, ecc.)
3. Deploy nuova versione ListenS che legge/scrive su Supabase
4. Verificare che tutto sia presente sul telefono prima di cancellare il localStorage

⚠️ Non deployare la versione Supabase senza prima aver salvato i dati mobile. Il localStorage
sul browser del telefono non è accessibile dall'esterno — va estratto dall'interno dell'app stessa.

---

## Build sprint · 13 aprile+

Nell'ordine indicato, in un unico blocco:

| # | Build | Stato | Prerequisiti |
|---|---|---|---|
| B1 | **ReadS** — EAS (Expo) | ✅ pronto | — |
| B2 | **Platea** — EAS (Expo) | 🔶 quasi | finalizzare watch tracker |
| B3 | **Ledger** — Capacitor APK | ✅ pronto | — |
| B4 | Verifica post-build su tutti i dispositivi | — | — |

---

## Dashboard v2 · Post-build

Dopo i build, con Supabase attivo:
- Tag Vault UI nella dashboard
- Sidebar connessioni attive (per tag, cross-app)
- Auth unificata suite
- ListenS → Supabase (se non già fatto prima)

---

## Note operative

- Ogni sessione: caricare `Commonplace.md` + `data-model.md`
- Le DDL Supabase sono già in `supabase-migration.sql`
- Desktop Commander: usare sempre `execSync` con `cwd` per build/deploy (non `cd` in cmd)
