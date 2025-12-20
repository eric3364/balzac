import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request body
    const { user_id } = await req.json();
    
    if (!user_id) {
      console.log('Missing user_id in request body');
      return new Response(
        JSON.stringify({ error: 'user_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Attempting to delete user:', user_id);

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Create client with user's token to verify admin status
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false }
      }
    );

    // Get the calling user
    const { data: { user: callingUser }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !callingUser) {
      console.log('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Calling user:', callingUser.id);

    // Check if calling user is admin
    const { data: adminData, error: adminError } = await supabaseAdmin
      .from('administrators')
      .select('id, is_super_admin')
      .eq('user_id', callingUser.id)
      .single();

    if (adminError || !adminData) {
      console.log('Admin check failed:', adminError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - not an administrator' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin verified, is_super_admin:', adminData.is_super_admin);

    // Delete user from public.users table
    const { error: deleteUsersError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('user_id', user_id);

    if (deleteUsersError) {
      console.log('Error deleting from users table:', deleteUsersError);
      // Continue anyway - user might not be in this table
    }

    // Delete user from auth.users using admin API
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteAuthError) {
      console.log('Error deleting auth user:', deleteAuthError);
      // Si l'utilisateur n'existe pas dans auth.users, c'est OK (déjà supprimé)
      if (deleteAuthError.message === 'User not found' || deleteAuthError.code === 'user_not_found') {
        console.log('User not found in auth.users - already deleted, continuing...');
      } else {
        return new Response(
          JSON.stringify({ error: 'Failed to delete auth user', details: deleteAuthError.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    console.log('User deleted successfully:', user_id);

    return new Response(
      JSON.stringify({ success: true, message: 'User deleted successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
