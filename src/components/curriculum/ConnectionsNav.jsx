const s = {
  nav: {
    width: 'var(--connections-nav-width)', minWidth: 'var(--connections-nav-width)',
    borderRight: '1px solid var(--warm-border)', background: 'var(--warm-soft)',
    display: 'flex', flexDirection: 'column', overflowY: 'auto',
  },
  header: {
    padding: '14px 14px 10px', fontFamily: 'var(--font-mono)', fontSize: '.62rem',
    letterSpacing: '.13em', textTransform: 'uppercase', color: 'var(--warm-mid)',
    borderBottom: '1px solid var(--warm-border)', flexShrink: 0,
  },
  section: { padding: '10px 14px 6px' },
  sectionLabel: {
    fontFamily: 'var(--font-mono)', fontSize: '.58rem', letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'var(--warm-light)', marginBottom: '6px',
  },
  divider: { height: '1px', background: 'var(--warm-border)', margin: '4px 14px 4px' },
}

function NavItem({ emoji, title, meta, active, onClick, muted }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'flex-start', gap: '6px', padding: '6px 8px',
      borderRadius: '6px', cursor: onClick ? 'pointer' : 'default',
      marginBottom: '2px', opacity: muted ? .72 : 1,
      background: active ? 'var(--warm-dark)' : 'transparent',
      transition: 'background .15s',
    }}
      onMouseEnter={e => !active && onClick && (e.currentTarget.style.background = 'var(--warm-border)')}
      onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ fontSize: '.85rem', marginTop: '1px', flexShrink: 0 }}>{emoji}</span>
      <div>
        <div style={{ fontSize: '.78rem', lineHeight: 1.3,
          color: active ? 'var(--cream)' : 'var(--warm-dark)' }}>{title}</div>
        {meta && <div style={{ fontSize: '.62rem', fontFamily: 'var(--font-mono)', marginTop: '1px',
          color: active ? 'var(--warm-light)' : 'var(--warm-mid)' }}>{meta}</div>}
      </div>
    </div>
  )
}

export default function ConnectionsNav({ curriculum, allCurricula, onNavigate, onNewFromSuggestion }) {
  return (
    <div style={s.nav}>
      <div style={s.header}>🔗 Percorsi collegati</div>

      <div style={s.section}>
        <div style={s.sectionLabel}>Corrente</div>
        <NavItem emoji={curriculum.emoji} title={curriculum.title}
                 meta={curriculum.duration} active />
      </div>

      {curriculum.connections?.length > 0 && (
        <>
          <div style={s.divider} />
          <div style={s.section}>
            <div style={s.sectionLabel}>↑ Fa parte di</div>
            {curriculum.connections.map(c => (
              <NavItem key={c.id} emoji={c.emoji} title={c.title}
                       meta={c.exists ? '' : 'non ancora aperto'}
                       onClick={c.exists ? () => onNavigate(c.id) : undefined} />
            ))}
          </div>
        </>
      )}

      {allCurricula.filter(c => c.id !== curriculum.id).length > 0 && (
        <>
          <div style={s.divider} />
          <div style={s.section}>
            <div style={s.sectionLabel}>↔ Altri percorsi</div>
            {allCurricula.filter(c => c.id !== curriculum.id).map(c => (
              <NavItem key={c.id} emoji={c.emoji} title={c.title}
                       meta={c.duration} onClick={() => onNavigate(c.id)} />
            ))}
          </div>
        </>
      )}

      {curriculum.aiSuggestions?.length > 0 && (
        <>
          <div style={s.divider} />
          <div style={s.section}>
            <div style={s.sectionLabel}>◑ Suggeriti</div>
            {curriculum.aiSuggestions.map((s, i) => (
              <NavItem key={i} emoji="＋" title={s.title}
                       meta="→ nuovo percorso" muted
                       onClick={() => onNewFromSuggestion(s.title)} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
