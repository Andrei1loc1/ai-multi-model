import crypto from "crypto";

type GitHubRepoRef = {
    owner: string;
    repo: string;
    branch?: string;
};

type GitHubTreeItem = {
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
    url: string;
};

const MAX_FILES = 80;
const MAX_FILE_BYTES = 50_000;
const CHUNK_LINES = 80;

const CODE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".py",
    ".go",
    ".rs",
    ".java",
    ".kt",
    ".sql",
    ".css",
    ".scss",
    ".html",
    ".yml",
    ".yaml",
]);

function githubHeaders() {
    const headers: Record<string, string> = {
        "User-Agent": "ai-multi-model",
        "Accept": "application/vnd.github+json",
    };

    if (process.env.GITHUB_TOKEN) {
        headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    return headers;
}

export function parseGitHubUrl(repoUrl: string): GitHubRepoRef {
    const url = new URL(repoUrl);
    const hostname = url.hostname.toLowerCase();
    if (hostname !== "github.com" && hostname !== "www.github.com") {
        throw new Error("Only GitHub repositories are supported.");
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length < 2) {
        throw new Error("Invalid GitHub repository URL.");
    }

    return {
        owner: parts[0],
        repo: parts[1].replace(/\.git$/, ""),
        branch: parts[3],
    };
}

export async function getGitHubRepoMetadata(repoUrl: string) {
    const parsed = parseGitHubUrl(repoUrl);
    const response = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`,
        { headers: githubHeaders(), cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error(`GitHub repo lookup failed with status ${response.status}.`);
    }

    const json = await response.json();
    return {
        owner: parsed.owner,
        repo: parsed.repo,
        branch: parsed.branch || json.default_branch || "main",
        description: json.description as string | null,
        private: Boolean(json.private),
    };
}

async function getRepoTree(owner: string, repo: string, branch: string) {
    const response = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
        { headers: githubHeaders(), cache: "no-store" }
    );

    if (!response.ok) {
        throw new Error(`GitHub tree fetch failed with status ${response.status}.`);
    }

    const json = await response.json();
    return (json.tree || []) as GitHubTreeItem[];
}

function fileExtension(path: string) {
    const dotIndex = path.lastIndexOf(".");
    return dotIndex >= 0 ? path.slice(dotIndex).toLowerCase() : "";
}

function isIndexablePath(path: string) {
    const extension = fileExtension(path);
    if (!CODE_EXTENSIONS.has(extension)) return false;

    const lower = path.toLowerCase();
    if (
        lower.includes("node_modules/") ||
        lower.includes(".next/") ||
        lower.includes("dist/") ||
        lower.includes("build/")
    ) {
        return false;
    }

    return true;
}

async function getFileContent(owner: string, repo: string, branch: string, path: string) {
    const response = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
        { headers: githubHeaders(), cache: "no-store" }
    );

    if (!response.ok) {
        return "";
    }

    return response.text();
}

function extractSymbols(content: string) {
    const matches = content.match(
        /\b(function|class|interface|type|const|let|var|export function|export const)\s+([A-Za-z0-9_]+)/g
    );
    if (!matches) return [];
    return Array.from(
        new Set(
            matches
                .map((match) => match.split(/\s+/).pop() || "")
                .filter(Boolean)
                .slice(0, 15)
        )
    );
}

function extractImports(content: string) {
    const matches = content.match(/(?:from\s+['"][^'"]+['"]|import\s+['"][^'"]+['"])/g);
    if (!matches) return [];
    return Array.from(new Set(matches.slice(0, 12)));
}

function inferTags(path: string, content: string) {
    const tags = new Set<string>();
    const lower = path.toLowerCase();
    if (lower.includes("/api/")) tags.add("api");
    if (lower.includes("/components/") || lower.endsWith(".tsx")) tags.add("ui");
    if (lower.includes("/lib/database") || lower.includes("sql")) tags.add("db");
    if (lower.includes("config") || lower.endsWith(".json") || lower.endsWith(".yml")) tags.add("config");
    if (lower.includes("test") || lower.includes("spec")) tags.add("tests");
    if (/route\.ts|route\.js/.test(lower)) tags.add("route");
    if (/react|useState|useEffect|jsx/.test(content)) tags.add("react");
    return Array.from(tags);
}

function summarizeFile(path: string, content: string, symbols: string[], tags: string[]) {
    const firstMeaningfulLine = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find((line) => line.length > 0 && !line.startsWith("//") && !line.startsWith("/*"));

    const parts = [`File ${path}`];
    if (symbols.length) parts.push(`symbols: ${symbols.slice(0, 6).join(", ")}`);
    if (tags.length) parts.push(`tags: ${tags.join(", ")}`);
    if (firstMeaningfulLine) parts.push(`starts with: ${firstMeaningfulLine.slice(0, 120)}`);
    return parts.join(" | ");
}

function chunkContent(
    workspaceId: string,
    repoConnectionId: string,
    path: string,
    content: string
) {
    const lines = content.split(/\r?\n/);
    const symbols = extractSymbols(content);
    const imports = extractImports(content);
    const tags = inferTags(path, content);
    const summary = summarizeFile(path, content, symbols, tags);

    const chunks: Array<Record<string, unknown>> = [];
    for (let start = 0; start < lines.length; start += CHUNK_LINES) {
        const lineStart = start + 1;
        const lineEnd = Math.min(start + CHUNK_LINES, lines.length);
        const chunkText = lines.slice(start, lineEnd).join("\n");
        if (!chunkText.trim()) continue;

        chunks.push({
            id: crypto.randomUUID(),
            workspace_id: workspaceId,
            repo_connection_id: repoConnectionId,
            path,
            content: chunkText,
            summary,
            symbols,
            imports,
            tags,
            line_start: lineStart,
            line_end: lineEnd,
            hash: crypto.createHash("sha1").update(`${path}:${lineStart}:${chunkText}`).digest("hex"),
            updated_at: new Date().toISOString(),
        });
    }

    return chunks;
}

export async function indexGitHubRepository(
    workspaceId: string,
    repoConnectionId: string,
    repoUrl: string
) {
    const repoMeta = await getGitHubRepoMetadata(repoUrl);
    const tree = await getRepoTree(repoMeta.owner, repoMeta.repo, repoMeta.branch);

    const files = tree
        .filter((item) => item.type === "blob")
        .filter((item) => isIndexablePath(item.path))
        .filter((item) => (item.size || 0) <= MAX_FILE_BYTES)
        .slice(0, MAX_FILES);

    const chunks: Array<Record<string, unknown>> = [];
    for (const file of files) {
        const content = await getFileContent(repoMeta.owner, repoMeta.repo, repoMeta.branch, file.path);
        if (!content.trim()) continue;
        chunks.push(...chunkContent(workspaceId, repoConnectionId, file.path, content));
    }

    return {
        repoMeta,
        filesIndexed: files.length,
        chunks,
    };
}
