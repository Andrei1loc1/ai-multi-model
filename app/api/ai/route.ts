import {NextRequest, NextResponse} from "next/server";
import {getModel} from "@/app/lib/getModel";
import {aiRequest} from "@/app/lib/aiRequest";

export async function POST(req: NextRequest){
    try{
        const {prompt, model: preferredModel} = await req.json();

        if (!prompt || prompt.trim().length === 0) {
            return NextResponse.json(
                { error: "Prompt is required." },
                { status: 400 }
            );
        }

        const model = getModel(preferredModel);
        console.log('Selected model:', model);
        const response = await aiRequest(model, prompt);
        console.log('AI response:', response);

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