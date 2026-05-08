import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  canonical?: string;
  /** Absolute URL to the social share image (1200x630 recommended). */
  image?: string;
  /** Open Graph type: website (default), article, profile, etc. */
  type?: "website" | "article" | "profile";
  /** Comma-separated keywords. Optional — most engines ignore this, but it doesn't hurt. */
  keywords?: string;
  /** Set to true on auth/internal pages we don't want indexed. */
  noindex?: boolean;
  /** Optional JSON-LD structured data object (or array). */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

const SITE_URL = "https://herdsync.co.za";
const DEFAULT_TITLE = "HerdSync - Farm Management Made Simple";
const DEFAULT_DESC =
  "HerdSync is a comprehensive farm management platform for livestock tracking, inventory, compliance, and reporting.";
const DEFAULT_IMAGE = `${SITE_URL}/favicon.png`;

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = "canonical";
    document.head.appendChild(el);
  }
  el.href = href;
}

function setJsonLd(data: SEOOptions["jsonLd"]) {
  const id = "seo-jsonld";
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!data) {
    if (el) el.remove();
    return;
  }
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/**
 * Set per-route SEO: title, description, canonical, Open Graph, Twitter card,
 * robots, and optional JSON-LD structured data.
 *
 * Title is automatically suffixed with " | HerdSync" unless it already includes the brand.
 */
export function useSEO({
  title,
  description,
  canonical,
  image,
  type = "website",
  keywords,
  noindex = false,
  jsonLd,
}: SEOOptions) {
  useEffect(() => {
    const finalTitle = title
      ? title.includes("HerdSync")
        ? title
        : `${title} | HerdSync`
      : DEFAULT_TITLE;
    const finalDesc = (description || DEFAULT_DESC).slice(0, 160);
    const finalCanonical =
      canonical || (typeof window !== "undefined" ? window.location.href.split("?")[0] : "");
    const finalImage = image || DEFAULT_IMAGE;

    document.title = finalTitle;

    setMeta("description", finalDesc);
    if (keywords) setMeta("keywords", keywords);

    // Robots
    setMeta("robots", noindex ? "noindex,nofollow" : "index,follow");

    // Open Graph
    setMeta("og:title", finalTitle, "property");
    setMeta("og:description", finalDesc, "property");
    setMeta("og:type", type, "property");
    setMeta("og:image", finalImage, "property");
    setMeta("og:site_name", "HerdSync", "property");
    if (finalCanonical) setMeta("og:url", finalCanonical, "property");

    // Twitter
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", finalTitle);
    setMeta("twitter:description", finalDesc);
    setMeta("twitter:image", finalImage);

    if (finalCanonical) setCanonical(finalCanonical);

    setJsonLd(jsonLd);
  }, [title, description, canonical, image, type, keywords, noindex, JSON.stringify(jsonLd)]);
}
