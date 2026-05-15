/**
 * calculate-genetic-indices
 *
 * Scheduled edge function that recalculates the three Basotho livestock
 * indices for all districts and species for the current and prior year.
 *
 * Runs via pg_cron or a cron trigger (configured in supabase/config.toml).
 * Can also be triggered manually via POST by district officers.
 *
 * POST /calculate-genetic-indices
 * Body (optional): { district_id?: string, year?: number, species?: string }
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ALL_SPECIES = ["merino_sheep", "angora_goat", "cattle", "other"];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Allow both scheduled (no auth header) and manual (with auth) invocations
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const { data: { user }, error } = await supabase.auth.getUser(
        authHeader.replace("Bearer ", "")
      );
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Check user is officer or admin
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      const allowedRoles = ["system_admin", "district_officer", "center_manager"];
      if (!profile || !allowedRoles.includes(profile.role)) {
        return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body = await req.json().catch(() => ({}));
    const currentYear = new Date().getFullYear();
    const targetYear: number  = body.year       ?? currentYear;
    const targetSpecies: string[] = body.species ? [body.species] : ALL_SPECIES;

    // Fetch districts to iterate over
    let districtQuery = supabase.from("districts").select("id, name");
    if (body.district_id) districtQuery = districtQuery.eq("id", body.district_id);
    const { data: districts, error: distErr } = await districtQuery;
    if (distErr) throw distErr;

    const results: Array<{ district: string; species: string; status: string }> = [];

    for (const district of (districts ?? [])) {
      for (const species of targetSpecies) {
        try {
          const { error: calcError } = await supabase.rpc("calculate_genetic_indices", {
            _district_id:        district.id,
            _species:            species,
            _year:               targetYear,
            _breeding_center_id: null,
          });

          results.push({
            district: district.name,
            species,
            status: calcError ? `error: ${calcError.message}` : "ok",
          });
        } catch (err) {
          results.push({ district: district.name, species, status: `exception: ${String(err)}` });
        }
      }
    }

    const successCount = results.filter((r) => r.status === "ok").length;
    const errorCount   = results.length - successCount;

    return new Response(
      JSON.stringify({
        year: targetYear,
        totalCalculations: results.length,
        succeeded: successCount,
        failed: errorCount,
        details: results,
        completedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("calculate-genetic-indices error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
