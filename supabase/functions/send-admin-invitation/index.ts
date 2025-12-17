import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AdminInviteRequest {
  email: string;
  is_super_admin: boolean;
  temporary_password: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('=== START send-admin-invitation ===');
    
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin user is authenticated and is super admin
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé - header manquant' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User authentication failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé - utilisateur invalide' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    console.log('User authenticated:', user.id);

    // Check if user is super admin by querying the administrators table
    console.log('Checking super admin status for user:', user.id);
    const { data: adminRecord, error: adminCheckError } = await supabaseClient
      .from('administrators')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single();
    
    console.log('Admin record:', adminRecord, 'Error:', adminCheckError);
    
    if (adminCheckError) {
      console.error('Error checking admin status:', adminCheckError);
      return new Response(
        JSON.stringify({ 
          error: 'Erreur lors de la vérification des permissions',
          details: adminCheckError.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
    
    if (!adminRecord || !adminRecord.is_super_admin) {
      console.error('User is not super admin:', { adminRecord });
      return new Response(
        JSON.stringify({ error: 'Accès refusé - seuls les super administrateurs peuvent inviter' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Super admin verified, proceeding with invitation');

    const { email, is_super_admin, temporary_password }: AdminInviteRequest = await req.json();

    console.log('Creating admin account for:', email);

    // Check if user already exists in auth.users
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      console.error('Error listing users:', listError);
      throw listError;
    }

    const existingUser = existingUsers.users.find(u => u.email === email);
    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      console.log('User already exists in auth:', existingUser.id);
      userId = existingUser.id;
      
      // Check if already in administrators table
      const { data: existingAdmin } = await supabaseClient
        .from('administrators')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (existingAdmin) {
        console.log('User is already an administrator');
        return new Response(
          JSON.stringify({ 
            error: 'Cet utilisateur est déjà administrateur',
            details: 'L\'adresse email est déjà enregistrée comme administrateur dans le système'
          }),
          { 
            status: 422, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      
      console.log('Adding existing user to administrators table');
    } else {
      // Create new user
      console.log('Creating new user in auth');
      const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
        email: email,
        password: temporary_password,
        email_confirm: true,
        user_metadata: {
          force_password_change: true,
          is_admin: true
        }
      });

      if (createError) {
        console.error('Error creating user:', createError);
        throw createError;
      }

      console.log('User created:', newUser.user?.id);
      userId = newUser.user!.id;
      isNewUser = true;
    }

    // Add to administrators table
    const { error: adminError } = await supabaseClient
      .from('administrators')
      .insert({
        email: email,
        is_super_admin: is_super_admin,
        user_id: userId
      });

    if (adminError) {
      console.error('Error inserting into administrators table:', adminError);
      
      // Cleanup: delete the user account if admin table insert fails and it was a new user
      if (isNewUser) {
        await supabaseClient.auth.admin.deleteUser(userId);
      }
      
      throw adminError;
    }

    console.log('Admin record created, sending email to:', email);

    // Send invitation email
    const emailHtml = isNewUser ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
          Bienvenue sur la plateforme d'administration
        </h1>
        
        <p>Bonjour,</p>
        
        <p>Vous avez été désigné comme <strong>${is_super_admin ? 'Super Administrateur' : 'Administrateur'}</strong> sur notre plateforme de certification.</p>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #6366f1;">Vos informations de connexion :</h3>
          <p><strong>Email :</strong> ${email}</p>
          <p><strong>Mot de passe temporaire :</strong> <code style="background-color: #e9ecef; padding: 4px 8px; border-radius: 4px; font-family: monospace;">${temporary_password}</code></p>
        </div>
        
        <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #856404;">🔒 Sécurité importante</h4>
          <p style="margin-bottom: 0;">Pour des raisons de sécurité, vous devrez <strong>changer ce mot de passe</strong> lors de votre première connexion.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://certification-balzac.fr/auth" 
             style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Se connecter à la plateforme
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <p style="color: #6c757d; font-size: 14px;">
          Si vous n'avez pas demandé cet accès, veuillez ignorer ce message ou contacter l'administrateur principal.
        </p>
        
        <p style="color: #6c757d; font-size: 14px;">
          Équipe technique<br>
          Plateforme de certification
        </p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
          Droits d'administration accordés
        </h1>
        
        <p>Bonjour,</p>
        
        <p>Votre compte a été promu <strong>${is_super_admin ? 'Super Administrateur' : 'Administrateur'}</strong> sur notre plateforme de certification.</p>
        
        <p>Vous pouvez désormais accéder à l'interface d'administration avec vos identifiants habituels.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://certification-balzac.fr/auth" 
             style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">
            Se connecter à la plateforme
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #dee2e6; margin: 30px 0;">
        
        <p style="color: #6c757d; font-size: 14px;">
          Si vous n'avez pas demandé cet accès, veuillez contacter l'administrateur principal immédiatement.
        </p>
        
        <p style="color: #6c757d; font-size: 14px;">
          Équipe technique<br>
          Plateforme de certification
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "Administration <noreply@balzac.education>",
      to: [email],
      subject: isNewUser ? "Accès administrateur - Plateforme de certification" : "Droits d'administration accordés",
      html: emailHtml,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Email d'invitation envoyé avec succès",
      email_id: emailResponse.data?.id
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-admin-invitation function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Erreur lors de l'envoi de l'invitation",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);