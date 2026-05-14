UPDATE public.blog_posts
SET author_name = 'The HerdSync Team', updated_at = now()
WHERE author_name = 'HerdSync Team';

ALTER TABLE public.blog_posts
ALTER COLUMN author_name SET DEFAULT 'The HerdSync Team';