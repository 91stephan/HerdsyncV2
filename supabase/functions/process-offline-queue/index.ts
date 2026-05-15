/**
 * process-offline-queue
 *
 * Processes pending records in offline_sync_queue submitted by field workers
 * in remote highland districts (Mokhotlong, Quthing, Thaba-Tseka) who
 * registered animals without a network connection.
 *
 * POST /process-offline-queue
 * Body: { device_id?: string, user_id?: string }
 * Processes all 'pending' queue entries for the caller's device, applies
 * them to the relevant tables, and marks records as 'synced' or 'conflict'.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Tables that are safe to process from the offline queue
const ALLOWED_TABLES = new Set([
  "livestock",
  "birthing_records",
  "breeding_records",
  "health_records",
  "vaccination_records",
  "livestock_movements",
  "culling_exchange_records",
  "farmers",
  "woah_disease_reports",
]);

interface QueueEntry {
  id: string;
  device_id: string;
  user_id: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  record_id: string | null;
  payload: Record<string, unknown>;
  retry_count: number;
}

async function processEntry(
  supabase: ReturnType<typeof createClient>,
  entry: QueueEntry
): Promise<{ success: boolean; conflict?: Record<string, unknown>; error?: string }> {
  if (!ALLOWED_TABLES.has(entry.table_name)) {
    return { success: false, error: `Table '${entry.table_name}' is not allowed for offline sync` };
  }

  try {
    if (entry.operation === "INSERT") {
      const { error } = await supabase
        .from(entry.table_name)
        .insert({ ...entry.payload, id: entry.record_id ?? undefined });
      if (error) throw error;

    } else if (entry.operation === "UPDATE") {
      if (!entry.record_id) throw new Error("UPDATE requires record_id");

      // Conflict detection: compare updated_at timestamps
      const { data: current } = await supabase
        .from(entry.table_name)
        .select("updated_at")
        .eq("id", entry.record_id)
        .single();

      const payloadTimestamp = entry.payload.updated_at as string | undefined;
      if (
        current?.updated_at &&
        payloadTimestamp &&
        new Date(current.updated_at) > new Date(payloadTimestamp)
      ) {
        return {
          success: false,
          conflict: { serverRecord: current, clientPayload: entry.payload },
        };
      }

      const { error } = await supabase
        .from(entry.table_name)
        .update(entry.payload)
        .eq("id", entry.record_id);
      if (error) throw error;

    } else if (entry.operation === "DELETE") {
      if (!entry.record_id) throw new Error("DELETE requires record_id");
      const { error } = await supabase
        .from(entry.table_name)
        .delete()
        .eq("id", entry.record_id);
      if (error) throw error;
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const device_id: string | undefined = body.device_id;

    // Fetch pending queue entries for this user
    let query = supabase
      .from("offline_sync_queue")
      .select("*")
      .eq("status", "pending")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (device_id) query = query.eq("device_id", device_id);

    const { data: entries, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ processed: 0, synced: 0, conflicts: 0, failed: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let synced = 0, conflicts = 0, failed = 0;

    for (const entry of entries as QueueEntry[]) {
      const result = await processEntry(supabase, entry);

      if (result.success) {
        await supabase
          .from("offline_sync_queue")
          .update({ status: "synced", synced_at: new Date().toISOString() })
          .eq("id", entry.id);
        synced++;
      } else if (result.conflict) {
        await supabase
          .from("offline_sync_queue")
          .update({
            status: "conflict",
            conflict_data: result.conflict,
            retry_count: entry.retry_count + 1,
          })
          .eq("id", entry.id);
        conflicts++;
      } else {
        await supabase
          .from("offline_sync_queue")
          .update({
            status: entry.retry_count >= 3 ? "failed" : "pending",
            error_message: result.error,
            retry_count: entry.retry_count + 1,
          })
          .eq("id", entry.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: entries.length,
        synced,
        conflicts,
        failed,
        completedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("process-offline-queue error:", err);
    return new Response(JSON.stringify({ error: "Internal server error", detail: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
