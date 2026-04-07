import crypto from "crypto";
import type {
    AgentRunEvent,
    AgentRunEventType,
    AgentRunPhase,
    AgentRunReference,
    AgentRunSnapshot,
    AgentRunValidatorOutcome,
} from "@/app/lib/workspaces/types";

type AgentRunState = {
    run: AgentRunSnapshot;
    listeners: Set<(event: AgentRunEvent) => void>;
};

const agentRuns = new Map<string, AgentRunState>();

function buildAgentRunReference(run: AgentRunSnapshot): AgentRunReference {
    return {
        id: run.id,
        status: run.status,
        currentPhase: run.currentPhase,
        retryCount: run.retryCount,
        updatedAt: run.updatedAt,
    };
}

export function createAgentRun(params: {
    conversationId: string;
    workspaceId?: string | null;
    projectId?: string | null;
    initialPhase?: AgentRunPhase;
}) {
    const now = new Date().toISOString();
    const run: AgentRunSnapshot = {
        id: crypto.randomUUID(),
        conversationId: params.conversationId,
        workspaceId: params.workspaceId || null,
        projectId: params.projectId || null,
        status: "running",
        currentPhase: params.initialPhase || "queued",
        retryCount: 0,
        updatedAt: now,
        events: [],
    };

    agentRuns.set(run.id, {
        run,
        listeners: new Set(),
    });

    emitAgentRunEvent(run.id, {
        type: "run_started",
        phase: run.currentPhase,
        summary: "Agent run started.",
    });

    return buildAgentRunReference(run);
}

export function getAgentRunSnapshot(runId: string) {
    return agentRuns.get(runId)?.run || null;
}

export function updateAgentRun(runId: string, updates: Partial<Pick<AgentRunSnapshot, "status" | "currentPhase" | "retryCount" | "projectId">>) {
    const state = agentRuns.get(runId);
    if (!state) {
        return null;
    }

    state.run = {
        ...state.run,
        ...updates,
        updatedAt: new Date().toISOString(),
    };

    agentRuns.set(runId, state);
    return buildAgentRunReference(state.run);
}

export function emitAgentRunEvent(
    runId: string,
    params: {
        type: AgentRunEventType;
        phase?: AgentRunPhase | null;
        summary?: string | null;
        filePath?: string | null;
        validator?: AgentRunValidatorOutcome | null;
        retryCount?: number | null;
        payload?: Record<string, unknown> | null;
    }
) {
    const state = agentRuns.get(runId);
    if (!state) {
        return null;
    }

    const timestamp = new Date().toISOString();
    const nextPhase = params.phase === undefined ? state.run.currentPhase : params.phase || state.run.currentPhase;
    const event: AgentRunEvent = {
        id: crypto.randomUUID(),
        runId,
        type: params.type,
        timestamp,
        phase: nextPhase,
        summary: params.summary || null,
        filePath: params.filePath || null,
        validator: params.validator || null,
        retryCount: params.retryCount ?? null,
        payload: params.payload || null,
    };

    state.run.events = [...state.run.events, event];
    state.run.updatedAt = timestamp;
    if (params.phase) {
        state.run.currentPhase = params.phase;
    }
    if (params.retryCount !== undefined && params.retryCount !== null) {
        state.run.retryCount = params.retryCount;
    }

    if (params.type === "run_completed") {
        state.run.status = "completed";
    }

    if (params.type === "run_failed") {
        state.run.status = "failed";
    }

    agentRuns.set(runId, state);
    for (const listener of state.listeners) {
        listener(event);
    }

    return event;
}

export function subscribeToAgentRun(runId: string, listener: (event: AgentRunEvent) => void) {
    const state = agentRuns.get(runId);
    if (!state) {
        return null;
    }

    state.listeners.add(listener);
    return () => {
        const latest = agentRuns.get(runId);
        latest?.listeners.delete(listener);
    };
}
