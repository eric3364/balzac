// src/integrations/supabase/client.ts
// Ce fichier initialise le client Supabase

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

// ⚠️ Récupération via variables d’environnement
const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://rglaszkaqbagpbtursjf.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnbGFzemthcWJhZ3BidHVyc2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2ODU0ODUsImV4cCI6MjA2OTI2MTQ4NX0.ujbPJ2XqGyWS313D2PLGGxs1g8OJLdIw2qmID6Ift-U";

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
