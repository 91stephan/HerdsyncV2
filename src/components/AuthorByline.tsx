import { format } from "date-fns";
import { Wheat } from "lucide-react";

interface AuthorBylineProps {
  publishedAt?: string | null;
  updatedAt?: string | null;
  className?: string;
}

/**
 * Brand-level author byline. HerdSync is intentionally positioned as the
 * authority — we never attribute to an individual person on public-facing
 * content. Use this on every blog post, guide, and methodology page.
 */
export function AuthorByline({ publishedAt, updatedAt, className = "" }: AuthorBylineProps) {
  const published = publishedAt ? format(new Date(publishedAt), "d MMMM yyyy") : null;
  const updated = updatedAt ? format(new Date(updatedAt), "d MMMM yyyy") : null;
  const showUpdated = updated && updated !== published;

  return (
    <div className={`flex items-center gap-3 text-sm text-muted-foreground ${className}`}>
      <div
        className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        <Wheat className="w-5 h-5 text-primary-foreground" />
      </div>
      <div className="leading-tight">
        <p className="font-medium text-foreground">The HerdSync Team</p>
        <p className="text-xs">
          {published && <span>Published {published}</span>}
          {showUpdated && <span> · Updated {updated}</span>}
        </p>
      </div>
    </div>
  );
}
