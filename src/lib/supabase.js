import { createClient } from '@supabase/supabase-js'

// Le stesse credenziali del progetto Commonplace principale
// (pchldmiavycxzpkzochn — stesso di BookShelf, Footnote, ListenS)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[Syllabus] Variabili Supabase mancanti — controlla .env')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

// ---------------------------------------------------------------------------
// Curricula — lettura
// ---------------------------------------------------------------------------

/**
 * Carica tutti i curricula dell'utente corrente,
 * con risorse, reference items e connessioni annesse.
 */
export async function loadCurricula() {
  const user = await getCurrentUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('sl_curricula')
    .select(`
      *,
      resources:sl_resources ( * ),
      referenceItems:sl_reference_items ( * ),
      connections:sl_connections ( * )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[Syllabus] loadCurricula:', error.message)
    return []
  }

  return data.map(normalizeCurriculum)
}

/**
 * Carica un singolo curriculum con tutti i dati correlati.
 */
export async function getCurriculum(id) {
  const { data, error } = await supabase
    .from('sl_curricula')
    .select(`
      *,
      resources:sl_resources ( * ),
      referenceItems:sl_reference_items ( * ),
      connections:sl_connections ( * )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('[Syllabus] getCurriculum:', error.message)
    return null
  }

  return normalizeCurriculum(data)
}

// ---------------------------------------------------------------------------
// Curricula — scrittura
// ---------------------------------------------------------------------------

/**
 * Crea un nuovo curriculum con risorse e reference items.
 * `curriculumData` ha la forma prodotta dal Wizard:
 *   { title, description, topic, focusAreas, timeCommitment, level,
 *     mustHaves, resources, referenceSections }
 */
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

/**
 * Aggiorna campi scalari di un curriculum (es. progress_pct, status, title).
 */
export async function updateCurriculum(id, patch) {
  const { error } = await supabase
    .from('sl_curricula')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) console.error('[Syllabus] updateCurriculum:', error.message)
  return !error
}

/**
 * Segna una risorsa come completata/non completata.
 */
export async function toggleResource(resourceId, completed) {
  const { error } = await supabase
    .from('sl_resources')
    .update({ completed })
    .eq('id', resourceId)

  if (error) console.error('[Syllabus] toggleResource:', error.message)
  return !error
}

// ---------------------------------------------------------------------------
// Connessioni
// ---------------------------------------------------------------------------

/**
 * Aggiunge una connessione tra due curricula.
 * `isAiSuggestion` = true per i suggerimenti generati da AI.
 */
export async function addConnection(curriculumId, connectedId, {
  isAiSuggestion = false,
  suggestionReason = null,
} = {}) {
  const { error } = await supabase
    .from('sl_connections')
    .insert({
      curriculum_id: curriculumId,
      connected_curriculum_id: connectedId,
      is_ai_suggestion: isAiSuggestion,
      suggestion_reason: suggestionReason,
    })

  if (error) console.error('[Syllabus] addConnection:', error.message)
  return !error
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

/**
 * Carica la cronologia chat di un curriculum, ordinata per data.
 */
export async function loadChats(curriculumId) {
  const { data, error } = await supabase
    .from('sl_chats')
    .select('*')
    .eq('curriculum_id', curriculumId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Syllabus] loadChats:', error.message)
    return []
  }
  return data
}

/**
 * Salva un singolo messaggio chat.
 * `role`: 'user' | 'ai'
 */
export async function saveChat(curriculumId, role, content) {
  const { data, error } = await supabase
    .from('sl_chats')
    .insert({ curriculum_id: curriculumId, role, content })
    .select()
    .single()

  if (error) console.error('[Syllabus] saveChat:', error.message)
  return data ?? null
}

// ---------------------------------------------------------------------------
// Normalizzazione
// ---------------------------------------------------------------------------

/**
 * Converte il record grezzo Supabase nella forma usata dai componenti React.
 * In particolare, raggruppa i sl_reference_items in un array referenceSections.
 */
function normalizeCurriculum(raw) {
  // Raggruppa reference items per section_type
  const sectionsMap = {}
  for (const item of raw.referenceItems ?? []) {
    if (!sectionsMap[item.section_type]) {
      sectionsMap[item.section_type] = {
        type: item.section_type,
        label: item.label,
        items: [],
      }
    }
    sectionsMap[item.section_type].items.push({
      id: item.id,
      title: item.title,
      author: item.author,
      location: item.location,
      year: item.year,
      notes: item.notes,
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
        id: r.id,
        title: r.title,
        author: r.author,
        type: r.type,
        url: r.url,
        description: r.description,
        phase: r.phase,
        durationMinutes: r.duration_minutes,
        completed: r.completed,
        cpItemId: r.cp_item_id,
      })),
    referenceSections: Object.values(sectionsMap),
    connections: (raw.connections ?? []).map(c => ({
      id: c.id,
      connectedCurriculumId: c.connected_curriculum_id,
      isAiSuggestion: c.is_ai_suggestion,
      suggestionReason: c.suggestion_reason,
    })),
  }
}
