const s = {
  wrap: { flex: 1, overflowY: 'auto', padding: 'var(--space-xl)' },
  title: {
    fontSize: '1.6rem', fontStyle: 'italic',
    fontFamily: 'var(--font-display)', marginBottom: '6px',
  },
  sub: { fontSize: '.85rem', color: 'var(--warm-mid)', marginBottom: '30px' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'white', border: '1px solid var(--warm-border)',
    borderRadius: 'var(--radius-lg)', padding: '18px 20px',
    cursor: 'pointer', transition: 'box-shadow .15s',
  },
  cardTag: {
    fontFamily: 'var(--font-mono)', fontSize: '.6rem', letterSpacing: '.12em',
    textTransform: 'uppercase', color: 'var(--warm-mid)', marginBottom: '6px',
  },
  cardTitle: { fontSize: '1rem', fontStyle: 'italic', marginBottom: '8px' },
  progressTrack: {
    height: '3px', background: 'var(--warm-border)',
    borderRadius: '2px', margin: '12px 0 8px',
  },
  cardMeta: {
    fontSize: '.72rem', color: 'var(--warm-mid)',
    fontFamily: 'var(--font-mono)', display: 'flex', gap: '10px',
  },
  newCard: {
    background: 'var(--cream)', border: '1.5px dashed var(--warm-border)',
    borderRadius: 'var(--radius-lg)', padding: '18px 20px',
    cursor: 'pointer', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    gap: '8px', color: 'var(--warm-mid)', fontSize: '.88rem',
    minHeight: '140px', transition: 'border-color .15s, color .15s',
  },
}

function progressLabel(p) {
  if (p === 0) return 'Appena iniziato'
  if (p === 100) return 'Completato'
  return `${p}%`
}

export default function Home({ curricula, onSelect, onNew }) {
  const active = curricula.filter(c => c.progress < 100)
  const done = curricula.filter(c => c.progress === 100)

  return (
    <div style={s.wrap}>
      <div style={s.title}>I tuoi percorsi</div>
      <div style={s.sub}>
        {active.length} {active.length === 1 ? 'percorso attivo' : 'percorsi attivi'}
        {done.length > 0 && ` · ${done.length} completat${done.length === 1 ? 'o' : 'i'}`}
      </div>
      <div style={s.grid}>
        {curricula.map(c => (
          <div
            key={c.id}
            style={s.card}
            onClick={() => onSelect(c.id)}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-hover)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <div style={s.cardTag}>{c.emoji} {c.duration} · {c.level}</div>
            <div style={s.cardTitle}>{c.title}</div>
            <div style={s.progressTrack}>
              <div style={{
                height: '100%', width: `${c.progress}%`,
                background: 'var(--warm-accent)', borderRadius: '2px',
                transition: 'width .3s',
              }} />
            </div>
            <div style={s.cardMeta}>
              <span>{c.resourceCount} risorse</span>
              <span>{progressLabel(c.progress)}</span>
            </div>
          </div>
        ))}
        <div
          style={s.newCard}
          onClick={() => onNew()}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--warm-accent)'
            e.currentTarget.style.color = 'var(--warm-accent)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--warm-border)'
            e.currentTarget.style.color = 'var(--warm-mid)'
          }}
        >
          <span style={{ fontSize: '1.5rem' }}>＋</span>
          <span>Nuovo percorso</span>
        </div>
      </div>
    </div>
  )
}
