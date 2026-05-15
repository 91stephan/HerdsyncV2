/**
 * WaMCoP Project MIS Sync — pushes data to the Wool and Mohair
 * Competitiveness Project Management Information System.
 *
 * When ENVIRONMENT=testing (or "mock": true in the request), returns a
 * mock success response so the full export path can be tested without
 * access to the live WaMCoP MIS endpoint.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENVIRONMENT = Deno.env.get("ENVIRONMENT") ?? "development";
const MIS_URL     = Deno.env.get("WAMCOP_MIS_URL") ?? "";
const MIS_TOKEN   = Deno.env.get("WAMCOP_MIS_TOKEN") ?? "";

type MisSyncType = "genetic_indices" | "efi_export" | "reproductive_indices" | "culling_exchange";

interface MisSyncRequest {
  sync_type: MisSyncType;
  district_id?: string;
  period_start?: string;
  period_end?: string;
  species?: string;
  record_ids?: string[];
  mock?: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let body: MisSyncRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { sync_type, mock = false } = body;
  const isMock = mock || ENVIRONMENT !== "production";

  const logEntry = {
    sync_type,
    record_ids: body.record_ids ?? [],
    status: "pending" as const,
    request_payload: body as unknown as Record<string, unknown>,
    retry_count: 0,
  };

  const { data: logRow } = await supabase
    .from("project_mis_sync_log")
    .insert(logEntry)
    .select("id")
    .single();

  const logId: string | null = logRow?.id ?? null;

  if (isMock) {
    const mockResponse = {
      wamcop_reference: `MOCK-MIS-${Date.now()}`,
      sync_type,
      records_received: body.record_ids?.length ?? 0,
      message: "Mock WaMCoP MIS response — no real API call made",
    };

    if (logId) {
      await supabase
        .from("project_mis_sync_log")
        .update({ status: "success", response_payload: mockResponse, synced_at: new Date().toISOString() })
        .eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, mock: true, response: mockResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- PRODUCTION MODE ---
  if (!MIS_URL || !MIS_TOKEN) {
    if (logId) {
      await supabase
        .from("project_mis_sync_log")
        .update({ status: "failed", error_message: "WAMCOP_MIS_URL or WAMCOP_MIS_TOKEN not configured" })
        .eq("id", logId);
    }
    return new Response(JSON.stringify({ error: "WaMCoP MIS integration not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Build payload based on sync type
  let records: unknown[] = [];
  if (sync_type === "genetic_indices") {
    const q = supabase.from("genetic_indices").select("*");
    if (body.district_id) q.eq("district_id", body.district_id);
    if (body.species)     q.eq("species", body.species);
    const { data } = await q;
    records = data ?? [];
  } else if (sync_type === "efi_export") {
    const { data } = await supabase.from("efi_export_records").select("*").in("id", body.record_ids ?? []);
    records = data ?? [];
  } else if (sync_type === "reproductive_indices") {
    const q = supabase.from("reproductive_indices").select("*");
    if (body.district_id)  q.eq("district_id", body.district_id);
    if (body.species)      q.eq("species", body.species);
    if (body.period_start) q.gte("period_start", body.period_start);
    if (body.period_end)   q.lte("period_end", body.period_end);
    const { data } = await q;
    records = data ?? [];
  } else if (sync_type === "culling_exchange") {
    const { data } = await supabase.from("culling_exchange_records").select("*").in("id", body.record_ids ?? []);
    records = data ?? [];
  }

  const misPayload = { sync_type, records, source: "HerdSync-V2", country: "LSO" };

  const misRes = await fetch(`${MIS_URL}/api/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${MIS_TOKEN}`,
    },
    body: JSON.stringify(misPayload),
  });

  const responseText = await misRes.text();
  let responseJson: unknown;
  try { responseJson = JSON.parse(responseText); } catch { responseJson = { raw: responseText }; }

  const status = misRes.ok ? "success" : "failed";
  if (logId) {
    await supabase
      .from("project_mis_sync_log")
      .update({
        status,
        response_payload: responseJson as Record<string, unknown>,
        error_message: misRes.ok ? null : `HTTP ${misRes.status}`,
        synced_at: misRes.ok ? new Date().toISOString() : null,
      })
      .eq("id", logId);
  }

  return new Response(JSON.stringify({ success: misRes.ok, response: responseJson }), {
    status: misRes.ok ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
