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
    const { email, purpose } = await req.json();
    const isReset = purpose === 'reset';

    if (!email || !email.endsWith('@students.nsbm.ac.lk')) {
      return new Response(JSON.stringify({ error: 'Invalid university email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Invalidate previous OTPs for this email
    await supabase.from('otp_codes').update({ used: true }).eq('email', email).eq('used', false);

    // Store OTP
    const { error: insertError } = await supabase.from('otp_codes').insert({
      email,
      code,
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) throw insertError;

    // Send via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY not configured');

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'N-Park System Support <auth@npark-system.online>',
        to: [email],
        subject: isReset ? 'Your Password Reset Code' : 'Your University Parking Verification Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #ffffff;">
            <div style="text-align: center; padding: 16px 0; border-bottom: 2px solid #1a1a2e; margin-bottom: 24px;">
              <h1 style="color: #1a1a2e; font-size: 22px; margin: 0;">N-Park System | NSBM Green University</h1>
            </div>
            <p style="color: #333; font-size: 15px; line-height: 1.6;">
              ${isReset ? 'Your password reset verification code is:' : 'Hello! Your verification code for the University Parking Portal is:'}
            </p>
            <div style="background: #f0f4ff; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0;">
              <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1a1a2e;">${code}</span>
            </div>
            <p style="color: #333; font-size: 15px; line-height: 1.6;">
              This code expires in 10 minutes.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #888; font-size: 13px; text-align: center;">
              If you did not request this, please ignore this email.
            </p>
          </div>
        `,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      throw new Error(`Resend API error [${resendRes.status}]: ${errBody}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('send-registration-otp error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
