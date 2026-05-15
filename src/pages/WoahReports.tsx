import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Download, CheckCircle, Clock, XCircle } from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLES: Record<string, string> = {
  suspected:  "bg-yellow-100 text-yellow-800",
  confirmed:  "bg-red-100 text-red-800",
  resolved:   "bg-green-100 text-green-800",
};

const SPECIES_OPTIONS = [
  { value: "merino_sheep", label: "Merino Sheep" },
  { value: "angora_goat",  label: "Angora Goat" },
  { value: "cattle",       label: "Cattle" },
  { value: "other",        label: "Other" },
];

interface ReportForm {
  disease_name: string;
  woah_disease_code: string;
  species_affected: string;
  date_detected: string;
  animals_at_risk: string;
  cases_confirmed: string;
  deaths: string;
  containment_measures: string;
  lab_confirmation: boolean;
  lab_reference: string;
}

const BLANK_FORM: ReportForm = {
  disease_name: "",
  woah_disease_code: "",
  species_affected: "merino_sheep",
  date_detected: new Date().toISOString().slice(0, 10),
  animals_at_risk: "",
  cases_confirmed: "",
  deaths: "",
  containment_measures: "",
  lab_confirmation: false,
  lab_reference: "",
};

export default function WoahReports() {
  const { profile, isManagerOrAbove } = useProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ReportForm>(BLANK_FORM);
  const [exporting, setExporting] = useState<string | null>(null);

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: async () => {
      const { data } = await supabase.from("districts").select("id,name,code").order("name");
      return data ?? [];
    },
  });

  const { data: reports, isLoading } = useQuery({
    queryKey: ["woah-reports", profile?.district_id],
    queryFn: async () => {
      let q = supabase
        .from("woah_disease_reports")
        .select("*, districts(name)")
        .order("date_detected", { ascending: false });
      if (profile?.role === "district_officer" || profile?.role === "center_manager" || profile?.role === "field_worker") {
        q = q.eq("district_id", profile.district_id!);
      }
      const { data } = await q;
      return data ?? [];
    },
    enabled: !!profile,
  });

  const createMutation = useMutation({
    mutationFn: async (f: ReportForm) => {
      const { error } = await supabase.from("woah_disease_reports").insert({
        district_id: profile?.district_id,
        breeding_center_id: profile?.breeding_center_id,
        disease_name: f.disease_name,
        woah_disease_code: f.woah_disease_code || null,
        species_affected: f.species_affected,
        date_detected: f.date_detected,
        date_reported: new Date().toISOString().slice(0, 10),
        animals_at_risk: Number(f.animals_at_risk) || 0,
        cases_confirmed: Number(f.cases_confirmed) || 0,
        deaths: Number(f.deaths) || 0,
        containment_measures: f.containment_measures,
        lab_confirmation: f.lab_confirmation,
        lab_reference: f.lab_reference || null,
        status: "suspected",
        reported_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Disease report submitted");
      qc.invalidateQueries({ queryKey: ["woah-reports"] });
      setOpen(false);
      setForm(BLANK_FORM);
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  const advanceStatus = async (id: string, current: string) => {
    const next = current === "suspected" ? "confirmed" : "resolved";
    const patch: Record<string, unknown> = { status: next };
    if (next === "resolved") patch.resolved_at = new Date().toISOString();
    const { error } = await supabase.from("woah_disease_reports").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Status updated to ${next}`);
      qc.invalidateQueries({ queryKey: ["woah-reports"] });
    }
  };

  const exportWahis = async (id: string) => {
    setExporting(id);
    try {
      const { data, error } = await supabase.functions.invoke("wahis-export", {
        body: { report_ids: [id] },
      });
      if (error) throw error;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `WAHIS_LSO_${id.slice(0, 8)}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("WAHIS JSON downloaded");
    } catch (e) {
      toast.error(`Export failed: ${(e as Error).message}`);
    }
    setExporting(null);
  };

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-orange-500" />
              WOAH Disease Reports
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Report and track disease outbreaks. Export WAHIS-compliant JSON for Ministry submission.
            </p>
          </div>
          {isManagerOrAbove && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-1" /> New Report</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Report Disease Outbreak</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Disease Name *</Label>
                      <Input value={form.disease_name} onChange={(e) => setForm({ ...form, disease_name: e.target.value })} placeholder="e.g. Brucellosis" />
                    </div>
                    <div className="space-y-1">
                      <Label>WOAH Disease Code</Label>
                      <Input value={form.woah_disease_code} onChange={(e) => setForm({ ...form, woah_disease_code: e.target.value })} placeholder="e.g. BRUCEL" />
                    </div>
                    <div className="space-y-1">
                      <Label>Species Affected</Label>
                      <Select value={form.species_affected} onValueChange={(v) => setForm({ ...form, species_affected: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {SPECIES_OPTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Date Detected</Label>
                      <Input type="date" value={form.date_detected} onChange={(e) => setForm({ ...form, date_detected: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Animals at Risk</Label>
                      <Input type="number" min={0} value={form.animals_at_risk} onChange={(e) => setForm({ ...form, animals_at_risk: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Confirmed Cases</Label>
                      <Input type="number" min={0} value={form.cases_confirmed} onChange={(e) => setForm({ ...form, cases_confirmed: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Deaths</Label>
                      <Input type="number" min={0} value={form.deaths} onChange={(e) => setForm({ ...form, deaths: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Lab Reference</Label>
                      <Input value={form.lab_reference} onChange={(e) => setForm({ ...form, lab_reference: e.target.value })} placeholder="Optional" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Containment Measures</Label>
                    <Textarea value={form.containment_measures} onChange={(e) => setForm({ ...form, containment_measures: e.target.value })} rows={2} />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="lab-conf" checked={form.lab_confirmation} onChange={(e) => setForm({ ...form, lab_confirmation: e.target.checked })} />
                    <Label htmlFor="lab-conf">Lab confirmed</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button onClick={() => createMutation.mutate(form)} disabled={!form.disease_name || createMutation.isPending}>
                      {createMutation.isPending ? "Submitting…" : "Submit Report"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* 24-hour WOAH reminder */}
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-3 pb-3 text-sm text-orange-800">
            <strong>WOAH requirement:</strong> Suspected notifiable disease outbreaks must be reported within 24 hours of detection.
          </CardContent>
        </Card>

        {/* Reports list */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading reports…</p>
        ) : reports?.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No disease reports found.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {reports?.map((r: any) => (
              <Card key={r.id}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{r.disease_name}</h3>
                        {r.woah_disease_code && (
                          <Badge variant="outline" className="text-xs font-mono">{r.woah_disease_code}</Badge>
                        )}
                        <Badge className={`text-xs ${STATUS_STYLES[r.status] ?? ""}`}>
                          {r.status}
                        </Badge>
                        {r.lab_confirmation && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Lab confirmed</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
                        <span>District: {r.districts?.name ?? "—"}</span>
                        <span>Species: {r.species_affected?.replace(/_/g, " ")}</span>
                        <span>Detected: {r.date_detected}</span>
                        <span>At risk: {r.animals_at_risk} | Cases: {r.cases_confirmed} | Deaths: {r.deaths}</span>
                      </div>
                      {r.containment_measures && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-xl">
                          Containment: {r.containment_measures}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isManagerOrAbove && r.status !== "resolved" && (
                        <Button variant="outline" size="sm" onClick={() => advanceStatus(r.id, r.status)}>
                          {r.status === "suspected" ? (
                            <><Clock className="h-3 w-3 mr-1" /> Confirm</>
                          ) : (
                            <><CheckCircle className="h-3 w-3 mr-1" /> Resolve</>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportWahis(r.id)}
                        disabled={exporting === r.id}
                        title="Export WAHIS-compliant JSON"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        {exporting === r.id ? "…" : "WAHIS"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
