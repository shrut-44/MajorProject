-- 001: Initial schema for OS Contribution Finder
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)

-- Enable pgvector extension
create extension if not exists vector;

-- Issues table
create table issues (
  id uuid primary key default gen_random_uuid(),
  github_id bigint unique,
  title text not null,
  description text,
  repo_name text not null,
  url text not null unique,
  language text,
  labels text[] default '{}',
  state text not null default 'open',
  comments_count int default 0,
  difficulty int check (difficulty between 1 and 5),
  content_hash text,
  embedding vector(768),
  github_created_at timestamptz,
  github_updated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes
create index on issues using hnsw (embedding vector_cosine_ops);
create index on issues (state, language);
create index on issues (repo_name);

-- Row-Level Security: public can read open issues, only service role writes
alter table issues enable row level security;

create policy "public read open issues" on issues
  for select using (state = 'open');

-- Semantic search function
create or replace function match_issues(
  query_embedding vector(768),
  match_count int default 20,
  filter_language text default null,
  max_difficulty int default null,
  min_similarity float default 0.0
)
returns table (
  id uuid, title text, description text, repo_name text, url text,
  language text, labels text[], difficulty int, similarity float
)
language sql stable
as $$
  select i.id, i.title, i.description, i.repo_name, i.url,
         i.language, i.labels, i.difficulty,
         1 - (i.embedding <=> query_embedding) as similarity
  from issues i
  where i.state = 'open'
    and (filter_language is null or i.language = filter_language)
    and (max_difficulty is null or i.difficulty <= max_difficulty)
    and 1 - (i.embedding <=> query_embedding) >= min_similarity
  order by i.embedding <=> query_embedding
  limit match_count;
$$;
