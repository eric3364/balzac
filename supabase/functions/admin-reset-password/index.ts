import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Créer le client Supabase avec le token de l'utilisateur
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client avec le token utilisateur pour vérifier les permissions
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Vérifier que l'utilisateur est super admin
    const { data: isAdmin, error: adminError } = await supabaseUser.rpc("is_super_admin");
    
    if (adminError || !isAdmin) {
      console.error("Admin check failed:", adminError);
      return new Response(
        JSON.stringify({ error: "Accès refusé - Vous devez être super administrateur" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Parser la requête
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email requis" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Admin requesting password reset for: ${email}`);

    // Client admin pour envoyer l'email de réinitialisation
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Envoyer l'email de réinitialisation de mot de passe
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${req.headers.get("origin") || supabaseUrl}/set-password`,
    });

    if (resetError) {
      console.error("Password reset error:", resetError);
      return new Response(
        JSON.stringify({ error: resetError.message }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Password reset email sent successfully to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: `Email de réinitialisation envoyé à ${email}` }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in admin-reset-password function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
