// Schede condivise coi giocatori — TRASPORTO del layer condiviso (blocco 3b).
// Wrapper sottile su Supabase per le tabelle campaigns / campaign_members /
// dnd_shared_chars e la RPC join_campaign. Nessuna chiave nuova: la sicurezza è
// la RLS lato DB (le query qui riflettono ciò che le policy già permettono).
// Vive FUORI dal motore dnd_saves (sync.js): percorso di sync a sé.
//
// Due canali sulla STESSA riga (vedi sharedChar.js): il giocatore scrive l'intero
// char (un upsert copre vitali+amministrativo); il master legge i vitali live via
// Realtime e diffa l'amministrativo contro la sua copia di roster.
//
// Convenzione: i metodi ritornano i dati oppure lanciano Error con messaggio
// leggibile (l'uid dell'utente lo passa il chiamante — App lo conosce dal login).

const TABLE = "dnd_shared_chars";
const now = () => new Date().toISOString();

// Normalizza {data,error} di Supabase: lancia su error, ritorna data.
function unwrap({ data, error }, msg) {
  if (error) throw new Error(msg ? `${msg}: ${error.message || error.code || error}` : (error.message || String(error)));
  return data;
}

export function createSharedSync(client) {
  // ── Master ────────────────────────────────────────────────────────────────
  // Crea una campagna (master_uid e join_code sono default lato DB). Ritorna la
  // riga completa (id, name, join_code) da mostrare al master.
  async function createCampaign(name) {
    const res = await client.from("campaigns").insert({ name }).select().single();
    return unwrap(res, "Creazione campagna fallita");
  }

  // Le campagne di cui l'utente è MASTER (proprietario).
  async function listMyCampaigns(uid) {
    const res = await client.from("campaigns").select("*").eq("master_uid", uid);
    return unwrap(res, "Elenco campagne fallito") || [];
  }

  // Tutte le campagne VISIBILI all'utente (RLS: possedute + quelle di cui è
  // membro). Serve al giocatore per mostrare il nome della campagna accanto alle
  // sue schede condivise (le righe di dnd_shared_chars portano solo campaign_id).
  async function listVisibleCampaigns() {
    const res = await client.from("campaigns").select("id,name,join_code,master_uid");
    return unwrap(res, "Elenco campagne fallito") || [];
  }

  // I membri (giocatori) iscritti a una campagna: uid + nome scelto al join.
  async function listMembers(campaignId) {
    const res = await client.from("campaign_members").select("*").eq("campaign_id", campaignId);
    return unwrap(res, "Elenco membri fallito") || [];
  }

  // Il master SEMINA / aggiorna la riga condivisa di un giocatore (push-down):
  // char_id = l'id della copia di roster del master → linking automatico e
  // permanente. Upsert sulla PK (campaign_id, player_uid, char_id).
  async function seedSharedChar(campaignId, playerUid, charId, char) {
    const row = { campaign_id: campaignId, player_uid: playerUid, char_id: String(charId), char, updated_at: now() };
    const res = await client.from(TABLE).upsert(row);
    unwrap(res, "Assegnazione scheda fallita");
    return row;
  }

  // Tutte le schede condivise di una campagna (per la vista master).
  async function listSharedForMaster(campaignId) {
    const res = await client.from(TABLE).select("*").eq("campaign_id", campaignId);
    return unwrap(res, "Lettura schede condivise fallita") || [];
  }

  // Rimuove una riga condivisa (il master ritira l'assegnazione).
  async function deleteSharedChar(campaignId, playerUid, charId) {
    const res = await client.from(TABLE).delete()
      .eq("campaign_id", campaignId).eq("player_uid", playerUid).eq("char_id", String(charId));
    unwrap(res, "Rimozione scheda condivisa fallita");
  }

  // ── Giocatore ───────────────────────────────────────────────────────────────
  // Entra in campagna col join-code (RPC SECURITY DEFINER): registra la membership
  // e ritorna { campaignId, campaignName }. Mappa il codice sbagliato in messaggio.
  async function joinCampaign(code, displayName) {
    const { data, error } = await client.rpc("join_campaign", {
      p_code: code, p_display_name: displayName ?? null,
    });
    if (error) {
      if (String(error.message || "").includes("CODICE_NON_VALIDO")) throw new Error("Codice campagna non valido");
      throw new Error(`Ingresso in campagna fallito: ${error.message || error}`);
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error("Codice campagna non valido");
    return { campaignId: row.campaign_id, campaignName: row.campaign_name };
  }

  // Le schede condivise assegnate al giocatore (righe che possiede).
  async function listSharedForMe(uid) {
    const res = await client.from(TABLE).select("*").eq("player_uid", uid);
    return unwrap(res, "Lettura schede condivise fallita") || [];
  }

  // Il giocatore aggiorna la PROPRIA riga condivisa (vitali live + amministrativo).
  // char_id = quello assegnato dal master (upsert sulla PK, non ne crea di nuovi).
  async function upsertMySharedChar(campaignId, playerUid, charId, char) {
    const row = { campaign_id: campaignId, player_uid: playerUid, char_id: String(charId), char, updated_at: now() };
    const res = await client.from(TABLE).upsert(row);
    unwrap(res, "Salvataggio scheda condivisa fallito");
    return row;
  }

  // ── Realtime (vista master live: vitali senza refresh) ───────────────────────
  // Sottoscrive i cambi delle righe condivise di UNA campagna. La RLS vale anche
  // per Realtime: arrivano solo le righe delle campagne del master. `onChange`
  // riceve il payload Supabase (eventType + new/old). Ritorna la funzione di
  // disiscrizione da chiamare allo smontaggio della vista.
  function subscribeSharedForMaster(campaignId, onChange) {
    const channel = client
      .channel(`shared:${campaignId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE, filter: `campaign_id=eq.${campaignId}` },
        (payload) => { try { onChange?.(payload); } catch {} },
      )
      .subscribe();
    return () => { try { client.removeChannel(channel); } catch {} };
  }

  return {
    createCampaign, listMyCampaigns, listVisibleCampaigns, listMembers,
    seedSharedChar, listSharedForMaster, deleteSharedChar,
    joinCampaign, listSharedForMe, upsertMySharedChar,
    subscribeSharedForMaster,
  };
}
