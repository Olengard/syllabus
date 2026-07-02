// Tabelle di riferimento del modale Regole (azioni, condizioni bilingui, coperture, ...)
// Estratto da App.jsx (scorporo monolite) — dati puri, nessuna logica.
export const RULES_DB = [
  {
    id: "azioni",
    label: "⚔ Azioni in Combattimento",
    colore: "#c0392b",
    voci: [
      { titolo: "Attaccare", testo: "Effettua uno o più attacchi contro un bersaglio entro gittata. Alcune classi ottengono attacchi aggiuntivi (Attacco Extra)." },
      { titolo: "Lanciare un incantesimo", testo: "Lanci un incantesimo con tempo di lancio di 1 azione. Incantesimi con tempo diverso (1 azione bonus, 1 reazione) seguono regole separate." },
      { titolo: "Scatto", testo: "Guadagni movimento extra pari alla tua velocità. Con velocità 9 m puoi muoverti fino a 18 m in totale nel turno." },
      { titolo: "Disimpegno", testo: "Il tuo movimento non provoca attacchi di opportunità per il resto del turno." },
      { titolo: "Schivare", testo: "Fino al tuo prossimo turno: chiunque ti attacchi ha svantaggio (se riesci a vederlo) e tu hai vantaggio ai TS su Destrezza." },
      { titolo: "Aiutare", testo: "Aiuti un alleato: ha vantaggio al prossimo tiro per colpire o prova di caratteristica contro un bersaglio entro 1,5 m da te." },
      { titolo: "Nascondersi", testo: "Prova di Furtività (CD decisa dal DM). Se riesce: sei nascosto. Perdi lo stato se ti muovi in zone illuminate o attacchi." },
      { titolo: "Prepararsi", testo: "Dichiari un trigger e un'azione. Quando il trigger si verifica puoi usare la reazione per compiere l'azione." },
      { titolo: "Cercare", testo: "Prova di Percezione o Indagare per trovare qualcosa di nascosto." },
      { titolo: "Usare un oggetto", testo: "Interagisci con un secondo oggetto nel turno (il primo è gratuito), o usi un oggetto con proprietà speciale." },
      { titolo: "Azione bonus", testo: "Disponibile solo se una feature, incantesimo o abilità lo specifica. Non puoi scegliere liberamente di compiere un'azione bonus." },
      { titolo: "Reazione", testo: "1 reazione per round (si recupera all'inizio del tuo turno). Usabile in risposta a un trigger anche nel turno degli altri." },
      { titolo: "Attacco di opportunità", testo: "Quando un nemico lascia la tua portata senza usare Disimpegno: puoi usare la reazione per attaccarlo una volta." },
    ]
  },
  {
    id: "condizioni",
    label: "🔴 Condizioni",
    colore: "#8e44ad",
    voci: [
      { titolo: "Accecato (Blinded)", testo: "Non può vedere. Fallisce automaticamente prove basate sulla vista. Svantaggio ai tiri per colpire. Chi lo attacca ha vantaggio." },
      { titolo: "Affascinato (Charmed)", testo: "Non può attaccare o colpire con incantesimi la fonte del fascino. La fonte ha vantaggio alle interazioni sociali con lui." },
      { titolo: "Afferrato (Grappled)", testo: "Velocità 0 e nessun bonus alla velocità. Termina se l'afferrante è incapacitato o se un effetto allontana il bersaglio fuori portata." },
      { titolo: "Assordato (Deafened)", testo: "Non può sentire. Fallisce automaticamente prove basate sull'udito." },
      { titolo: "Avvelenato (Poisoned)", testo: "Svantaggio ai tiri per colpire e alle prove di caratteristica." },
      { titolo: "Esaurito (Exhaustion)", testo: "6 livelli: 1=svantaggio prove, 2=velocità ÷2, 3=svantaggio attacchi/TS, 4=PF max ÷2, 5=velocità 0, 6=morte. Ogni riposo lungo rimuove 1 livello." },
      { titolo: "Furtivo / Nascosto (Hidden)", testo: "Svantaggio agli attacchi contro creature che non lo vedono. Non può essere bersaglio di attacchi da chi non sa dove si trova." },
      { titolo: "Incapacitato (Incapacitated)", testo: "Non può compiere azioni né reazioni." },
      { titolo: "Invisibile (Invisible)", testo: "Impossibile vederlo senza sensi speciali. Vantaggio ai tiri per colpire, svantaggio contro chi lo attacca. Può ancora essere sentito/annusato." },
      { titolo: "Paralizzato (Paralyzed)", testo: "Incapacitato, non può muoversi né parlare. Fallisce TS FOR e DES. Chi lo attacca ha vantaggio. Colpi entro 1,5 m = critico automatico." },
      { titolo: "Pietrificato (Petrified)", testo: "Trasformato in sostanza solida. Incapacitato, peso ×10, non invecchia. Immunità veleni/malattie. Resistenza a tutti i danni. Fallisce TS FOR e DES." },
      { titolo: "Privo di sensi (Unconscious)", testo: "Incapacitato, non può muoversi né parlare, inconsapevole dell'ambiente. Lascia cadere ciò che tiene e cade prono. Fallisce TS FOR e DES. Chi lo attacca ha vantaggio. Colpi entro 1,5 m = critico automatico." },
      { titolo: "Prono (Prone)", testo: "Svantaggio ai tiri per colpire. Attacchi in mischia contro di lui: vantaggio. Attacchi a distanza: svantaggio. Rialzarsi costa metà del movimento." },
      { titolo: "Spaventato (Frightened)", testo: "Svantaggio a prove e tiri per colpire mentre vede la fonte della paura. Non può avvicinarsi volontariamente alla fonte." },
      { titolo: "Stordito (Stunned)", testo: "Incapacitato, non può muoversi, parla con difficoltà. Fallisce TS FOR e DES. Chi lo attacca ha vantaggio." },
      { titolo: "Trattenuto (Restrained)", testo: "Velocità 0. Svantaggio ai tiri per colpire. Attacchi contro di lui: vantaggio. Svantaggio ai TS su Destrezza." },
    ]
  },
  {
    id: "cd",
    label: "🎲 Difficoltà (CD)",
    colore: "#2980b9",
    voci: [
      { titolo: "Banale · CD 5", testo: "Quasi chiunque riesce. Scalare una parete con molti appigli, ricordare un fatto comune." },
      { titolo: "Facile · CD 10", testo: "Persona media con un po' di sforzo. Sfondare una porta non rinforzata, nuotare in acque calme." },
      { titolo: "Medio · CD 15", testo: "Richiede competenza o talento. Scassinare una serratura semplice, scalare una parete liscia con corda." },
      { titolo: "Difficile · CD 20", testo: "Sfida anche per gli esperti. Individuare una porta segreta ben nascosta, persuadere un nobile diffidente." },
      { titolo: "Molto difficile · CD 25", testo: "Impresa straordinaria. Scassinare una serratura di qualità, ricordare conoscenze arcane oscure." },
      { titolo: "Quasi impossibile · CD 30", testo: "Limite delle capacità mortali. Solo i più grandi eroi ci riescono." },
      { titolo: "Tiro contrapposto", testo: "Entrambe le parti tirano: chi ottiene il risultato più alto vince. In caso di parità, vince chi ha avviato l'azione (di solito l'attaccante)." },
    ]
  },
  {
    id: "movimento",
    label: "🏃 Movimento & Terreno",
    colore: "#27ae60",
    voci: [
      { titolo: "Terreno difficile", testo: "Ogni metro di movimento costa 2 m. Neve profonda, acquitrini, macerie, mobili rovesciati." },
      { titolo: "Scatto", testo: "Azione: movimento extra = velocità base. Con velocità 9 m puoi percorrere fino a 18 m totali." },
      { titolo: "Scalare", testo: "Costa 1 m extra per metro scalato (terreno difficile). Con velocità di arrampicata: nessun costo extra." },
      { titolo: "Nuotare", testo: "Costa 1 m extra per metro nuotato. Con velocità di nuoto: nessun costo extra." },
      { titolo: "Saltare (lungo)", testo: "Con rincorsa (3 m): salti Forza in piedi. Senza rincorsa: metà. Richiede sufficiente spazio per atterrare." },
      { titolo: "Saltare (alto)", testo: "Con rincorsa: 0,9 m + mod. Forza. Senza rincorsa: metà. Puoi estendere le braccia di altri 0,9 m." },
      { titolo: "Caduta", testo: "1d6 danni contundenti per ogni 3 m caduti (max 20d6 = 60 m). Atterra prono. Caduta su creatura: TS DES CD 15 entrambi, chi cade subisce i danni." },
      { titolo: "Strisciare", testo: "Movimento da prono: costa 1 m extra per metro. Considera terreno difficile." },
      { titolo: "Spazio di una creatura", testo: "Piccola/Media: 1,5×1,5 m. Grande: 3×3 m. Enorme: 4,5×4,5 m. Mastodontica: 6×6 m o più." },
      { titolo: "Muoversi attraverso", testo: "Puoi muoverti nello spazio di alleati e creature di taglia molto diversa dalla tua (almeno 2 categorie). Lo spazio di un nemico è terreno difficile." },
    ]
  },
  {
    id: "luce",
    label: "💡 Luce & Visibilità",
    colore: "#f39c12",
    voci: [
      { titolo: "Luce brillante", testo: "Visibilità normale. Torcia: 6 m. Lanterna: 9 m. Incantesimo Luce: 6 m brillante + 6 m fioca." },
      { titolo: "Luce fioca", testo: "Zona di penombra tra luce e buio. Svantaggio alle prove di Percezione basate sulla vista." },
      { titolo: "Oscurità", testo: "Nessuna luce non magica. Creature senza scurovisione sono effettivamente cieche." },
      { titolo: "Oscurità magica", testo: "Supera la luce non magica e la scurovisione. Solo visione del vero o sensi speciali funzionano." },
      { titolo: "Scurovisione", testo: "Vede nella luce fioca come se fosse brillante, nel buio come se fosse fioca. Non distingue i colori nel buio." },
      { titolo: "Visione nel buio", testo: "Vede perfettamente anche nell'oscurità totale entro un certo raggio. Non influenzata dalla luce fioca." },
      { titolo: "Creatura nascosta", testo: "Attacchi contro di lei: svantaggio. I suoi attacchi: vantaggio. Deve ancora essere in una posizione valida." },
      { titolo: "Copertura ½", testo: "+2 CA e TS DES. Muretto, mobili, altra creatura." },
      { titolo: "Copertura ¾", testo: "+5 CA e TS DES. Feritoia, fessura, tronco spesso." },
      { titolo: "Copertura totale", testo: "Non può essere bersaglio diretto di attacchi o incantesimi. Deve comunque subire effetti ad area." },
    ]
  },
  {
    id: "morte",
    label: "💀 Morte & Stabilizzazione",
    colore: "#555",
    voci: [
      { titolo: "0 punti ferita", testo: "Caduta prono e inizio dei tiri salvezza sulla morte. Se i danni in eccesso raggiungono il PF massimo: morte istantanea." },
      { titolo: "Tiro salvezza sulla morte", testo: "All'inizio del tuo turno: d20 senza modificatori. 10+: successo. 1-9: fallimento. 3 successi: stabile. 3 fallimenti: morte." },
      { titolo: "1 naturale", testo: "Conta come 2 fallimenti nel tiro salvezza sulla morte." },
      { titolo: "20 naturale", testo: "Torni a 1 PF immediatamente." },
      { titolo: "Danni a 0 PF", testo: "Ogni colpo subito a 0 PF conta come 1 fallimento. Un colpo critico conta come 2 fallimenti." },
      { titolo: "Stabilizzazione", testo: "Azione di Medicina CD 10 o incantesimo di cura: la creatura è stabile. Non tira più TS sulla morte ma rimane a 0 PF." },
      { titolo: "Creatura stabile", testo: "Dopo 1d4 ore recupera 1 PF e si sveglia. Senza cure rimane incosciente." },
      { titolo: "Riprendere conoscenza", testo: "Qualsiasi cura (anche 1 PF) fa tornare cosciente la creatura con i PF curati." },
    ]
  },
  {
    id: "concentrazione",
    label: "🔮 Concentrazione",
    colore: "#16a085",
    voci: [
      { titolo: "Come funziona", testo: "Puoi mantenere un solo incantesimo di concentrazione alla volta. Lanciarne un secondo termina il primo automaticamente." },
      { titolo: "Danni e CD", testo: "Ogni volta che subisci danni: TS Costituzione CD 10 o metà dei danni subiti (se superiore). Fallimento = concentrazione persa." },
      { titolo: "Altre interruzioni", testo: "Incapacitato, morto, o Dissolvi Magie: concentrazione persa automaticamente." },
      { titolo: "Guerra Magica", testo: "Se due incantatori hanno lo stesso incantesimo attivo (es. Guardiani Spirituali), entrambi mantengono il proprio." },
      { titolo: "Accelerazione (Haste)", testo: "Concentrazione. Velocità ×2, +2 CA, vantaggio TS DES, azione extra limitata. Allo scadere: stordito 1 turno." },
      { titolo: "Muro di Fuoco", testo: "Concentrazione, 1 min. 5d8 fuoco a chi inizia il turno nel muro. TS DES per dimezzare." },
      { titolo: "Guardiani Spirituali", testo: "Concentrazione, 10 min. 3d8 radianti/necrotici a chi entra o inizia nel raggio 4,5 m. TS SAG per dimezzare." },
      { titolo: "Invisibilità", testo: "Concentrazione, 1 ora. Termina per il bersaglio se attacca o lancia incantesimi." },
      { titolo: "Volare", testo: "Concentrazione, 10 min. Velocità di volo 18 m. Cade se la concentrazione si interrompe." },
      { titolo: "Sfocatura", testo: "Concentrazione, 1 min. Chiunque ti attacchi ha svantaggio (si disattiva se subisci danni)." },
      { titolo: "Schema Ipnotico", testo: "Concentrazione, 1 min. TS SAG o affascinato + velocità 0. Si interrompe se danneggiato o scosso." },
      { titolo: "Paura", testo: "Concentrazione, 1 min. Cono 9 m. TS SAG o lascia cadere oggetti + spaventato + si allontana." },
      { titolo: "Lentezza", testo: "Concentrazione, 1 min. Fino a 6 bersagli: velocità ÷2, -2 CA e TS DES, 1 azione O 1 azione bonus per turno." },
      { titolo: "Raggio di Luna", testo: "Concentrazione, 1 min. Colonna 1,5 m raggio. 2d10 radianti a chi entra. TS COS per dimezzare." },
    ]
  },
  {
    id: "riposi",
    label: "🌙 Riposi",
    colore: "#2c3e50",
    voci: [
      { titolo: "Riposo breve (1 ora)", testo: "Spendi Dadi Vita: tira e aggiungi mod. COS per recuperare PF. Alcune feature si ricaricano (es. Seconda Vita del Barbaro, Dissolvi Magie del Warlock)." },
      { titolo: "Riposo lungo (8 ore)", testo: "Recupera tutti i PF e metà dei Dadi Vita totali (min 1). Si recuperano slot incantesimo, feature giornaliere, 1 livello esaurimento." },
      { titolo: "Max 1 riposo lungo/24h", testo: "Non puoi beneficiare di più di un riposo lungo ogni 24 ore." },
      { titolo: "Interruzione riposo breve", testo: "Almeno 1 ora senza attività intensa. Combattere, lanciare incantesimi o marciare lo interrompe." },
      { titolo: "Interruzione riposo lungo", testo: "Se interrotto prima delle 8 ore: nessun beneficio. Puoi dormire e fare la guardia a turni purché si completino le 8 ore." },
      { titolo: "Dadi Vita", testo: "Pari al livello del personaggio. Tipo = dado PF della classe. Recuperi metà (arrotondato per difetto) dopo ogni riposo lungo." },
    ]
  },
  {
    id: "sorpresa",
    label: "⚡ Sorpresa & Iniziativa",
    colore: "#e74c3c",
    voci: [
      { titolo: "Sorpresa", testo: "Il DM decide chi è sorpreso all'inizio del combattimento. Di solito: prova di Furtività del gruppo nascosto vs Percezione passiva dei bersagli." },
      { titolo: "Round di sorpresa", testo: "Le creature sorprese non possono agire nel primo round (né azione, né azione bonus, né reazione). Possono muoversi." },
      { titolo: "Iniziativa", testo: "Tutti tirano 1d20 + mod. Destrezza. Il DM tira per gruppi di mostri identici (o singolarmente per maggior caos)." },
      { titolo: "Parità iniziativa", testo: "Tra PG: decidono loro l'ordine. Tra PNG: decide il DM. Tra PG e PNG: decide il DM o si ritira." },
      { titolo: "Ritardare il turno", testo: "Non è una regola ufficiale 5e, ma molti DM la usano: puoi scegliere di agire dopo nella stessa round, spostando la tua posizione nell'ordine." },
      { titolo: "Iniziativa passiva", testo: "Opzione casa: usa 10 + mod. DES invece di tirare, per velocizzare l'inizio del combattimento." },
    ]
  },
];
