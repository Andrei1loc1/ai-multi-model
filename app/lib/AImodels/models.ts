export type ModelProvider = "openrouter" | "nvidia-direct";
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
    { id: "all", label: "All Providers" },
    { id: "openrouter", label: "OpenRouter" },
    { id: "nvidia-direct", label: "NVIDIA Direct" },
];

const openRouterEndpoint = "https://openrouter.ai/api/v1/chat/completions";
const nvidiaEndpoint = "https://integrate.api.nvidia.com/v1/chat/completions";

const openRouterKey = process.env.OPENROUTER_API_KEY_1;
const nvidiaKey = process.env.NVIDIA_API_KEY;

export const AIModels: AIModel[] = [
    {
        id: "qwen3-coder-free",
        label: "Qwen3 Coder 480B",
        shortLabel: "Qwen3 Coder 480B",
        provider: "openrouter",
        model: "qwen/qwen3-coder:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 1,
    },
    {
        id: "minimax-m2.5-free",
        label: "MiniMax M2.5",
        shortLabel: "MiniMax M2.5",
        provider: "openrouter",
        model: "minimax/minimax-m2.5:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 2,
    },
    {
        id: "minimax-m2.7-direct",
        label: "MiniMax M2.7 (NVIDIA Direct)",
        shortLabel: "MiniMax M2.7 Direct",
        provider: "nvidia-direct",
        model: "minimaxai/minimax-m2.7",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 3,
    },
    {
        id: "nemotron-3-super-direct",
        label: "NVIDIA Nemotron 3 Super",
        shortLabel: "NVIDIA Nemotron 3 Super",
        provider: "nvidia-direct",
        model: "nvidia/nemotron-3-super",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 4,
    },
    {
        id: "llama-nemotron-super-49b-direct",
        label: "Llama 3.3 Nemotron Super 49B v1.5",
        shortLabel: "Llama Nemotron 49B v1.5",
        provider: "nvidia-direct",
        model: "nvidia/llama-3.3-nemotron-super-49b-v1.5",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 5,
    },
    {
        id: "deepseek-v3.2-direct",
        label: "DeepSeek V3.2 (NVIDIA Direct)",
        shortLabel: "DeepSeek V3.2 Direct",
        provider: "nvidia-direct",
        model: "deepseek-ai/deepseek-v3.2",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 6,
    },
    {
        id: "nemotron-3-super-free",
        label: "NVIDIA Nemotron 3 Super (via OpenRouter)",
        shortLabel: "Nemotron 3 Super via OR",
        provider: "openrouter",
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 7,
        providerPreferences: {
            only: ["nvidia"],
            allowFallbacks: false,
        },
    },
    {
        id: "deepseek-r1-32b-direct",
        label: "DeepSeek R1 Distill Qwen 32B (NVIDIA Direct)",
        shortLabel: "DeepSeek R1 32B Direct",
        provider: "nvidia-direct",
        model: "deepseek-ai/deepseek-r1-distill-qwen-32b",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 8,
    },
    {
        id: "trinity-large-preview-free",
        label: "Trinity Large Preview",
        shortLabel: "Trinity Large Preview",
        provider: "openrouter",
        model: "arcee-ai/trinity-large-preview:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 9,
    },
    {
        id: "gpt-oss-120b-free",
        label: "GPT OSS 120B",
        shortLabel: "GPT OSS 120B",
        provider: "openrouter",
        model: "openai/gpt-oss-120b:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 10,
    },
    {
        id: "qwen3-next-80b-free",
        label: "Qwen3 Next 80B",
        shortLabel: "Qwen3 Next 80B",
        provider: "openrouter",
        model: "qwen/qwen3-next-80b-a3b-instruct:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 11,
    },
    {
        id: "nemotron-3-nano-direct",
        label: "NVIDIA Nemotron 3 Nano 30B",
        shortLabel: "NVIDIA Nemotron 3 Nano 30B",
        provider: "nvidia-direct",
        model: "nvidia/nemotron-3-nano",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 12,
    },
    {
        id: "codegemma-7b-direct",
        label: "CodeGemma 7B (NVIDIA Direct)",
        shortLabel: "CodeGemma 7B Direct",
        provider: "nvidia-direct",
        model: "google/codegemma-7b",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 13,
    },
    {
        id: "gpt-oss-20b-free",
        label: "GPT OSS 20B",
        shortLabel: "GPT OSS 20B",
        provider: "openrouter",
        model: "openai/gpt-oss-20b:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 14,
    },
    {
        id: "gemma-3-27b-it-free",
        label: "Gemma 3 27B IT",
        shortLabel: "Gemma 3 27B IT",
        provider: "openrouter",
        model: "google/gemma-3-27b-it:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 15,
    },
    {
        id: "nemotron-3-nano-30b-free",
        label: "NVIDIA Nemotron 3 Nano 30B (via OpenRouter)",
        shortLabel: "Nemotron 3 Nano 30B via OR",
        provider: "openrouter",
        model: "nvidia/nemotron-3-nano-30b-a3b:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 16,
        providerPreferences: {
            only: ["nvidia"],
            allowFallbacks: false,
        },
    },
    {
        id: "nemotron-nano-9b-v2-direct",
        label: "NVIDIA Nemotron Nano 9B V2",
        shortLabel: "NVIDIA Nemotron Nano 9B V2",
        provider: "nvidia-direct",
        model: "nvidia/nvidia-nemotron-nano-9b-v2",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 17,
    },
    {
        id: "nemotron-nano-9b-v2-free",
        label: "NVIDIA Nemotron Nano 9B V2 (via OpenRouter)",
        shortLabel: "Nemotron Nano 9B V2 via OR",
        provider: "openrouter",
        model: "nvidia/nemotron-nano-9b-v2:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 18,
        providerPreferences: {
            only: ["nvidia"],
            allowFallbacks: false,
        },
    },
    {
        id: "llama-3.3-70b-free",
        label: "Llama 3.3 70B",
        shortLabel: "Llama 3.3 70B",
        provider: "openrouter",
        model: "meta-llama/llama-3.3-70b-instruct:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 19,
    },
    {
        id: "gemma-4-31b-it-free",
        label: "Gemma 4 31B IT",
        shortLabel: "Gemma 4 31B",
        provider: "openrouter",
        model: "google/gemma-4-31b-it:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 20,
    },
    {
        id: "liquid-lfm-2.5-1.2b-thinking-free",
        label: "Liquid LFM 2.5 1.2B Thinking",
        shortLabel: "Liquid LFM 1.2B Thinking",
        provider: "openrouter",
        model: "liquid/lfm-2.5-1.2b-thinking:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 21,
    },
    {
        id: "hermes-3-llama-3.1-405b-free",
        label: "Hermes 3 Llama 3.1 405B",
        shortLabel: "Hermes 3 405B",
        provider: "openrouter",
        model: "nousresearch/hermes-3-llama-3.1-405b:free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 22,
    },
    {
        id: "phi-4-mini-flash-reasoning-direct",
        label: "Phi 4 Mini Flash Reasoning (NVIDIA Direct)",
        shortLabel: "Phi 4 Mini Reasoning Direct",
        provider: "nvidia-direct",
        model: "microsoft/phi-4-mini-flash-reasoning",
        endpoint: nvidiaEndpoint,
        apiKey: nvidiaKey,
        active: true,
        rank: 23,
    },
    {
        id: "openrouter-free",
        label: "OpenRouter Free Router",
        shortLabel: "OpenRouter Free Router",
        provider: "openrouter",
        model: "openrouter/free",
        endpoint: openRouterEndpoint,
        apiKey: openRouterKey,
        active: true,
        rank: 24,
    },
];

export const PublicModels: AIModel[] = AIModels.filter((model) => model.active).sort(
    (a, b) => a.rank - b.rank
);

export function getModelsForProvider(provider: ProviderFilter) {
    return provider === "all" ? PublicModels : PublicModels.filter((model) => model.provider === provider);
}

export const PublicModelIds: string[] = PublicModels.map((model) => model.id);
