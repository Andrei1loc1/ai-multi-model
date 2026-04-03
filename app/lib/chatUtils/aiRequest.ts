import { AIModel } from "../AImodels/models";
import axios, { AxiosError } from "axios";

interface AIResponse {
    text: string;
    raw: unknown;
}

export class AIRequestError extends Error {
    status?: number;
    provider: string;
    retriable: boolean;

    constructor(message: string, options: { provider: string; status?: number; retriable: boolean }) {
        super(message);
        this.name = "AIRequestError";
        this.status = options.status;
        this.provider = options.provider;
        this.retriable = options.retriable;
    }
}

function isRetriableStatus(status?: number) {
    if (typeof status !== "number") {
        return true;
    }

    return status === 408 || status === 409 || status === 423 || status === 425 || status === 429 || status >= 500;
}

type AIRequestInput =
    | string
    | {
          prompt: string;
          systemPrompt?: string;
          temperature?: number;
      };

export async function aiRequest(model: AIModel, input: AIRequestInput, stream: boolean = false): Promise<AIResponse | ReadableStream<Uint8Array>> {
    const prompt = typeof input === "string" ? input : input.prompt;
    const systemPrompt = typeof input === "string" ? undefined : input.systemPrompt;
    const temperature = typeof input === "string" ? undefined : input.temperature;

    if (model.provider === "openrouter") {
        const availableKeys = [
            model.apiKey,
            process.env.OPENROUTER_API_KEY_1,
            process.env.OPENROUTER_API_KEY_2,
            process.env.OPENROUTER_API_KEY_3,
            process.env.OPENROUTER_API_KEY_4,
            process.env.OPENROUTER_API_KEY_5,
        ]
            .filter((k): k is string => typeof k === 'string' && k.trim().length > 0)
            .filter((k, i, arr) => arr.indexOf(k) === i);

        if (availableKeys.length === 0) {
            throw new Error("Missing OpenRouter API key.");
        }

        const vercelUrl = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;
        const localUrl = "http://localhost:3000";
        const hasProtocol = (u?: string) => !!u && (u.startsWith("http://") || u.startsWith("https://"));
        const referer = hasProtocol(vercelUrl) ? (vercelUrl as string) : vercelUrl ? `https://${vercelUrl}` : localUrl;

        let lastErr: AxiosError | null = null;
        for (const key of availableKeys) {
            try {
                const response = await axios.post(
                    model.endpoint,
                    {
                        model: model.model,
                        messages: [
                            ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                            { role: "user", content: prompt }
                        ],
                        stream: stream,
                        ...(model.providerPreferences ? { provider: model.providerPreferences } : {}),
                        ...(typeof temperature === "number" ? { temperature } : {}),
                    },
                    {
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${key}`,
                            "Referer": referer,
                            "HTTP-Referer": referer,
                            "X-Title": "Multi-Model AI App",
                        },
                        responseType: stream ? 'stream' : 'json',
                    }
                );
                if (stream) {
                    return response.data;
                }
                const text = response.data?.choices?.[0]?.message?.content ?? "[No response received]";
                return { text, raw: response.data };
            } catch (error: unknown) {
                const err = error as AxiosError<{ error?: { message?: string } }>;
                lastErr = err;
                const status = err.response?.status;
                const message = err.response?.data?.error?.message || err.message || 'Unknown error';
                console.error("OpenRouter error for a key:", { status, message });
                if (status === 401 || status === 403) {
                    continue;
                }
                break;
            }
        }
        const status = lastErr?.response?.status;
        const message = (lastErr?.response?.data as { error?: { message?: string } } | undefined)?.error?.message || lastErr?.message || 'Unknown error';
        if (status === 401 || status === 403) {
            throw new AIRequestError(`Authorization error from OpenRouter (${status}). Please verify API key and account settings.`, {
                provider: "openrouter",
                status,
                retriable: false,
            });
        }
        throw new AIRequestError(`AI Request failed (OpenRouter): ${message}`, {
            provider: "openrouter",
            status,
            retriable: isRetriableStatus(status),
        });
    }

    if (model.provider === "nvidia-direct") {
        const key = model.apiKey || process.env.NVIDIA_API_KEY;
        if (!key) {
            throw new Error("Missing NVIDIA_API_KEY for NVIDIA Direct.");
        }

        try {
            const response = await axios.post(
                model.endpoint,
                {
                    model: model.model,
                    messages: [
                        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                        { role: "user", content: prompt },
                    ],
                    ...(typeof temperature === "number" ? { temperature } : {}),
                    ...(stream ? { stream: true } : {}),
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${key}`,
                    },
                    responseType: stream ? "stream" : "json",
                }
            );

            if (stream) {
                return response.data;
            }

            const rawContent = response.data?.choices?.[0]?.message?.content;
            const text =
                typeof rawContent === "string"
                    ? rawContent
                    : Array.isArray(rawContent)
                    ? rawContent
                          .map((part) =>
                              typeof part === "string"
                                  ? part
                                  : typeof part?.text === "string"
                                  ? part.text
                                  : ""
                          )
                          .join("")
                    : "[No response received]";

            return { text, raw: response.data };
        } catch (error: unknown) {
            const err = error as AxiosError<{ detail?: string; error?: string; message?: string }>;
            const status = err.response?.status;
            const message =
                err.response?.data?.detail ||
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                "Unknown error";

            if (status === 401 || status === 403) {
                throw new AIRequestError(`Authorization error from NVIDIA (${status}). Check NVIDIA_API_KEY and model access.`, {
                    provider: "nvidia-direct",
                    status,
                    retriable: false,
                });
            }

            throw new AIRequestError(`AI Request failed (NVIDIA Direct): ${message}`, {
                provider: "nvidia-direct",
                status,
                retriable: isRetriableStatus(status),
            });
        }
    }

    throw new Error(`Provider unknown: ${model.provider}`);
}
