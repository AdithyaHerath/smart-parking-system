import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callingUser } } = await anonClient.auth.getUser();
    if (!callingUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: roleData } = await anonClient.from('user_roles').select('role').eq('user_id', callingUser.id).single();
    if (roleData?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { user_id } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'Missing user_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (user_id === callingUser.id) {
      return new Response(JSON.stringify({ error: 'Cannot delete your own account' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // 1. Get user's complaints to delete complaint_actions first
    const { data: userComplaints } = await adminClient.from('complaints').select('id').eq('reporter_id', user_id);
    const complaintIds = (userComplaints || []).map((c: any) => c.id);

    if (complaintIds.length > 0) {
      // Delete complaint_actions for user's complaints
      await adminClient.from('complaint_actions').delete().in('complaint_id', complaintIds);
      // Delete penalties linked to user's complaints
      await adminClient.from('penalties').delete().in('complaint_id', complaintIds);
      // Delete complaints
      await adminClient.from('complaints').delete().eq('reporter_id', user_id);
    }

    // 2. Delete penalties where user is the violator
    await adminClient.from('penalties').delete().eq('user_id', user_id);

    // 3. Cancel and delete bookings
    await adminClient.from('bookings').update({ status: 'cancelled' }).eq('user_id', user_id).in('status', ['confirmed', 'arrived']);
    await adminClient.from('bookings').delete().eq('user_id', user_id);

    // 4. Delete remaining related data
    await adminClient.from('transactions').delete().eq('user_id', user_id);
    await adminClient.from('vehicles').delete().eq('user_id', user_id);
    await adminClient.from('wallets').delete().eq('user_id', user_id);
    await adminClient.from('user_roles').delete().eq('user_id', user_id);
    await adminClient.from('profiles').delete().eq('id', user_id);

    // 5. Delete auth user
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (deleteError) {
      return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
