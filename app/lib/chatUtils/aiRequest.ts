import {AIModel} from "../AImodels/models";
import axios from "axios";

interface AIResponse {
    text: string;
    raw: any;
}

export async function aiRequest(model: AIModel, prompt: string, stream: boolean = false): Promise<AIResponse | ReadableStream<Uint8Array>> {
    if(model.provider === "openrouter"){
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

        let lastErr: any = null;
        for (const key of availableKeys) {
            try {
                const response = await axios.post(
                    model.endpoint,
                    {
                        model: model.model,
                        messages: [{ role: "user", content: prompt }],
                        stream: stream,
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
            } catch (err: any) {
                lastErr = err;
                const status = err?.response?.status;
                const message = err?.response?.data?.error?.message || err?.message || 'Unknown error';
                console.error("OpenRouter error for a key:", { status, message });
                if (status === 401 || status === 403) {
                    continue;
                }
                break;
            }
        }
        const status = lastErr?.response?.status;
        const message = lastErr?.response?.data?.error?.message || lastErr?.message || 'Unknown error';
        if (status === 401 || status === 403) {
            throw new Error(`Authorization error from OpenRouter (${status}). Please verify API key and account settings.`);
        }
        throw new Error(`AI Request failed (OpenRouter): ${message}`);
    }
    throw new Error(`Provider necunoscut: ${model.provider}`);
}