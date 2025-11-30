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
        id: "grok-4.1-fast",
        provider: "openrouter",
        model: "x-ai/grok-4.1-fast:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_1,
        active: true,
    },
    {
        id: "llama-3-8b-instruct",
        provider: "openrouter",
        model: "meta-llama/llama-3-8b-instruct",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_2,
        active: true,
    },
    {
        id: "llama-3-8b-instruct-key2",
        provider: "openrouter",
        model: "meta-llama/llama-3-8b-instruct",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_1,
        active: true,
    },
    {
        id: "gemma-3-27b-it",
        provider: "openrouter",
        model: "google/gemma-3-27b-it:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_2,
        active: true,
    },
    {
        id: "gemma-3-27b-it-key2",
        provider: "openrouter",
        model: "google/gemma-3-27b-it:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_1,
        active: true,
    },
    {
        id: "gemini-2.0-flash",
        provider: "openrouter",
        model: "google/gemini-2.0-flash-exp:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_2,
        active: true,
    },
    {
        id: "gemini-2.0-flash-key2",
        provider: "openrouter",
        model: "google/gemini-2.0-flash-exp:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_1,
        active: true,
    },
    {
        id: "kat-coder-pro",
        provider: "openrouter",
        model: "kwaipilot/kat-coder-pro:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_3,
        active: true,
    },
    {
        id: "kat-coder-pro-key2",
        provider: "openrouter",
        model: "kwaipilot/kat-coder-pro:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_1,
        active: true,
    },
    {
        id: "deepseek-chat-v3",
        provider: "openrouter",
        model: "deepseek/deepseek-chat-v3-0324:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_4,
        active: true,
    },
    {
        id: "gpt-oss-20b",
        provider: "openrouter",
        model: "openai/gpt-oss-20b:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_5,
        active: true,
    },
    {
        id: "deepseek-r1t2-chimera",
        provider: "openrouter",
        model: "tngtech/deepseek-r1t2-chimera:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_4,
        active: true,
    },
    {
        id: "deepseek-r1t2-chimera-key2",
        provider: "openrouter",
        model: "tngtech/deepseek-r1t2-chimera:free",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        apiKey: process.env.OPENROUTER_API_KEY_5,
        active: true,
    },
];