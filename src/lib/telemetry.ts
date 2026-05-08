import { supabase } from "@/integrations/supabase/client";

type Severity = "error" | "warning" | "info";

interface TelemetryContext {
  user_id?: string | null;
  farm_id?: string | null;
}

interface LogPayload {
  message: string;
  stack?: string | null;
  source?: string;
  severity?: Severity;
  context?: Record<string, unknown>;
}

const ctx: TelemetryContext = { user_id: null, farm_id: null };

// In-memory dedupe so a single broken render doesn't spam the table.
const recentHashes = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;

function hashKey(p: LogPayload) {
  return `${p.severity ?? "error"}|${p.source ?? ""}|${p.message}`.slice(0, 500);
}

function shouldSkip(p: LogPayload) {
  const key = hashKey(p);
  const now = Date.now();
  for (const [k, t] of recentHashes) {
    if (now - t > DEDUPE_WINDOW_MS) recentHashes.delete(k);
  }
  if (recentHashes.has(key)) return true;
  recentHashes.set(key, now);
  return false;
}

export function setTelemetryContext(next: TelemetryContext) {
  if (next.user_id !== undefined) ctx.user_id = next.user_id;
  if (next.farm_id !== undefined) ctx.farm_id = next.farm_id;
}

export async function logError(payload: LogPayload) {
  try {
    if (shouldSkip(payload)) return;

    const row = {
      severity: payload.severity ?? "error",
      source: payload.source ?? "client",
      message: (payload.message ?? "Unknown error").slice(0, 2000),
      stack: payload.stack ? String(payload.stack).slice(0, 8000) : null,
      url: typeof window !== "undefined" ? window.location.href : null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      user_id: ctx.user_id ?? null,
      farm_id: ctx.farm_id ?? null,
      context: payload.context ?? null,
    };

    // Best-effort; never throw out of telemetry.
    await supabase.from("error_logs").insert(row);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[telemetry] failed to log error", e);
  }
}

export function installGlobalErrorHandlers() {
  if (typeof window === "undefined") return;
  if ((window as any).__herdsync_telemetry_installed) return;
  (window as any).__herdsync_telemetry_installed = true;

  window.addEventListener("error", (event) => {
    const err = event.error as Error | undefined;
    void logError({
      message: err?.message ?? event.message ?? "window.onerror",
      stack: err?.stack ?? null,
      source: "window.onerror",
      context: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const err = reason instanceof Error ? reason : null;
    void logError({
      message: err?.message ?? (typeof reason === "string" ? reason : JSON.stringify(reason ?? "")),
      stack: err?.stack ?? null,
      source: "unhandledrejection",
    });
  });
}
