import { AIRequestError, aiRequest } from "@/app/lib/chatUtils/aiRequest";
import { getModel, getModelById } from "@/app/lib/chatUtils/getModel";
import { buildAgentArtifacts } from "@/app/lib/agents/patch";
import { buildImageContextSources, linkImageAssetsToConversation } from "@/app/lib/images/service";
import { markMemoryAsUsed, maybeRefreshConversationSummary, persistConversationTurn } from "@/app/lib/memory/service";
import { getProfileForTask } from "@/app/lib/orchestrator/modelProfiles";
import { classifyTask } from "@/app/lib/orchestrator/taskClassifier";
import type { ContextSource, OrchestrateChatInput, OrchestrateChatOutput } from "@/app/lib/workspaces/types";
import {
    ensureConversation,
    getConversationMessages,
    getRelevantMemory,
    getWorkspaceRepoConnection,
    listNotes,
    searchWorkspaceContext,
} from "@/app/lib/workspaces/service";
import { scoreTextMatch, uniqueTopByScore } from "@/app/lib/retrieval/scoring";

function composeContextBlock(label: string, items: ContextSource[]) {
    if (!items.length) return "";
    return `${label}\n${items
        .map((item, index) => `[${index + 1}] ${item.label}\n${item.content}`)
        .join("\n\n")}`;
}

function composeRecentThreadBlock(
    messages: Array<{ role: string; content: string }>
) {
    if (!messages.length) return "";

    const normalized = messages
        .map((message) => {
            const roleLabel =
                message.role === "assistant"
                    ? "ASSISTANT"
                    : message.role === "system"
                    ? "SYSTEM"
                    : "USER";

            return `${roleLabel}: ${message.content.trim().slice(0, 1200)}`;
        })
        .filter((line) => line.trim().length > 0);

    if (!normalized.length) {
        return "";
    }

    return `Recent conversation thread:\n${normalized.join("\n\n")}`;
}

function isImageFocusedRequest(message: string) {
    return /(imagine|imagin[eia]|poza|poz[aei]|photo|picture|screenshot|ce vezi|ce este in|what is in|what do you see)/i.test(
        message
    );
}

async function getRelevantNotes(query: string) {
    const notes = await listNotes().catch(() => []);
    return uniqueTopByScore(
        notes
            .map((note) => ({
                type: "note" as const,
                label: note.title,
                content: note.response,
                score: scoreTextMatch(query, `${note.title} ${note.response}`),
            }))
            .filter((note) => note.score > 0),
        (note) => note.label,
        4
    );
}

function buildSuggestedActions(taskType: string, hasRepo: boolean) {
    const actions = [
        "Ask a follow-up for deeper analysis.",
        "Save the response as a durable note or project memory.",
    ];
    if (taskType === "coding" && hasRepo) {
        actions.push("Switch to Agent mode and refine the draft patch.");
    }
    if (!hasRepo) {
        actions.push("Connect a GitHub repo or attach notes for stronger context.");
    }
    return actions;
}

