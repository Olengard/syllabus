import { useState } from 'react'
import ConnectionsNav from '../components/curriculum/ConnectionsNav'
import ChatPanel from '../components/curriculum/ChatPanel'
import { addToBookShelf, addToFootnote } from '../lib/supabase'

const EMPTY_RESOURCES = { primary: [], secondary: [], other: [] }

function groupResources(resources) {
  // Usa solo phase — le categorie sono mutualmente esclusive
  const primary   = resources.filter(r => r.phase === 'primary')
  const secondary = resources.filter(r => r.phase === 'secondary')
  const other     = resources.filter(r => r.phase !== 'primary' && r.phase !== 'secondary')
  const norm = r => ({ ...r, note: r.description })
  return { primary: primary.map(norm), secondary: secondary.map(norm), other: other.map(norm) }
}

const TYPE_LABEL = { book: '[L]', essay: '[S]', film: '[F]', podcast: '[P]',
                     libro: '[L]', saggio: '[S]', documentario: '[F]', articolo: '[A]' }
const TYPE_APP   = { book: 'BookShelf', essay: 'BookShelf', film: 'Platea', podcast: 'ListenS',
                     libro: 'BookShelf', saggio: 'BookShelf', documentario: 'Platea', articolo: 'Footnote' }
const APP_URLS   = {
  BookShelf: 'https://bookshelf.commonplaceapp.org',
  Footnote:  'https://footnote.commonplaceapp.org',
  ListenS:   'https://listens.commonplaceapp.org',
  Platea:    'https://platea.commonplaceapp.org',
}

