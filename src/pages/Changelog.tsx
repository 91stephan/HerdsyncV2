import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { SEOFooter } from "@/components/SEOFooter";

interface ChangelogEntry {
  version: string;
  date: string; // ISO
  title: string;
  highlights: string[];
}

const ENTRIES: ChangelogEntry[] = [
  {
    version: "1.3.0",
    date: "2026-05-12",
    title: "HerdSync Initial Release",
    highlights: [
      "Livestock tracking for cattle, sheep, goats, pigs, poultry and wild game",
      "AIDA-aligned animal records with brand and ear-tag fields",
      "Health, vaccination and feeding schedules per animal",
      "Multi-category inventory with chemical and expense linking",
      "SA compliance suite: labour & OHS checklists, chemicals register, audit pack builder",
      "Animal sale workflow with voetstoots clause and PDF receipts",
      "Live SA commodity market prices in ZAR",
      "Employee task management with daily reset and missed-task alerts",
      "Ask a Pro AI assistant (Gemini 2.0 multimodal)",
      "Native iOS and Android apps via Capacitor",
      "Yoco and PayPal billing in South African Rand",
      "Multi-farm support with RLS-isolated data",
    ],
  },
];

export default function Changelog() {
  useSEO({
    title: "Changelog & Release Notes",
    description:
      "Release notes and product updates for HerdSync — livestock and farm management software for South African farmers.",
    canonical: "https://herdsync.co.za/changelog",
    keywords: "HerdSync changelog, release notes, farm software updates, South Africa",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "HerdSync Changelog",
      url: "https://herdsync.co.za/changelog",
      inLanguage: "en-ZA",
      isPartOf: { "@type": "WebSite", name: "HerdSync", url: "https://herdsync.co.za" },
      about: { "@type": "SoftwareApplication", name: "HerdSync" },
    },
  });

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">
            Changelog
          </h1>
          <p className="text-muted-foreground mt-1">
            Product updates and release notes for HerdSync.
          </p>
        </div>

        {ENTRIES.map((entry) => (
          <Card key={entry.version} className="border-border">
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-xl font-display">
                    {entry.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(entry.date).toLocaleDateString("en-ZA", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0">
                v{entry.version}
              </Badge>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                {entry.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
      <SEOFooter />
    </Layout>
  );
}
