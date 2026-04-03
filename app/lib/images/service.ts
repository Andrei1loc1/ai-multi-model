import axios from "axios";
import crypto from "crypto";
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
const BUNDLE_VERSION = "vision-bundle-v1";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const DEFAULT_OPENROUTER_VISION_MODELS = ["openrouter/free", "qwen/qwen3.6-plus:free"];
const DEFAULT_NVIDIA_VISION_MODEL = "meta/llama-3.2-11b-vision-instruct";

type VisionProvider = "openrouter" | "nvidia-direct";
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
    const openRouterKey = [
        process.env.OPENROUTER_API_KEY_1,
        process.env.OPENROUTER_API_KEY_2,
        process.env.OPENROUTER_API_KEY_3,
    ].find((key) => typeof key === "string" && key.trim().length > 0);

    const providerBuckets: Record<VisionProvider, VisionCandidate[]> = {
        openrouter: [],
        "nvidia-direct": [],
    };

    if (openRouterKey) {
        const configuredModel = process.env.OPENROUTER_VISION_MODEL?.trim();
        const models = configuredModel ? [configuredModel] : DEFAULT_OPENROUTER_VISION_MODELS;

        providerBuckets.openrouter.push(
            ...models.map((model) => ({
                provider: "openrouter" as const,
                model,
                endpoint: "https://openrouter.ai/api/v1/chat/completions",
                apiKey: openRouterKey,
            }))
        );
    }

    if (process.env.NVIDIA_API_KEY) {
        providerBuckets["nvidia-direct"].push({
            provider: "nvidia-direct",
            model: process.env.NVIDIA_VISION_MODEL?.trim() || DEFAULT_NVIDIA_VISION_MODEL,
            endpoint: "https://integrate.api.nvidia.com/v1/chat/completions",
            apiKey: process.env.NVIDIA_API_KEY,
        });
    }

    const providerOrder: VisionProvider[] =
        preferredProvider === "nvidia-direct"
            ? ["nvidia-direct", "openrouter"]
            : preferredProvider === "openrouter"
            ? ["openrouter", "nvidia-direct"]
            : ["openrouter", "nvidia-direct"];

    const seen = new Set<string>();
    const candidates: VisionCandidate[] = [];

    for (const provider of providerOrder) {
        for (const candidate of providerBuckets[provider]) {
            const dedupeKey = `${candidate.provider}:${candidate.model}`;
            if (seen.has(dedupeKey)) {
                continue;
            }

            seen.add(dedupeKey);
            candidates.push(candidate);
        }
    }

    return candidates;
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
    const providerLabel = candidate.provider === "openrouter" ? "OpenRouter" : "NVIDIA Direct";
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
    preferredProvider: "all" | VisionProvider = "all"
) {
    const candidates = getVisionCandidates(preferredProvider);
    if (!candidates.length) {
        throw new Error("No vision-capable provider is configured. Add OPENROUTER_API_KEY_1 or NVIDIA_API_KEY.");
    }

    const systemPrompt =
        "You are a vision preprocessing service for another language model. Return only strict JSON with keys: summary, ocr_text, elements, document_structure, important_details, uncertainties, confidence. Do not wrap the JSON in commentary.";
    const userPrompt = [
        "Analyze this image for downstream use by another AI model.",
        "Focus on visible text, layout, UI structure, document sections, and key visual facts.",
        "Do not invent unreadable details.",
        `User intent: ${userMessage}`,
    ].join("\n");

    let lastError: Error | null = null;

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
                            content: [
                                { type: "text", text: userPrompt },
                                { type: "image_url", image_url: { url: imageUrl } },
                            ],
                        },
                    ],
                    temperature: 0.1,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${candidate.apiKey}`,
                    },
                }
            );

            const text = response.data?.choices?.[0]?.message?.content;
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
        const visionResult = await requestVisionBundle(imageAsset.public_url, userMessage, preferredProvider);
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
