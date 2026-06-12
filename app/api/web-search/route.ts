import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const query = body.query?.trim();
        if (!query) {
            return NextResponse.json({ error: "Query is required." }, { status: 400 });
        }

        const maxResults = Math.min(body.maxResults || 5, 10);
        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7",
            },
        });

        if (!response.ok) {
            return NextResponse.json({ error: "Search failed." }, { status: 502 });
        }

        const html = await response.text();
        const results: Array<{ title: string; snippet: string; url: string }> = [];

        const resultRegex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
        const snippetRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

        const resultUrls: Array<{ url: string; title: string }> = [];
        let match: RegExpExecArray | null;

        while ((match = resultRegex.exec(html)) !== null && resultUrls.length < maxResults) {
            const rawUrl = match[1];
            const title = match[2].replace(/<[^>]+>/g, "").trim();
            const urlMatch = rawUrl.match(/uddg=([^&]+)/);
            const decodedUrl = urlMatch ? decodeURIComponent(urlMatch[1]) : rawUrl;
            if (title && decodedUrl) {
                resultUrls.push({ url: decodedUrl, title });
            }
        }

        const snippets: string[] = [];
        while ((match = snippetRegex.exec(html)) !== null && snippets.length < maxResults) {
            snippets.push(match[1].replace(/<[^>]+>/g, "").trim());
        }

        for (let i = 0; i < resultUrls.length; i++) {
            results.push({
                title: resultUrls[i].title,
                snippet: snippets[i] || "",
                url: resultUrls[i].url,
            });
        }

        return NextResponse.json({ results, total: results.length });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Search failed.";
        console.error("Web search error:", message);
        return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
    }
}