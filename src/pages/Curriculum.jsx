import ConnectionsNav from '../components/curriculum/ConnectionsNav'
import ChatPanel from '../components/curriculum/ChatPanel'

const MOCK_RESOURCES = {
  primary: [
    { id: 'r1', type: 'book', title: 'Kind of Blue', author: 'Ashley Kahn, 2000',
      note: 'La genesi del disco più influente del jazz modale.' },
    { id: 'r2', type: 'book', title: 'Miles: The Autobiography', author: 'Miles Davis & Quincy Troupe, 1989',
      note: 'Voce diretta: personalità, conflitti, evoluzione stilistica.' },
  ],
  secondary: [
    { id: 'r3', type: 'essay', title: 'The Jazz Tradition', author: 'Martin Williams, 1970',
      note: 'Mappa le personalità fondamentali del periodo: Monk, Coltrane, Coleman.' },
    { id: 'r4', type: 'essay', title: 'Stomping the Blues', author: 'Albert Murray, 1976',
      note: 'Collega il blues come estetica profonda al jazz moderno.' },
  ],
  other: [
    { id: 'r5', type: 'film', title: 'Jazz (documentario)', author: 'Ken Burns, PBS · 2001',
      note: '19 ore di storia orale, immagini d\'archivio, musica.' },
    { id: 'r6', type: 'podcast', title: 'Switched on Pop', author: 'ep. "What Makes Jazz Jazz?"',
      note: 'Analisi musicologica accessibile.' },
  ],
}

function groupResources(resources) {
  const primary   = resources.filter(r => r.phase === 'primary'   || r.type === 'book'  || r.type === 'libro')
  const secondary = resources.filter(r => r.phase === 'secondary' || r.type === 'essay' || r.type === 'saggio')
  const other     = resources.filter(r => !primary.includes(r) && !secondary.includes(r))
  const norm = r => ({ ...r, note: r.description, author: r.author })
  return { primary: primary.map(norm), secondary: secondary.map(norm), other: other.map(norm) }
}

const TYPE_ICON = { book: '📘', essay: '📄', film: '🎬', podcast: '🎙️', libro: '📘', saggio: '📄',
                    articolo: '📰', documentario: '🎬' }
const TYPE_APP  = { book: 'BookShelf', essay: 'BookShelf', film: 'Platea', podcast: 'ListenS',
                    libro: 'BookShelf', saggio: 'BookShelf', documentario: 'Platea', articolo: 'Footnote' }
const APP_URLS  = {
  BookShelf: 'https://bookshelf.commonplaceapp.org',
  Footnote:  'https://footnote.commonplaceapp.org',
  ListenS:   'https://listens.commonplaceapp.org',
  Platea:    'https://platea.commonplaceapp.org',
}

// ---------------------------------------------------------------------------
// PDF export
// ---------------------------------------------------------------------------

