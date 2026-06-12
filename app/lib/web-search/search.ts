type SearchResult = { title: string; snippet: string; url: string };

export async function exaSearch(query: string): Promise<SearchResult[]> {
    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await fetch("https://api.exa.ai/search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey,
            },
            body: JSON.stringify({
                query,
                type: "auto",
                numResults: 6,
                contents: {
                    text: { maxCharacters: 500 },
                },
            }),
            signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) {
            console.error("Exa search error:", response.status, await response.text().catch(() => ""));
            return [];
        }

        const data = await response.json() as {
            results?: Array<{
                title?: string;
                url?: string;
                text?: string;
            }>;
        };

        if (!data.results?.length) return [];

        return data.results
            .filter((r) => r.title && r.url)
            .map((r) => ({
                title: r.title || "",
                snippet: r.text?.slice(0, 500) || "",
                url: r.url || "",
            }));
    } catch (error) {
        console.error("Exa search failed:", error instanceof Error ? error.message : "unknown");
        return [];
    }
}

export async function wikipediaSearch(query: string): Promise<SearchResult[]> {
    try {
        const searchUrl = `https://ro.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=5`;
        const response = await fetch(searchUrl, {
            headers: { "User-Agent": "AI-Multi-Model/1.0" },
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return [];

        const data = await response.json() as {
            query?: { search?: Array<{ title: string; snippet: string }> };
        };

        const results: SearchResult[] = [];
        for (const item of data.query?.search || []) {
            results.push({
                title: item.title,
                snippet: item.snippet.replace(/<[^>]+>/g, "").trim().slice(0, 300),
                url: `https://ro.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
            });
        }

        if (results.length > 0) return results;

        const enUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=1&srlimit=5`;
        const enResponse = await fetch(enUrl, {
            headers: { "User-Agent": "AI-Multi-Model/1.0" },
            signal: AbortSignal.timeout(8000),
        });
        if (!enResponse.ok) return [];

        const enData = await enResponse.json() as {
            query?: { search?: Array<{ title: string; snippet: string }> };
        };

        for (const item of enData.query?.search || []) {
            results.push({
                title: item.title,
                snippet: item.snippet.replace(/<[^>]+>/g, "").trim().slice(0, 300),
                url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
            });
        }

        return results;
    } catch {
        return [];
    }
}

export async function ddgInstantSearch(query: string): Promise<SearchResult[]> {
    try {
        const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const response = await fetch(url, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(8000),
        });
        if (!response.ok) return [];

        const text = await response.text();
        if (!text || text.length < 10) return [];

        const data = JSON.parse(text) as {
            AbstractText?: string;
            AbstractURL?: string;
            AbstractSource?: string;
            RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
            Results?: Array<{ Text?: string; FirstURL?: string }>;
        };

        const results: SearchResult[] = [];

        if (data.AbstractText) {
            results.push({
                title: data.AbstractSource || "DuckDuckGo",
                snippet: data.AbstractText.slice(0, 500),
                url: data.AbstractURL || "",
            });
        }

        for (const topic of data.RelatedTopics || []) {
            if (topic.Text && topic.FirstURL && results.length < 5) {
                results.push({
                    title: topic.Text.slice(0, 80),
                    snippet: topic.Text.slice(0, 500),
                    url: topic.FirstURL,
                });
            }
        }

        return results;
    } catch {
        return [];
    }
}

export async function webSearch(query: string): Promise<SearchResult[]> {
    for (const searchFn of [exaSearch, wikipediaSearch, ddgInstantSearch]) {
        try {
            const results = await searchFn(query);
            if (results.length > 0) return results;
        } catch {
            continue;
        }
    }
    return [];
}