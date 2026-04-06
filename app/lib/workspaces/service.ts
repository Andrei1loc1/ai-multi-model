import crypto from "crypto";
import { getSupabaseServerClient } from "@/app/lib/database/supabase";
import { scoreRecency, scoreTextMatch, uniqueTopByScore } from "@/app/lib/retrieval/scoring";
import { indexGitHubRepository, getGitHubRepoMetadata } from "@/app/lib/workspaces/github";
import type {
    ConversationMessageRecord,
    ConversationRecord,
    MemoryEntryRecord,
    NoteRecord,
    RepoChunkRecord,
    RepoConnectionRecord,
    VirtualProjectFileRecord,
    VirtualProjectRecord,
    WorkspaceRecord,
} from "@/app/lib/database/supabase";
import type {
    VirtualProject,
    VirtualProjectFile,
    VirtualProjectKind,
    VirtualProjectPreviewMode,
    VirtualProjectRunSummary,
    VirtualProjectStatus,
    VirtualProjectSummary,
} from "@/app/lib/workspaces/types";

function mapVirtualProjectFile(record: VirtualProjectFileRecord): VirtualProjectFile {
    return {
        id: record.id,
        projectId: record.project_id,
        path: record.path,
        language: record.language,
        content: record.content,
        isEntry: record.is_entry,
        sortOrder: record.sort_order,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    };
}

function mapVirtualProjectSummary(record: VirtualProjectRecord, fileCount: number): VirtualProjectSummary {
    return {
        id: record.id,
        workspaceId: record.workspace_id,
        conversationId: record.conversation_id,
        sourceMessageId: record.source_message_id,
        kind: record.kind,
        title: record.title,
        prompt: record.prompt,
        status: record.status,
        entryFile: record.entry_file,
        previewMode: record.preview_mode,
        fileCount,
        manifest: record.manifest_json || {},
        lastRunSummary: (record.last_run_summary as VirtualProjectRunSummary | null) || null,
        lastError: record.last_error,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    };
}

function mapVirtualProject(record: VirtualProjectRecord, files: VirtualProjectFileRecord[]): VirtualProject {
    return {
        ...mapVirtualProjectSummary(record, files.length),
        files: files.map(mapVirtualProjectFile),
    };
}

export async function listWorkspaces() {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("workspaces")
        .select("*")
        .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as WorkspaceRecord[];
}

export async function createWorkspace(name: string, description?: string | null) {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();
    const workspace = {
        id: crypto.randomUUID(),
        name,
        description: description || null,
        active_repo_connection_id: null,
        created_at: now,
        updated_at: now,
    };
    const { data, error } = await supabase.from("workspaces").insert(workspace).select("*").single();
    if (error) throw new Error(error.message);
    return data as WorkspaceRecord;
}

export async function deleteWorkspace(workspaceId: string) {
    const supabase = getSupabaseServerClient();

    const { error: conversationDeleteError } = await supabase
        .from("conversations")
        .delete()
        .eq("workspace_id", workspaceId);
    if (conversationDeleteError) throw new Error(conversationDeleteError.message);

    const { error } = await supabase.from("workspaces").delete().eq("id", workspaceId);
    if (error) throw new Error(error.message);
}

export async function listConversations(workspaceId?: string | null) {
    const supabase = getSupabaseServerClient();
    let query = supabase.from("conversations").select("*").order("updated_at", { ascending: false });
    if (workspaceId) {
        query = query.eq("workspace_id", workspaceId);
    }
    const { data, error } = await query.limit(30);
    if (error) throw new Error(error.message);
    return (data || []) as ConversationRecord[];
}

export async function getConversationById(conversationId: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return (data || null) as ConversationRecord | null;
}

export async function deleteConversation(conversationId: string) {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("conversations").delete().eq("id", conversationId);
    if (error) throw new Error(error.message);
}

export async function getConversationMessages(conversationId: string, limit = 12) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true })
        .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
}

