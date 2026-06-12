import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

async function ddgLiteSearch(query: string) {
    try {
        const body = `q=${encodeURIComponent(query)}&kl=ro-ro`;
        const response = await fetch("https://lite.duckduckgo.com/lite/", {
            method: "POST",
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            body,
            signal: AbortSignal.timeout(10000),
            redirect: "follow",
        });

        if (!response.ok) return [];

        const html = await response.text();
        if (!html || html.length < 100) return [];

        const results: Array<{ title: string; snippet: string; url: string }> = [];

        const rowRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;
        const seen = new Set<string>();

        while ((match = rowRegex.exec(html)) !== null && results.length < 8) {
            const url = match[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'");
            const title = match[2].replace(/<[^>]+>/g, "").trim();
            if (url && title && !seen.has(url) && !url.includes("duckduckgo.com")) {
                seen.add(url);
                results.push({ title, snippet: "", url });
            }
        }

        const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\/td>/gi;
        const snippets: string[] = [];
        let smatch: RegExpExecArray | null;
        while ((smatch = snippetRegex.exec(html)) !== null && snippets.length < 8) {
            snippets.push(smatch[1].replace(/<[^>]+>/g, "").trim());
        }

        for (let i = 0; i < results.length; i++) {
            if (snippets[i]) {
                results[i].snippet = snippets[i];
            }
        }

        return results;
    } catch {
        return [];
    }
}

async function ddgInstantSearch(query: string) {
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
    } catch {
        return [];
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const query = body.query?.trim();
        if (!query) {
            return NextResponse.json({ error: "Query is required." }, { status: 400 });
        }

        let results: Array<{ title: string; snippet: string; url: string }> = [];

        for (const searchFn of [ddgLiteSearch, ddgInstantSearch]) {
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