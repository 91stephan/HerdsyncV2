import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, User, Lock, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ROLE_LABELS: Record<string, string> = {
  system_admin: "System Administrator",
  district_officer: "District Officer",
  center_manager: "Centre Manager",
  veterinarian: "Veterinarian",
  field_officer: "Field Officer",
  readonly: "Read Only",
};

export default function Settings() {
  const { user } = useAuth();
  const { profile, role } = useProfile();
  const { toast } = useToast();

  const [displayName, setDisplayName] = useState(profile?.full_name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  const saveProfile = async () => {
    if (!displayName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: displayName.trim() })
      .eq("id", user?.id);
    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password too short", description: "Minimum 8 characters.", variant: "destructive" });
      return;
    }
    setChangingPw(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPw(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password changed" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-primary" />
            Settings
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your profile and account preferences</p>
        </div>

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile" className="flex items-center gap-1.5">
              <User className="w-4 h-4" /> Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-1.5">
              <Lock className="w-4 h-4" /> Security
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-1.5">
              <Info className="w-4 h-4" /> System
            </TabsTrigger>
          </TabsList>

          {/* Profile tab */}
          <TabsContent value="profile" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your display name and view account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Email</Label>
                  <Input value={user?.email ?? ""} disabled className="bg-muted" />
                  <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here. Contact your System Administrator.</p>
                </div>
                <div>
                  <Label>Display Name</Label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your full name"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                      {ROLE_LABELS[role ?? ""] ?? role ?? "—"}
                    </Badge>
                    <span className="text-xs text-muted-foreground">Assigned by System Administrator</span>
                  </div>
                </div>
                <Button onClick={saveProfile} disabled={saving}>
                  {saving ? "Saving…" : "Save Changes"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security tab */}
          <TabsContent value="security" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Choose a strong password of at least 8 characters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>New Password</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
                <div>
                  <Label>Confirm New Password</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                </div>
                <Button onClick={changePassword} disabled={changingPw}>
                  {changingPw ? "Updating…" : "Update Password"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System info tab */}
          <TabsContent value="system" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>HerdSync V2 — Lesotho National Breeding System</CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  {[
                    ["System", "HerdSync V2"],
                    ["Ministry", "Ministry of Agriculture, Food Security and Nutrition"],
                    ["Tender Reference", "LSO-2000003942-0137-CS-QCBS"],
                    ["Standard", "ISO 11784/11785 RFID · WAHIS/WOAH Reporting"],
                    ["Country Code", "LSO (426 — Lesotho)"],
                    ["Version", "2.0.0"],
                    ["Environment", import.meta.env.DEV ? "Development" : "Production"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex gap-4">
                      <dt className="text-muted-foreground w-40 shrink-0">{label}</dt>
                      <dd className="font-medium text-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
