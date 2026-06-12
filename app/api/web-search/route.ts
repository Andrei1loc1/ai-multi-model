import { NextRequest, NextResponse } from "next/server";
import { webSearch } from "@/app/lib/web-search/search";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const query = body.query?.trim();
        if (!query) {
            return NextResponse.json({ error: "Query is required." }, { status: 400 });
        }

        const results = await webSearch(query);

        return NextResponse.json({ results, total: results.length });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Search failed.";
        console.error("Web search error:", message);
        return NextResponse.json({ error: "Search failed. Please try again." }, { status: 500 });
    }
}