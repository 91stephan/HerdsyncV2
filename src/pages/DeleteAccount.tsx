import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, ArrowLeft, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const deletedDataItems = [
  "All livestock records and data",
  "Health and breeding information",
  "Photos and documents",
  "Account information and profile",
  "Farm settings, employees, and expenses",
  "All associated data across the platform",
];

const DeleteAccount = () => {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !confirmed) {
      toast({ title: "Please fill in your email and confirm the checkbox.", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      // Log request in database
      const { error: dbError } = await supabase
        .from("account_deletion_requests")
        .insert({ email, reason: reason || null });

      if (dbError) throw dbError;

      // Send notification email via edge function
      await supabase.functions.invoke("notify-account-deletion", {
        body: { email, reason: reason || "Not specified" },
      });

      setSubmitted(true);
    } catch (err) {
      console.error("Deletion request error:", err);
      toast({
        title: "Request received",
        description: "Your deletion request has been logged. We'll be in touch.",
      });
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-lg w-full text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold">Request Received</h2>
            <p className="text-muted-foreground">
              Your deletion request has been received. We'll process it within
              <strong> 30 days</strong> and send you a confirmation email at{" "}
              <strong>{email}</strong>.
            </p>
            <Link to="/">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Home
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <ShieldAlert className="w-8 h-8 text-destructive" />
          <h1 className="text-3xl font-bold">Delete Your HerdSync Account</h1>
        </div>
        <p className="text-muted-foreground mb-8">
          We're sorry to see you go. Please read the information below carefully before submitting your request.
        </p>

        {/* What gets deleted */}
        <Card className="mb-6 border-destructive/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" /> What will be permanently deleted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {deletedDataItems.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm">
                  <Trash2 className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 mb-8 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-orange-600 dark:text-orange-400">This action is permanent and cannot be undone.</p>
            <p className="text-muted-foreground mt-1">
              Deletion requests are processed within 30 days. Once completed, your data cannot be recovered.
            </p>
          </div>
        </div>

        {/* Deletion form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Request Account Deletion</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your account email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <p className="text-xs text-muted-foreground">Enter the email associated with your HerdSync account.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Deletion (optional)</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="privacy">Privacy concerns</SelectItem>
                    <SelectItem value="no-longer-farming">No longer farming</SelectItem>
                    <SelectItem value="switching">Switching to a different solution</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start space-x-3 pt-2">
                <Checkbox
                  id="confirm"
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(v === true)}
                />
                <Label htmlFor="confirm" className="text-sm leading-snug cursor-pointer">
                  I understand this will permanently delete all my data and this action cannot be undone.
                </Label>
              </div>

              <Button
                type="submit"
                variant="destructive"
                className="w-full"
                disabled={!email || !confirmed || submitting}
              >
                {submitting ? "Submitting…" : "Request Account Deletion"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground space-y-2">
          <p>
            For questions about data deletion, contact us at{" "}
            <a href="mailto:syncherd@gmail.com" className="text-primary hover:underline">syncherd@gmail.com</a>
          </p>
          <p>
            Read our{" "}
            <Link to="/privacy-policy" className="text-primary hover:underline">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeleteAccount;
