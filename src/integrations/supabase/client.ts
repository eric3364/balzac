// src/integrations/supabase/client.ts
// Ce fichier initialise le client Supabase

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ⚠️ Récupération via variables d’environnement
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://rglaszkaqbagpbtursjf.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."; // mettre la vraie clé si nécessaire

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
