import { AIModels, ProviderFilter } from "@/app/lib/AImodels/models";
import type { TaskType } from "@/app/lib/workspaces/types";

export type ModelProfile = {
    id: string;
    preferredModelIds: string[];
    strengths: string[];
    promptPrefix: string;
    temperature: number;
    why: string;
};

export const modelProfiles: Record<string, ModelProfile> = {
    fast_chat: {
        id: "fast_chat",
        preferredModelIds: ["step-3.5-flash-free", "minimax-m2.5-direct", "qwen3-next-80b-free"],
        strengths: ["speed", "general chat", "light summarization"],
        promptPrefix:
            "You are a fast but careful assistant. Be concise, accurate, and structured. If the question is ambiguous, state the best assumption explicitly.",
        temperature: 0.4,
        why: "Optimized for speed and clean direct answers.",
    },
    deep_reasoning: {
        id: "deep_reasoning",
        preferredModelIds: ["nemotron-3-super-direct", "qwen-3.6-plus-free", "deepseek-v3.2-direct"],
        strengths: ["reasoning", "planning", "stepwise analysis"],
        promptPrefix:
            "You are a high-precision reasoning assistant. Think through the task carefully, prefer correctness over speed, and produce a polished final answer.",
        temperature: 0.3,
        why: "Used for difficult prompts and long-context synthesis.",
    },
    code_explain: {
        id: "code_explain",
        preferredModelIds: ["nemotron-3-super-direct", "llama-nemotron-super-49b-direct", "qwen-3.6-plus-free"],
        strengths: ["code explanation", "repo understanding", "architecture"],
        promptPrefix:
            "You are a senior software engineer explaining code. Use the provided repository context, cite files when relevant, and avoid inventing missing code.",
        temperature: 0.2,
        why: "Best for explaining existing code and architecture.",
    },
    code_patch: {
        id: "code_patch",
        preferredModelIds: ["qwen3-coder-free", "minimax-m2.5-direct", "deepseek-r1-32b-direct"],
        strengths: ["patch planning", "implementation detail", "diff quality"],
        promptPrefix:
            "You are a coding agent preparing safe code changes. Use repository context, explain tradeoffs briefly, and output draft-ready edits when asked.",
        temperature: 0.2,
        why: "Best for coding tasks and draft patch proposals.",
    },
    long_context_summarizer: {
        id: "long_context_summarizer",
        preferredModelIds: ["step-3.5-flash-free", "nemotron-3-nano-direct", "gemma-3-27b-it-free"],
        strengths: ["summaries", "memory distillation", "context compression"],
        promptPrefix:
            "You compress conversations into high-signal summaries. Keep only durable facts, preferences, decisions, and actionable next steps.",
        temperature: 0.1,
        why: "Cheap summarization profile for memory maintenance.",
    },
};

const providerProfileOverrides: Record<Exclude<ProviderFilter, "all">, Record<string, string[]>> = {
    openrouter: {
        fast_chat: ["step-3.5-flash-free", "qwen3-next-80b-free", "qwen-3.6-plus-free"],
        deep_reasoning: ["qwen-3.6-plus-free", "nemotron-3-super-free", "gpt-oss-120b-free"],
        code_explain: ["nemotron-3-super-free", "qwen-3.6-plus-free", "gpt-oss-120b-free"],
        code_patch: ["qwen3-coder-free", "minimax-m2.5-free", "nemotron-3-super-free"],
        long_context_summarizer: ["step-3.5-flash-free", "gemma-3-27b-it-free", "qwen3-next-80b-free"],
    },
    "nvidia-direct": {
        fast_chat: ["llama-nemotron-super-49b-direct", "minimax-m2.5-direct", "nemotron-3-nano-direct"],
        deep_reasoning: ["nemotron-3-super-direct", "deepseek-v3.2-direct", "llama-nemotron-super-49b-direct"],
        code_explain: ["nemotron-3-super-direct", "deepseek-v3.2-direct", "llama-nemotron-super-49b-direct"],
        code_patch: ["minimax-m2.5-direct", "deepseek-r1-32b-direct", "codegemma-7b-direct"],
        long_context_summarizer: ["nemotron-3-nano-direct", "nemotron-nano-9b-v2-direct", "llama-nemotron-super-49b-direct"],
    },
};

export function getProfileForTask(
    taskType: TaskType,
    selectedModel?: string | null,
    selectedProvider: ProviderFilter = "all"
) {
    let profile: ModelProfile = modelProfiles.fast_chat;
    if (taskType === "coding") profile = modelProfiles.code_patch;
    if (taskType === "explain") profile = modelProfiles.code_explain;
    if (taskType === "plan" || taskType === "rewrite") profile = modelProfiles.deep_reasoning;
    if (taskType === "search") profile = modelProfiles.code_explain;

    const preferredCandidates =
        selectedProvider === "all"
            ? profile.preferredModelIds
            : providerProfileOverrides[selectedProvider]?.[profile.id] || profile.preferredModelIds;

    const preferredModelId =
        selectedModel && selectedModel !== "auto"
            ? selectedModel
            : preferredCandidates.find((candidate) =>
                  AIModels.some(
                      (model) =>
                          model.id === candidate &&
                          model.active &&
                          (selectedProvider === "all" || model.provider === selectedProvider)
                  )
              ) || "auto";

    return {
        profile: {
            ...profile,
            preferredModelIds: preferredCandidates,
        },
        preferredModelId,
    };
}
