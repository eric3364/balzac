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

// Génère un mot de passe aléatoire sécurisé (12 caractères, mix majuscules/minuscules/chiffres/symboles)
function generateSecurePassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*';
  const all = upper + lower + digits + symbols;
  
  // Garantir au moins un de chaque type
  const password = [
    upper[Math.floor(Math.random() * upper.length)],
    lower[Math.floor(Math.random() * lower.length)],
    digits[Math.floor(Math.random() * digits.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];
  
  for (let i = password.length; i < 12; i++) {
    password.push(all[Math.floor(Math.random() * all.length)]);
  }
  
  // Shuffle
  for (let i = password.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [password[i], password[j]] = [password[j], password[i]];
  }
  
  return password.join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabaseAdmin.auth.getUser(token)
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { users }: { users: UserInvite[] } = await req.json()
    
    if (!users || !Array.isArray(users) || users.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Format de données invalide ou trop d\'utilisateurs (max 500)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const results = []
    
    for (const userData of users) {
      try {
        // Validation basique de l'email
        if (!userData.email || !userData.email.includes('@') || userData.email.length > 255) {
          results.push({ email: userData.email || '', success: false, error: 'Email invalide' });
          continue;
        }

        // Vérifier si l'utilisateur existe déjà
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

        // Générer un mot de passe sécurisé aléatoire
        const generatedPassword = generateSecurePassword();
        // Ne JAMAIS loguer le mot de passe

        const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: userData.email,
          password: generatedPassword,
          email_confirm: true,
          user_metadata: {
            first_name: (userData.first_name || '').substring(0, 100),
            last_name: (userData.last_name || '').substring(0, 100),
            school: (userData.school || '').substring(0, 200),
            class_name: (userData.class_name || '').substring(0, 100),
            city: (userData.city || '').substring(0, 100),
            force_password_change: true,
            generated_password: true
          }
        })

        if (authError) {
          console.error('Erreur auth pour', userData.email, ':', authError.message)
          let errorMessage = authError.message
          
          if (authError.message.includes('A user with this email address has already been registered')) {
            const { data: { users: existingAuthUsers }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers();
            
            if (!getUserError) {
              const existingAuthUser = existingAuthUsers?.find(u => u.email === userData.email);
              
              if (existingAuthUser) {
                const { error: insertError } = await supabaseAdmin
                  .from('users')
                  .insert({
                    user_id: existingAuthUser.id,
                    email: userData.email,
                    first_name: (userData.first_name || '').substring(0, 100),
                    last_name: (userData.last_name || '').substring(0, 100),
                    school: (userData.school || '').substring(0, 200),
                    class_name: (userData.class_name || '').substring(0, 100),
                    city: (userData.city || '').substring(0, 100)
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
                  errorMessage = 'Erreur lors de l\'ajout de l\'utilisateur existant';
                }
              }
            }
            
            if (errorMessage === authError.message) {
              errorMessage = 'Un utilisateur avec cet email existe déjà.';
            }
          }
          
          results.push({ email: userData.email, success: false, error: errorMessage })
          continue
        }

        results.push({
          email: userData.email,
          success: true,
          user_id: authUser.user?.id,
          generated_password: generatedPassword,
          message: 'Utilisateur créé avec mot de passe temporaire'
        })

      } catch (error: unknown) {
        console.error('Erreur pour', userData.email)
        results.push({
          email: userData.email,
          success: false,
          error: 'Erreur interne'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const errorCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({ 
        results,
        summary: { total: users.length, success: successCount, errors: errorCount }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Erreur générale invite-users')
    return new Response(
      JSON.stringify({ error: 'Erreur interne du serveur' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
