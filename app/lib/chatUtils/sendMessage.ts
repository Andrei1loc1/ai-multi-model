

import { updateChatResponse } from '../database/firebase';

interface SendMessageParams {
    input: string;
    setLoading: (loading: boolean) => void;
    setResponse: (response: string | null) => void;
    setInput: (input: string | "") => void;
    model: string;
}

export async function sendMessage({input, setInput, setLoading, setResponse, model, stream = false}: SendMessageParams & { stream?: boolean }) : Promise<string | null> {
    if (!input.trim()) return null;

    setLoading(true);
    setInput("");
    setResponse(null);

    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            if (stream) {
                return new Promise((resolve, reject) => {
                    const eventSource = new EventSource(`/api/ai?prompt=${encodeURIComponent(input)}&model=${encodeURIComponent(model === "auto" ? "" : model)}&stream=true`);

                    let accumulatedResponse = '';

                    eventSource.onmessage = (event) => {
                        try {
                            const data = JSON.parse(event.data);
                            if (data.content) {
                                accumulatedResponse += data.content;
                                setResponse(accumulatedResponse);
                            }
                        } catch (e) {
                            // ignore
                        }
                    };

                    eventSource.onerror = (err) => {
                        eventSource.close();
                        reject(new Error("Streaming failed"));
                    };

                    eventSource.addEventListener('done', () => {
                        eventSource.close();
                        resolve(accumulatedResponse);
                    });
                });
            } else {
                const res = await fetch("/api/ai", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        prompt: input,
                        model: model === "auto" ? null : model,
                    }),
                });

                const data = await res.json();
                setResponse(data.text);
                return data.text;
            }
        } catch (err) {
            console.error(`Attempt ${attempt + 1} failed:`, err);
            attempt++;
            if (attempt >= maxRetries) {
                const errorMsg = "❌ Eroare la server după retry.";
                setResponse(errorMsg);
                return errorMsg;
            }
            // wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } finally {
            if (!stream) setLoading(false);
        }
    }
    return null;
}

export async function rewriteDocument(id: string, content: string, title: string, setLoading?: (loading: boolean) => void): Promise<string | null> {
    if (setLoading) setLoading(true);

    try {
        const prompt = `Rewrite this document as a detailed learning note. Make it easy to understand, organize the information efficiently and professionally. Use Markdown formatting with headers, bullet points, bold text, code blocks if needed, and other elements to make it very interesting and structured, not just plain text. Ensure it's comprehensive and engaging for learning purposes: ${content}`;
        const res = await fetch("/api/ai", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                prompt: prompt,
                model: "llama3_8b",
            }),
        });

        const data = await res.json();
        if (data.text) {
            updateChatResponse(id, data.text, title);
            return data.text;
        }
    } catch (err) {
        console.error(err);
    }

    if (setLoading) setLoading(false);
    return null;
}