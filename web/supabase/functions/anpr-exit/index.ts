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
      .select('id, user_id')
      .eq('plate_number', plate)
      .limit(1)
      .maybeSingle();

    if (!vehicle) {
      return new Response(JSON.stringify({ success: false, error: 'Vehicle not registered' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Find active booking (status = 'arrived') — covers both pre-booked AND walk-in
    const { data: booking } = await admin
      .from('bookings')
      .select('id, slot_id, is_walkin')
      .eq('vehicle_id', vehicle.id)
      .eq('status', 'arrived')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (booking) {
      // Normal path: complete the booking, trigger frees the slot
      await admin
        .from('bookings')
        .update({ status: 'completed' })
        .eq('id', booking.id);

      // Safety net: explicitly free the slot
      await admin
        .from('parking_slots')
        .update({ status: 'free' })
        .eq('id', booking.slot_id);

      const { data: slot } = await admin
        .from('parking_slots')
        .select('slot_code')
        .eq('id', booking.slot_id)
        .single();

      return new Response(JSON.stringify({
        success: true,
        message: 'Vehicle exit recorded, slot freed',
        vehicle_number: plate,
        slot_number: slot?.slot_code,
        is_walkin: booking.is_walkin,
        exit_time: new Date().toISOString(),
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Fallback: no booking found — check if any slot is marked 'arrived' for this vehicle
    //    This handles edge cases where the booking insert failed but the slot was manually assigned
    const { data: occupiedSlots } = await admin
      .from('bookings')
      .select('id, slot_id, is_walkin, status')
      .eq('vehicle_id', vehicle.id)
      .in('status', ['confirmed', 'arrived'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (occupiedSlots) {
      await admin.from('bookings').update({ status: 'completed' }).eq('id', occupiedSlots.id);
      await admin.from('parking_slots').update({ status: 'free' }).eq('id', occupiedSlots.slot_id);

      const { data: slot } = await admin.from('parking_slots').select('slot_code').eq('id', occupiedSlots.slot_id).single();

      return new Response(JSON.stringify({
        success: true,
        message: 'Vehicle exit recorded (fallback), slot freed',
        vehicle_number: plate,
        slot_number: slot?.slot_code,
        is_walkin: occupiedSlots.is_walkin,
        exit_time: new Date().toISOString(),
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. EPSS fallback: Check for any EPSS booking (vehicle_id IS NULL) for this user
    //    that has an 'arrived' slot — match by user_id since EPSS has no vehicle link
    const { data: epssBooking } = await admin
      .from('bookings')
      .select('id, slot_id, is_walkin')
      .eq('user_id', vehicle.user_id)
      .is('vehicle_id', null)
      .eq('status', 'arrived')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (epssBooking) {
      await admin.from('bookings').update({ status: 'completed' }).eq('id', epssBooking.id);
      await admin.from('parking_slots').update({ status: 'free' }).eq('id', epssBooking.slot_id);

      const { data: slot } = await admin.from('parking_slots').select('slot_code').eq('id', epssBooking.slot_id).single();

      return new Response(JSON.stringify({
        success: true,
        message: 'EPSS vehicle exit recorded, slot freed',
        vehicle_number: plate,
        slot_number: slot?.slot_code,
        is_walkin: true,
        exit_time: new Date().toISOString(),
      }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 5. Last resort: open gate for safety
    return new Response(JSON.stringify({
      success: false,
      gate_action: 'open',
      error: 'No active parking session found, but gate should open for safety',
      vehicle_number: plate,
      exit_time: new Date().toISOString(),
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
