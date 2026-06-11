import type { TaskType, WorkspaceMode } from "@/app/lib/workspaces/types";

// Cuvinte cheie pentru clasificare în ORICE mod (chat/agent)
const codingTerms = [
    "bug", "fix", "refactor", "implement", "write code", "change file",
    "modify code", "edit code", "add function", "create component",
    "build app", "build application", "creaza aplicatie", "construieste",
    "fa o aplicatie", "fa-mi o aplicatie", "fa un site", "build a website",
    "make a react app", "create react app", "new react project",
    "python script", "scrie un script", "automatizare", "automation",
    "code review", "review code", "debug", "optimize", "performance",
    "add feature", "new feature",
];

const explainTerms = [
    "explain", "understand", "how does", "architecture", "logic", "flow",
    "explica", "logica", "cum functioneaza", "analizeaza", "cum merge",
    "ce face", "how it works", "what does",
];

const searchTerms = [
    "find", "search", "where is", "which file", "locate",
    "cauta", "gaseste", "unde este", "in ce fisier",
];

const rewriteTerms = [
    "rewrite", "improve text", "make better", "summarize",
    "rezumat", "rezuma", "sumar", "paraphrase",
];

const planTerms = [
    "plan", "approach", "design", "roadmap", "strategie",
    "planificare", "cum abordam", "steps", "pasi",
];

const buildTerms = [
    "build", "create", "make", "generate", "develop", "app",
    "application", "aplicatie", "website", "site", "web app",
    "dashboard", "landing page", "mini app", "micro app",
    "component", "module", "feature",
];

/**
 * Clasificare task bazată pe conținutul mesajului, nu pe mod.
 * În agent mode, terminile de BUILD sunt verificate explicit
 * pentru a declanșa coding/virtual-project.
 */
export function classifyTask(message: string, mode: WorkspaceMode): TaskType {
    const lower = message.toLowerCase();

    // 1. PLAN - intenție de planificare
    if (planTerms.some((term) => lower.includes(term))) return "plan";

    // 2. SEARCH - căutare în repo/context
    if (searchTerms.some((term) => lower.includes(term))) return "search";

    // 3. REWRITE - rescriere text
    if (rewriteTerms.some((term) => lower.includes(term))) return "rewrite";

    // 4. EXPLAIN - explicație
    if (explainTerms.some((term) => lower.includes(term))) return "explain";

    // 5. CODING - doar dacă există termeni de coding/build explicit
    // Verifică termeni de BUILD doar în agent mode
    if (mode === "agent" && buildTerms.some((term) => lower.includes(term))) {
        return "coding";
    }

    // Verifică termeni de coding în orice mod
    if (codingTerms.some((term) => lower.includes(term))) {
        return "coding";
    }

    // 6. Default: CHAT pentru orice altceva
    return "chat";
}
