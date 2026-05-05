import { useState, useEffect } from 'react'
import ConnectionsNav from '../components/curriculum/ConnectionsNav'
import ChatPanel from '../components/curriculum/ChatPanel'
import { addToBookShelf, addToFootnote, loadBookShelfTitles, updateCurriculum } from '../lib/supabase'
import { generateCurriculum } from '../lib/generate'

const EMPTY_RESOURCES = { primary: [], secondary: [], other: [] }

function groupResources(resources) {
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
// PDF export
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
    ).join('') + '</div>'
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

function ResourceCard({ resource, curriculumTitle, bsTitles = new Set(), onDelete, completed = false, onToggle }) {
  const label  = TYPE_LABEL[resource.type] || '[*]'
  const app    = TYPE_APP[resource.type]
  const isText = ['book','essay','libro','saggio','articolo'].includes(resource.type)
  const [bsState, setBsState] = useState('idle')
  const [fnState, setFnState] = useState('idle')
  const normTitle  = t => (t ?? '').toLowerCase().trim()
  const alreadyInBS = bsTitles.has(normTitle(resource.title))
  const inBS = alreadyInBS || bsState === 'done'

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
          <button onClick={() => !inBS && bsState === 'idle' && handleAdd('BookShelf')} style={{
            fontSize:'.65rem', padding:'3px 8px', border:'none', borderRadius:'4px',
            cursor: inBS ? 'default' : bsState === 'idle' ? 'pointer' : 'default', whiteSpace:'nowrap',
            background: inBS ? '#4a7c59' : bsState === 'error' ? '#c0392b' : 'var(--warm-dark)',
            color:'var(--cream)', fontFamily:'var(--font-mono)', transition:'background .2s',
          }}>{inBS ? '\u2713 BookShelf' : btnText(bsState, '+ BookShelf')}</button>
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
        {onDelete && (
          <button onClick={() => onDelete(resource.title)} title="Rimuovi risorsa" style={{
            fontSize:'.65rem', padding:'3px 8px', border:'1px solid #e0c0c0',
            borderRadius:'4px', cursor:'pointer', background:'transparent',
            color:'#c0392b', fontFamily:'var(--font-mono)',
          }}>\u00d7</button>
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
export default function Curriculum({ curriculum, allCurricula, onNavigate, onNewFromSuggestion, onBack, onDelete, onUpdate, isMobile }) {

  // BookShelf presence check
  const [bsTitles, setBsTitles] = useState(new Set())
  useEffect(() => { loadBookShelfTitles().then(setBsTitles).catch(() => {}) }, [])

  // Risorse locali (aggiornate da delete e regen senza aspettare il reload)
  const [localResources, setLocalResources] = useState(() => curriculum.resources ?? [])
  useEffect(() => { setLocalResources(curriculum.resources ?? []) }, [curriculum.id])

  // Modifica titolo / descrizione inline
  const [editMode, setEditMode]   = useState(false)
  const [editTitle, setEditTitle] = useState(curriculum.title)
  const [editDesc,  setEditDesc]  = useState(curriculum.description ?? '')
  const [editSaving, setEditSaving] = useState(false)
  useEffect(() => {
    setEditTitle(curriculum.title)
    setEditDesc(curriculum.description ?? '')
  }, [curriculum.id])

  // Pannello rigenera risorse
  const [regenPanel,   setRegenPanel]   = useState(false)
  const [regenKeep,    setRegenKeep]    = useState({})
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenError,   setRegenError]   = useState(null)

  const resources = localResources.length > 0 ? groupResources(localResources) : EMPTY_RESOURCES
  const badges    = [curriculum.timeCommitment, curriculum.level, ...(curriculum.focusAreas ?? []).slice(0,2)].filter(Boolean)

  // Salva titolo + descrizione
  async function handleSaveEdit() {
    setEditSaving(true)
    try {
      await updateCurriculum(curriculum.id, { title: editTitle, description: editDesc })
      onUpdate?.(curriculum.id, { title: editTitle, description: editDesc })
    } finally {
      setEditSaving(false)
      setEditMode(false)
    }
  }

  // Rimuovi singola risorsa
  function handleDeleteResource(resourceTitle) {
    const updated = localResources.filter(r => r.title !== resourceTitle)
    setLocalResources(updated)
    const newRaw = {
      resources:         updated,
      referenceSections: curriculum.referenceSections ?? [],
      progettoFinale:    curriculum.progettoFinale    ?? null,
      aiSuggestions:     curriculum.aiSuggestions     ?? [],
    }
    updateCurriculum(curriculum.id, { raw_data: newRaw })
    onUpdate?.(curriculum.id, { raw_data: newRaw, resources: updated })

  // Segna/desegna risorsa come completata e ricalcola progress_pct
  function handleToggleResource(resourceTitle) {
    const updated = localResources.map(r =>
      r.title === resourceTitle ? { ...r, completed: !r.completed } : r
    )
    setLocalResources(updated)
    const done = updated.filter(r => r.completed).length
    const pct  = updated.length > 0 ? Math.round(done / updated.length * 100) : 0
    const newRaw = {
      resources:         updated,
      referenceSections: curriculum.referenceSections ?? [],
      progettoFinale:    curriculum.progettoFinale    ?? null,
      aiSuggestions:     curriculum.aiSuggestions     ?? [],
    }
    updateCurriculum(curriculum.id, { raw_data: newRaw, progress_pct: pct })
    onUpdate?.(curriculum.id, { raw_data: newRaw, resources: updated, progressPct: pct })
  }
  }

  // Apri pannello rigenera con tutte le risorse selezionate di default
  function openRegenPanel() {
    const init = {}
    localResources.forEach(r => { init[r.title] = true })
    setRegenKeep(init)
    setRegenError(null)
    setRegenPanel(true)
  }

  // Rigenera
  async function handleRegen() {
    setRegenLoading(true)
    setRegenError(null)
    try {
      const kept = localResources.filter(r => regenKeep[r.title] !== false).map(r => r.title)
      const result = await generateCurriculum({
        topic:          curriculum.topic,
        focusAreas:     curriculum.focusAreas,
        timeCommitment: curriculum.timeCommitment,
        level:          curriculum.level,
        mustHaves:      kept,
      })
      const newRaw = {
        resources:         result.resources,
        referenceSections: result.referenceSections?.length ? result.referenceSections : (curriculum.referenceSections ?? []),
        progettoFinale:    result.progettoFinale    ?? curriculum.progettoFinale ?? null,
        aiSuggestions:     result.aiSuggestions     ?? curriculum.aiSuggestions  ?? [],
      }
      setLocalResources(result.resources)
      setRegenPanel(false)
      await updateCurriculum(curriculum.id, { raw_data: newRaw })
      onUpdate?.(curriculum.id, { raw_data: newRaw, resources: result.resources })
    } catch (e) {
      setRegenError(e.message)
    } finally {
      setRegenLoading(false)
    }
  }

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
              {!editMode && (
                <button onClick={() => setEditMode(true)}
                  title="Modifica titolo e descrizione"
                  style={{ background:'none', border:'1px solid var(--warm-border)',
                           borderRadius:'var(--radius-sm)', cursor:'pointer',
                           fontFamily:'var(--font-mono)', fontSize:'.6rem',
                           color:'var(--warm-mid)', padding:'3px 9px' }}>
                  \u270f
                </button>
              )}
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

          {/* Titolo e descrizione: modalita' visualizzazione o edit */}
          {editMode ? (
            <div>
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                style={{ width:'100%', fontSize:'1.4rem', fontStyle:'italic',
                         fontFamily:'var(--font-display)', border:'none',
                         borderBottom:'2px solid var(--warm-accent)', background:'transparent',
                         color:'var(--ink)', marginBottom:'8px', outline:'none', padding:'2px 0' }} />
              <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)}
                rows={3}
                style={{ width:'100%', fontSize:'.82rem', fontStyle:'italic',
                         fontFamily:'var(--font-serif)', border:'1px solid var(--warm-border)',
                         borderRadius:'6px', background:'var(--warm-soft)',
                         color:'var(--warm-mid)', padding:'8px', resize:'vertical', outline:'none' }} />
              <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
                <button onClick={handleSaveEdit} disabled={editSaving}
                  style={{ background:'var(--warm-dark)', color:'var(--cream)', border:'none',
                           borderRadius:'4px', padding:'5px 14px', cursor:'pointer',
                           fontFamily:'var(--font-mono)', fontSize:'.7rem' }}>
                  {editSaving ? '...' : 'Salva'}
                </button>
                <button onClick={() => setEditMode(false)}
                  style={{ background:'none', border:'1px solid var(--warm-border)',
                           borderRadius:'4px', padding:'5px 14px', cursor:'pointer',
                           fontFamily:'var(--font-mono)', fontSize:'.7rem', color:'var(--warm-mid)' }}>
                  Annulla
                </button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:'1.7rem', fontStyle:'italic', fontFamily:'var(--font-display)', marginBottom:'4px' }}>
                {editTitle || curriculum.title}
              </div>
              {(editDesc || curriculum.description) && (
                <div style={{ fontSize:'.82rem', color:'var(--warm-mid)', lineHeight:1.5,
                              fontStyle:'italic', marginBottom:'10px' }}>
                  {editDesc || curriculum.description}
                </div>
              )}
            </>
          )}

          <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginTop:'10px' }}>
            {badges.map(b => (
              <span key={b} style={{ background:'var(--warm-soft)', border:'1px solid var(--warm-border)',
                                     borderRadius:'4px', padding:'2px 8px', fontSize:'.78rem',
                                     color:'var(--warm-mid)', fontFamily:'var(--font-mono)' }}>{b}</span>
            ))}
          </div>
        </div>

        {/* Pannello rigenera risorse */}
        {regenPanel && (
          <div style={{ marginBottom:'24px', background:'var(--warm-soft)', border:'1px solid var(--warm-border)',
                        borderLeft:'3px solid var(--warm-accent)', borderRadius:'8px', padding:'16px 18px' }}>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:'.7rem', letterSpacing:'.1em',
                          textTransform:'uppercase', color:'var(--warm-mid)', marginBottom:'12px' }}>
              Rigenera risorse — seleziona quelle da mantenere come punti fermi
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom:'14px' }}>
              {localResources.map(r => (
                <label key={r.title} style={{ display:'flex', alignItems:'center', gap:'10px',
                                              cursor:'pointer', fontSize:'.82rem' }}>
                  <input type="checkbox"
                    checked={regenKeep[r.title] !== false}
                    onChange={e => setRegenKeep(prev => ({ ...prev, [r.title]: e.target.checked }))}
                    style={{ accentColor:'var(--warm-accent)', width:'15px', height:'15px', flexShrink:0 }} />
                  <span>
                    <strong>{r.title}</strong>
                    {r.author && <span style={{ color:'var(--warm-mid)', marginLeft:'6px',
                                                fontSize:'.75rem', fontStyle:'italic' }}>{r.author}</span>}
                  </span>
                </label>
              ))}
            </div>
            {regenError && (
              <div style={{ color:'#c0392b', fontFamily:'var(--font-mono)', fontSize:'.72rem',
                            marginBottom:'10px' }}>{regenError}</div>
            )}
          {localResources.length > 0 && (() => {
            const done  = localResources.filter(r => r.completed).length
            const total = localResources.length
            const pct   = Math.round(done / total * 100)
            return (
              <div style={{ marginTop:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'4px' }}>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'.65rem', color:'var(--warm-mid)' }}>
                    {done}/{total} completate
                  </span>
                  <span style={{ fontFamily:'var(--font-mono)', fontSize:'.65rem', color:'var(--warm-accent)' }}>
                    {pct}%
                  </span>
                </div>
                <div style={{ height:'4px', background:'var(--warm-soft)', borderRadius:'2px' }}>
                  <div style={{ height:'100%', width:pct+'%', background:'var(--warm-accent)', borderRadius:'2px', transition:'width .3s' }} />
                </div>
              </div>
            )
          })()}
            <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={handleRegen} disabled={regenLoading}
                style={{ background:'var(--warm-accent)', color:'white', border:'none',
                         borderRadius:'4px', padding:'6px 16px', cursor: regenLoading ? 'default' : 'pointer',
                         fontFamily:'var(--font-mono)', fontSize:'.7rem', opacity: regenLoading ? 0.7 : 1 }}>
                {regenLoading ? 'Generazione in corso...' : 'Rigenera'}
              </button>
              <button onClick={() => setRegenPanel(false)} disabled={regenLoading}
                style={{ background:'none', border:'1px solid var(--warm-border)',
                         borderRadius:'4px', padding:'6px 16px', cursor:'pointer',
                         fontFamily:'var(--font-mono)', fontSize:'.7rem', color:'var(--warm-mid)' }}>
                Annulla
              </button>
            </div>
          </div>
        )}

        {/* Risorse + bottone rigenera */}
        {(resources.primary.length > 0 || resources.secondary.length > 0 || resources.other.length > 0) && (
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'8px' }}>
            <button onClick={openRegenPanel}
              style={{ background:'none', border:'1px solid var(--warm-border)',
                       borderRadius:'4px', cursor:'pointer', fontFamily:'var(--font-mono)',
                       fontSize:'.6rem', color:'var(--warm-mid)', padding:'3px 10px' }}>
              \u21ba Rigenera risorse
            </button>
          </div>
        )}
        {resources.primary.length > 0 && (
          <div style={{ marginBottom:'26px' }}>
            <SectionTitle>Risorse primarie</SectionTitle>
            {resources.primary.map(r => <ResourceCard key={r.id ?? r.title} resource={r}
              completed={r.completed ?? false}
              onToggle={() => handleToggleResource(r.title)}
              curriculumTitle={curriculum.title} bsTitles={bsTitles}
              onDelete={handleDeleteResource} />)}
          </div>
        )}
        {resources.secondary.length > 0 && (
          <div style={{ marginBottom:'26px' }}>
            <SectionTitle>Risorse secondarie</SectionTitle>
            {resources.secondary.map(r => <ResourceCard key={r.id ?? r.title} resource={r}
              completed={r.completed ?? false}
              onToggle={() => handleToggleResource(r.title)}
              curriculumTitle={curriculum.title} bsTitles={bsTitles}
              onDelete={handleDeleteResource} />)}
          </div>
        )}
        {resources.other.length > 0 && (
          <div style={{ marginBottom:'26px' }}>
            <SectionTitle>Risorse non testuali</SectionTitle>
            {resources.other.map(r => <ResourceCard key={r.id ?? r.title} resource={r}
              completed={r.completed ?? false}
              onToggle={() => handleToggleResource(r.title)}
              curriculumTitle={curriculum.title} bsTitles={bsTitles}
              onDelete={handleDeleteResource} />)}
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
                    <div style={{ flex:1, fontSize:'.85rem' }}>{linked?.title ?? '\u2013'}</div>
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
