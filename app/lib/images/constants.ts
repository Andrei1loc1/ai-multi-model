export const IMAGE_STORAGE_BUCKET = "image-attachments";
export const MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024;
export const DEFAULT_IMAGE_ANALYSIS_MODEL = "gpt-4o-mini";

export const IMAGE_ANALYSIS_PROMPT = [
    "You are analyzing a user-uploaded image for a chat assistant.",
    "Return a concise, practical description that can be cached and reused later.",
    "Focus on: what is visible, notable objects or text, and any important details the assistant should know.",
    "If there is no meaningful content, say so plainly.",
].join(" ");
