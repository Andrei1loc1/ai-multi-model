import type { ContextSource } from "@/app/lib/workspaces/types";

export function buildAgentArtifacts(params: {
    message: string;
    mode: "draft" | "apply";
    contextSources: ContextSource[];
    answer: string;
}) {
    const files = params.contextSources
        .filter((source) => source.type === "repo_chunk")
        .map((source) => source.label.split(":")[0])
        .slice(0, 8);

    const uniqueFiles = Array.from(new Set(files));
    const proposedChanges = uniqueFiles.length
        ? uniqueFiles.map((file) => `Review and update ${file} based on the requested task.`)
        : ["No repository files were used, so no patch was proposed."];

    const patch = uniqueFiles.length
        ? [
              "```diff",
              "--- draft-plan",
              "+++ proposed-changes",
              ...uniqueFiles.map((file) => `+ update ${file}`),
              "```",
          ].join("\n")
        : "";

    return {
        understanding: `Agent interpreted the request as: ${params.message.slice(0, 180)}`,
        files_used: uniqueFiles,
        proposed_changes: proposedChanges,
        patch_or_code:
            params.mode === "apply"
                ? `${patch}\n\nApply mode is enabled, but this version still returns a reviewed draft before any write action.`
                : patch || "No patch generated.",
        risks: uniqueFiles.length
            ? [
                  "Repository context may be incomplete if indexing skipped large or binary files.",
                  "Patch should be reviewed before applying to production code.",
              ]
            : ["No repository context was available, so any patch would be speculative."],
        next_step: uniqueFiles.length
            ? "Review the proposed files and confirm whether to refine or apply the draft."
            : "Connect or reindex a repository, then rerun the task in Agent mode.",
    };
}
