import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useProfile } from "@/hooks/useProfile";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, RefreshCw, Syringe, Stethoscope, Pill } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const EVENT_TYPES = [
  "vaccination", "treatment", "examination", "diagnosis", "quarantine", "other",
] as const;

const EVENT_COLOURS: Record<string, string> = {
  vaccination: "bg-success/15 text-success border-success/30",
  treatment: "bg-warning/15 text-warning border-warning/30",
  examination: "bg-info/15 text-info border-info/30",
  diagnosis: "bg-destructive/15 text-destructive border-destructive/30",
  quarantine: "bg-destructive/15 text-destructive border-destructive/30",
  other: "bg-muted text-muted-foreground border-border",
};

const EVENT_ICONS: Record<string, React.ElementType> = {
  vaccination: Syringe,
  treatment: Pill,
  examination: Stethoscope,
  diagnosis: Stethoscope,
  quarantine: Stethoscope,
  other: Stethoscope,
};

interface HealthRecord {
  id: string;
  livestock_id: string;
  national_id: string | null;
  event_type: string;
  event_date: string;
  diagnosis: string | null;
  treatment: string | null;
  medication: string | null;
  dosage: string | null;
  notes: string | null;
  next_followup_date: string | null;
}

interface VaxRecord {
  id: string;
  livestock_id: string;
  national_id: string | null;
  vaccine_name: string;
  disease_target: string;
  vaccination_date: string;
  batch_number: string | null;
  next_due_date: string | null;
  notes: string | null;
}

interface LivestockOption { id: string; national_id: string; species: string; }

