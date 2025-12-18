import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface QuestionRequest {
  level: number;
  session_number: number;
  session_type: 'regular' | 'remedial';
  questions_percentage?: number;
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

    const { level, session_number, session_type, questions_percentage = 20 }: QuestionRequest = await req.json()

    // Map level number to level name
    const levelNames = ['', 'élémentaire', 'intermédiaire', 'avancé']
    const levelName = levelNames[level] || 'élémentaire'

    let questions

    if (session_type === 'remedial') {
      // For remedial sessions, get all failed questions for this user and level
      const { data: failedQuestionsData, error: failedError } = await supabaseClient
        .from('failed_questions')
        .select('question_id')
        .eq('user_id', user.id)
        .eq('level', level)
        .eq('is_remediated', false)

      if (failedError) throw failedError

      if (!failedQuestionsData || failedQuestionsData.length === 0) {
        return new Response(
          JSON.stringify([]),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const questionIds = failedQuestionsData.map(fq => fq.question_id)
      
      // Get question details WITHOUT answers
      const { data: questionsData, error: questionsError } = await supabaseClient
        .from('questions')
        .select('id, content, type, level, rule, choices, explanation')
        .in('id', questionIds)
        .eq('level', levelName)
        .order('id')

      if (questionsError) throw questionsError
      questions = questionsData

    } else {
      // For regular sessions, calculate offset based on session number
      const { data: totalQuestionsData, error: countError } = await supabaseClient
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .eq('level', levelName)

      if (countError) throw countError

      const totalQuestions = totalQuestionsData || 0
      const questionsPerSession = Math.floor((totalQuestions as any) * questions_percentage / 100)
      const sessionIndex = session_number - 1
      const offset = sessionIndex * questionsPerSession

      // Get questions for this session WITHOUT answers
      const { data: questionsData, error: questionsError } = await supabaseClient
        .from('questions')
        .select('id, content, type, level, rule, choices, explanation')
        .eq('level', levelName)
        .range(offset, offset + questionsPerSession - 1)
        .order('id')

      if (questionsError) throw questionsError
      questions = questionsData
    }

    // CRITICAL: Never send the 'answer' field to the client
    // Questions are returned without correct answers - directly as array
    const safeQuestions = Array.isArray(questions) ? questions : [];
    return new Response(
      JSON.stringify(safeQuestions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Error in get-session-questions:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
