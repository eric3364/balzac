import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from "npm:resend@2.0.0";

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
    // Initialize Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify admin user is authenticated and is super admin
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    const { data: { user } } = await supabaseClient.auth.getUser(token);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Check if user is super admin by querying the administrators table
    const { data: adminRecord, error: adminCheckError } = await supabaseClient
      .from('administrators')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .single();
    
    if (adminCheckError || !adminRecord || !adminRecord.is_super_admin) {
      console.error('Admin check failed:', adminCheckError);
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

    // Create user account with service role key
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
      
      if (createError.message?.includes('already registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'Un utilisateur avec cet email existe déjà',
            details: createError.message 
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
      
      throw createError;
    }

    console.log('User created:', newUser.user?.id);

    // Add to administrators table
    const { error: adminError } = await supabaseClient
      .from('administrators')
      .insert({
        email: email,
        is_super_admin: is_super_admin,
        user_id: newUser.user?.id
      });

    if (adminError) {
      console.error('Error inserting into administrators table:', adminError);
      
      // Cleanup: delete the user account if admin table insert fails
      await supabaseClient.auth.admin.deleteUser(newUser.user!.id);
      
      throw adminError;
    }

    console.log('Admin record created, sending email to:', email);

    // Send invitation email
    const emailResponse = await resend.emails.send({
      from: "Administration <noreply@certification-balzac.fr>",
      to: [email],
      subject: "Accès administrateur - Plateforme de certification",
      html: `
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
      `,
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