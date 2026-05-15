import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { UserCog, Plus, UserX, UserCheck, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

const ROLE_OPTIONS = [
  { value: "field_worker",     label: "Field Worker" },
  { value: "veterinarian",     label: "Veterinarian" },
  { value: "district_officer", label: "District Officer" },
  { value: "center_manager",   label: "Center Manager" },
  { value: "system_admin",     label: "System Admin" },
];

const ROLE_COLORS: Record<string, string> = {
  system_admin:     "bg-red-100 text-red-700",
  center_manager:   "bg-purple-100 text-purple-700",
  district_officer: "bg-blue-100 text-blue-700",
  veterinarian:     "bg-green-100 text-green-700",
  field_worker:     "bg-orange-100 text-orange-700",
};

interface InviteForm {
  email: string;
  full_name: string;
  role: string;
  district_id: string;
  breeding_center_id: string;
  employee_number: string;
}

const BLANK: InviteForm = {
  email: "", full_name: "", role: "field_worker",
  district_id: "", breeding_center_id: "", employee_number: "",
};

export default function UserManagement() {
  const { profile, isAdmin } = useProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<InviteForm>(BLANK);
  const [search, setSearch] = useState("");

  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="text-lg font-semibold">Access Restricted</p>
          <p className="text-sm text-muted-foreground mt-1">User management requires System Admin role.</p>
        </div>
      </Layout>
    );
  }

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: async () => {
      const { data } = await supabase.from("districts").select("id,name").order("name");
      return data ?? [];
    },
  });

  const { data: centers } = useQuery({
    queryKey: ["centers"],
    queryFn: async () => {
      const { data } = await supabase.from("breeding_centers").select("id,name,district_id").order("name");
      return data ?? [];
    },
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["profiles", search],
    queryFn: async () => {
      let q = supabase
        .from("profiles")
        .select("*, districts(name), breeding_centers(name)")
        .order("full_name");
      if (search) q = q.ilike("full_name", `%${search}%`);
      const { data } = await q.limit(100);
      return data ?? [];
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (f: InviteForm) => {
      const { error } = await supabase.auth.admin.inviteUserByEmail(f.email, {
        data: {
          full_name: f.full_name,
          role: f.role,
          district_id: f.district_id || null,
          breeding_center_id: f.breeding_center_id || null,
          employee_number: f.employee_number || null,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Invitation sent");
      qc.invalidateQueries({ queryKey: ["profiles"] });
      setOpen(false);
      setForm(BLANK);
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase.from("profiles").update({ active: !current }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(current ? "User deactivated" : "User reactivated");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    }
  };

  const filteredCenters = form.district_id
    ? centers?.filter((c: any) => c.district_id === form.district_id)
    : centers;

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <UserCog className="h-6 w-6 text-primary" />
              User Management
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Invite staff, assign roles and districts, deactivate accounts.
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Invite Staff</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader><DialogTitle>Invite New Staff Member</DialogTitle></DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1 col-span-2">
                    <Label>Work Email *</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="space-y-1 col-span-2">
                    <Label>Full Name *</Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>Role *</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {ROLE_OPTIONS.map((r) => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Employee Number</Label>
                    <Input value={form.employee_number} onChange={(e) => setForm({ ...form, employee_number: e.target.value })} placeholder="EMP-001" />
                  </div>
                  <div className="space-y-1">
                    <Label>District</Label>
                    <Select value={form.district_id} onValueChange={(v) => setForm({ ...form, district_id: v, breeding_center_id: "" })}>
                      <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                      <SelectContent>
                        {districts?.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Breeding Center</Label>
                    <Select value={form.breeding_center_id} onValueChange={(v) => setForm({ ...form, breeding_center_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                      <SelectContent>
                        {filteredCenters?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button
                    onClick={() => inviteMutation.mutate(form)}
                    disabled={!form.email || !form.full_name || inviteMutation.isPending}
                  >
                    {inviteMutation.isPending ? "Sending…" : "Send Invitation"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* User list */}
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-2">
            {users?.map((u: any) => (
              <Card key={u.id} className={!u.active ? "opacity-60" : ""}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{u.full_name || "(no name)"}</span>
                        <Badge className={`text-xs ${ROLE_COLORS[u.role] ?? "bg-gray-100 text-gray-700"}`}>
                          {u.role?.replace(/_/g, " ")}
                        </Badge>
                        {!u.active && <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {u.employee_number && <span className="mr-3">{u.employee_number}</span>}
                        {u.districts?.name && <span className="mr-3">{u.districts.name}</span>}
                        {u.breeding_centers?.name && <span>{u.breeding_centers.name}</span>}
                      </p>
                    </div>
                    {u.id !== profile?.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleActive(u.id, u.active)}
                        className={u.active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
                      >
                        {u.active
                          ? <><UserX className="h-3.5 w-3.5 mr-1" /> Deactivate</>
                          : <><UserCheck className="h-3.5 w-3.5 mr-1" /> Reactivate</>
                        }
                      </Button>
                    )}
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
