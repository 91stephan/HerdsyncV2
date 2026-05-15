import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { ShieldCheck, Search, RefreshCw, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ACTION_COLOURS: Record<string, string> = {
  INSERT: "bg-success/15 text-success border-success/30",
  UPDATE: "bg-info/15 text-info border-info/30",
  DELETE: "bg-destructive/15 text-destructive border-destructive/30",
  LOGIN: "bg-primary/15 text-primary border-primary/30",
  EXPORT: "bg-accent/15 text-accent border-accent/30",
};

interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  user_email?: string | null;
}

export default function Audit() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [filterTable, setFilterTable] = useState("all");
  const [tableNames, setTableNames] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      toast({ title: "Error loading audit log", description: error.message, variant: "destructive" });
    } else if (data) {
      setEntries(data as AuditEntry[]);
      const tables = [...new Set(data.map((e: AuditEntry) => e.table_name))].sort();
      setTableNames(tables);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = entries.filter((e) => {
    const q = search.toLowerCase();
    const matchQ = !q ||
      e.action.toLowerCase().includes(q) ||
      e.table_name.toLowerCase().includes(q) ||
      (e.record_id ?? "").toLowerCase().includes(q) ||
      (e.user_id ?? "").toLowerCase().includes(q);
    const matchA = filterAction === "all" || e.action === filterAction;
    const matchT = filterTable === "all" || e.table_name === filterTable;
    return matchQ && matchA && matchT;
  });

  const exportCSV = () => {
    const header = "ID,Action,Table,Record ID,User ID,IP Address,Timestamp\n";
    const rows = filtered.map((e) =>
      [e.id, e.action, e.table_name, e.record_id ?? "",
       e.user_id ?? "", e.ip_address ?? "",
       new Date(e.created_at).toISOString()].join(",")
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "audit-log.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              Audit Log
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {loading ? "Loading…" : `${filtered.length.toLocaleString()} entries`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder="Search by action, table, record ID, user…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-full sm:w-36">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {["INSERT", "UPDATE", "DELETE", "LOGIN", "EXPORT"].map((a) => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTable} onValueChange={setFilterTable}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tables</SelectItem>
              {tableNames.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="card-elevated overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Record ID</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>IP Address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading…</TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No audit entries yet. Actions on sensitive tables are recorded automatically.
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      No entries match the current filters.
                    </TableCell>
                  </TableRow>
                ) : filtered.map((e) => (
                  <TableRow key={e.id} className="hover:bg-muted/30">
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("en-LS")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-xs ${ACTION_COLOURS[e.action] ?? ""}`}>
                        {e.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{e.table_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{e.record_id?.slice(0, 8) ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{e.user_id?.slice(0, 8) ?? "system"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.ip_address ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
