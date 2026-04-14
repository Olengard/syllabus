import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Syllabus] Variabili Supabase mancanti')
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder'
)

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function loadCurricula() {
  const user = await getCurrentUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('sl_curricula')
    .select(`
      *,
      resources:sl_resources ( * ),
      referenceItems:sl_reference_items ( * ),
      connections:sl_connections!curriculum_id ( * )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
  if (error) { console.error('[Syllabus] loadCurricula:', error.message); return [] }
  return data.map(normalizeCurriculum)
}

export async function getCurriculum(id) {
  const { data, error } = await supabase
    .from('sl_curricula')
    .select(`
      *,
      resources:sl_resources ( * ),
      referenceItems:sl_reference_items ( * ),
      connections:sl_connections!curriculum_id ( * )
    `)
    .eq('id', id)
    .single()
  if (error) { console.error('[Syllabus] getCurriculum:', error.message); return null }
  return normalizeCurriculum(data)
}

export async function saveCurriculum(curriculumData) {
  const user = await getCurrentUser()
  if (!user) throw new Error('Utente non autenticato')
  const { data: curriculum, error: currErr } = await supabase
    .from('sl_curricula')
    .insert({
      user_id: user.id,
      title: curriculumData.title,
      description: curriculumData.description ?? null,
      topic: curriculumData.topic,
      focus_areas: curriculumData.focusAreas ?? [],
      time_commitment: curriculumData.timeCommitment ?? null,
      level: curriculumData.level ?? null,
      must_haves: curriculumData.mustHaves ?? [],
      progress_pct: 0,
      status: 'active',
      progetto_finale: curriculumData.progettoFinale ?? null,
      ai_suggestions: curriculumData.aiSuggestions ?? [],
    })
    .select()
    .single()
  if (currErr) throw new Error(`[Syllabus] saveCurriculum: ${currErr.message}`)
  const cid = curriculum.id
  if (curriculumData.resources?.length) {
    const rows = curriculumData.resources.map((r, i) => ({
      curriculum_id: cid,
      title: r.title,
      author: r.author ?? null,
      type: r.type ?? 'libro',
      url: r.url ?? null,
      description: r.description ?? null,
      phase: r.phase ?? null,
      duration_minutes: r.duration_minutes ?? null,
      completed: false,
      order_index: i,
    }))
    const { error: resErr } = await supabase.from('sl_resources').insert(rows)
    if (resErr) console.error('[Syllabus] saveCurriculum resources:', resErr.message)
  }
  if (curriculumData.referenceSections?.length) {
    const rows = []
    for (const section of curriculumData.referenceSections) {
      for (const [i, item] of (section.items ?? []).entries()) {
        rows.push({
          curriculum_id: cid,
          section_type: section.type,
          label: section.label,
          title: item.title,
          author: item.author ?? null,
          location: item.location ?? null,
          year: item.year ?? null,
          notes: item.notes ?? null,
          order_index: i,
        })
      }
    }
    if (rows.length) {
      const { error: refErr } = await supabase.from('sl_reference_items').insert(rows)
      if (refErr) console.error('[Syllabus] saveCurriculum reference_items:', refErr.message)
    }
  }
  return getCurriculum(cid)
}

export async function deleteCurriculum(id) {
  // Elimina prima i record collegati (per sicurezza, anche se CASCADE è attivo)
  await supabase.from('sl_chats').delete().eq('curriculum_id', id)
  await supabase.from('sl_connections').delete().eq('curriculum_id', id)
  await supabase.from('sl_reference_items').delete().eq('curriculum_id', id)
  await supabase.from('sl_resources').delete().eq('curriculum_id', id)
  const { error } = await supabase.from('sl_curricula').delete().eq('id', id)
  if (error) throw new Error(`[Syllabus] deleteCurriculum: ${error.message}`)
  return true
}

export async function updateCurriculum(id, patch) {
  const { error } = await supabase
    .from('sl_curricula')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) console.error('[Syllabus] updateCurriculum:', error.message)
  return !error
}

export async function toggleResource(resourceId, completed) {
  const { error } = await supabase
    .from('sl_resources').update({ completed }).eq('id', resourceId)
  if (error) console.error('[Syllabus] toggleResource:', error.message)
  return !error
}

export async function addConnection(curriculumId, connectedId, {
  isAiSuggestion = false, suggestionReason = null,
} = {}) {
  const { error } = await supabase.from('sl_connections').insert({
    curriculum_id: curriculumId,
    connected_curriculum_id: connectedId,
    is_ai_suggestion: isAiSuggestion,
    suggestion_reason: suggestionReason,
  })
  if (error) console.error('[Syllabus] addConnection:', error.message)
  return !error
}

export async function loadChats(curriculumId) {
  const { data, error } = await supabase.from('sl_chats').select('*')
    .eq('curriculum_id', curriculumId).order('created_at', { ascending: true })
  if (error) { console.error('[Syllabus] loadChats:', error.message); return [] }
  return data
}

export async function saveChat(curriculumId, role, content) {
  const { data, error } = await supabase.from('sl_chats')
    .insert({ curriculum_id: curriculumId, role, content }).select().single()
  if (error) console.error('[Syllabus] saveChat:', error.message)
  return data ?? null
}

function normalizeCurriculum(raw) {
  const sectionsMap = {}
  for (const item of raw.referenceItems ?? []) {
    if (!sectionsMap[item.section_type]) {
      sectionsMap[item.section_type] = { type: item.section_type, label: item.label, items: [] }
    }
    sectionsMap[item.section_type].items.push({
      id: item.id, title: item.title, author: item.author,
      location: item.location, year: item.year, notes: item.notes,
    })
  }
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    topic: raw.topic,
    focusAreas: raw.focus_areas ?? [],
    timeCommitment: raw.time_commitment,
    level: raw.level,
    mustHaves: raw.must_haves ?? [],
    progressPct: raw.progress_pct ?? 0,
    status: raw.status,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
    resources: (raw.resources ?? [])
      .sort((a, b) => a.order_index - b.order_index)
      .map(r => ({
        id: r.id, title: r.title, author: r.author, type: r.type,
        url: r.url, description: r.description, phase: r.phase,
        durationMinutes: r.duration_minutes, completed: r.completed,
      })),
    referenceSections: Object.values(sectionsMap),
    connections: (raw.connections ?? []).map(c => ({
      id: c.id,
      connectedCurriculumId: c.connected_curriculum_id,
      isAiSuggestion: c.is_ai_suggestion,
      suggestionReason: c.suggestion_reason,
    })),
    progettoFinale: raw.progetto_finale ?? null,
    aiSuggestions: (raw.ai_suggestions ?? []).map(s => ({ title: s.title, reason: s.reason })),
  }
}