export default function Health() {
  const { profile } = useProfile();
  const { toast } = useToast();

  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [vaxRecords, setVaxRecords] = useState<VaxRecord[]>([]);
  const [livestockOptions, setLivestockOptions] = useState<LivestockOption[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [vaxDialogOpen, setVaxDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    livestock_id: "",
    district_id: "",
    event_type: "examination" as string,
    event_date: new Date().toISOString().split("T")[0],
    diagnosis: "",
    treatment: "",
    medication: "",
    dosage: "",
    next_followup_date: "",
    notes: "",
  });

  const [vaxForm, setVaxForm] = useState({
    livestock_id: "",
    vaccine_name: "",
    disease_target: "",
    vaccination_date: new Date().toISOString().split("T")[0],
    batch_number: "",
    next_due_date: "",
    notes: "",
  });

  const load = async () => {
    setLoading(true);
    const [hrRes, vrRes, lsRes, dRes] = await Promise.all([
      supabase
        .from("health_records")
        .select("id,livestock_id,event_type,event_date,diagnosis,treatment,medication,dosage,notes,next_followup_date,livestock(national_id)")
        .order("event_date", { ascending: false })
        .limit(200),
      supabase
        .from("vaccination_records")
        .select("id,livestock_id,vaccine_name,disease_target,vaccination_date,batch_number,next_due_date,notes,livestock(national_id)")
        .order("vaccination_date", { ascending: false })
        .limit(200),
      supabase
        .from("livestock")
        .select("id,national_id,species")
        .eq("status", "active")
        .order("national_id"),
      supabase.from("districts").select("id,name").order("name"),
    ]);

    if (hrRes.data) {
      setRecords(hrRes.data.map((r: any) => ({
        ...r,
        national_id: r.livestock?.national_id ?? null,
      })));
    }
    if (vrRes.data) {
      setVaxRecords(vrRes.data.map((r: any) => ({
        ...r,
        national_id: r.livestock?.national_id ?? null,
      })));
    }
    if (lsRes.data) setLivestockOptions(lsRes.data);
    if (dRes.data) setDistricts(dRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const saveHealth = async () => {
    if (!form.livestock_id || !form.event_type) {
      toast({ title: "Missing fields", description: "Animal and event type are required.", variant: "destructive" });
      return;
    }
    const animal = livestockOptions.find((l) => l.id === form.livestock_id);
    setSaving(true);
    const { error } = await supabase.from("health_records").insert({
      livestock_id: form.livestock_id,
      district_id: form.district_id || profile?.district_id,
      event_type: form.event_type,
      event_date: form.event_date,
      diagnosis: form.diagnosis || null,
      treatment: form.treatment || null,
      medication: form.medication || null,
      dosage: form.dosage || null,
      next_followup_date: form.next_followup_date || null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Health record saved", description: animal?.national_id });
      setDialogOpen(false);
      setForm({ ...form, livestock_id: "", diagnosis: "", treatment: "", medication: "", dosage: "", next_followup_date: "", notes: "" });
      load();
    }
  };

  const saveVax = async () => {
    if (!vaxForm.livestock_id || !vaxForm.vaccine_name || !vaxForm.disease_target) {
      toast({ title: "Missing fields", description: "Animal, vaccine name and disease target are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("vaccination_records").insert({
      livestock_id: vaxForm.livestock_id,
      vaccine_name: vaxForm.vaccine_name,
      disease_target: vaxForm.disease_target,
      vaccination_date: vaxForm.vaccination_date,
      batch_number: vaxForm.batch_number || null,
      next_due_date: vaxForm.next_due_date || null,
      notes: vaxForm.notes || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vaccination recorded" });
      setVaxDialogOpen(false);
      setVaxForm({ ...vaxForm, livestock_id: "", vaccine_name: "", disease_target: "", batch_number: "", next_due_date: "", notes: "" });
      load();
    }
  };

  const filteredRecords = records.filter((r) => {
    const q = search.toLowerCase();
    return !q ||
      (r.national_id ?? "").toLowerCase().includes(q) ||
      r.event_type.includes(q) ||
      (r.diagnosis ?? "").toLowerCase().includes(q);
  });

  const overdueVax = vaxRecords.filter(
    (v) => v.next_due_date && new Date(v.next_due_date) < new Date()
  ).length;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Health Records</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Veterinary events, treatments and vaccination schedules
              {overdueVax > 0 && (
                <span className="ml-2 text-destructive font-medium">· {overdueVax} overdue vaccinations</span>
              )}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={() => setVaxDialogOpen(true)}>
              <Syringe className="w-4 h-4 mr-1.5" /> Vaccination
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> Health Event
            </Button>
          </div>
        </div>

        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Health Events ({records.length})</TabsTrigger>
            <TabsTrigger value="vaccinations">
              Vaccinations ({vaxRecords.length})
              {overdueVax > 0 && (
                <Badge variant="destructive" className="ml-2 text-xs py-0">{overdueVax}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-4">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-10"
                  placeholder="Search by animal ID, diagnosis…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="card-elevated overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Animal (National ID)</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Treatment</TableHead>
                    <TableHead>Follow-up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : filteredRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No health records found.</TableCell></TableRow>
                  ) : filteredRecords.map((r) => {
                    const Icon = EVENT_ICONS[r.event_type] ?? Stethoscope;
                    return (
                      <TableRow key={r.id} className="hover:bg-muted/30">
                        <TableCell className="font-mono text-xs">{r.national_id ?? r.livestock_id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${EVENT_COLOURS[r.event_type] ?? ""}`}>
                            <Icon className="w-3 h-3" />
                            {r.event_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{new Date(r.event_date).toLocaleDateString("en-LS")}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">{r.diagnosis ?? "—"}</TableCell>
                        <TableCell className="text-sm max-w-[180px] truncate">{r.treatment ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {r.next_followup_date ? (
                            <span className={new Date(r.next_followup_date) < new Date() ? "text-destructive font-medium" : ""}>
                              {new Date(r.next_followup_date).toLocaleDateString("en-LS")}
                            </span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="vaccinations" className="mt-4">
            <div className="card-elevated overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Animal (National ID)</TableHead>
                    <TableHead>Vaccine</TableHead>
                    <TableHead>Disease Target</TableHead>
                    <TableHead>Date Given</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Next Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
                  ) : vaxRecords.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No vaccination records found.</TableCell></TableRow>
                  ) : vaxRecords.map((v) => {
                    const overdue = v.next_due_date && new Date(v.next_due_date) < new Date();
                    return (
                      <TableRow key={v.id} className={`hover:bg-muted/30 ${overdue ? "bg-destructive/5" : ""}`}>
                        <TableCell className="font-mono text-xs">{v.national_id ?? v.livestock_id.slice(0, 8)}</TableCell>
                        <TableCell className="text-sm font-medium">{v.vaccine_name}</TableCell>
                        <TableCell className="text-sm">{v.disease_target}</TableCell>
                        <TableCell className="text-sm">{new Date(v.vaccination_date).toLocaleDateString("en-LS")}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{v.batch_number ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {v.next_due_date ? (
                            <span className={overdue ? "text-destructive font-medium" : ""}>
                              {new Date(v.next_due_date).toLocaleDateString("en-LS")}
                              {overdue && " · OVERDUE"}
                            </span>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>

        {/* Health Event Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Record Health Event</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Animal *</Label>
                <Select value={form.livestock_id} onValueChange={(v) => setForm({ ...form, livestock_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select animal by national ID" /></SelectTrigger>
                  <SelectContent>
                    {livestockOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.national_id} ({l.species})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Event Type *</Label>
                  <Select value={form.event_type} onValueChange={(v) => setForm({ ...form, event_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Event Date *</Label>
                  <Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Diagnosis</Label>
                <Input value={form.diagnosis} onChange={(e) => setForm({ ...form, diagnosis: e.target.value })} placeholder="e.g. Footrot, Pneumonia" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Treatment</Label>
                  <Input value={form.treatment} onChange={(e) => setForm({ ...form, treatment: e.target.value })} placeholder="e.g. Antibiotic course" />
                </div>
                <div>
                  <Label>Medication</Label>
                  <Input value={form.medication} onChange={(e) => setForm({ ...form, medication: e.target.value })} placeholder="e.g. Oxytetracycline" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Dosage</Label>
                  <Input value={form.dosage} onChange={(e) => setForm({ ...form, dosage: e.target.value })} placeholder="e.g. 5ml IM" />
                </div>
                <div>
                  <Label>Follow-up Date</Label>
                  <Input type="date" value={form.next_followup_date} onChange={(e) => setForm({ ...form, next_followup_date: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <Button className="w-full" onClick={saveHealth} disabled={saving}>{saving ? "Saving…" : "Save Health Record"}</Button>
          </DialogContent>
        </Dialog>

        {/* Vaccination Dialog */}
        <Dialog open={vaxDialogOpen} onOpenChange={setVaxDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Record Vaccination</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Animal *</Label>
                <Select value={vaxForm.livestock_id} onValueChange={(v) => setVaxForm({ ...vaxForm, livestock_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select animal" /></SelectTrigger>
                  <SelectContent>
                    {livestockOptions.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.national_id} ({l.species})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Vaccine Name *</Label>
                  <Input value={vaxForm.vaccine_name} onChange={(e) => setVaxForm({ ...vaxForm, vaccine_name: e.target.value })} placeholder="e.g. Gudair" />
                </div>
                <div>
                  <Label>Disease Target *</Label>
                  <Input value={vaxForm.disease_target} onChange={(e) => setVaxForm({ ...vaxForm, disease_target: e.target.value })} placeholder="e.g. OJD" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date Given *</Label>
                  <Input type="date" value={vaxForm.vaccination_date} onChange={(e) => setVaxForm({ ...vaxForm, vaccination_date: e.target.value })} />
                </div>
                <div>
                  <Label>Batch Number</Label>
                  <Input value={vaxForm.batch_number} onChange={(e) => setVaxForm({ ...vaxForm, batch_number: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Next Due Date</Label>
                <Input type="date" value={vaxForm.next_due_date} onChange={(e) => setVaxForm({ ...vaxForm, next_due_date: e.target.value })} />
              </div>
            </div>
            <Button className="w-full" onClick={saveVax} disabled={saving}>{saving ? "Saving…" : "Save Vaccination"}</Button>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
