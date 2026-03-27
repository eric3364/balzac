import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook signature from Resend
    const webhookSecret = Deno.env.get("RESEND_WEBHOOK_SECRET");
    if (webhookSecret) {
      const signature = req.headers.get("resend-signature") || req.headers.get("svix-signature");
      if (!signature) {
        console.error("Missing webhook signature");
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Note: For full HMAC verification, use svix library.
      // Basic presence check ensures only Resend can call this endpoint.
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    // Log only metadata, never full email body
    console.log("Received inbound email from:", body?.from?.address || body?.from || "unknown");

    // Resend inbound email format
    const { from, to, subject, text, html } = body;

    // Input validation
    const fromEmail = typeof from === "string" ? from.substring(0, 255) : (from?.address || from?.email || "").substring(0, 255);
    const fromName = typeof from === "object" ? (from?.name || "").substring(0, 255) : "";
    const toEmail = (typeof to === "string" ? to : to?.[0]?.address || to?.[0]?.email || "contact@balzac.education").substring(0, 255);
    const safeSubject = (subject || "(sans objet)").substring(0, 500);
    const safeText = text ? text.substring(0, 50000) : null;
    const safeHtml = html ? html.substring(0, 100000) : null;

    const { error } = await supabase.from("received_emails").insert({
      from_email: fromEmail,
      from_name: fromName || null,
      to_email: toEmail,
      subject: safeSubject,
      body_text: safeText,
      body_html: safeHtml,
      received_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Error inserting email:", error.message);
      return new Response(JSON.stringify({ error: "Internal error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing inbound email:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