export async function ensureConversation(params: {
    conversationId?: string | null;
    workspaceId?: string | null;
    title?: string;
    mode?: "chat" | "agent";
}) {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    if (params.conversationId) {
        const { data, error } = await supabase
            .from("conversations")
            .update({
                updated_at: now,
                workspace_id: params.workspaceId || null,
            })
            .eq("id", params.conversationId)
            .select("*")
            .single();
        if (!error && data) return data as ConversationRecord;
    }

    const title = params.title?.trim() || "New conversation";
    const conversation = {
        id: crypto.randomUUID(),
        workspace_id: params.workspaceId || null,
        title: title.slice(0, 120),
        mode: params.mode || "chat",
        created_at: now,
        updated_at: now,
    };
    const { data, error } = await supabase.from("conversations").insert(conversation).select("*").single();
    if (error) throw new Error(error.message);
    return data as ConversationRecord;
}

export async function addConversationMessage(
    conversationId: string,
    role: "user" | "assistant" | "system",
    content: string,
    metadata?: Record<string, unknown> | null
) {
    const supabase = getSupabaseServerClient();
    const message = {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        role,
        content,
        metadata: metadata || null,
        created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("conversation_messages")
        .insert(message)
        .select("*")
        .single();
    if (error) throw new Error(error.message);

    await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);

    return data as ConversationMessageRecord;
}

export async function getRelevantMemory(params: {
    query: string;
    workspaceId?: string | null;
    conversationId?: string | null;
    repoConnectionId?: string | null;
    limit?: number;
}) {
    const supabase = getSupabaseServerClient();
    let queryBuilder = supabase
        .from("memory_entries")
        .select("*")
        .order("importance", { ascending: false })
        .limit(200);

    const scopes = ["user"];
    if (params.workspaceId) scopes.push("workspace");
    if (params.conversationId) scopes.push("conversation");
    if (params.repoConnectionId) scopes.push("repo");
    queryBuilder = queryBuilder.in("scope", scopes);

    const { data, error } = await queryBuilder;
    if (error) throw new Error(error.message);

    const scored = ((data || []) as MemoryEntryRecord[])
        .map((entry) => ({
            ...entry,
            score:
                scoreTextMatch(params.query, `${entry.content} ${entry.kind} ${entry.source_ref || ""}`) +
                entry.importance * 2 +
                scoreRecency(entry.last_used_at),
        }))
        .filter((entry) => entry.score > 0);

    return uniqueTopByScore(scored, (entry) => entry.id, params.limit || 6);
}

export async function writeMemoryEntries(entries: Array<Omit<MemoryEntryRecord, "created_at" | "last_used_at">>) {
    if (!entries.length) return [];
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();
    const payload = entries.map((entry) => ({
        ...entry,
        created_at: now,
        last_used_at: now,
    }));
    const { data, error } = await supabase.from("memory_entries").insert(payload).select("*");
    if (error) throw new Error(error.message);
    return data || [];
}

export async function touchMemoryEntries(entryIds: string[]) {
    if (!entryIds.length) return;
    const supabase = getSupabaseServerClient();
    await supabase
        .from("memory_entries")
        .update({ last_used_at: new Date().toISOString() })
        .in("id", entryIds);
}

export async function connectGitHubRepo(workspaceId: string, repoUrl: string) {
    const supabase = getSupabaseServerClient();
    const repoMeta = await getGitHubRepoMetadata(repoUrl);
    const now = new Date().toISOString();
    const repoConnection = {
        id: crypto.randomUUID(),
        workspace_id: workspaceId,
        provider: "github",
        owner: repoMeta.owner,
        repo: repoMeta.repo,
        branch: repoMeta.branch,
        repo_url: repoUrl,
        status: "pending",
        last_indexed_at: null,
        created_at: now,
        updated_at: now,
    };

    const { data, error } = await supabase
        .from("repo_connections")
        .upsert(repoConnection, { onConflict: "workspace_id,repo_url" })
        .select("*")
        .single();
    if (error) throw new Error(error.message);

    await supabase
        .from("workspaces")
        .update({ active_repo_connection_id: data.id, updated_at: now })
        .eq("id", workspaceId);

    return data as RepoConnectionRecord;
}

