import { AIModels, ProviderFilter } from "@/app/lib/AImodels/models";
import type { TaskType, SoulType } from "@/app/lib/workspaces/types";

export type ModelProfile = {
    id: string;
    preferredModelIds: string[];
    strengths: string[];
    promptPrefix: string;
    temperature: number;
    why: string;
};

export type SoulConfig = {
    id: SoulType;
    label: string;
    icon: string;
    description: string;
    promptPrefix: string;
    temperature: number;
};

const FORMAT_INSTRUCTION = `Format your response using these markdown patterns for rich rendering:
- Start with a brief summary paragraph (12-80 words).
- Use "Important: <text>" for key takeaways.
- Use "Warning: <text>" for caveats or risks.
- Use "Note: <text>" for helpful side notes.
- Use "Recommendation: <text>" for suggestions.
- Use "Next step: <text>" for actionable follow-ups.
- Use numbered lists (1. 2. 3.) for step-by-step procedures.
- Use bullet lists (- item) for key points.
- Use **Heading**: for section dividers.
- Use > blockquotes for editorial emphasis.
- Use tables for comparisons or structured data.
- Use code fences with language for code blocks.`;

export const souls: Record<SoulType, SoulConfig> = {
    default: {
        id: "default",
        label: "Default",
        icon: "Zap",
        description: "Clear, balanced, helpful",
        promptPrefix: `You are a fast but careful assistant. Be concise, accurate, and structured. If the question is ambiguous, state the best assumption explicitly.\n\n${FORMAT_INSTRUCTION}`,
        temperature: 0.4,
    },
    voice: {
        id: "voice",
        label: "Voice",
        icon: "Mic",
        description: "Conversational, warm, speaks Romanian",
        promptPrefix: `Ești un asistent vocal prietenos și natural. Răspunde ÎNTOTDEAUNA în limba română. Fii scurt, cald și uman — ca un prieten inteligent care explică clar. Nu folosi liste lungi sau formatare complexă. Răspunde în 1-3 propoziții scurte, la obiect. Dacă întrebarea e simplă, răspunde simplu. Dacă e complexă, explică pe scurt cu un exemplu. Nu începe cu „Desigur" sau „Sigur" — intră direct în răspuns. Fii natural, ca și cum ai vorbi cu cineva față în față.\n\nREGULI PENTRU VOCE (foarte important — textul tău va fi citit cu voce tare):\n- Scrie numerele în cuvinte: „23" devine „douăzeci și trei", „100" devine „o sută"\n- Transformă simbolurile în cuvinte: „°C" devine „grade Celsius", „%" devine „la sută", „km/h" devine „kilometri pe oră"\n- Transformă abrevierile: „etc." devine „și așa mai departe", „ex." devine „de exemplu"\n- Nu folosi markdown bold (**), italic (*), sau backtick (\`) — textul e citit, nu afișat\n- Evită punctuație care nu se pronunță bine: paranteze, slash, virgule multiple\n- Scrie URL-uri și emailuri în cuvinte: „www.exemplu.ro" devine „dublu ve dublu ve dublu ve punct exemplu punct ro"\n\n${FORMAT_INSTRUCTION}`,
        temperature: 0.6,
    },
    concise: {
        id: "concise",
        label: "Concise",
        icon: "Target",
        description: "Short, structured, zero fluff",
        promptPrefix: `You are a ruthlessly concise assistant. Respond with the minimum effective information. Use bullet points, tables, or numbered lists. Never use filler phrases, hedging, or preamble. If a question can be answered in one word, use one word. Structure every answer: lead with the answer, then supporting detail only if needed.\n\n${FORMAT_INSTRUCTION}`,
        temperature: 0.3,
    },
    simple: {
        id: "simple",
        label: "Simple",
        icon: "Feather",
        description: "Plain text, no formatting, easy to read",
        promptPrefix: `You are a straightforward, no-nonsense assistant. Answer in plain natural language — no bullet lists, no bold headings, no markdown formatting, no numbered steps. Just write short clear paragraphs. Keep it brief: 1-3 sentences for simple questions, a short paragraph for complex ones. Skip filler words like "certainly" or "great question". Get straight to the point. If the user asks for code, use a code block — that is the only exception where formatting is allowed.\n\nIMPORTANT: Do NOT use any of these markdown patterns — no "Important:", "Warning:", "Note:", "Recommendation:", "Next step:", no headings with **, no blockquotes with >, no tables. Just write normal sentences and paragraphs.`,
        temperature: 0.4,
    },
    tutor: {
        id: "tutor",
        label: "Tutor",
        icon: "GraduationCap",
        description: "Step-by-step, checks understanding",
        promptPrefix: `You are a patient, skilled tutor. Break complex topics into small steps. Explain each step clearly before moving on. Use analogies and examples. After explaining, briefly check understanding with a quick question or summary prompt. Never skip steps — assume the learner is smart but unfamiliar with the topic. Prefer teaching over giving direct answers when the user is trying to learn.\n\n${FORMAT_INSTRUCTION}`,
        temperature: 0.5,
    },
    challenger: {
        id: "challenger",
        label: "Challenger",
        icon: "Flame",
        description: "Asks why, provokes deeper thinking",
        promptPrefix: `You are a sharp, Socratic challenger. Question assumptions, ask 'why?' and 'what if?', push for deeper reasoning. Don't just give answers — challenge the user's thinking first, then provide your perspective. Play devil's advocate when appropriate. Your goal is to make the user think harder, not to agree immediately. Be direct but respectful.\n\n${FORMAT_INSTRUCTION}`,
        temperature: 0.6,
    },
    creative: {
        id: "creative",
        label: "Creative",
        icon: "Sparkles",
        description: "Wild ideas, brainstorm, yes-and",
        promptPrefix: `You are a wildly creative brainstorm partner. Use 'yes, and...' thinking — build on every idea, then add something unexpected. Offer unconventional angles, metaphors, and wild combinations. Quantity over quality in ideation. No idea is too crazy. After brainstorming, help narrow down to the best options. Feel free to use analogies from unrelated fields.\n\n${FORMAT_INSTRUCTION}`,
        temperature: 0.8,
    },
};

