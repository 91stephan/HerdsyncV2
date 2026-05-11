// Alt text auditing utilities.
// - In dev: warns in the console whenever an <img> appears in the DOM without
//   meaningful alt text.
// - In any environment: scanCurrentPageForAltIssues() returns a structured
//   report used by the Admin SEO Audit page.

export interface AltIssue {
  src: string;
  outerHtml: string;
  reason: "missing" | "empty" | "filename-only";
  pageUrl: string;
}

const FILENAME_LIKE = /^[\w\-.%]+\.(png|jpe?g|webp|gif|svg|avif)$/i;

function classify(img: HTMLImageElement): AltIssue["reason"] | null {
  const alt = img.getAttribute("alt");
  // role="presentation" or aria-hidden -> intentionally decorative, skip
  if (img.getAttribute("aria-hidden") === "true" || img.getAttribute("role") === "presentation") {
    return null;
  }
  if (alt === null) return "missing";
  const trimmed = alt.trim();
  if (trimmed === "") {
    // Empty alt is *valid* for decorative imagery, but most of ours shouldn't
    // be decorative, flag for review without blocking.
    return "empty";
  }
  if (FILENAME_LIKE.test(trimmed)) return "filename-only";
  return null;
}

export function scanCurrentPageForAltIssues(): AltIssue[] {
  if (typeof document === "undefined") return [];
  const results: AltIssue[] = [];
  document.querySelectorAll("img").forEach((node) => {
    const img = node as HTMLImageElement;
    const reason = classify(img);
    if (!reason) return;
    results.push({
      src: img.currentSrc || img.src || "(no src)",
      outerHtml: img.outerHTML.slice(0, 240),
      reason,
      pageUrl: window.location.pathname,
    });
  });
  return results;
}

let observer: MutationObserver | null = null;
const warnedSrcs = new Set<string>();

/** Dev-only, install a MutationObserver that warns about new alt-less images. */
export function installAltTextDevWatcher(): void {
  if (!import.meta.env.DEV || typeof document === "undefined" || observer) return;

  const checkNode = (img: HTMLImageElement) => {
    const reason = classify(img);
    if (!reason) return;
    const key = `${reason}::${img.currentSrc || img.src}`;
    if (warnedSrcs.has(key)) return;
    warnedSrcs.add(key);
    // eslint-disable-next-line no-console
    console.warn(
      `[a11y/seo] <img> ${reason === "missing" ? "is missing" : reason === "empty" ? "has empty" : "has filename-like"} alt text:`,
      img.currentSrc || img.src,
      img,
    );
  };

  // Initial sweep
  document.querySelectorAll("img").forEach((n) => checkNode(n as HTMLImageElement));

  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach((n) => {
        if (n instanceof HTMLImageElement) checkNode(n);
        else if (n instanceof HTMLElement) {
          n.querySelectorAll?.("img").forEach((img) => checkNode(img as HTMLImageElement));
        }
      });
      if (m.type === "attributes" && m.target instanceof HTMLImageElement) {
        checkNode(m.target);
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["alt", "src"],
  });
}
