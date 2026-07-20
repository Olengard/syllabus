// Roster del master: raggruppamento dei PG per CAMPAGNA (logica pura, testata).
//
// Le campagne di questo modulo sono LOCALI e indipendenti dalle campagne
// condivise del tab 🤝 Tavolo (tabella `campaigns` su Supabase): servono a
// tenere in ordine il roster anche quando non c'è nessun giocatore collegato,
// e funzionano offline. Un PG porta il riferimento in `char.campaignId`.
//
// ⚠️ Da non confondere con `campaign.js`, che è il parser delle schede della
// wiki Obsidian (tab 🗺 Campagna): ambito completamente diverso.

// Filtro "tutte le campagne": i PG non assegnati si vedono SOLO qui (scelta di
// Stefano — il filtro per campagna è rigoroso, così non ti ritrovi al tavolo
// PG di un'altra storia mescolati ai tuoi).
export const TUTTE = "";

// I PG visibili con il filtro corrente. Con TUTTE tornano tutti, nell'ordine
// ricevuto (l'ordine del roster è già gestito altrove).
export function filterByCampaign(characters, filtro) {
  const list = characters || [];
  if (!filtro) return list;
  return list.filter((c) => c && c.campaignId === filtro);
}

// Quanti PG per campagna, più il conteggio dei non assegnati: serve alla UI per
// dire "Zeitgeist (4)" e per avvisare che ci sono PG fuori da ogni campagna.
export function countByCampaign(characters, campaigns) {
  const out = {};
  for (const c of campaigns || []) out[c.id] = 0;
  let nonAssegnati = 0;
  for (const ch of characters || []) {
    if (!ch) continue;
    if (ch.campaignId && out[ch.campaignId] !== undefined) out[ch.campaignId] += 1;
    else nonAssegnati += 1;
  }
  return { perCampagna: out, nonAssegnati };
}

// Aggiunge una campagna locale. Nomi duplicati ammessi (sono etichette del
// master), ma il nome vuoto no. L'id è stabile e non riusa mai quelli esistenti.
export function addCampaign(campaigns, name) {
  const nome = String(name || "").trim();
  if (!nome) return campaigns || [];
  const list = campaigns || [];
  const id = `rc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return [...list, { id, name: nome }];
}

export function renameCampaign(campaigns, id, name) {
  const nome = String(name || "").trim();
  if (!nome) return campaigns || [];
  return (campaigns || []).map((c) => (c.id === id ? { ...c, name: nome } : c));
}

// Elimina la campagna. NON tocca i PG: restano con un `campaignId` orfano e
// ricompaiono fra i non assegnati (vedi countByCampaign, che conta come non
// assegnato ogni PG il cui id non esiste più). Cancellare una campagna non
// deve poter far sparire dei personaggi.
export function removeCampaign(campaigns, id) {
  return (campaigns || []).filter((c) => c.id !== id);
}

// Il filtro da applicare dopo un'eliminazione: se stavi guardando la campagna
// appena cancellata, torni a "tutte" invece di restare su un filtro fantasma
// che non mostrerebbe nulla.
export function filterAfterRemoval(filtro, idRimosso) {
  return filtro === idRimosso ? TUTTE : filtro;
}

// Il PG da selezionare dopo un cambio di filtro: se quello attivo è ancora
// visibile resta lui, altrimenti il primo della lista (o nessuno se vuota).
// Evita la scheda "fantasma" di un PG che il filtro corrente non mostra.
export function activeAfterFilter(characters, filtro, activeId) {
  const visibili = filterByCampaign(characters, filtro);
  if (visibili.some((c) => c.id === activeId)) return activeId;
  return visibili.length ? visibili[0].id : null;
}
