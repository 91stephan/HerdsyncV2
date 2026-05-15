import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Only callable when ENVIRONMENT is not "production"
const ENVIRONMENT = Deno.env.get("ENVIRONMENT") ?? "development";

const TEST_USERS = [
  { email: "testadmin@herdsync.ls",    password: "Test1234!", role: "system_admin",     full_name: "Test Admin",          employee_number: "EMP-T001" },
  { email: "testmanager@herdsync.ls",  password: "Test1234!", role: "center_manager",   full_name: "Test Center Manager", employee_number: "EMP-T002" },
  { email: "testofficer@herdsync.ls",  password: "Test1234!", role: "district_officer", full_name: "Test District Officer",employee_number: "EMP-T003" },
  { email: "testvет@herdsync.ls",       password: "Test1234!", role: "veterinarian",     full_name: "Test Veterinarian",   employee_number: "EMP-T004" },
  { email: "testfield@herdsync.ls",    password: "Test1234!", role: "field_worker",     full_name: "Test Field Worker",   employee_number: "EMP-T005" },
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (ENVIRONMENT === "production") {
    return new Response(
      JSON.stringify({ error: "Seed endpoint disabled in production" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const body = await req.json().catch(() => ({}));
  const action: string = body.action ?? "seed";

  if (action === "clear") {
    // Remove test records (identified by notes = 'TEST_RECORD' or email domain)
    await supabaseAdmin.from("woah_disease_reports").delete().like("notes", "%TEST_RECORD%");
    await supabaseAdmin.from("vaccination_records").delete().like("notes", "%TEST_RECORD%");
    await supabaseAdmin.from("health_records").delete().like("notes", "%TEST_RECORD%");
    await supabaseAdmin.from("culling_exchange_records").delete().like("notes", "%TEST_RECORD%");
    await supabaseAdmin.from("livestock_movements").delete().like("notes", "%TEST_RECORD%");
    await supabaseAdmin.from("birthing_records").delete().like("notes", "%TEST_RECORD%");
    await supabaseAdmin.from("breeding_records").delete().like("notes", "%TEST_RECORD%");
    await supabaseAdmin.from("livestock").delete().like("notes", "%TEST_RECORD%");
    await supabaseAdmin.from("farmers").delete().like("notes", "%TEST_RECORD%");

    // Delete test auth users
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    for (const user of users?.users ?? []) {
      if (user.email?.endsWith("@herdsync.ls")) {
        await supabaseAdmin.auth.admin.deleteUser(user.id);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Test data cleared" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  // --- SEED ---
  const results: Record<string, unknown> = {};

  // 1. Upsert test auth users and ensure profiles exist
  const createdUsers: { id: string; email: string; role: string }[] = [];
  for (const u of TEST_USERS) {
    // Check if already exists
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find((x) => x.email === u.email);

    let userId: string;
    if (found) {
      userId = found.id;
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { full_name: u.full_name },
      });
      if (error || !created?.user) {
        results[u.email] = { error: error?.message };
        continue;
      }
      userId = created.user.id;
    }

    // Ensure profile row exists with correct role
    const { data: districts } = await supabaseAdmin.from("districts").select("id").eq("code", "QUT").single();
    const { data: centers } = await supabaseAdmin.from("breeding_centers").select("id").limit(1).single();

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      full_name: u.full_name,
      role: u.role,
      district_id: districts?.id ?? null,
      breeding_center_id: u.role === "center_manager" ? (centers?.id ?? null) : null,
      employee_number: u.employee_number,
      active: true,
    }, { onConflict: "id" });

    createdUsers.push({ id: userId, email: u.email, role: u.role });
  }
  results.users = createdUsers;

  // 2. Run the SQL seed migration via rpc (the migration already has the test data)
  // The 20260515000014_test_seed.sql migration inserts test farmers/livestock when
  // it runs. Here we just verify the data is present and report counts.
  const { count: farmerCount } = await supabaseAdmin
    .from("farmers")
    .select("id", { count: "exact", head: true })
    .like("notes", "%TEST_RECORD%");

  const { count: livestockCount } = await supabaseAdmin
    .from("livestock")
    .select("id", { count: "exact", head: true })
    .like("notes", "%TEST_RECORD%");

  results.seed_counts = { farmers: farmerCount, livestock: livestockCount };

  return new Response(
    JSON.stringify({ success: true, results }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
