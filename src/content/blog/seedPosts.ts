// Seed posts shipped with the repo. Used as an in-memory fallback so the blog
// is never empty even before any DB rows exist. The DB rows always take
// precedence — if a slug exists in both, the DB row wins.
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
}

export const SEED_POSTS: SeedPost[] = [
  {
    slug: "getting-started-with-livestock-tracking-south-africa",
    title: "Getting Started with Livestock Tracking in South Africa",
    excerpt:
      "A practical guide for South African farmers on tagging, RFID, and digital herd records that keep your operation auditable and grant-ready.",
    content: `## Why digital livestock tracking matters

For South African farmers, accurate livestock records are no longer a "nice to have." Government grants, insurance claims, abattoir compliance and even land-claim disputes all hinge on being able to prove which animals were on your farm, when, and what happened to them.

## Step 1 — Standardise your tag IDs

Every animal on your farm should have a unique, persistent identifier. We recommend a simple format like \`HERD-2026-0001\`. Avoid reusing tag IDs from removed animals — once an ID is retired, it stays retired.

## Step 2 — Capture the basics

At minimum, capture: species, breed, date of birth, sex and brand mark. Once those are in HerdSync you unlock automated age calculations, breeding eligibility, and feeding-schedule reminders.

## Step 3 — Layer in RFID where it pays off

RFID checkpoints (Arduino-based readers work brilliantly) give you passive movement tracking. HerdSync ingests the readings via webhook and writes them straight to the [tracking page](/tracking).

## Next steps

Pair this with a structured [feeding schedule](/feeding) and a current [chemicals & remedies log](/compliance/chemicals) and you'll have an audit pack ready in minutes, not days.`,
    cover_image_url: null,
    cover_image_alt: "Cattle grazing in a South African farm landscape with rolling hills behind",
    tags: ["livestock", "compliance", "getting-started"],
    published: true,
    published_at: "2026-04-12T08:00:00Z",
    author_name: "HerdSync Team",
  },
  {
    slug: "south-african-farm-compliance-checklist-2026",
    title: "The South African Farm Compliance Checklist for 2026",
    excerpt:
      "Labour, OHS, chemicals, animal welfare — the documents every commercial farm must keep on file under SA law, and how to digitise them.",
    content: `## A short, ruthless checklist

If you're audited tomorrow, you need to produce these documents within minutes. HerdSync stores them all in the [document vault](/compliance/documents), but here's the human checklist:

### 1. Labour & OHS
- Up-to-date employment contracts
- UIF and SDL registration confirmations
- Risk assessment & monthly safety walk records — track these in [Labour & OHS](/compliance/labour-ohs)

### 2. Chemicals & remedies
- A full register of every chemical purchased, applied and disposed of
- Withdrawal periods per product
- Operator training certificates

### 3. Animal welfare
- Mortality records
- Health treatments and vaccination history (use [health management](/health))
- Sale records with voetstoots clauses (use [animal sale](/animal-sale))

### 4. Financial
- Receipts for all [farm expenses](/expenses)
- Salary slips for all employees

## Build your audit pack in one click

When you're ready to submit, the [audit pack builder](/compliance/audit-pack) bundles every required document into a single, time-stamped PDF.`,
    cover_image_url: null,
    cover_image_alt: "Farmer reviewing compliance paperwork on a tablet inside a barn office",
    tags: ["compliance", "south-africa", "audit"],
    published: true,
    published_at: "2026-04-22T08:00:00Z",
    author_name: "HerdSync Team",
  },
  {
    slug: "cutting-feed-costs-without-cutting-condition",
    title: "Cutting Feed Costs Without Cutting Condition",
    excerpt:
      "Feed is the single biggest line item on most South African farms. Here's how to use HerdSync's inventory and feeding tools to find 10–15% savings without dropping animal condition.",
    content: `## Feed is where the money leaks

Most farmers don't actually know their cost-per-animal-per-day on feed. The good news: once you do, the savings are usually obvious.

## 1. Track every bag

Log feed deliveries in [inventory](/inventory) with cost-per-unit and supplier. HerdSync will then automatically tally what each [feeding event](/feeding) actually cost.

## 2. Map schedules to specific animals

A blanket feeding plan over-feeds your easy-keepers and under-feeds your growers. The [feeding schedule](/feeding) lets you set per-animal plans so the right ration goes to the right mouth.

## 3. Watch the cost dashboard

The [reports page](/reports) shows feed cost as a percentage of total operating expenses, broken down by month. If that line is climbing while head-count is flat, something's leaking.

## 4. Re-quote your top three suppliers every quarter

Tracked supplier data in HerdSync makes this a 10-minute job instead of a 2-day project.`,
    cover_image_url: null,
    cover_image_alt: "Bags of livestock feed neatly stacked in a farm storage shed",
    tags: ["feeding", "cost-management", "operations"],
    published: true,
    published_at: "2026-05-01T08:00:00Z",
    author_name: "HerdSync Team",
  },
];
