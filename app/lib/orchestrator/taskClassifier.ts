import type { TaskType, WorkspaceMode } from "@/app/lib/workspaces/types";

const codingTerms = [
    "bug",
    "fix",
    "refactor",
    "code",
    "component",
    "typescript",
    "function",
    "patch",
    "implement",
    "write code",
    "change file",
    "modify",
    "edit",
];

const explainTerms = [
    "explain",
    "understand",
    "how does",
    "architecture",
    "logic",
    "flow",
    "explica",
    "logica",
    "cum functioneaza",
    "analizeaza",
];
const searchTerms = ["find", "search", "where is", "which file", "locate", "cauta", "gaseste", "unde este"];
const rewriteTerms = ["rewrite", "improve text", "make better", "summarize", "rezumat", "rezuma", "sumar"];
const planTerms = ["plan", "approach", "design", "roadmap", "strategie"];

export function classifyTask(message: string, mode: WorkspaceMode): TaskType {
    const lower = message.toLowerCase();
    if (planTerms.some((term) => lower.includes(term))) return "plan";
    if (searchTerms.some((term) => lower.includes(term))) return "search";
    if (rewriteTerms.some((term) => lower.includes(term))) return "rewrite";
    if (explainTerms.some((term) => lower.includes(term))) return "explain";
    if (mode === "agent" && codingTerms.some((term) => lower.includes(term))) return "coding";
    if (mode === "agent") return "coding";
    return "chat";
}
