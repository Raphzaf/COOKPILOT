-- CookPilot · 0005 · Conversations and the RAG knowledge base

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_idx on public.conversations (user_id, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index messages_conversation_idx on public.messages (conversation_id, created_at);

create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text not null,
  source_url text,
  manufacturer text,
  model_number text,
  language text not null check (language in ('en', 'fr')),
  doc_type text not null check (doc_type in ('manual', 'specification', 'capability', 'recipe', 'food_safety', 'guide')),
  published_at date,
  verification_status text not null default 'partial'
    check (verification_status in ('verified', 'documented', 'partial', 'incomplete')),
  rights_note text not null,          -- why we are allowed to store and use this text
  content_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (content_hash, language)
);
create trigger knowledge_documents_set_updated_at before update on public.knowledge_documents
  for each row execute function public.set_updated_at();

create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents (id) on delete cascade,
  position integer not null,
  content text not null,
  embedding extensions.vector(768),   -- null until an embedding provider is configured
  fts tsvector generated always as (to_tsvector('simple', content)) stored,
  created_at timestamptz not null default now(),
  unique (document_id, position)
);
create index knowledge_chunks_embedding_idx on public.knowledge_chunks
  using hnsw (embedding extensions.vector_cosine_ops);
create index knowledge_chunks_fts_idx on public.knowledge_chunks using gin (fts);

-- Hybrid retrieval with metadata filtering.
--  * query_embedding present → cosine similarity over embedded chunks
--  * otherwise               → full-text ranking (query_text is an OR-joined tsquery, e.g. 'steak | grill')
-- Chunks bound to a model are only returned when that model is in filter_models;
-- model-agnostic chunks (food safety, guides) always pass.
create or replace function public.match_knowledge_chunks(
  query_embedding extensions.vector(768),
  query_text text,
  match_count integer default 6,
  filter_language text default null,
  filter_models text[] default null,
  filter_doc_types text[] default null
)
returns table (
  id uuid,
  document_id uuid,
  chunk_position integer,
  content text,
  manufacturer text,
  model_number text,
  language text,
  doc_type text,
  verification_status text,
  document_title text,
  source_url text,
  score double precision
)
language plpgsql
stable
set search_path = ''
as $$
begin
  if query_embedding is not null then
    return query
      select c.id, c.document_id, c.position, c.content, d.manufacturer, d.model_number, d.language,
             d.doc_type, d.verification_status, d.title, d.source_url,
             (1 - (c.embedding operator(extensions.<=>) query_embedding))::double precision as score
      from public.knowledge_chunks c
      join public.knowledge_documents d on d.id = c.document_id
      where c.embedding is not null
        and (filter_language is null or d.language = filter_language)
        and (filter_doc_types is null or d.doc_type = any (filter_doc_types))
        and (filter_models is null or d.model_number is null or d.model_number = any (filter_models))
      order by c.embedding operator(extensions.<=>) query_embedding
      limit greatest(1, least(match_count, 20));
  else
    return query
      select c.id, c.document_id, c.position, c.content, d.manufacturer, d.model_number, d.language,
             d.doc_type, d.verification_status, d.title, d.source_url,
             ts_rank(c.fts, to_tsquery('simple', query_text))::double precision as score
      from public.knowledge_chunks c
      join public.knowledge_documents d on d.id = c.document_id
      where query_text is not null and query_text <> ''
        and c.fts @@ to_tsquery('simple', query_text)
        and (filter_language is null or d.language = filter_language)
        and (filter_doc_types is null or d.doc_type = any (filter_doc_types))
        and (filter_models is null or d.model_number is null or d.model_number = any (filter_models))
      order by score desc
      limit greatest(1, least(match_count, 20));
  end if;
end;
$$;
revoke all on function public.match_knowledge_chunks(extensions.vector, text, integer, text, text[], text[]) from public, anon;
grant execute on function public.match_knowledge_chunks(extensions.vector, text, integer, text, text[], text[]) to authenticated, service_role;
