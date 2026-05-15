import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Activity, Baby, Heart, TrendingDown } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

const SPECIES_OPTIONS = [
  { value: "all",          label: "All Species" },
  { value: "merino_sheep", label: "Merino Sheep" },
  { value: "angora_goat",  label: "Angora Goat" },
  { value: "cattle",       label: "Cattle" },
];

const PERIOD_OPTIONS = [
  { value: "365",  label: "Last 12 months" },
  { value: "180",  label: "Last 6 months" },
  { value: "730",  label: "Last 2 years" },
];

function StatCard({ title, value, unit, icon: Icon, color }: {
  title: string; value: string | number | null; unit: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
            <p className="text-2xl font-bold mt-1">
              {value !== null && value !== undefined ? `${Number(value).toFixed(1)}${unit}` : "—"}
            </p>
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReproductiveIndices() {
  const { profile } = useProfile();
  const [species, setSpecies] = useState("merino_sheep");
  const [districtId, setDistrictId] = useState<string>(profile?.district_id ?? "");

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: async () => {
      const { data } = await supabase.from("districts").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data: indices, isLoading } = useQuery({
    queryKey: ["reproductive-indices", districtId || profile?.district_id, species],
    queryFn: async () => {
      let q = supabase
        .from("reproductive_indices")
        .select("*, districts(name), breeding_centers(name)")
        .order("period_end", { ascending: false });

      const did = districtId || profile?.district_id;
      if (did) q = q.eq("district_id", did);
      if (species !== "all") q = q.eq("species", species);

      const { data } = await q.limit(20);
      return data ?? [];
    },
    enabled: !!profile,
  });

  // Aggregate most recent values for KPI cards
  const latest = indices?.[0];

  const chartData = indices
    ?.slice(0, 10)
    .reverse()
    .map((r: any) => ({
      period: r.period_start?.slice(0, 7),
      "Lambing/Kidding %": Number((r.lambing_kidding_rate ?? 0) * 100).toFixed(1),
      "Weaning Survival %": Number((r.weaning_survival_rate ?? 0) * 100).toFixed(1),
      "Mortality Risk %":   Number((r.mortality_risk_rate ?? 0) * 100).toFixed(1),
    })) ?? [];

  return (
    <Layout>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Reproductive Indices
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lambing/kidding rate, weaning survival, and mortality risk by district and species.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          {profile?.role === "system_admin" && (
            <div className="space-y-1 min-w-[180px]">
              <Label>District</Label>
              <Select value={districtId} onValueChange={setDistrictId}>
                <SelectTrigger><SelectValue placeholder="All districts" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All districts</SelectItem>
                  {districts?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1 min-w-[160px]">
            <Label>Species</Label>
            <Select value={species} onValueChange={setSpecies}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPECIES_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            title="Total Females"
            value={latest?.total_females ?? null}
            unit=""
            icon={Heart}
            color="bg-pink-100 text-pink-700"
          />
          <StatCard
            title="Lambing/Kidding Rate"
            value={latest?.lambing_kidding_rate != null ? latest.lambing_kidding_rate * 100 : null}
            unit="%"
            icon={Baby}
            color="bg-green-100 text-green-700"
          />
          <StatCard
            title="Weaning Survival"
            value={latest?.weaning_survival_rate != null ? latest.weaning_survival_rate * 100 : null}
            unit="%"
            icon={Activity}
            color="bg-blue-100 text-blue-700"
          />
          <StatCard
            title="Mortality Risk"
            value={latest?.mortality_risk_rate != null ? latest.mortality_risk_rate * 100 : null}
            unit="%"
            icon={TrendingDown}
            color="bg-orange-100 text-orange-700"
          />
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trend Over Periods</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Lambing/Kidding %" fill="#22c55e" />
                  <Bar dataKey="Weaning Survival %" fill="#3b82f6" />
                  <Bar dataKey="Mortality Risk %" fill="#f97316" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Detail table */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : indices?.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No reproductive indices found. Run recalculation from the Genetic Indices dashboard.</CardContent></Card>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Period</th>
                  <th className="pb-2 pr-4">District</th>
                  <th className="pb-2 pr-4">Species</th>
                  <th className="pb-2 pr-4">Females</th>
                  <th className="pb-2 pr-4">Births</th>
                  <th className="pb-2 pr-4">Weaned</th>
                  <th className="pb-2 pr-4">Lam/Kid %</th>
                  <th className="pb-2 pr-4">Wean Surv %</th>
                  <th className="pb-2">Mort Risk %</th>
                </tr>
              </thead>
              <tbody>
                {indices?.map((r: any) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="py-2 pr-4 font-mono text-xs">{r.period_start?.slice(0, 7)} – {r.period_end?.slice(0, 7)}</td>
                    <td className="py-2 pr-4">{r.districts?.name ?? "—"}</td>
                    <td className="py-2 pr-4">{r.species?.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4">{r.total_females}</td>
                    <td className="py-2 pr-4">{r.live_births}</td>
                    <td className="py-2 pr-4">{r.weaned}</td>
                    <td className="py-2 pr-4">{r.lambing_kidding_rate != null ? (r.lambing_kidding_rate * 100).toFixed(1) : "—"}%</td>
                    <td className="py-2 pr-4">{r.weaning_survival_rate != null ? (r.weaning_survival_rate * 100).toFixed(1) : "—"}%</td>
                    <td className="py-2">{r.mortality_risk_rate != null ? (r.mortality_risk_rate * 100).toFixed(1) : "—"}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
