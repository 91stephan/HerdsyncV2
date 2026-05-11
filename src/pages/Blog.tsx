import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wheat, ArrowLeft, Loader2 } from "lucide-react";
import { useSEO } from "@/hooks/useSEO";
import { useBlogPosts } from "@/hooks/useBlogPosts";
import { SEOFooter } from "@/components/SEOFooter";

export default function Blog() {
  const { data: posts, isLoading } = useBlogPosts();

  useSEO({
    title: "HerdSync Blog — Farming Insights for South African Farmers",
    description:
      "Practical guides on livestock tracking, compliance, feed cost control, and farm management — written for South African producers.",
    canonical: "https://herdsync.co.za/blog",
    keywords: "south african farming, livestock tracking, farm compliance, feed cost, herd management",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Blog",
      name: "HerdSync Blog",
      url: "https://herdsync.co.za/blog",
      publisher: { "@type": "Organization", name: "HerdSync", url: "https://herdsync.co.za" },
      blogPost: (posts ?? []).map((p) => ({
        "@type": "BlogPosting",
        headline: p.title,
        description: p.excerpt,
        url: `https://herdsync.co.za/blog/${p.slug}`,
        datePublished: p.published_at,
        author: { "@type": "Organization", name: p.author_name },
      })),
    },
  });

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
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" />Home</Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-10 max-w-5xl">
        <div className="mb-10">
          <h1 className="text-4xl md:text-5xl font-bold font-display text-foreground mb-3">
            HerdSync Blog
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Field-tested guides for South African farmers — livestock, compliance, and the day-to-day
            mechanics of running a profitable operation.
          </p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !posts || posts.length === 0 ? (
          <p className="text-muted-foreground">No posts yet — check back soon.</p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link key={post.slug} to={`/blog/${post.slug}`} className="block group">
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.tags.slice(0, 3).map((t) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                    <h2 className="text-xl font-bold font-display text-foreground mb-2 group-hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-muted-foreground flex-1">{post.excerpt}</p>
                    <p className="text-xs text-muted-foreground mt-4">
                      {post.published_at ? format(new Date(post.published_at), "d MMM yyyy") : ""} · {post.author_name}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <SEOFooter />
    </div>
  );
}
