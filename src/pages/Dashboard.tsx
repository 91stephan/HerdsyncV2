import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  ArrowRight,
  RefreshCw,
  Leaf,
  Activity,
  Users,
  ShieldAlert,
  Scissors,
  AlertCircle,
  CheckCircle2,
  Clock,
  Stethoscope,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ── Static fallback demo data shown when DB is empty ─────────
const DEMO_MONTHLY = [
  { month: "Jul", cattle: 22, sheep: 98, goat: 67, horse: 12 },
  { month: "Aug", cattle: 24, sheep: 102, goat: 70, horse: 13 },
  { month: "Sep", cattle: 25, sheep: 108, goat: 74, horse: 13 },
  { month: "Oct", cattle: 27, sheep: 112, goat: 76, horse: 14 },
  { month: "Nov", cattle: 28, sheep: 118, goat: 79, horse: 14 },
  { month: "Dec", cattle: 30, sheep: 121, goat: 82, horse: 15 },
  { month: "Jan", cattle: 29, sheep: 119, goat: 81, horse: 14 },
  { month: "Feb", cattle: 31, sheep: 123, goat: 85, horse: 15 },
  { month: "Mar", cattle: 33, sheep: 130, goat: 88, horse: 16 },
  { month: "Apr", cattle: 35, sheep: 137, goat: 92, horse: 16 },
  { month: "May", cattle: 36, sheep: 143, goat: 95, horse: 17 },
  { month: "Jun", cattle: 38, sheep: 152, goat: 99, horse: 18 },
];

const DEMO_SPECIES = [
  { name: "Merino Sheep", value: 152, color: "hsl(218 72% 50%)" },
  { name: "Angora Goat", value: 99, color: "hsl(155 55% 42%)" },
  { name: "Cattle", value: 38, color: "hsl(38 90% 52%)" },
  { name: "Horse", value: 18, color: "hsl(270 60% 55%)" },
  { name: "Donkey", value: 20, color: "hsl(0 65% 55%)" },
];

const DEMO_DISTRICTS = [
  { name: "Quthing", livestock: 152, centers: 2, target: 160, health: "good" },
  { name: "Mokhotlong", livestock: 98, centers: 2, target: 110, health: "warning" },
  { name: "Mohale's Hoek", livestock: 99, centers: 1, target: 100, health: "alert" },
  { name: "Thaba-Tseka", livestock: 77, centers: 1, target: 90, health: "good" },
  { name: "Berea", livestock: 54, centers: 1, target: 60, health: "good" },
  { name: "Leribe", livestock: 47, centers: 1, target: 55, health: "good" },
];

const DEMO_ACTIVITY = [
  { time: "2h ago", type: "breeding", text: "Mating event recorded — Quthing BC, QUT-RAM-001 × QUT-EWE-007" },
  { time: "4h ago", type: "health", text: "Vaccination completed — 12 Angora does, Mohale's Hoek BC" },
  { time: "6h ago", type: "culling", text: "Culling exchange completed — 2 Merino rams, Quthing district" },
  { time: "1d ago", type: "disease", text: "WOAH report updated — Contagious Ecthyma status: confirmed" },
  { time: "1d ago", type: "livestock", text: "8 new lambs registered — Mokhotlong BC" },
  { time: "2d ago", type: "breeding", text: "Birthing record added — QUT-EWE-001 delivered 1 live lamb" },
];

// ── Helpers ───────────────────────────────────────────────────
const STATUS_COLOURS: Record<string, string> = {
  suspected: "bg-warning/15 text-warning border-warning/30",
  confirmed: "bg-destructive/15 text-destructive border-destructive/30",
  resolved: "bg-success/15 text-success border-success/30",
  scheduled: "bg-info/15 text-info border-info/30",
  collected: "bg-warning/15 text-warning border-warning/30",
  replaced: "bg-accent/15 text-accent border-accent/30",
  completed: "bg-success/15 text-success border-success/30",
};

const ACTIVITY_ICON: Record<string, React.ElementType> = {
  breeding: Activity,
  health: Stethoscope,
  culling: Scissors,
  disease: ShieldAlert,
  livestock: Leaf,
};

const SPECIES_LABELS: Record<string, string> = {
  cattle: "Cattle",
  merino_sheep: "Merino Sheep",
  angora_goat: "Angora Goat",
  horse: "Horse",
  pig: "Pig",
  donkey: "Donkey",
  chicken: "Chicken",
  other: "Other",
};

