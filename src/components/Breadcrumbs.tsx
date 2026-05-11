import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { useEffect } from "react";

export interface Crumb {
  label: string;
  /** Absolute path. Omit on the last (current) crumb. */
  to?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
  /** Inject BreadcrumbList JSON-LD (default true). */
  jsonLd?: boolean;
}

/**
 * Visual + structured-data breadcrumb trail.
 * Always prepends "Home" (/). Renders semantic <nav aria-label="Breadcrumb">.
 */
export function Breadcrumbs({ items, jsonLd = true }: BreadcrumbsProps) {
  const all: Crumb[] = [{ label: "Home", to: "/" }, ...items];

  useEffect(() => {
    if (!jsonLd) return;
    const id = "breadcrumb-jsonld";
    const data = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: all.map((c, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: c.label,
        item: c.to
          ? `https://herdsync.co.za${c.to}`
          : typeof window !== "undefined"
            ? window.location.href.split("?")[0]
            : undefined,
      })),
    };
    let el = document.getElementById(id) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement("script");
      el.type = "application/ld+json";
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => {
      el?.remove();
    };
  }, [JSON.stringify(items), jsonLd]);

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground mb-4">
      <ol className="flex items-center flex-wrap gap-1">
        {all.map((c, i) => {
          const isLast = i === all.length - 1;
          return (
            <li key={`${c.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />}
              {isLast || !c.to ? (
                <span aria-current="page" className="text-foreground font-medium">
                  {i === 0 ? <Home className="w-3.5 h-3.5 inline" aria-hidden="true" /> : c.label}
                </span>
              ) : (
                <Link to={c.to} className="hover:text-primary transition-colors">
                  {i === 0 ? <Home className="w-3.5 h-3.5 inline" aria-hidden="true" /> : c.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
