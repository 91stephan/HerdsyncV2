import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface SyncQueueEntry {
  id: string;
  device_id: string;
  table_name: string;
  operation: "INSERT" | "UPDATE" | "DELETE";
  status: "pending" | "synced" | "conflict" | "failed";
  retry_count: number;
  error_message: string | null;
  created_at: string;
}

export interface SyncStats {
  pending: number;
  synced: number;
  conflict: number;
  failed: number;
  total: number;
}

const DEVICE_ID_KEY = "herdsync_device_id";

function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = `device_${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function useOfflineSync() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<SyncQueueEntry[]>([]);
  const [stats, setStats] = useState<SyncStats>({ pending: 0, synced: 0, conflict: 0, failed: 0, total: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const deviceId = getDeviceId();

  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online",  onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online",  onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const fetchQueue = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("offline_sync_queue")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    const entries = (data ?? []) as SyncQueueEntry[];
    setQueue(entries);
    setStats({
      pending:  entries.filter((e) => e.status === "pending").length,
      synced:   entries.filter((e) => e.status === "synced").length,
      conflict: entries.filter((e) => e.status === "conflict").length,
      failed:   entries.filter((e) => e.status === "failed").length,
      total:    entries.length,
    });
  }, [user]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const triggerSync = useCallback(async () => {
    if (!user || !isOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-offline-queue`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ device_id: deviceId }),
        }
      );
      if (res.ok) {
        setLastSyncedAt(new Date().toISOString());
        await fetchQueue();
      }
    } finally {
      setIsSyncing(false);
    }
  }, [user, isOnline, isSyncing, deviceId, fetchQueue]);

  // Enqueue a record for offline processing
  const enqueue = useCallback(
    async (
      tableName: string,
      operation: "INSERT" | "UPDATE" | "DELETE",
      payload: Record<string, unknown>,
      recordId?: string
    ) => {
      if (!user) return;
      await supabase.from("offline_sync_queue").insert({
        device_id:   deviceId,
        user_id:     user.id,
        table_name:  tableName,
        operation,
        record_id:   recordId ?? null,
        payload,
        status:      "pending",
      });
      await fetchQueue();
    },
    [user, deviceId, fetchQueue]
  );

  return { queue, stats, isSyncing, isOnline, lastSyncedAt, triggerSync, enqueue, deviceId };
}
