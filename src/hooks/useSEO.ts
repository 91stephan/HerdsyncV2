import { useEffect } from "react";

interface SEOOptions {
  title?: string;
  description?: string;
  canonical?: string;
}

const DEFAULT_TITLE = "HerdSync - Farm Management Made Simple";
const DEFAULT_DESC =
  "HerdSync is a comprehensive farm management platform for livestock tracking, inventory, compliance, and reporting.";

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

/**
 * Set per-route SEO title, description and canonical.
 * Title is automatically suffixed with " | HerdSync" unless it already includes the brand.
 */
export function useSEO({ title, description, canonical }: SEOOptions) {
  useEffect(() => {
    const finalTitle = title
      ? title.includes("HerdSync")
        ? title
        : `${title} | HerdSync`
      : DEFAULT_TITLE;
    const finalDesc = (description || DEFAULT_DESC).slice(0, 160);
    const finalCanonical =
      canonical || (typeof window !== "undefined" ? window.location.href.split("?")[0] : "");

    document.title = finalTitle;
    setMeta("description", finalDesc);
    setMeta("og:title", finalTitle, "property");
    setMeta("og:description", finalDesc, "property");
    if (finalCanonical) {
      setMeta("og:url", finalCanonical, "property");
      setCanonical(finalCanonical);
    }
  }, [title, description, canonical]);
}
