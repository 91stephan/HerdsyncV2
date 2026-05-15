import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import { TrendingUp, TrendingDown, Dna, Layers, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface GeneticIndex {
  id: string;
  year: number;
  species: string;
  avg_herd_size: number;
  annual_mortality_rate: number | null;
  annual_offtake_rate: number | null;
  lambing_kidding_rate: number | null;
  avg_greasy_fleece_weight: number | null;
  avg_micron_diameter: number | null;
  avg_staple_length: number | null;
  avg_clean_yield_pct: number | null;
  districts: { name: string } | null;
}

interface District { id: string; name: string; }

const SPECIES_LABELS: Record<string, string> = {
  merino_sheep: "Merino Sheep",
  angora_goat:  "Angora Goat",
  cattle:       "Cattle",
  other:        "Other",
};

function StatCard({
  label, value, unit, trend, icon: Icon
}: {
  label: string; value: string | number | null; unit?: string;
  trend?: "up" | "down" | null; icon?: React.ElementType;
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">
              {value !== null && value !== undefined ? `${value}${unit ? ` ${unit}` : ""}` : "—"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {Icon && <Icon className="h-5 w-5 text-muted-foreground" />}
            {trend === "up"   && <TrendingUp   className="h-4 w-4 text-green-500" />}
            {trend === "down" && <TrendingDown  className="h-4 w-4 text-red-500" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function BreedingExpertDashboard() {
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [selectedSpecies, setSelectedSpecies]   = useState<string>("merino_sheep");
  const [indices, setIndices]       = useState<GeneticIndex[]>([]);
  const [loading, setLoading]       = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    supabase.from("districts").select("id, name").then(({ data }) => {
      setDistricts(data ?? []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("genetic_indices")
      .select("*, districts(name)")
      .eq("species", selectedSpecies)
      .order("year", { ascending: false })
      .limit(50);

    if (selectedDistrict !== "all") query = query.eq("district_id", selectedDistrict);

    query.then(({ data }) => {
      setIndices((data ?? []) as unknown as GeneticIndex[]);
      setLoading(false);
    });
  }, [selectedDistrict, selectedSpecies]);

  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calculate-genetic-indices`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            year: currentYear,
            species: selectedSpecies,
            district_id: selectedDistrict !== "all" ? selectedDistrict : undefined,
          }),
        }
      );
      const result = await res.json();
      if (res.ok) {
        toast.success(`Recalculated ${result.succeeded} index records`);
        // Refresh data
        setSelectedSpecies((s) => s);
      } else {
        toast.error("Recalculation failed");
      }
    } finally {
      setRecalculating(false);
    }
  };

  // Latest year's data for stat cards
  const latest = indices.filter((i) => i.year === currentYear);
  const avgMortality  = latest.length ? (latest.reduce((s, i) => s + (i.annual_mortality_rate ?? 0), 0) / latest.length).toFixed(2) : null;
  const avgOfftake    = latest.length ? (latest.reduce((s, i) => s + (i.annual_offtake_rate ?? 0), 0) / latest.length).toFixed(2) : null;
  const avgLambing    = latest.length ? (latest.reduce((s, i) => s + (i.lambing_kidding_rate ?? 0), 0) / latest.length).toFixed(3) : null;
  const avgFleece     = latest.length ? (latest.reduce((s, i) => s + (i.avg_greasy_fleece_weight ?? 0), 0) / latest.length).toFixed(2) : null;
  const avgMicron     = latest.length ? (latest.reduce((s, i) => s + (i.avg_micron_diameter ?? 0), 0) / latest.length).toFixed(1) : null;

  // Chart data — one bar per district for the selected year
  const chartData = latest.map((i) => ({
    district:      i.districts?.name ?? "Unknown",
    mortality:     Number((i.annual_mortality_rate ?? 0).toFixed(2)),
    offtake:       Number((i.annual_offtake_rate ?? 0).toFixed(2)),
    lambingRate:   Number((i.lambing_kidding_rate ?? 0).toFixed(3)),
  }));

  return (
    <Layout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Dna className="h-6 w-6 text-primary" />
              National Breeding Expert Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Basotho genetic indices — {SPECIES_LABELS[selectedSpecies]} · {currentYear}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Districts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                {districts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedSpecies} onValueChange={setSelectedSpecies}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="merino_sheep">Merino Sheep</SelectItem>
                <SelectItem value="angora_goat">Angora Goat</SelectItem>
                <SelectItem value="cattle">Cattle</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculating}>
              <RefreshCw className={`h-4 w-4 mr-1 ${recalculating ? "animate-spin" : ""}`} />
              Recalculate
            </Button>
          </div>
        </div>

        {/* Basotho Indices — summary cards */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Basotho Genetic Indices — {currentYear}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <StatCard label="Annual Mortality Rate"    value={avgMortality} unit="%" icon={AlertCircle} />
            <StatCard label="Annual Offtake Rate"      value={avgOfftake}   unit="%" icon={TrendingDown} />
            <StatCard label="Lambing / Kidding Rate"   value={avgLambing}   unit="/ animal-day" icon={Layers} />
            <StatCard label="Avg Greasy Fleece Weight" value={avgFleece}    unit="kg" icon={Dna} />
            <StatCard label="Avg Micron Diameter"      value={avgMicron}    unit="µm" icon={Dna} />
          </div>
        </div>

        {/* District comparison chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">District Comparison — {currentYear}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="district" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="mortality"   name="Mortality %"    fill="#ef4444" radius={[3,3,0,0]} />
                  <Bar dataKey="offtake"     name="Offtake %"      fill="#f97316" radius={[3,3,0,0]} />
                  <Bar dataKey="lambingRate" name="Lambing / day"  fill="#22c55e" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Full index table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Index History</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : indices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No indices calculated yet. Click "Recalculate" to generate.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-xs">
                      <th className="text-left py-2 pr-4">District</th>
                      <th className="text-right pr-4">Year</th>
                      <th className="text-right pr-4">Avg Herd</th>
                      <th className="text-right pr-4">Mortality %</th>
                      <th className="text-right pr-4">Offtake %</th>
                      <th className="text-right pr-4">Lambing Rate</th>
                      <th className="text-right pr-4">Fleece kg</th>
                      <th className="text-right pr-4">Micron µm</th>
                      <th className="text-right">Yield %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indices.map((idx) => (
                      <tr key={idx.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2 pr-4 font-medium">{idx.districts?.name ?? "—"}</td>
                        <td className="text-right pr-4">
                          <Badge variant="outline" className="text-xs">{idx.year}</Badge>
                        </td>
                        <td className="text-right pr-4">{idx.avg_herd_size?.toFixed(0) ?? "—"}</td>
                        <td className="text-right pr-4">{idx.annual_mortality_rate?.toFixed(2) ?? "—"}</td>
                        <td className="text-right pr-4">{idx.annual_offtake_rate?.toFixed(2) ?? "—"}</td>
                        <td className="text-right pr-4">{idx.lambing_kidding_rate?.toFixed(4) ?? "—"}</td>
                        <td className="text-right pr-4">{idx.avg_greasy_fleece_weight?.toFixed(2) ?? "—"}</td>
                        <td className="text-right pr-4">{idx.avg_micron_diameter?.toFixed(1) ?? "—"}</td>
                        <td className="text-right">{idx.avg_clean_yield_pct?.toFixed(1) ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
