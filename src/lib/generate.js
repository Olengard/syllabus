// generate.js -- Chiamate API Anthropic per Syllabus
// Richiede VITE_ANTHROPIC_API_KEY nel .env

const API_URL = 'https://api.anthropic.com/v1/messages'

function getKey() {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY mancante nel .env')
  return key
}

async function callClaude(model, systemPrompt, userMessage, maxTokens = 1024) {
  const controller = new AbortController()
  const connectTimeout = setTimeout(() => controller.abort(), 30_000)

  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': getKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        stream: true,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Connessione lenta: impossibile raggiungere l\'API.')
    throw new Error('Errore di rete: ' + err.message)
  } finally {
    clearTimeout(connectTimeout)
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error('API error ' + res.status + ': ' + (errBody.error?.message ?? 'errore sconosciuto'))
  }

  // Legge lo stream SSE e accumula il testo
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop()
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') continue
        try {
          const evt = JSON.parse(payload)
          if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
            fullText += evt.delta.text
          }
        } catch { /* ignora righe malformate */ }
      }
    }
  } finally {
    reader.releaseLock()
  }

  if (!fullText) throw new Error('Risposta vuota dall\'API. Riprova.')
  return fullText
}

function extractJson(text) {
  return text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
}

// ---------------------------------------------------------------------------
// Ripara un JSON troncato chiudendo le strutture aperte.
// Strategia in tre passi:
//   1) Parsing normale (caso ottimale)
//   2) Chiusura strutturale: se la stringa e\' troncata mid-token,
//      tronca al punto sicuro e chiude parentesi/virgolette
//   3) Backtrack: rimuove l\'ultimo oggetto incompleto e chiude
// ---------------------------------------------------------------------------
function repairJson(raw) {
  const s = extractJson(raw)

  // Passo 1: parsing normale
  try { return JSON.parse(s) } catch (_) {}

  // Passo 2: analisi strutturale
  const stk  = []   // stack di chiusure attese
  let inStr  = false
  let esc    = false
  let safe   = 0    // ultima posizione fuori da una stringa

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (esc)                 { esc = false; continue }
    if (c === '\\' && inStr) { esc = true;  continue }
    if (c === '"')           { inStr = !inStr; if (!inStr) safe = i + 1; continue }
    if (inStr)               { continue }
    safe = i + 1
    if      (c === '{')              stk.push('}')
    else if (c === '[')              stk.push(']')
    else if (c === '}' || c === ']') stk.pop()
  }

  // Se la stringa era aperta, tronca all\'ultimo punto sicuro
  let fixed = (inStr ? s.slice(0, safe) : s).replace(/,\s*$/, '')
  fixed += stk.reverse().join('')

  try { return JSON.parse(fixed) } catch (_) {}

  // Passo 3: backtrack fino all\'ultima virgola di livello radice
  for (let i = fixed.length - 1; i > 0; i--) {
    if (fixed[i] !== ',') continue
    const sub  = fixed.slice(0, i)
    const stk2 = []
    let ins2 = false, esc2 = false
    for (const c of sub) {
      if (esc2)               { esc2 = false; continue }
      if (c === '\\' && ins2) { esc2 = true;  continue }
      if (c === '"')          { ins2 = !ins2;  continue }
      if (ins2)               { continue }
      if (c === '{' || c === '[') stk2.push(c === '{' ? '}' : ']')
      else if (c === '}' || c === ']') stk2.pop()
    }
    const candidate = sub + stk2.reverse().join('')
    try { return JSON.parse(candidate) } catch (_) {}
  }

  throw new Error('Risposta AI non riparabile: riprova la generazione.')
}

// ---------------------------------------------------------------------------
// Step 2 -- Chip per le aree di fuoco (Haiku, veloce)
// ---------------------------------------------------------------------------

