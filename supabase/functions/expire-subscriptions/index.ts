import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Expire any 'trialing' subscription whose trial_ends_at is in the past.
    const { data, error } = await supabase
      .from("subscriptions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("status", "trialing")
      .lt("trial_ends_at", new Date().toISOString())
      .select("id");

    if (error) throw error;

    // Expire 'active' subs whose current_period_end is past (skip admins — they auto-renew on login).
    const { data: expiredActive, error: expiredErr } = await supabase
      .from("subscriptions")
      .update({ status: "expired", updated_at: new Date().toISOString() })
      .eq("status", "active")
      .lt("current_period_end", new Date().toISOString())
      .select("id");

    if (expiredErr) throw expiredErr;

    return new Response(
      JSON.stringify({
        ok: true,
        trials_expired: data?.length ?? 0,
        active_expired: expiredActive?.length ?? 0,
        ran_at: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("expire-subscriptions error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
