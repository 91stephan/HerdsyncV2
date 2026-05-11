import { Link, useParams, Navigate } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wheat, ArrowLeft, Loader2 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useBlogPost, useBlogPosts } from "@/hooks/useBlogPosts";
import { renderMarkdown } from "@/lib/markdown";
import { SEOFooter } from "@/components/SEOFooter";
import { Breadcrumbs } from "@/components/Breadcrumbs";

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = useBlogPost(slug);
  const { data: allPosts } = useBlogPosts();

  // Build JSON-LD: always include the BlogPosting Article schema; if the post
  // exposes FAQ-style Q&A pairs, also emit FAQPage schema so Google can show
  // the rich-result accordion for "People Also Ask" queries.
  const jsonLd = post
    ? (() => {
        const article = {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.seo_description ?? post.excerpt,
          image: post.cover_image_url ?? "https://herdsync.co.za/favicon.png",
          datePublished: post.published_at,
          dateModified: post.published_at,
          author: { "@type": "Organization", name: post.author_name },
          publisher: {
            "@type": "Organization",
            name: "HerdSync",
            logo: { "@type": "ImageObject", url: "https://herdsync.co.za/favicon.png" },
          },
          mainEntityOfPage: `https://herdsync.co.za/blog/${post.slug}`,
          keywords: post.primary_keyword
            ? [post.primary_keyword, ...(post.tags ?? [])].join(", ")
            : (post.tags ?? []).join(", "),
          inLanguage: "en-ZA",
        };
        if (post.faqs && post.faqs.length > 0) {
          return [
            article,
            {
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: post.faqs.map((f) => ({
                "@type": "Question",
                name: f.question,
                acceptedAnswer: { "@type": "Answer", text: f.answer },
              })),
            },
          ];
        }
        return article;
      })()
    : undefined;

  useSEO({
    title: post?.seo_title ?? post?.title ?? "Blog post",
    description: post?.seo_description ?? post?.excerpt,
    canonical: slug ? `https://herdsync.co.za/blog/${slug}` : undefined,
    image: post?.cover_image_url ?? undefined,
    type: "article",
    keywords: post?.primary_keyword
      ? [post.primary_keyword, ...(post?.tags ?? [])].join(", ")
      : post?.tags?.join(", "),
    jsonLd,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!post) return <Navigate to="/blog" replace />;

  const related = (allPosts ?? []).filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border bg-card/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Wheat className="w-6 h-6 text-primary-foreground" aria-hidden="true" />
            </div>
            <div>
              <span className="text-lg font-bold font-display block">HerdSync</span>
              <p className="text-xs text-muted-foreground">Farm Management</p>
            </div>
          </Link>
          <Button asChild variant="outline" size="sm">
            <Link to="/blog"><ArrowLeft className="w-4 h-4 mr-2" />All posts</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        <article>
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.map((t) => (
              <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
            ))}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold font-display text-foreground mb-3">
            {post.title}
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            {post.published_at ? format(new Date(post.published_at), "d MMMM yyyy") : ""} · {post.author_name}
          </p>
          {post.cover_image_url && (
            <img
              src={post.cover_image_url}
              alt={post.cover_image_alt ?? post.title}
              className="w-full rounded-lg mb-8 border border-border"
              loading="lazy"
            />
          )}
          <div
            className="text-foreground prose-base"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(post.content) }}
          />
        </article>

        {related.length > 0 && (
          <section className="mt-16" aria-label="Related posts">
            <h2 className="text-xl font-bold font-display mb-4">Continue reading</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((p) => (
                <Link key={p.slug} to={`/blog/${p.slug}`} className="block group">
                  <Card className="h-full hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <h3 className="font-semibold font-display group-hover:text-primary transition-colors">
                        {p.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{p.excerpt}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>

      <SEOFooter />
    </div>
  );
}
