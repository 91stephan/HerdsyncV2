import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ArrowRightLeft, Plus, CheckCircle, Clock, Truck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface CullingRecord {
  id: string;
  status: string;
  culled_animal_species: string;
  culled_animal_breed: string | null;
  culled_animal_tag: string | null;
  culling_reason: string | null;
  replacement_type: string | null;
  scheduled_date: string | null;
  collection_date: string | null;
  replacement_date: string | null;
  notes: string | null;
  farmers: { full_name: string } | null;
  districts: { name: string } | null;
  breeding_centers: { name: string } | null;
}

interface Farmer   { id: string; full_name: string; }
interface District { id: string; name: string; }
interface Center   { id: string; name: string; district_id: string; }

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  scheduled:  { label: "Scheduled",  color: "bg-blue-100 text-blue-700",   icon: Clock },
  collected:  { label: "Collected",  color: "bg-yellow-100 text-yellow-700", icon: Truck },
  replaced:   { label: "Replaced",   color: "bg-purple-100 text-purple-700", icon: ArrowRightLeft },
  completed:  { label: "Completed",  color: "bg-green-100 text-green-700",  icon: CheckCircle },
  cancelled:  { label: "Cancelled",  color: "bg-gray-100 text-gray-500",    icon: XCircle },
};

const SPECIES_LABELS: Record<string, string> = {
  merino_sheep: "Merino Sheep",
  angora_goat:  "Angora Goat",
  cattle:       "Cattle",
  other:        "Other",
};