export async function getWorkspaceRepoConnection(workspaceId: string) {
    const supabase = getSupabaseServerClient();
    const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("active_repo_connection_id")
        .eq("id", workspaceId)
        .maybeSingle();
    if (workspaceError) throw new Error(workspaceError.message);

    const activeRepoConnectionId = workspace?.active_repo_connection_id;

    if (activeRepoConnectionId) {
        const { data: activeRepoConnection, error: activeRepoError } = await supabase
            .from("repo_connections")
            .select("*")
            .eq("id", activeRepoConnectionId)
            .maybeSingle();
        if (activeRepoError) throw new Error(activeRepoError.message);
        if (activeRepoConnection) {
            return activeRepoConnection as RepoConnectionRecord;
        }
    }

    const { data, error } = await supabase
        .from("repo_connections")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return data as RepoConnectionRecord | null;
}

function scoreOverviewChunk(chunk: RepoChunkRecord) {
    const lowerPath = chunk.path.toLowerCase();
    let score = scoreRecency(chunk.updated_at);

    if (lowerPath === "readme.md" || lowerPath.endsWith("/readme.md")) score += 20;
    if (lowerPath === "package.json" || lowerPath.endsWith("/package.json")) score += 16;
    if (lowerPath.endsWith("next.config.ts") || lowerPath.endsWith("next.config.js")) score += 12;
    if (lowerPath.endsWith("tsconfig.json")) score += 10;
    if (lowerPath.endsWith("supabase/schema.sql")) score += 10;
    if (lowerPath.includes("/app/")) score += 8;
    if (lowerPath.includes("/src/")) score += 6;
    if (lowerPath.includes("/lib/")) score += 5;
    if (lowerPath.includes("/components/")) score += 5;
    if (lowerPath.endsWith("/route.ts") || lowerPath.endsWith("/route.js")) score += 4;
    if (lowerPath.endsWith("/page.tsx") || lowerPath.endsWith("/page.jsx")) score += 4;
    if (chunk.tags.includes("api")) score += 4;
    if (chunk.tags.includes("ui")) score += 3;
    if (chunk.tags.includes("db")) score += 4;
    if (chunk.tags.includes("react")) score += 3;
    if (chunk.line_start === 1) score += 4;

    const pathDepth = lowerPath.split("/").length;
    score += Math.max(0, 4 - pathDepth);

    return score;
}

export async function reindexWorkspaceRepo(workspaceId: string) {
    const supabase = getSupabaseServerClient();
    const repoConnection = await getWorkspaceRepoConnection(workspaceId);
    if (!repoConnection) throw new Error("No repo connected to this workspace.");

    try {
        const { chunks, filesIndexed } = await indexGitHubRepository(
            workspaceId,
            repoConnection.id,
            repoConnection.repo_url
        );

        await supabase.from("repo_chunks").delete().eq("repo_connection_id", repoConnection.id);
        if (chunks.length) {
            const { error } = await supabase.from("repo_chunks").insert(chunks);
            if (error) throw new Error(error.message);
        }

        const now = new Date().toISOString();
        await supabase
            .from("repo_connections")
            .update({ status: "indexed", last_indexed_at: now, updated_at: now })
            .eq("id", repoConnection.id);

        return { repoConnectionId: repoConnection.id, filesIndexed, chunksIndexed: chunks.length };
    } catch (error) {
        await supabase
            .from("repo_connections")
            .update({ status: "error", updated_at: new Date().toISOString() })
            .eq("id", repoConnection.id);
        throw error;
    }
}