export async function generateFocusChips(topic) {
  const text = await callClaude(
    'claude-haiku-4-5-20251001',
    'Sei un assistente per percorsi di studio personali. ' +
    'Quando ricevi un argomento, generi 8 aree tematiche distinte (chip) che coprono ' +
    'angolature diverse: storia, figure chiave, estetica, teoria, influenze, ecc. ' +
    'Ogni chip e\' una frase breve in italiano (4-8 parole). ' +
    'Rispondi SOLO con un array JSON di stringhe. Zero testo aggiuntivo.',
    'Argomento: "' + topic + '"',
    512,
  )

  try {
    const arr = JSON.parse(extractJson(text))
    if (Array.isArray(arr) && arr.length > 0) return arr
  } catch { /* fallback */ }

  return text
    .split('\n')
    .map(l => l.replace(/^[-*"'\d.\s]+/, '').replace(/["',]+$/, '').trim())
    .filter(l => l.length > 3 && l.length < 80)
    .slice(0, 8)
}


// ---------------------------------------------------------------------------
// Step 6 -- Generazione curriculum completo (Sonnet)
// ---------------------------------------------------------------------------

// Numero di risorse calibrato sulla durata del percorso
function targetResourceCount(timeCommitment) {
  if (/settiman/i.test(timeCommitment)) return 5   // 2-4 settimane: solo essenziali
  if (/2.3\s*mes/i.test(timeCommitment)) return 8  // 2-3 mesi: curato e bilanciato
  if (/6\s*mes/i.test(timeCommitment)) return 12   // 6 mesi: strutturato in fasi
  if (/anno/i.test(timeCommitment)) return 16      // 1 anno: completo e multidimensionale
  if (/aperto/i.test(timeCommitment)) return 22    // Progetto aperto: corpus ampio
  return 9
}

// Istruzioni di struttura specifiche per durata
function durationHint(timeCommitment) {
  if (/settiman/i.test(timeCommitment))
    return 'STRUTTURA: percorso breve e intenso. Scegli SOLO le risorse strettamente essenziali, ' +
           'quelle senza cui il tema rimane incompreso. Almeno il 60% siano "primary". ' +
           'Niente approfondimenti opzionali: zero "other" se non strettamente necessari. ' +
           'Ordina in sequenza logica di lettura, dal piu\' accessibile al piu\' avanzato. ' +
           'Distribuzione fasi: primary ~60%, secondary ~30%, other ~10%.'

  if (/2.3\s*mes/i.test(timeCommitment))
    return 'STRUTTURA: percorso curato e bilanciato. Unisci testi fondamentali e qualche ' +
           'approfondimento tematico. Varieta\' di formati consigliata (libri + saggi o podcast). ' +
           'Distribuzione fasi: primary ~35%, secondary ~35%, other ~30%.'

  if (/6\s*mes/i.test(timeCommitment))
    return 'STRUTTURA: percorso articolato in fasi progressive. Distribuisci le risorse tra ' +
           'fondamenti (primary), approfondimento (secondary) e ampliamento comparativo (other). ' +
           'Includi testi di diverse scuole o prospettive. Varieta\' di formati raccomandata. ' +
           'Distribuzione fasi: primary ~35%, secondary ~35%, other ~30%.'

  if (/anno/i.test(timeCommitment))
    return 'STRUTTURA: corpus completo e multidimensionale. Massima varieta\' di autori, ' +
           'scuole di pensiero, periodi storici e formati. Includi anche testi critici, ' +
           'posizioni minoritarie rilevanti e opere secondarie di qualita\'. ' +
           'Distribuzione fasi: primary ~30%, secondary ~35%, other ~35%.'

  if (/aperto/i.test(timeCommitment))
    return 'STRUTTURA: corpus aperto ed esplorativo, senza scadenza ne\' confini rigidi. ' +
           'NON limitarti agli essenziali: includi testi fondamentali MA ANCHE autori minori ' +
           'significativi, posizioni critiche contrastanti, opere di nicchia di alta qualita\', ' +
           'riferimenti interdisciplinari e comparativi, fonti primarie dove disponibili. ' +
           'Organizza tematicamente piu\' che in sequenza cronologica. ' +
           'La sezione "referenceSections" deve essere particolarmente ricca e articolata. ' +
           'Distribuzione fasi: primary ~25%, secondary ~40%, other ~35%.'

  return 'STRUTTURA: distribuzione equilibrata tra primary, secondary e other (~33% ciascuno).'
}


export async function generateCurriculum({ topic, focusAreas, timeCommitment, level, mustHaves }) {
  const n       = targetResourceCount(timeCommitment)
  const hint    = durationHint(timeCommitment)
  const mustStr = mustHaves?.length
    ? '\nPunti fermi (devono comparire nel percorso): ' + mustHaves.join(', ') + '.'
    : ''

  const system =
    'Sei un esperto di curricula di studio umanistici, artistici e culturali. ' +
    'Crei percorsi di apprendimento personali ricchi e precisi, con opere e autori reali. ' +
    'Rispondi SEMPRE e SOLO con JSON valido. Zero testo introduttivo, zero markdown.'

  const prompt =
    'Crea un percorso di studio con questi parametri:\n\n' +
    'Argomento: "' + topic + '"\n' +
    'Aree di interesse: ' + focusAreas.join(', ') + '\n' +
    'Durata prevista: ' + timeCommitment + '\n' +
    'Livello di partenza: ' + level + mustStr + '\n\n' +
    'Restituisci questo oggetto JSON (tutti i testi in italiano):\n\n' +
    '{\n' +
    '  "title": "titolo preciso e raffinato del percorso",\n' +
    '  "description": "2-3 frasi sull\'approccio e sugli obiettivi formativi",\n' +
    '  "resources": [\n' +
    '    {\n' +
    '      "title": "titolo esatto dell\'opera",\n' +
    '      "author": "Autore, anno",\n' +
    '      "type": "libro|saggio|film|podcast|articolo|documentario",\n' +
    '      "description": "1-2 frasi: perche questa risorsa e\' rilevante",\n' +
    '      "phase": "primary|secondary|other"\n' +
    '    }\n' +
    '  ],\n' +
    '  "referenceSections": [\n' +
    '    {\n' +
    '      "type": "dischi|dipinti|sculture|edifici|film_essenziali|luoghi|fotografie|performance",\n' +
    '      "label": "Etichetta sezione (es. Dischi di riferimento)",\n' +
    '      "items": [\n' +
    '        {\n' +
    '          "title": "titolo",\n' +
    '          "author": "autore o artista",\n' +
    '          "year": "anno",\n' +
    '          "location": "citta, paese (solo per edifici e luoghi)",\n' +
    '          "notes": "1 frase di contestualizzazione"\n' +
    '        }\n' +
    '      ]\n' +
    '    }\n' +
    '  ],\n' +
    '  "progettoFinale": "descrizione del progetto di sintesi finale",\n' +
    '  "aiSuggestions": [\n' +
    '    { "title": "titolo del percorso correlato", "reason": "1-2 frasi di motivazione" }\n' +
    '  ]\n' +
    '}\n\n' +
    'VINCOLI:\n' +
    '- ' + hint + '\n' +
    '- Cita esattamente ' + n + ' risorse totali.\n' +
    '- Includi risorse in italiano se esistono opere di pari livello (saggisti italiani, ' +
    '  traduzioni autorevoli, opere originali italiane). Non preferire sistematicamente l\'inglese.\n' +
    '- "referenceSections": includi SOLO se il tema lo giustifica. Musica: dischi. ' +
    '  Arte: dipinti o sculture. Architettura: edifici. Cinema: film_essenziali. ' +
    '  Lascia [] se non pertinente.\n' +
    '- "aiSuggestions": 2-3 percorsi correlati che completerebbero questo.\n' +
    '- Tutte le opere e gli autori devono essere reali e citabili.'

  // max_tokens 8192: riduce drasticamente i rischi di troncatura anche per percorsi
  // con molte risorse (Progetto aperto = 22 risorse + referenceSections).
  const text = await callClaude('claude-sonnet-4-6', system, prompt, 8192)

  // repairJson tenta parsing normale, poi chiusura strutturale, poi backtrack.
  // In questo modo un troncamento non blocca l\'utente: ottiene il massimo
  // del contenuto gia\' generato, non un errore.
  let data
  try {
    data = repairJson(text)
  } catch (e) {
    throw new Error('Generazione non riuscita: ' + e.message + ' — Riprova.')
  }

  return {
    title:       data.title       ?? topic,
    description: data.description ?? '',
    topic,
    focusAreas,
    timeCommitment,
    level,
    mustHaves: mustHaves ?? [],
    resources: (data.resources ?? []).map(r => ({
      title:       r.title,
      author:      r.author,
      type:        r.type ?? 'libro',
      description: r.description,
      phase:       r.phase ?? 'secondary',
    })),
    referenceSections: (data.referenceSections ?? []).map(s => ({
      type:  s.type,
      label: s.label,
      items: (s.items ?? []).map(item => ({
        title:    item.title,
        author:   item.author,
        year:     item.year,
        location: item.location ?? null,
        notes:    item.notes,
      })),
    })),
    progettoFinale: data.progettoFinale ?? '',
    aiSuggestions: (data.aiSuggestions ?? []).map(s => ({
      title:  s.title,
      reason: s.reason,
    })),
  }
}
