import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Leaf,
  Activity,
  Users,
  Stethoscope,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SpeciesCount {
  species: string;
  count: number;
}

interface RecentCulling {
  id: string;
  national_id: string;
  species: string;
  exchange_status: string;
  scheduled_date: string | null;
}

interface DiseaseReport {
  id: string;
  disease_name: string;
  status: string;
  district_name: string | null;
  date_detected: string;
}

interface HealthStat {
  district_name: string;
  confirmed_cases: number;
  suspected_cases: number;
  resolved_cases: number;
}

const SPECIES_LABELS: Record<string, string> = {
  cattle: "Cattle",
  sheep: "Sheep",
  goat: "Goat",
  horse: "Horse",
  pig: "Pig",
  donkey: "Donkey",
  chicken: "Chicken",
  other: "Other",
};

const STATUS_COLOURS: Record<string, string> = {
  suspected: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-destructive/15 text-destructive border-destructive/30",
  resolved: "bg-success/15 text-success border-success/30",
  scheduled: "bg-info/15 text-info border-info/30",
  collected: "bg-warning/15 text-warning border-warning/30",
  replaced: "bg-accent/15 text-accent border-accent/30",
  completed: "bg-success/15 text-success border-success/30",
};

function StatCard({
  title,
  value,
  icon: Icon,
  sub,
  onClick,
  accent = false,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  sub?: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  return (
    <div
      className={`card-elevated p-5 flex items-start gap-4 ${onClick ? "cursor-pointer hover:border-primary/40" : ""}`}
      onClick={onClick}
    >
      <div className={`p-2.5 rounded-lg ${accent ? "bg-accent/10" : "bg-primary/10"}`}>
        <Icon className={`w-5 h-5 ${accent ? "text-accent" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [speciesCounts, setSpeciesCounts] = useState<SpeciesCount[]>([]);
  const [totalLivestock, setTotalLivestock] = useState(0);
  const [activeCenters, setActiveCenters] = useState(0);
  const [activeFarmers, setActiveFarmers] = useState(0);
  const [recentCulling, setRecentCulling] = useState<RecentCulling[]>([]);
  const [diseaseReports, setDiseaseReports] = useState<DiseaseReport[]>([]);
  const [healthStats, setHealthStats] = useState<HealthStat[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [
        livestockRes,
        centersRes,
        farmersRes,
        cullingRes,
        diseaseRes,
        healthRes,
        syncRes,
      ] = await Promise.all([
        supabase.from("livestock").select("species").eq("status", "active"),
        supabase.from("breeding_centers").select("id").eq("is_active", true),
        supabase.from("farmers").select("id").eq("is_active", true),
        supabase
          .from("culling_exchanges")
          .select("id, national_id, species, exchange_status, scheduled_date")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("woah_disease_reports")
          .select("id, disease_name, status, date_detected, districts(name)")
          .neq("status", "resolved")
          .order("date_detected", { ascending: false })
          .limit(5),
        supabase
          .from("district_health_summary")
          .select("district_name, confirmed_cases, suspected_cases, resolved_cases")
          .order("confirmed_cases", { ascending: false })
          .limit(6),
        supabase
          .from("offline_sync_queue")
          .select("id", { count: "exact", head: true })
          .eq("synced", false),
      ]);

      // Species breakdown
      if (livestockRes.data) {
        const counts: Record<string, number> = {};
        for (const row of livestockRes.data) {
          counts[row.species] = (counts[row.species] || 0) + 1;
        }
        const sorted = Object.entries(counts)
          .map(([species, count]) => ({ species, count }))
          .sort((a, b) => b.count - a.count);
        setSpeciesCounts(sorted);
        setTotalLivestock(livestockRes.data.length);
      }

      if (centersRes.data) setActiveCenters(centersRes.data.length);
      if (farmersRes.data) setActiveFarmers(farmersRes.data.length);

      if (cullingRes.data) {
        setRecentCulling(
          cullingRes.data.map((r) => ({
            id: r.id,
            national_id: r.national_id ?? "—",
            species: r.species,
            exchange_status: r.exchange_status,
            scheduled_date: r.scheduled_date,
          }))
        );
      }

      if (diseaseRes.data) {
        setDiseaseReports(
          diseaseRes.data.map((r: any) => ({
            id: r.id,
            disease_name: r.disease_name,
            status: r.status,
            district_name: r.districts?.name ?? null,
            date_detected: r.date_detected,
          }))
        );
      }

      if (healthRes.data) setHealthStats(healthRes.data as HealthStat[]);
      setPendingSyncCount(syncRes.count ?? 0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const confirmedDiseases = diseaseReports.filter((r) => r.status === "confirmed").length;
  const pendingCulling = recentCulling.filter(
    (r) => r.exchange_status === "scheduled" || r.exchange_status === "collected"
  ).length;

  const chartData = speciesCounts.map((s) => ({
    name: SPECIES_LABELS[s.species] ?? s.species,
    count: s.count,
  }));

  return (
    <Layout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">National Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Lesotho National Breeding System — {currentTime.toLocaleDateString("en-LS", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {pendingSyncCount > 0 && (
              <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1">
                <Clock className="w-3 h-3" />
                {pendingSyncCount} pending sync
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Registered Livestock"
            value={loading ? "—" : totalLivestock.toLocaleString()}
            icon={Leaf}
            sub="Active animals"
            onClick={() => navigate("/livestock")}
          />
          <StatCard
            title="Breeding Centers"
            value={loading ? "—" : activeCenters}
            icon={Activity}
            sub="Operational"
            onClick={() => navigate("/breeding-dashboard")}
          />
          <StatCard
            title="Registered Farmers"
            value={loading ? "—" : activeFarmers}
            icon={Users}
            sub="Programme participants"
            onClick={() => navigate("/farmers")}
            accent
          />
          <StatCard
            title="Active Disease Reports"
            value={loading ? "—" : diseaseReports.length}
            icon={confirmedDiseases > 0 ? ShieldAlert : Stethoscope}
            sub={confirmedDiseases > 0 ? `${confirmedDiseases} confirmed` : "No confirmed cases"}
            onClick={() => navigate("/woah-reports")}
          />
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left — species chart + health summary */}
          <div className="lg:col-span-2 space-y-6">
            {/* Species breakdown chart */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Livestock by Species</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs"
                  onClick={() => navigate("/livestock")}
                >
                  View Registry <ArrowRight className="ml-1 w-3.5 h-3.5" />
                </Button>
              </div>
              {loading ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  Loading…
                </div>
              ) : chartData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                  No livestock records yet. Register animals to see the breakdown.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "0.5rem",
                        fontSize: 13,
                      }}
                    />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* District health summary */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">District Disease Summary</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary text-xs"
                  onClick={() => navigate("/woah-reports")}
                >
                  WOAH Reports <ArrowRight className="ml-1 w-3.5 h-3.5" />
                </Button>
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground py-4">Loading…</p>
              ) : healthStats.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No disease data available.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-muted-foreground text-xs border-b border-border">
                        <th className="text-left pb-2 font-medium">District</th>
                        <th className="text-center pb-2 font-medium">Suspected</th>
                        <th className="text-center pb-2 font-medium">Confirmed</th>
                        <th className="text-center pb-2 font-medium">Resolved</th>
                      </tr>
                    </thead>
                    <tbody>
                      {healthStats.map((row) => (
                        <tr key={row.district_name} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-2 font-medium text-foreground">{row.district_name}</td>
                          <td className="py-2 text-center text-warning">{row.suspected_cases ?? 0}</td>
                          <td className="py-2 text-center text-destructive font-semibold">{row.confirmed_cases ?? 0}</td>
                          <td className="py-2 text-center text-success">{row.resolved_cases ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Right — disease reports + culling */}
          <div className="space-y-6">
            {/* Active disease reports */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Active Disease Reports</h3>
                {diseaseReports.length > 0 && (
                  <Badge
                    variant="outline"
                    className={confirmedDiseases > 0
                      ? "bg-destructive/10 text-destructive border-destructive/30"
                      : "bg-warning/10 text-warning border-warning/30"}
                  >
                    {diseaseReports.length}
                  </Badge>
                )}
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : diseaseReports.length === 0 ? (
                <div className="flex flex-col items-center py-6 gap-2 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 text-success" />
                  <p className="text-sm">No active disease reports</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {diseaseReports.map((r) => (
                    <div key={r.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
                      <AlertCircle className={`w-4 h-4 mt-0.5 shrink-0 ${r.status === "confirmed" ? "text-destructive" : "text-warning"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.disease_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.district_name ?? "—"} · {new Date(r.date_detected).toLocaleDateString("en-LS")}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${STATUS_COLOURS[r.status] ?? ""}`}>
                        {r.status}
                      </Badge>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-primary text-xs mt-1"
                    onClick={() => navigate("/woah-reports")}
                  >
                    View All Reports <ArrowRight className="ml-1 w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Recent culling & exchange */}
            <div className="card-elevated p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Culling & Exchange</h3>
                {pendingCulling > 0 && (
                  <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
                    {pendingCulling} pending
                  </Badge>
                )}
              </div>
              {loading ? (
                <p className="text-sm text-muted-foreground">Loading…</p>
              ) : recentCulling.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No culling records yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentCulling.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground font-mono">{r.national_id}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {r.species}
                          {r.scheduled_date
                            ? ` · ${new Date(r.scheduled_date).toLocaleDateString("en-LS")}`
                            : ""}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-xs shrink-0 capitalize ${STATUS_COLOURS[r.exchange_status] ?? ""}`}>
                        {r.exchange_status}
                      </Badge>
                    </div>
                  ))}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-primary text-xs mt-1"
                    onClick={() => navigate("/culling-exchange")}
                  >
                    Manage Exchange <ArrowRight className="ml-1 w-3.5 h-3.5" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