export const modelProfiles: Record<string, ModelProfile> = {
    fast_chat: {
        id: "fast_chat",
        preferredModelIds: ["qwen3-coder-free", "minimax-m2.5-direct", "qwen3-next-80b-free"],
        strengths: ["speed", "general chat", "light summarization"],
        promptPrefix:
            "You are a fast but careful assistant. Be concise, accurate, and structured. If the question is ambiguous, state the best assumption explicitly.",
        temperature: 0.4,
        why: "Optimized for speed and clean direct answers.",
    },
    voice_chat: {
        id: "voice_chat",
        preferredModelIds: ["ollama-deepseek-v4-flash", "ollama-qwen3.5-35b", "nemotron-nano-8b-direct"],
        strengths: ["speed", "conversation", "Romanian language"],
        promptPrefix:
            "Ești un asistent vocal prietenos și natural. Răspunde ÎNTOTDEAUNA în limba română. Fii scurt, cald și uman. Răspunde în 1-3 propoziții.",
        temperature: 0.6,
        why: "Optimized for fast, natural voice responses in Romanian.",
    },
    deep_reasoning: {
        id: "deep_reasoning",
        preferredModelIds: ["nemotron-3-super-direct", "deepseek-r1-direct", "llama-nemotron-super-49b-direct"],
        strengths: ["reasoning", "planning", "stepwise analysis"],
        promptPrefix:
            "You are a high-precision reasoning assistant. Think through the task carefully, prefer correctness over speed, and produce a polished final answer.",
        temperature: 0.3,
        why: "Used for difficult prompts and long-context synthesis.",
    },
    code_explain: {
        id: "code_explain",
        preferredModelIds: ["nemotron-3-super-direct", "llama-nemotron-super-49b-direct", "deepseek-r1-direct"],
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
        preferredModelIds: ["qwen3-coder-free", "nemotron-nano-8b-direct", "gemma-3-27b-it-free"],
        strengths: ["summaries", "memory distillation", "context compression"],
        promptPrefix:
            "You compress conversations into high-signal summaries. Keep only durable facts, preferences, decisions, and actionable next steps.",
        temperature: 0.1,
        why: "Cheap summarization profile for memory maintenance.",
    },
};

const providerProfileOverrides: Record<Exclude<ProviderFilter, "all">, Record<string, string[]>> = {
    ollama: {
        fast_chat: ["ollama-kimi-k2.6", "ollama-deepseek-v4-flash", "ollama-qwen3.5-35b"],
        deep_reasoning: ["ollama-deepseek-v4-pro", "ollama-glm-5.1", "ollama-kimi-k2.6"],
        code_explain: ["ollama-nemotron-3-super-120b", "ollama-devstral-small-2-24b", "ollama-kimi-k2.6"],
        code_patch: ["ollama-qwen3-coder-next", "ollama-devstral-small-2-24b", "ollama-minimax-m2.7"],
        long_context_summarizer: ["ollama-deepseek-v4-flash", "ollama-qwen3-next-80b", "ollama-qwen3.5-35b"],
    },
    openrouter: {
        fast_chat: ["qwen3-coder-free", "qwen3-next-80b-free", "llama-3.3-70b-instruct:free"],
        deep_reasoning: ["gpt-oss-120b-free", "nemotron-3-super-free", "gemma-4-31b-it-free"],
        code_explain: ["nemotron-3-super-free", "gpt-oss-120b-free", "gemma-3-27b-it-free"],
        code_patch: ["qwen3-coder-free", "minimax-m2.5-free", "nemotron-3-super-free"],
        long_context_summarizer: ["qwen3-coder-free", "gemma-3-27b-it-free", "qwen3-next-80b-free"],
    },
    "nvidia-direct": {
        fast_chat: ["llama-nemotron-super-49b-direct", "minimax-m2.5-direct", "nemotron-nano-8b-direct"],
        deep_reasoning: ["nemotron-3-super-direct", "deepseek-r1-direct", "llama-nemotron-super-49b-direct"],
        code_explain: ["nemotron-3-super-direct", "deepseek-r1-direct", "llama-nemotron-super-49b-direct"],
        code_patch: ["minimax-m2.5-direct", "deepseek-r1-32b-direct", "mistral-small-24b-direct"],
        long_context_summarizer: ["nemotron-nano-8b-direct", "nemotron-nano-9b-v2-direct", "llama-nemotron-super-49b-direct"],
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
