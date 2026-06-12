import axios from "axios";
import crypto from "crypto";
import sharp from "sharp";
import { getSupabaseServerClient } from "@/app/lib/database/supabase";
import type {
    ImageAnalysisCacheRecord,
    ImageAssetRecord,
    ImageAnalysisRunRecord,
} from "@/app/lib/database/supabase";
import type {
    ContextSource,
    ImageAttachmentInput,
    ImageVisionBundle,
    MessageAttachmentMetadata,
} from "@/app/lib/workspaces/types";

const IMAGE_BUCKET = "chat-attachments";
const BUNDLE_VERSION = "vision-bundle-v2";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DEFAULT_OLLAMA_VISION_MODEL = "llava";

type VisionProvider = "openrouter" | "nvidia-direct" | "ollama";
type VisionCandidate = {
    provider: VisionProvider;
    model: string;
    endpoint: string;
    apiKey: string;
};

function parseDataUrl(dataUrl: string) {
    const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
        throw new Error("Invalid image upload payload.");
    }

    return {
        mimeType: match[1],
        buffer: Buffer.from(match[2], "base64"),
    };
}

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "image";
}

function inferImageDimensions(buffer: Buffer, mimeType: string) {
    if (mimeType === "image/png" && buffer.length >= 24) {
        return {
            width: buffer.readUInt32BE(16),
            height: buffer.readUInt32BE(20),
        };
    }

    if ((mimeType === "image/jpeg" || mimeType === "image/jpg") && buffer.length > 4) {
        let offset = 2;
        while (offset < buffer.length) {
            if (buffer[offset] !== 0xff) {
                offset += 1;
                continue;
            }

            const marker = buffer[offset + 1];
            const blockLength = buffer.readUInt16BE(offset + 2);
            const isStartOfFrame =
                marker === 0xc0 ||
                marker === 0xc1 ||
                marker === 0xc2 ||
                marker === 0xc3 ||
                marker === 0xc5 ||
                marker === 0xc6 ||
                marker === 0xc7 ||
                marker === 0xc9 ||
                marker === 0xca ||
                marker === 0xcb ||
                marker === 0xcd ||
                marker === 0xce ||
                marker === 0xcf;

            if (isStartOfFrame && offset + 8 < buffer.length) {
                return {
                    height: buffer.readUInt16BE(offset + 5),
                    width: buffer.readUInt16BE(offset + 7),
                };
            }

            offset += 2 + blockLength;
        }
    }

    return { width: null, height: null };
}

async function ensureImageBucket() {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.storage.getBucket(IMAGE_BUCKET);
    if (!data) {
        const { error } = await supabase.storage.createBucket(IMAGE_BUCKET, {
            public: true,
            fileSizeLimit: `${MAX_IMAGE_BYTES}`,
            allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"],
        });
        if (error && !error.message.toLowerCase().includes("already exists")) {
            throw new Error(error.message);
        }
    }
}

export async function uploadImageAssetFromDataUrl(params: {
    fileName: string;
    dataUrl: string;
    workspaceId?: string | null;
    conversationId?: string | null;
}) {
    const { mimeType, buffer } = parseDataUrl(params.dataUrl);

    if (buffer.length > MAX_IMAGE_BYTES) {
        throw new Error("Image exceeds the 8MB upload limit.");
    }

    await ensureImageBucket();

    const safeFileName = sanitizeFileName(params.fileName);
    const extension = safeFileName.includes(".") ? safeFileName.split(".").pop() : mimeType.split("/")[1] || "png";
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const now = new Date().toISOString();
    const storagePath = `${params.workspaceId || "global"}/${params.conversationId || "draft"}/${hash}.${extension}`;
    const supabase = getSupabaseServerClient();

    const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(storagePath, buffer, {
            contentType: mimeType,
            cacheControl: "3600",
            upsert: true,
        });

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath);
    const dimensions = inferImageDimensions(buffer, mimeType);

    const asset = {
        id: crypto.randomUUID(),
        workspace_id: params.workspaceId || null,
        conversation_id: params.conversationId || null,
        storage_path: storagePath,
        public_url: publicUrlData.publicUrl || null,
        file_name: safeFileName,
        mime_type: mimeType,
        file_size_bytes: buffer.length,
        sha256: hash,
        width: dimensions.width,
        height: dimensions.height,
        created_at: now,
    };

    const { data, error } = await supabase.from("image_assets").insert(asset).select("*").single();
    if (error) {
        throw new Error(error.message);
    }

    return data as ImageAssetRecord;
}

