import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/app/lib/chatUtils/getModel";
import { AIRequestError, aiRequest } from "@/app/lib/chatUtils/aiRequest";
import { AIModels } from "@/app/lib/AImodels/models";
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
        const body = await req.json();
        const { prompt, model: preferredModel } = body;

        if (!prompt || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Prompt is required." },
                { status: 400 }
            );
        }
        const isAuto = !preferredModel || preferredModel === "auto";
        const candidateModels: any[] = [];

        if (isAuto) {
            candidateModels.push(...AIModels.filter(m => m.active).sort((a, b) => a.rank - b.rank));
        } else {
            candidateModels.push(getModel(preferredModel));
        }

        let lastError: any = null;
        let response: AIResponse | null = null;
        let finalModelUsed = candidateModels[0];

        for (const candidate of candidateModels) {
            try {
                const res = await aiRequest(candidate, prompt, false) as AIResponse;
                response = res;
                finalModelUsed = candidate;
                break;
            } catch (error: unknown) {
                lastError = error;
                // Fallback only if in auto mode and error is retriable (429 or 5xx)
                const canFallback = isAuto && error instanceof AIRequestError && error.retriable;
                if (canFallback) {
                    continue;
                }
                throw error;
            }
        }

        if (!response) {
            throw lastError || new Error("All model attempts failed.");
        }

        return NextResponse.json({
            success: true,
            model: finalModelUsed.model,
            provider: finalModelUsed.provider,
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
