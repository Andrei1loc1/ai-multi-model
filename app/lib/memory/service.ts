import crypto from "crypto";
import { getModel } from "@/app/lib/chatUtils/getModel";
import { aiRequest } from "@/app/lib/chatUtils/aiRequest";
import { modelProfiles } from "@/app/lib/orchestrator/modelProfiles";
import type { MemoryEntryRecord } from "@/app/lib/database/supabase";
import {
    addConversationMessage,
    getConversationMessages,
    touchMemoryEntries,
    writeMemoryEntries,
} from "@/app/lib/workspaces/service";

function extractStableMemories(message: string, answer: string) {
    const candidates: Array<{ kind: "fact" | "preference" | "decision" | "todo"; content: string; importance: number }> = [];
    const userLower = message.toLowerCase();

    if (/(prefer|vreau|always|default|folosesc|use)/i.test(message)) {
        candidates.push({
            kind: "preference",
            content: `User preference: ${message.slice(0, 220)}`,
            importance: 3,
        });
    }

    if (/(decide|chosen|alegem|vom folosi|use supabase|deploy pe vercel)/i.test(`${message} ${answer}`)) {
        candidates.push({
            kind: "decision",
            content: `Project decision: ${message.slice(0, 220)}`,
            importance: 4,
        });
    }

    if (/(todo|next|urmeaza|need to|should implement)/i.test(answer)) {
        candidates.push({
            kind: "todo",
            content: `Follow-up: ${answer.slice(0, 220)}`,
            importance: 2,
        });
    }

    if (/(project|repo|workspace|api|database)/i.test(userLower)) {
        candidates.push({
            kind: "fact",
            content: `Working context: ${message.slice(0, 220)}`,
            importance: 2,
        });
    }

    return candidates.slice(0, 4);
}

export async function persistConversationTurn(params: {
    conversationId: string;
    workspaceId?: string | null;
    repoConnectionId?: string | null;
    userMessage: string;
    userMetadata?: Record<string, unknown> | null;
    assistantAnswer: string;
    assistantMetadata?: Record<string, unknown> | null;
}) {
    const userMessageRecord = await addConversationMessage(
        params.conversationId,
        "user",
        params.userMessage,
        params.userMetadata || null
    );
    const assistantMessageRecord = await addConversationMessage(
        params.conversationId,
        "assistant",
        params.assistantAnswer,
        params.assistantMetadata || null
    );

    const memoryCandidates = extractStableMemories(params.userMessage, params.assistantAnswer);
    if (memoryCandidates.length) {
        const memoryEntries = await writeMemoryEntries(
            memoryCandidates.map((candidate) => ({
                id: crypto.randomUUID(),
                workspace_id: params.workspaceId || null,
                conversation_id: params.conversationId,
                repo_connection_id: params.repoConnectionId || null,
                scope: params.repoConnectionId ? "repo" : params.workspaceId ? "workspace" : "user",
                kind: candidate.kind,
                content: candidate.content,
                importance: candidate.importance,
                source_ref: params.conversationId,
                metadata: { auto: true },
            }))
        );
        return {
            userMessage: userMessageRecord,
            assistantMessage: assistantMessageRecord,
            memoryEntries,
        };
    }

    return {
        userMessage: userMessageRecord,
        assistantMessage: assistantMessageRecord,
        memoryEntries: [] as MemoryEntryRecord[],
    };
}

export async function maybeRefreshConversationSummary(params: {
    conversationId: string;
    workspaceId?: string | null;
    repoConnectionId?: string | null;
}) {
    const messages = await getConversationMessages(params.conversationId, 24);
    if (!messages.length || messages.length % 4 !== 0) {
        return null;
    }

    const modelId = modelProfiles.long_context_summarizer.preferredModelIds[0];
    const model = getModel(modelId);
    const transcript = messages
        .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
        .join("\n\n");

    try {
        const result = await aiRequest(
            model,
            {
                prompt: `Summarize this conversation for memory. Keep only durable facts, user preferences, decisions, and next steps.\n\n${transcript}`,
                systemPrompt: modelProfiles.long_context_summarizer.promptPrefix,
                temperature: modelProfiles.long_context_summarizer.temperature,
            },
            false
        );

        if ("text" in result && result.text.trim()) {
            const created = await writeMemoryEntries([
                {
                    id: crypto.randomUUID(),
                    workspace_id: params.workspaceId || null,
                    conversation_id: params.conversationId,
                    repo_connection_id: params.repoConnectionId || null,
                    scope: "conversation",
                    kind: "summary",
                    content: result.text.trim(),
                    importance: 4,
                    source_ref: params.conversationId,
                    metadata: { generated: true },
                },
            ]);

            return created;
        }
    } catch {
        return null;
    }

    return null;
}

export async function markMemoryAsUsed(entryIds: string[]) {
    await touchMemoryEntries(entryIds);
}
