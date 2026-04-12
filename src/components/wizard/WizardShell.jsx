/* Contenitore visivo del wizard: box centrato + progress dots */
const s = {
  wrap: {
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 20px', overflowY: 'auto', background: 'var(--warm-soft)',
  },
  box: {
    background: 'white', border: '1px solid var(--warm-border)',
    borderRadius: 'var(--radius-lg)', padding: '36px 40px',
    maxWidth: '640px', width: '100%', boxShadow: 'var(--shadow-card)',
  },
  stepLabel: {
    fontFamily: 'var(--font-mono)', fontSize: '.65rem', letterSpacing: '.15em',
    textTransform: 'uppercase', color: 'var(--warm-mid)', marginBottom: '8px',
  },
  question: {
    fontSize: '1.3rem', fontStyle: 'italic', fontFamily: 'var(--font-display)',
    color: 'var(--warm-dark)', marginBottom: '6px', lineHeight: 1.4,
  },
  sub: {
    fontSize: '.82rem', color: 'var(--warm-mid)',
    marginBottom: '22px', lineHeight: 1.6,
  },
  nav: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginTop: '24px',
  },
  btnBack: {
    background: 'none', border: '1px solid var(--warm-border)',
    borderRadius: 'var(--radius-md)', padding: '8px 18px',
    fontSize: '.85rem', color: 'var(--warm-mid)',
  },
  btnNext: {
    background: 'var(--warm-dark)', color: 'var(--cream)',
    border: 'none', borderRadius: 'var(--radius-md)',
    padding: '9px 22px', fontSize: '.85rem',
  },
  btnSkip: {
    background: 'none', border: 'none', fontFamily: 'var(--font-mono)',
    fontSize: '.72rem', color: 'var(--warm-mid)', cursor: 'pointer',
    letterSpacing: '.05em', textDecoration: 'underline', padding: '8px 0',
  },
  optBadge: {
    display: 'inline-block', background: 'var(--warm-soft)',
    border: '1px solid var(--warm-border)', borderRadius: 'var(--radius-sm)',
    fontFamily: 'var(--font-mono)', fontSize: '.62rem', letterSpacing: '.1em',
    textTransform: 'uppercase', color: 'var(--warm-mid)',
    padding: '2px 8px', marginBottom: '10px',
  },
  dots: { display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '20px' },
}

export function WizardDots({ current, total }) {
  return (
    <div style={s.dots}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done = n < current
        const cur = n === current
        return (
          <div key={n} style={{
            height: '7px', borderRadius: cur ? '4px' : '50%',
            width: cur ? '22px' : '7px',
            background: done ? 'var(--warm-light)' : cur ? 'var(--warm-dark)' : 'var(--warm-border)',
            transition: 'all .2s',
          }} />
        )
      })}
    </div>
  )
}

export { s as wizardStyle }
export default function WizardShell({ children }) {
  return (
    <div style={s.wrap}>
      <div style={s.box}>{children}</div>
    </div>
  )
}
