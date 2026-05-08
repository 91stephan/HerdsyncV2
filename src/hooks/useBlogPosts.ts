import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SEED_POSTS, type SeedPost } from "@/content/blog/seedPosts";

export interface BlogPost extends SeedPost {
  id?: string;
  source: "db" | "seed";
}

export const blogKeys = {
  all: ["blog"] as const,
  list: () => [...blogKeys.all, "list"] as const,
  detail: (slug: string) => [...blogKeys.all, "detail", slug] as const,
};

function mergePosts(dbRows: any[]): BlogPost[] {
  const dbBySlug = new Map<string, BlogPost>(
    dbRows.map((r) => [r.slug, { ...r, source: "db" } as BlogPost]),
  );
  const seeds: BlogPost[] = SEED_POSTS.filter((s) => !dbBySlug.has(s.slug)).map((s) => ({
    ...s,
    source: "seed",
  }));
  const all = [...dbBySlug.values(), ...seeds].filter((p) => p.published);
  all.sort(
    (a, b) =>
      new Date(b.published_at || 0).getTime() - new Date(a.published_at || 0).getTime(),
  );
  return all;
}

export function useBlogPosts() {
  return useQuery({
    queryKey: blogKeys.list(),
    queryFn: async (): Promise<BlogPost[]> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("published", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return mergePosts(data ?? []);
    },
    staleTime: 5 * 60_000,
  });
}

export function useBlogPost(slug: string | undefined) {
  return useQuery({
    queryKey: blogKeys.detail(slug ?? ""),
    enabled: !!slug,
    queryFn: async (): Promise<BlogPost | null> => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .eq("slug", slug!)
        .eq("published", true)
        .maybeSingle();
      if (error) throw error;
      if (data) return { ...data, source: "db" } as BlogPost;
      const seed = SEED_POSTS.find((s) => s.slug === slug && s.published);
      return seed ? ({ ...seed, source: "seed" } as BlogPost) : null;
    },
  });
}
