"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
    ChevronDown,
    FolderPlus,
    GitBranchPlus,
    Plus,
    RefreshCcw,
    ImagePlus,
    Send,
    ShieldCheck,
    SlidersHorizontal,
    Sparkles,
} from "lucide-react";
import ChatWindow from "@/app/components/Chat/ChatWindow";
import ImageAttachmentStrip, {
    type ChatImageAttachmentPreview,
} from "@/app/components/Chat/ImageAttachmentStrip";
import ModelSelector from "@/app/components/Chat/ModelSelector";
import ProviderSelector from "@/app/components/Chat/ProviderSelector";
import type { ConversationMessageItem } from "@/app/components/Chat/ConversationThread";
import SaveResponseModal from "@/app/components/modals/SaveResponseModal";
import VirtualProjectPanel, {
    type VirtualProjectTab,
} from "@/app/components/Workspace/VirtualProjectPanel";
import type { VirtualProjectPreviewStatus } from "@/app/components/Workspace/VirtualProjectPreview";
import WorkspaceSidebar from "@/app/components/Workspace/WorkspaceSidebar";
import { getModelsForProvider, ProviderFilter } from "@/app/lib/AImodels/models";
import { createPythonRuntime, type PythonRunResult, type PythonRuntimeSession } from "@/app/lib/virtualProjects/pythonRuntime";
import { buildReactPreviewDocument } from "@/app/lib/virtualProjects/reactRuntime";
import type {
    ImageAttachmentInput,
    MessageAttachmentMetadata,
    OrchestrateChatOutput,
    VirtualProject,
    VirtualProjectRunSummary,
    VirtualProjectSummary,
} from "@/app/lib/workspaces/types";

type Workspace = {
    id: string;
    name: string;
    description?: string | null;
};

type Conversation = {
    id: string;
    title: string;
    mode: "chat" | "agent";
    workspace_id?: string | null;
};

type ConversationApiResponse = {
    conversation: Conversation;
    messages: ConversationMessageItem[];
    latestProject?: VirtualProjectSummary | null;
};

type ChatImageAttachmentDraft = ChatImageAttachmentPreview & {
    file: File;
    imageAssetId: string | null;
    mimeType: string;
    width: number | null;
    height: number | null;
};

type UploadedImageAttachment = {
    imageAssetId: string;
    previewUrl?: string | null;
    storagePath?: string | null;
    name?: string | null;
    mimeType?: string | null;
    width?: number | null;
    height?: number | null;
};

type ChatUIProps = {
    uploadImageAttachment?: (file: File, draft: ChatImageAttachmentDraft) => Promise<UploadedImageAttachment>;
};

function fileToDataUrl(file: File) {
    return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new Error("Failed to read image."));
        reader.readAsDataURL(file);
    });
}

function buildLoadedResult(message: ConversationMessageItem, conversationId: string): OrchestrateChatOutput {
    return {
        answer: message.content,
        conversationId,
        modelUsed: message.metadata?.modelUsed || {
            id: "loaded-history",
            provider: "history",
            profile: "conversation",
            why: "Loaded from recent conversation history.",
        },
        taskType: (message.metadata?.taskType as OrchestrateChatOutput["taskType"] | undefined) || "chat",
        contextSources: message.metadata?.contextSources || [],
        memoryWrites: [],
        suggestedActions: [
            "Continue this thread with a follow-up message.",
            "Refine the last answer or ask for a patch.",
        ],
        agent: message.metadata?.agent || null,
        virtualProject: message.metadata?.virtualProject || null,
    };
}

function buildLogsFromRunSummary(summary: VirtualProjectRunSummary | null, lastError?: string | null) {
    const lines: string[] = [];

    if (summary?.stdout) {
        lines.push(summary.stdout);
    }

    if (summary?.stderr) {
        lines.push(summary.stderr);
    }

    if (lastError) {
        lines.push(lastError);
    }

    return lines;
}

function mergeProjectSummary(project: VirtualProject, summary: VirtualProjectSummary): VirtualProject {
    return {
        ...project,
        workspaceId: summary.workspaceId,
        conversationId: summary.conversationId,
        sourceMessageId: summary.sourceMessageId,
        kind: summary.kind,
        title: summary.title,
        prompt: summary.prompt,
        status: summary.status,
        entryFile: summary.entryFile,
        previewMode: summary.previewMode,
        manifest: summary.manifest,
        lastRunSummary: summary.lastRunSummary,
        lastError: summary.lastError,
        createdAt: summary.createdAt,
        updatedAt: summary.updatedAt,
    };
}

