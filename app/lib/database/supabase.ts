import { createClient } from "@supabase/supabase-js";

type JsonRecord = Record<string, unknown>;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function hasSupabaseConfig() {
    return Boolean(supabaseUrl && supabaseAnonKey && supabaseServiceRoleKey);
}

function requireValue(value: string | undefined, name: string) {
    if (!value) {
        throw new Error(`Missing required Supabase env: ${name}`);
    }
    return value;
}

export function getSupabaseBrowserClient() {
    return createClient(
        requireValue(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
        requireValue(supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}

export function getSupabaseServerClient() {
    return createClient(
        requireValue(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
        requireValue(supabaseServiceRoleKey, "SUPABASE_SERVICE_ROLE_KEY"),
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        }
    );
}

export type WorkspaceRecord = {
    id: string;
    name: string;
    description: string | null;
    active_repo_connection_id: string | null;
    created_at: string;
    updated_at: string;
};

export type ConversationRecord = {
    id: string;
    workspace_id: string | null;
    title: string;
    mode: "chat" | "agent";
    created_at: string;
    updated_at: string;
};

export type ConversationMessageRecord = {
    id: string;
    conversation_id: string;
    role: "user" | "assistant" | "system";
    content: string;
    metadata: JsonRecord | null;
    created_at: string;
};

export type MemoryEntryRecord = {
    id: string;
    workspace_id: string | null;
    conversation_id: string | null;
    repo_connection_id: string | null;
    scope: "user" | "workspace" | "repo" | "conversation";
    kind: "fact" | "preference" | "summary" | "decision" | "todo" | "codebase_note";
    content: string;
    importance: number;
    source_ref: string | null;
    last_used_at: string;
    created_at: string;
    metadata: JsonRecord | null;
};

export type RepoConnectionRecord = {
    id: string;
    workspace_id: string;
    provider: string;
    owner: string;
    repo: string;
    branch: string;
    repo_url: string;
    status: "pending" | "indexed" | "error";
    last_indexed_at: string | null;
    created_at: string;
    updated_at: string;
};

export type RepoChunkRecord = {
    id: string;
    workspace_id: string;
    repo_connection_id: string;
    path: string;
    content: string;
    summary: string;
    symbols: string[];
    imports: string[];
    tags: string[];
    line_start: number;
    line_end: number;
    hash: string;
    updated_at: string;
};

export type NoteRecord = {
    id: string;
    title: string;
    response: string;
    created_at: string;
    updated_at: string;
};

export type ImageAssetRecord = {
    id: string;
    workspace_id: string | null;
    conversation_id: string | null;
    storage_path: string;
    public_url: string | null;
    file_name: string;
    mime_type: string;
    file_size_bytes: number;
    sha256: string;
    width: number | null;
    height: number | null;
    created_at: string;
};

export type ImageAnalysisRunRecord = {
    id: string;
    image_asset_id: string;
    provider: string;
    model: string;
    status: "pending" | "completed" | "error";
    prompt_version: string;
    raw_response: JsonRecord | null;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
};

export type ImageAttachmentRecord = {
    id: string;
    conversation_id: string;
    message_id: string;
    storage_bucket: string;
    storage_path: string;
    original_name: string;
    mime_type: string;
    byte_size: number;
    content_hash: string;
    created_at: string;
    updated_at: string;
};

export type ImageAnalysisCacheRecord = {
    id: string;
    image_asset_id: string;
    sha256: string;
    bundle: JsonRecord;
    bundle_version: string;
    created_at: string;
    last_used_at: string;
};

export type VirtualProjectRecord = {
    id: string;
    workspace_id: string | null;
    conversation_id: string;
    source_message_id: string | null;
    kind: "react-app" | "python-script";
    title: string;
    prompt: string;
    status: "ready" | "running" | "error";
    entry_file: string;
    preview_mode: "react" | "pyodide";
    manifest_json: JsonRecord;
    last_run_summary: JsonRecord | null;
    last_error: string | null;
    created_at: string;
    updated_at: string;
};

export type VirtualProjectFileRecord = {
    id: string;
    project_id: string;
    path: string;
    language: string;
    content: string;
    is_entry: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
};
