import {AIModel} from "./models";
import axios from "axios";

interface AIResponse {
    text: string;
    raw: any;
}

export async function aiRequest(model: AIModel, prompt: string): Promise<AIResponse> {
    if(model.provider === "openrouter"){
        try{
            const response = await axios.post(
                model.endpoint,
                {
                    model: model.model,
                    messages: [{ role: "user", content: prompt }],
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${model.apiKey}`,
                        "HTTP-Referer": "http://localhost:3000",
                        "X-Title": "Multi-Model AI App",
                    },
                }
            );
            const text = response.data?.choices?.[0]?.message?.content ?? "[No response recived]";
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