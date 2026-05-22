import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente Supabase SOLO de servidor, con service_role (bypassa RLS).
// El import "server-only" hace fallar el build si se importa desde cliente.
// La URL no es secreta; admite SUPABASE_URL o el NEXT_PUBLIC_SUPABASE_URL existente.
export function createServerClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Faltan SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
