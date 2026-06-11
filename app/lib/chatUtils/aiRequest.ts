import { AIModel } from "../AImodels/models";
import axios, { AxiosError } from "axios";
import { Readable } from "stream";

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
        let lastStatus: number | undefined;
        let lastMessage: string = "Unknown error";
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
                    // axios returns a Node.js Readable stream; Next route handlers expect a Web ReadableStream.
                    // Convert so callers can use `.getReader()` and pipe it through SSE utilities.
                    return Readable.toWeb(response.data as unknown as Readable) as ReadableStream<Uint8Array>;
                }
                const text = response.data?.choices?.[0]?.message?.content ?? "[No response received]";
                return { text, raw: response.data };
            } catch (error: unknown) {
                const err = error as AxiosError<{ error?: { message?: string, metadata?: { raw?: string } } }>;
                const status = err.response?.status;
                let currentMessage = (err.response?.data as any)?.error?.message || err.message || 'Unknown error';
                
                // If OpenRouter returns the generic "Provider returned error", try to find the more specific one in metadata
                const metadata = (err.response?.data as any)?.error?.metadata;
                if (currentMessage === "Provider returned error" && metadata?.raw) {
                    currentMessage = metadata.raw;
                }
                
                console.error(`[AI_REQUEST_KEY_FAILURE] Key ending in ...${key.slice(-4)} failed for ${model.id}. Status: ${status}. Message: ${currentMessage}`);
                
                lastErr = err;
                lastStatus = status;
                lastMessage = currentMessage;

                if (status === 401 || status === 403 || status === 429 || (status && status >= 500)) {
                    continue;
                }
                break;
            }
        }

        if (lastStatus === 401 || lastStatus === 403) {
            throw new AIRequestError(`Authorization error from OpenRouter (${lastStatus}). Please verify API key and account settings.`, {
                provider: "openrouter",
                status: lastStatus,
                retriable: false,
            });
        }
        
        console.error(`[AI_REQUEST_FINAL_FAILURE] All keys failed for ${model.id}. Last error: ${lastMessage}`);
        
        throw new AIRequestError(`AI Request failed (OpenRouter): ${lastMessage}`, {
            provider: "openrouter",
            status: lastStatus,
            retriable: isRetriableStatus(lastStatus),
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
                // axios returns a Node.js Readable stream; convert to Web ReadableStream for Next/edge consumers.
                return Readable.toWeb(response.data as unknown as Readable) as ReadableStream<Uint8Array>;
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

    if (model.provider === "ollama") {
        const key = model.apiKey || process.env.OLLAMA_API_KEY;
        const endpoint = model.endpoint || process.env.OLLAMA_ENDPOINT || "https://ollama.com/api/chat";

        if (!key) {
            throw new Error("Missing OLLAMA_API_KEY for Ollama Cloud.");
        }

        try {
            const response = await axios.post(
                endpoint,
                {
                    model: model.model,
                    messages: [
                        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                        { role: "user", content: prompt },
                    ],
                    ...(typeof temperature === "number" ? { options: { temperature } } : {}),
                    stream: stream,
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
                // Ollama streams newline-delimited JSON objects.
                // Convert Node.js Readable to Web ReadableStream and parse Ollama chunks.
                const nodeStream = response.data as unknown as Readable;
                const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

                const encoder = new TextEncoder();
                const decoder = new TextDecoder();

                return new ReadableStream({
                    async start(controller) {
                        const reader = webStream.getReader();
                        let buffer = "";
                        try {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                buffer += decoder.decode(value, { stream: true });
                                const lines = buffer.split("\n");
                                buffer = lines.pop() || "";

                                for (const line of lines) {
                                    if (!line.trim()) continue;
                                    try {
                                        const parsed = JSON.parse(line);
                                        const content = parsed.message?.content || "";
                                        const doneFlag = parsed.done || false;

                                        if (content) {
                                            // Emit in OpenAI-compatible SSE format so upstream code works
                                            controller.enqueue(
                                                encoder.encode(
                                                    `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
                                                )
                                            );
                                        }
                                        if (doneFlag) {
                                            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                                        }
                                    } catch {
                                        // Skip malformed lines
                                    }
                                }
                            }
                            // Process remaining buffer
                            if (buffer.trim()) {
                                try {
                                    const parsed = JSON.parse(buffer);
                                    const content = parsed.message?.content || "";
                                    if (content) {
                                        controller.enqueue(
                                            encoder.encode(
                                                `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`
                                            )
                                        );
                                    }
                                } catch {
                                    // ignore
                                }
                            }
                            controller.close();
                        } catch (err) {
                            controller.error(err);
                        }
                    },
                });
            }

            // Non-streaming Ollama response
            const rawContent = response.data?.message?.content;
            const text = typeof rawContent === "string" ? rawContent : "[No response received]";

            return { text, raw: response.data };
        } catch (error: unknown) {
            const err = error as AxiosError<{ error?: string; message?: string }>;
            const status = err.response?.status;
            const message =
                err.response?.data?.error ||
                err.response?.data?.message ||
                err.message ||
                "Unknown error";

            throw new AIRequestError(`AI Request failed (Ollama): ${message}`, {
                provider: "ollama",
                status,
                retriable: isRetriableStatus(status),
            });
        }
    }

    throw new Error(`Provider unknown: ${model.provider}`);
}
