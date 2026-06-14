import * as crypto from "crypto";
import { getSupabaseServerClient } from "@/app/lib/database/supabase";
import type { DocumentAssetRecord } from "@/app/lib/database/supabase";
import type {
    ContextSource,
    DocumentAttachmentInput,
    MessageDocumentAttachmentMetadata,
} from "@/app/lib/workspaces/types";
import { ALLOWED_DOCUMENT_EXTENSIONS, ALLOWED_DOCUMENT_MIME_TYPES, MAX_DOCUMENT_BYTES } from "./constants";

const DOCUMENT_BUCKET = "chat-documents";
const OCR_SERVICE_URL = process.env.OCR_SERVICE_URL || "http://localhost:8001";

function parseDataUrl(dataUrl: string) {
    const match = dataUrl.match(/^data:([a-zA-Z0-9\/.+_-]+);base64,(.+)$/);
    if (!match) {
        throw new Error("Invalid document upload payload.");
    }

    return {
        mimeType: match[1],
        buffer: Buffer.from(match[2], "base64"),
    };
}

const MIME_TO_EXTENSION: Record<string, string> = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
    "text/plain": ".txt",
    "text/markdown": ".md",
    "text/csv": ".csv",
    "application/json": ".json",
    "text/html": ".html",
};

function sanitizeFileName(fileName: string) {
    return fileName.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120) || "document";
}

function extensionForMimeType(mimeType: string) {
    return MIME_TO_EXTENSION[mimeType] || `.${mimeType.split("/")[1] || "bin"}`;
}

async function extractWithOfficeExtractor(buffer: Buffer): Promise<string | null> {
    try {
        const { getTextExtractor } = await import("office-text-extractor");
        const extractor = getTextExtractor();
        return await extractor.extractText({ input: buffer, type: "buffer" });
    } catch {
        return null;
    }
}

async function callOcrService(buffer: Buffer, fileName: string): Promise<string> {
    try {
        const formData = new FormData();
        formData.append("file", new Blob([new Uint8Array(buffer)]), fileName);

        const response = await fetch(`${OCR_SERVICE_URL}/extract`, {
            method: "POST",
            body: formData,
            signal: AbortSignal.timeout(120_000),
        });

        if (!response.ok) {
            const errorText = await response.text().catch(() => "");
            console.error(`OCR service error: ${response.status} ${errorText}`);
            return "";
        }

        const result = await response.json();
        return result.text || "";
    } catch (err) {
        console.error("OCR service unavailable:", err);
        return "";
    }
}

async function convertBufferToMarkdown(buffer: Buffer, mimeType: string, fileName?: string) {
    const MAX_CHARS = 50000;

    if (mimeType === "text/plain" || mimeType === "text/markdown" || mimeType === "text/csv" || mimeType === "application/json") {
        return buffer.toString("utf-8").slice(0, MAX_CHARS);
    }

    if (mimeType === "application/pdf") {
        const ocrText = await callOcrService(buffer, fileName || "document.pdf");
        if (ocrText.trim()) {
            return ocrText.slice(0, MAX_CHARS);
        }

        const officeText = await extractWithOfficeExtractor(buffer);
        if (officeText?.trim()) {
            return officeText.slice(0, MAX_CHARS);
        }

        return "[PDF content could not be extracted. The file may be empty or corrupted.]";
    }

    const officeText = await extractWithOfficeExtractor(buffer);
    if (officeText?.trim()) {
        return officeText.slice(0, MAX_CHARS);
    }

    if (mimeType === "text/html") {
        return buffer.toString("utf-8").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_CHARS);
    }
    if (mimeType.startsWith("text/")) {
        return buffer.toString("utf-8").slice(0, MAX_CHARS);
    }
    return "[Document content could not be extracted. The file format may not be supported.]";
}

async function ensureDocumentBucket() {
    const supabase = getSupabaseServerClient();
    const { data } = await supabase.storage.getBucket(DOCUMENT_BUCKET);
    if (!data) {
        const { error } = await supabase.storage.createBucket(DOCUMENT_BUCKET, {
            public: true,
            fileSizeLimit: `${MAX_DOCUMENT_BYTES}`,
            allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
        });
        if (error && !error.message.toLowerCase().includes("already exists")) {
            throw new Error(error.message);
        }
    }
}

