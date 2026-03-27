import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the user via their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { level } = await req.json();

    // Validate level
    if (!level || typeof level !== "number" || level < 1 || level > 10) {
      return new Response(JSON.stringify({ error: "Invalid level" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check user hasn't already been certified at this level
    const { data: existingCert } = await adminClient
      .from("user_certifications")
      .select("id")
      .eq("user_id", user.id)
      .eq("level", level)
      .maybeSingle();

    if (existingCert) {
      return new Response(
        JSON.stringify({ error: "Already certified at this level", certification: existingCert }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user's max certified level is level-1 (must certify in order)
    if (level > 1) {
      const { data: maxLevelData } = await adminClient.rpc("get_user_max_level", {
        user_uuid: user.id,
      });
      if ((maxLevelData || 0) < level - 1) {
        return new Response(
          JSON.stringify({ error: "Previous level not certified" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Server-side score verification: count correct attempts vs total questions
    const levelNames: Record<number, string> = {
      1: "élémentaire",
      2: "intermédiaire",
      3: "avancé",
    };
    const levelName = levelNames[level] || "élémentaire";

    const { data: correctAttempts } = await adminClient
      .from("question_attempts")
      .select("question_id")
      .eq("user_id", user.id)
      .eq("level", level)
      .eq("is_correct", true);

    const { count: totalQuestions } = await adminClient
      .from("questions")
      .select("id", { count: "exact", head: true })
      .eq("level", levelName);

    const correctCount = correctAttempts?.length || 0;
    const totalCount = totalQuestions || 0;

    if (totalCount === 0) {
      return new Response(
        JSON.stringify({ error: "No questions found for this level" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const score = Math.round((correctCount / totalCount) * 100);

    if (score < 75) {
      return new Response(
        JSON.stringify({ error: "Score too low", score, required: 75 }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the certification using service role (bypasses RLS)
    const { data: certification, error: certError } = await adminClient
      .from("user_certifications")
      .insert({
        user_id: user.id,
        level,
        score,
      })
      .select()
      .single();

    if (certError) {
      console.error("Certification insert error:", certError);
      return new Response(
        JSON.stringify({ error: "Failed to create certification" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ certification }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-certification error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
