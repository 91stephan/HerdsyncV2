import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BookOpen, Shield, Wifi, BarChart3, Scan } from "lucide-react";

const MODULES = [
  { icon: BookOpen,  label: "National Livestock Registry",   desc: "15-digit RFID traceability across all breeding centers" },
  { icon: BarChart3, label: "Genetic Indices Engine",        desc: "Mortality, offtake, and lambing/kidding rates per district" },
  { icon: Shield,    label: "WOAH Disease Reporting",        desc: "24-hour outbreak notification with WAHIS JSON export" },
  { icon: Scan,      label: "ISO 11784/11785 RFID",          desc: "LF 134.2 kHz Bluetooth scanner integration" },
  { icon: Wifi,      label: "Offline-First Field Sync",      desc: "Record data without connectivity, sync on reconnect" },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect authenticated users straight to the dashboard
  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-green-900 flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg leading-none">HerdSync V2</p>
            <p className="text-green-400 text-xs">National Breeding System</p>
          </div>
        </div>
        <Button
          onClick={() => navigate("/auth")}
          className="bg-green-600 hover:bg-green-500 text-white"
        >
          Staff Sign In
        </Button>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center py-16">
        <div className="max-w-3xl space-y-6">
          <div className="inline-flex items-center gap-2 bg-green-900/50 border border-green-700 text-green-300 text-xs px-3 py-1.5 rounded-full">
            <Shield className="w-3 h-3" />
            Ministry of Agriculture and Food Security — Kingdom of Lesotho
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Lesotho National<br />
            <span className="text-green-400">Breeding System</span>
          </h1>

          <p className="text-slate-300 text-lg max-w-xl mx-auto">
            Digitalisation of National Breeding Centers — Tender LSO-2000003942-0137-CS-QCBS
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-green-600 hover:bg-green-500 text-white px-8"
            >
              Sign In to System
            </Button>
          </div>
        </div>

        {/* Module highlights */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
          {MODULES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="bg-white/5 border border-white/10 rounded-xl p-4 text-left hover:bg-white/10 transition-colors"
            >
              <div className="w-8 h-8 rounded-lg bg-green-700/50 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-green-400" />
              </div>
              <p className="text-white font-medium text-sm">{label}</p>
              <p className="text-slate-400 text-xs mt-1">{desc}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 text-center text-slate-500 text-xs border-t border-white/5">
        © {new Date().getFullYear()} Ministry of Agriculture and Food Security, Kingdom of Lesotho.
        All rights reserved. Government data is protected under the Lesotho Data Protection Act.
      </footer>
    </div>
  );
}
