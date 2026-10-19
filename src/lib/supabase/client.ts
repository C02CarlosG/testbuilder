import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Cliente para componentes de navegador (usa la llave pública; RLS aplica).
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
