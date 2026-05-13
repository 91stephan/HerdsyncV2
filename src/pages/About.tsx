import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Users, Award, Heart, ShieldCheck, MapPin } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const ABOUT_LAST_UPDATED = "2026-05-13";

export default function About() {
  useSEO({
    title: "About HerdSync",
    description:
      "HerdSync is a South African farm management platform built for livestock farmers — AIDA-ready compliance, ZAR reporting and audit-ready records, by The HerdSync Team in Krugersdorp, Gauteng.",
    canonical: "https://herdsync.co.za/about",
    keywords:
      "about HerdSync, South African farm management, livestock software, AIDA compliance, POPIA, ZAR farm software, Krugersdorp Gauteng",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      url: "https://herdsync.co.za/about",
      name: "About HerdSync",
      inLanguage: "en-ZA",
      dateModified: ABOUT_LAST_UPDATED,
      mainEntity: {
        "@type": "Organization",
        name: "HerdSync",
        url: "https://herdsync.co.za",
        logo: "https://herdsync.co.za/favicon.png",
        areaServed: { "@type": "Country", name: "South Africa" },
        address: {
          "@type": "PostalAddress",
          addressLocality: "Krugersdorp",
          addressRegion: "Gauteng",
          addressCountry: "ZA",
        },
        description:
          "HerdSync is a South African livestock and farm management platform built to simplify herd tracking, AIDA compliance, feeding, inventory, and ZAR financial reporting for producers of every scale.",
      },
    },
  });
  return (
    <Layout>
      <div className="space-y-8">
        <Breadcrumbs items={[{ label: "About" }]} />
        <div>
          <h1 className="text-3xl font-bold text-foreground font-display">About HerdSync</h1>
          <p className="text-muted-foreground mt-1">
            Livestock and farm management software, built for South Africa.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: 13 May 2026
          </p>
        </div>

        {/* Mission Statement */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Our Mission
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              HerdSync exists to make professional-grade livestock and farm management
              accessible to every South African farmer — from emerging smallholders
              to established commercial operations. We replace scattered notebooks,
              spreadsheets and WhatsApp messages with a single, audit-ready system
              that speaks the language of South African regulation, weather and rand-based economics.
            </p>
          </CardContent>
        </Card>

        {/* Why HerdSync exists */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Why HerdSync was built for South Africa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground leading-relaxed">
            <p>
              Most farm management software is built for European or North American
              farms. The currency is wrong, the compliance frameworks are wrong, the
              animal mix is wrong and the connectivity assumptions are wrong.
              HerdSync is the opposite — every screen, schedule and report is shaped
              by South African realities:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Regulation:</strong> AIDA-aligned animal identification, Labour Relations Act and Occupational Health and Safety checklists, animal-linked chemical and remedy registers, and an Audit Pack Builder that produces inspection-ready PDFs.</li>
              <li><strong>Currency:</strong> All pricing, expenses, sales and reports are in South African Rand. No conversions, no rounding errors, no surprises at month-end.</li>
              <li><strong>Climate &amp; mix:</strong> Domestic livestock and wild game side-by-side. Drought-aware feeding plans. Veld management is a first-class concept.</li>
              <li><strong>Connectivity:</strong> Mobile-first UX with safe-area insets, large touch targets and resilient sync — designed for farms with intermittent rural connectivity.</li>
              <li><strong>Language &amp; payment:</strong> Local payment rails (Yoco, EFT, SnapScan, Zapper, PayPal) and ZA-native communication patterns.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Values */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-primary" />
                Farmer-First Approach
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                We build our platform based on real feedback from farmers. Every feature is designed 
                with practical, on-the-ground use in mind.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Award className="w-5 h-5 text-primary" />
                Quality & Reliability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Your data is precious. We ensure our platform is reliable, secure, and always 
                available when you need it most.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Heart className="w-5 h-5 text-primary" />
                Local Understanding
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Based in South Africa, we understand local farming practices, regulations, 
                and the unique challenges our farmers face.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* What We Offer */}
        <Card>
          <CardHeader>
            <CardTitle>What We Offer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground">Livestock Management</h4>
              <p className="text-muted-foreground text-sm">
                Track your entire herd with detailed records for each animal, including health history, 
                breeding records, and movement tracking.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Compliance & Auditing</h4>
              <p className="text-muted-foreground text-sm">
                Stay audit-ready with our comprehensive compliance tools designed for South African 
                regulatory requirements, including labour laws, OHS, and livestock traceability.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Financial Tracking</h4>
              <p className="text-muted-foreground text-sm">
                Monitor expenses, track sales, and generate reports that give you clear insights 
                into your farm's financial health.
              </p>
            </div>
            <div>
              <h4 className="font-medium text-foreground">Inventory Management</h4>
              <p className="text-muted-foreground text-sm">
                Keep track of feed, supplies, equipment, and chemicals with automated alerts 
                when stock runs low.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Data security & POPIA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Data security & POPIA commitment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            <p>
              Your farm's data is yours. HerdSync is engineered around POPIA-compliant
              data handling: row-level security isolates every farm's data, personally
              identifiable information is masked through secure database views,
              webhooks are HMAC-SHA256 verified, and sensitive endpoints are
              rate-limited.
            </p>
            <p>
              You can request a full export or deletion of your account at any time.
              Account deletions follow a 30-day window with administrator
              notification, so accidental requests can be reversed.
            </p>
          </CardContent>
        </Card>

        {/* Our team */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              The HerdSync Team
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            <p>
              HerdSync is built and maintained by The HerdSync Team — a small,
              South-Africa-based group combining experienced product engineers
              with hands-on agricultural domain knowledge. We work directly with
              farmers across the country to make sure every release reflects
              real on-farm workflows, not theoretical ones.
            </p>
            <p>
              HerdSync is operated as a standalone agricultural technology brand,
              based in Krugersdorp, Gauteng.
            </p>
          </CardContent>
        </Card>

        {/* Contact CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Ready to modernise your farm management?
              </h3>
              <p className="text-muted-foreground mb-4">
                Get in touch with us to learn more about how HerdSync can help your operation.
              </p>
              <a
                href="/contact"
                className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Contact Us
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
