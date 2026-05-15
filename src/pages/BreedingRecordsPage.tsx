import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Plus, Baby } from "lucide-react";
import { toast } from "sonner";

const OUTCOME_STYLES: Record<string, string> = {
  in_progress:  "bg-blue-100 text-blue-800",
  successful:   "bg-green-100 text-green-800",
  unsuccessful: "bg-red-100 text-red-800",
};

interface BreedingForm {
  sire_id: string;
  dam_id: string;
  mating_date: string;
  expected_birth_date: string;
}

interface BirthForm {
  breeding_record_id: string;
  dam_id: string;
  sire_id: string;
  birth_date: string;
  birth_weight: string;
  alive: boolean;
  offspring_id: string;
}

const BLANK_BREED: BreedingForm = { sire_id: "", dam_id: "", mating_date: new Date().toISOString().slice(0, 10), expected_birth_date: "" };
const BLANK_BIRTH: BirthForm = { breeding_record_id: "", dam_id: "", sire_id: "", birth_date: new Date().toISOString().slice(0, 10), birth_weight: "", alive: true, offspring_id: "" };

export default function BreedingRecordsPage() {
  const { profile } = useProfile();
  const qc = useQueryClient();
  const [breedOpen, setBreedOpen] = useState(false);
  const [birthOpen, setBirthOpen] = useState(false);
  const [breedForm, setBreedForm] = useState<BreedingForm>(BLANK_BREED);
  const [birthForm, setBirthForm] = useState<BirthForm>(BLANK_BIRTH);

  const { data: sires } = useQuery({
    queryKey: ["sires", profile?.district_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("livestock")
        .select("id,national_id,rfid_tag,species,breed")
        .eq("sex", "male")
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!profile,
  });

  const { data: dams } = useQuery({
    queryKey: ["dams", profile?.district_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("livestock")
        .select("id,national_id,rfid_tag,species,breed")
        .eq("sex", "female")
        .eq("status", "active");
      return data ?? [];
    },
    enabled: !!profile,
  });

  const { data: breedingRecords, isLoading: loadingBreeding } = useQuery({
    queryKey: ["breeding-records", profile?.district_id],
    queryFn: async () => {
      let q = supabase
        .from("breeding_records")
        .select("*, sire:livestock!breeding_records_sire_id_fkey(national_id,rfid_tag,species), dam:livestock!breeding_records_dam_id_fkey(national_id,rfid_tag), districts(name)")
        .order("mating_date", { ascending: false });
      if (profile?.district_id && profile.role !== "system_admin") {
        q = q.eq("district_id", profile.district_id);
      }
      const { data } = await q.limit(50);
      return data ?? [];
    },
    enabled: !!profile,
  });

  const { data: birthRecords, isLoading: loadingBirths } = useQuery({
    queryKey: ["birthing-records", profile?.district_id],
    queryFn: async () => {
      let q = supabase
        .from("birthing_records")
        .select("*, dam:livestock!birthing_records_dam_id_fkey(national_id,rfid_tag), offspring:livestock!birthing_records_offspring_id_fkey(national_id)")
        .order("birth_date", { ascending: false });
      if (profile?.district_id && profile.role !== "system_admin") {
        q = q.eq("district_id", profile.district_id);
      }
      const { data } = await q.limit(50);
      return data ?? [];
    },
    enabled: !!profile,
  });

  const createBreedMutation = useMutation({
    mutationFn: async (f: BreedingForm) => {
      const { error } = await supabase.from("breeding_records").insert({
        sire_id: f.sire_id,
        dam_id: f.dam_id,
        mating_date: f.mating_date,
        expected_birth_date: f.expected_birth_date || null,
        district_id: profile?.district_id,
        breeding_center_id: profile?.breeding_center_id,
        outcome: "in_progress",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Mating event recorded");
      qc.invalidateQueries({ queryKey: ["breeding-records"] });
      setBreedOpen(false);
      setBreedForm(BLANK_BREED);
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  const createBirthMutation = useMutation({
    mutationFn: async (f: BirthForm) => {
      const { error } = await supabase.from("birthing_records").insert({
        breeding_record_id: f.breeding_record_id || null,
        dam_id: f.dam_id,
        sire_id: f.sire_id || null,
        birth_date: f.birth_date,
        birth_weight: f.birth_weight ? Number(f.birth_weight) : null,
        alive: f.alive,
        offspring_id: f.offspring_id || null,
        district_id: profile?.district_id,
      });
      if (error) throw error;
      // Update breeding record outcome if linked
      if (f.breeding_record_id) {
        await supabase
          .from("breeding_records")
          .update({ outcome: f.alive ? "successful" : "unsuccessful" })
          .eq("id", f.breeding_record_id);
      }
    },
    onSuccess: () => {
      toast.success("Birth outcome recorded");
      qc.invalidateQueries({ queryKey: ["birthing-records"] });
      qc.invalidateQueries({ queryKey: ["breeding-records"] });
      setBirthOpen(false);
      setBirthForm(BLANK_BIRTH);
    },
    onError: (e) => toast.error(`Failed: ${(e as Error).message}`),
  });

  const animalLabel = (a: any) => a ? (a.rfid_tag || a.national_id || a.id.slice(0, 8)) : "—";

  return (
    <Layout>
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-primary" />
              Breeding Records
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Record mating events and birthing outcomes to build the national pedigree registry.
            </p>
          </div>
          <div className="flex gap-2">
            <Dialog open={breedOpen} onOpenChange={setBreedOpen}>
              <DialogTrigger asChild>
                <Button variant="outline"><Plus className="h-4 w-4 mr-1" /> Mating Event</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Record Mating Event</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label>Sire (male) *</Label>
                    <Select value={breedForm.sire_id} onValueChange={(v) => setBreedForm({ ...breedForm, sire_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select sire" /></SelectTrigger>
                      <SelectContent>
                        {sires?.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {animalLabel(s)} — {s.species?.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Dam (female) *</Label>
                    <Select value={breedForm.dam_id} onValueChange={(v) => setBreedForm({ ...breedForm, dam_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select dam" /></SelectTrigger>
                      <SelectContent>
                        {dams?.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>
                            {animalLabel(d)} — {d.species?.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Mating Date</Label>
                      <Input type="date" value={breedForm.mating_date} onChange={(e) => setBreedForm({ ...breedForm, mating_date: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Expected Birth</Label>
                      <Input type="date" value={breedForm.expected_birth_date} onChange={(e) => setBreedForm({ ...breedForm, expected_birth_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setBreedOpen(false)}>Cancel</Button>
                    <Button onClick={() => createBreedMutation.mutate(breedForm)} disabled={!breedForm.sire_id || !breedForm.dam_id || createBreedMutation.isPending}>
                      {createBreedMutation.isPending ? "Saving…" : "Record"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={birthOpen} onOpenChange={setBirthOpen}>
              <DialogTrigger asChild>
                <Button><Baby className="h-4 w-4 mr-1" /> Birth Outcome</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Record Birth Outcome</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-2">
                  <div className="space-y-1">
                    <Label>Dam (mother) *</Label>
                    <Select value={birthForm.dam_id} onValueChange={(v) => setBirthForm({ ...birthForm, dam_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select dam" /></SelectTrigger>
                      <SelectContent>
                        {dams?.map((d: any) => (
                          <SelectItem key={d.id} value={d.id}>{animalLabel(d)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Birth Date</Label>
                      <Input type="date" value={birthForm.birth_date} onChange={(e) => setBirthForm({ ...birthForm, birth_date: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Birth Weight (kg)</Label>
                      <Input type="number" step="0.1" value={birthForm.birth_weight} onChange={(e) => setBirthForm({ ...birthForm, birth_weight: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Offspring National ID (if registered)</Label>
                    <Input value={birthForm.offspring_id} onChange={(e) => setBirthForm({ ...birthForm, offspring_id: e.target.value })} placeholder="UUID of registered offspring" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="alive" checked={birthForm.alive} onChange={(e) => setBirthForm({ ...birthForm, alive: e.target.checked })} />
                    <Label htmlFor="alive">Born alive</Label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={() => setBirthOpen(false)}>Cancel</Button>
                    <Button onClick={() => createBirthMutation.mutate(birthForm)} disabled={!birthForm.dam_id || createBirthMutation.isPending}>
                      {createBirthMutation.isPending ? "Saving…" : "Record Birth"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="matings">
          <TabsList>
            <TabsTrigger value="matings">Mating Events</TabsTrigger>
            <TabsTrigger value="births">Birthing Outcomes</TabsTrigger>
          </TabsList>

          <TabsContent value="matings" className="mt-4 space-y-3">
            {loadingBreeding ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : breedingRecords?.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No mating records.</CardContent></Card>
            ) : (
              breedingRecords?.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm">
                          Sire: {animalLabel(r.sire)} × Dam: {animalLabel(r.dam)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.sire?.species?.replace(/_/g, " ")} · Mating: {r.mating_date}
                          {r.expected_birth_date && ` · Expected birth: ${r.expected_birth_date}`}
                          {r.districts?.name && ` · ${r.districts.name}`}
                        </p>
                      </div>
                      <Badge className={`text-xs ${OUTCOME_STYLES[r.outcome] ?? ""}`}>
                        {r.outcome?.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="births" className="mt-4 space-y-3">
            {loadingBirths ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : birthRecords?.length === 0 ? (
              <Card><CardContent className="py-10 text-center text-muted-foreground">No birth records.</CardContent></Card>
            ) : (
              birthRecords?.map((r: any) => (
                <Card key={r.id}>
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm">
                          Dam: {animalLabel(r.dam)}
                          {r.offspring && <> → Offspring: {animalLabel(r.offspring)}</>}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Birth date: {r.birth_date}
                          {r.birth_weight && ` · ${r.birth_weight} kg`}
                        </p>
                      </div>
                      <Badge className={r.alive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {r.alive ? "Alive" : "Stillborn"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
