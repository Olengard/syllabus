import ConnectionsNav from '../components/curriculum/ConnectionsNav'
import ChatPanel from '../components/curriculum/ChatPanel'

const MOCK_RESOURCES = {
  primary: [
    { id: 'r1', type: 'book', title: 'Kind of Blue', author: 'Ashley Kahn, 2000',
      note: 'La genesi del disco più influente del jazz modale. Ricostruisce le sedute di registrazione con documenti e interviste.' },
    { id: 'r2', type: 'book', title: 'Miles: The Autobiography', author: 'Miles Davis & Quincy Troupe, 1989',
      note: 'Voce diretta: personalità, conflitti, evoluzione stilistica attraverso decenni di musica americana.' },
  ],
  secondary: [
    { id: 'r3', type: 'essay', title: 'The Jazz Tradition', author: 'Martin Williams, 1970',
      note: 'Mappa le personalità fondamentali del periodo: Monk, Coltrane, Coleman.' },
    { id: 'r4', type: 'essay', title: 'Stomping the Blues', author: 'Albert Murray, 1976',
      note: 'Collega il blues come estetica profonda al jazz moderno — lettura teorica indispensabile.' },
  ],
  other: [
    { id: 'r5', type: 'film', title: 'Jazz (documentario)', author: 'Ken Burns, PBS · 2001',
      note: '19 ore di storia orale, immagini d\'archivio, musica. Punto di riferimento visivo imprescindibile.' },
    { id: 'r6', type: 'podcast', title: 'Switched on Pop', author: 'Podcast · ep. "What Makes Jazz Jazz?"',
      note: 'Analisi musicologica accessibile per chi viene dalla musica pop o classica.' },
  ],
}

// Raggruppa risorse Supabase in primary/secondary/other come nel mock
function groupResources(resources) {
  const primary   = resources.filter(r => r.phase === 'primary'   || r.type === 'book')
  const secondary = resources.filter(r => r.phase === 'secondary' || r.type === 'essay')
  const other     = resources.filter(r => !primary.includes(r) && !secondary.includes(r))
  // Normalizza i campi per ResourceCard
  const norm = r => ({ ...r, note: r.description, author: r.author })
  return { primary: primary.map(norm), secondary: secondary.map(norm), other: other.map(norm) }
}

const TYPE_ICON = { book: '📘', essay: '📄', film: '🎬', podcast: '🎙️', libro: '📘', saggio: '📄' }
const TYPE_APP  = { book: 'BookShelf', essay: 'BookShelf', film: 'Platea', podcast: 'ListenS' }

function SectionTitle({ children }) {
  return (
    <div style={{
      fontSize: '.7rem', letterSpacing: '.15em', textTransform: 'uppercase',
      color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
      marginBottom: '12px', paddingBottom: '6px',
      borderBottom: '1px solid var(--warm-border)',
    }}>{children}</div>
  )
}

