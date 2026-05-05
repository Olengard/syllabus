import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0f0e0b', color: '#e8e0d4', fontFamily: 'Georgia, serif',
          padding: '2rem', textAlign: 'center', gap: '1rem'
        }}>
          <div style={{ fontSize: '2.5rem' }}>&#9888;&#65039;</div>
          <h2 style={{ color: '#c8903a', margin: 0 }}>Qualcosa è andato storto</h2>
          <p style={{ color: '#7a6e64', fontSize: '0.9rem', maxWidth: '480px' }}>
            {this.state.error?.message || 'Errore sconosciuto'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '1rem', padding: '0.6rem 1.4rem',
              background: 'transparent', color: '#c8903a',
              border: '1px solid #c8903a', borderRadius: '4px',
              cursor: 'pointer', fontFamily: 'Georgia, serif', fontSize: '0.9rem'
            }}
          >
            Riprova
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
