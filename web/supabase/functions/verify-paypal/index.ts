import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WALLET_MAX = 2000;

Deno.serve(async (req) => {
  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("--- NEW TOP-UP REQUEST START ---");

    // 2. Check Auth Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Auth Error: Missing Authorization header completely.");
      return new Response(JSON.stringify({ error: 'Missing Auth Header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Setup Supabase Auth securely
    console.log("Authenticating user...");
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 4. Verify User
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error("Auth Error details:", userError?.message || "User object is null");
      return new Response(JSON.stringify({ error: 'Invalid or expired user token' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = user.id;
    console.log(`User authenticated successfully! ID: ${userId}`);

    // 5. Parse the Request
    const { orderId, amountLKR } = await req.json();
    console.log(`Processing Order: ${orderId} for LKR ${amountLKR}`);

    if (!orderId || !amountLKR || typeof amountLKR !== 'number' || amountLKR <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 6. Check PayPal Keys
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_SECRET'); // Lovable used PAYPAL_CLIENT_SECRET, I changed it to match what we set earlier!
    
    if (!clientId || !clientSecret) {
      console.error("System Error: Missing PayPal Secrets in Supabase Environment");
      return new Response(JSON.stringify({ error: 'System configuration error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. Get PayPal Access Token
    console.log("Fetching PayPal token...");
    const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      console.error('PayPal Token Error:', await tokenRes.text());
      return new Response(JSON.stringify({ error: 'Failed to authenticate with PayPal' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { access_token } = await tokenRes.json();

    // 8. Verify the Order
    console.log("Verifying Order ID with PayPal...");
    const orderRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (!orderRes.ok) {
      console.error('PayPal Order Verify Error:', await orderRes.text());
      return new Response(JSON.stringify({ error: 'Could not verify payment with PayPal' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = await orderRes.json();

    if (order.status !== 'COMPLETED') {
      console.error(`Order status is ${order.status}, not COMPLETED`);
      return new Response(JSON.stringify({ error: `Payment not completed. Status: ${order.status}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log("PayPal Verification Successful! Updating NPark database...");

    // 9. Use service role for DB updates to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 10. Update Wallet Balance
    const { data: wallet, error: walletErr } = await supabaseAdmin
      .from('wallets')
      .select('balance_lkr')
      .eq('user_id', userId)
      .single();

    if (walletErr) {
      console.error('Database Error (Wallet Select):', walletErr);
      return new Response(JSON.stringify({ error: 'Could not fetch current wallet balance' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const currentBalance = wallet?.balance_lkr || 0;
    const newBalance = currentBalance + amountLKR;

    if (newBalance > WALLET_MAX) {
      return new Response(JSON.stringify({ error: `Exceeds max balance of LKR ${WALLET_MAX}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: updateErr } = await supabaseAdmin
      .from('wallets')
      .update({ balance_lkr: newBalance })
      .eq('user_id', userId);

    if (updateErr) {
      console.error('Database Error (Wallet Update):', updateErr);
      return new Response(JSON.stringify({ error: 'Failed to update wallet' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 11. Record Transaction
    await supabaseAdmin.from('transactions').insert({
      user_id: userId,
      amount_lkr: amountLKR,
      type: 'topup',
      description: `PayPal top-up (Txn: ${orderId})`,
    });

    console.log(`--- SUCCESS: LKR ${amountLKR} added to user ${userId} ---`);
    return new Response(JSON.stringify({ success: true, newBalance }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('CRITICAL ERROR in verify-paypal:', error.message || error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});