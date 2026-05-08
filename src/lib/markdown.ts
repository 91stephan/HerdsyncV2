// Tiny, dependency-free markdown renderer for blog posts. We deliberately
// keep this minimal — full markdown support would mean adding a parser dep.
// Supports: ## headings, ### headings, paragraphs, bullet lists, [text](url)
// links, **bold**, and *italic*. Output is HTML-safe (escapes input first).

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderInline(s: string): string {
  // Links [text](url)
  let out = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, href) => {
    const safeHref = href.startsWith("/") || /^https?:\/\//.test(href) ? href : "#";
    const isInternal = safeHref.startsWith("/");
    const rel = isInternal ? "" : ' rel="noopener noreferrer" target="_blank"';
    return `<a href="${safeHref}"${rel} class="text-primary underline underline-offset-2 hover:no-underline">${text}</a>`;
  });
  // Bold then italic
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return out;
}

export function renderMarkdown(input: string): string {
  const lines = escapeHtml(input).split(/\r?\n/);
  const html: string[] = [];
  let inList = false;
  const closeList = () => {
    if (inList) {
      html.push("</ul>");
      inList = false;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList();
      continue;
    }
    if (line.startsWith("### ")) {
      closeList();
      html.push(`<h3 class="text-xl font-bold font-display mt-6 mb-2">${renderInline(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      closeList();
      html.push(`<h2 class="text-2xl font-bold font-display mt-8 mb-3">${renderInline(line.slice(3))}</h2>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html.push('<ul class="list-disc pl-6 space-y-1 my-3">');
        inList = true;
      }
      html.push(`<li>${renderInline(line.slice(2))}</li>`);
    } else {
      closeList();
      html.push(`<p class="my-3 leading-relaxed">${renderInline(line)}</p>`);
    }
  }
  closeList();
  return html.join("\n");
}
