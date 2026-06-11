import type { ContextSource } from "@/app/lib/workspaces/types";

function extractCodeBlocks(content: string): string[] {
    const blocks: string[] = [];
    const regex = /```(?:\w+)?\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        blocks.push(match[1].trim());
    }
    return blocks;
}

function extractListItems(content: string, marker: string): string[] {
    const regex = new RegExp(`^${marker}\\s*(.+)$`, "gm");
    const matches = content.match(regex);
    return matches ? matches.map((m) => m.replace(new RegExp(`^${marker}\\s*`), "").trim()) : [];
}

function extractSection(content: string, headers: string[]): string {
    const lowerContent = content.toLowerCase();
    for (const header of headers) {
        const idx = lowerContent.indexOf(header.toLowerCase());
        if (idx >= 0) {
            const start = idx + header.length;
            const nextHeaderMatch = lowerContent.slice(start).match(/\n#{1,6}\s/);
            const end = nextHeaderMatch ? start + nextHeaderMatch.index! : undefined;
            return content.slice(start, end).trim();
        }
    }
    return "";
}

export function buildAgentArtifacts(params: {
    message: string;
    mode: "draft" | "apply";
    contextSources: ContextSource[];
    answer: string;
}) {
    const { answer, contextSources, message } = params;

    // 1. Încearcă să parseze JSON din răspuns
    const jsonMatch = answer.match(/```json\s*([\s\S]*?)```/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[1].trim());
            if (parsed.understanding || parsed.files_used || parsed.proposed_changes) {
                return {
                    understanding: parsed.understanding || `Task: ${message.slice(0, 180)}`,
                    files_used: Array.isArray(parsed.files_used) ? parsed.files_used : [],
                    proposed_changes: Array.isArray(parsed.proposed_changes) ? parsed.proposed_changes : [],
                    patch_or_code: parsed.patch_or_code || parsed.code || "",
                    risks: Array.isArray(parsed.risks) ? parsed.risks : [],
                    next_step: parsed.next_step || "Review the generated artifacts.",
                };
            }
        } catch {
            // JSON invalid, continuă cu parsing text
        }
    }

    // 2. Extrage din răspunsul text
    const files = contextSources
        .filter((source) => source.type === "repo_chunk")
        .map((source) => source.label.split(":")[0])
        .slice(0, 8);

    const uniqueFiles = Array.from(new Set(files));

    const understanding =
        extractSection(answer, ["## Understanding", "## Plan", "## Intelegere", "## Plan"]) ||
        `Agent interpreted the request as: ${message.slice(0, 180)}`;

    const proposedChanges =
        extractListItems(answer, "-").length > 0
            ? extractListItems(answer, "-")
            : extractCodeBlocks(answer).length > 0
            ? ["Code changes proposed in the response."]
            : ["No specific changes proposed."];

    const codeBlocks = extractCodeBlocks(answer);
    const patch = codeBlocks.length > 0 ? codeBlocks.join("\n\n---\n\n") : "";

    const risks =
        extractListItems(
            extractSection(answer, ["## Risks", "## Riscuri", "### Risks", "### Riscuri"]),
            "-"
        ) ||
        (uniqueFiles.length
            ? [
                  "Repository context may be incomplete if indexing skipped large or binary files.",
                  "Changes should be reviewed before applying.",
              ]
            : ["No repository context was available, so any changes would be speculative."]);

    const nextStep =
        extractSection(answer, ["## Next Step", "## Next", "## Pasul Urmator", "## Urmatorul Pas"]) ||
        (uniqueFiles.length
            ? "Review the proposed files and confirm whether to refine or apply the changes."
            : "Connect or reindex a repository, then rerun the task in Agent mode.");

    return {
        understanding,
        files_used: uniqueFiles,
        proposed_changes: proposedChanges,
        patch_or_code: params.mode === "apply" && patch ? patch : patch || "No patch generated.",
        risks: Array.isArray(risks) ? risks : [risks],
        next_step: nextStep,
    };
}
