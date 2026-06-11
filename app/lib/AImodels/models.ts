export type ModelProvider = "openrouter" | "nvidia-direct" | "ollama";
export type ProviderFilter = "all" | ModelProvider;

export type AIModel = {
    id: string;
    label: string;
    shortLabel: string;
    provider: ModelProvider;
    model: string;
    endpoint: string;
    apiKey: string | undefined;
    active: boolean;
    rank: number;
    providerPreferences?: {
        only?: string[];
        order?: string[];
        allowFallbacks?: boolean;
    };
};

export const ProviderOptions: Array<{ id: ProviderFilter; label: string }> = [
    { id: "ollama", label: "Ollama Cloud" },
];

const ollamaEndpoint = process.env.OLLAMA_ENDPOINT || "https://ollama.com/api/chat";
const ollamaKey = process.env.OLLAMA_API_KEY;

export const AIModels: AIModel[] = [
    {
        id: "ollama-kimi-k2.6",
        label: "Kimi K2.6 (Ollama Cloud)",
        shortLabel: "Kimi K2.6",
        provider: "ollama",
        model: "kimi-k2.6",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 1,
    },
    {
        id: "ollama-deepseek-v4-pro",
        label: "DeepSeek V4 Pro (Ollama Cloud)",
        shortLabel: "DeepSeek V4 Pro",
        provider: "ollama",
        model: "deepseek-v4-pro",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 2,
    },
    {
        id: "ollama-deepseek-v4-flash",
        label: "DeepSeek V4 Flash (Ollama Cloud)",
        shortLabel: "DeepSeek V4 Flash",
        provider: "ollama",
        model: "deepseek-v4-flash",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 3,
    },
    {
        id: "ollama-gemma4-31b",
        label: "Gemma 4 31B (Ollama Cloud)",
        shortLabel: "Gemma 4 31B",
        provider: "ollama",
        model: "gemma4:31b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 4,
    },
    {
        id: "ollama-qwen3.5-122b",
        label: "Qwen 3.5 122B (Ollama Cloud)",
        shortLabel: "Qwen 3.5 122B",
        provider: "ollama",
        model: "qwen3.5:122b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 5,
    },
    {
        id: "ollama-qwen3.5-35b",
        label: "Qwen 3.5 35B (Ollama Cloud)",
        shortLabel: "Qwen 3.5 35B",
        provider: "ollama",
        model: "qwen3.5:35b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 6,
    },
    {
        id: "ollama-glm-5.1",
        label: "GLM 5.1 (Ollama Cloud)",
        shortLabel: "GLM 5.1",
        provider: "ollama",
        model: "glm-5.1",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 7,
    },
    {
        id: "ollama-minimax-m2.7",
        label: "MiniMax M2.7 (Ollama Cloud)",
        shortLabel: "MiniMax M2.7",
        provider: "ollama",
        model: "minimax-m2.7",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 8,
    },
    {
        id: "ollama-nemotron-3-super-120b",
        label: "Nemotron 3 Super 120B (Ollama Cloud)",
        shortLabel: "Nemotron 3 Super 120B",
        provider: "ollama",
        model: "nemotron-3-super:120b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 9,
    },
    {
        id: "ollama-qwen3-coder-next",
        label: "Qwen3 Coder Next (Ollama Cloud)",
        shortLabel: "Qwen3 Coder Next",
        provider: "ollama",
        model: "qwen3-coder-next",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 10,
    },
    {
        id: "ollama-devstral-small-2-24b",
        label: "Devstral Small 2 24B (Ollama Cloud)",
        shortLabel: "Devstral Small 2 24B",
        provider: "ollama",
        model: "devstral-small-2:24b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 11,
    },
    {
        id: "ollama-gemini-3-flash",
        label: "Gemini 3 Flash (Ollama Cloud)",
        shortLabel: "Gemini 3 Flash",
        provider: "ollama",
        model: "gemini-3-flash-preview",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 12,
    },
    {
        id: "ollama-qwen3-next-80b",
        label: "Qwen3 Next 80B (Ollama Cloud)",
        shortLabel: "Qwen3 Next 80B",
        provider: "ollama",
        model: "qwen3-next:80b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 13,
    },
    {
        id: "ollama-glm-5",
        label: "GLM 5 (Ollama Cloud)",
        shortLabel: "GLM 5",
        provider: "ollama",
        model: "glm-5",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 14,
    },
    {
        id: "ollama-minimax-m2.5",
        label: "MiniMax M2.5 (Ollama Cloud)",
        shortLabel: "MiniMax M2.5",
        provider: "ollama",
        model: "minimax-m2.5",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 15,
    },
    {
        id: "ollama-deepseek-v3.2",
        label: "DeepSeek V3.2 (Ollama Cloud)",
        shortLabel: "DeepSeek V3.2",
        provider: "ollama",
        model: "deepseek-v3.2",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 16,
    },
    {
        id: "ollama-ministral-3-8b",
        label: "Ministral 3 8B (Ollama Cloud)",
        shortLabel: "Ministral 3 8B",
        provider: "ollama",
        model: "ministral-3:8b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 17,
    },
    {
        id: "ollama-rnj-1-8b",
        label: "Rnj 1 8B (Ollama Cloud)",
        shortLabel: "Rnj 1 8B",
        provider: "ollama",
        model: "rnj-1:8b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 18,
    },
    {
        id: "ollama-nemotron-3-nano-30b",
        label: "Nemotron 3 Nano 30B (Ollama Cloud)",
        shortLabel: "Nemotron 3 Nano 30B",
        provider: "ollama",
        model: "nemotron-3-nano:30b",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 19,
    },
    {
        id: "ollama-gpt-oss-120b-cloud",
        label: "GPT OSS 120B Cloud (Ollama Cloud)",
        shortLabel: "GPT OSS 120B Cloud",
        provider: "ollama",
        model: "gpt-oss:120b-cloud",
        endpoint: ollamaEndpoint,
        apiKey: ollamaKey,
        active: true,
        rank: 22,
    },
];

export const PublicModels: AIModel[] = AIModels.filter((model) => model.active).sort(
    (a, b) => a.rank - b.rank
);

export function getModelsForProvider(provider: ProviderFilter) {
    return provider === "all" ? PublicModels : PublicModels.filter((model) => model.provider === provider);
}

export const PublicModelIds: string[] = PublicModels.map((model) => model.id);