// ---------------------------------------------------------------------------
// PDF export — apre nuova scheda con versione stampabile
// ---------------------------------------------------------------------------
function exportCurriculumPDF(curriculum, resources) {
  const all = [...resources.primary, ...resources.secondary, ...resources.other]
  const rows = all.map(r =>
    '<tr>' +
    '<td style="padding:6px 10px;border-bottom:1px solid #e8e0d0"><strong>' + (r.title || '') + '</strong><br>' +
    '<span style="color:#7a6a5a;font-size:12px">' + (r.author || '') + '</span></td>' +
    '<td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;color:#7a6a5a;font-size:12px">' + (r.type || '') + '</td>' +
    '<td style="padding:6px 10px;border-bottom:1px solid #e8e0d0;font-size:12px;color:#5a4a3a">' + (r.note || r.description || '') + '</td>' +
    '</tr>'
  ).join('')

  const refHtml = (curriculum.referenceSections || []).map(s =>
    '<div style="margin-bottom:20px">' +
    '<div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a8a7a;border-bottom:1px solid #e8e0d0;padding-bottom:4px;margin-bottom:10px">' + (s.label || '') + '</div>' +
    (s.items || []).map(item =>
      '<div style="margin-bottom:8px;padding-left:8px;border-left:2px solid #e8e0d0">' +
      '<strong>' + (item.title || '') + '</strong>' +
      (item.author ? ' <span style="color:#9a8a7a;font-size:12px">' + item.author + '</span>' : '') +
      (item.year   ? ' <span style="color:#b0a090;font-size:11px">' + item.year   + '</span>' : '') +
      (item.notes  ? '<div style="font-size:11px;color:#7a6a5a">' + item.notes + '</div>' : '') +
      '</div>'
    ).join('') +
    '</div>'
  ).join('')

  const badges = [curriculum.timeCommitment, curriculum.level, ...(curriculum.focusAreas || []).slice(0,3)]
    .filter(Boolean)
    .map(b => '<span style="display:inline-block;background:#f0e8d8;border:1px solid #d8c8b0;border-radius:4px;padding:2px 8px;font-size:11px;margin-right:6px">' + b + '</span>')
    .join('')

  const progettoHtml = curriculum.progettoFinale
    ? '<div style="margin-bottom:24px"><div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a8a7a;border-bottom:1px solid #e8e0d0;padding-bottom:4px;margin-bottom:10px">Progetto finale</div><div style="padding:12px 14px;background:#faf7ef;border-left:3px solid #c8903a;border-radius:6px;font-size:13px;line-height:1.6">' + curriculum.progettoFinale + '</div></div>'
    : ''

  const html = '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"><title>' + curriculum.title + ' - Syllabus</title>' +
    '<style>@import url(\'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;1,400&family=IBM+Plex+Mono&family=EB+Garamond&display=swap\');' +
    'body{font-family:\'EB Garamond\',Georgia,serif;background:#fffdf0;color:#2a1f10;padding:40px;max-width:800px;margin:0 auto}' +
    '@media print{.no-print{display:none}body{padding:20px}}' +
    'h1{font-family:\'Playfair Display\',serif;font-size:28px;font-style:italic;margin-bottom:8px}' +
    '.suite{font-family:\'IBM Plex Mono\',monospace;font-size:10px;letter-spacing:.15em;text-transform:uppercase;color:#9a8a7a;margin-bottom:16px}' +
    'table{width:100%;border-collapse:collapse;font-size:13px}' +
    'th{text-align:left;padding:6px 10px;font-family:\'IBM Plex Mono\',monospace;font-size:10px;text-transform:uppercase;color:#9a8a7a;border-bottom:2px solid #d8c8b0}' +
    '.btn{position:fixed;bottom:24px;right:24px;background:#3d2b1f;color:#fffdf0;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-family:monospace;font-size:12px}' +
    'footer{margin-top:40px;padding-top:16px;border-top:1px solid #e8e0d0;font-family:monospace;font-size:10px;color:#b0a090;display:flex;justify-content:space-between}' +
    '</style></head><body>' +
    '<button class="no-print btn" onclick="window.print()">Salva come PDF</button>' +
    '<div class="suite">Syllabus - Commonplace</div>' +
    '<h1>' + curriculum.title + '</h1>' +
    (curriculum.description ? '<p style="color:#5a4a3a;font-size:14px;line-height:1.6;margin-bottom:16px">' + curriculum.description + '</p>' : '') +
    '<div style="margin-bottom:20px">' + badges + '</div>' +
    '<div style="margin-bottom:28px"><div style="font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#9a8a7a;border-bottom:1px solid #e8e0d0;padding-bottom:4px;margin-bottom:12px">Risorse</div>' +
    '<table><thead><tr><th>Titolo / Autore</th><th>Tipo</th><th>Note</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
    refHtml + progettoHtml +
    '<footer><span>Syllabus - commonplaceapp.org</span><span>' + new Date().toLocaleDateString('it-IT') + '</span></footer>' +
    '</body></html>'

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

function ResourceCard({ resource, curriculumTitle }) {
  const label = TYPE_LABEL[resource.type] || '[*]'
  const app   = TYPE_APP[resource.type]
  const isText = ['book','essay','libro','saggio','articolo'].includes(resource.type)
  const [bsState, setBsState] = useState('idle')
  const [fnState, setFnState] = useState('idle')

  async function handleAdd(target) {
    const set = target === 'BookShelf' ? setBsState : setFnState
    set('loading')
    try {
      if (target === 'BookShelf') await addToBookShelf(resource, curriculumTitle)
      else                        await addToFootnote(resource, curriculumTitle)
      set('done')
      setTimeout(() => window.open(APP_URLS[target], '_blank', 'noreferrer'), 600)
    } catch (e) {
      set('error')
      alert('Errore: ' + e.message)
      setTimeout(() => set('idle'), 2000)
    }
  }

  function btnText(state, def) {
    return state === 'loading' ? '...' : state === 'done' ? 'Aggiunto!' : state === 'error' ? 'Errore' : def
  }

  return (
    <div style={{ display:'flex', gap:'14px', padding:'10px 0',
                  borderBottom:'1px solid var(--warm-soft)', alignItems:'flex-start' }}>
      <div style={{ width:'34px', height:'34px', borderRadius:'6px', background:'var(--warm-soft)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontSize:'.75rem', fontFamily:'var(--font-mono)', color:'var(--warm-mid)',
                    flexShrink:0 }}>{label}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'.88rem', fontWeight:'bold', marginBottom:'2px' }}>{resource.title}</div>
        <div style={{ fontSize:'.75rem', color:'var(--warm-mid)', fontStyle:'italic', marginBottom:'3px' }}>{resource.author}</div>
        <div style={{ fontSize:'.75rem', color:'var(--warm-mid)', lineHeight:1.4 }}>{resource.note}</div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:'4px', flexShrink:0 }}>
        {isText && (
          <button onClick={() => bsState === 'idle' && handleAdd('BookShelf')} style={{
            fontSize:'.65rem', padding:'3px 8px', border:'none', borderRadius:'4px',
            cursor: bsState === 'idle' ? 'pointer' : 'default', whiteSpace:'nowrap',
            background: bsState === 'done' ? '#4a7c59' : bsState === 'error' ? '#c0392b' : 'var(--warm-dark)',
            color:'var(--cream)', fontFamily:'var(--font-mono)', transition:'background .2s',
          }}>{btnText(bsState, '+ BookShelf')}</button>
        )}
        {isText && (
          <button onClick={() => fnState === 'idle' && handleAdd('Footnote')} style={{
            fontSize:'.65rem', padding:'3px 8px', border:'1px solid var(--warm-border)',
            borderRadius:'4px', cursor: fnState === 'idle' ? 'pointer' : 'default',
            background: fnState === 'done' ? '#4a7c59' : 'var(--cream)',
            color: fnState === 'done' ? 'var(--cream)' : 'var(--warm-mid)',
            fontFamily:'var(--font-mono)', transition:'background .2s',
          }}>{btnText(fnState, '+ Footnote')}</button>
        )}
        {!isText && app && (
          <button onClick={() => window.open(APP_URLS[app], '_blank', 'noreferrer')} style={{
            fontSize:'.65rem', padding:'3px 8px', border:'1px solid var(--warm-border)',
            borderRadius:'4px', cursor:'pointer', background:'var(--cream)',
            color:'var(--warm-mid)', fontFamily:'var(--font-mono)',
          }}>apri {app}</button>
        )}
      </div>
    </div>
  )
}