function sanitizeAssistantAnswer(answer: string) {
    return answer
        .replace(/<minimax:tool_call>[\s\S]*?<\/minimax:tool_call>/gi, "")
        .replace(/<invoke\b[\s\S]*?<\/invoke>/gi, "")
        .replace(/<\/?parameter\b[^>]*>/gi, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export async function orchestrateChat(input: OrchestrateChatInput): Promise<OrchestrateChatOutput> {
    const taskType = classifyTask(input.message, input.mode);
    const selectedProvider = input.selectedProvider || "all";
    const { profile, preferredModelId } = getProfileForTask(taskType, input.selectedModel, selectedProvider);
    const isAutoSelection = !input.selectedModel || input.selectedModel === "auto";
    const imageFocusedRequest = isImageFocusedRequest(input.message);

    const conversation = await ensureConversation({
        conversationId: input.conversationId,
        workspaceId: input.workspaceId,
        title: input.message.slice(0, 80),
        mode: input.mode,
    });

    if (input.attachments?.length) {
        await linkImageAssetsToConversation(
            input.attachments.map((attachment) => attachment.imageAssetId),
            conversation.id,
            input.workspaceId
        );
    }

    const repoConnection = input.workspaceId ? await getWorkspaceRepoConnection(input.workspaceId) : null;
    const [recentMessages, memoryEntries, repoContext, noteContext, imagePayload] = await Promise.all([
        getConversationMessages(conversation.id, 8),
        input.capabilities?.allowMemory === false
            ? Promise.resolve([])
            : getRelevantMemory({
                  query: input.message,
                  workspaceId: input.workspaceId,
                  conversationId: conversation.id,
                  repoConnectionId: repoConnection?.id || null,
                  limit: 6,
              }),
        input.capabilities?.allowRepo === false || !input.workspaceId || (imageFocusedRequest && taskType !== "coding")
            ? Promise.resolve([])
            : searchWorkspaceContext(input.workspaceId, input.message, taskType === "coding" ? 10 : 6),
        input.capabilities?.allowNotes === false || imageFocusedRequest ? Promise.resolve([]) : getRelevantNotes(input.message),
        input.attachments?.length
            ? buildImageContextSources(input.attachments, input.message, selectedProvider)
            : Promise.resolve({ contextSources: [], messageAttachments: [] }),
    ]);

    const contextSources: ContextSource[] = [
        ...memoryEntries.map((entry) => ({
            type: "memory" as const,
            label: `${entry.scope}:${entry.kind}`,
            content: entry.content,
            score: entry.score,
        })),
        ...repoContext.map((chunk) => ({
            type: "repo_chunk" as const,
            label: `${chunk.path}:${chunk.line_start}-${chunk.line_end}`,
            content: chunk.content,
            score: chunk.score,
        })),
        ...imagePayload.contextSources,
        ...noteContext,
    ].sort((a, b) => b.score - a.score);

    const contextBudget = taskType === "coding" ? 12 : 8;
    const selectedSources = contextSources.slice(0, contextBudget);

    const systemPrompt = [
        profile.promptPrefix,
        input.mode === "agent"
            ? "You are operating in Agent mode. Use repository evidence before making claims. Return practical next steps."
            : "You are operating in Chat mode. Prioritize clarity and usefulness.",
        "You do not have access to tools or a filesystem at runtime. Never emit tool-call markup, XML invocations, or pseudo-tool syntax.",
        taskType === "coding"
            ? "When coding, include understanding, files used, proposed changes, risks, and next step."
            : "When answering, stay structured and concise unless the question needs depth.",
        imagePayload.contextSources.length
            ? "One or more image attachments were pre-analyzed for you. Use the provided image context as trusted visual evidence."
            : "No image attachments were provided unless the context below says otherwise.",
        imageFocusedRequest
            ? "The user is asking about an image. Keep the answer grounded in the image context and do not bring in unrelated repo or note context."
            : "If multiple contexts are available, prefer only the ones directly relevant to the user request.",
        repoConnection
            ? "A repository is connected. Use only the repository context that is explicitly provided below. If it is limited, say that plainly instead of inventing tool usage."
            : "No repository is connected unless the context below says otherwise.",
        recentMessages.length
            ? "You are continuing an existing conversation. Resolve references like 'it', 'that', 'there', or follow-up questions using the recent thread below before changing topic."
            : "This may be the first turn of the conversation.",
    ].join("\n");

    const prompt = [
        "User request:",
        input.message,
        "",
        composeRecentThreadBlock(recentMessages),
        "",
        composeContextBlock("Relevant memory:", selectedSources.filter((source) => source.type === "memory")),
        "",
        composeContextBlock("Repository context:", selectedSources.filter((source) => source.type === "repo_chunk")),
        "",
        composeContextBlock("Image context:", selectedSources.filter((source) => source.type === "image")),
        "",
        composeContextBlock("Useful notes:", selectedSources.filter((source) => source.type === "note")),
    ]
        .filter(Boolean)
        .join("\n");

    const candidateModels = isAutoSelection
        ? profile.preferredModelIds
              .map((candidateId) => getModelById(candidateId, selectedProvider))
              .filter((model): model is NonNullable<typeof model> => Boolean(model))
        : [getModel(preferredModelId === "auto" ? undefined : preferredModelId, selectedProvider)];

    if (!candidateModels.length) {
        candidateModels.push(getModel(undefined, selectedProvider));
    }

    const attemptedModelIds = new Set<string>();
    let model = candidateModels[0];
    let response: Awaited<ReturnType<typeof aiRequest>> | null = null;
    let lastError: unknown = null;

    for (const candidateModel of candidateModels) {
        if (attemptedModelIds.has(candidateModel.id)) {
            continue;
        }

        attemptedModelIds.add(candidateModel.id);

        try {
            response = await aiRequest(
                candidateModel,
                {
                    prompt,
                    systemPrompt,
                    temperature: profile.temperature,
                },
                false
            );
            model = candidateModel;
            break;
        } catch (error: unknown) {
            lastError = error;
            const canFallback =
                isAutoSelection &&
                error instanceof AIRequestError &&
                error.retriable &&
                candidateModel.id !== candidateModels[candidateModels.length - 1]?.id;

            if (canFallback) {
                continue;
            }

            throw error;
        }
    }

    if (!response) {
        throw (lastError instanceof Error ? lastError : new Error("All auto model attempts failed."));
    }

    const answer = sanitizeAssistantAnswer("text" in response ? response.text : "");
    const executionMode = input.capabilities?.executionMode || "draft";
    const agent = input.mode === "agent" && taskType === "coding"
        ? buildAgentArtifacts({
              message: input.message,
              mode: executionMode,
              contextSources: selectedSources,
              answer,
          })
        : null;

    const memoryWrites = await persistConversationTurn({
        conversationId: conversation.id,
        workspaceId: input.workspaceId,
        repoConnectionId: repoConnection?.id || null,
        userMessage: input.message,
        userMetadata: imagePayload.messageAttachments.length
            ? {
                  attachments: imagePayload.messageAttachments,
              }
            : null,
        assistantAnswer: answer,
        assistantMetadata: {
            contextSources: selectedSources.map((source) => ({
                type: source.type,
                label: source.label,
                score: source.score,
            })),
            modelUsed: {
                id: model.id,
                provider: model.provider,
                profile: profile.id,
                why: profile.why,
            },
            taskType,
            attachments: imagePayload.messageAttachments,
            agent,
        },
    });

    await maybeRefreshConversationSummary({
        conversationId: conversation.id,
        workspaceId: input.workspaceId,
        repoConnectionId: repoConnection?.id || null,
    });
    await markMemoryAsUsed(memoryEntries.map((entry) => entry.id));

    return {
        answer,
        conversationId: conversation.id,
        modelUsed: {
            id: model.id,
            provider: model.provider,
            profile: profile.id,
            why: profile.why,
        },
        taskType,
        contextSources: selectedSources.map((source) => ({
            type: source.type,
            label: source.label,
            score: source.score,
        })),
        memoryWrites: memoryWrites.map((entry) => ({
            kind: entry.kind,
            content: entry.content,
        })),
        suggestedActions: buildSuggestedActions(taskType, Boolean(repoConnection)),
        agent,
    };
}
