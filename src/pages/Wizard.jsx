import { useState, useEffect, useRef } from 'react'
import WizardShell, { WizardDots, wizardStyle as ws } from '../components/wizard/WizardShell'
import ChipGroup from '../components/wizard/ChipGroup'
import { generateFocusChips, generateCurriculum } from '../lib/generate'

const TOTAL_STEPS = 6

// Chip contestuali per argomento — in produzione: chiamata API
const CHIP_BANK = {
  jazz:     ['Scene locali e club storici','Evoluzione degli stili (bebop → modale → free)','Figure e musicisti chiave','Rapporto con le lotte civili afroamericane',"Linguaggio dell'improvvisazione",'Strumenti e interazione ensemble','Influenza su rock e musica popolare','Discografia fondamentale'],
  shanghai: ['Urbanistica e trasformazione del paesaggio','Relazioni con le potenze occidentali','Cinema e arti visive','Economia, commercio e finanza internazionale','Vita quotidiana e cultura popolare','Letteratura e identità cinese moderna','Architettura coloniale e Art Déco','Politica e storia del Novecento'],
  gotica:   ['Origini e contesto romantico','Atmosfera, spazio e architettura nel testo','Il soprannaturale come categoria estetica','Genere, corpo e sessualità','Autori fondamentali e opere canoniche','Gothic revival e decadentismo','Influenza su horror e weird fiction contemporanea','Adattamenti cinematografici e televisivi'],
  default:  ['Storia e contesto','Figure e autori chiave','Teoria e concetti fondamentali','Applicazioni pratiche','Estetica e stile','Confronto con altre tradizioni','Ricezione critica e influenza','Produzione contemporanea'],
}

function detectTopic(s) {
  s = s.toLowerCase()
  if (/jazz|blues|musica|coltrane|miles/.test(s))       return 'jazz'
  if (/shanghai|cina|cinese|pechino/.test(s))           return 'shanghai'
  if (/gotica|gotico|gothic|horror|walpole/.test(s))    return 'gotica'
  return 'default'
}

function inputStyle() {
  return {
    width: '100%', padding: '11px 14px', border: '1px solid var(--warm-border)',
    borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-serif)',
    fontSize: '.95rem', background: 'var(--cream)', color: 'var(--warm-dark)',
    outline: 'none', marginBottom: '16px',
  }
}