function ReferenceCard({ item }) {
  return (
    <div style={{ display:'flex', gap:'14px', padding:'12px 0',
                  borderBottom:'1px solid var(--warm-soft)', alignItems:'flex-start' }}>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:'.88rem', fontWeight:'bold', marginBottom:'2px' }}>{item.title}</div>
        <div style={{ fontSize:'.75rem', color:'var(--warm-mid)', display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'3px' }}>
          <span style={{ fontStyle:'italic', fontFamily:'var(--font-serif)' }}>{item.author}</span>
          {item.year && <span>{item.year}</span>}
          {item.location && (
            <span style={{ background:'var(--warm-soft)', border:'1px solid var(--warm-border)',
                           borderRadius:'4px', padding:'0 6px', fontSize:'.65rem' }}>
              {item.location}
            </span>
          )}
        </div>
        {(item.note || item.notes) && (
          <div style={{ fontSize:'.75rem', color:'var(--warm-mid)', lineHeight:1.4 }}>
            {item.note ?? item.notes}
          </div>
        )}
      </div>
    </div>
  )
}

function ReferenceSection({ section }) {
  if (!section?.items?.length) return null
  return (
    <div style={{ marginBottom:'26px' }}>
      <SectionTitle>{section.label}</SectionTitle>
      {section.items.map((item, i) => <ReferenceCard key={item.id ?? i} item={item} />)}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Componente principale
// ---------------------------------------------------------------------------

export default function Curriculum({ curriculum, allCurricula, onNavigate, onNewFromSuggestion, onBack, onDelete, isMobile }) {
  const resources = curriculum.resources?.length > 0
    ? groupResources(curriculum.resources)
    : EMPTY_RESOURCES
  const badges = [curriculum.timeCommitment, curriculum.level, ...(curriculum.focusAreas ?? []).slice(0,2)].filter(Boolean)

  return (
    <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

      {!isMobile && (
        <ConnectionsNav curriculum={curriculum} allCurricula={allCurricula}
          onNavigate={onNavigate} onNewFromSuggestion={onNewFromSuggestion} />
      )}

      <div style={{ flex:1, overflowY:'auto', padding: isMobile ? '20px 16px 80px' : '28px 32px' }}>

        {/* Header */}
        <div style={{ borderBottom:'2px solid var(--warm-border)', paddingBottom:'18px', marginBottom:'24px' }}>
          {isMobile && onBack && (
            <button onClick={onBack} style={{ background:'none', border:'none', cursor:'pointer',
              fontFamily:'var(--font-mono)', fontSize:'.72rem', color:'var(--warm-mid)',
              padding:'0 0 10px', display:'block' }}>
              {'<'} I tuoi percorsi
            </button>
          )}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'.65rem', letterSpacing:'.15em',
                          textTransform:'uppercase', color:'var(--warm-mid)', marginBottom:'6px' }}>
              Percorso - in corso
            </div>
            <div style={{ display:'flex', gap:'6px' }}>
              <button onClick={() => exportCurriculumPDF(curriculum, resources)}
                style={{ background:'none', border:'1px solid var(--warm-border)',
                         borderRadius:'var(--radius-sm)', cursor:'pointer',
                         fontFamily:'var(--font-mono)', fontSize:'.6rem',
                         color:'var(--warm-mid)', padding:'3px 9px' }}>
                PDF
              </button>
              {onDelete && (
                <button onClick={() => onDelete(curriculum.id)}
                  style={{ background:'none', border:'1px solid #e0c0c0',
                           borderRadius:'var(--radius-sm)', cursor:'pointer',
                           fontFamily:'var(--font-mono)', fontSize:'.6rem',
                           color:'#c0392b', padding:'3px 9px' }}>
                  Elimina
                </button>
              )}
            </div>
          </div>
          <div style={{ fontSize:'1.7rem', fontStyle:'italic', fontFamily:'var(--font-display)', marginBottom:'4px' }}>
            {curriculum.title}
          </div>
          {curriculum.description && (
            <div style={{ fontSize:'.82rem', color:'var(--warm-mid)', lineHeight:1.5,
                          fontStyle:'italic', marginBottom:'10px' }}>
              {curriculum.description}
            </div>
          )}
          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'10px' }}>
            {badges.map(b => (
              <span key={b} style={{ background:'var(--warm-soft)', border:'1px solid var(--warm-border)',
                                     borderRadius:'4px', padding:'2px 8px', fontSize:'.78rem',
                                     color:'var(--warm-mid)', fontFamily:'var(--font-mono)' }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Risorse */}
        {resources.primary.length > 0 && (
          <div style={{ marginBottom:'26px' }}>
            <SectionTitle>Risorse primarie</SectionTitle>
            {resources.primary.map(r => <ResourceCard key={r.id ?? r.title} resource={r} curriculumTitle={curriculum.title} />)}
          </div>
        )}
        {resources.secondary.length > 0 && (
          <div style={{ marginBottom:'26px' }}>
            <SectionTitle>Risorse secondarie</SectionTitle>
            {resources.secondary.map(r => <ResourceCard key={r.id ?? r.title} resource={r} curriculumTitle={curriculum.title} />)}
          </div>
        )}
        {resources.other.length > 0 && (
          <div style={{ marginBottom:'26px' }}>
            <SectionTitle>Risorse non testuali</SectionTitle>
            {resources.other.map(r => <ResourceCard key={r.id ?? r.title} resource={r} curriculumTitle={curriculum.title} />)}
          </div>
        )}

        {/* Sezioni riferimento */}
        {(curriculum.referenceSections ?? []).map((s, i) => (
          <ReferenceSection key={s.type ?? i} section={s} />
        ))}

        {/* Progetto finale */}
        {curriculum.progettoFinale && (
          <div style={{ marginBottom:'26px' }}>
            <SectionTitle>Progetto finale</SectionTitle>
            <div style={{ background:'var(--warm-soft)', border:'1px solid var(--warm-border)',
                          borderLeft:'3px solid var(--warm-accent)', borderRadius:'8px', padding:'14px 16px' }}>
              <p style={{ fontSize:'.85rem', lineHeight:1.6, margin:0 }}>{curriculum.progettoFinale}</p>
            </div>
          </div>
        )}

        {/* Connessioni */}
        {(() => {
          const real   = (curriculum.connections ?? []).filter(c => !c.isAiSuggestion)
          const ai     = (curriculum.connections ?? []).filter(c =>  c.isAiSuggestion)
          const legacy = curriculum.aiSuggestions ?? []
          if (!real.length && !ai.length && !legacy.length) return null
          return (
            <div style={{ marginBottom:'26px' }}>
              <SectionTitle>Connessioni</SectionTitle>
              {real.map(c => {
                const linked = allCurricula?.find(x => x.id === c.connectedCurriculumId)
                return (
                  <div key={c.id} onClick={() => linked && onNavigate(linked.id)}
                    style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px',
                             background:'white', border:'1px solid var(--warm-border)', borderRadius:'8px',
                             marginBottom:'6px', cursor: linked ? 'pointer' : 'default' }}>
                    <div style={{ flex:1, fontSize:'.85rem' }}>{linked?.title ?? '—'}</div>
                  </div>
                )
              })}
              {[...ai, ...legacy].map((s, i) => (
                <div key={s.id ?? i} onClick={() => onNewFromSuggestion(s.title)}
                  style={{ display:'flex', alignItems:'flex-start', gap:'10px', padding:'12px 14px',
                           background:'var(--cream)', border:'1.5px dashed var(--warm-border)',
                           borderRadius:'8px', marginBottom:'6px', cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--warm-accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--warm-border)'}>
                  <div>
                    <div style={{ fontSize:'.85rem', fontStyle:'italic', marginBottom:'3px' }}>{s.title}</div>
                    <div style={{ fontSize:'.72rem', color:'var(--warm-mid)', lineHeight:1.4 }}>{s.reason ?? s.suggestionReason}</div>
                    <div style={{ fontFamily:'var(--font-mono)', fontSize:'.6rem', color:'var(--warm-accent)', marginTop:'5px' }}>
                      + Apri come nuovo percorso
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
