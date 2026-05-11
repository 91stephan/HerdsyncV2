// Seed posts shipped with the repo. Used as an in-memory fallback so the blog
// is never empty even before any DB rows exist. The DB rows always take
// precedence — if a slug exists in both, the DB row wins.
//
// SEO note: each post has an explicit primary_keyword + seo_title + seo_description
// (kept under the 60/155 char limits) plus an optional `faqs` array which is
// rendered as FAQPage JSON-LD on the post page to win Google's "People Also Ask"
// rich result. See src/pages/BlogPost.tsx.
export interface SeedPostFAQ {
  question: string;
  answer: string;
}

export interface SeedPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string; // Markdown-ish (rendered as paragraphs / headings)
  cover_image_url: string | null;
  cover_image_alt: string | null;
  tags: string[];
  published: boolean;
  published_at: string;
  author_name: string;
  // SEO extras (optional so DB rows without these columns still work)
  primary_keyword?: string;
  seo_title?: string;
  seo_description?: string;
  faqs?: SeedPostFAQ[];
}

export const SEED_POSTS: SeedPost[] = [
  {
    slug: "getting-started-with-livestock-tracking-south-africa",
    title: "Livestock Tracking in South Africa: A Practical Getting-Started Guide",
    excerpt:
      "Tagging, RFID, branding and digital herd records — everything SA farmers need to comply with the Animal Identification Act and keep audit-ready records.",
    content: `## Why livestock tracking in South Africa is non-negotiable

For South African farmers — whether you run a Bonsmara stud, a Nguni weaner operation on sweetveld, or a small-scale Boer goat flock — accurate livestock records are no longer a "nice to have." The **Animal Identification Act, No. 6 of 2002 (AIDA)** makes proper identification a legal requirement, and the SAPS Stock Theft Unit, your local abattoir, DALRRD inspectors and the Red Meat Producers' Organisation (RPO) will all eventually want to see your stock register.

This guide walks you through what's legal, what's optional, and what's actually worth your money in 2026.

## What is the Animal Identification Act?

AIDA (Act 6 of 2002) requires every owner of cattle, sheep, goats, pigs and ostriches to register a unique identification mark with the Registrar of Animal Identification at DALRRD. The mark is then applied to every animal you own, in a way that's permanent — typically a hot iron brand, freeze brand or tattoo, depending on species.

Without a registered brand and properly marked stock, you cannot legally move, sell or auction your animals. You also lose almost any chance of recovering them through the SAPS Stock Theft Unit if they're stolen.

## How do I register a livestock brand in South Africa?

1. Apply to the Registrar of Animal Identification at DALRRD using form **AIA1**.
2. Pay the prescribed fee (currently around R200 per mark).
3. Receive your unique three-character identification mark.
4. Apply that mark to every eligible animal before the legal deadline — for cattle, this is the **two-tooth stage** (roughly 18 months).

Keep a copy of the registration certificate in your [document vault](/compliance/documents) — it's the first thing an auditor or stock theft investigator will ask for.

## Do I legally have to brand my cattle?

Yes. Under AIDA, every bovine animal in South Africa must carry a registered identification mark by the time it reaches the two-tooth stage. The most common methods are:

- **Hot iron branding** — cheapest, most durable, accepted everywhere.
- **Freeze branding** — kinder on the hide, better for stud animals where hide value matters.
- **Tattooing** — required for some stud registers (e.g. SA Stud Book) in addition to a brand.

## RFID ear tags vs branding — which do I need?

Branding is the **legal minimum**. RFID ear tags (compliant with **ISO 11784/11785**) are an **operational upgrade** that unlocks digital tracking — but they don't replace your brand. Most commercial farms now run both: a registered hot iron brand for legal identification and an RFID tag for day-to-day herd management.

RFID ear tags let you:

- Scan animals at checkpoints (Arduino-based readers work brilliantly with HerdSync's webhook ingest)
- Push movement data straight to the [tracking page](/tracking)
- Auto-populate your stock register without manual write-ups

## How much do RFID cattle tags cost in South Africa?

Pricing varies by supplier (Allflex, SafeTag, Datamars and local distributors all compete here), but in 2026 you should budget roughly:

- **R12–R25 per visual tag** (no electronics)
- **R35–R80 per RFID/EID tag** (LF, ISO 11784/11785 compliant)
- **R3,000–R8,000 for a hand-held RFID reader**
- **R15,000+ for a fixed checkpoint reader and antenna**

Compare this against the cost of one stolen weaner (R8,000+) and the maths usually works out within the first season.

## What is LITS-SA?

**LITS-SA** is the proposed Livestock Identification and Traceability System for South Africa, developed in line with international standards. It builds on AIDA by linking individual animal IDs to farms of origin, movement records, and ultimately to abattoirs — creating a "paddock-to-plate" traceable chain. Even before LITS-SA is fully mandatory, building your records around it (unique animal IDs, movement logs, removal certificates) is the smartest move for any commercial farm.

## How do I keep an auditable stock register?

A defensible stock register has five non-negotiable columns: **animal ID, species, date in, date out, and reason out** (sale, death, theft, slaughter). HerdSync auto-populates this from your [livestock](/livestock) and [animal sale](/animal-sale) records, and produces a printable PDF ready for inspection.

If you're still on Excel, you're one corrupt file away from failing an audit. Move now.

## Best livestock tracking app for small-scale farmers in SA

For small-scale and emerging farmers, the right starting point is a mobile app that:

- Works offline (most SA farms have patchy signal)
- Captures species, breed, sex, date of birth and brand mark
- Generates a removal certificate when an animal leaves the farm
- Stores everything in cloud so a lost phone doesn't mean lost records

That's exactly what HerdSync was built for. Start with [livestock management](/livestock) and add [RFID tracking](/tracking) when your operation grows.

## Next steps

Pair a structured [feeding schedule](/feeding) with a current [chemicals & remedies log](/compliance/chemicals) and you'll have an audit pack ready in minutes, not days. Read next: [The South African Farm Compliance Checklist for 2026](/blog/south-african-farm-compliance-checklist-2026).`,
    cover_image_url: null,
    cover_image_alt: "Bonsmara cow with RFID ear tag grazing on Free State veld",
    tags: ["livestock tracking", "AIDA", "RFID", "South Africa"],
    published: true,
    published_at: "2026-04-12T08:00:00Z",
    author_name: "HerdSync Team",
    primary_keyword: "livestock tracking South Africa",
    seo_title: "Livestock Tracking South Africa: Practical Guide | HerdSync",
    seo_description:
      "Tagging, RFID and digital herd records — everything SA farmers need to comply with the Animal Identification Act and keep audit-ready stock records.",
    faqs: [
      {
        question: "How do I register a livestock brand in South Africa?",
        answer:
          "Apply to the Registrar of Animal Identification at DALRRD using form AIA1, pay the prescribed fee (around R200), and you'll be issued a unique three-character identification mark. Apply that mark to every eligible animal before the legal deadline (cattle: the two-tooth stage, around 18 months).",
      },
      {
        question: "Do I legally have to brand my cattle?",
        answer:
          "Yes. The Animal Identification Act, No. 6 of 2002 (AIDA) requires every bovine in South Africa to carry a registered identification mark — hot iron brand, freeze brand or tattoo — by the two-tooth stage.",
      },
      {
        question: "What is the Animal Identification Act?",
        answer:
          "AIDA (Act 6 of 2002) is the South African law that requires owners of cattle, sheep, goats, pigs and ostriches to register a unique identification mark with DALRRD and apply it permanently to every animal they own.",
      },
      {
        question: "RFID ear tags vs branding — which do I need?",
        answer:
          "Branding is the legal minimum under AIDA. RFID ear tags (ISO 11784/11785) are an operational upgrade for digital tracking and movement records — they don't replace your brand. Most commercial farms run both.",
      },
      {
        question: "How much do RFID cattle tags cost in South Africa?",
        answer:
          "In 2026, budget roughly R12–R25 per visual tag, R35–R80 per RFID/EID tag, R3,000–R8,000 for a hand-held reader, and R15,000+ for a fixed checkpoint reader.",
      },
      {
        question: "What is LITS-SA?",
        answer:
          "LITS-SA is the proposed Livestock Identification and Traceability System for South Africa. It links individual animal IDs to farms of origin, movement records and abattoirs to create a paddock-to-plate traceable chain.",
      },
    ],
  },
  {
    slug: "south-african-farm-compliance-checklist-2026",
    title: "The South African Farm Compliance Checklist for 2026: Labour, OHS, Animal Welfare",
    excerpt:
      "Every document a South African commercial farm must keep on file under labour law, OHS, animal welfare and meat safety legislation — and how to digitise it.",
    content: `## What laws apply to livestock farmers in South Africa?

If a DALRRD inspector, the NSPCA, the Department of Employment and Labour or the SAPS Stock Theft Unit walks onto your farm tomorrow, you need to produce paperwork within minutes. The statutes that govern South African commercial farming include:

- **Animal Identification Act, No. 6 of 2002 (AIDA)**
- **Animal Protection Act, No. 71 of 1962**
- **Stock Theft Act, No. 57 of 1959**
- **Meat Safety Act, No. 40 of 2000**
- **Abattoir Hygiene Act, No. 121 of 1992**
- **Basic Conditions of Employment Act, No. 75 of 1997 (BCEA)** and **Sectoral Determination 13 for Agriculture**
- **Occupational Health and Safety Act, No. 85 of 1993 (OHSA)**
- **Agricultural Product Standards Act, No. 119 of 1990**
- **Fertilizers, Farm Feeds, Agricultural Remedies and Stock Remedies Act**

Below is the practical, line-by-line South African farm compliance checklist for 2026.

## What records do I need to keep for a farm audit?

### 1. Labour & OHS records

- Up-to-date employment contracts compliant with **BCEA** and **Sectoral Determination 13**
- UIF, SDL and **COIDA** registration confirmations
- Risk assessment and monthly safety walk records
- Section 16(2) appointee letters under OHSA
- Training records for chemical handlers, tractor operators and abattoir staff

Track these in [Labour & OHS](/compliance/labour-ohs).

### 2. Chemicals, remedies and feeds

- A full register of every chemical and stock remedy purchased, applied and disposed of (required under the Fertilizers, Farm Feeds and Stock Remedies Act)
- Withdrawal periods per product, linked to the animals treated
- Operator training certificates
- Empty container disposal records

### 3. Animal welfare records

Under the **Animal Protection Act** and the watchful eye of the **SPCA / NSPCA**, you must be able to show:

- Mortality records with cause of death
- Health treatments and vaccination history (use [health management](/health))
- Sale records with **voetstoots** clauses (use [animal sale](/animal-sale))
- Stock register and **removal certificates** for every movement off the farm

### 4. Financial records

- Receipts for all [farm expenses](/expenses) — kept for at least 5 years for SARS
- Salary slips for every employee
- Sale records cross-referenced to your stock register

## Do I need to register my farm under the OHS Act?

If you employ any workers — even seasonal ones — yes. The **Occupational Health and Safety Act, No. 85 of 1993** applies to every workplace in South Africa, and a farm is a workplace. You must register with the Compensation Commissioner under **COIDA**, conduct documented risk assessments, and appoint Section 16(2) representatives in writing.

## What is Sectoral Determination 13?

**Sectoral Determination 13 (SD13) for the Farm Worker Sector** is the labour-law instrument that sets minimum wages, working hours, leave, and termination conditions specifically for farm workers in South Africa. It supplements the BCEA and is enforced by the Department of Employment and Labour. Failing to comply is the single most common reason small commercial farms get fined.

## What animal welfare laws apply to commercial farmers?

The **Animal Protection Act, No. 71 of 1962** is the primary statute. It's enforced by the **NSPCA** with broad inspection powers. In practice this means you need to demonstrate adequate feed, water, shelter, veterinary care and humane handling — and you need the records to prove it.

## What documents must I have on file for the SPCA or Department of Agriculture?

At minimum, an inspector will ask for:

- Your AIDA brand registration certificate
- Your current stock register
- Mortality and treatment records for the last 12 months
- Chemical and remedy register with operator training certificates
- Section 16(2) OHS appointee letter
- Sectoral Determination 13–compliant employment contracts

## Build your audit pack in one click

When you're ready to submit, the [audit pack builder](/compliance/audit-pack) bundles every required document into a single, time-stamped PDF.

Read next: [Getting Started with Livestock Tracking in South Africa](/blog/getting-started-with-livestock-tracking-south-africa).`,
    cover_image_url: null,
    cover_image_alt: "South African farm manager reviewing compliance documents on a tablet inside a barn office",
    tags: ["compliance", "BCEA", "OHSA", "AIDA", "South Africa"],
    published: true,
    published_at: "2026-04-22T08:00:00Z",
    author_name: "HerdSync Team",
    primary_keyword: "South African farm compliance checklist",
    seo_title: "SA Farm Compliance Checklist 2026: Labour, OHS, Welfare",
    seo_description:
      "Every document a South African commercial farm must keep on file under labour law, OHS, animal welfare and meat safety — and how to digitise it.",
    faqs: [
      {
        question: "What laws apply to livestock farmers in South Africa?",
        answer:
          "Key statutes include AIDA (Act 6 of 2002), the Animal Protection Act, the Stock Theft Act, the Meat Safety Act, the BCEA with Sectoral Determination 13, the OHS Act, the Agricultural Product Standards Act, and the Fertilizers, Farm Feeds and Stock Remedies Act.",
      },
      {
        question: "What records do I need to keep for a farm audit?",
        answer:
          "Labour and OHS records (contracts, UIF/SDL/COIDA, risk assessments, training), a chemical and stock-remedy register, animal welfare records (mortality, vaccinations, sales with voetstoots clauses), and financial records including expense receipts kept for at least 5 years for SARS.",
      },
      {
        question: "Do I need to register my farm under the OHS Act?",
        answer:
          "Yes. If you employ any workers — including seasonal labour — your farm is a workplace under the Occupational Health and Safety Act, No. 85 of 1993, and you must register with the Compensation Commissioner under COIDA and document risk assessments.",
      },
      {
        question: "What is Sectoral Determination 13?",
        answer:
          "Sectoral Determination 13 is the South African labour-law instrument that sets minimum wages, working hours, leave and termination conditions specifically for farm workers, supplementing the Basic Conditions of Employment Act.",
      },
      {
        question: "What animal welfare laws apply to commercial farmers?",
        answer:
          "The Animal Protection Act, No. 71 of 1962 is the primary statute, enforced by the NSPCA. Commercial farmers must demonstrate adequate feed, water, shelter, veterinary care and humane handling, with records to prove it.",
      },
    ],
  },
  {
    slug: "cutting-feed-costs-without-cutting-condition",
    title: "How to Reduce Feed Costs on South African Cattle Farms Without Cutting Condition",
    excerpt:
      "Practical ways South African farmers can reduce feed costs by 10–15% without dropping animal condition — feed conversion, wastage, and margin tactics.",
    content: `## Feed is where the money leaks

For most South African beef, dairy and feedlot operations, feed is the single biggest line item — often 60–70% of operating cost. With maize prices volatile and weaner prices stagnant, the cost squeeze is real. The good news: most farms can reduce feed costs by **10–15% without dropping animal condition** simply by tightening measurement and cutting wastage.

## How much does it cost to feed a cow in South Africa?

It depends on system, but typical 2026 ballpark figures:

- **Cow on sweetveld with lick supplementation:** R8–R15 per day
- **Backgrounding weaner on kikuyu / lucerne pasture:** R18–R28 per day
- **Feedlot finishing on a maize-based ration:** R45–R70 per day

If you don't know your number — to the cent — you can't manage it. Log feed deliveries in [inventory](/inventory) with cost-per-unit and supplier so HerdSync can tally what each [feeding event](/feeding) actually cost.

## What is a good feed conversion ratio for cattle?

**Feed Conversion Ratio (FCR)** is kilograms of feed (dry matter) consumed per kilogram of liveweight gain. Targets in SA conditions:

- **Backgrounding on veld + lick:** 8–12:1
- **Feedlot finishing:** 5.5–7:1 (top SA feedlots achieve 5.2:1 on Bonsmara/Brahman crosses)
- **Dairy (kg feed per kg milk solids):** under 1.4:1

If your FCR is drifting upward without a ration change, you're either feeding the wrong animals or losing feed to wastage.

## How do I reduce feed wastage on my farm?

Wastage typically runs at **15–25%** on farms that haven't measured it. The wins are usually unsexy:

- Replace open trough feeding with **lick wheels** or covered troughs
- Store concentrates and Voermol/Molatek licks under cover (rain ruins them)
- Cull older cows with worn teeth — they spill more than they swallow
- Match group sizes to trough length so dominant animals can't crowd out the rest
- Weigh leftovers weekly; adjust the ration before you over-feed

A 5% wastage reduction on a 200-cow operation is roughly R60,000–R90,000 a year back in your pocket.

## Is it cheaper to background calves on veld or finish in a feedlot?

It depends on the **maize–beef ratio** (ratio of maize price per ton to weaner price per kg liveweight). When maize is cheap relative to weaner prices, feedlot finishing wins. When maize is expensive, backgrounding on sweetveld with strategic lick supplementation usually wins. Track both numbers monthly in the [reports page](/reports) — the ratio flips faster than most farmers realise, and the right answer in March may be wrong by August.

## How do I calculate margin over feed?

**Margin Over Feed (MOF)** is the simplest profitability measure most South African producers don't calculate:

\`\`\`
MOF = (sale price per animal) − (total feed cost per animal)
\`\`\`

If your MOF on weaners is dropping while head count is flat, your feed cost per animal is climbing. The [reports page](/reports) shows feed cost as a percentage of total operating expenses, broken down by month. If that line climbs, something's leaking.

## Precision feeding for South African farms

A blanket feeding plan over-feeds your easy-keepers (Nguni, Afrikaner, Boran) and under-feeds your growers (Bonsmara, Brahman crosses, Holstein bulls). The [feeding schedule](/feeding) lets you set per-animal rations so the right ration goes to the right mouth — the single highest-leverage feed cost reduction available to most operations.

## Re-quote your top three suppliers every quarter

Tracked supplier data in HerdSync makes a quarterly re-quote a 10-minute job instead of a 2-day project. Voermol, Molatek and your local co-op all compete hard for big customers — but only if you ask.

Read next: [Getting Started with Livestock Tracking in South Africa](/blog/getting-started-with-livestock-tracking-south-africa) and [The South African Farm Compliance Checklist for 2026](/blog/south-african-farm-compliance-checklist-2026).`,
    cover_image_url: null,
    cover_image_alt: "Bags of livestock feed and lick concentrate stacked in a covered South African farm storage shed",
    tags: ["feed costs", "FCR", "feedlot", "South Africa"],
    published: true,
    published_at: "2026-05-01T08:00:00Z",
    author_name: "HerdSync Team",
    primary_keyword: "how to reduce feed costs cattle South Africa",
    seo_title: "Cut Feed Costs Without Cutting Condition | HerdSync SA",
    seo_description:
      "Practical ways South African farmers can reduce feed costs by 10–15% without dropping animal condition — feed conversion, wastage and margin tactics.",
    faqs: [
      {
        question: "How much does it cost to feed a cow in South Africa?",
        answer:
          "Typical 2026 ranges: R8–R15 per day for a cow on sweetveld with lick supplementation, R18–R28 per day for backgrounding weaners on kikuyu or lucerne, and R45–R70 per day for feedlot finishing on a maize-based ration.",
      },
      {
        question: "What is a good feed conversion ratio for cattle?",
        answer:
          "In South African conditions, target 8–12:1 for backgrounding on veld plus lick, 5.5–7:1 for feedlot finishing (top operations hit 5.2:1 on Bonsmara/Brahman crosses), and under 1.4:1 for dairy (kg feed per kg milk solids).",
      },
      {
        question: "How do I reduce feed wastage on my farm?",
        answer:
          "Replace open troughs with lick wheels or covered troughs, store concentrates and licks under cover, cull older cows with worn teeth, match group sizes to trough length, and weigh leftovers weekly to adjust the ration before over-feeding.",
      },
      {
        question: "Is it cheaper to background calves on veld or finish in a feedlot?",
        answer:
          "It depends on the maize–beef ratio. When maize is cheap relative to weaner prices, feedlot finishing wins. When maize is expensive, backgrounding on sweetveld with strategic lick supplementation usually wins. The ratio can flip within a single season.",
      },
      {
        question: "How do I calculate margin over feed?",
        answer:
          "Margin Over Feed (MOF) = sale price per animal minus total feed cost per animal. Tracked monthly, it's the clearest signal of whether your feed strategy is paying off.",
      },
    ],
  },
];