export async function searchWorkspaceContext(workspaceId: string, query: string, limit = 10) {
    const supabase = getSupabaseServerClient();
    const repoConnection = await getWorkspaceRepoConnection(workspaceId);
    if (!repoConnection) return [];

    const { data, error } = await supabase
        .from("repo_chunks")
        .select("*")
        .eq("repo_connection_id", repoConnection.id)
        .limit(500);
    if (error) throw new Error(error.message);

    const scored = ((data || []) as RepoChunkRecord[])
        .map((chunk) => ({
            ...chunk,
            score:
                scoreTextMatch(query, chunk.path) * 2 +
                scoreTextMatch(query, chunk.summary) * 1.5 +
                scoreTextMatch(query, chunk.content) +
                scoreTextMatch(query, chunk.symbols.join(" ")) * 2 +
                scoreTextMatch(query, chunk.tags.join(" ")) +
                scoreRecency(chunk.updated_at),
        }))
        .filter((chunk) => chunk.score > 0);

    if (scored.length) {
        return uniqueTopByScore(scored, (chunk) => `${chunk.path}:${chunk.line_start}`, limit);
    }

    const overview = ((data || []) as RepoChunkRecord[])
        .map((chunk) => ({
            ...chunk,
            score: scoreOverviewChunk(chunk),
        }))
        .filter((chunk) => chunk.score > 0);

    return uniqueTopByScore(overview, (chunk) => chunk.path, limit);
}

export async function listNotes() {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("responses").select("*").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []) as NoteRecord[];
}

export async function createNote(title: string, response: string) {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();
    const note = {
        id: crypto.randomUUID(),
        title,
        response,
        created_at: now,
        updated_at: now,
    };
    const { data, error } = await supabase.from("responses").insert(note).select("*").single();
    if (error) throw new Error(error.message);
    return data as NoteRecord;
}

export async function updateNote(id: string, title: string, response: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("responses")
        .update({ title, response, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select("*")
        .single();
    if (error) throw new Error(error.message);
    return data as NoteRecord;
}

export async function deleteNote(id: string) {
    const supabase = getSupabaseServerClient();
    const { error } = await supabase.from("responses").delete().eq("id", id);
    if (error) throw new Error(error.message);
}

export async function createApiKey() {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();
    const key = crypto.randomUUID();
    const { error } = await supabase.from("api_keys").insert({
        id: crypto.randomUUID(),
        key,
        created_at: now,
    });
    if (error) throw new Error(error.message);
    return key;
}

export async function validateApiKey(apiKey: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("api_keys")
        .select("id")
        .eq("key", apiKey)
        .limit(1)
        .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
}

async function countVirtualProjectFiles(projectId: string) {
    const supabase = getSupabaseServerClient();
    const { count, error } = await supabase
        .from("virtual_project_files")
        .select("id", { count: "exact", head: true })
        .eq("project_id", projectId);

    if (error) throw new Error(error.message);
    return count || 0;
}

async function listVirtualProjectFileRecords(projectId: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("virtual_project_files")
        .select("*")
        .eq("project_id", projectId)
        .order("sort_order", { ascending: true })
        .order("path", { ascending: true });

    if (error) throw new Error(error.message);
    return (data || []) as VirtualProjectFileRecord[];
}

export async function createVirtualProject(params: {
    workspaceId?: string | null;
    conversationId: string;
    sourceMessageId?: string | null;
    kind: VirtualProjectKind;
    title: string;
    prompt: string;
    status?: VirtualProjectStatus;
    entryFile: string;
    previewMode: VirtualProjectPreviewMode;
    manifest?: Record<string, unknown> | null;
    lastRunSummary?: VirtualProjectRunSummary | null;
    lastError?: string | null;
    files: Array<{
        path: string;
        language: string;
        content: string;
        isEntry?: boolean;
        sortOrder?: number;
    }>;
}) {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();
    const project = {
        id: crypto.randomUUID(),
        workspace_id: params.workspaceId || null,
        conversation_id: params.conversationId,
        source_message_id: params.sourceMessageId || null,
        kind: params.kind,
        title: params.title.trim().slice(0, 160),
        prompt: params.prompt,
        status: params.status || "ready",
        entry_file: params.entryFile,
        preview_mode: params.previewMode,
        manifest_json: params.manifest || {},
        last_run_summary: params.lastRunSummary || null,
        last_error: params.lastError || null,
        created_at: now,
        updated_at: now,
    };

    const { data, error } = await supabase
        .from("virtual_projects")
        .insert(project)
        .select("*")
        .single();
    if (error) throw new Error(error.message);

    await replaceVirtualProjectFiles(data.id, params.files);
    return getVirtualProjectWithFiles(data.id);
}

export async function updateVirtualProject(
    projectId: string,
    updates: {
        sourceMessageId?: string | null;
        title?: string;
        prompt?: string;
        status?: VirtualProjectStatus;
        entryFile?: string;
        previewMode?: VirtualProjectPreviewMode;
        manifest?: Record<string, unknown> | null;
        lastRunSummary?: VirtualProjectRunSummary | null;
        lastError?: string | null;
    }
) {
    const supabase = getSupabaseServerClient();
    const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
    };

    if (updates.sourceMessageId !== undefined) payload.source_message_id = updates.sourceMessageId;
    if (updates.title !== undefined) payload.title = updates.title.trim().slice(0, 160);
    if (updates.prompt !== undefined) payload.prompt = updates.prompt;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.entryFile !== undefined) payload.entry_file = updates.entryFile;
    if (updates.previewMode !== undefined) payload.preview_mode = updates.previewMode;
    if (updates.manifest !== undefined) payload.manifest_json = updates.manifest || {};
    if (updates.lastRunSummary !== undefined) payload.last_run_summary = updates.lastRunSummary;
    if (updates.lastError !== undefined) payload.last_error = updates.lastError;

    const { data, error } = await supabase
        .from("virtual_projects")
        .update(payload)
        .eq("id", projectId)
        .select("*")
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
        return null;
    }

    const fileCount = await countVirtualProjectFiles(projectId);
    return mapVirtualProjectSummary(data as VirtualProjectRecord, fileCount);
}

