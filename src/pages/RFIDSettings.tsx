import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Scan, Bluetooth, BluetoothOff, Settings2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const SETTINGS_KEY = "herdsync_rfid_settings";

interface RFIDSettings {
  readerModel: string;
  connectionType: "bluetooth" | "usbc" | "manual";
  deviceAddress: string;
  frequency: "134.2" | "125";
  idFormat: "iso11784" | "custom";
  idPrefix: string;
  countryCode: string;
  autoScan: boolean;
  scanInterval: number;
  lastTestResult: "pass" | "fail" | null;
  lastTestedAt: string | null;
}

const DEFAULTS: RFIDSettings = {
  readerModel:     "",
  connectionType:  "bluetooth",
  deviceAddress:   "",
  frequency:       "134.2",
  idFormat:        "iso11784",
  idPrefix:        "710",
  countryCode:     "426",  // Lesotho ISO 3166-1 numeric
  autoScan:        false,
  scanInterval:    2,
  lastTestResult:  null,
  lastTestedAt:    null,
};

function validateNationalId(id: string): boolean {
  return /^\d{15}$/.test(id);
}

export default function RFIDSettings() {
  const [settings, setSettings] = useState<RFIDSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS;
    } catch {
      return DEFAULTS;
    }
  });
  const [testId, setTestId]             = useState("");
  const [testResult, setTestResult]     = useState<"pass" | "fail" | null>(null);
  const [connecting, setConnecting]     = useState(false);
  const [connected, setConnected]       = useState(false);
  const [scannedIds, setScannedIds]     = useState<string[]>([]);

  const save = (patch: Partial<RFIDSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  };

  const handleTestScan = () => {
    if (!testId) { toast.error("Enter a tag ID to test"); return; }
    const valid = validateNationalId(testId);
    setTestResult(valid ? "pass" : "fail");
    save({
      lastTestResult: valid ? "pass" : "fail",
      lastTestedAt: new Date().toISOString(),
    });
    if (valid) {
      toast.success("Valid ISO 11784/11785 national ID");
      setScannedIds((prev) => [testId, ...prev.slice(0, 9)]);
    } else {
      toast.error("Invalid format — national ID must be exactly 15 digits");
    }
  };

  // Simulate a Bluetooth connection attempt
  const handleConnect = async () => {
    if (settings.connectionType !== "bluetooth") {
      toast.info("USB-C connection is configured via OS device manager");
      return;
    }
    setConnecting(true);
    // In production this calls the Capacitor Bluetooth plugin
    await new Promise((r) => setTimeout(r, 1500));
    setConnecting(false);
    if (settings.deviceAddress) {
      setConnected(true);
      toast.success(`Connected to ${settings.deviceAddress}`);
    } else {
      toast.error("No device address configured");
    }
  };

  const handleDisconnect = () => {
    setConnected(false);
    toast.info("Disconnected from scanner");
  };

  return (
    <Layout>
      <div className="space-y-5 p-4 md:p-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Scan className="h-6 w-6 text-primary" />
            RFID Scanner Configuration
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure ISO 11784 / 11785 compliant handheld scanners and taggers
            for 15-digit national livestock ID registration.
          </p>
        </div>

        {/* Standard info */}
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4 text-sm text-blue-800 space-y-1">
            <p className="font-semibold">ISO 11784 / 11785 — LF 134.2 kHz Standard</p>
            <p>Country code: <span className="font-mono font-semibold">426</span> (Kingdom of Lesotho)</p>
            <p>ID structure: 3-digit country code + 12-digit individual number = 15 digits total</p>
            <p>Compliant with ICAR-certified electronic ear-tags.</p>
          </CardContent>
        </Card>

        {/* Device connection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bluetooth className="h-4 w-4" />
              Device Connection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Reader Model</Label>
                <Input
                  placeholder="e.g. Agrident AWR250"
                  value={settings.readerModel}
                  onChange={(e) => save({ readerModel: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Connection Type</Label>
                <Select
                  value={settings.connectionType}
                  onValueChange={(v) => save({ connectionType: v as RFIDSettings["connectionType"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bluetooth">Bluetooth</SelectItem>
                    <SelectItem value="usbc">USB-C</SelectItem>
                    <SelectItem value="manual">Manual entry</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {settings.connectionType === "bluetooth" && (
              <div className="space-y-1.5">
                <Label>Bluetooth Device Address</Label>
                <Input
                  placeholder="e.g. 00:1A:7D:DA:71:13"
                  value={settings.deviceAddress}
                  onChange={(e) => save({ deviceAddress: e.target.value })}
                />
              </div>
            )}

            <div className="flex items-center gap-3">
              {connected ? (
                <>
                  <Badge className="bg-green-100 text-green-700 border-0">
                    <CheckCircle className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    <BluetoothOff className="h-4 w-4 mr-1" /> Disconnect
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={handleConnect} disabled={connecting}>
                  <Bluetooth className={`h-4 w-4 mr-1 ${connecting ? "animate-pulse" : ""}`} />
                  {connecting ? "Connecting…" : "Connect Scanner"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tag format */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Tag Format & Frequency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select value={settings.frequency} onValueChange={(v) => save({ frequency: v as "134.2" | "125" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="134.2">134.2 kHz (ISO 11784/11785)</SelectItem>
                    <SelectItem value="125">125 kHz (EM4100)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>ID Format</Label>
                <Select value={settings.idFormat} onValueChange={(v) => save({ idFormat: v as "iso11784" | "custom" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iso11784">ISO 11784 (15-digit)</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Country Code</Label>
                <Input
                  value={settings.countryCode}
                  onChange={(e) => save({ countryCode: e.target.value })}
                  placeholder="426"
                  maxLength={3}
                />
              </div>
              <div className="space-y-1.5">
                <Label>ID Prefix</Label>
                <Input
                  value={settings.idPrefix}
                  onChange={(e) => save({ idPrefix: e.target.value })}
                  placeholder="710"
                  maxLength={3}
                />
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Auto-scan on open</p>
                <p className="text-xs text-muted-foreground">Automatically start scanning when a livestock form is opened</p>
              </div>
              <Switch checked={settings.autoScan} onCheckedChange={(v) => save({ autoScan: v })} />
            </div>

            {settings.autoScan && (
              <div className="space-y-1.5">
                <Label>Scan Interval (seconds)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={settings.scanInterval}
                  onChange={(e) => save({ scanInterval: Number(e.target.value) })}
                  className="w-24"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test scan */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Scan / Validate ID</CardTitle>
            <CardDescription>
              Enter or scan a 15-digit RFID number to verify it meets ISO 11784 / national traceability requirements.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter 15-digit ID"
                value={testId}
                onChange={(e) => { setTestId(e.target.value); setTestResult(null); }}
                maxLength={15}
                className="font-mono"
              />
              <Button onClick={handleTestScan}>
                <Scan className="h-4 w-4 mr-1" /> Validate
              </Button>
            </div>

            {testResult === "pass" && (
              <div className="flex items-center gap-2 text-green-700 text-sm">
                <CheckCircle className="h-4 w-4" />
                Valid ISO 11784 national ID — ready to register
              </div>
            )}
            {testResult === "fail" && (
              <div className="flex items-center gap-2 text-red-700 text-sm">
                <XCircle className="h-4 w-4" />
                Invalid — must be exactly 15 numeric digits
              </div>
            )}

            {/* Last scanned IDs */}
            {scannedIds.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Recent test scans:</p>
                <div className="flex flex-wrap gap-1">
                  {scannedIds.map((id) => (
                    <Badge key={id} variant="outline" className="font-mono text-xs">{id}</Badge>
                  ))}
                </div>
              </div>
            )}

            {settings.lastTestedAt && (
              <p className="text-xs text-muted-foreground">
                Last test: {new Date(settings.lastTestedAt).toLocaleString()} —{" "}
                {settings.lastTestResult === "pass" ? (
                  <span className="text-green-600">passed</span>
                ) : (
                  <span className="text-red-600">failed</span>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
