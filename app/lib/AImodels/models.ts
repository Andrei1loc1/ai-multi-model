export type AIModel = {
    id: string;
    provider: string;
    model: string;
    endpoint: string;
    apiKey: string | undefined;
    active: boolean;
}
export const AIModels: AIModel[] = [
    {
        id: "grok",
        provider: "openrouter",
        model: "x-ai/grok-4.1-fast:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: "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",
        active: true,
    },
    {
        id: "llama3_8b",
        provider: "openrouter",
        model: "meta-llama/llama-3-8b-instruct",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY,
        active: true,
    },
    {
        id: "gemma7b",
        provider: "openrouter",
        model: "google/gemma-3-27b-it:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: "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",
        active: true,
    },
    {
        id: "gemini20flash",
        provider: "openrouter",
        model: "google/gemini-2.0-flash-exp:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: "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",
        active: true,
    },
    {
        id: "katcoder",
        provider: "openrouter",
        model: "kwaipilot/kat-coder-pro:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: "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",
        active: true,
    },
    {
        id: "deepseekv3",
        provider: "openrouter",
        model: "deepseek/deepseek-chat-v3-0324:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: "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",
        active: true,
    },
    {
        id: "gpt20boss",
        provider: "openrouter",
        model: "openai/gpt-oss-20b:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: "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",
        active: true,
    },
];