export async function replaceVirtualProjectFiles(
    projectId: string,
    files: Array<{
        path: string;
        language: string;
        content: string;
        isEntry?: boolean;
        sortOrder?: number;
    }>
) {
    const supabase = getSupabaseServerClient();
    const now = new Date().toISOString();

    const { error: deleteError } = await supabase
        .from("virtual_project_files")
        .delete()
        .eq("project_id", projectId);
    if (deleteError) throw new Error(deleteError.message);

    if (files.length) {
        const payload = files.map((file, index) => ({
            id: crypto.randomUUID(),
            project_id: projectId,
            path: file.path,
            language: file.language,
            content: file.content,
            is_entry: Boolean(file.isEntry),
            sort_order: file.sortOrder ?? index,
            created_at: now,
            updated_at: now,
        }));

        const { error: insertError } = await supabase
            .from("virtual_project_files")
            .insert(payload);
        if (insertError) throw new Error(insertError.message);
    }

    const { error: projectError } = await supabase
        .from("virtual_projects")
        .update({ updated_at: now })
        .eq("id", projectId);
    if (projectError) throw new Error(projectError.message);

    const fileRecords = await listVirtualProjectFileRecords(projectId);
    return fileRecords.map(mapVirtualProjectFile);
}

export async function getVirtualProjectById(projectId: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("virtual_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
        return null;
    }

    const fileCount = await countVirtualProjectFiles(projectId);
    return mapVirtualProjectSummary(data as VirtualProjectRecord, fileCount);
}

export async function getVirtualProjectWithFiles(projectId: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("virtual_projects")
        .select("*")
        .eq("id", projectId)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
        return null;
    }

    const fileRecords = await listVirtualProjectFileRecords(projectId);
    return mapVirtualProject(data as VirtualProjectRecord, fileRecords);
}

export async function getLatestConversationVirtualProject(conversationId: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("virtual_projects")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) {
        return null;
    }

    const fileRecords = await listVirtualProjectFileRecords(data.id);
    return mapVirtualProject(data as VirtualProjectRecord, fileRecords);
}

export async function updateVirtualProjectRunState(
    projectId: string,
    params: {
        status: VirtualProjectStatus;
        lastRunSummary?: VirtualProjectRunSummary | null;
        lastError?: string | null;
    }
) {
    return updateVirtualProject(projectId, {
        status: params.status,
        lastRunSummary: params.lastRunSummary,
        lastError: params.lastError,
    });
}
