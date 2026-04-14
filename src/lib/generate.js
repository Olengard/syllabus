/**
 * generate.js — Chiamate all'API Anthropic per la generazione AI in Syllabus.
 *
 * Richiede VITE_ANTHROPIC_API_KEY nel .env.
 * ⚠️  La chiave è visibile nel bundle browser: accettabile per uso personale
 *     non pubblicato. Non deployare pubblicamente senza una protezione server-side.
 */

const API_URL = 'https://api.anthropic.com/v1/messages'

function getKey() {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY mancante nel .env — aggiungila e riavvia il dev server.')
  return key
}

async function callClaude(model, systemPrompt, userMessage, maxTokens = 1024) {
  // Connessione con timeout di 30s solo per l'handshake iniziale
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
        stream: true,   // streaming SSE — evita timeout su risposte lunghe
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    })
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('Connessione lenta: impossibile raggiungere l\'API. Controlla la connessione.')
    throw new Error(`Errore di rete: ${err.message}`)
  } finally {
    clearTimeout(connectTimeout)
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(`API error ${res.status}: ${errBody.error?.message ?? 'errore sconosciuto'}`)
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
      buffer = lines.pop() // l'ultima riga potrebbe essere incompleta
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
  // Rimuove eventuali code fences ```json … ```
  return text.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
}

// ---------------------------------------------------------------------------
// Step 2 — Chip per le aree di fuoco
// ---------------------------------------------------------------------------

/**
 * Genera 6-8 chip tematici per l'argomento dato.
 * Usa Haiku per velocità (risposta attesa < 2s).
 * In caso di errore API, rilancia l'eccezione — il chiamante gestisce il fallback.
 */
export async function generateFocusChips(topic) {
  const text = await callClaude(
    'claude-haiku-4-5-20251001',
    `Sei un assistente per la progettazione di percorsi di studio personali.
Quando ricevi un argomento, generi 8 aree tematiche distinte (chip) che coprono
angolature diverse: storia, figure chiave, estetica, teoria, influenze, ecc.
Ogni chip è una frase breve in italiano (4-8 parole).
Rispondi SOLO con un array JSON di stringhe. Zero testo aggiuntivo.`,
    `Argomento: "${topic}"`,
    512,
  )

  try {
    const arr = JSON.parse(extractJson(text))
    if (Array.isArray(arr) && arr.length > 0) return arr
  } catch { /* continua al fallback testuale */ }

  // Fallback: parsing riga per riga se il JSON è malformato
  return text
    .split('\n')
    .map(l => l.replace(/^[-*"'\d.\s]+/, '').replace(/["',]+$/, '').trim())
    .filter(l => l.length > 3 && l.length < 80)
    .slice(0, 8)
}

// ---------------------------------------------------------------------------
// Step 6 — Generazione curriculum completo
// ---------------------------------------------------------------------------

/** Numero di risorse in base alla durata del percorso */
function targetResourceCount(timeCommitment) {
  if (/settiman/i.test(timeCommitment)) return 5
  if (/2.3\s*mes/i.test(timeCommitment)) return 8
  if (/6\s*mes/i.test(timeCommitment)) return 12
  if (/anno/i.test(timeCommitment)) return 16
  return 9 // Progetto aperto
}

/**
 * Genera il curriculum completo.
 * Restituisce un oggetto pronto per essere passato a saveCurriculum() e poi a Curriculum.jsx.
 *
 * @param {{ topic, focusAreas, timeCommitment, level, mustHaves }} params
 */
export async function generateCurriculum({ topic, focusAreas, timeCommitment, level, mustHaves }) {
  const n = targetResourceCount(timeCommitment)
  const mustStr = mustHaves?.length
    ? `\nPunti fermi (devono comparire nel percorso): ${mustHaves.join(', ')}.`
    : ''

  const system = `Sei un esperto di curricula di studio umanistici, artistici e culturali.
Crei percorsi di apprendimento personali ricchi e precisi, con opere e autori reali.
Rispondi SEMPRE e SOLO con JSON valido. Zero testo introduttivo, zero markdown.`

  const prompt = `Crea un percorso di studio con questi parametri:

Argomento: "${topic}"
Aree di interesse: ${focusAreas.join(', ')}
Durata prevista: ${timeCommitment}
Livello di partenza: ${level}${mustStr}

Restituisci questo oggetto JSON (tutti i testi in italiano):

{
  "title": "titolo preciso e raffinato del percorso",
  "description": "2-3 frasi sull'approccio e sugli obiettivi formativi",
  "resources": [
    {
      "title": "titolo esatto dell'opera",
      "author": "Autore, anno",
      "type": "libro|saggio|film|podcast|articolo|documentario",
      "description": "1-2 frasi: perché questa risorsa è rilevante in questo percorso",
      "phase": "primary|secondary|other"
    }
  ],
  "referenceSections": [
    {
      "type": "dischi|dipinti|sculture|edifici|film_essenziali|luoghi|fotografie|performance",
      "label": "Etichetta sezione (es. Dischi di riferimento)",
      "items": [
        {
          "title": "titolo",
          "author": "autore o artista",
          "year": "anno",
          "location": "città, paese (solo per edifici e luoghi)",
          "notes": "1 frase di contestualizzazione"
        }
      ]
    }
  ],
  "progettoFinale": "descrizione del progetto o dell'esercizio di sintesi finale",
  "aiSuggestions": [
    { "title": "titolo del percorso correlato", "reason": "1-2 frasi di motivazione" }
  ]
}

VINCOLI:
- Cita esattamente ${n} risorse. Primary: ~35%, secondary: ~35%, other: ~30%.
- Includi risorse in italiano quando esistono opere di qualità equivalente a quelle anglofone.
  Non privilegiare sistematicamente l'inglese: saggisti italiani, traduzioni autorevoli, opere
  italiane originali vanno considerate alla pari. Esempio: se esiste un saggio italiano
  eccellente sullo stesso tema, preferiscilo a uno anglosassone mediocre.
- "referenceSections": includi SOLO se il tema lo giustifica concretamente.
  Musica → dischi. Pittura/scultura → dipinti o sculture. Architettura → edifici.
  Cinema → film_essenziali. Luoghi/cultura materiale → luoghi.
  Lascia array vuoto [] se nessuna sezione è rilevante.
- "aiSuggestions": 2-3 percorsi correlati che completerebbero questo.
- Tutte le opere e gli autori devono essere reali e citabili.`

  const text = await callClaude('claude-sonnet-4-6', system, prompt, 4096)

  let data
  try {
    data = JSON.parse(extractJson(text))
  } catch (e) {
    throw new Error(`Risposta AI non parsabile come JSON: ${e.message}`)
  }

  return {
    title:            data.title        ?? topic,
    description:      data.description  ?? '',
    topic,
    focusAreas,
    timeCommitment,
    level,
    mustHaves:        mustHaves ?? [],
    resources:        (data.resources ?? []).map(r => ({
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
    aiSuggestions:  (data.aiSuggestions ?? []).map(s => ({
      title:  s.title,
      reason: s.reason,
    })),
  }
}
