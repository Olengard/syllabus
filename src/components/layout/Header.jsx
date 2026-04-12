const s = {
  header: {
    background: 'var(--warm-dark)', color: 'var(--cream)',
    padding: '0 28px', height: 'var(--header-height)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderBottom: '2px solid var(--warm-accent)', flexShrink: 0,
  },
  logo: {
    fontSize: '1.4rem', letterSpacing: '.08em', fontStyle: 'italic',
    fontFamily: 'var(--font-display)', cursor: 'pointer',
  },
  logoSub: {
    color: 'var(--warm-light)', fontStyle: 'normal', fontSize: '.75rem',
    marginLeft: '10px', letterSpacing: '.15em', textTransform: 'uppercase',
    fontFamily: 'var(--font-mono)',
  },
  nav: { display: 'flex', gap: '18px', alignItems: 'center' },
  navLink: {
    color: 'var(--warm-light)', fontSize: '.8rem', letterSpacing: '.05em',
    fontFamily: 'var(--font-mono)', textDecoration: 'none',
    transition: 'color .15s',
  },
}

import { supabase } from '../../lib/supabase'
import { useMobile } from '../../hooks/useMobile'

export default function Header({ onLogoClick, user }) {
  const isMobile = useMobile()

  function handleSignOut() {
    if (confirm('Disconnettersi da Syllabus?')) supabase.auth.signOut()
  }

  return (
    <header style={s.header}>
      <div style={s.logo} onClick={onLogoClick}>
        Syllabus
        {!isMobile && <span style={s.logoSub}>— Commonplace</span>}
      </div>
      <nav style={s.nav}>
        {!isMobile && (
          <>
            <a style={s.navLink} href="https://bookshelf.commonplaceapp.org"
               target="_blank" rel="noreferrer">↗ BookShelf</a>
            <a style={s.navLink} href="https://footnote.commonplaceapp.org"
               target="_blank" rel="noreferrer">↗ Footnote</a>
            <a style={s.navLink} href="https://listens.commonplaceapp.org"
               target="_blank" rel="noreferrer">↗ ListenS</a>
          </>
        )}
        {user && (
          <button onClick={handleSignOut} title={`Connesso come ${user.email}`} style={{
            background: 'transparent', border: '1px solid var(--warm-light)',
            borderRadius: 'var(--radius-sm)', color: 'var(--warm-light)',
            fontFamily: 'var(--font-mono)', fontSize: '.65rem',
            padding: '3px 8px', cursor: 'pointer', opacity: .7,
            letterSpacing: '.05em',
          }}>
            {isMobile ? '↩' : `${user.email?.split('@')[0]} ↩`}
          </button>
        )}
      </nav>
    </header>
  )
}
