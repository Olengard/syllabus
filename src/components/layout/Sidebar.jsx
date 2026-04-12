const s = {
  sidebar: {
    width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)',
    background: 'var(--warm-soft)', borderRight: '1px solid var(--warm-border)',
    display: 'flex', flexDirection: 'column', overflow: 'hidden',
  },
  top: { padding: '16px' },
  newBtn: {
    display: 'block', width: '100%', padding: '9px',
    background: 'var(--warm-accent)', color: 'var(--cream)',
    border: 'none', borderRadius: 'var(--radius-md)',
    fontFamily: 'var(--font-serif)', fontSize: '.85rem',
    cursor: 'pointer', textAlign: 'center',
  },
  section: {
    padding: '0 16px 16px', borderTop: '1px solid var(--warm-border)',
    overflowY: 'auto', flex: 1,
  },
  label: {
    fontSize: '.65rem', letterSpacing: '.15em', textTransform: 'uppercase',
    color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
    padding: '12px 0 8px', display: 'block',
  },
}

function itemStyle(active) {
  return {
    display: 'flex', alignItems: 'flex-start', gap: '8px',
    padding: '7px 10px', borderRadius: '6px', cursor: 'pointer',
    marginBottom: '2px', transition: 'background .15s',
    background: active ? 'var(--warm-dark)' : 'transparent',
    color: active ? 'var(--cream)' : 'var(--warm-dark)',
  }
}

export default function Sidebar({ curricula, activeCurriculumId, onSelect, onNew }) {
  return (
    <aside style={s.sidebar}>
      <div style={s.top}>
        <button style={s.newBtn} onClick={() => onNew()}>+ Nuovo percorso</button>
      </div>
      <div style={s.section}>
        <span style={s.label}>I tuoi percorsi</span>
        {curricula.map(c => {
          const active = c.id === activeCurriculumId
          return (
            <div key={c.id} style={itemStyle(active)} onClick={() => onSelect(c.id)}>
              <span style={{ fontSize: '.9rem', marginTop: '1px' }}>{c.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '.83rem', lineHeight: 1.3 }}>{c.title}</div>
                <div style={{
                  fontSize: '.68rem', fontFamily: 'var(--font-mono)', marginTop: '2px',
                  color: active ? 'var(--warm-light)' : 'var(--warm-mid)',
                }}>
                  {c.duration} · {c.level}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