export async function getImageAssetsByIds(imageAssetIds: string[]) {
    if (!imageAssetIds.length) {
        return [];
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("image_assets").select("*").in("id", imageAssetIds);
    if (error) {
        throw new Error(error.message);
    }

    const byId = new Map((data || []).map((item) => [item.id, item as ImageAssetRecord]));
    return imageAssetIds.map((id) => byId.get(id)).filter((item): item is ImageAssetRecord => Boolean(item));
}

export async function linkImageAssetsToConversation(imageAssetIds: string[], conversationId: string, workspaceId?: string | null) {
    if (!imageAssetIds.length) {
        return;
    }

    const supabase = getSupabaseServerClient();
    const updates: Record<string, unknown> = {
        conversation_id: conversationId,
    };
    if (workspaceId) {
        updates.workspace_id = workspaceId;
    }

    const { error } = await supabase
        .from("image_assets")
        .update(updates)
        .in("id", imageAssetIds);

    if (error) {
        throw new Error(error.message);
    }
}

function stripMarkdownFences(input: string) {
    return input
        .trim()
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
}

function normalizeVisionBundle(rawText: string): ImageVisionBundle {
    const fallback = {
        summary: rawText.trim().slice(0, 400) || "Image attached and analyzed.",
        ocr_text: "",
        elements: [],
        document_structure: {
            kind: "unknown" as const,
            sections: [],
        },
        important_details: [],
        uncertainties: [],
        confidence: 0.4,
    };

    try {
        const parsed = JSON.parse(stripMarkdownFences(rawText)) as Partial<ImageVisionBundle>;
        return {
            summary: parsed.summary?.trim() || fallback.summary,
            ocr_text: parsed.ocr_text?.trim() || "",
            elements: Array.isArray(parsed.elements)
                ? parsed.elements
                      .map((element) => ({
                          type: typeof element?.type === "string" ? element.type : "unknown",
                          label: typeof element?.label === "string" ? element.label : "Unnamed element",
                          region: Array.isArray(element?.region) && element.region.length === 4
                              ? [
                                    Number(element.region[0]) || 0,
                                    Number(element.region[1]) || 0,
                                    Number(element.region[2]) || 0,
                                    Number(element.region[3]) || 0,
                                ]
                              : null,
                      }))
                : [],
            document_structure: {
                kind:
                    parsed.document_structure?.kind === "ui_screenshot" ||
                    parsed.document_structure?.kind === "document" ||
                    parsed.document_structure?.kind === "diagram" ||
                    parsed.document_structure?.kind === "photo"
                        ? parsed.document_structure.kind
                        : "unknown",
                sections: Array.isArray(parsed.document_structure?.sections)
                    ? parsed.document_structure.sections.filter((section): section is string => typeof section === "string")
                    : [],
            },
            important_details: Array.isArray(parsed.important_details)
                ? parsed.important_details.filter((item): item is string => typeof item === "string").slice(0, 8)
                : [],
            uncertainties: Array.isArray(parsed.uncertainties)
                ? parsed.uncertainties.filter((item): item is string => typeof item === "string").slice(0, 6)
                : [],
            confidence:
                typeof parsed.confidence === "number" && Number.isFinite(parsed.confidence)
                    ? Math.max(0, Math.min(1, parsed.confidence))
                    : fallback.confidence,
        };
    } catch {
        return fallback;
    }
}

function formatVisionBundle(bundle: ImageVisionBundle) {
    return [
        `Summary: ${bundle.summary}`,
        bundle.ocr_text ? `OCR: ${bundle.ocr_text}` : "",
        bundle.document_structure.sections.length
            ? `Structure (${bundle.document_structure.kind}): ${bundle.document_structure.sections.join(", ")}`
            : `Structure: ${bundle.document_structure.kind}`,
        bundle.important_details.length
            ? `Important details: ${bundle.important_details.join(" | ")}`
            : "",
        bundle.uncertainties.length
            ? `Uncertainties: ${bundle.uncertainties.join(" | ")}`
            : "",
        `Confidence: ${bundle.confidence}`,
    ]
        .filter(Boolean)
        .join("\n");
}

function getVisionCandidates(preferredProvider: "all" | VisionProvider = "all") {
    const ollamaKey = process.env.OLLAMA_API_KEY;
    const ollamaModel = process.env.OLLAMA_VISION_MODEL?.trim() || DEFAULT_OLLAMA_VISION_MODEL;
    const ollamaEndpoint = process.env.OLLAMA_VISION_ENDPOINT || "https://ollama.com/api/chat";

    if (!ollamaKey) {
        return [];
    }

    return [
        {
            provider: "ollama" as const,
            model: ollamaModel,
            endpoint: ollamaEndpoint,
            apiKey: ollamaKey,
        },
    ];
}

function extractProviderErrorMessage(error: unknown) {
    if (!axios.isAxiosError(error)) {
        return error instanceof Error ? error.message : "Vision request failed.";
    }

    const data = error.response?.data as
        | string
        | {
              error?: string | { message?: string };
              message?: string;
          }
        | undefined;

    if (typeof data === "string") {
        return data.trim() || error.message || "Vision request failed.";
    }

    if (data && typeof data === "object" && typeof data.error === "string" && data.error.trim()) {
        return data.error.trim();
    }

    if (
        data &&
        typeof data === "object" &&
        typeof data.error === "object" &&
        typeof data.error?.message === "string" &&
        data.error.message.trim()
    ) {
        return data.error.message.trim();
    }

    if (data && typeof data === "object" && typeof data.message === "string" && data.message.trim()) {
        return data.message.trim();
    }

    return error.message || "Vision request failed.";
}

function buildVisionError(candidate: VisionCandidate, error: unknown) {
    if (!axios.isAxiosError(error)) {
        return error instanceof Error ? error : new Error("Vision request failed.");
    }

    const status = error.response?.status;
    const providerLabel = "Ollama";
    const details = extractProviderErrorMessage(error);

    if (status === 402) {
        return new Error(
            `${providerLabel} image analysis is unavailable for ${candidate.model}. The provider returned 402, which usually means this model needs billing or the current account cannot use it right now. ${details}`
        );
    }

    if (status === 401 || status === 403) {
        return new Error(`${providerLabel} rejected the vision request for ${candidate.model}. Check the API key and provider access. ${details}`);
    }

    if (status === 429) {
        return new Error(`${providerLabel} rate-limited the vision request for ${candidate.model}. ${details}`);
    }

    if (status && status >= 500) {
        return new Error(`${providerLabel} failed while analyzing the image with ${candidate.model}. ${details}`);
    }

    return new Error(`${providerLabel} could not analyze the image with ${candidate.model}. ${details}`);
}

async function requestVisionBundle(
    imageUrl: string,
    userMessage: string,
    preferredProvider: "all" | VisionProvider = "all",
    imageMimeType?: string
) {
    const candidates = getVisionCandidates(preferredProvider);
    if (!candidates.length) {
        throw new Error("No vision provider configured. Set OLLAMA_API_KEY.");
    }

    const systemPrompt =
        "You are an expert visual analyst. Analyze the image thoroughly. Return strict JSON with keys: summary (brief description of what the image shows), ocr_text (any visible text, verbatim), elements (list of objects, people, structures identified), document_structure (if it's a document, describe layout), important_details (specific names, numbers, labels), uncertainties (what you're not sure about), confidence (0-1). Do not wrap the JSON in commentary or markdown fences.";
    const userPrompt = [
        "Analyze this image in detail.",
        "If it's a photo or scene, identify objects, people, locations, and context.",
        "If it's a a document, extract text and describe the structure.",
        "If it's a diagram or chart, describe the relationships and data.",
        `User context: ${userMessage}`,
    ].join("\n");

    let lastError: Error | null = null;

    let imageBase64: string | null = null;
    try {
        const imgResponse = await axios.get(imageUrl, { responseType: "arraybuffer", timeout: 30_000 });
        const inputBuffer = Buffer.from(imgResponse.data);
        const pngBuffer = await sharp(inputBuffer).png().toBuffer();
        imageBase64 = pngBuffer.toString("base64");
    } catch (downloadErr) {
        console.error("Failed to download image for vision analysis:", downloadErr);
    }

    if (!imageBase64) {
        throw new Error("Failed to download image for vision analysis.");
    }

    for (const candidate of candidates) {
        try {
            const response = await axios.post(
                candidate.endpoint,
                {
                    model: candidate.model,
                    messages: [
                        { role: "system", content: systemPrompt },
                        {
                            role: "user",
                            content: userPrompt,
                            images: [imageBase64],
                        },
                    ],
                    stream: false,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${candidate.apiKey}`,
                    },
                    timeout: 120_000,
                }
            );

            let text: string | Array<{ text?: string }> = "";
            if (response.data?.message?.content) {
                text = response.data.message.content;
            } else if (response.data?.choices?.[0]?.message?.content) {
                text = response.data.choices[0].message.content;
            } else if (response.data?.response) {
                text = response.data.response;
            } else if (typeof response.data === "string") {
                text = response.data;
            }

            const normalizedText =
                typeof text === "string"
                    ? text
                    : Array.isArray(text)
                    ? text
                          .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
                          .join("")
                    : "";

            return {
                provider: candidate.provider,
                model: candidate.model,
                raw: response.data,
                bundle: normalizeVisionBundle(normalizedText),
            };
        } catch (error) {
            lastError = buildVisionError(candidate, error);
        }
    }

    throw lastError || new Error("Vision request failed.");
}

async function getCachedVisionBundle(imageAsset: ImageAssetRecord) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("image_analysis_cache")
        .select("*")
        .eq("sha256", imageAsset.sha256)
        .eq("bundle_version", BUNDLE_VERSION)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (!data) {
        return null;
    }

    await supabase
        .from("image_analysis_cache")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id);

    return data as ImageAnalysisCacheRecord;
}

export async function getImageAnalysisCache(contentHash: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("image_analysis_cache")
        .select("*")
        .eq("sha256", contentHash)
        .eq("bundle_version", BUNDLE_VERSION)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    if (data) {
        await supabase
            .from("image_analysis_cache")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", data.id);
    }

    return (data || null) as ImageAnalysisCacheRecord | null;
}

export async function getImageAttachmentByContentHash(contentHash: string) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
        .from("image_assets")
        .select("*")
        .eq("sha256", contentHash)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return (data || null) as ImageAssetRecord | null;
}

export async function fetchImageAttachment(imageAssetId: string) {
    const assets = await getImageAssetsByIds([imageAssetId]);
    const attachment = assets[0] || null;
    if (!attachment) {
        throw new Error("Image attachment not found.");
    }

    const cache = await getImageAnalysisCache(attachment.sha256);
    return {
        attachment,
        cache,
        cached: Boolean(cache),
        signedUrl: attachment.public_url,
    };
}

export async function analyzeImageAsset(
    imageAsset: ImageAssetRecord,
    userMessage: string,
    preferredProvider: "all" | VisionProvider = "all"
) {
    const cached = await getCachedVisionBundle(imageAsset);
    if (cached) {
        return cached.bundle as unknown as ImageVisionBundle;
    }

    if (!imageAsset.public_url) {
        throw new Error("Image asset is missing a public URL for vision analysis.");
    }

    const supabase = getSupabaseServerClient();
    const run = {
        id: crypto.randomUUID(),
        image_asset_id: imageAsset.id,
        provider: "pending",
        model: "pending",
        status: "pending" as const,
        prompt_version: BUNDLE_VERSION,
        raw_response: null,
        error_message: null,
        created_at: new Date().toISOString(),
        completed_at: null,
    };

    const { data: createdRun, error: runError } = await supabase
        .from("image_analysis_runs")
        .insert(run)
        .select("*")
        .single();
    if (runError) {
        throw new Error(runError.message);
    }

    try {
        const visionResult = await requestVisionBundle(imageAsset.public_url, userMessage, preferredProvider, imageAsset.mime_type);
        const bundleRow = {
            id: crypto.randomUUID(),
            image_asset_id: imageAsset.id,
            sha256: imageAsset.sha256,
            bundle: visionResult.bundle,
            bundle_version: BUNDLE_VERSION,
            created_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
        };

        const { error: cacheError } = await supabase.from("image_analysis_cache").insert(bundleRow);
        if (cacheError) {
            throw new Error(cacheError.message);
        }

        await supabase
            .from("image_analysis_runs")
            .update({
                provider: visionResult.provider,
                model: visionResult.model,
                status: "completed",
                raw_response: visionResult.raw,
                completed_at: new Date().toISOString(),
            })
            .eq("id", (createdRun as ImageAnalysisRunRecord).id);

        return visionResult.bundle;
    } catch (error) {
        await supabase
            .from("image_analysis_runs")
            .update({
                status: "error",
                error_message: error instanceof Error ? error.message : "Vision analysis failed.",
                completed_at: new Date().toISOString(),
            })
            .eq("id", (createdRun as ImageAnalysisRunRecord).id);
        throw error;
    }
}

export async function analyzeImageAttachment(imageAssetId: string, userMessage = "Analyze the attached image for a downstream AI assistant.") {
    const assets = await getImageAssetsByIds([imageAssetId]);
    const attachment = assets[0] || null;
    if (!attachment) {
        throw new Error("Image attachment not found.");
    }

    const bundle = await analyzeImageAsset(attachment, userMessage);
    const cache = await getImageAnalysisCache(attachment.sha256);

    return {
        attachment,
        cache,
        cached: Boolean(cache),
        signedUrl: attachment.public_url,
        bundle,
    };
}

export async function buildImageContextSources(
    attachments: ImageAttachmentInput[],
    userMessage: string,
    preferredProvider: "all" | VisionProvider = "all"
) {
    const assets = await getImageAssetsByIds(attachments.map((attachment) => attachment.imageAssetId));
    const results = await Promise.all(
        assets.map(async (asset, index) => {
            const bundle = await analyzeImageAsset(asset, userMessage, preferredProvider);
            return {
                asset,
                bundle,
                context: {
                    type: "image" as const,
                    label: asset.file_name,
                    content: formatVisionBundle(bundle),
                    score: 100 - index,
                } satisfies ContextSource,
                metadata: {
                    type: "image" as const,
                    imageAssetId: asset.id,
                    name: asset.file_name,
                    mimeType: asset.mime_type,
                    width: asset.width,
                    height: asset.height,
                    previewUrl: asset.public_url,
                    storagePath: asset.storage_path,
                } satisfies MessageAttachmentMetadata,
            };
        })
    );

    return {
        contextSources: results.map((item) => item.context),
        messageAttachments: results.map((item) => item.metadata),
    };
}
