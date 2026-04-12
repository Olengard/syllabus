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

export default function Header({ onLogoClick }) {
  return (
    <header style={s.header}>
      <div style={s.logo} onClick={onLogoClick}>
        Syllabus
        <span style={s.logoSub}>— Commonplace</span>
      </div>
      <nav style={s.nav}>
        <a style={s.navLink} href="https://bookshelf.commonplaceapp.org"
           target="_blank" rel="noreferrer">↗ BookShelf</a>
        <a style={s.navLink} href="https://footnote.commonplaceapp.org"
           target="_blank" rel="noreferrer">↗ Footnote</a>
        <a style={s.navLink} href="https://listens.commonplaceapp.org"
           target="_blank" rel="noreferrer">↗ ListenS</a>
      </nav>
    </header>
  )
}
