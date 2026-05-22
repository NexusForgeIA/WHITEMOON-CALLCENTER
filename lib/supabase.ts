import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Revisa .env.local",
  );
}

// Cliente de navegador (rol anon). El panel lee y gestiona los datos del
// call center; las llamadas las lanza Bland.ai vía Edge Functions.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