export default function ChatUI({ uploadImageAttachment }: ChatUIProps = {}) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<ConversationMessageItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState("auto");
    const [selectedProvider, setSelectedProvider] = useState<ProviderFilter>("all");
    const [mode, setMode] = useState<"chat" | "agent">("chat");
    const [executionMode, setExecutionMode] = useState<"draft" | "apply">("draft");
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [repoUrl, setRepoUrl] = useState("");
    const [showAttachPanel, setShowAttachPanel] = useState(false);
    const [showMobileControls, setShowMobileControls] = useState(false);
    const [imageAttachments, setImageAttachments] = useState<ChatImageAttachmentDraft[]>([]);
    const [result, setResult] = useState<OrchestrateChatOutput | null>(null);
    const [activeProject, setActiveProject] = useState<VirtualProject | null>(null);
    const [activeProjectTab, setActiveProjectTab] = useState<VirtualProjectTab>("overview");
    const [selectedProjectFilePath, setSelectedProjectFilePath] = useState<string | null>(null);
    const [previewStatus, setPreviewStatus] = useState<VirtualProjectPreviewStatus>("idle");
    const [previewLogs, setPreviewLogs] = useState<string[]>([]);
    const [reactPreviewDocument, setReactPreviewDocument] = useState<string | null>(null);
    const [pythonPreviewResult, setPythonPreviewResult] = useState<PythonRunResult | null>(null);
    const [statusMessage, setStatusMessage] = useState("Cloud workspace ready.");
    const [error, setError] = useState<string | null>(null);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
    const [saveResponseContent, setSaveResponseContent] = useState("");
    const imageInputRef = useRef<HTMLInputElement | null>(null);
    const imageUploadSequenceRef = useRef(0);
    const imageAttachmentsRef = useRef<ChatImageAttachmentDraft[]>([]);
    const pythonRuntimeRef = useRef<PythonRuntimeSession | null>(null);

    const defaultUploadImageAttachment = useCallback(async (file: File) => {
        const dataUrl = await fileToDataUrl(file);
        const response = await fetch("/api/uploads/image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                fileName: file.name,
                dataUrl,
                workspaceId: selectedWorkspaceId,
                conversationId: selectedConversationId,
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || "Failed to upload image.");
        }

        return {
            imageAssetId: data.asset.id,
            previewUrl: data.asset.public_url || null,
            storagePath: data.asset.storage_path || null,
            name: data.asset.file_name || file.name,
            mimeType: data.asset.mime_type || file.type,
            width: data.asset.width ?? null,
            height: data.asset.height ?? null,
        };
    }, [selectedConversationId, selectedWorkspaceId]);

    const uploadImageAttachmentHandler = uploadImageAttachment || defaultUploadImageAttachment;

    useEffect(() => {
        imageAttachmentsRef.current = imageAttachments;
    }, [imageAttachments]);

    useEffect(() => {
        return () => {
            pythonRuntimeRef.current?.dispose();
        };
    }, []);

    useEffect(() => {
        if (!activeProject) {
            return;
        }

        setSelectedProjectFilePath((current) =>
            current && activeProject.files.some((file) => file.path === current)
                ? current
                : activeProject.entryFile
        );
    }, [activeProject]);

    const clearImageAttachments = useCallback(() => {
        setImageAttachments((current) => {
            current.forEach((attachment) => {
                if (attachment.previewUrl) {
                    URL.revokeObjectURL(attachment.previewUrl);
                }
            });
            return [];
        });
    }, []);

    const resetProjectSurface = useCallback(() => {
        setActiveProject(null);
        setActiveProjectTab("overview");
        setSelectedProjectFilePath(null);
        setPreviewStatus("idle");
        setPreviewLogs([]);
        setReactPreviewDocument(null);
        setPythonPreviewResult(null);
    }, []);

    const loadVirtualProject = useCallback(
        async (projectId: string, nextTab?: VirtualProjectTab) => {
            const res = await fetch(`/api/virtual-projects/${projectId}`, {
                cache: "no-store",
            });
            const data = (await res.json()) as { project?: VirtualProject; error?: string };

            if (!res.ok || !data.project) {
                throw new Error(data.error || "Failed to load virtual project.");
            }

            setActiveProject(data.project);
            setSelectedProjectFilePath((current) =>
                current && data.project?.files.some((file) => file.path === current)
                    ? current
                    : data.project?.entryFile || null
            );
            setPreviewStatus(data.project.lastError ? "error" : data.project.lastRunSummary ? "ready" : "idle");
            setPreviewLogs(buildLogsFromRunSummary(data.project.lastRunSummary, data.project.lastError));
            setReactPreviewDocument(null);
            setPythonPreviewResult(null);

            if (nextTab) {
                setActiveProjectTab(nextTab);
            }

            return data.project;
        },
        []
    );

    const persistProjectSummary = useCallback(async (projectId: string, body: Record<string, unknown>) => {
        const res = await fetch(`/api/virtual-projects/${projectId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
        const data = (await res.json()) as { project?: VirtualProjectSummary; error?: string };

        if (!res.ok || !data.project) {
            throw new Error(data.error || "Failed to update virtual project.");
        }

        setActiveProject((current) =>
            current && current.id === data.project?.id ? mergeProjectSummary(current, data.project) : current
        );

        return data.project;
    }, []);

    const visibleConversations = useMemo(
        () =>
            selectedWorkspaceId
                ? conversations.filter((conversation) => conversation.workspace_id === selectedWorkspaceId)
                : conversations,
        [conversations, selectedWorkspaceId]
    );

    const selectedWorkspace = useMemo(
        () => workspaces.find((workspace) => workspace.id === selectedWorkspaceId) || null,
        [workspaces, selectedWorkspaceId]
    );

    const selectedConversation = useMemo(
        () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
        [conversations, selectedConversationId]
    );

    const loadWorkspaceState = useCallback(async (preferredWorkspaceId?: string | null) => {
        try {
            const res = await fetch("/api/workspaces", { cache: "no-store" });
            const data = await res.json();
            const nextWorkspaces = data.workspaces || [];
            setWorkspaces(nextWorkspaces);
            setConversations(data.conversations || []);

            const targetWorkspaceId =
                (preferredWorkspaceId && nextWorkspaces.some((workspace: Workspace) => workspace.id === preferredWorkspaceId)
                    ? preferredWorkspaceId
                    : null) ||
                (selectedWorkspaceId && nextWorkspaces.some((workspace: Workspace) => workspace.id === selectedWorkspaceId)
                    ? selectedWorkspaceId
                    : null) ||
                (nextWorkspaces[0]?.id ?? null);

            if (targetWorkspaceId !== selectedWorkspaceId) {
                setSelectedWorkspaceId(targetWorkspaceId);
            }
        } catch (loadError) {
            console.error(loadError);
        }
    }, [selectedWorkspaceId]);

    const loadConversationThread = useCallback(async (conversationId: string) => {
        const res = await fetch(`/api/workspaces/conversations/${conversationId}`, {
            cache: "no-store",
        });
        const data = (await res.json()) as ConversationApiResponse & { error?: string };

        if (!res.ok) {
            throw new Error(data.error || "Failed to load conversation.");
        }

        const threadMessages = (data.messages || []).map((message) => ({
            ...message,
            attachments:
                Array.isArray(message.attachments)
                    ? message.attachments
                    : Array.isArray((message.metadata as { attachments?: MessageAttachmentMetadata[] } | null)?.attachments)
                    ? ((message.metadata as { attachments?: MessageAttachmentMetadata[] } | null)?.attachments || [])
                    : [],
            metadata: message.metadata || null,
        }));
        const latestAssistant =
            [...threadMessages].reverse().find((message) => message.role === "assistant") || null;

        setMessages(threadMessages);
        setMode(data.conversation.mode === "agent" ? "agent" : "chat");
        setSelectedWorkspaceId(data.conversation.workspace_id || null);
        setResult(latestAssistant ? buildLoadedResult(latestAssistant, data.conversation.id) : null);
        if (data.latestProject?.id) {
            await loadVirtualProject(data.latestProject.id);
        } else {
            resetProjectSurface();
        }
        setStatusMessage(`Loaded conversation: ${data.conversation.title}`);
        setError(null);
        return data;
    }, [loadVirtualProject, resetProjectSurface]);

    useEffect(() => {
        void loadWorkspaceState();
    }, [loadWorkspaceState]);

    useEffect(() => {
        if (selectedModel === "auto") {
            return;
        }

        const availableModels = getModelsForProvider(selectedProvider);
        const isSelectedModelVisible = availableModels.some((model) => model.id === selectedModel);

        if (!isSelectedModelVisible) {
            setSelectedModel("auto");
        }
    }, [selectedModel, selectedProvider]);

    useEffect(() => {
        if (!selectedConversationId) {
            setMessages([]);
            setResult(null);
            resetProjectSurface();
            return;
        }

        let cancelled = false;

        const run = async () => {
            setLoading(true);

            try {
                if (cancelled) return;
                await loadConversationThread(selectedConversationId);
            } catch (loadError: unknown) {
                if (!cancelled) {
                    setError(loadError instanceof Error ? loadError.message : "Failed to load conversation.");
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [selectedConversationId, loadConversationThread, resetProjectSurface]);

    useEffect(() => {
        if (!selectedConversationId) {
            clearImageAttachments();
        }
    }, [clearImageAttachments, selectedConversationId]);

    const handleSelectWorkspace = (workspaceId: string) => {
        setSelectedWorkspaceId(workspaceId);
        setSelectedConversationId(null);
        setMessages([]);
        setResult(null);
        resetProjectSurface();
        setError(null);
        setRepoUrl("");
        setShowAttachPanel(false);
        setShowMobileControls(false);
        clearImageAttachments();
        setStatusMessage("Workspace switched. Select a conversation or start a new thread.");
    };

    const handleDeleteWorkspace = async (workspaceId: string) => {
        const confirmed = window.confirm("Delete this workspace permanently? This will also delete its conversations.");
        if (!confirmed) {
            return;
        }

        try {
            const res = await fetch(`/api/workspaces/${workspaceId}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to delete workspace.");
            }

            if (selectedWorkspaceId === workspaceId) {
                setSelectedWorkspaceId(null);
                setSelectedConversationId(null);
                setMessages([]);
                setResult(null);
                resetProjectSurface();
                clearImageAttachments();
                setStatusMessage("Workspace deleted.");
            }

            await loadWorkspaceState();
        } catch (deleteError: unknown) {
            setError(deleteError instanceof Error ? deleteError.message : "Failed to delete workspace.");
        }
    };

    const handleSelectConversation = (conversationId: string) => {
        setSelectedConversationId(conversationId);
        setShowMobileControls(false);
    };

    const handleDeleteConversation = async (conversationId: string) => {
        const confirmed = window.confirm("Delete this conversation permanently?");
        if (!confirmed) {
            return;
        }

        try {
            const res = await fetch(`/api/workspaces/conversations/${conversationId}`, {
                method: "DELETE",
            });
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to delete conversation.");
            }

            if (selectedConversationId === conversationId) {
                setSelectedConversationId(null);
                setMessages([]);
                setResult(null);
                resetProjectSurface();
                clearImageAttachments();
                setStatusMessage("Conversation deleted.");
            }

            await loadWorkspaceState();
        } catch (deleteError: unknown) {
            setError(deleteError instanceof Error ? deleteError.message : "Failed to delete conversation.");
        }
    };

    const removeImageAttachment = useCallback((attachmentId: string) => {
        setImageAttachments((current) => {
            const found = current.find((attachment) => attachment.id === attachmentId);
            if (found?.previewUrl) {
                URL.revokeObjectURL(found.previewUrl);
            }

            return current.filter((attachment) => attachment.id !== attachmentId);
        });
    }, []);

    const uploadQueuedImageAttachment = useCallback(
        async (target: ChatImageAttachmentDraft) => {
            setImageAttachments((current) =>
                current.map((attachment) =>
                    attachment.id === target.id
                        ? { ...attachment, status: "uploading", errorMessage: null }
                        : attachment
                )
            );

            try {
                const uploaded = await uploadImageAttachmentHandler(target.file, target);

                setImageAttachments((current) =>
                    current.map((attachment) =>
                        attachment.id === target.id
                            ? {
                                  ...attachment,
                                  status: "ready",
                                  imageAssetId: uploaded.imageAssetId,
                                  previewUrl: uploaded.previewUrl || attachment.previewUrl,
                                  mimeType: uploaded.mimeType || attachment.mimeType,
                                  width: uploaded.width ?? attachment.width,
                                  height: uploaded.height ?? attachment.height,
                                  name: uploaded.name || attachment.name,
                                  errorMessage: null,
                              }
                            : attachment
                    )
                );
            } catch (uploadError: unknown) {
                setImageAttachments((current) =>
                    current.map((attachment) =>
                        attachment.id === target.id
                            ? {
                                  ...attachment,
                                  status: "error",
                                  errorMessage:
                                      uploadError instanceof Error
                                          ? uploadError.message
                                          : "Image upload failed.",
                              }
                            : attachment
                    )
                );
            }
        },
        [uploadImageAttachmentHandler]
    );

    const handleImageSelection = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));

            if (!files.length) {
                event.target.value = "";
                return;
            }

            const nextAttachments = files.map((file) => {
                const id = `image-attachment-${Date.now()}-${imageUploadSequenceRef.current++}`;
                const previewUrl = URL.createObjectURL(file);

                return {
                    id,
                    file,
                    name: file.name,
                    previewUrl,
                    status: "queued" as const,
                    errorMessage: null,
                    imageAssetId: null,
                    mimeType: file.type,
                    width: null,
                    height: null,
                };
            });

            setImageAttachments((current) => [...current, ...nextAttachments]);
            event.target.value = "";

            nextAttachments.forEach((attachment) => {
                void uploadQueuedImageAttachment(attachment);
            });
        },
        [uploadQueuedImageAttachment]
    );

    useEffect(() => {
        return () => {
            imageAttachmentsRef.current.forEach((attachment) => {
                if (attachment.previewUrl) {
                    URL.revokeObjectURL(attachment.previewUrl);
                }
            });
        };
    }, []);

    const handleOpenVirtualProject = useCallback((projectId: string) => {
        void loadVirtualProject(projectId, "files").catch((loadError: unknown) => {
            setError(loadError instanceof Error ? loadError.message : "Failed to open virtual project.");
        });
    }, [loadVirtualProject]);

    const handleDownloadVirtualProject = useCallback(() => {
        if (!activeProject) {
            return;
        }

        const anchor = document.createElement("a");
        anchor.href = `/api/virtual-projects/${activeProject.id}/download`;
        anchor.download = `${activeProject.title || "virtual-project"}.zip`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
    }, [activeProject]);

    const handleRunVirtualProject = useCallback(async () => {
        if (!activeProject) {
            return;
        }

        setError(null);
        setActiveProjectTab("preview");
        setPreviewLogs([]);
        setReactPreviewDocument(null);
        setPythonPreviewResult(null);

        if (activeProject.kind === "react-app") {
            setPreviewStatus("loading");
            const build = buildReactPreviewDocument({
                title: activeProject.title,
                entryFile: activeProject.entryFile,
                files: activeProject.files.map((file) => ({
                    path: file.path,
                    language: file.language,
                    content: file.content,
                })),
            });

            if (!build.ok) {
                const errorMessage = build.errors.join("\n");
                setPreviewStatus("error");
                setPreviewLogs(build.errors);
                await persistProjectSummary(activeProject.id, {
                    status: "error",
                    lastRunSummary: {
                        status: "error",
                        stdout: null,
                        stderr: errorMessage,
                        durationMs: null,
                        updatedAt: new Date().toISOString(),
                    },
                    lastError: errorMessage,
                }).catch(() => undefined);
                return;
            }

            setReactPreviewDocument(build.html);
            const logs = [
                `Built ${build.moduleCount} virtual modules for preview.`,
                ...build.warnings,
            ];
            setPreviewLogs(logs);
            setPreviewStatus("ready");
            await persistProjectSummary(activeProject.id, {
                status: "ready",
                lastRunSummary: {
                    status: "success",
                    stdout: logs.join("\n"),
                    stderr: null,
                    durationMs: null,
                    updatedAt: new Date().toISOString(),
                },
                lastError: null,
            }).catch(() => undefined);
            return;
        }

        const entryFile = activeProject.files.find((file) => file.path === activeProject.entryFile);
        if (!entryFile) {
            const errorMessage = `Entry file ${activeProject.entryFile} was not found.`;
            setPreviewStatus("error");
            setPreviewLogs([errorMessage]);
            return;
        }

        setPreviewStatus("loading");

        if (!pythonRuntimeRef.current) {
            pythonRuntimeRef.current = createPythonRuntime();
        }

        try {
            await pythonRuntimeRef.current.ready;
            setPreviewStatus("running");
            const runResult = await pythonRuntimeRef.current.run(entryFile.content);
            setPythonPreviewResult(runResult);
            setPreviewStatus(runResult.status === "success" ? "ready" : "error");
            setPreviewLogs(
                [runResult.stdout, runResult.stderr, runResult.errorMessage]
                    .filter((value): value is string => Boolean(value && value.trim()))
            );
            await persistProjectSummary(activeProject.id, {
                status: runResult.status === "success" ? "ready" : "error",
                lastRunSummary: {
                    status: runResult.status === "success" ? "success" : "error",
                    stdout: runResult.stdout || null,
                    stderr: runResult.stderr || runResult.errorMessage || null,
                    durationMs: runResult.durationMs,
                    updatedAt: new Date().toISOString(),
                },
                lastError: runResult.status === "success" ? null : runResult.errorMessage,
            }).catch(() => undefined);
        } catch (runError: unknown) {
            const errorMessage = runError instanceof Error ? runError.message : "Python runtime failed.";
            setPreviewStatus("error");
            setPreviewLogs([errorMessage]);
            await persistProjectSummary(activeProject.id, {
                status: "error",
                lastRunSummary: {
                    status: "error",
                    stdout: null,
                    stderr: errorMessage,
                    durationMs: null,
                    updatedAt: new Date().toISOString(),
                },
                lastError: errorMessage,
            }).catch(() => undefined);
        }
    }, [activeProject, persistProjectSummary]);

    const sendMessage = async () => {
        const outgoingMessage = input.trim();
        if (!outgoingMessage) return;

        const readyAttachments = imageAttachments.filter(
            (attachment) => attachment.status === "ready" && attachment.imageAssetId
        );
        const blockedAttachment = imageAttachments.find((attachment) => attachment.status === "uploading" || attachment.status === "queued");
        const erroredAttachment = imageAttachments.find((attachment) => attachment.status === "error");

        if (blockedAttachment) {
            setError(`Wait for ${blockedAttachment.name || "the selected image"} to finish uploading.`);
            return;
        }

        if (erroredAttachment) {
            setError(`Remove ${erroredAttachment.name || "the failed image"} before sending.`);
            return;
        }

        const tempUserId = `temp-user-${Date.now()}`;
        const tempAssistantId = `temp-assistant-${Date.now()}`;
        const outgoingAttachments: ImageAttachmentInput[] = readyAttachments.map((attachment) => ({
            type: "image",
            imageAssetId: attachment.imageAssetId as string,
            name: attachment.name,
            mimeType: attachment.mimeType,
            width: attachment.width,
            height: attachment.height,
        }));
        const optimisticAttachments: MessageAttachmentMetadata[] = readyAttachments.map((attachment) => ({
            type: "image",
            imageAssetId: attachment.imageAssetId as string,
            name: attachment.name,
            mimeType: attachment.mimeType,
            width: attachment.width,
            height: attachment.height,
            previewUrl: attachment.previewUrl || null,
            storagePath: null,
        }));

        setLoading(true);
        setError(null);
        setInput("");
        setMessages((current) => [
            ...current,
            {
                id: tempUserId,
                role: "user",
                content: outgoingMessage,
                created_at: new Date().toISOString(),
                attachments: optimisticAttachments,
            },
            {
                id: tempAssistantId,
                role: "assistant",
                content: "",
                created_at: new Date().toISOString(),
                pending: true,
            },
        ]);

        try {
            const res = await fetch("/api/orchestrate/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: outgoingMessage,
                    mode,
                    selectedModel,
                    selectedProvider,
                    workspaceId: selectedWorkspaceId,
                    conversationId: selectedConversationId,
                    attachments: outgoingAttachments,
                    capabilities: {
                        allowMemory: true,
                        allowRepo: true,
                        allowNotes: true,
                        executionMode,
                    },
                }),
            });

            const data = (await res.json()) as OrchestrateChatOutput & { error?: string };
            if (!res.ok) {
                throw new Error(data.error || "Failed to orchestrate response.");
            }

            setResult(data);
            setStatusMessage(`Using ${data.modelUsed.id} on ${data.modelUsed.provider} via ${data.modelUsed.profile}.`);
            clearImageAttachments();
            await loadWorkspaceState();

            if (data.conversationId !== selectedConversationId) {
                setSelectedConversationId(data.conversationId);
            } else {
                await loadConversationThread(data.conversationId);
                if (data.virtualProject?.id) {
                    await loadVirtualProject(data.virtualProject.id, "overview");
                }
            }
        } catch (sendError: unknown) {
            setMessages((current) => current.filter((message) => message.id !== tempUserId && message.id !== tempAssistantId));
            setInput(outgoingMessage);
            setError(sendError instanceof Error ? sendError.message : "Failed to send message.");
        } finally {
            setLoading(false);
        }
    };

    const createWorkspace = async () => {
        const name = window.prompt("Workspace name");
        if (!name?.trim()) return;

        const description = window.prompt("Short description (optional)") || "";
        const res = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, description }),
        });
        const data = await res.json();
        if (res.ok && data.workspace) {
            setSelectedWorkspaceId(data.workspace.id);
            setSelectedConversationId(null);
            setMessages([]);
            setResult(null);
            resetProjectSurface();
            setRepoUrl("");
            setShowAttachPanel(false);
            setShowMobileControls(false);
            clearImageAttachments();
            setStatusMessage(`Workspace ${data.workspace.name} created.`);
            await loadWorkspaceState(data.workspace.id);
        } else {
            setError(data.error || "Failed to create workspace.");
        }
    };

    const connectRepo = async () => {
        if (!selectedWorkspaceId) {
            setError("Create or select a workspace first.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const connectRes = await fetch(`/api/workspaces/${selectedWorkspaceId}/connect-repo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repoUrl }),
            });
            const connectData = await connectRes.json();
            if (!connectRes.ok) {
                throw new Error(connectData.error || "Failed to connect repository.");
            }

            setStatusMessage(`Connected ${connectData.repoConnection.owner}/${connectData.repoConnection.repo}. Indexing repository...`);

            const reindexRes = await fetch(`/api/workspaces/${selectedWorkspaceId}/reindex`, {
                method: "POST",
            });
            const reindexData = await reindexRes.json();
            if (!reindexRes.ok) {
                throw new Error(reindexData.error || "Repository connected, but indexing failed.");
            }

            setStatusMessage(
                `Connected ${connectData.repoConnection.owner}/${connectData.repoConnection.repo} and indexed ${reindexData.filesIndexed} files.`
            );
            setRepoUrl("");
            setShowAttachPanel(false);
            setShowMobileControls(false);
            await loadWorkspaceState();
        } catch (connectError: unknown) {
            setError(connectError instanceof Error ? connectError.message : "Failed to connect repository.");
        } finally {
            setLoading(false);
        }
    };

    const reindexRepo = async () => {
        if (!selectedWorkspaceId) {
            setError("Select a workspace first.");
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/workspaces/${selectedWorkspaceId}/reindex`, {
                method: "POST",
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Failed to reindex repo.");
            }
            setStatusMessage(`Indexed ${data.filesIndexed} files and ${data.chunksIndexed} chunks.`);
        } catch (reindexError: unknown) {
            setError(reindexError instanceof Error ? reindexError.message : "Failed to reindex repo.");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveAssistantMessage = useCallback((content: string) => {
        setSaveResponseContent(content);
        setIsSaveModalOpen(true);
    }, []);

    const previewElement = useMemo(() => {
        if (!activeProject) {
            return undefined;
        }

        if (activeProject.kind === "react-app" && reactPreviewDocument) {
            return (
                <iframe
                    title={`${activeProject.title} preview`}
                    srcDoc={reactPreviewDocument}
                    sandbox="allow-scripts"
                    className="min-h-[420px] w-full rounded-[18px] border border-white/8 bg-slate-950"
                />
            );
        }

        if (activeProject.kind === "python-script" && pythonPreviewResult) {
            return (
                <div className="grid gap-3 rounded-[20px] border border-white/8 bg-slate-950/75 p-4 text-sm text-white">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Python output</div>
                            <div className="mt-1 font-medium text-white">{activeProject.entryFile}</div>
                        </div>
                        <span className="rounded-full border border-white/8 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-300">
                            {pythonPreviewResult.status}
                        </span>
                    </div>

                    {pythonPreviewResult.stdout ? (
                        <div className="rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.08] p-3 text-sm leading-6 text-white">
                            {pythonPreviewResult.stdout}
                        </div>
                    ) : null}

                    {pythonPreviewResult.stderr || pythonPreviewResult.errorMessage ? (
                        <div className="rounded-2xl border border-red-300/10 bg-red-300/[0.08] p-3 text-sm leading-6 text-white">
                            {pythonPreviewResult.stderr || pythonPreviewResult.errorMessage}
                        </div>
                    ) : null}

                    {pythonPreviewResult.result !== null ? (
                        <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-3 text-sm leading-6 text-slate-100">
                            <div className="mb-2 text-[10px] uppercase tracking-[0.22em] text-slate-500">Return value</div>
                            <pre className="whitespace-pre-wrap break-words">{JSON.stringify(pythonPreviewResult.result, null, 2)}</pre>
                        </div>
                    ) : null}
                </div>
            );
        }

        return undefined;
    }, [activeProject, pythonPreviewResult, reactPreviewDocument]);

    return (
        <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-2.5 overflow-x-clip px-2.5 pb-2.5 pt-16 sm:px-3 lg:px-4 lg:pb-3 lg:pt-6">
            <div className="grid min-w-0 grid-cols-1 gap-2.5 xl:grid-cols-[280px_minmax(0,1fr)] xl:items-start">
                <WorkspaceSidebar
                    workspaces={workspaces}
                    conversations={visibleConversations}
                    selectedWorkspaceId={selectedWorkspaceId}
                    selectedConversationId={selectedConversationId}
                    onSelectWorkspace={handleSelectWorkspace}
                    onSelectConversation={handleSelectConversation}
                    onDeleteWorkspace={handleDeleteWorkspace}
                    onDeleteConversation={handleDeleteConversation}
                    onCreateWorkspace={createWorkspace}
                />

                <main className="min-w-0 rounded-[24px] border border-white/8 bg-slate-950/74 p-2.5 shadow-[0_18px_60px_rgba(2,6,23,0.42)] backdrop-blur-2xl sm:rounded-[28px] sm:p-3">
                    <div className="grid gap-2.5 sm:gap-3">
                        <section className="rounded-[22px] border border-white/6 bg-white/[0.03] p-3 sm:rounded-[26px] sm:p-4">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0">
                                    <h1 className="flex items-center gap-2 text-[1.35rem] font-semibold text-white sm:text-2xl">
                                        Multi-Model Cloud Agent
                                        <Sparkles size={17} className="text-cyan-200 sm:h-[18px] sm:w-[18px]" />
                                    </h1>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                    <div className="flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                                        {(["chat", "agent"] as const).map((item) => (
                                            <button
                                                key={item}
                                                onClick={() => setMode(item)}
                                                className={`rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] transition sm:px-4 sm:py-2 sm:text-xs ${
                                                    mode === item ? "bg-cyan-300/18 text-white" : "text-slate-400"
                                                }`}
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>

                                    {mode === "agent" && (
                                        <div className="flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                                            {(["draft", "apply"] as const).map((item) => (
                                                <button
                                                    key={item}
                                                    onClick={() => setExecutionMode(item)}
                                                    className={`rounded-full px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.24em] transition sm:px-4 sm:py-2 sm:text-xs ${
                                                        executionMode === item ? "bg-violet-300/18 text-white" : "text-slate-400"
                                                    }`}
                                                >
                                                    {item}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[20px] border border-white/6 bg-white/[0.03] p-2.5 sm:rounded-[24px] sm:p-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="text-[9px] uppercase tracking-[0.28em] text-slate-500">Active Thread</div>
                                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400 sm:text-[11px]">
                                        <span className="rounded-full border border-white/8 bg-slate-950/55 px-2.5 py-1">
                                            {selectedWorkspace ? selectedWorkspace.name : "No workspace"}
                                        </span>
                                        <span className="rounded-full border border-white/8 bg-slate-950/55 px-2.5 py-1">
                                            {(selectedConversation ? selectedConversation.mode : mode).toUpperCase()}
                                        </span>
                                        {result?.modelUsed?.id && (
                                            <span className="rounded-full border border-white/8 bg-slate-950/55 px-2.5 py-1">
                                                {result.modelUsed.id}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowMobileControls((value) => !value)}
                                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-2xl border border-white/8 bg-slate-950/75 px-3 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:border-cyan-300/20 hover:bg-slate-900/85 lg:hidden"
                                >
                                    <SlidersHorizontal size={14} />
                                    Controls
                                    <ChevronDown size={14} className={`transition-transform ${showMobileControls ? "rotate-180" : ""}`} />
                                </button>
                            </div>

                            <div className={`mt-3 ${showMobileControls ? "block" : "hidden"} lg:mt-0 lg:block`}>
                                <div className="rounded-[18px] border border-white/6 bg-slate-950/45 p-2.5 sm:rounded-[22px] sm:p-3">
                                    <div className="mb-2 text-[9px] uppercase tracking-[0.28em] text-slate-500 lg:hidden">Controls</div>
                                    <div className="grid gap-2 sm:grid-cols-2 2xl:flex 2xl:flex-wrap 2xl:items-center">
                                        <ProviderSelector
                                            selectedProvider={selectedProvider}
                                            setSelectedProvider={setSelectedProvider}
                                        />

                                        <ModelSelector
                                            selectedModel={selectedModel}
                                            setSelectedModel={setSelectedModel}
                                            selectedProvider={selectedProvider}
                                        />

                                        <button
                                            onClick={() => {
                                                setShowAttachPanel((value) => !value);
                                                setShowMobileControls(true);
                                            }}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-slate-950/75 px-3.5 text-sm text-white transition hover:border-cyan-300/20 hover:bg-slate-900/85"
                                        >
                                            <FolderPlus size={16} />
                                            Attach
                                        </button>

                                        <button
                                            onClick={reindexRepo}
                                            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/8 bg-slate-950/75 px-3.5 text-sm text-white transition hover:border-cyan-300/20 hover:bg-slate-900/85"
                                        >
                                            <RefreshCcw size={16} />
                                            Reindex
                                        </button>
                                    </div>
                                </div>

                                {showAttachPanel && (
                                    <div className="mt-3 rounded-[20px] border border-violet-300/10 bg-violet-300/[0.08] p-3 sm:rounded-[22px] sm:p-4">
                                        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
                                            <GitBranchPlus size={16} />
                                            Connect GitHub repository
                                        </div>
                                        <div className="flex flex-col gap-2 md:flex-row">
                                            <input
                                                value={repoUrl}
                                                onChange={(e) => setRepoUrl(e.target.value)}
                                                placeholder="https://github.com/owner/repo"
                                                className="h-10 flex-1 rounded-2xl border border-white/10 bg-slate-950/70 px-3.5 text-sm text-white outline-none transition focus:border-cyan-300/30 sm:h-11 sm:px-4"
                                            />
                                            <button
                                                onClick={connectRepo}
                                                className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-cyan-300/[0.16] px-4 text-sm font-medium text-white transition hover:bg-cyan-300/[0.24] sm:h-11"
                                            >
                                                <Plus size={15} />
                                                Connect
                                            </button>
                                        </div>
                                        <p className="mt-2 text-xs leading-5 text-slate-300">
                                            Attach a repo to improve code context, retrieval and agent output inside this thread.
                                        </p>
                                    </div>
                                )}
                            </div>
                        </section>

                        <section className="rounded-[22px] border border-white/6 bg-white/[0.03] p-2.5 sm:rounded-[26px] sm:p-3">
                            <div className="mb-2.5 flex items-start gap-3 rounded-[18px] border border-white/6 bg-slate-950/45 p-2.5 sm:mb-3 sm:rounded-[22px] sm:p-3">
                                <div className="mt-0.5 rounded-2xl border border-emerald-300/10 bg-emerald-300/[0.08] p-2 text-emerald-200">
                                    <ShieldCheck size={15} />
                                </div>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium text-white">{statusMessage}</div>
                                    <div className="mt-1 text-[11px] leading-5 text-slate-400 sm:text-xs">
                                        {result?.taskType ? `Task: ${result.taskType}` : "Thread-first chat enabled."}
                                    </div>
                                    {error && (
                                        <div className="mt-2 rounded-2xl border border-red-400/15 bg-red-400/[0.08] px-3 py-2 text-xs text-red-200">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <ChatWindow
                                messages={messages}
                                loading={loading}
                                onSaveAssistantMessage={handleSaveAssistantMessage}
                                onOpenVirtualProject={handleOpenVirtualProject}
                            />

                            {(mode === "agent" || activeProject) && (
                                <div className="mt-3">
                                    <VirtualProjectPanel
                                        project={activeProject}
                                        activeTab={activeProjectTab}
                                        onTabChange={setActiveProjectTab}
                                        selectedFilePath={selectedProjectFilePath}
                                        onSelectedFilePathChange={setSelectedProjectFilePath}
                                        previewStatus={previewStatus}
                                        previewLogs={previewLogs}
                                        previewElement={previewElement}
                                        onRun={handleRunVirtualProject}
                                        onDownload={handleDownloadVirtualProject}
                                    />
                                </div>
                            )}

                            <div className="sticky bottom-2 mt-2.5 rounded-[16px] border border-white/8 bg-slate-950/95 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur-xl sm:bottom-0 sm:mt-3 sm:rounded-[18px] sm:pb-2">
                                {imageAttachments.length > 0 && (
                                    <div className="mb-2 rounded-[12px] border border-white/6 bg-white/[0.02] p-1.5 sm:rounded-[14px] sm:p-2">
                                        <ImageAttachmentStrip
                                            attachments={imageAttachments}
                                            onRemove={removeImageAttachment}
                                            compact
                                        />
                                    </div>
                                )}

                                <div className="flex items-end gap-2">
                                    <input
                                        ref={imageInputRef}
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="hidden"
                                        onChange={handleImageSelection}
                                    />

                                    <button
                                        type="button"
                                        onClick={() => imageInputRef.current?.click()}
                                        className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-[14px] border border-white/8 bg-white/[0.03] px-3 text-sm font-medium text-white transition hover:border-cyan-300/20 hover:bg-white/[0.06] sm:h-[46px] sm:px-3.5"
                                    >
                                        <ImagePlus size={16} />
                                        <span className="hidden sm:inline">Attach image</span>
                                    </button>

                                    <textarea
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        placeholder={
                                            mode === "agent"
                                                ? "Ask for code, repo, or a patch."
                                                : "Ask anything in this thread."
                                        }
                                        rows={1}
                                        className="max-h-28 min-h-[42px] flex-1 resize-none rounded-[14px] border border-white/8 bg-white/[0.03] px-3 py-2.5 text-sm leading-5 text-white placeholder-slate-500 outline-none transition focus:border-cyan-300/30 sm:max-h-32 sm:min-h-[46px] sm:px-3.5"
                                    />

                                    <button
                                        onClick={sendMessage}
                                        disabled={loading || imageAttachments.some((attachment) => attachment.status === "uploading" || attachment.status === "queued")}
                                        className="inline-flex h-[42px] shrink-0 items-center justify-center gap-2 rounded-[14px] bg-gradient-to-r from-cyan-400/28 to-violet-400/24 px-3.5 text-sm font-medium text-white transition hover:from-cyan-400/38 hover:to-violet-400/34 disabled:opacity-50 sm:h-[46px] sm:px-4"
                                    >
                                        <Send size={16} />
                                        <span className="hidden sm:inline">Send</span>
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
                </main>
            </div>

            {isSaveModalOpen && saveResponseContent && (
                <SaveResponseModal
                    response={saveResponseContent}
                    setIsSaveModalOpen={setIsSaveModalOpen}
                />
            )}
        </div>
    );
}