const DOCUMENT_TTL_DAYS = 3;

export async function cleanupExpiredDocuments() {
    const supabase = getSupabaseServerClient();
    const cutoff = new Date().toISOString();

    const { data: expired, error: queryError } = await supabase
        .from("document_assets")
        .select("id, storage_path")
        .lt("expires_at", cutoff);

    if (queryError || !expired?.length) {
        return;
    }

    const storagePaths = expired.map((d) => d.storage_path);
    const { error: storageError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .remove(storagePaths);

    if (storageError) {
        console.error("Failed to delete expired document files:", storageError);
    }

    const { error: dbError } = await supabase
        .from("document_assets")
        .delete()
        .in("id", expired.map((d) => d.id));

    if (dbError) {
        console.error("Failed to delete expired document records:", dbError);
    }
}

export async function uploadDocumentAssetFromDataUrl(params: {
    fileName: string;
    dataUrl: string;
    workspaceId?: string | null;
    conversationId?: string | null;
}) {
    const { mimeType, buffer } = parseDataUrl(params.dataUrl);

    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(mimeType)) {
        throw new Error(`Unsupported document MIME type: ${mimeType}`);
    }

    if (buffer.length > MAX_DOCUMENT_BYTES) {
        throw new Error("Document exceeds the 10MB upload limit.");
    }

    await ensureDocumentBucket();
    await cleanupExpiredDocuments();

    const safeFileName = sanitizeFileName(params.fileName);
    const extension = safeFileName.includes(".") ? safeFileName.split(".").pop() : mimeType.split("/")[1] || "bin";
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const supabase = getSupabaseServerClient();

    const { data: existing } = await supabase
        .from("document_assets")
        .select("*")
        .eq("sha256", hash)
        .maybeSingle();

    if (existing) {
        return existing as DocumentAssetRecord;
    }

    const storagePath = `${params.workspaceId || "global"}/${params.conversationId || "draft"}/${hash}.${extension}`;

    const { error: uploadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .upload(storagePath, buffer, {
            contentType: mimeType,
            cacheControl: "3600",
            upsert: true,
        });

    if (uploadError) {
        throw new Error(uploadError.message);
    }

    const extractedText = await convertBufferToMarkdown(buffer, mimeType, safeFileName);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DOCUMENT_TTL_DAYS * 24 * 60 * 60 * 1000);
    const asset = {
        id: crypto.randomUUID(),
        workspace_id: params.workspaceId || null,
        conversation_id: params.conversationId || null,
        storage_path: storagePath,
        file_name: safeFileName,
        mime_type: mimeType,
        file_size_bytes: buffer.length,
        sha256: hash,
        extracted_text: extractedText || null,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
    };

    const { data, error } = await supabase.from("document_assets").insert(asset).select("*").single();
    if (error) {
        throw new Error(error.message);
    }

    return data as DocumentAssetRecord;
}

export async function uploadDocumentAssetFromStoragePath(params: {
    fileName: string;
    storagePath: string;
    mimeType: string;
    workspaceId?: string | null;
    conversationId?: string | null;
}) {
    await ensureDocumentBucket();
    await cleanupExpiredDocuments();

    const supabase = getSupabaseServerClient();
    const { data: fileData, error: downloadError } = await supabase.storage
        .from(DOCUMENT_BUCKET)
        .download(params.storagePath);

    if (downloadError || !fileData) {
        throw new Error(`Failed to download file from storage: ${downloadError?.message || "unknown error"}`);
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    if (buffer.length > MAX_DOCUMENT_BYTES) {
        throw new Error("Document exceeds the 10MB upload limit.");
    }

    const safeFileName = sanitizeFileName(params.fileName);
    const extension = safeFileName.includes(".") ? safeFileName.split(".").pop() : params.mimeType.split("/")[1] || "bin";
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    const { data: existing } = await supabase
        .from("document_assets")
        .select("*")
        .eq("sha256", hash)
        .maybeSingle();

    if (existing) {
        return existing as DocumentAssetRecord;
    }

    const extractedText = await convertBufferToMarkdown(buffer, params.mimeType, safeFileName);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + DOCUMENT_TTL_DAYS * 24 * 60 * 60 * 1000);
    const asset = {
        id: crypto.randomUUID(),
        workspace_id: params.workspaceId || null,
        conversation_id: params.conversationId || null,
        storage_path: params.storagePath,
        file_name: safeFileName,
        mime_type: params.mimeType,
        file_size_bytes: buffer.length,
        sha256: hash,
        extracted_text: extractedText || null,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
    };

    const { data, error } = await supabase.from("document_assets").insert(asset).select("*").single();
    if (error) {
        throw new Error(error.message);
    }

    return data as DocumentAssetRecord;
}

