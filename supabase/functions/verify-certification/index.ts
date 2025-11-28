import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // 30 requests per window
const RATE_WINDOW_MS = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0] || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Trop de requêtes. Veuillez réessayer plus tard." }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 429 
        }
      );
    }

    const { credential_id } = await req.json();
    
    // Input validation
    if (!credential_id || typeof credential_id !== "string") {
      return new Response(
        JSON.stringify({ error: "ID de certification requis" }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400 
        }
      );
    }

    // Validate credential_id format (CERT-YYYY-XXXXXXXX)
    const credentialPattern = /^CERT-\d{4}-[A-Z0-9]{8}$/;
    if (!credentialPattern.test(credential_id)) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: "Format d'identifiant invalide" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Query certification with minimal data exposure
    const { data: certification, error } = await supabaseClient
      .from("user_certifications")
      .select(`
        credential_id,
        level,
        certified_at,
        expiration_date,
        issuing_organization
      `)
      .eq("credential_id", credential_id)
      .single();

    if (error || !certification) {
      console.log("Certification not found for:", credential_id);
      return new Response(
        JSON.stringify({ 
          valid: false,
          message: "Certification non trouvée" 
        }),
        { 
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200 
        }
      );
    }

    // Get level name for display
    const { data: levelData } = await supabaseClient
      .from("difficulty_levels")
      .select("name")
      .eq("level_number", certification.level)
      .single();

    // Check if certification is still valid
    const now = new Date();
    const expirationDate = certification.expiration_date ? new Date(certification.expiration_date) : null;
    const isValid = !expirationDate || expirationDate > now;

    // Return minimal, non-sensitive verification data
    return new Response(
      JSON.stringify({
        valid: isValid,
        credential_id: certification.credential_id,
        level_name: levelData?.name || `Niveau ${certification.level}`,
        level_number: certification.level,
        certified_at: certification.certified_at,
        expiration_date: certification.expiration_date,
        issuing_organization: certification.issuing_organization,
        status: isValid ? "active" : "expired"
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );

  } catch (error) {
    console.error("Error verifying certification:", error);
    return new Response(
      JSON.stringify({ error: "Erreur lors de la vérification" }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
