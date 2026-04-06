create table if not exists workspaces (
  id uuid primary key,
  name text not null,
  description text,
  active_repo_connection_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversations (
  id uuid primary key,
  workspace_id uuid references workspaces(id) on delete set null,
  title text not null,
  mode text not null check (mode in ('chat', 'agent')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists conversation_messages (
  id uuid primary key,
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists virtual_projects (
  id uuid primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  conversation_id uuid not null references conversations(id) on delete cascade,
  source_message_id uuid references conversation_messages(id) on delete set null,
  kind text not null check (kind in ('react-app', 'python-script')),
  title text not null,
  prompt text not null,
  status text not null check (status in ('ready', 'running', 'error')),
  entry_file text not null,
  preview_mode text not null check (preview_mode in ('react', 'pyodide')),
  manifest_json jsonb not null default '{}'::jsonb,
  last_run_summary jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists virtual_project_files (
  id uuid primary key,
  project_id uuid not null references virtual_projects(id) on delete cascade,
  path text not null,
  language text not null,
  content text not null,
  is_entry boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists memory_entries (
  id uuid primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  repo_connection_id uuid,
  scope text not null check (scope in ('user', 'workspace', 'repo', 'conversation')),
  kind text not null check (kind in ('fact', 'preference', 'summary', 'decision', 'todo', 'codebase_note')),
  content text not null,
  importance integer not null default 1,
  source_ref text,
  last_used_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  metadata jsonb
);

create table if not exists repo_connections (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  provider text not null,
  owner text not null,
  repo text not null,
  branch text not null,
  repo_url text not null,
  status text not null check (status in ('pending', 'indexed', 'error')),
  last_indexed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists repo_connections_workspace_url_idx
  on repo_connections(workspace_id, repo_url);

create table if not exists repo_chunks (
  id uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  repo_connection_id uuid not null references repo_connections(id) on delete cascade,
  path text not null,
  content text not null,
  summary text not null,
  symbols text[] not null default '{}',
  imports text[] not null default '{}',
  tags text[] not null default '{}',
  line_start integer not null,
  line_end integer not null,
  hash text not null,
  updated_at timestamptz not null default now()
);

create index if not exists repo_chunks_repo_path_idx
  on repo_chunks(repo_connection_id, path);

create table if not exists image_assets (
  id uuid primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  conversation_id uuid references conversations(id) on delete cascade,
  storage_path text not null,
  public_url text,
  file_name text not null,
  mime_type text not null,
  file_size_bytes integer not null,
  sha256 text not null,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);

create index if not exists image_assets_sha256_idx
  on image_assets(sha256);

create table if not exists image_analysis_runs (
  id uuid primary key,
  image_asset_id uuid not null references image_assets(id) on delete cascade,
  provider text not null,
  model text not null,
  status text not null check (status in ('pending', 'completed', 'error')),
  prompt_version text not null,
  raw_response jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists image_analysis_cache (
  id uuid primary key,
  image_asset_id uuid not null references image_assets(id) on delete cascade,
  sha256 text not null,
  bundle jsonb not null,
  bundle_version text not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists image_analysis_cache_sha256_idx
  on image_analysis_cache(sha256, bundle_version);

create table if not exists responses (
  id uuid primary key,
  title text not null,
  response text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_keys (
  id uuid primary key,
  key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists memory_entries_scope_last_used_idx
  on memory_entries(scope, last_used_at desc);

create index if not exists conversations_workspace_updated_idx
  on conversations(workspace_id, updated_at desc);

create index if not exists virtual_projects_conversation_updated_idx
  on virtual_projects(conversation_id, updated_at desc);

create index if not exists virtual_projects_workspace_updated_idx
  on virtual_projects(workspace_id, updated_at desc);

create unique index if not exists virtual_project_files_project_path_idx
  on virtual_project_files(project_id, path);