function ResourceCard({ resource }) {
  const icon = TYPE_ICON[resource.type] || '📎'
  const app  = TYPE_APP[resource.type]
  const canAddToShelf = resource.type === 'book' || resource.type === 'essay'
  return (
    <div style={{
      display: 'flex', gap: '14px', padding: '10px 0',
      borderBottom: '1px solid var(--warm-soft)', alignItems: 'flex-start',
    }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '6px', background: 'var(--warm-soft)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '.95rem', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '.88rem', fontWeight: 'bold', marginBottom: '2px' }}>{resource.title}</div>
        <div style={{ fontSize: '.75rem', color: 'var(--warm-mid)', fontStyle: 'italic', marginBottom: '3px' }}>{resource.author}</div>
        <div style={{ fontSize: '.75rem', color: 'var(--warm-mid)', lineHeight: 1.4 }}>{resource.note}</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
        {canAddToShelf && (
          <button style={{
            fontSize: '.65rem', padding: '3px 8px', border: 'none', borderRadius: '4px',
            cursor: 'pointer', background: 'var(--warm-dark)', color: 'var(--cream)',
            fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
          }}>+ {app}</button>
        )}
        {canAddToShelf && (
          <button style={{
            fontSize: '.65rem', padding: '3px 8px', border: '1px solid var(--warm-border)',
            borderRadius: '4px', cursor: 'pointer', background: 'var(--cream)',
            color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
          }}>† FN</button>
        )}
        {!canAddToShelf && app && (
          <button style={{
            fontSize: '.65rem', padding: '3px 8px', border: '1px solid var(--warm-border)',
            borderRadius: '4px', cursor: 'pointer', background: 'var(--cream)',
            color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
          }}>+ {app}</button>
        )}
      </div>
    </div>
  )
}

// Icone per tipo di sezione riferimenti
const REF_ICON = { dischi: '🎵', opere: '🖼️', edifici: '🏛️' }

function ReferenceCard({ item, type }) {
  const hasLocation = item.location
  return (
    <div style={{
      display: 'flex', gap: '14px', padding: '12px 0',
      borderBottom: '1px solid var(--warm-soft)', alignItems: 'flex-start',
    }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '6px',
        background: 'var(--warm-soft)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '.95rem', flexShrink: 0,
      }}>{REF_ICON[type] || '✦'}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '.88rem', fontWeight: 'bold', marginBottom: '2px' }}>
          {item.title}
        </div>
        <div style={{
          fontSize: '.75rem', color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
          marginBottom: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap',
        }}>
          <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>{item.author}</span>
          {item.year && <span>{item.year}</span>}
          {hasLocation && (
            <span style={{
              background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
              borderRadius: '4px', padding: '0 6px', fontSize: '.65rem',
              fontStyle: 'normal',
            }}>
              📍 {item.location}
            </span>
          )}
        </div>
        {item.note && (
          <div style={{ fontSize: '.75rem', color: 'var(--warm-mid)', lineHeight: 1.4 }}>
            {item.note}
          </div>
        )}
      </div>
    </div>
  )
}

function ReferenceSection({ section }) {
  if (!section) return null
  return (
    <div style={{ marginBottom: '26px' }}>
      <SectionTitle>{section.label}</SectionTitle>
      {section.intro && (
        <div style={{
          fontSize: '.78rem', color: 'var(--warm-mid)', fontStyle: 'italic',
          marginBottom: '12px', lineHeight: 1.5,
        }}>
          {section.intro}
        </div>
      )}
      {(section.items ?? []).map((item, i) => (
        <ReferenceCard key={item.id ?? i} item={item} type={section.type} />
      ))}
    </div>
  )
}

function ReferenceSections({ sections }) {
  if (!sections?.length) return null
  return sections.map((s, i) => <ReferenceSection key={s.type ?? i} section={s} />)
}

