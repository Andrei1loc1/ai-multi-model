import { AIRequestError, aiRequest } from "@/app/lib/chatUtils/aiRequest";
import { getModel, getModelById } from "@/app/lib/chatUtils/getModel";
import { buildAgentArtifacts } from "@/app/lib/agents/patch";
import { buildImageContextSources, linkImageAssetsToConversation } from "@/app/lib/images/service";
import { markMemoryAsUsed, maybeRefreshConversationSummary, persistConversationTurn } from "@/app/lib/memory/service";
import { getProfileForTask } from "@/app/lib/orchestrator/modelProfiles";
import { classifyTask } from "@/app/lib/orchestrator/taskClassifier";
import { validateVirtualProjectPayload } from "@/app/lib/virtualProjects/validate";
import type {
    ContextSource,
    OrchestrateChatInput,
    OrchestrateChatOutput,
    VirtualProject,
    VirtualProjectPayload,
    VirtualProjectReference,
} from "@/app/lib/workspaces/types";
import {
    createVirtualProject,
    ensureConversation,
    getConversationMessages,
    getRelevantMemory,
    getWorkspaceRepoConnection,
    listNotes,
    searchWorkspaceContext,
    updateVirtualProject,
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

function stripCodeBlocksForVirtualProject(answer: string) {
    const withoutCodeBlocks = answer
        .replace(/```[\s\S]*?```/g, "")
        .replace(/(^|\n)#{1,6}\s+`[^`]+\.(?:tsx|ts|jsx|js|css|json|py)`\s*(?=\n|$)/g, "")
        .replace(/(^|\n)#{1,6}\s+Codul Aplicației\s*(?=\n|$)/gi, "")
        .replace(/(^|\n)#{1,6}\s+Cum să rulezi\s*(?=\n|$)[\s\S]*$/i, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

    const note = "Codul proiectului este disponibil în panoul Virtual project, la tab-ul Files, și prin Download ZIP.";

    if (!withoutCodeBlocks) {
        return note;
    }

    if (withoutCodeBlocks.includes(note)) {
        return withoutCodeBlocks;
    }

    return `${withoutCodeBlocks}\n\n${note}`.trim();
}

function shouldGenerateVirtualProject(message: string, mode: OrchestrateChatInput["mode"]) {
    if (mode !== "agent") {
        return false;
    }

    return /(mini app|mini-app|mini aplicat|aplicatie|application|landing page|dashboard|react app|react project|python script|script python|automatizare|automation)/i.test(
        message
    );
}

function inferVirtualProjectKind(message: string): VirtualProjectPayload["kind"] {
    return /(python|script python|python script|automatizare|automation)/i.test(message)
        ? "python-script"
        : "react-app";
}

function extractJsonObject(text: string) {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fencedMatch?.[1]?.trim() || text.trim();
    const firstBrace = candidate.indexOf("{");
    const lastBrace = candidate.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
        throw new Error("Virtual project generation did not return a JSON object.");
    }

    return candidate.slice(firstBrace, lastBrace + 1);
}

function extractCodeBlocks(answer: string) {
    return Array.from(answer.matchAll(/```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g)).map((match) => ({
        language: (match[1] || "").trim().toLowerCase(),
        content: match[2].replace(/\n$/, ""),
        index: match.index || 0,
    }));
}

function inferFilePathFromContext(context: string, language: string, kind: VirtualProjectPayload["kind"]) {
    const explicitFileMatch = context.match(/`([^`]+\.(?:tsx|ts|jsx|js|css|json|py))`/i);
    const namedSectionMatch = context.match(/(?:^|\n)\s*([A-Za-z0-9_./-]+\.(?:tsx|ts|jsx|js|css|json|py))\s*$/im);
    const rawPath = explicitFileMatch?.[1] || namedSectionMatch?.[1] || null;

    if (rawPath) {
        const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
        if (normalized.includes("/")) {
            return normalized;
        }

        if (kind === "react-app" && !normalized.startsWith("src/")) {
            return `src/${normalized}`;
        }

        return normalized;
    }

    if (kind === "python-script") {
        return "main.py";
    }

    if (language === "css") {
        return "src/App.css";
    }

    return "src/App.jsx";
}

function buildFallbackVirtualProjectFromAnswer(message: string, answer: string): VirtualProjectPayload | null {
    const kind = inferVirtualProjectKind(message);
    const codeBlocks = extractCodeBlocks(answer);

    if (!codeBlocks.length) {
        return null;
    }

    if (kind === "python-script") {
        const pythonBlock = codeBlocks.find((block) => block.language === "py" || block.language === "python");
        if (!pythonBlock) {
            return null;
        }

        return {
            kind,
            title: "Python Script",
            summary: message,
            entryFile: "main.py",
            previewMode: "pyodide",
            files: [
                {
                    path: "main.py",
                    language: "python",
                    content: pythonBlock.content,
                },
            ],
        };
    }

    const files = codeBlocks
        .filter((block) => ["jsx", "tsx", "js", "ts", "css"].includes(block.language))
        .map((block) => {
            const context = answer.slice(Math.max(0, block.index - 220), block.index);
            const path = inferFilePathFromContext(context, block.language, kind);
            const language = block.language === "js" ? "jsx" : block.language || "jsx";

            return {
                path,
                language,
                content: block.content,
            };
        });

    if (!files.length) {
        return null;
    }

    const hasAppFile = files.some((file) => /src\/App\.(jsx|tsx|js|ts)$/i.test(file.path));
    const hasEntryFile = files.some((file) => /src\/main\.(jsx|tsx|js|ts)$/i.test(file.path));

    if (!hasAppFile) {
        const componentBlock = codeBlocks.find((block) => ["jsx", "tsx", "js", "ts"].includes(block.language));
        if (!componentBlock) {
            return null;
        }

        files.unshift({
            path: "src/App.jsx",
            language: "jsx",
            content: componentBlock.content,
        });
    }

    if (!hasEntryFile) {
        files.push({
            path: "src/main.jsx",
            language: "jsx",
            content: [
                "import React from 'react';",
                "import ReactDOM from 'react-dom/client';",
                "import App from './App.jsx';",
                "",
                "ReactDOM.createRoot(document.getElementById('root')).render(",
                "  <React.StrictMode>",
                "    <App />",
                "  </React.StrictMode>",
                ");",
            ].join("\n"),
        });
    }

    return {
        kind,
        title: "React Mini App",
        summary: message,
        entryFile: "src/App.jsx",
        previewMode: "react",
        files: files.filter(
            (file, index, current) => current.findIndex((candidate) => candidate.path === file.path) === index
        ),
    };
}

function toVirtualProjectReference(project: VirtualProject): VirtualProjectReference {
    return {
        id: project.id,
        kind: project.kind,
        title: project.title,
        status: project.status,
        entryFile: project.entryFile,
        previewMode: project.previewMode,
        updatedAt: project.updatedAt,
    };
}

async function maybeGenerateVirtualProject(params: {
    model: ReturnType<typeof getModel>;
    message: string;
    answer: string;
    prompt: string;
    systemPrompt: string;
}) {
    if (!shouldGenerateVirtualProject(params.message, "agent")) {
        return null;
    }

    const kind = inferVirtualProjectKind(params.message);
    const generationPrompt = [
        `Create a runnable browser-safe ${kind === "react-app" ? "React mini app" : "Python script"} as strict JSON.`,
        "Return only one JSON object with this exact shape:",
        '{"kind":"react-app|python-script","title":"string","summary":"string","entryFile":"string","previewMode":"react|pyodide","files":[{"path":"string","language":"string","content":"string"}]}',
        kind === "react-app"
            ? "Rules: multi-file is allowed, but only local imports plus react and react-dom package imports are allowed. Prefer src/App.tsx as entry."
            : "Rules: prefer a single entry file named main.py or app.py. Do not rely on external packages, shell access, or filesystem access.",
        "Keep the project small and focused. Do not include explanations outside JSON.",
        "",
        "User request:",
        params.message,
        "",
        "Assistant answer summary:",
        params.answer,
        "",
        "Relevant context:",
        params.prompt,
    ].join("\n");

    try {
        const response = await aiRequest(
            params.model,
            {
                prompt: generationPrompt,
                systemPrompt: `${params.systemPrompt}\nReturn only valid JSON. No markdown fences, no prose.`,
                temperature: 0.3,
            },
            false
        );

        const rawText = sanitizeAssistantAnswer("text" in response ? response.text : "");
        const parsed = JSON.parse(extractJsonObject(rawText)) as VirtualProjectPayload;
        return validateVirtualProjectPayload(parsed).project;
    } catch {
        const fallbackProject = buildFallbackVirtualProjectFromAnswer(params.message, params.answer);
        if (!fallbackProject) {
            throw new Error("Virtual project generation failed and no code-block fallback could be derived.");
        }

        return validateVirtualProjectPayload(fallbackProject).project;
    }
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
    let virtualProjectDetail: VirtualProject | null = null;

    if (shouldGenerateVirtualProject(input.message, input.mode)) {
        try {
            const generatedProject = await maybeGenerateVirtualProject({
                model,
                message: input.message,
                answer,
                prompt,
                systemPrompt,
            });

            if (generatedProject) {
                virtualProjectDetail = await createVirtualProject({
                    workspaceId: input.workspaceId,
                    conversationId: conversation.id,
                    sourceMessageId: null,
                    kind: generatedProject.kind,
                    title: generatedProject.title,
                    prompt: generatedProject.summary,
                    status: "ready",
                    entryFile: generatedProject.entryFile,
                    previewMode: generatedProject.previewMode,
                    manifest: {
                        generatedBy: "orchestrator",
                        modelId: model.id,
                        provider: model.provider,
                    },
                    lastRunSummary: null,
                    lastError: null,
                    files: generatedProject.files.map((file, index) => ({
                        ...file,
                        isEntry: file.path === generatedProject.entryFile,
                        sortOrder: index,
                    })),
                });
            }
        } catch (projectError) {
            console.error("Virtual project generation failed:", projectError);
        }
    }

    const virtualProject = virtualProjectDetail ? toVirtualProjectReference(virtualProjectDetail) : null;
    const assistantAnswerForDisplay = virtualProject ? stripCodeBlocksForVirtualProject(answer) : answer;
    const persistedTurn = await persistConversationTurn({
        conversationId: conversation.id,
        workspaceId: input.workspaceId,
        repoConnectionId: repoConnection?.id || null,
        userMessage: input.message,
        userMetadata: imagePayload.messageAttachments.length
            ? {
                  attachments: imagePayload.messageAttachments,
              }
            : null,
        assistantAnswer: assistantAnswerForDisplay,
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
            virtualProject,
        },
    });

    await maybeRefreshConversationSummary({
        conversationId: conversation.id,
        workspaceId: input.workspaceId,
        repoConnectionId: repoConnection?.id || null,
    });
    await markMemoryAsUsed(memoryEntries.map((entry) => entry.id));

    if (virtualProjectDetail && persistedTurn.assistantMessage.id) {
        await updateVirtualProject(virtualProjectDetail.id, {
            sourceMessageId: persistedTurn.assistantMessage.id,
        }).catch((projectLinkError) => {
            console.error("Failed to link virtual project to assistant message:", projectLinkError);
        });
    }

    return {
        answer: assistantAnswerForDisplay,
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
        memoryWrites: persistedTurn.memoryEntries.map((entry) => ({
            kind: entry.kind,
            content: entry.content,
        })),
        suggestedActions: buildSuggestedActions(taskType, Boolean(repoConnection)),
        agent,
        virtualProject,
    };
}
