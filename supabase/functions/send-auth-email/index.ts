import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") as string;

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

  const payload = await req.text();
  console.log("Received auth email hook request");

  try {
    // Parse the payload
    const data = JSON.parse(payload);
    const user = data.user;
    const email_data = data.email_data;
    
    const { token, token_hash, redirect_to, email_action_type } = email_data;

    console.log(`Processing ${email_action_type} email for ${user.email}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const verificationLink = `${supabaseUrl}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${redirect_to}`;

    let subject = "";
    let htmlContent = "";

    switch (email_action_type) {
      case "signup":
        subject = "Confirmez votre inscription";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Bienvenue !</h1>
            <p style="color: #666; font-size: 16px;">Merci de vous être inscrit. Pour activer votre compte, veuillez cliquer sur le bouton ci-dessous :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirmer mon inscription</a>
            </div>
            <p style="color: #999; font-size: 14px;">Ou copiez ce code de vérification : <strong>${token}</strong></p>
            <p style="color: #999; font-size: 12px;">Si vous n'avez pas créé de compte, vous pouvez ignorer cet email.</p>
          </div>
        `;
        break;

      case "recovery":
      case "magiclink":
        subject = "Réinitialisez votre mot de passe";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Réinitialisation du mot de passe</h1>
            <p style="color: #666; font-size: 16px;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour continuer :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Réinitialiser mon mot de passe</a>
            </div>
            <p style="color: #999; font-size: 14px;">Ou copiez ce code : <strong>${token}</strong></p>
            <p style="color: #999; font-size: 12px;">Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
          </div>
        `;
        break;

      case "email_change":
        subject = "Confirmez votre nouvelle adresse email";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Changement d'email</h1>
            <p style="color: #666; font-size: 16px;">Cliquez sur le bouton ci-dessous pour confirmer votre nouvelle adresse email :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Confirmer le changement</a>
            </div>
            <p style="color: #999; font-size: 12px;">Si vous n'avez pas demandé ce changement, ignorez cet email.</p>
          </div>
        `;
        break;

      default:
        subject = "Vérification de votre compte";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #333; text-align: center;">Vérification</h1>
            <p style="color: #666; font-size: 16px;">Cliquez sur le bouton ci-dessous pour vérifier votre compte :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #4F46E5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">Vérifier</a>
            </div>
          </div>
        `;
    }

    // Send email using Resend API directly via fetch
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Balzac Certification <noreply@balzac.education>",
        to: [user.email],
        subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error("Error sending email:", errorData);
      throw new Error(JSON.stringify(errorData));
    }

    const result = await resendResponse.json();
    console.log(`Email sent successfully to ${user.email}`, result);

    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
    // IMPORTANT: Supabase Auth Hooks require status 200 even on errors
    return new Response(
      JSON.stringify({}),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
