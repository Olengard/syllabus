import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthScreen() {
  const [mode, setMode]       = useState('login') // 'login' | 'register' | 'reset'
  const [email, setEmail]     = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg]         = useState(null) // { type: 'error'|'ok', text }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setMsg(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg({ type: 'error', text: error.message })
    } else if (mode === 'register') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setMsg({ type: 'error', text: error.message })
      else setMsg({ type: 'ok', text: "Controlla la tua email per confermare l'account." })
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email)
      if (error) setMsg({ type: 'error', text: error.message })
      else setMsg({ type: 'ok', text: 'Email di recupero inviata.' })
    }

    setLoading(false)
  }

  const inp = {
    width: '100%', padding: '10px 14px', marginBottom: '12px',
    border: '1px solid var(--warm-border)', borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-serif)', fontSize: '.92rem',
    background: 'var(--cream)', color: 'var(--warm-dark)', outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-cream)', padding: '24px',
    }}>
      <div style={{
        width: '100%', maxWidth: '380px',
        background: 'var(--cream)', border: '1px solid var(--warm-border)',
        borderRadius: 'var(--radius-lg)', padding: '36px 32px',
        boxShadow: 'var(--shadow-md)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.6rem',
            fontStyle: 'italic', color: 'var(--warm-dark)', marginBottom: '4px',
          }}>
            Syllabus
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '.6rem',
            letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--warm-mid)',
          }}>
            {mode === 'login'    ? 'Accedi al tuo percorso'
           : mode === 'register' ? 'Crea il tuo account'
           :                       'Recupera la password'}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            style={inp} type="email" required
            placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)}
          />
          {mode !== 'reset' && (
            <input
              style={inp} type="password" required
              placeholder="Password" value={password}
              onChange={e => setPassword(e.target.value)}
            />
          )}

          {msg && (
            <div style={{
              fontSize: '.78rem', padding: '8px 12px', borderRadius: 'var(--radius-sm)',
              marginBottom: '12px',
              background: msg.type === 'error' ? '#fce8e8' : '#e8f5e9',
              color:      msg.type === 'error' ? '#b71c1c' : '#1b5e20',
              border: `1px solid ${msg.type === 'error' ? '#f5c6c6' : '#c8e6c9'}`,
            }}>
              {msg.text}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '11px', border: 'none',
            borderRadius: 'var(--radius-md)', cursor: loading ? 'default' : 'pointer',
            background: 'var(--warm-dark)', color: 'var(--cream)',
            fontFamily: 'var(--font-mono)', fontSize: '.75rem',
            letterSpacing: '.08em', opacity: loading ? .6 : 1,
          }}>
            {loading ? '…'
              : mode === 'login'    ? 'Accedi'
              : mode === 'register' ? 'Registrati'
              :                       'Invia email di recupero'}
          </button>
        </form>

        {/* Link secondari */}
        <div style={{
          marginTop: '18px', display: 'flex', justifyContent: 'center',
          gap: '16px', flexWrap: 'wrap',
        }}>
          {mode !== 'login' && (
            <span onClick={() => { setMode('login'); setMsg(null) }} style={linkStyle}>
              Accedi
            </span>
          )}
          {mode !== 'register' && (
            <span onClick={() => { setMode('register'); setMsg(null) }} style={linkStyle}>
              Crea account
            </span>
          )}
          {mode !== 'reset' && (
            <span onClick={() => { setMode('reset'); setMsg(null) }} style={linkStyle}>
              Password dimenticata?
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const linkStyle = {
  fontFamily: 'var(--font-mono)', fontSize: '.68rem',
  color: 'var(--warm-mid)', cursor: 'pointer', textDecoration: 'underline',
}
