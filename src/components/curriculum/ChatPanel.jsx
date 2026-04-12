import { useState } from 'react'

const INITIAL_MESSAGE = (title) =>
  `Ho costruito il percorso su "${title}". Vuoi espandere qualche area, aggiungere risorse, o modificare il progetto finale?`

export default function ChatPanel({ curriculumTitle }) {
  const [messages, setMessages] = useState([
    { role: 'ai', text: INITIAL_MESSAGE(curriculumTitle) }
  ])
  const [input, setInput] = useState('')

  function send() {
    const text = input.trim()
    if (!text) return
    setMessages(prev => [...prev, { role: 'user', text }])
    setInput('')
    // Placeholder risposta AI — in produzione: chiamata API
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Ottima indicazione. Sto elaborando le modifiche al percorso — questa funzione sarà attiva nella prossima versione.'
      }])
    }, 800)
  }

  return (
    <div style={{
      width: 'var(--chat-panel-width)', minWidth: 'var(--chat-panel-width)',
      borderLeft: '1px solid var(--warm-border)', background: 'white',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid var(--warm-border)',
        fontSize: '.75rem', letterSpacing: '.1em', textTransform: 'uppercase',
        color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)', flexShrink: 0,
      }}>
        💬 Affina il percorso
      </div>

      <div style={{
        flex: 1, overflowY: 'auto', padding: '14px',
        display: 'flex', flexDirection: 'column', gap: '10px',
      }}>
        {messages.map((m, i) => (
          <div key={i} style={{
            maxWidth: '100%', padding: '9px 12px', borderRadius: '10px',
            fontSize: '.8rem', lineHeight: 1.5,
            ...(m.role === 'ai'
              ? { background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
                  color: 'var(--warm-dark)', borderBottomLeftRadius: '2px' }
              : { background: 'var(--warm-dark)', color: 'var(--cream)',
                  alignSelf: 'flex-end', borderBottomRightRadius: '2px' }
            ),
          }}>
            {m.text}
          </div>
        ))}
      </div>

      <div style={{
        padding: '12px', borderTop: '1px solid var(--warm-border)',
        display: 'flex', gap: '8px', flexShrink: 0,
      }}>
        <input
          style={{
            flex: 1, padding: '8px 12px', border: '1px solid var(--warm-border)',
            borderRadius: '6px', fontFamily: 'var(--font-serif)',
            fontSize: '.82rem', background: 'var(--cream)', outline: 'none',
          }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Chiedi modifiche o espansioni…"
        />
        <button onClick={send} style={{
          background: 'var(--warm-dark)', color: 'var(--cream)', border: 'none',
          borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '.8rem',
        }}>→</button>
      </div>
    </div>
  )
}
