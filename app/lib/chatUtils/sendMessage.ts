

interface SendMessageParams {
    input: string;
    setLoading: (loading: boolean) => void;
    setResponse: (response: string | null) => void;
    setInput: (input: string | "") => void;
    model: string;
}

export async function sendMessage({input, setInput, setLoading, setResponse, model}: SendMessageParams) : Promise<void> {
    if (!input.trim()) return;

    setLoading(true);
    setInput("");
    setResponse(null);

    try {
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
    } catch (err) {
        console.error(err);
        setResponse("❌ Eroare la server.");
    }

    setLoading(false);
}