export default function Curriculum({ curriculum, allCurricula, onNavigate, onNewFromSuggestion, onBack, isMobile }) {
  const hasRealResources = curriculum.resources?.length > 0
  const resources = hasRealResources
    ? groupResources(curriculum.resources)
    : MOCK_RESOURCES

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {/* Colonna sinistra: navigazione connessioni — nascosta su mobile */}
      {!isMobile && (
        <ConnectionsNav
          curriculum={curriculum}
          allCurricula={allCurricula}
          onNavigate={onNavigate}
          onNewFromSuggestion={onNewFromSuggestion}
        />
      )}

      {/* Colonna centrale: contenuto */}
      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px 80px' : '28px 32px' }}>

        {/* Header */}
        <div style={{ borderBottom: '2px solid var(--warm-border)', paddingBottom: '18px', marginBottom: '24px' }}>
          {/* Pulsante back su mobile */}
          {isMobile && onBack && (
            <button onClick={onBack} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '.72rem',
              color: 'var(--warm-mid)', padding: '0 0 10px', display: 'block',
            }}>
              ← I tuoi percorsi
            </button>
          )}
          <div style={{
            fontFamily: 'var(--font-mono)', fontSize: '.65rem', letterSpacing: '.15em',
            textTransform: 'uppercase', color: 'var(--warm-mid)', marginBottom: '6px',
          }}>
            {curriculum.emoji} Percorso · in corso
          </div>
          <div style={{
            fontSize: '1.7rem', fontStyle: 'italic',
            fontFamily: 'var(--font-display)', marginBottom: '4px',
          }}>
            {curriculum.title}
          </div>
          <div style={{
            fontSize: '.78rem', color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
            display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px',
          }}>
            {[curriculum.duration, curriculum.level, ...(curriculum.focus || []).slice(0, 2)].map(b => (
              <span key={b} style={{
                background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
                borderRadius: '4px', padding: '2px 8px',
              }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Risorse primarie */}
        <div style={{ marginBottom: '26px' }}>
          <SectionTitle>Risorse primarie</SectionTitle>
          {resources.primary.map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>

        {/* Risorse secondarie */}
        <div style={{ marginBottom: '26px' }}>
          <SectionTitle>Risorse secondarie</SectionTitle>
          {resources.secondary.map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>

        {/* Risorse non testuali */}
        <div style={{ marginBottom: '26px' }}>
          <SectionTitle>Risorse non testuali</SectionTitle>
          {resources.other.map(r => <ResourceCard key={r.id} resource={r} />)}
        </div>

        {/* Sezioni riferimenti — condizionali, una per tipo */}
        <ReferenceSections sections={curriculum.referenceSections} />

        {/* Progetto finale — visibile solo se presente */}
        {curriculum.progettoFinale && (
          <div style={{ marginBottom: '26px' }}>
            <SectionTitle>Progetto finale</SectionTitle>
            <div style={{
              background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
              borderLeft: '3px solid var(--warm-accent)', borderRadius: '8px', padding: '14px 16px',
            }}>
              <p style={{ fontSize: '.85rem', lineHeight: 1.6, margin: 0 }}>
                {curriculum.progettoFinale}
              </p>
            </div>
          </div>
        )}

        {/* Connessioni */}
        {(() => {
          // Supporta sia il formato mock (connections + aiSuggestions separati)
          // sia il formato Supabase (connections array con is_ai_suggestion)
          const realConns   = (curriculum.connections ?? []).filter(c => !c.isAiSuggestion)
          const aiConns     = (curriculum.connections ?? []).filter(c =>  c.isAiSuggestion)
          const legacyAI    = curriculum.aiSuggestions ?? []
          const hasAny      = realConns.length || aiConns.length || legacyAI.length
          if (!hasAny) return null
          return (
            <div style={{ marginBottom: '26px' }}>
              <SectionTitle>Connessioni</SectionTitle>

              {realConns.map(c => {
                const linked = allCurricula?.find(x => x.id === c.connectedCurriculumId)
                return (
                  <div key={c.id}
                    onClick={() => linked && onNavigate(linked.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 12px', background: 'white',
                      border: '1px solid var(--warm-border)', borderRadius: '8px',
                      marginBottom: '6px', cursor: linked ? 'pointer' : 'default',
                    }}>
                    <span>{linked ? '🔗' : '○'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.85rem' }}>{linked?.title ?? c.title ?? '—'}</div>
                      {!linked && (
                        <div style={{ fontSize: '.68rem', color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          non ancora aperto
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {[...aiConns, ...legacyAI].map((s, i) => (
                <div key={s.id ?? i} onClick={() => onNewFromSuggestion(s.title ?? s.suggestionReason)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '12px 14px', background: 'var(--cream)',
                    border: '1.5px dashed var(--warm-border)', borderRadius: '8px',
                    marginBottom: '6px', cursor: 'pointer',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--warm-accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--warm-border)'}
                >
                  <span style={{ flexShrink: 0, marginTop: '2px' }}>＋</span>
                  <div>
                    <div style={{ fontSize: '.85rem', fontStyle: 'italic', marginBottom: '3px' }}>
                      {s.title}
                    </div>
                    <div style={{ fontSize: '.72rem', color: 'var(--warm-mid)', lineHeight: 1.4 }}>
                      {s.reason ?? s.suggestionReason}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-mono)', fontSize: '.6rem',
                      color: 'var(--warm-accent)', marginTop: '5px',
                    }}>→ Apri come nuovo percorso</div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {/* Colonna destra: chat — nascosta su mobile */}
      {!isMobile && <ChatPanel curriculumTitle={curriculum.title} />}
    </div>
  )
}
