import type { ImageAnalysisCacheRecord, ImageAttachmentRecord } from "@/app/lib/database/supabase";

export type ImageUploadInput = {
    conversationId: string;
    messageId: string;
    file: File;
};

export type ImageUploadResult = {
    attachment: ImageAttachmentRecord;
    created: boolean;
};

export type ImageAnalysisResult = {
    attachment: ImageAttachmentRecord;
    cache: ImageAnalysisCacheRecord;
    cached: boolean;
    signedUrl: string | null;
};

export type ImageFetchResult = {
    attachment: ImageAttachmentRecord;
    cache: ImageAnalysisCacheRecord | null;
    signedUrl: string | null;
};
