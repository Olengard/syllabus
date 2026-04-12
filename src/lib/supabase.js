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

function normalizeCurriculum(raw) {
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
    progettoFinale: raw.progetto_finale ?? null,
    aiSuggestions: (raw.ai_suggestions ?? []).map(s => ({
      title: s.title,
      reason: s.reason,
    })),
  }
}
