import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

async function ddgHtmlSearch(query: string) {
    try {
        const body = `q=${encodeURIComponent(query)}&kl=ro-ro`;
        const response = await fetch("https://html.duckduckgo.com/html/", {
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
        const seen = new Set<string>();

        const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;
        while ((match = resultRegex.exec(html)) !== null && results.length < 8) {
            let url = match[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'");
            if (url.startsWith("//")) url = "https:" + url;
            const title = match[2].replace(/<[^>]+>/g, "").trim();
            if (url && title && !seen.has(url) && !url.includes("duckduckgo.com")) {
                seen.add(url);
                results.push({ title, snippet: "", url });
            }
        }

        if (results.length === 0) {
            const linkRegex = /<a[^>]*href="(https?:\/\/(?!duckduckgo\.com)[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
            while ((match = linkRegex.exec(html)) !== null && results.length < 8) {
                const url = match[1].replace(/&amp;/g, "&").replace(/&#39;/g, "'");
                const title = match[2].replace(/<[^>]+>/g, "").trim();
                if (url && title && !seen.has(url) && !url.includes("duckduckgo.com") && !url.includes("uddg") && !url.includes("yandex")) {
                    seen.add(url);
                    results.push({ title, snippet: "", url });
                }
            }
        }

        const snippetRegex = /<td[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/td>|<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
        const snippets: string[] = [];
        let smatch: RegExpExecArray | null;
        while ((smatch = snippetRegex.exec(html)) !== null && snippets.length < 8) {
            const text = (smatch[1] || smatch[2] || "").replace(/<[^>]+>/g, "").trim();
            if (text) snippets.push(text);
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
        const seen = new Set<string>();

        const linkRegex = /<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
        let match: RegExpExecArray | null;

        while ((match = linkRegex.exec(html)) !== null && results.length < 8) {
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

async function wikipediaSearch(query: string) {
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

        const results: Array<{ title: string; snippet: string; url: string }> = [];
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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const query = body.query?.trim();
        if (!query) {
            return NextResponse.json({ error: "Query is required." }, { status: 400 });
        }

        let results: Array<{ title: string; snippet: string; url: string }> = [];

        for (const searchFn of [ddgHtmlSearch, ddgLiteSearch, ddgInstantSearch, wikipediaSearch]) {
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