function trend(v: number, delta: number) {
  const pct = v > 0 ? Math.abs(Math.round((delta / v) * 100)) : 0;
  if (delta > 0) return { icon: TrendingUp, color: "text-success", label: `+${pct}%` };
  if (delta < 0) return { icon: TrendingDown, color: "text-destructive", label: `-${pct}%` };
  return null;
}

// ── KPI Card ──────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  gradient,
  delta,
  onClick,
}: {
  title: string;
  value: number | string;
  sub?: string;
  icon: React.ElementType;
  gradient: string;
  delta?: number;
  onClick?: () => void;
}) {
  const t = typeof delta === "number" ? trend(typeof value === "number" ? value : 0, delta) : null;
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 text-white shadow-md cursor-pointer transition-transform hover:-translate-y-0.5 hover:shadow-lg ${gradient}`}
      onClick={onClick}
    >
      {/* Background decorative circle */}
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10 pointer-events-none" />
      <div className="absolute -right-2 -bottom-6 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
      <div className="flex items-start justify-between">
        <div className="bg-white/20 p-2 rounded-lg">
          <Icon className="w-5 h-5" />
        </div>
        {t && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full`}>
            <t.icon className="w-3 h-3" />
            {t.label}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold tracking-tight">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        <p className="text-sm text-white/80 mt-0.5">{title}</p>
        {sub && <p className="text-xs text-white/60 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Donut label ───────────────────────────────────────────────
const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.07) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
      {`${Math.round(percent * 100)}%`}
    </text>
  );
}

