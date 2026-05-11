import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScanSearch, AlertTriangle, CheckCircle2 } from "lucide-react";
import { scanCurrentPageForAltIssues, type AltIssue } from "@/lib/altTextAudit";

const PUBLIC_ROUTES = ["/", "/about", "/contact", "/pricing", "/blog", "/terms", "/privacy-policy", "/disclaimer"];

export function AltTextAudit() {
  const [issues, setIssues] = useState<AltIssue[] | null>(null);
  const [scanning, setScanning] = useState(false);

  const runScanOnRoutes = async () => {
    setScanning(true);
    setIssues(null);
    const collected: AltIssue[] = [];

    // Scan the current page first
    collected.push(...scanCurrentPageForAltIssues());

    // Fetch each public route's HTML and parse for <img> tags. This catches
    // server-rendered or static images (e.g. favicons, OG fallbacks). Note:
    // SPA routes that render images via JS will be best-checked from the live
    // page itself, that's why we include the in-page scan above.
    await Promise.all(PUBLIC_ROUTES.map(async (route) => {
      try {
        const res = await fetch(route, { headers: { Accept: "text/html" } });
        if (!res.ok) return;
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        doc.querySelectorAll("img").forEach((img) => {
          const alt = img.getAttribute("alt");
          if (alt === null) {
            collected.push({ src: img.getAttribute("src") ?? "(no src)", outerHtml: img.outerHTML.slice(0, 240), reason: "missing", pageUrl: route });
          } else if (alt.trim() === "") {
            collected.push({ src: img.getAttribute("src") ?? "(no src)", outerHtml: img.outerHTML.slice(0, 240), reason: "empty", pageUrl: route });
          }
        });
      } catch {
        // network errors silently skipped
      }
    }));

    // Deduplicate
    const seen = new Set<string>();
    const unique = collected.filter((i) => {
      const k = `${i.pageUrl}::${i.src}::${i.reason}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    setIssues(unique);
    setScanning(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Alt Text Audit</CardTitle>
            <CardDescription>Scan public pages for images missing or with weak <code>alt</code> attributes</CardDescription>
          </div>
          <Button onClick={runScanOnRoutes} disabled={scanning}>
            <ScanSearch className="w-4 h-4 mr-2" />{scanning ? "Scanning…" : "Run scan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {issues === null ? (
          <p className="text-sm text-muted-foreground">Click "Run scan" to audit images on public pages.</p>
        ) : issues.length === 0 ? (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            <p className="text-sm font-medium text-foreground">No alt-text issues found across public pages.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="font-medium">{issues.length} issue{issues.length === 1 ? "" : "s"} found</p>
            </div>
            {issues.map((i, idx) => (
              <div key={idx} className="border border-border rounded-lg p-3 bg-card">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={i.reason === "missing" ? "destructive" : "secondary"}>{i.reason}</Badge>
                  <span className="text-xs text-muted-foreground">{i.pageUrl}</span>
                </div>
                <p className="text-sm font-mono break-all text-muted-foreground">{i.src}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