export default function CullingExchange() {
  const { user } = useAuth();
  const [records, setRecords]   = useState<CullingRecord[]>([]);
  const [farmers, setFarmers]   = useState<Farmer[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [centers, setCenters]   = useState<Center[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<CullingRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    farmer_id: "",
    district_id: "",
    breeding_center_id: "",
    culled_animal_species: "merino_sheep",
    culled_animal_breed: "",
    culled_animal_tag: "",
    culling_reason: "",
    replacement_type: "merino_ram",
    scheduled_date: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      supabase.from("farmers").select("id, full_name").order("full_name"),
      supabase.from("districts").select("id, name").order("name"),
      supabase.from("breeding_centers").select("id, name, district_id").eq("active", true),
    ]).then(([f, d, c]) => {
      setFarmers(f.data ?? []);
      setDistricts(d.data ?? []);
      setCenters(c.data ?? []);
    });
  }, []);

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase
      .from("culling_exchange_records")
      .select("*, farmers(full_name), districts(name), breeding_centers(name)")
      .order("created_at", { ascending: false });

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data } = await query;
    setRecords((data ?? []) as unknown as CullingRecord[]);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [statusFilter]);

  const handleSubmit = async () => {
    if (!form.farmer_id || !form.district_id || !form.breeding_center_id) {
      toast.error("Farmer, district and breeding center are required");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("culling_exchange_records").insert({
      farmer_id:             form.farmer_id,
      district_id:           form.district_id,
      breeding_center_id:    form.breeding_center_id,
      culled_animal_species: form.culled_animal_species,
      culled_animal_breed:   form.culled_animal_breed || null,
      culled_animal_tag:     form.culled_animal_tag || null,
      culling_reason:        form.culling_reason || null,
      replacement_type:      form.replacement_type,
      scheduled_date:        form.scheduled_date || null,
      notes:                 form.notes || null,
      field_officer_id:      user?.id,
      status:                "scheduled",
    });
    setSubmitting(false);
    if (error) { toast.error("Failed to create record"); return; }
    toast.success("Culling exchange record created");
    setShowNewDialog(false);
    fetchRecords();
  };

  const advanceStatus = async (record: CullingRecord) => {
    const flow: Record<string, string> = {
      scheduled: "collected",
      collected: "replaced",
      replaced:  "completed",
    };
    const next = flow[record.status];
    if (!next) return;

    const update: Record<string, unknown> = { status: next };
    if (next === "collected")  update.collection_date  = new Date().toISOString().split("T")[0];
    if (next === "replaced")   update.replacement_date = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("culling_exchange_records").update(update).eq("id", record.id);
    if (error) { toast.error("Update failed"); return; }
    toast.success(`Marked as ${next}`);
    fetchRecords();
  };

  const filteredCenters = centers.filter(
    (c) => !form.district_id || c.district_id === form.district_id
  );

  return (
    <Layout>
      <div className="space-y-5 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ArrowRightLeft className="h-6 w-6 text-primary" />
              Culling & Exchange Program
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Register low-yielding animal collections and distribute high-yielding replacements
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4 mr-1" /> New Exchange
            </Button>
          </div>
        </div>

        {/* Records list */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : records.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No culling exchange records found.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {records.map((r) => {
              const cfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.scheduled;
              const StatusIcon = cfg.icon;
              const canAdvance = ["scheduled","collected","replaced"].includes(r.status);
              return (
                <Card key={r.id} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">
                            {r.farmers?.full_name ?? "Unknown Farmer"}
                          </span>
                          <Badge className={`text-xs ${cfg.color} border-0`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {cfg.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                          <span>{r.districts?.name}</span>
                          <span>·</span>
                          <span>{r.breeding_centers?.name}</span>
                        </div>
                        <div className="text-sm flex gap-4 flex-wrap mt-1">
                          <span>
                            <span className="text-muted-foreground">Culled: </span>
                            {SPECIES_LABELS[r.culled_animal_species]}
                            {r.culled_animal_breed ? ` · ${r.culled_animal_breed}` : ""}
                            {r.culled_animal_tag   ? ` · Tag: ${r.culled_animal_tag}` : ""}
                          </span>
                          {r.replacement_type && (
                            <span>
                              <span className="text-muted-foreground">Replacement: </span>
                              {r.replacement_type.replace(/_/g, " ")}
                            </span>
                          )}
                        </div>
                        {r.culling_reason && (
                          <p className="text-xs text-muted-foreground italic">
                            Reason: {r.culling_reason}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
                          {r.scheduled_date  && <span>Scheduled: {format(new Date(r.scheduled_date), "dd MMM yyyy")}</span>}
                          {r.collection_date && <span>Collected: {format(new Date(r.collection_date), "dd MMM yyyy")}</span>}
                          {r.replacement_date && <span>Replaced: {format(new Date(r.replacement_date), "dd MMM yyyy")}</span>}
                        </div>
                      </div>
                      {canAdvance && (
                        <Button size="sm" variant="outline" onClick={() => advanceStatus(r)}>
                          Mark as {STATUS_CONFIG[
                            { scheduled: "collected", collected: "replaced", replaced: "completed" }[r.status]!
                          ]?.label}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* New exchange dialog */}
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Register Culling & Exchange</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1">
                  <Label>Farmer</Label>
                  <Select value={form.farmer_id} onValueChange={(v) => setForm({ ...form, farmer_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select farmer" /></SelectTrigger>
                    <SelectContent>
                      {farmers.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>District</Label>
                  <Select value={form.district_id} onValueChange={(v) => setForm({ ...form, district_id: v, breeding_center_id: "" })}>
                    <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Breeding Center</Label>
                  <Select value={form.breeding_center_id} onValueChange={(v) => setForm({ ...form, breeding_center_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select center" /></SelectTrigger>
                    <SelectContent>
                      {filteredCenters.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Culled Species</Label>
                  <Select value={form.culled_animal_species} onValueChange={(v) => setForm({ ...form, culled_animal_species: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merino_sheep">Merino Sheep</SelectItem>
                      <SelectItem value="angora_goat">Angora Goat</SelectItem>
                      <SelectItem value="cattle">Cattle</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Animal Breed</Label>
                  <Input placeholder="e.g. Merino" value={form.culled_animal_breed} onChange={(e) => setForm({ ...form, culled_animal_breed: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Animal Tag / ID</Label>
                  <Input placeholder="Tag or field ID" value={form.culled_animal_tag} onChange={(e) => setForm({ ...form, culled_animal_tag: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Replacement Type</Label>
                  <Select value={form.replacement_type} onValueChange={(v) => setForm({ ...form, replacement_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merino_ram">Merino Ram</SelectItem>
                      <SelectItem value="angora_buck">Angora Buck</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Scheduled Date</Label>
                  <Input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Culling Reason</Label>
                <Input placeholder="e.g. Low fiber yield, poor conformation" value={form.culling_reason} onChange={(e) => setForm({ ...form, culling_reason: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Saving…" : "Create Record"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
