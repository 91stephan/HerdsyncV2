/**
 * LIAMIS Sync — outbound REST push to the Lesotho Integrated Agriculture
 * Management Information System.
 *
 * When ENVIRONMENT=testing (or the request body contains "mock": true), the
 * function returns a successful mock response without calling the real API.
 * This lets the full offline → sync queue → LIAMIS path be exercised in
 * development without real credentials or network access to LIAMIS.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ENVIRONMENT  = Deno.env.get("ENVIRONMENT") ?? "development";
const LIAMIS_URL   = Deno.env.get("LIAMIS_API_URL") ?? "";
const LIAMIS_TOKEN = Deno.env.get("LIAMIS_API_TOKEN") ?? "";

type SyncType = "livestock" | "movements" | "health" | "breeding";

interface SyncRequest {
  sync_type: SyncType;
  record_ids: string[];
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

  let body: SyncRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { sync_type, record_ids, mock = false } = body;
  const isMock = mock || ENVIRONMENT !== "production";

  // Log the attempt regardless of mock/real
  const logEntry = {
    sync_type,
    record_ids,
    status: "pending" as const,
    request_payload: body as unknown as Record<string, unknown>,
    retry_count: 0,
  };

  const { data: logRow } = await supabase
    .from("liamis_sync_log")
    .insert(logEntry)
    .select("id")
    .single();

  const logId: string | null = logRow?.id ?? null;

  if (isMock) {
    // --- MOCK MODE ---
    const mockResponse = {
      liamis_reference: `MOCK-${Date.now()}`,
      accepted: record_ids.length,
      rejected: 0,
      message: "Mock LIAMIS response — no real API call made",
    };

    if (logId) {
      await supabase
        .from("liamis_sync_log")
        .update({ status: "success", response_payload: mockResponse, synced_at: new Date().toISOString() })
        .eq("id", logId);
    }

    return new Response(JSON.stringify({ success: true, mock: true, response: mockResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // --- PRODUCTION MODE ---
  if (!LIAMIS_URL || !LIAMIS_TOKEN) {
    if (logId) {
      await supabase
        .from("liamis_sync_log")
        .update({ status: "failed", error_message: "LIAMIS_API_URL or LIAMIS_API_TOKEN not configured" })
        .eq("id", logId);
    }
    return new Response(JSON.stringify({ error: "LIAMIS integration not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Fetch the actual records to push
  let records: unknown[] = [];
  if (sync_type === "livestock") {
    const { data } = await supabase.from("livestock").select("*").in("id", record_ids);
    records = data ?? [];
  } else if (sync_type === "movements") {
    const { data } = await supabase.from("livestock_movements").select("*").in("id", record_ids);
    records = data ?? [];
  } else if (sync_type === "health") {
    const { data } = await supabase.from("health_records").select("*").in("id", record_ids);
    records = data ?? [];
  } else if (sync_type === "breeding") {
    const { data } = await supabase.from("breeding_records").select("*").in("id", record_ids);
    records = data ?? [];
  }

  const liamisPayload = { sync_type, records, source: "HerdSync-V2", country: "LSO" };

  const liamisRes = await fetch(`${LIAMIS_URL}/api/v1/sync`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${LIAMIS_TOKEN}`,
    },
    body: JSON.stringify(liamisPayload),
  });

  const responseText = await liamisRes.text();
  let responseJson: unknown;
  try { responseJson = JSON.parse(responseText); } catch { responseJson = { raw: responseText }; }

  const status = liamisRes.ok ? "success" : "failed";
  if (logId) {
    await supabase
      .from("liamis_sync_log")
      .update({
        status,
        response_payload: responseJson as Record<string, unknown>,
        error_message: liamisRes.ok ? null : `HTTP ${liamisRes.status}`,
        synced_at: liamisRes.ok ? new Date().toISOString() : null,
      })
      .eq("id", logId);
  }

  return new Response(JSON.stringify({ success: liamisRes.ok, response: responseJson }), {
    status: liamisRes.ok ? 200 : 502,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
