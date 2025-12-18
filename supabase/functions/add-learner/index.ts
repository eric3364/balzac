import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation helpers
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
}

function sanitizeString(str: string | undefined | null, maxLength: number): string {
  if (!str) return '';
  return str.trim().substring(0, maxLength);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { email, first_name, last_name, school, class_name, password } = requestBody;

    // Input validation
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email requis' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof email !== 'string' || !validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Format d\'email invalide' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and validate optional fields
    const sanitizedFirstName = sanitizeString(first_name, 100);
    const sanitizedLastName = sanitizeString(last_name, 100);
    const sanitizedSchool = sanitizeString(school, 200);
    const sanitizedClassName = sanitizeString(class_name, 100);

    // Validate password if provided
    if (password !== undefined && password !== null) {
      if (typeof password !== 'string' || password.length < 6 || password.length > 100) {
        return new Response(
          JSON.stringify({ error: 'Le mot de passe doit contenir entre 6 et 100 caractères' }), 
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Client lié au token du caller (pour vérifier qu'il est admin)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Token d\'authentification requis' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const supaUser = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authCtx, error: authErr } = await supaUser.auth.getUser();
    if (authErr || !authCtx?.user) {
      console.error('Erreur authentification:', authErr);
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Vérifier que le caller est admin (table administrators)
    const { data: adminRow, error: adminCheckError } = await supaUser
      .from("administrators")
      .select("user_id, is_super_admin")
      .eq("user_id", authCtx.user.id)
      .eq("is_super_admin", true)
      .maybeSingle();

    if (adminCheckError) {
      console.error('Erreur vérification admin:', adminCheckError);
      return new Response(
        JSON.stringify({ error: 'Erreur de vérification des permissions' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!adminRow) {
      console.log('Utilisateur non admin:', authCtx.user.id);
      return new Response(
        JSON.stringify({ error: 'Accès refusé - Droits administrateur requis' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Vérifier si l'utilisateur existe déjà dans la table users
    const supaAdmin = createClient(SUPABASE_URL, SERVICE_KEY);
    
    const { data: existingUser } = await supaAdmin
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'Un utilisateur avec cet email existe déjà' }), 
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 1) Créer l'utilisateur Auth
    const createUserOptions: any = {
      email: email.toLowerCase().trim(),
      email_confirm: true, // Confirme automatiquement l'email
      user_metadata: { 
        role: "learner", 
        first_name: sanitizedFirstName, 
        last_name: sanitizedLastName, 
        school: sanitizedSchool, 
        class_name: sanitizedClassName 
      },
    };

    // Toujours ajouter un mot de passe temporaire pour éviter les limites d'emails
    if (password) {
      createUserOptions.password = password;
    } else {
      // Générer un mot de passe temporaire si aucun n'est fourni
      createUserOptions.password = `temp_${Math.random().toString(36).slice(-8)}${Date.now().toString(36)}`;
    }

    const { data: created, error: createErr } = await supaAdmin.auth.admin.createUser(createUserOptions);
    
    if (createErr) {
      console.error('Erreur création utilisateur Auth:', createErr);
      return new Response(
        JSON.stringify({ error: `Erreur création utilisateur: ${createErr.message}` }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userId = created.user!.id;
    console.log('Utilisateur Auth créé:', userId);

    // 2) Créer l'entrée dans public.users (le trigger handle_new_user pourrait déjà l'avoir fait)
    const { error: insertErr } = await supaAdmin
      .from("users")
      .insert({
        user_id: userId,
        email: email.toLowerCase().trim(),
        first_name: sanitizedFirstName,
        last_name: sanitizedLastName,
        school: sanitizedSchool,
        class_name: sanitizedClassName,
        is_active: password ? true : false
      });

    if (insertErr) {
      console.error('Erreur insertion users:', insertErr);
      // Si l'erreur est due au trigger qui a déjà créé l'entrée, on continue
      if (!insertErr.message.includes('duplicate key value violates unique constraint')) {
        return new Response(
          JSON.stringify({ error: `Erreur création profil utilisateur: ${insertErr.message}` }), 
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    console.log('Utilisateur créé avec succès:', { userId, email });

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: userId, 
        email: email,
        message: password ? 'Utilisateur créé avec mot de passe' : 'Utilisateur créé avec mot de passe temporaire, devra le changer à la première connexion'
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (e: unknown) {
    console.error('Erreur générale:', e);
    const errorMessage = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: `Erreur serveur: ${errorMessage}` }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});