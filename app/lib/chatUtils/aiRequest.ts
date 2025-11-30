import {AIModel} from "../AImodels/models";
import axios from "axios";

interface AIResponse {
    text: string;
    raw: any;
}

export async function aiRequest(model: AIModel, prompt: string, stream: boolean = false): Promise<AIResponse | ReadableStream<Uint8Array>> {
    if(model.provider === "openrouter"){
        try{
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
                        "Authorization": `Bearer ${model.apiKey}`,
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "Multi-Model AI App",
                    },
                    responseType: stream ? 'stream' : 'json',
                }
            );
            if (stream) {
                return response.data; // the stream
            }
            const text = response.data?.choices?.[0]?.message?.content ?? "[No response received]";
            return {
                text,
                raw: response.data,
            };
        } catch (err: any) {
            console.error("OpenRouter error:", err.response?.data || err);
            throw new Error("AI Request failed (OpenRouter).");
        }
    }
    throw new Error(`Provider necunoscut: ${model.provider}`);
}