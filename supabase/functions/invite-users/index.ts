import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserInvite {
  email: string
  first_name?: string
  last_name?: string
  school?: string
  class_name?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Créer le client Supabase avec la clé service
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier l'authentification et les permissions admin
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Vérifier si l'utilisateur est super admin
    const { data: isAdmin } = await supabaseAdmin
      .from('administrators')
      .select('is_super_admin')
      .eq('user_id', user.id)
      .eq('is_super_admin', true)
      .single()
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Accès refusé' }),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { users }: { users: UserInvite[] } = await req.json()
    
    if (!users || !Array.isArray(users)) {
      return new Response(
        JSON.stringify({ error: 'Format de données invalide' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const results = []
    
    for (const userData of users) {
      try {
        // Créer l'utilisateur avec invitation
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
          userData.email,
          {
            data: {
              first_name: userData.first_name || '',
              last_name: userData.last_name || '',
              school: userData.school || '',
              class_name: userData.class_name || ''
            },
            redirectTo: `${req.headers.get('origin') || 'http://localhost:5173'}/auth`
          }
        )

        if (authError) {
          console.error('Erreur auth pour', userData.email, ':', authError)
          let errorMessage = authError.message
          
          // Gestion spéciale pour la limite de taux d'emails
          if (authError.message.includes('email rate limit exceeded')) {
            errorMessage = 'Limite d\'envoi d\'emails atteinte. Veuillez attendre quelques minutes avant de réessayer.'
          }
          
          results.push({
            email: userData.email,
            success: false,
            error: errorMessage
          })
          continue
        }

        // Le trigger handle_new_user() crée automatiquement l'entrée dans la table users
        // Pas besoin de créer manuellement l'entrée

        results.push({
          email: userData.email,
          success: true,
          user_id: authUser.user?.id
        })

      } catch (error) {
        console.error('Erreur pour', userData.email, ':', error)
        results.push({
          email: userData.email,
          success: false,
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({ 
        results,
        summary: {
          total: users.length,
          success: successCount,
          errors: errorCount
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erreur générale:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})