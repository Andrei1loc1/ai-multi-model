import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/app/lib/getModel";
import { aiRequest } from "@/app/lib/aiRequest";
import { db } from '@/app/lib/firebase';
import { ref, query, orderByChild, equalTo, get } from "firebase/database";

async function validateApiKey(apiKey: string): Promise<boolean> {
    const apiKeysRef = ref(db, 'apiKeys');
    const q = query(apiKeysRef, orderByChild('key'), equalTo(apiKey));
    const snapshot = await get(q);
    return snapshot.exists();
}

export async function POST(req: NextRequest) {
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
        const response = await aiRequest(model, prompt);

        return NextResponse.json({
            success: true,
            model: model.model,
            provider: model.provider,
            text: response.text,
            raw: response.raw,
        });
    } catch (error: any) {
        return NextResponse.json(
            {
                success: false,
                error: error.message ?? "Unknown error",
            },
            { status: 500 }
        );
    }
}
