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
  city?: string
}

// Génère un mot de passe basé sur prénom.nom (3 premières lettres de chaque)
function generatePassword(firstName: string, lastName: string): string {
  const cleanFirstName = (firstName || 'abc').trim().toLowerCase().replace(/[^a-zA-Z]/g, '');
  const cleanLastName = (lastName || 'xyz').trim().toLowerCase().replace(/[^a-zA-Z]/g, '');
  
  const firstPart = cleanFirstName.substring(0, 3).padEnd(3, 'a');
  const lastPart = cleanLastName.substring(0, 3).padEnd(3, 'a');
  
  return `${firstPart}.${lastPart}`;
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
        // Vérifier d'abord si l'utilisateur existe déjà dans la table users
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('email')
          .eq('email', userData.email)
          .single();

        if (existingUser) {
          results.push({
            email: userData.email,
            success: false,
            error: 'Un utilisateur avec cet email existe déjà dans le système'
          });
          continue;
        }

        // Générer le mot de passe basé sur prénom.nom
        const generatedPassword = generatePassword(userData.first_name || '', userData.last_name || '');
        console.log(`Génération mot de passe pour ${userData.email}: ${generatedPassword}`);

        // Créer l'utilisateur avec mot de passe généré (sans invitation par email)
        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: generatedPassword,
          email_confirm: true, // Confirmer l'email automatiquement
          user_metadata: {
            first_name: userData.first_name || '',
            last_name: userData.last_name || '',
            school: userData.school || '',
            class_name: userData.class_name || '',
            city: userData.city || '',
            force_password_change: true, // Flag pour forcer le changement de mot de passe
            generated_password: true
          }
        })

        if (authError) {
          console.error('Erreur auth pour', userData.email, ':', authError)
          let errorMessage = authError.message
          
          // Gestion spéciale si l'utilisateur Auth existe déjà mais pas dans notre table users
          if (authError.message.includes('A user with this email address has already been registered')) {
            // Récupérer l'utilisateur existant depuis Auth
            const { data: { users: existingAuthUsers }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
            
            if (!getUserError) {
              const existingAuthUser = existingAuthUsers?.find(u => u.email === userData.email);
              
              if (existingAuthUser) {
                // Créer l'entrée dans la table users pour cet utilisateur Auth existant
                const { error: insertError } = await supabaseAdmin
                  .from('users')
                  .insert({
                    user_id: existingAuthUser.id,
                    email: userData.email,
                    first_name: userData.first_name || '',
                    last_name: userData.last_name || '',
                    school: userData.school || '',
                    class_name: userData.class_name || '',
                    city: userData.city || ''
                  });

                if (!insertError) {
                  results.push({
                    email: userData.email,
                    success: true,
                    user_id: existingAuthUser.id,
                    message: 'Utilisateur Auth existant ajouté au système'
                  });
                  continue;
                } else {
                  console.error('Erreur insertion users pour', userData.email, ':', insertError);
                  errorMessage = 'Erreur lors de l\'ajout de l\'utilisateur existant au système';
                }
              }
            }
            
            // Si ça n'a pas marché, utiliser le message d'erreur par défaut
            if (errorMessage === authError.message) {
              errorMessage = 'Un utilisateur avec cet email existe déjà. Contactez l\'administrateur.';
            }
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
          user_id: authUser.user?.id,
          generated_password: generatedPassword,
          message: 'Utilisateur créé avec mot de passe temporaire'
        })

      } catch (error: unknown) {
        console.error('Erreur pour', userData.email, ':', error)
        const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
        results.push({
          email: userData.email,
          success: false,
          error: errorMessage
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

  } catch (error: unknown) {
    console.error('Erreur générale:', error)
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
