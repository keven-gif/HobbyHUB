// Supabase Edge Function: delete-account
//
// Permanently deletes the calling user's account. This has to live in an
// Edge Function (not client code) because it needs the service-role key to
// call `auth.admin.deleteUser`, which the browser must never hold.
//
// Deploy with:
//   supabase functions deploy delete-account
//
// Requires these secrets to already be set on the project (the anon key is
// safe to expose; SUPABASE_URL/SERVICE_ROLE_KEY are auto-injected by
// Supabase for every Edge Function, so nothing extra needs configuring):
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Scoped to the caller's own JWT -- only used to establish who is
    // asking. Never used to touch data belonging to anyone else.
    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const {
      data: { user },
      error: userError,
    } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Service-role client -- the only thing allowed to delete the auth
    // user and to bypass RLS for the tables below.
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const userId = user.id;

    // wiki_articles/questions/projects/mentors key off a plain TEXT
    // author_id/user_id column (added in later migrations) rather than a
    // `references auth.users on delete cascade` foreign key, so they need
    // to be cleared out explicitly before the account goes away.
    await Promise.all([
      adminClient.from('wiki_articles').delete().eq('author_id', userId),
      adminClient.from('questions').delete().eq('author_id', userId),
      adminClient.from('projects').delete().eq('author_id', userId),
      adminClient.from('mentors').delete().eq('user_id', userId),
    ]);

    // Deleting the auth user cascades profiles, posts, friend_requests,
    // subcommittee_joins, messages, notifications, and user_activity via
    // their "on delete cascade" foreign keys.
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