export async function getDocumentAssetsByIds(documentAssetIds: string[]) {
    if (!documentAssetIds.length) {
        return [];
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.from("document_assets").select("*").in("id", documentAssetIds);
    if (error) {
        throw new Error(error.message);
    }

    const byId = new Map((data || []).map((item) => [item.id, item as DocumentAssetRecord]));
    return documentAssetIds.map((id) => byId.get(id)).filter((item): item is DocumentAssetRecord => Boolean(item));
}

export async function linkDocumentAssetsToConversation(
    documentAssetIds: string[],
    conversationId: string,
    workspaceId?: string | null
) {
    if (!documentAssetIds.length) {
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
        .from("document_assets")
        .update(updates)
        .in("id", documentAssetIds);

    if (error) {
        throw new Error(error.message);
    }
}

const FALLBACK_MESSAGES = [
    "[PDF content could not be extracted.",
    "[Document content could not be extracted.",
    "[PDF content could not be extracted]",
    "[Document content could not be extracted]",
];

function isFallbackText(text: string | null): boolean {
    if (!text) return true;
    return FALLBACK_MESSAGES.some((msg) => text.startsWith(msg));
}

export async function buildDocumentContextSources(
    attachments: DocumentAttachmentInput[],
    userMessage: string
) {
    const assets = await getDocumentAssetsByIds(attachments.map((a) => a.documentAssetId));
    const results = await Promise.all(
        assets.map(async (asset, index) => {
            let extractedText = asset.extracted_text;

            if (!extractedText || isFallbackText(extractedText)) {
                const supabase = getSupabaseServerClient();
                const { data: fileData } = await supabase.storage
                    .from(DOCUMENT_BUCKET)
                    .download(asset.storage_path);

                if (fileData) {
                    const buffer = Buffer.from(await fileData.arrayBuffer());
                    extractedText = await convertBufferToMarkdown(buffer, asset.mime_type, asset.file_name);

                    if (extractedText) {
                        await supabase
                            .from("document_assets")
                            .update({ extracted_text: extractedText })
                            .eq("id", asset.id);
                    }
                }
            }

            let content = extractedText || "";
            if (content.length > 50000) {
                content = content.slice(0, 50000) + "\n[Document truncated at 50000 characters]";
            }

            return {
                context: {
                    type: "document" as const,
                    label: asset.file_name,
                    content,
                    score: 100 - index,
                } satisfies ContextSource,
                metadata: {
                    type: "document" as const,
                    documentAssetId: asset.id,
                    name: asset.file_name,
                    mimeType: asset.mime_type,
                    extractedTextLength: extractedText?.length || null,
                    storagePath: asset.storage_path,
                } satisfies MessageDocumentAttachmentMetadata,
            };
        })
    );

    return {
        contextSources: results.map((item) => item.context),
        messageAttachments: results.map((item) => item.metadata),
    };
}

export async function convertDocumentToMarkdown(buffer: Buffer, mimeType: string, fileName?: string) {
    const text = await convertBufferToMarkdown(buffer, mimeType, fileName);
    if (text.length > 50000) {
        return text.slice(0, 50000) + "\n[Document truncated at 50000 characters]";
    }
    return text;
}