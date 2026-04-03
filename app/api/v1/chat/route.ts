import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/app/lib/chatUtils/getModel";
import { aiRequest } from "@/app/lib/chatUtils/aiRequest";
import { validateApiKey as validateStoredApiKey } from "@/app/lib/workspaces/service";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";

interface AIResponse {
    text: string;
    raw: unknown;
}

async function validateApiKey(apiKey: string): Promise<boolean> {
    return validateStoredApiKey(apiKey);
}

export async function POST(req: NextRequest) {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized: Missing or invalid API key' }, { status: 401 });
    }

    const apiKey = authHeader.split(' ')[1];
    const isValid = await validateApiKey(apiKey);

    if (!isValid) {
        return NextResponse.json({ error: 'Unauthorized: Invalid API key' }, { status: 401 });
    }

    try {
        const { prompt, model: preferredModel } = await req.json();

        if (!prompt || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Prompt is required." },
                { status: 400 }
            );
        }

        const model = getModel(preferredModel);
        const response = await aiRequest(model, prompt, false) as AIResponse;

        return NextResponse.json({
            success: true,
            model: model.model,
            provider: model.provider,
            text: response.text,
            raw: response.raw,
        });
    } catch (error: unknown) {
        return NextResponse.json(
            {
                success: false,
                error: getErrorMessage(error, "Unknown error"),
            },
            { status: 500 }
        );
    }
}
