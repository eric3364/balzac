import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnswerValidationRequest {
  question_id: number;
  user_answer: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Authenticate user
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { question_id, user_answer }: AnswerValidationRequest = await req.json()

    // Get the question with its correct answer (server-side only)
    const { data: question, error: questionError } = await supabaseClient
      .from('questions')
      .select('answer, explanation, rule')
      .eq('id', question_id)
      .single()

    if (questionError || !question) {
      return new Response(
        JSON.stringify({ error: 'Question non trouvée' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate answer (case-insensitive, trimmed)
    const isCorrect = user_answer.toLowerCase().trim() === question.answer.toLowerCase().trim()

    // Return validation result
    // NEVER send the correct answer to the client, only whether it's correct or not
    return new Response(
      JSON.stringify({
        is_correct: isCorrect,
        explanation: !isCorrect ? question.explanation : null,
        rule: !isCorrect ? question.rule : null
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in validate-answer:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
