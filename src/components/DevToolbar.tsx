/**
 * DevToolbar — floating developer panel.
 * Only rendered when isDevMode() returns true (Vite dev server or
 * VITE_ENABLE_DEV_TOOLS=true).  Never ships in a production bundle
 * that has neither condition set.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { isDevMode, generateTestNationalId, TEST_ACCOUNTS, type TestRole } from "@/lib/testMode";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
  Database,
  Trash2,
  ScanLine,
  LogIn,
  ExternalLink,
} from "lucide-react";

if (!isDevMode) {
  // tree-shake guard — the compiler removes the whole module in prod
}

const ROLE_LABELS: Record<TestRole, string> = {
  system_admin:     "Admin",
  center_manager:   "Manager",
  district_officer: "Officer",
  veterinarian:     "Vet",
  field_worker:     "Field",
};

const ROLE_COLORS: Record<TestRole, string> = {
  system_admin:     "bg-red-100 text-red-700",
  center_manager:   "bg-purple-100 text-purple-700",
  district_officer: "bg-blue-100 text-blue-700",
  veterinarian:     "bg-green-100 text-green-700",
  field_worker:     "bg-orange-100 text-orange-700",
};

export function DevToolbar() {
  if (!isDevMode) return null;

  const navigate   = useNavigate();
  const [open, setOpen]           = useState(false);
  const [offlineOverride, setOfflineOverride] = useState(false);
  const [loading, setLoading]     = useState<string | null>(null);
  const [lastScanId, setLastScanId] = useState<string | null>(null);

  const loginAs = async (role: TestRole) => {
    setLoading(`login-${role}`);
    const { email, password } = TEST_ACCOUNTS[role];
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(`Login failed: ${error.message}`);
    } else {
      toast.success(`Logged in as ${ROLE_LABELS[role]}`);
      navigate("/dashboard");
    }
    setLoading(null);
  };

  const seedData = async () => {
    setLoading("seed");
    try {
      const { data, error } = await supabase.functions.invoke("seed-test-data", {
        body: { action: "seed" },
      });
      if (error) throw error;
      toast.success(`Seed complete — ${JSON.stringify(data?.results?.seed_counts ?? {})}`);
    } catch (e) {
      toast.error(`Seed failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(null);
  };

  const clearData = async () => {
    if (!confirm("Delete all TEST_RECORD rows and test user accounts?")) return;
    setLoading("clear");
    try {
      const { error } = await supabase.functions.invoke("seed-test-data", {
        body: { action: "clear" },
      });
      if (error) throw error;
      toast.success("Test data cleared");
    } catch (e) {
      toast.error(`Clear failed: ${e instanceof Error ? e.message : String(e)}`);
    }
    setLoading(null);
  };

  const simulateScan = () => {
    const id = generateTestNationalId();
    setLastScanId(id);
    navigator.clipboard?.writeText(id).catch(() => {/* ignore */});
    toast.success(`Simulated scan: ${id} (copied to clipboard)`);
  };

  const toggleOffline = () => {
    const next = !offlineOverride;
    setOfflineOverride(next);
    // Dispatch a custom event that useOfflineSync listens for
    window.dispatchEvent(new CustomEvent("dev:offline-override", { detail: { offline: next } }));
    toast.info(next ? "Offline mode ON (simulated)" : "Offline mode OFF");
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-1">
      {open && (
        <div className="bg-white border border-gray-200 shadow-xl rounded-xl p-3 w-72 text-xs space-y-3">
          <p className="font-bold text-gray-700 text-sm">HerdSync Dev Tools</p>

          {/* Quick login */}
          <div>
            <p className="text-gray-500 mb-1 font-medium uppercase tracking-wide text-[10px]">Login As</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(TEST_ACCOUNTS) as TestRole[]).map((role) => (
                <button
                  key={role}
                  onClick={() => loginAs(role)}
                  disabled={loading === `login-${role}`}
                  className={`px-2 py-1 rounded text-[11px] font-medium border ${ROLE_COLORS[role]} disabled:opacity-50 flex items-center gap-1`}
                >
                  <LogIn className="h-3 w-3" />
                  {loading === `login-${role}` ? "…" : ROLE_LABELS[role]}
                </button>
              ))}
            </div>
          </div>

          {/* Quick nav */}
          <div>
            <p className="text-gray-500 mb-1 font-medium uppercase tracking-wide text-[10px]">Navigate</p>
            <div className="flex flex-wrap gap-1">
              {[
                ["/breeding-dashboard", "Expert Dashboard"],
                ["/culling-exchange",   "Culling & Exchange"],
                ["/rfid-settings",      "RFID Settings"],
                ["/dashboard",          "Dashboard"],
              ].map(([path, label]) => (
                <button
                  key={path}
                  onClick={() => navigate(path)}
                  className="px-2 py-1 rounded text-[11px] font-medium bg-gray-100 text-gray-700 border hover:bg-gray-200 flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* RFID simulator */}
          <div>
            <p className="text-gray-500 mb-1 font-medium uppercase tracking-wide text-[10px]">RFID Simulator</p>
            <button
              onClick={simulateScan}
              className="w-full px-2 py-1.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 flex items-center justify-center gap-1"
            >
              <ScanLine className="h-3 w-3" />
              Generate valid 15-digit ID
            </button>
            {lastScanId && (
              <p className="font-mono text-gray-500 mt-1 text-center">{lastScanId}</p>
            )}
          </div>

          {/* Offline toggle */}
          <div>
            <p className="text-gray-500 mb-1 font-medium uppercase tracking-wide text-[10px]">Connectivity</p>
            <button
              onClick={toggleOffline}
              className={`w-full px-2 py-1.5 rounded text-[11px] font-medium border flex items-center justify-center gap-1 ${
                offlineOverride
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-green-50 text-green-700 border-green-200"
              }`}
            >
              {offlineOverride
                ? <><WifiOff className="h-3 w-3" /> Offline (simulated) — click to go online</>
                : <><Wifi className="h-3 w-3" /> Online — click to simulate offline</>
              }
            </button>
          </div>

          {/* Data management */}
          <div>
            <p className="text-gray-500 mb-1 font-medium uppercase tracking-wide text-[10px]">Test Data</p>
            <div className="flex gap-1">
              <button
                onClick={seedData}
                disabled={!!loading}
                className="flex-1 px-2 py-1.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Database className="h-3 w-3" />
                {loading === "seed" ? "Seeding…" : "Seed Data"}
              </button>
              <button
                onClick={clearData}
                disabled={!!loading}
                className="flex-1 px-2 py-1.5 rounded text-[11px] font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 flex items-center justify-center gap-1 disabled:opacity-50"
              >
                <Trash2 className="h-3 w-3" />
                {loading === "clear" ? "Clearing…" : "Clear Data"}
              </button>
            </div>
          </div>

          <div className="border-t pt-2 text-[10px] text-gray-400 text-center">
            DEV TOOLS — not visible in production
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-900 text-white text-xs font-semibold shadow-lg hover:bg-gray-700"
      >
        <Badge className="bg-yellow-400 text-gray-900 text-[10px] px-1.5 py-0 h-4 rounded-full">DEV</Badge>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
    </div>
  );
}
