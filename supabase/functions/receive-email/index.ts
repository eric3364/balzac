import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("Received inbound email webhook:", JSON.stringify(body).substring(0, 500));

    // Resend inbound email format
    const { from, to, subject, text, html } = body;

    const fromEmail = typeof from === "string" ? from : from?.address || from?.email || "";
    const fromName = typeof from === "object" ? from?.name || "" : "";

    const { error } = await supabase.from("received_emails").insert({
      from_email: fromEmail,
      from_name: fromName || null,
      to_email: typeof to === "string" ? to : to?.[0]?.address || to?.[0]?.email || "contact@balzac.education",
      subject: subject || "(sans objet)",
      body_text: text || null,
      body_html: html || null,
      received_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error inserting email:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing inbound email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
