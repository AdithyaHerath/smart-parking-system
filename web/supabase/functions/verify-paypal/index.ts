import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const WALLET_MAX = 2000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the user token securely
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth Error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized user' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    // Parse request
    const { orderId, amountLKR } = await req.json();
    if (!orderId || !amountLKR || typeof amountLKR !== 'number' || amountLKR <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid request parameters' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify payment with PayPal API
    const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
    const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      console.error('PayPal credentials not configured');
      return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get PayPal access token
    const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${clientId}:${clientSecret}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!tokenRes.ok) {
      console.error('Failed to get PayPal token:', await tokenRes.text());
      return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { access_token } = await tokenRes.json();

    // Verify the order
    const orderRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${orderId}`, {
      headers: { 'Authorization': `Bearer ${access_token}` },
    });

    if (!orderRes.ok) {
      console.error('Failed to fetch PayPal order:', await orderRes.text());
      return new Response(JSON.stringify({ error: 'Could not verify payment' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const order = await orderRes.json();

    if (order.status !== 'COMPLETED') {
      return new Response(JSON.stringify({ error: `Payment not completed. Status: ${order.status}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role for DB updates
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch current wallet balance
    const { data: wallet, error: walletErr } = await supabase
      .from('wallets')
      .select('balance_lkr')
      .eq('user_id', userId)
      .single();

    if (walletErr || !wallet) {
      return new Response(JSON.stringify({ error: 'Wallet not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const newBalance = wallet.balance_lkr + amountLKR;
    if (newBalance > WALLET_MAX) {
      return new Response(JSON.stringify({ error: `Top-up would exceed maximum balance of LKR ${WALLET_MAX}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update wallet
    const { error: updateErr } = await supabase
      .from('wallets')
      .update({ balance_lkr: newBalance })
      .eq('user_id', userId);

    if (updateErr) {
      console.error('Wallet update error:', updateErr);
      return new Response(JSON.stringify({ error: 'Failed to update wallet' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Record transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      amount_lkr: amountLKR,
      type: 'topup',
      description: `PayPal top-up (Order: ${orderId})`,
    });

    return new Response(JSON.stringify({ success: true, newBalance }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('verify-paypal error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
