import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Pencil, Plus, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { blogKeys } from "@/hooks/useBlogPosts";

interface DbPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  tags: string[];
  published: boolean;
  published_at: string | null;
  author_name: string;
  updated_at: string;
}

const empty = (): Partial<DbPost> => ({
  slug: "",
  title: "",
  excerpt: "",
  content: "",
  cover_image_url: "",
  cover_image_alt: "",
  tags: [],
  published: false,
  author_name: "HerdSync Team",
});

export function BlogManager() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Partial<DbPost> | null>(null);
  const [tagInput, setTagInput] = useState("");

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin", "blog_posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DbPost[];
    },
  });

  const save = useMutation({
    mutationFn: async (post: Partial<DbPost>) => {
      const payload = {
        slug: post.slug?.trim(),
        title: post.title?.trim(),
        excerpt: post.excerpt?.trim(),
        content: post.content ?? "",
        cover_image_url: post.cover_image_url?.trim() || null,
        cover_image_alt: post.cover_image_alt?.trim() || null,
        tags: post.tags ?? [],
        published: !!post.published,
        published_at: post.published ? (post.published_at || new Date().toISOString()) : null,
        author_name: post.author_name?.trim() || "HerdSync Team",
      };
      if (!payload.slug || !payload.title || !payload.excerpt) {
        throw new Error("Slug, title and excerpt are required");
      }
      if (post.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Blog post saved");
      qc.invalidateQueries({ queryKey: ["admin", "blog_posts"] });
      qc.invalidateQueries({ queryKey: blogKeys.all });
      setEditing(null);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Post deleted");
      qc.invalidateQueries({ queryKey: ["admin", "blog_posts"] });
      qc.invalidateQueries({ queryKey: blogKeys.all });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Blog Posts</CardTitle>
          <CardDescription>Create, edit and publish posts shown at /blog</CardDescription>
        </div>
        <Button onClick={() => { setEditing(empty()); setTagInput(""); }}>
          <Plus className="w-4 h-4 mr-2" />New post
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin" /></div>
        ) : !posts || posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">No DB posts yet. Seeded posts in the codebase still show on /blog.</p>
        ) : (
          <div className="space-y-3">
            {posts.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 border border-border rounded-lg p-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.title}</h3>
                    {p.published ? <Badge variant="default">Published</Badge> : <Badge variant="secondary">Draft</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">/{p.slug} · updated {format(new Date(p.updated_at), "d MMM yyyy")}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{p.excerpt}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {p.published && (
                    <Button asChild size="icon" variant="ghost"><Link to={`/blog/${p.slug}`} target="_blank"><ExternalLink className="w-4 h-4" /></Link></Button>
                  )}
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setTagInput(""); }}><Pencil className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => { if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id); }}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit post" : "New post"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Slug *</Label>
                  <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "") })} placeholder="my-post-slug" />
                </div>
                <div>
                  <Label>Author</Label>
                  <Input value={editing.author_name ?? ""} onChange={(e) => setEditing({ ...editing, author_name: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Title *</Label>
                <Input value={editing.title ?? ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
              </div>
              <div>
                <Label>Excerpt * (used in meta description)</Label>
                <Textarea rows={2} value={editing.excerpt ?? ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} maxLength={300} />
              </div>
              <div>
                <Label>Content (Markdown, `## H2`, `### H3`, `- bullets`, `[link](/path)`, **bold**)</Label>
                <Textarea rows={14} value={editing.content ?? ""} onChange={(e) => setEditing({ ...editing, content: e.target.value })} className="font-mono text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cover image URL</Label>
                  <Input value={editing.cover_image_url ?? ""} onChange={(e) => setEditing({ ...editing, cover_image_url: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <Label>Cover image alt text</Label>
                  <Input value={editing.cover_image_alt ?? ""} onChange={(e) => setEditing({ ...editing, cover_image_alt: e.target.value })} placeholder="Describe the image for screen readers and SEO" />
                </div>
              </div>
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {(editing.tags ?? []).map((t) => (
                    <Badge key={t} variant="secondary" className="cursor-pointer" onClick={() => setEditing({ ...editing, tags: (editing.tags ?? []).filter((x) => x !== t) })}>
                      {t} ×
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add a tag and press Enter"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && tagInput.trim()) {
                        e.preventDefault();
                        const t = tagInput.trim().toLowerCase();
                        if (!(editing.tags ?? []).includes(t)) {
                          setEditing({ ...editing, tags: [...(editing.tags ?? []), t] });
                        }
                        setTagInput("");
                      }
                    }} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={!!editing.published} onCheckedChange={(v) => setEditing({ ...editing, published: v })} id="published" />
                <Label htmlFor="published">Published</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              {save.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