// ── Main component ────────────────────────────────────────────
export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [loading, setLoading] = useState(true);
  const [totalLivestock, setTotalLivestock] = useState(0);
  const [activeCenters, setActiveCenters] = useState(0);
  const [activeFarmers, setActiveFarmers] = useState(0);
  const [openDiseases, setOpenDiseases] = useState(0);
  const [pendingCulling, setPendingCulling] = useState(0);
  const [speciesPieData, setSpeciesPieData] = useState(DEMO_SPECIES);
  const [districtData, setDistrictData] = useState(DEMO_DISTRICTS);
  const [recentActivity, setRecentActivity] = useState(DEMO_ACTIVITY);
  const [monthlyData] = useState(DEMO_MONTHLY);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const PIE_COLORS = [
    "hsl(218 72% 50%)",
    "hsl(155 55% 42%)",
    "hsl(38 90% 52%)",
    "hsl(270 60% 55%)",
    "hsl(0 65% 55%)",
    "hsl(180 55% 42%)",
  ];

  const load = async () => {
    setLoading(true);
    try {
      const [livestockRes, centersRes, farmersRes, diseaseRes, cullingRes, activityRes] =
        await Promise.all([
          supabase.from("livestock").select("species").eq("status", "active"),
          supabase.from("breeding_centers").select("id").eq("is_active", true),
          supabase.from("farmers").select("id").eq("is_active", true),
          supabase.from("woah_disease_reports").select("id").neq("status", "resolved"),
          supabase
            .from("culling_exchanges")
            .select("id")
            .in("exchange_status", ["scheduled", "collected"]),
          supabase
            .from("culling_exchanges")
            .select("id, national_id, species, exchange_status, scheduled_date, created_at")
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

      if (livestockRes.data && livestockRes.data.length > 0) {
        setTotalLivestock(livestockRes.data.length);
        const counts: Record<string, number> = {};
        for (const r of livestockRes.data) counts[r.species] = (counts[r.species] || 0) + 1;
        const pie = Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .map(([species, value], i) => ({
            name: SPECIES_LABELS[species] ?? species,
            value,
            color: PIE_COLORS[i % PIE_COLORS.length],
          }));
        setSpeciesPieData(pie);
      }

      if (centersRes.data) setActiveCenters(centersRes.data.length);
      if (farmersRes.data) setActiveFarmers(farmersRes.data.length);
      if (diseaseRes.data) setOpenDiseases(diseaseRes.data.length);
      if (cullingRes.data) setPendingCulling(cullingRes.data.length);

      if (activityRes.data && activityRes.data.length > 0) {
        setRecentActivity(
          activityRes.data.map((r: any) => ({
            time: new Date(r.created_at).toLocaleDateString("en-LS"),
            type: "culling",
            text: `Culling exchange — ${r.national_id ?? "—"} (${r.species}) · ${r.exchange_status}`,
          }))
        );
      }
    } finally {
      setLoading(false);
      setLastRefresh(new Date());
    }
  };

  useEffect(() => { load(); }, []);

  const displayLivestock = totalLivestock || DEMO_SPECIES.reduce((s, d) => s + d.value, 0);
  const displayCenters = activeCenters || 8;
  const displayFarmers = activeFarmers || 42;
  const displayDisease = openDiseases || 2;

  return (
    <Layout>
      <div className="space-y-6 pb-6">

        {/* ── Hero banner ────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[hsl(218_72%_28%)] via-[hsl(218_72%_36%)] to-[hsl(218_62%_46%)] text-white shadow-lg p-6 md:p-8">
          {/* Decorative blobs */}
          <div className="absolute right-0 top-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute left-1/2 bottom-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[hsl(155_55%_42%)] flex items-center justify-center text-white text-xs font-bold">
                  LS
                </div>
                <span className="text-white/70 text-sm">Ministry of Agriculture — HerdSync V2</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">
                National Breeding System
              </h1>
              <p className="text-white/70 mt-1 text-sm">
                {lastRefresh.toLocaleDateString("en-LS", {
                  weekday: "long", day: "numeric", month: "long", year: "numeric",
                })}
                {" · "}
                {profile?.role ? (
                  <span className="capitalize">{profile.role.replace("_", " ")}</span>
                ) : "Staff Portal"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {pendingCulling > 0 && (
                <Badge className="bg-warning/90 text-white border-0 gap-1">
                  <Clock className="w-3 h-3" />
                  {pendingCulling} pending culling
                </Badge>
              )}
              <Button
                variant="outline"
                size="sm"
                className="border-white/40 bg-white/15 text-white hover:bg-white/25 hover:text-white"
                onClick={load}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* ── KPI cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Registered Livestock"
            value={displayLivestock}
            sub="Active animals"
            icon={Leaf}
            gradient="bg-gradient-to-br from-[hsl(218_72%_38%)] to-[hsl(218_72%_52%)]"
            delta={12}
            onClick={() => navigate("/livestock")}
          />
          <KpiCard
            title="Breeding Centers"
            value={displayCenters}
            sub="Operational"
            icon={Activity}
            gradient="bg-gradient-to-br from-[hsl(155_55%_32%)] to-[hsl(155_55%_46%)]"
            onClick={() => navigate("/breeding-dashboard")}
          />
          <KpiCard
            title="Registered Farmers"
            value={displayFarmers}
            sub="Programme participants"
            icon={Users}
            gradient="bg-gradient-to-br from-[hsl(38_85%_42%)] to-[hsl(38_85%_56%)]"
            delta={5}
            onClick={() => navigate("/farmers")}
          />
          <KpiCard
            title="Open Disease Reports"
            value={displayDisease}
            sub={displayDisease > 0 ? "Require attention" : "All clear"}
            icon={displayDisease > 0 ? ShieldAlert : CheckCircle2}
            gradient={displayDisease > 0
              ? "bg-gradient-to-br from-[hsl(0_65%_45%)] to-[hsl(0_65%_58%)]"
              : "bg-gradient-to-br from-[hsl(155_55%_32%)] to-[hsl(155_55%_46%)]"}
            onClick={() => navigate("/woah-reports")}
          />
          <KpiCard
            title="Pending Exchanges"
            value={pendingCulling || 3}
            sub="Scheduled / collected"
            icon={Scissors}
            gradient="bg-gradient-to-br from-[hsl(270_55%_42%)] to-[hsl(270_55%_55%)]"
            onClick={() => navigate("/culling-exchange")}
          />
        </div>

        {/* ── Charts row ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Population trend area chart */}
          <div className="lg:col-span-2 card-elevated p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-foreground">Population Trend</h3>
                <p className="text-xs text-muted-foreground mt-0.5">12-month rolling livestock count</p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/livestock")}>
                Registry <ArrowRight className="ml-1 w-3.5 h-3.5" />
              </Button>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="gCattle" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38 85% 52%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(38 85% 52%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gSheep" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(218 72% 50%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(218 72% 50%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gGoat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(155 55% 42%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(155 55% 42%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="cattle" name="Cattle" stroke="hsl(38 85% 52%)" fill="url(#gCattle)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="sheep" name="Merino Sheep" stroke="hsl(218 72% 50%)" fill="url(#gSheep)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="goat" name="Angora Goat" stroke="hsl(155 55% 42%)" fill="url(#gGoat)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Species donut */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-foreground">Species Mix</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Current registered herd</p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={speciesPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  dataKey="value"
                  labelLine={false}
                  label={PieLabel}
                >
                  {speciesPieData.map((entry, i) => (
                    <Cell key={entry.name} fill={entry.color ?? PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {speciesPieData.slice(0, 5).map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-muted-foreground flex-1">{s.name}</span>
                  <span className="font-semibold text-foreground">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── District + Activity ─────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* District performance */}
          <div className="lg:col-span-2 card-elevated p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-foreground">District Performance</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Livestock vs. programme target</p>
              </div>
              <Button variant="ghost" size="sm" className="text-primary text-xs" onClick={() => navigate("/woah-reports")}>
                Health Reports <ArrowRight className="ml-1 w-3.5 h-3.5" />
              </Button>
            </div>
            <div className="space-y-3">
              {districtData.map((d) => {
                const pct = Math.min(Math.round((d.livestock / d.target) * 100), 100);
                const barColor =
                  d.health === "alert"
                    ? "bg-destructive"
                    : d.health === "warning"
                    ? "bg-warning"
                    : "bg-success";
                return (
                  <div key={d.name} className="group">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-medium text-foreground">{d.name}</span>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{d.centers} center{d.centers > 1 ? "s" : ""}</span>
                        <span className="font-semibold text-foreground">{d.livestock} / {d.target}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs py-0 ${
                            d.health === "alert"
                              ? "bg-destructive/10 text-destructive border-destructive/20"
                              : d.health === "warning"
                              ? "bg-warning/10 text-warning border-warning/20"
                              : "bg-success/10 text-success border-success/20"
                          }`}
                        >
                          {d.health === "alert" ? "Alert" : d.health === "warning" ? "Watch" : "Good"}
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity feed */}
          <div className="card-elevated p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-foreground">Recent Activity</h3>
            </div>
            <div className="space-y-3">
              {recentActivity.map((ev, i) => {
                const Icon = ACTIVITY_ICON[ev.type] ?? Activity;
                return (
                  <div key={i} className="flex gap-3 items-start">
                    <div className="mt-0.5 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-snug">{ev.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{ev.time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Fiber stats + quick actions ─────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card-elevated p-5 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Avg Greasy Fleece</p>
            <p className="text-2xl font-bold text-foreground">5.4 kg</p>
            <p className="text-xs text-success flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +0.3 kg vs last season</p>
          </div>
          <div className="card-elevated p-5 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Avg Micron Diameter</p>
            <p className="text-2xl font-bold text-foreground">17.8 μm</p>
            <p className="text-xs text-success flex items-center gap-1"><TrendingDown className="w-3 h-3" /> -0.4 μm finer vs last season</p>
          </div>
          <div className="card-elevated p-5 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Lambing Rate</p>
            <p className="text-2xl font-bold text-foreground">84%</p>
            <p className="text-xs text-success flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +6% vs target</p>
          </div>
          <div className="card-elevated p-5 flex flex-col gap-1">
            <p className="text-xs text-muted-foreground">Annual Mortality Rate</p>
            <p className="text-2xl font-bold text-foreground">3.1%</p>
            <p className="text-xs text-destructive flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +0.4% vs last year</p>
          </div>
        </div>

        {/* ── Quick access buttons ────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Register Animal",    href: "/livestock",           icon: Leaf },
            { label: "Record Mating",      href: "/breeding",            icon: Activity },
            { label: "File Health Record", href: "/health",              icon: Stethoscope },
            { label: "Report Disease",     href: "/woah-reports",        icon: AlertCircle },
          ].map(({ label, href, icon: Icon }) => (
            <button
              key={href}
              onClick={() => navigate(href)}
              className="card-elevated p-4 flex flex-col items-center gap-2 text-center hover:border-primary/40 hover:bg-primary/5 transition-colors cursor-pointer"
            >
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-primary" />
              </div>
              <span className="text-xs font-medium text-foreground">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