function exportCurriculumPDF(curriculum, resources) {
  const allResources = [...resources.primary, ...resources.secondary, ...resources.other]

  const resourceRows = allResources.map(r => `
    <tr>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;">
        <strong>${r.title}</strong><br>
        <span style="color:#7a6a5a;font-size:12px;">${r.author ?? ''}</span>
      </td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;color:#7a6a5a;font-size:12px;">${r.type ?? ''}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;font-size:12px;color:#5a4a3a;">${r.note ?? r.description ?? ''}</td>
    </tr>`).join('')

  const refSectionsHtml = (curriculum.referenceSections ?? []).map(s => `
    <div style="margin-bottom:20px;">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9a8a7a;
                  border-bottom:1px solid #e8e0d0;padding-bottom:4px;margin-bottom:10px;">
        ${s.label}
      </div>
      ${(s.items ?? []).map(item => `
        <div style="margin-bottom:8px;padding-left:8px;border-left:2px solid #e8e0d0;">
          <strong style="font-size:13px;">${item.title}</strong>
          <span style="color:#9a8a7a;font-size:12px;margin-left:8px;">${item.author ?? ''}</span>
          ${item.year ? `<span style="color:#b0a090;font-size:11px;margin-left:6px;">${item.year}</span>` : ''}
          ${item.location ? `<span style="font-size:11px;color:#9a8a7a;margin-left:8px;">📍 ${item.location}</span>` : ''}
          ${item.notes ? `<div style="font-size:11px;color:#7a6a5a;margin-top:2px;">${item.notes}</div>` : ''}
        </div>`).join('')}
    </div>`).join('')

  const aiSuggestionsHtml = (curriculum.aiSuggestions ?? []).length > 0 ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9a8a7a;
                  border-bottom:1px solid #e8e0d0;padding-bottom:4px;margin-bottom:10px;">
        Percorsi correlati suggeriti
      </div>
      ${(curriculum.aiSuggestions ?? []).map(s => `
        <div style="margin-bottom:8px;padding:8px 12px;background:#faf7ef;border:1px dashed #d8c8b0;border-radius:6px;">
          <strong style="font-size:13px;">${s.title}</strong><br>
          <span style="font-size:12px;color:#7a6a5a;">${s.reason ?? ''}</span>
        </div>`).join('')}
    </div>` : ''

  const progettoHtml = curriculum.progettoFinale ? `
    <div style="margin-bottom:24px;">
      <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9a8a7a;
                  border-bottom:1px solid #e8e0d0;padding-bottom:4px;margin-bottom:10px;">
        Progetto finale
      </div>
      <div style="padding:12px 14px;background:#faf7ef;border:1px solid #e8e0d0;
                  border-left:3px solid #c8903a;border-radius:6px;font-size:13px;line-height:1.6;">
        ${curriculum.progettoFinale}
      </div>
    </div>` : ''

  const badges = [curriculum.timeCommitment, curriculum.level, ...(curriculum.focusAreas ?? []).slice(0, 3)]
    .filter(Boolean)
    .map(b => `<span style="display:inline-block;background:#f0e8d8;border:1px solid #d8c8b0;
                             border-radius:4px;padding:2px 8px;font-size:11px;margin-right:6px;
                             margin-bottom:4px;">${b}</span>`)
    .join('')

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <title>${curriculum.title} — Syllabus</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=IBM+Plex+Mono:wght@400;500&family=EB+Garamond:ital,wght@0,400;1,400&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'EB Garamond', Georgia, serif; background: #fffdf0; color: #2a1f10;
           padding: 40px; max-width: 800px; margin: 0 auto; }
    @media print { body { padding: 20px; } .no-print { display: none; } }
    h1 { font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-style: italic;
         line-height: 1.2; margin-bottom: 8px; }
    .suite { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: .15em;
             text-transform: uppercase; color: #9a8a7a; margin-bottom: 16px; }
    .description { font-size: 14px; color: #5a4a3a; line-height: 1.6; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 6px; }
    th { text-align: left; padding: 6px 10px; font-family: 'IBM Plex Mono', monospace;
         font-size: 10px; letter-spacing: .1em; text-transform: uppercase; color: #9a8a7a;
         border-bottom: 2px solid #d8c8b0; }
    .print-btn { position:fixed; bottom:24px; right:24px; background:#3d2b1f; color:#fffdf0;
                 border:none; padding:10px 20px; border-radius:6px; cursor:pointer;
                 font-family:'IBM Plex Mono',monospace; font-size:12px; }
    footer { margin-top:40px; padding-top:16px; border-top:1px solid #e8e0d0;
             font-family:'IBM Plex Mono',monospace; font-size:10px; color:#b0a090;
             display:flex; justify-content:space-between; }
  </style>
</head>
<body>
  <button class="no-print print-btn" onclick="window.print()">⬇ Salva come PDF</button>
  <div class="suite">Syllabus — Commonplace · Percorso di studio</div>
  <h1>${curriculum.title}</h1>
  ${curriculum.description ? `<div class="description">${curriculum.description}</div>` : ''}
  <div style="margin-bottom:20px;">${badges}</div>
  <div style="margin-bottom:28px;">
    <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#9a8a7a;
                border-bottom:1px solid #e8e0d0;padding-bottom:4px;margin-bottom:12px;">Risorse</div>
    <table>
      <thead><tr><th>Titolo / Autore</th><th>Tipo</th><th>Note</th></tr></thead>
      <tbody>${resourceRows}</tbody>
    </table>
  </div>
  ${refSectionsHtml}
  ${progettoHtml}
  ${aiSuggestionsHtml}
  <footer>
    <span>Syllabus · commonplaceapp.org</span>
    <span>${new Date().toLocaleDateString('it-IT', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
  </footer>
</body></html>`

  const win = window.open('', '_blank')
  win.document.write(html)
  win.document.close()
}

// ---------------------------------------------------------------------------
// Componenti UI
// ---------------------------------------------------------------------------

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
  const canAddToShelf = ['book','essay','libro','saggio'].includes(resource.type)

  function openApp(appName) {
    const target = APP_URLS[appName]
    if (target) window.open(target, '_blank', 'noreferrer')
  }

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
          <button onClick={() => openApp('BookShelf')} title="Apri BookShelf" style={{
            fontSize: '.65rem', padding: '3px 8px', border: 'none', borderRadius: '4px',
            cursor: 'pointer', background: 'var(--warm-dark)', color: 'var(--cream)',
            fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap',
          }}>↗ BookShelf</button>
        )}
        {canAddToShelf && (
          <button onClick={() => openApp('Footnote')} title="Apri Footnote" style={{
            fontSize: '.65rem', padding: '3px 8px', border: '1px solid var(--warm-border)',
            borderRadius: '4px', cursor: 'pointer', background: 'var(--cream)',
            color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
          }}>↗ Footnote</button>
        )}
        {!canAddToShelf && app && (
          <button onClick={() => openApp(app)} title={`Apri ${app}`} style={{
            fontSize: '.65rem', padding: '3px 8px', border: '1px solid var(--warm-border)',
            borderRadius: '4px', cursor: 'pointer', background: 'var(--cream)',
            color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
          }}>↗ {app}</button>
        )}
      </div>
    </div>
  )
}

const REF_ICON = { dischi: '🎵', opere: '🖼️', edifici: '🏛️', dipinti: '🖼️',
                   sculture: '🗿', film_essenziali: '🎬', luoghi: '📍', fotografie: '📷',
                   performance: '🎭' }

function ReferenceCard({ item, type }) {
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
        <div style={{ fontSize: '.88rem', fontWeight: 'bold', marginBottom: '2px' }}>{item.title}</div>
        <div style={{
          fontSize: '.75rem', color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
          marginBottom: '3px', display: 'flex', gap: '10px', flexWrap: 'wrap',
        }}>
          <span style={{ fontStyle: 'italic', fontFamily: 'var(--font-serif)' }}>{item.author}</span>
          {item.year && <span>{item.year}</span>}
          {item.location && (
            <span style={{ background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
                           borderRadius: '4px', padding: '0 6px', fontSize: '.65rem' }}>
              📍 {item.location}
            </span>
          )}
        </div>
        {(item.note || item.notes) && (
          <div style={{ fontSize: '.75rem', color: 'var(--warm-mid)', lineHeight: 1.4 }}>
            {item.note ?? item.notes}
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

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------

export default function Curriculum({ curriculum, allCurricula, onNavigate, onNewFromSuggestion, onBack, isMobile }) {
  const hasRealResources = curriculum.resources?.length > 0
  const resources = hasRealResources ? groupResources(curriculum.resources) : MOCK_RESOURCES

  const headerBadges = [
    curriculum.timeCommitment,
    curriculum.level,
    ...(curriculum.focusAreas ?? []).slice(0, 2),
  ].filter(Boolean)

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

      {!isMobile && (
        <ConnectionsNav curriculum={curriculum} allCurricula={allCurricula}
          onNavigate={onNavigate} onNewFromSuggestion={onNewFromSuggestion} />
      )}

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? '20px 16px 80px' : '28px 32px' }}>

        {/* Header */}
        <div style={{ borderBottom: '2px solid var(--warm-border)', paddingBottom: '18px', marginBottom: '24px' }}>
          {isMobile && onBack && (
            <button onClick={onBack} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-mono)', fontSize: '.72rem',
              color: 'var(--warm-mid)', padding: '0 0 10px', display: 'block',
            }}>← I tuoi percorsi</button>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.65rem', letterSpacing: '.15em',
                          textTransform: 'uppercase', color: 'var(--warm-mid)', marginBottom: '6px' }}>
              Percorso · in corso
            </div>
            <button onClick={() => exportCurriculumPDF(curriculum, resources)} title="Esporta come PDF"
              style={{ background: 'none', border: '1px solid var(--warm-border)',
                       borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                       fontFamily: 'var(--font-mono)', fontSize: '.6rem',
                       color: 'var(--warm-mid)', padding: '3px 9px', letterSpacing: '.05em' }}>
              ⬇ PDF
            </button>
          </div>

          <div style={{ fontSize: '1.7rem', fontStyle: 'italic',
                        fontFamily: 'var(--font-display)', marginBottom: '4px' }}>
            {curriculum.title}
          </div>
          {curriculum.description && (
            <div style={{ fontSize: '.82rem', color: 'var(--warm-mid)', lineHeight: 1.5,
                          fontStyle: 'italic', marginBottom: '10px' }}>
              {curriculum.description}
            </div>
          )}
          <div style={{ fontSize: '.78rem', color: 'var(--warm-mid)', fontFamily: 'var(--font-mono)',
                        display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            {headerBadges.map(b => (
              <span key={b} style={{ background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
                                     borderRadius: '4px', padding: '2px 8px' }}>{b}</span>
            ))}
          </div>
        </div>

        {resources.primary.length > 0 && (
          <div style={{ marginBottom: '26px' }}>
            <SectionTitle>Risorse primarie</SectionTitle>
            {resources.primary.map(r => <ResourceCard key={r.id ?? r.title} resource={r} />)}
          </div>
        )}

        {resources.secondary.length > 0 && (
          <div style={{ marginBottom: '26px' }}>
            <SectionTitle>Risorse secondarie</SectionTitle>
            {resources.secondary.map(r => <ResourceCard key={r.id ?? r.title} resource={r} />)}
          </div>
        )}

        {resources.other.length > 0 && (
          <div style={{ marginBottom: '26px' }}>
            <SectionTitle>Risorse non testuali</SectionTitle>
            {resources.other.map(r => <ResourceCard key={r.id ?? r.title} resource={r} />)}
          </div>
        )}

        <ReferenceSections sections={curriculum.referenceSections} />

        {curriculum.progettoFinale && (
          <div style={{ marginBottom: '26px' }}>
            <SectionTitle>Progetto finale</SectionTitle>
            <div style={{ background: 'var(--warm-soft)', border: '1px solid var(--warm-border)',
                          borderLeft: '3px solid var(--warm-accent)', borderRadius: '8px', padding: '14px 16px' }}>
              <p style={{ fontSize: '.85rem', lineHeight: 1.6, margin: 0 }}>{curriculum.progettoFinale}</p>
            </div>
          </div>
        )}

        {(() => {
          const realConns = (curriculum.connections ?? []).filter(c => !c.isAiSuggestion)
          const aiConns   = (curriculum.connections ?? []).filter(c =>  c.isAiSuggestion)
          const legacyAI  = curriculum.aiSuggestions ?? []
          if (!realConns.length && !aiConns.length && !legacyAI.length) return null
          return (
            <div style={{ marginBottom: '26px' }}>
              <SectionTitle>Connessioni</SectionTitle>

              {realConns.map(c => {
                const linked = allCurricula?.find(x => x.id === c.connectedCurriculumId)
                return (
                  <div key={c.id} onClick={() => linked && onNavigate(linked.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px',
                             padding: '10px 12px', background: 'white',
                             border: '1px solid var(--warm-border)', borderRadius: '8px',
                             marginBottom: '6px', cursor: linked ? 'pointer' : 'default' }}>
                    <span>{linked ? '🔗' : '○'}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '.85rem' }}>{linked?.title ?? c.title ?? '—'}</div>
                      {!linked && (
                        <div style={{ fontSize: '.68rem', color: 'var(--warm-mid)',
                                      fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          non ancora aperto
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {[...aiConns, ...legacyAI].map((s, i) => (
                <div key={s.id ?? i} onClick={() => onNewFromSuggestion(s.title ?? s.suggestionReason)}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '10px',
                           padding: '12px 14px', background: 'var(--cream)',
                           border: '1.5px dashed var(--warm-border)', borderRadius: '8px',
                           marginBottom: '6px', cursor: 'pointer' }}
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
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '.6rem',
                                  color: 'var(--warm-accent)', marginTop: '5px' }}>
                      → Apri come nuovo percorso
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}
      </div>

      {!isMobile && <ChatPanel curriculumTitle={curriculum.title} />}
    </div>
  )
}
