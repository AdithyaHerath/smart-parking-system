import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const email = "superadmin@students.nsbm.ac.lk";
  const password = "Super@123";
  const studentId = "ADMIN001";

  // Check if already exists
  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ message: "Admin already exists" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Create auth user
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { student_id: studentId, name: "Super Admin", phone: "0000000000" },
  });

  if (authError) {
    return new Response(JSON.stringify({ error: authError.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Update role to super_admin (handle_new_user trigger sets 'student' by default)
  await supabaseAdmin
    .from("user_roles")
    .update({ role: "super_admin" })
    .eq("user_id", authData.user.id);

  return new Response(
    JSON.stringify({ message: "Super Admin created", email, password }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
