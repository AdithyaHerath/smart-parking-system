import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NO_SHOW_PENALTY = 50;
const NO_SHOW_HOURS = 2;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Find confirmed bookings where booking_time is more than 2 hours ago
    const cutoff = new Date(Date.now() - NO_SHOW_HOURS * 60 * 60 * 1000).toISOString();

    const { data: expiredBookings, error } = await admin
      .from('bookings')
      .select('id, user_id, slot_id, fee_lkr')
      .eq('status', 'confirmed')
      .lt('booking_time', cutoff);

    if (error) {
      throw error;
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No expired bookings found', count: 0 }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let processed = 0;

    for (const booking of expiredBookings) {
      // 1. Mark booking as expired
      await admin
        .from('bookings')
        .update({ status: 'expired' })
        .eq('id', booking.id);

      // 2. THE FIX: Explicitly free the parking slot
      // IMPORTANT: If your table is named just 'slots' instead of 'parking_slots', change the name below!
      await admin
        .from('parking_slots') 
        .update({ status: 'available' }) 
        .eq('id', booking.slot_id);

      // 3. Deduct no-show penalty from wallet (allow negative balance)
      const { data: wallet } = await admin
        .from('wallets')
        .select('balance_lkr')
        .eq('user_id', booking.user_id)
        .single();

      const currentBalance = wallet?.balance_lkr ?? 0;
      await admin
        .from('wallets')
        .update({ balance_lkr: currentBalance - NO_SHOW_PENALTY })
        .eq('user_id', booking.user_id);

      // 4. Record penalty transaction
      await admin
        .from('transactions')
        .insert({
          user_id: booking.user_id,
          amount_lkr: -NO_SHOW_PENALTY,
          type: 'penalty',
          booking_id: booking.id,
          description: `No-show penalty - booking expired after ${NO_SHOW_HOURS}h`,
        });

      processed++;
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${processed} no-show bookings`,
      count: processed,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});