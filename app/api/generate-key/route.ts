import {NextResponse} from "next/server";
import { createApiKey } from "@/app/lib/workspaces/service";
import { hasSupabaseConfig } from "@/app/lib/database/supabase";
import { getErrorMessage } from "@/app/lib/utils/errors";

export async function POST() {
    if (!hasSupabaseConfig()) {
        return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    try {
        const apiKey = await createApiKey();
        return NextResponse.json({ apiKey });
    } catch (error: unknown) {
        return NextResponse.json({ error: getErrorMessage(error, "Failed to generate API key.") }, { status: 500 });
    }
}
