import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Non autorisé" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin status
    const { data: adminData } = await supabase
      .from("administrators")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!adminData) {
      return new Response(JSON.stringify({ error: "Accès réservé aux administrateurs" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { emailId, replyText, toEmail, subject } = await req.json();

    if (!emailId || !replyText || !toEmail) {
      return new Response(JSON.stringify({ error: "Paramètres manquants" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send reply via Resend
    const emailResponse = await resend.emails.send({
      from: "Contact Balzac <contact@balzac.education>",
      to: [toEmail],
      subject: subject ? `Re: ${subject}` : "Réponse",
      html: `<div style="font-family: sans-serif; white-space: pre-wrap;">${replyText.replace(/\n/g, "<br>")}</div>`,
    });

    console.log("Reply sent:", emailResponse);

    // Store the reply
    const { error: insertError } = await supabase.from("email_replies").insert({
      received_email_id: emailId,
      replied_by: user.id,
      reply_text: replyText,
      reply_html: `<div style="font-family: sans-serif;">${replyText.replace(/\n/g, "<br>")}</div>`,
    });

    if (insertError) {
      console.error("Error storing reply:", insertError);
    }

    // Update email status
    await supabase
      .from("received_emails")
      .update({ status: "traité", is_read: true })
      .eq("id", emailId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending reply:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
