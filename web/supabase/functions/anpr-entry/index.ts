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
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { vehicle_number } = await req.json();
    if (!vehicle_number) {
      return new Response(JSON.stringify({ success: false, error: 'vehicle_number is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const plate = vehicle_number.toUpperCase();

    // 1. Find vehicle
    const { data: vehicle } = await admin
      .from('vehicles')
      .select('id, user_id, type')
      .eq('plate_number', plate)
      .limit(1)
      .maybeSingle();

    if (!vehicle) {
      return new Response(JSON.stringify({ success: false, error: 'Vehicle not registered' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Find a confirmed booking for this vehicle (pre-booked, not yet arrived)
    const { data: booking } = await admin
      .from('bookings')
      .select('id, slot_id, fee_lkr')
      .eq('vehicle_id', vehicle.id)
      .eq('status', 'confirmed')
      .order('booking_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!booking) {
      return new Response(JSON.stringify({ success: false, error: 'No confirmed booking found for this vehicle' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fixed daily fee based on vehicle type
    const fee = vehicle.type === 'car' ? 100 : 50;

    // 4. Check wallet balance >= 300
    const { data: wallet } = await admin
      .from('wallets')
      .select('balance_lkr')
      .eq('user_id', vehicle.user_id)
      .single();

    if (!wallet || wallet.balance_lkr < 300) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Insufficient wallet balance (minimum LKR 300 required)',
        balance: wallet?.balance_lkr ?? 0,
      }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Deduct fixed fee from wallet on entry
    const newBalance = wallet.balance_lkr - fee;
    await admin
      .from('wallets')
      .update({ balance_lkr: newBalance })
      .eq('user_id', vehicle.user_id);

    // 6. Record transaction
    await admin
      .from('transactions')
      .insert({
        user_id: vehicle.user_id,
        amount_lkr: -fee,
        type: 'parking_fee',
        booking_id: booking.id,
        description: `ANPR entry - fixed daily fee (${vehicle.type})`,
      });

    // 7. Mark booking as arrived and record fee deduction time
    const now = new Date().toISOString();
    await admin
      .from('bookings')
      .update({ status: 'arrived', fee_lkr: fee, fee_deducted_at: now })
      .eq('id', booking.id);

    // 8. Slot status is synced by the database trigger (sync_slot_on_booking_status_change)

    // Get slot code for response
    const { data: slot } = await admin
      .from('parking_slots')
      .select('slot_code')
      .eq('id', booking.slot_id)
      .single();

    return new Response(JSON.stringify({
      success: true,
      message: 'Vehicle entry recorded, fee deducted',
      vehicle_number: plate,
      vehicle_type: vehicle.type,
      slot_number: slot?.slot_code,
      fee_deducted: fee,
      previous_balance: wallet.balance_lkr,
      new_balance: newBalance,
      entry_time: now,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
