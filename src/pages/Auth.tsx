import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Mail, Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ForgotPasswordDialog } from "@/components/ForgotPasswordDialog";

export default function Auth() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && user) navigate("/dashboard", { replace: true });
  }, [user, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (authError) {
      setError(authError.message);
    }
    // on success useEffect above redirects to /dashboard
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Branding */}
        <Link to="/" className="flex items-center justify-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-12 h-12 rounded-xl bg-green-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-xl leading-none">HerdSync V2</p>
            <p className="text-green-400 text-xs mt-0.5">National Breeding System</p>
          </div>
        </Link>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-white font-semibold text-lg">Staff Sign In</h2>
            <p className="text-slate-400 text-sm mt-1">
              Ministry of Agriculture and Food Security
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@moa.gov.ls"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-green-500"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-slate-500 focus:border-green-500"
                  required
                  autoComplete="current-password"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 bg-red-500/20 border border-red-500/40 text-red-300 text-sm rounded-lg px-3 py-2.5">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <ForgotPasswordDialog />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold h-11"
            >
              {loading ? "Signing in…" : "Sign In"}
            </Button>
          </form>

          <p className="text-slate-500 text-xs text-center mt-6">
            Access is restricted to authorised Ministry staff.<br />
            Contact your System Administrator to request an account.
          </p>
        </div>

        <p className="text-slate-600 text-xs text-center">
          © {new Date().getFullYear()} Ministry of Agriculture and Food Security, Kingdom of Lesotho
        </p>
      </div>
    </div>
  );
}
