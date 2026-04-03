export type WorkspaceMode = "chat" | "agent";
export type AgentExecutionMode = "draft" | "apply";

export type WorkspaceCapability =
    | "memory"
    | "repo"
    | "notes"
    | "patch"
    | "search";

export type TaskType =
    | "chat"
    | "coding"
    | "explain"
    | "rewrite"
    | "search"
    | "plan";

export type ContextSource =
    | {
          type: "memory";
          label: string;
          content: string;
          score: number;
      }
    | {
          type: "repo_chunk";
          label: string;
          content: string;
          score: number;
      }
    | {
          type: "image";
          label: string;
          content: string;
          score: number;
      }
    | {
          type: "note";
          label: string;
          content: string;
          score: number;
      };

export type ImageAttachmentInput = {
    type: "image";
    imageAssetId: string;
    name?: string | null;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
};

export type ImageVisionBundle = {
    summary: string;
    ocr_text: string;
    elements: Array<{
        type: string;
        label: string;
        region?: [number, number, number, number] | null;
    }>;
    document_structure: {
        kind: "ui_screenshot" | "document" | "diagram" | "photo" | "unknown";
        sections: string[];
    };
    important_details: string[];
    uncertainties: string[];
    confidence: number;
};

export type MessageAttachmentMetadata = {
    type: "image";
    imageAssetId: string;
    name?: string | null;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
    previewUrl?: string | null;
    storagePath?: string | null;
};

export type OrchestratorCapabilities = {
    allowMemory?: boolean;
    allowRepo?: boolean;
    allowNotes?: boolean;
    executionMode?: AgentExecutionMode;
};

export type OrchestrateChatInput = {
    message: string;
    mode: WorkspaceMode;
    selectedModel?: string | null;
    selectedProvider?: "all" | "openrouter" | "nvidia-direct" | null;
    workspaceId?: string | null;
    conversationId?: string | null;
    attachments?: ImageAttachmentInput[];
    capabilities?: OrchestratorCapabilities;
};

export type OrchestrateChatOutput = {
    answer: string;
    conversationId: string;
    modelUsed: {
        id: string;
        provider: string;
        profile: string;
        why: string;
    };
    taskType: TaskType;
    contextSources: Array<{
        type: string;
        label: string;
        score: number;
    }>;
    memoryWrites: Array<{
        kind: string;
        content: string;
    }>;
    suggestedActions: string[];
    agent: {
        understanding: string;
        files_used: string[];
        proposed_changes: string[];
        patch_or_code: string;
        risks: string[];
        next_step: string;
    } | null;
};
