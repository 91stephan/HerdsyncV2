import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useProfile } from "@/hooks/useProfile";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Download, RefreshCw, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SPECIES = [
  "cattle", "merino_sheep", "angora_goat", "horse", "donkey", "pig", "chicken", "other",
] as const;

const SPECIES_LABELS: Record<string, string> = {
  cattle: "Cattle",
  merino_sheep: "Merino Sheep",
  angora_goat: "Angora Goat",
  horse: "Horse",
  donkey: "Donkey",
  pig: "Pig",
  chicken: "Chicken",
  other: "Other",
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-success/15 text-success border-success/30",
  deceased: "bg-muted text-muted-foreground border-border",
  culled: "bg-warning/15 text-warning border-warning/30",
  sold: "bg-info/15 text-info border-info/30",
};

interface Animal {
  id: string;
  national_id: string;
  rfid_tag: string | null;
  species: string;
  breed: string | null;
  sex: string;
  date_of_birth: string | null;
  weight: number | null;
  status: string;
  inbreeding_coefficient: number | null;
  district_name: string | null;
  center_name: string | null;
}

interface District { id: string; name: string; }
interface Center  { id: string; name: string; }

const EMPTY_FORM = {
  national_id: "",
  rfid_tag: "",
  species: "merino_sheep" as string,
  breed: "",
  sex: "female" as string,
  date_of_birth: "",
  weight: "",
  district_id: "",
  breeding_center_id: "",
  notes: "",
};

export default function Livestock() {
  const { profile } = useProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  const [animals, setAnimals] = useState<Animal[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSpecies, setFilterSpecies] = useState("all");
  const [filterStatus, setFilterStatus] = useState("active");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [animalRes, distRes, cenRes] = await Promise.all([
      supabase
        .from("livestock_summary")
        .select("id,national_id,rfid_tag,species,breed,sex,date_of_birth,weight,status,inbreeding_coefficient,district_name,center_name")
        .order("national_id"),
      supabase.from("districts").select("id,name").order("name"),
      supabase.from("breeding_centers").select("id,name").eq("is_active", true).order("name"),
    ]);

    if (animalRes.data) setAnimals(animalRes.data as Animal[]);
    if (distRes.data) setDistricts(distRes.data);
    if (cenRes.data) setCenters(cenRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = animals.filter((a) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      a.national_id.toLowerCase().includes(q) ||
      (a.rfid_tag ?? "").toLowerCase().includes(q) ||
      (a.breed ?? "").toLowerCase().includes(q) ||
      (a.district_name ?? "").toLowerCase().includes(q);
    const matchSp = filterSpecies === "all" || a.species === filterSpecies;
    const matchSt = filterStatus === "all" || a.status === filterStatus;
    return matchQ && matchSp && matchSt;
  });

  const exportCSV = () => {
    const header = "National ID,RFID Tag,Species,Breed,Sex,Date of Birth,Weight (kg),Status,District,Center\n";
    const rows = filtered.map((a) =>
      [a.national_id, a.rfid_tag ?? "", SPECIES_LABELS[a.species] ?? a.species,
       a.breed ?? "", a.sex, a.date_of_birth ?? "", a.weight ?? "",
       a.status, a.district_name ?? "", a.center_name ?? ""].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "livestock-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const save = async () => {
    if (!form.national_id || !form.species || !form.sex) {
      toast({ title: "Missing fields", description: "National ID, species and sex are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("livestock").insert({
      national_id: form.national_id,
      rfid_tag: form.rfid_tag || null,
      species: form.species,
      breed: form.breed || null,
      sex: form.sex,
      date_of_birth: form.date_of_birth || null,
      weight: form.weight ? Number(form.weight) : null,
      district_id: form.district_id || profile?.district_id || null,
      breeding_center_id: form.breeding_center_id || null,
      status: "active",
      notes: form.notes || null,
      acquisition_date: new Date().toISOString().split("T")[0],
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Animal registered", description: form.national_id });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      load();
    }
  };

  const ageDays = (dob: string | null) => {
    if (!dob) return null;
    const days = Math.floor((Date.now() - new Date(dob).getTime()) / 86_400_000);
    if (days < 365) return `${days}d`;
    return `${Math.floor(days / 365)}y ${Math.floor((days % 365) / 30)}m`;
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Livestock Registry</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? "Loading…" : `${filtered.length.toLocaleString()} animals`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Register Animal
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by national ID, RFID, breed, district…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterSpecies} onValueChange={setFilterSpecies}>
            <SelectTrigger className="w-full sm:w-44">
              <SelectValue placeholder="All species" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All species</SelectItem>
              {SPECIES.map((s) => (
                <SelectItem key={s} value={s}>{SPECIES_LABELS[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="deceased">Deceased</SelectItem>
              <SelectItem value="culled">Culled</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>National ID</TableHead>
                  <TableHead>RFID Tag</TableHead>
                  <TableHead>Species</TableHead>
                  <TableHead>Breed</TableHead>
                  <TableHead>Sex</TableHead>
                  <TableHead>Age</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>District</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-8" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      No animals match the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((a) => (
                    <TableRow key={a.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-medium">{a.national_id}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.rfid_tag ?? "—"}</TableCell>
                      <TableCell className="text-sm">{SPECIES_LABELS[a.species] ?? a.species}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.breed ?? "—"}</TableCell>
                      <TableCell className="text-sm capitalize">{a.sex}</TableCell>
                      <TableCell className="text-sm">{ageDays(a.date_of_birth) ?? "—"}</TableCell>
                      <TableCell className="text-sm">{a.weight != null ? `${a.weight} kg` : "—"}</TableCell>
                      <TableCell className="text-sm">{a.district_name ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs capitalize ${STATUS_BADGE[a.status] ?? ""}`}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Register dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register New Animal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>National ID *</Label>
                  <Input
                    value={form.national_id}
                    onChange={(e) => setForm({ ...form, national_id: e.target.value })}
                    placeholder="426xxxxxxxxx"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>RFID Tag</Label>
                  <Input
                    value={form.rfid_tag}
                    onChange={(e) => setForm({ ...form, rfid_tag: e.target.value })}
                    placeholder="QUT-RAM-001"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Species *</Label>
                  <Select value={form.species} onValueChange={(v) => setForm({ ...form, species: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SPECIES.map((s) => (
                        <SelectItem key={s} value={s}>{SPECIES_LABELS[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Sex *</Label>
                  <Select value={form.sex} onValueChange={(v) => setForm({ ...form, sex: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="male">Male</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Breed</Label>
                  <Input
                    value={form.breed}
                    onChange={(e) => setForm({ ...form, breed: e.target.value })}
                    placeholder="e.g. SA Merino"
                  />
                </div>
                <div>
                  <Label>Weight (kg)</Label>
                  <Input
                    type="number"
                    value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: e.target.value })}
                    placeholder="58.0"
                  />
                </div>
              </div>
              <div>
                <Label>Date of Birth</Label>
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
                />
              </div>
              <div>
                <Label>District</Label>
                <Select
                  value={form.district_id || profile?.district_id || ""}
                  onValueChange={(v) => setForm({ ...form, district_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    {districts.map((d) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Breeding Center</Label>
                <Select
                  value={form.breeding_center_id}
                  onValueChange={(v) => setForm({ ...form, breeding_center_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Select center (optional)" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {centers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  placeholder="Optional notes…"
                />
              </div>
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Register Animal"}
            </Button>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
