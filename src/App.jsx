import { useState, useEffect } from 'react'
import Header from './components/layout/Header'
import Sidebar from './components/layout/Sidebar'
import Home from './pages/Home'
import Wizard from './pages/Wizard'
import Curriculum from './pages/Curriculum'
import AuthScreen from './pages/Auth'
import { supabase, loadCurricula, saveCurriculum, deleteCurriculum, updateCurriculum } from './lib/supabase'
import { useMobile } from './hooks/useMobile'
import './App.css'

// ---------------------------------------------------------------------------
// Dati mock — usati solo se Supabase non è configurato o l'utente non è loggato
// (utili anche per sviluppo locale senza .env)
// ---------------------------------------------------------------------------
const MOCK_CURRICULA = [
  {
    id: 'mock-1',
    title: 'Stoicismo romano',
    topic: 'Stoicismo romano',
    focusAreas: ['Storia e contesto', 'Figure chiave', 'Teoria e concetti'],
    timeCommitment: '6 mesi',
    level: 'Avanzato',
    progressPct: 40,
    resources: [],
    connections: [],
    aiSuggestions: [],
    referenceSections: [],
  },
  {
    id: 'mock-2',
    title: 'Jazz americano, 1950–1970',
    topic: 'Jazz americano',
    focusAreas: ['Storia e contesto', 'Figure e musicisti chiave', 'Estetica e stile'],
    timeCommitment: '3 mesi',
    level: 'Intermedio',
    progressPct: 15,
    resources: [],
    connections: [
      { id: 'c-1', connectedCurriculumId: null,
        isAiSuggestion: false,
        title: 'Musica afroamericana del Novecento' },
    ],
    aiSuggestions: [
      { title: 'Blues del Delta e origini del jazz',
        reason: 'Le radici che questo percorso presuppone: Bessie Smith, Robert Johnson, la Grande Migrazione.' },
      { title: 'Harlem Renaissance (1920–1940)',
        reason: 'Il contesto culturale che precede e nutre il jazz moderno: letteratura, pittura, teatro afroamericano.' },
    ],
    referenceSections: [
      {
        type: 'dischi',
        label: 'Dischi di riferimento',
        items: [
          { title: 'Kind of Blue', author: 'Miles Davis', year: '1959' },
          { title: 'A Love Supreme', author: 'John Coltrane', year: '1965' },
          { title: 'Mingus Ah Um', author: 'Charles Mingus', year: '1959' },
          { title: 'The Shape of Jazz to Come', author: 'Ornette Coleman', year: '1959' },
          { title: 'Brilliant Corners', author: 'Thelonious Monk', year: '1957' },
        ],
      },
    ],
  },
  {
    id: 'mock-3',
    title: 'Architettura brutalista',
    topic: 'Architettura brutalista',
    focusAreas: ['Storia e contesto', 'Estetica e stile'],
    timeCommitment: '1 mese',
    level: 'Introduttivo',
    progressPct: 0,
    resources: [],
    connections: [],
    aiSuggestions: [],
    referenceSections: [
      {
        type: 'edifici',
        label: 'Edifici da vedere',
        items: [
          { title: 'Barbican Estate', author: 'Chamberlin, Powell & Bon',
            year: '1982', location: 'Londra, Regno Unito' },
          { title: "Unité d'Habitation", author: 'Le Corbusier',
            year: '1952', location: 'Marsiglia, Francia' },
          { title: 'Habitat 67', author: 'Moshe Safdie',
            year: '1967', location: 'Montréal, Canada' },
          { title: 'National Theatre', author: 'Denys Lasdun',
            year: '1976', location: 'Londra, Regno Unito' },
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [screen, setScreen] = useState('home')
  const [activeCurriculumId, setActiveCurriculumId] = useState('mock-2')
  const [curricula, setCurricula] = useState(MOCK_CURRICULA)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const isMobile = useMobile()
  // usingSupabase deve stare DOPO la dichiarazione di user
  const [wizardPrefill, setWizardPrefill] = useState(null)
  const usingSupabase = !!user && !!import.meta.env.VITE_SUPABASE_URL

  // ── Auth: sessione corrente + listener ──────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null)
      })
      .catch(e => {
        console.error('[Syllabus] getSession error:', e)
        setUser(null)
      })
      .finally(() => setAuthLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Carica curricula quando l'utente è autenticato ──────────────────────
  useEffect(() => {
    if (!user) { setCurricula([]); setLoading(false); return }
    async function init() {
      try {
        const data = await loadCurricula()
        setCurricula(data)
        if (data.length > 0) setActiveCurriculumId(data[0].id)
      } catch (e) {
        console.error('[Syllabus] loadCurricula:', e.message)
        // Non caricare i mock su errore — l'utente è loggato, i suoi dati
        // semplicemente non sono ancora disponibili (es. migration non eseguita).
        setCurricula([])
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [user])

  const activeCurriculum = curricula.find(c => c.id === activeCurriculumId) ?? null

  function openCurriculum(id) {
    setActiveCurriculumId(id)
    setScreen('curriculum')
  }

  function openWizard(prefill = null) {
    setWizardPrefill(prefill ?? null)
    setScreen('wizard')
  }

  async function onDelete(id) {
    if (!window.confirm('Eliminare questo percorso? L\'azione non e\' reversibile.')) return
    if (usingSupabase) {
      try { await deleteCurriculum(id) }
      catch (e) { alert(`Errore nell\'eliminazione: ${e.message}`); return }
    }
    setCurricula(prev => prev.filter(c => c.id !== id))
    if (activeCurriculumId === id) { setScreen('home'); setActiveCurriculumId(null) }
  }

  async function handleCurriculumUpdate(id, patch) {
    await updateCurriculum(id, patch)
    setCurricula(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  async function onWizardComplete(wizardData) {
    if (usingSupabase) {
      try {
        const saved = await saveCurriculum(wizardData)
        if (saved) {
          setCurricula(prev => [saved, ...prev])
          setActiveCurriculumId(saved.id)
          setScreen('curriculum')
          return
        }
      } catch (e) {
        console.error('[Syllabus] onWizardComplete Supabase error:', e)
        // Mostra errore visibile invece di perdere silenziosamente il percorso
        alert(`Errore nel salvataggio: ${e.message}\n\nControlla che la migration SQL sia stata eseguita su Supabase e che le variabili d'ambiente siano configurate su Vercel.`)
        return
      }
    }
    // Fallback solo se Supabase non è configurato (sviluppo locale senza .env)
    const id = `local-${Date.now()}`
    const newEntry = {
      ...wizardData,
      id,
      progressPct: 0,
      referenceSections: wizardData.referenceSections ?? [],
      resources: wizardData.resources ?? [],
      connections: [],
      aiSuggestions: [],
    }
    setCurricula(prev => [newEntry, ...prev])
    setActiveCurriculumId(id)
    setScreen('curriculum')
  }

  if (authLoading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'var(--font-serif)',
        color: 'var(--warm-mid)', fontSize: '1rem', background: 'var(--bg-cream)',
      }}>
        …
      </div>
    )
  }

  if (!user) return <AuthScreen />

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontFamily: 'var(--font-serif)',
        color: 'var(--warm-mid)', fontSize: '1rem', background: 'var(--bg-cream)',
      }}>
        Caricamento percorsi…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header onLogoClick={() => setScreen('home')} user={user} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* Sidebar: visibile solo su desktop */}
        {!isMobile && (
          <Sidebar
            curricula={curricula}
            activeCurriculumId={activeCurriculumId}
            onSelect={openCurriculum}
            onNew={openWizard}
          />
        )}

        <main style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>
          {screen === 'home' && (
            <Home curricula={curricula} onSelect={openCurriculum} onNew={openWizard} onDelete={onDelete} isMobile={isMobile} />
          )}
          {screen === 'wizard' && (
            <Wizard curricula={curricula} onComplete={onWizardComplete} onCancel={() => { setWizardPrefill(null); setScreen('home') }} prefill={wizardPrefill} />
          )}
          {screen === 'curriculum' && activeCurriculum && (
            <Curriculum
              curriculum={activeCurriculum}
              allCurricula={curricula}
              onNavigate={openCurriculum}
              onNewFromSuggestion={(title) => openWizard({ prefillTitle: title })}
              onBack={() => setScreen('home')}
              onDelete={onDelete} onUpdate={handleCurriculumUpdate}
              isMobile={isMobile}
            />
          )}

          {/* FAB mobile: + Nuovo percorso (solo su home/curriculum, non nel wizard) */}
          {isMobile && screen !== 'wizard' && (
            <button
              onClick={openWizard}
              style={{
                position: 'fixed', bottom: '24px', right: '20px',
                width: '52px', height: '52px', borderRadius: '50%',
                background: 'var(--warm-accent)', color: 'var(--cream)',
                border: 'none', fontSize: '1.6rem', cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0,0,0,.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 100,
              }}
              title="Nuovo percorso"
            >
              ＋
            </button>
          )}
        </main>
      </div>
    </div>
  )
}
