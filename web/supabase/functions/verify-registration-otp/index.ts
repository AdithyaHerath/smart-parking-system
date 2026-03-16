import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, code, name, phone, studentId, password, plateNumber, vehicleType } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify OTP
    const { data: otpRecord, error: otpError } = await supabase
      .from('otp_codes')
      .select('*')
      .eq('email', email)
      .eq('code', code)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (otpError || !otpRecord) {
      return new Response(JSON.stringify({ error: 'Invalid or expired OTP code. Please try again or request a new code.' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Mark OTP as used
    await supabase.from('otp_codes').update({ used: true }).eq('id', otpRecord.id);

    // Check if user already exists (e.g. from a previous incomplete registration)
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let userId: string;

    if (existingUser) {
      // Update existing user: confirm email, update password and metadata
      const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
        password,
        email_confirm: true,
        user_metadata: { name, phone, student_id: studentId },
      });

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userId = existingUser.id;

      // Update profile if it exists
      await supabase.from('profiles').upsert({
        id: userId,
        name,
        phone,
        student_id: studentId,
        email,
      }, { onConflict: 'id' });
    } else {
      // Create new user via admin API with email already confirmed
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, phone, student_id: studentId },
      });

      if (authError) {
        return new Response(JSON.stringify({ error: authError.message }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      userId = authData.user.id;
    }

    // Ensure wallet exists
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingWallet) {
      await supabase.from('wallets').insert({ user_id: userId, balance_lkr: 0 });
    }

    // Ensure user_role exists
    const { data: existingRole } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (!existingRole) {
      await supabase.from('user_roles').insert({ user_id: userId, role: 'student' });
    }

    // Add vehicle (check if already exists)
    if (userId && plateNumber && vehicleType) {
      const { data: existingVehicle } = await supabase
        .from('vehicles')
        .select('id')
        .eq('user_id', userId)
        .eq('plate_number', plateNumber.toUpperCase())
        .maybeSingle();

      if (!existingVehicle) {
        const { error: vehicleError } = await supabase.from('vehicles').insert({
          user_id: userId,
          plate_number: plateNumber.toUpperCase(),
          type: vehicleType,
        });
        if (vehicleError) {
          console.error('Vehicle insert error:', vehicleError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('verify-registration-otp error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
