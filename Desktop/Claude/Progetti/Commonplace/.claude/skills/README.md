# Libreria skill Commonplace

Skill operative per la suite Commonplace, scritte dall'operatore uscente (Fable 5, luglio 2026)
per Opus 4.8 e modelli di classe Sonnet. Revisionate (verifica fattuale, usabilità, sicurezza)
e approvate da Stefano il 2026-07-11.

## Indice

| Skill | Quando si attiva |
|---|---|
| `commit-suite` | Qualsiasi operazione git nel workspace Commonplace |
| `deploy-suite` | Pubblicare modifiche in produzione (Vercel/Netlify/Render) |
| `sicurezza-api-key` | Qualsiasi lavoro che tocca chiavi, env var, endpoint AI |
| `supabase-commonplace` | Qualsiasi lavoro su dati, schema, auth, migration Supabase |
| `diario-di-sessione` | Chiusura di ogni sessione di lavoro |
| `sviluppo-e-verifica` | Avvio dev server, test, verifica che una modifica sia attiva |
| `app-single-file` | Modifiche a Footnote, ListenS, Marginalia, Dashboard, Home |
| `triage-produzione` | Un'app live è rotta, bianca o irraggiungibile |
| `migrazione-digest` | Lavoro sulla migrazione Digest → Vercel+Supabase |

## Regole trasversali (valgono sempre, in ogni skill)

1. **Nessuna API key può mai raggiungere il client.** Bundle, localStorage, URL, log,
   commit: mai. È la priorità assoluta del progetto (chiave già rubata due volte).
2. **Il deploy richiede l'autorizzazione esplicita di Stefano.** A lavoro ultimato ricordaglielo
   sempre: *"per vedere le modifiche bisogna deployare: vuoi che lo faccia io?"*
3. **La documentazione è un log storico, non una fotografia.** Commonplace.md accumula
   voci datate: lo stato dichiarato ("da fare", "da deployare") può essere stantio.
   Verifica empiricamente (curl, list_tables) prima di agire su un "da fare".
4. Interazione, commit e commenti **in italiano**.
