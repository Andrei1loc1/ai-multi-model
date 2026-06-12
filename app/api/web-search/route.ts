import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

async function ddgInstantSearch(query: string) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return [];

    const data = await response.json() as {
        AbstractText?: string;
        AbstractURL?: string;
        AbstractSource?: string;
        RelatedTopics?: Array<{ Text?: string; FirstURL?: string }>;
        Results?: Array<{ Text?: string; FirstURL?: string }>;
    };

    const results: Array<{ title: string; snippet: string; url: string }> = [];

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
}

async function searxngSearch(query: string) {
    const instances = [
        "https://search.sapti.me",
        "https://searx.be",
        "https://search.bus-hit.me",
    ];

    for (const instance of instances) {
        try {
            const url = `${instance}/search?q=${encodeURIComponent(query)}&format=json&categories=general&language=ro`;
            const response = await fetch(url, {
                headers: { "User-Agent": "Mozilla/5.0" },
                signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) continue;

            const data = await response.json() as {
                results?: Array<{ title?: string; url?: string; content?: string }>;
            };
            if (!data.results?.length) continue;

            return data.results.slice(0, 5).map((r) => ({
                title: r.title || "Web result",
                snippet: (r.content || "").slice(0, 500),
                url: r.url || "",
            }));
        } catch {
            continue;
        }
    }
    return [];
}

async function ddgHtmlSearch(query: string) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return [];

    const html = await response.text();
    const results: Array<{ title: string; snippet: string; url: string }> = [];

    const resultRegex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    let match: RegExpExecArray | null;
    while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
        const rawUrl = match[1];
        const title = match[2].replace(/<[^>]+>/g, "").trim();
        const urlMatch = rawUrl.match(/uddg=([^&]+)/);
        const decodedUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;
        if (title && decodedUrl) {
            results.push({ title, snippet: "", url: decodedUrl });
        }
    }

    let si = 0;
    while ((match = snippetRegex.exec(html)) !== null && si < 5) {
        if (results[si]) {
            results[si].snippet = match[1].replace(/<[^>]+>/g, "").trim();
        }
        si++;
    }

    return results;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const query = body.query?.trim();
        if (!query) {
            return NextResponse.json({ error: "Query is required." }, { status: 400 });
        }

        let results: Array<{ title: string; snippet: string; url: string }> = [];

        for (const searchFn of [ddgInstantSearch, searxngSearch, ddgHtmlSearch]) {
            try {
                results = await searchFn(query);
                if (results.length > 0) break;
            } catch {
                continue;
            }
        }

        return NextResponse.json({ results, total: results.length });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Search failed.";
        console.error("Web search error:", message);
        return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
    }
}