export default function Wizard({ curricula, onComplete, onCancel }) {
  const [step, setStep] = useState(1)
  // Step 1
  const [topic, setTopic] = useState('')
  // Step 2
  const [focusOptions, setFocusOptions] = useState([])
  const [focusLoading, setFocusLoading] = useState(false)
  const [focusSelected, setFocusSelected] = useState([])
  const [focusNote, setFocusNote] = useState('')
  // Step 3
  const [duration, setDuration] = useState('2–3 mesi')
  const [level, setLevel] = useState('Ho già basi solide')
  // Step 4
  const [mustHaves, setMustHaves] = useState([])
  const [mustHaveInput, setMustHaveInput] = useState('')
  // Step 5
  const [connection, setConnection] = useState('Nessun collegamento')
  // Step 6
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [generatedData, setGeneratedData] = useState(null)

  const topicRef = useRef()

  function next() { setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function prev() { setStep(s => Math.max(s - 1, 1)) }
  function skip() { setStep(s => Math.min(s + 1, TOTAL_STEPS)) }

  function goToStep2() {
    if (!topic.trim()) return
    setStep(2)
    setFocusLoading(true)
    setFocusSelected([])
    setFocusOptions([])

    generateFocusChips(topic)
      .then(chips => {
        setFocusOptions(chips)
        setFocusSelected(chips.slice(0, 2))
      })
      .catch(() => {
        // Fallback locale se l'API non è configurata o va in errore
        const key = detectTopic(topic)
        const chips = CHIP_BANK[key]
        setFocusOptions(chips)
        setFocusSelected(chips.slice(0, 2))
      })
      .finally(() => setFocusLoading(false))
  }

  // Avvia la generazione non appena si arriva allo step 6
  useEffect(() => {
    if (step !== 6) return
    setGenerating(true)
    setGenerateError(null)
    setGeneratedData(null)

    generateCurriculum({
      topic,
      focusAreas: focusSelected,
      timeCommitment: duration,
      level,
      mustHaves,
    })
      .then(data => setGeneratedData(data))
      .catch(e => setGenerateError(e.message))
      .finally(() => setGenerating(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  function addMustHave() {
    const v = mustHaveInput.trim()
    if (!v || mustHaves.includes(v)) return
    setMustHaves(prev => [...prev, v])
    setMustHaveInput('')
  }

  function handleComplete() {
    onComplete(generatedData ?? {
      title: topic,
      topic,
      focusAreas: focusSelected,
      timeCommitment: duration,
      level,
      mustHaves,
      resources: [],
      referenceSections: [],
      aiSuggestions: [],
    })
  }

  const durations = ['2–4 settimane', '2–3 mesi', '6 mesi', '1 anno o più', 'Progetto aperto']
  const levels    = ['Principiante', 'Ho già basi solide', 'Già esperto']
  const connOptions = ['Nessun collegamento', ...curricula.map(c => c.title)]

  return (
    <WizardShell>
      {/* ── Step 1: argomento ── */}
      {step === 1 && (
        <>
          <div style={ws.stepLabel}>Passo 1 di {TOTAL_STEPS} — Argomento</div>
          <div style={ws.question}>Di cosa vuoi occuparti?</div>
          <div style={ws.sub}>
            Scrivi liberamente — possiamo restringere insieme.{' '}
            <span style={{ fontSize: '.78rem' }}>
              Prova:{' '}
              {['jazz anni cinquanta', 'Shanghai e la sua storia', 'letteratura gotica'].map(ex => (
                <a key={ex} href="#" style={{ color: 'var(--warm-accent)', marginRight: '8px' }}
                   onClick={e => { e.preventDefault(); setTopic(ex) }}>
                  {ex}
                </a>
              ))}
            </span>
          </div>
          <input
            ref={topicRef}
            style={inputStyle()}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && topic.trim() && goToStep2()}
            placeholder="es. filosofia stoica, jazz anni '50, architettura…"
            autoFocus
          />
          <div style={ws.nav}>
            <button style={ws.btnBack} onClick={onCancel}>Annulla</button>
            <button style={{ ...ws.btnNext, opacity: topic.trim() ? 1 : .4 }}
                    disabled={!topic.trim()} onClick={goToStep2}>
              Continua →
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: fuoco dinamico ── */}
      {step === 2 && (
        <>
          <div style={ws.stepLabel}>Passo 2 di {TOTAL_STEPS} — Fuoco</div>
          <div style={ws.question}>Quali aspetti ti interessano?</div>
          <div style={ws.sub}>Seleziona tutto quello che ti sembra rilevante.</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: '.6rem', letterSpacing: '.1em',
              textTransform: 'uppercase', color: 'var(--warm-mid)',
              background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
              borderRadius: 'var(--radius-sm)', padding: '2px 7px',
            }}>
              {focusLoading ? '⧖ elaborazione…' : `✦ suggeriti per "${topic}"`}
            </span>
          </div>
          <ChipGroup
            options={focusOptions}
            selected={focusSelected}
            loading={focusLoading}
            onChange={setFocusSelected}
          />
          <input style={inputStyle()} value={focusNote}
                 onChange={e => setFocusNote(e.target.value)}
                 placeholder="Aggiungi un aspetto specifico (opzionale)…" />
          <div style={ws.nav}>
            <button style={ws.btnBack} onClick={prev}>← Indietro</button>
            <button style={{ ...ws.btnNext, opacity: focusLoading ? .4 : 1 }}
                    disabled={focusLoading} onClick={next}>
              Continua →
            </button>
          </div>
        </>
      )}

      {/* ── Step 3: tempo e livello ── */}
      {step === 3 && (
        <>
          <div style={ws.stepLabel}>Passo 3 di {TOTAL_STEPS} — Tempo e livello</div>
          <div style={ws.question}>Quanto tempo vuoi dedicarci?</div>
          <div style={ws.sub}>Guida il numero e la densità delle risorse consigliate.</div>
          <ChipGroup options={durations} selected={[duration]} single onChange={([v]) => setDuration(v)} />
          <div style={{ ...ws.question, marginTop: '16px', fontSize: '1.05rem' }}>Da dove parti?</div>
          <div style={{ ...ws.sub, marginTop: '5px' }}>Orienta il tipo di risorse proposte.</div>
          <ChipGroup options={levels} selected={[level]} single onChange={([v]) => setLevel(v)} />
          <div style={ws.nav}>
            <button style={ws.btnBack} onClick={prev}>← Indietro</button>
            <button style={ws.btnNext} onClick={next}>Continua →</button>
          </div>
        </>
      )}

      {/* ── Step 4: punti fermi (opzionale) ── */}
      {step === 4 && (
        <>
          <div style={ws.stepLabel}>Passo 4 di {TOTAL_STEPS} — Punti fermi</div>
          <span style={ws.optBadge}>⬡ Opzionale</span>
          <div style={ws.question}>Ci sono autori o opere che non possono mancare?</div>
          <div style={ws.sub}>Entrano nella generazione del percorso — diverso dall'affinarlo dopo via chat.</div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            <input style={{ ...inputStyle(), margin: 0, flex: 1 }}
                   value={mustHaveInput}
                   onChange={e => setMustHaveInput(e.target.value)}
                   onKeyDown={e => e.key === 'Enter' && addMustHave()}
                   placeholder="es. Coltrane, A Love Supreme…" />
            <button onClick={addMustHave} style={{
              padding: '9px 14px', background: 'var(--warm-soft)',
              border: '1px solid var(--warm-border)', borderRadius: 'var(--radius-md)',
              cursor: 'pointer', fontSize: '.85rem',
            }}>＋</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', minHeight: '32px', marginBottom: '8px' }}>
            {mustHaves.map(tag => (
              <div key={tag} style={{
                background: 'var(--warm-dark)', color: 'var(--cream)',
                padding: '4px 10px', borderRadius: '20px', fontSize: '.78rem',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}>
                {tag}
                <span style={{ cursor: 'pointer', opacity: .6, fontSize: '.7rem' }}
                      onClick={() => setMustHaves(prev => prev.filter(t => t !== tag))}>×</span>
              </div>
            ))}
          </div>
          <div style={ws.nav}>
            <button style={ws.btnBack} onClick={prev}>← Indietro</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <button style={ws.btnNext} onClick={next}>Continua →</button>
              <button style={ws.btnSkip} onClick={skip}>Salta questo passo</button>
            </div>
          </div>
        </>
      )}

      {/* ── Step 5: connessioni (opzionale) ── */}
      {step === 5 && (
        <>
          <div style={ws.stepLabel}>Passo 5 di {TOTAL_STEPS} — Connessioni</div>
          <span style={ws.optBadge}>⬡ Opzionale</span>
          <div style={ws.question}>È collegato a un percorso esistente?</div>
          <div style={ws.sub}>Permette di segnalare sovrapposizioni e suggerire risorse condivise.</div>
          <ChipGroup options={connOptions} selected={[connection]} single onChange={([v]) => setConnection(v)} />
          <div style={ws.nav}>
            <button style={ws.btnBack} onClick={prev}>← Indietro</button>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <button style={ws.btnNext} onClick={next}>Genera percorso →</button>
              <button style={ws.btnSkip} onClick={skip}>Salta questo passo</button>
            </div>
          </div>
        </>
      )}

      {/* ── Step 6: generazione ── */}
      {step === 6 && (
        <>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

          <div style={ws.stepLabel}>
            Passo 6 di {TOTAL_STEPS} —{' '}
            {generating ? 'In generazione…' : generateError ? 'Qualcosa non va' : 'Percorso pronto'}
          </div>

          <div style={ws.question}>
            {generating
              ? 'Sto costruendo il tuo percorso.'
              : generateError
              ? 'Errore durante la generazione.'
              : `"${generatedData?.title ?? topic}" è pronto.`}
          </div>

          <div style={ws.sub}>
            {generating && (
              <>
                Seleziono risorse per <em>{topic}</em>, livello {level.toLowerCase()}, {duration}.
                {mustHaves.length > 0 && <> Punti fermi: <em>{mustHaves.join(', ')}</em>.</>}
              </>
            )}
            {generateError && (
              <span style={{ color: '#c0392b' }}>
                {generateError}
                <br />
                <a href="#" style={{ color: 'var(--warm-accent)' }}
                   onClick={e => { e.preventDefault(); setStep(5); setTimeout(() => setStep(6), 50) }}>
                  Riprova
                </a>
              </span>
            )}
            {!generating && !generateError && generatedData && (
              <>
                {generatedData.description}
              </>
            )}
          </div>

          {/* Indicatore di loading */}
          {generating && (
            <div style={{ textAlign: 'center', padding: '28px 0', fontSize: '2rem' }}>
              <span style={{ display: 'inline-block', animation: 'spin 3s linear infinite' }}>⧖</span>
            </div>
          )}

          {/* Anteprima mini quando il risultato è pronto */}
          {!generating && !generateError && generatedData && (
            <div style={{
              background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
              borderRadius: 'var(--radius-md)', padding: '12px 16px', marginTop: '8px',
              display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '.6rem',
                letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--warm-mid)',
              }}>
                {generatedData.resources?.length ?? 0} risorse
                {generatedData.referenceSections?.length > 0 &&
                  ` · ${generatedData.referenceSections.map(s => s.label).join(', ')}`}
              </div>
              {generatedData.aiSuggestions?.slice(0, 2).map((s, i) => (
                <div key={i} style={{ fontSize: '.72rem', color: 'var(--warm-mid)', fontStyle: 'italic' }}>
                  ↳ correlato: {s.title}
                </div>
              ))}
            </div>
          )}

          <div style={{ ...ws.nav, marginTop: '20px' }}>
            <button style={ws.btnBack} onClick={prev} disabled={generating}>← Indietro</button>
            <button
              style={{ ...ws.btnNext, opacity: (!generating && (generatedData || generateError)) ? 1 : .35 }}
              disabled={generating || (!generatedData && !generateError)}
              onClick={handleComplete}
            >
              Vedi il percorso →
            </button>
          </div>
        </>
      )}

      <WizardDots current={step} total={TOTAL_STEPS} />
    </WizardShell>
  )
}
