import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Database, Scale, Sparkles, RefreshCw } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AuthorByline } from "@/components/AuthorByline";

const LAST_REVIEWED = "2026-05-13";

export default function Methodology() {
  useSEO({
    title: "Methodology & Data Sources",
    description:
      "How HerdSync sources its South African agricultural commodity prices, compliance content and AI-generated guidance — with review dates and disclosure.",
    canonical: "https://herdsync.co.za/methodology",
    keywords:
      "HerdSync methodology, data sources, SA commodity prices source, AIDA references, AI disclosure, agricultural data South Africa",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      url: "https://herdsync.co.za/methodology",
      name: "HerdSync Methodology & Data Sources",
      inLanguage: "en-ZA",
      dateModified: LAST_REVIEWED,
      isPartOf: { "@type": "WebSite", name: "HerdSync", url: "https://herdsync.co.za" },
      about: { "@type": "Organization", name: "HerdSync", url: "https://herdsync.co.za" },
      author: { "@type": "Organization", name: "The HerdSync Team", url: "https://herdsync.co.za" },
    },
  });

  return (
    <Layout>
      <div className="space-y-8 max-w-3xl">
        <Breadcrumbs items={[{ label: "Methodology" }]} />
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">
            Methodology &amp; Data Sources
          </h1>
          <p className="text-muted-foreground mt-2">
            How HerdSync sources, verifies and updates the data shown to South African farmers.
          </p>
          <div className="mt-4">
            <AuthorByline publishedAt={LAST_REVIEWED} updatedAt={LAST_REVIEWED} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              South African commodity market prices
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            <p>
              The Market Area surfaces indicative South African agricultural commodity
              prices for cattle, sheep, grain and produce. Prices are aggregated from
              publicly reported South African market sources and curated by The
              HerdSync Team before publication.
            </p>
            <p>
              <strong>Update frequency:</strong> typically weekly during normal market conditions.
              Prices are indicative reference values for planning purposes only and
              should not be used as the sole basis for a sale or hedging decision.
              Always confirm with your auctioneer, abattoir or buyer before transacting.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-primary" />
              Compliance content
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            <p>
              Compliance modules reference South African legislation including the
              Animal Identification Act (No. 6 of 2002 — AIDA), the Animal Diseases
              Act, the Meat Safety Act, the Occupational Health and Safety Act,
              the Basic Conditions of Employment Act, the Fertilizers, Farm Feeds,
              Agricultural Remedies and Stock Remedies Act, and POPIA.
            </p>
            <p>
              Compliance checklists and document templates were last reviewed by The
              HerdSync Team on <strong>{new Date(LAST_REVIEWED).toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}</strong>.
              Legislation changes — always verify against the current text of the
              Act and consult a qualified professional for legal advice.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              AI-generated content disclosure
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            <p>
              The Ask a Pro assistant is powered by Google Gemini and generates
              answers from your prompts. Responses are AI-generated and may be
              incomplete or incorrect — they are intended as a starting point for
              research, not as veterinary, legal or financial advice.
            </p>
            <p>
              CSV column mapping during data import is also AI-assisted. You always
              see the proposed mapping before import and can adjust it.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-primary" />
              Corrections & feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            <p>
              Spot something out of date or incorrect? Email{" "}
              <a className="text-primary underline" href="mailto:syncherd@gmail.com">
                syncherd@gmail.com
              </a>{" "}
              and we'll review and update.
            </p>
            <p className="text-xs">Last reviewed: 13 May 2026 · The HerdSync Team</p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
