import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users, Plus, Search, MapPin, Phone, Hash } from "lucide-react";
import { toast } from "sonner";

interface FarmerForm {
  full_name: string;
  national_id: string;
  village: string;
  district_id: string;
  phone: string;
  gps_coordinates: string;
}

const BLANK: FarmerForm = {
  full_name: "", national_id: "", village: "", district_id: "", phone: "", gps_coordinates: "",
};

export default function FarmersRegistry() {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FarmerForm>(BLANK);
  const [search, setSearch] = useState("");

  const { data: districts } = useQuery({
    queryKey: ["districts"],
    queryFn: async () => {
      const { data } = await supabase.from("districts").select("id,name,code").order("name");
      return data ?? [];
    },
  });

  const { data: farmers, isLoading } = useQuery({
    queryKey: ["farmers", profile?.district_id, search],
    queryFn: async () => {
      let q = supabase
        .from("farmers")
        .select("*, districts(name)")
        .order("full_name");
      if (profile?.role !== "system_admin" && profile?.district_id) {
        q = q.eq("district_id", profile.district_id);
      }
      if (search) {
        q = q.or(`full_name.ilike.%${search}%,national_id.ilike.%${search}%`);
      }
      const { data } = await q.limit(100);
      return data ?? [];
    },
    enabled: !!profile,
  });

  const createMutation = useMutation({
    mutationFn: async (f: FarmerForm) => {
      const { error } = await supabase.from("farmers").insert({
        full_name: f.full_name,
        national_id: f.national_id || null,
        village: f.village,
        district_id: f.district_id || profile?.district_id,
        phone: f.phone || null,
        gps_coordinates: f.gps_coordinates || null,
        registered_by: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Farmer registered");
      qc.invalidateQueries({ queryKey: ["farmers"] });
      setOpen(false);
      setForm(BLANK);
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Farmers Registry
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Registered participating farmers for the Culling &amp; Exchange programme.
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Register Farmer</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Register New Farmer</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                <div className="space-y-1">
                  <Label>Full Name *</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>National ID</Label>
                    <Input value={form.national_id} onChange={(e) => setForm({ ...form, national_id: e.target.value })} placeholder="Lesotho national ID" />
                  </div>
                  <div className="space-y-1">
                    <Label>Phone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+266…" />
                  </div>
                  <div className="space-y-1">
                    <Label>Village</Label>
                    <Input value={form.village} onChange={(e) => setForm({ ...form, village: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label>District</Label>
                    <Select
                      value={form.district_id || profile?.district_id || ""}
                      onValueChange={(v) => setForm({ ...form, district_id: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                      <SelectContent>
                        {districts?.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>GPS Coordinates</Label>
                  <Input
                    value={form.gps_coordinates}
                    onChange={(e) => setForm({ ...form, gps_coordinates: e.target.value })}
                    placeholder="-29.5234, 27.8456"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={() => createMutation.mutate(form)} disabled={!form.full_name || createMutation.isPending}>
                    {createMutation.isPending ? "Saving…" : "Register"}
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
            placeholder="Search by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <p className="text-muted-foreground text-sm">Loading…</p>
        ) : farmers?.length === 0 ? (
          <Card><CardContent className="py-10 text-center text-muted-foreground">No farmers registered yet.</CardContent></Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {farmers?.map((f: any) => (
              <Card key={f.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-4 pb-3">
                  <p className="font-semibold">{f.full_name}</p>
                  <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                    {f.national_id && (
                      <div className="flex items-center gap-1">
                        <Hash className="h-3 w-3" /> {f.national_id}
                      </div>
                    )}
                    {f.village && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {f.village}, {f.districts?.name}
                      </div>
                    )}
                    {f.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {f.phone}
                      </div>
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
