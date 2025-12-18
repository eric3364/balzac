import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { level } = requestBody;

    // Input validation
    if (level === undefined || level === null) {
      return new Response(
        JSON.stringify({ error: "Niveau requis" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const levelNumber = parseInt(String(level), 10);
    if (isNaN(levelNumber) || levelNumber < 1 || levelNumber > 10) {
      return new Response(
        JSON.stringify({ error: "Niveau invalide (doit être entre 1 et 10)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Authentification utilisateur
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user?.email) {
      throw new Error("Utilisateur non authentifié");
    }

    // Rate limiting: Check pending purchases in the last hour
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count: pendingCount } = await supabaseService
      .from("user_level_purchases")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending")
      .gte("created_at", oneHourAgo);

    if (pendingCount !== null && pendingCount >= 5) {
      console.log(`Rate limit exceeded for user ${user.id}: ${pendingCount} pending purchases`);
      return new Response(
        JSON.stringify({ error: "Trop de tentatives de paiement. Veuillez réessayer plus tard." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 429 }
      );
    }

    // Vérifier le prix du niveau depuis les templates de certificats
    const { data: pricingData } = await supabaseService
      .from('certificate_templates')
      .select(`
        price_euros,
        difficulty_levels!inner(level_number)
      `)
      .eq('difficulty_levels.level_number', level)
      .eq('is_active', true)
      .single();

    if (!pricingData) {
      throw new Error("Niveau introuvable");
    }

    const price = pricingData.price_euros;
    if (price === 0) {
      throw new Error("Ce niveau est gratuit");
    }

    // Initialiser Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Vérifier si le client existe
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    // Créer la session de paiement
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { 
              name: `Niveau ${level} - Certification Balzac`,
              description: `Accès complet au niveau ${level} de formation`
            },
            unit_amount: Math.round(price * 100), // En centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${req.headers.get("origin")}/dashboard?payment=success&level=${level}`,
      cancel_url: `${req.headers.get("origin")}/dashboard?payment=cancel`,
      metadata: {
        user_id: user.id,
        level: level.toString(),
        price_euros: price.toString()
      }
    });

    // Enregistrer l'intention d'achat
    await supabaseService.from("user_level_purchases").insert({
      user_id: user.id,
      level: level,
      price_paid: price,
      stripe_payment_intent_id: session.id,
      status: "pending"
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: unknown) {
    console.error('Erreur lors de la création du paiement:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});