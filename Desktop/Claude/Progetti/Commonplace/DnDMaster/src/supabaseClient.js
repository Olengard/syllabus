// Client Supabase — progetto Commonplace condiviso (stesso di BookShelf/ListenS).
// La chiave è pubblica ("publishable"): la sicurezza sta nella RLS di dnd_saves.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://pchldmiavycxzpkzochn.supabase.co";
const SUPABASE_KEY = "sb_publishable_So_xiN0gtH5JcHlA1uc1qQ_JhY9RdbD";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
