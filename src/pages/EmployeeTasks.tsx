import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
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
import { Plus, RefreshCw, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PRIORITY_COLOURS: Record<string, string> = {
  low: "bg-muted text-muted-foreground border-border",
  medium: "bg-info/15 text-info border-info/30",
  high: "bg-warning/15 text-warning border-warning/30",
  urgent: "bg-destructive/15 text-destructive border-destructive/30",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  cancelled: Clock,
};

const STATUS_COLOUR: Record<string, string> = {
  pending: "bg-muted text-muted-foreground border-border",
  in_progress: "bg-info/15 text-info border-info/30",
  completed: "bg-success/15 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  district_id: string | null;
  district_name?: string | null;
  assigned_to: string | null;
  notes: string | null;
  created_at: string;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "field_inspection",
  priority: "medium",
  due_date: "",
  district_id: "",
  notes: "",
};

export default function EmployeeTasks() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const [taskRes, distRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id,title,description,category,priority,status,due_date,district_id,assigned_to,notes,created_at,districts(name)")
        .order("due_date", { ascending: true }),
      supabase.from("districts").select("id,name").order("name"),
    ]);

    if (taskRes.data) {
      setTasks(taskRes.data.map((t: any) => ({
        ...t,
        district_name: t.districts?.name ?? null,
      })));
    }
    if (distRes.data) setDistricts(distRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) {
      toast({ title: "Title required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("tasks").insert({
      title: form.title,
      description: form.description || null,
      category: form.category || null,
      priority: form.priority,
      status: "pending",
      due_date: form.due_date || null,
      district_id: form.district_id || profile?.district_id || null,
      assigned_to: user?.id ?? null,
      notes: form.notes || null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Task created" });
      setDialogOpen(false);
      setForm({ ...EMPTY_FORM });
      load();
    }
  };

  const advance = async (task: Task) => {
    const next: Record<string, string> = {
      pending: "in_progress",
      in_progress: "completed",
    };
    const newStatus = next[task.status];
    if (!newStatus) return;
    const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", task.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else load();
  };

  const filtered = tasks.filter((t) => filterStatus === "all" || t.status === filterStatus);

  const counts = {
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Field assignments and follow-up actions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" /> New Task
            </Button>
          </div>
        </div>

        {/* Status summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "pending",     label: "Pending",     colour: "border-warning/40 bg-warning/5" },
            { key: "in_progress", label: "In Progress", colour: "border-info/40 bg-info/5" },
            { key: "completed",   label: "Completed",   colour: "border-success/40 bg-success/5" },
          ].map(({ key, label, colour }) => (
            <div
              key={key}
              className={`card-elevated p-4 border cursor-pointer ${colour} ${filterStatus === key ? "ring-2 ring-primary" : ""}`}
              onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
            >
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{counts[key as keyof typeof counts]}</p>
            </div>
          ))}
        </div>

        {/* Task table */}
        <div className="card-elevated overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>District</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12 text-muted-foreground">Loading…</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    No tasks yet. Create one to assign field work.
                  </TableCell>
                </TableRow>
              ) : filtered.map((t) => {
                const Icon = STATUS_ICON[t.status] ?? Clock;
                const isOverdue = t.due_date && new Date(t.due_date) < new Date() && t.status !== "completed";
                return (
                  <TableRow key={t.id} className={`hover:bg-muted/30 ${isOverdue ? "bg-destructive/5" : ""}`}>
                    <TableCell className="font-medium max-w-[200px]">
                      <p className="truncate">{t.title}</p>
                      {t.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{(t.category ?? "general").replace(/_/g, " ")}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs capitalize ${PRIORITY_COLOURS[t.priority] ?? ""}`}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit capitalize ${STATUS_COLOUR[t.status] ?? ""}`}>
                        <Icon className="w-3 h-3" />
                        {t.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-sm ${isOverdue ? "text-destructive font-medium" : ""}`}>
                      {t.due_date ? new Date(t.due_date).toLocaleDateString("en-LS") : "—"}
                      {isOverdue && " · Overdue"}
                    </TableCell>
                    <TableCell className="text-sm">{t.district_name ?? "—"}</TableCell>
                    <TableCell>
                      {t.status !== "completed" && t.status !== "cancelled" && (
                        <Button variant="outline" size="sm" className="text-xs" onClick={() => advance(t)}>
                          {t.status === "pending" ? "Start" : "Complete"}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Create dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Dip inspection — Quthing" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["field_inspection","vaccination_campaign","data_collection","culling_visit","disease_response","training","other"].map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["low","medium","high","urgent"].map((p) => (
                        <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Due Date</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
                </div>
                <div>
                  <Label>District</Label>
                  <Select value={form.district_id || profile?.district_id || ""} onValueChange={(v) => setForm({ ...form, district_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {districts.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>
            </div>
            <Button className="w-full" onClick={save} disabled={saving}>{saving ? "Saving…" : "Create Task"}</Button>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
