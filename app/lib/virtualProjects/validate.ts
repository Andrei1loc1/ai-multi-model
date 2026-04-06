import type {
    VirtualProjectKind,
    VirtualProjectPayload,
    VirtualProjectValidationResult,
} from "@/app/lib/workspaces/types";

const MAX_FILES = 24;
const MAX_FILE_SIZE = 60_000;
const MAX_TOTAL_SIZE = 240_000;
const REACT_IMPORT_ALLOWLIST = new Set(["react", "react-dom", "react-dom/client"]);

function normalizeProjectPath(path: string) {
    return path
        .replace(/\\/g, "/")
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/")
        .trim();
}

function assertSafeProjectPath(path: string) {
    if (!path) {
        throw new Error("Virtual project files must have a path.");
    }

    if (path.split("/").some((segment) => !segment || segment === "." || segment === "..")) {
        throw new Error(`Unsupported virtual project path: ${path}`);
    }
}

function collectReactImports(content: string) {
    const matches = content.matchAll(
        /import\s+(?:[\w*\s{},]*from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g
    );

    return Array.from(matches, (match) => match[1] || match[2]).filter(Boolean);
}

function validateReactImports(path: string, content: string) {
    const imports = collectReactImports(content);

    for (const specifier of imports) {
        if (specifier.startsWith(".") || specifier.startsWith("/")) {
            continue;
        }

        if (!REACT_IMPORT_ALLOWLIST.has(specifier)) {
            throw new Error(
                `Unsupported React import "${specifier}" in ${path}. Allowed imports: ${Array.from(REACT_IMPORT_ALLOWLIST).join(", ")}.`
            );
        }
    }
}

function inferProjectKind(payload: VirtualProjectPayload): VirtualProjectKind {
    return payload.kind;
}

export function validateVirtualProjectPayload(payload: VirtualProjectPayload): VirtualProjectValidationResult {
    const normalizedFiles = payload.files.map((file) => {
        const path = normalizeProjectPath(file.path);
        assertSafeProjectPath(path);

        return {
            path,
            language: file.language.trim() || "text",
            content: file.content,
        };
    });

    if (!normalizedFiles.length) {
        throw new Error("Virtual project payload must contain at least one file.");
    }

    if (normalizedFiles.length > MAX_FILES) {
        throw new Error(`Virtual project payload exceeds the ${MAX_FILES}-file limit.`);
    }

    const totalSize = normalizedFiles.reduce((sum, file) => sum + file.content.length, 0);
    if (totalSize > MAX_TOTAL_SIZE) {
        throw new Error("Virtual project payload is too large to store safely.");
    }

    for (const file of normalizedFiles) {
        if (file.content.length > MAX_FILE_SIZE) {
            throw new Error(`File ${file.path} exceeds the ${MAX_FILE_SIZE}-character limit.`);
        }
    }

    const duplicatePaths = normalizedFiles.filter(
        (file, index, files) => files.findIndex((candidate) => candidate.path === file.path) !== index
    );
    if (duplicatePaths.length) {
        throw new Error(`Duplicate virtual project path detected: ${duplicatePaths[0].path}`);
    }

    const entryFile = normalizeProjectPath(payload.entryFile);
    assertSafeProjectPath(entryFile);

    if (!normalizedFiles.some((file) => file.path === entryFile)) {
        throw new Error(`Entry file "${entryFile}" was not found in the virtual project payload.`);
    }

    if (inferProjectKind(payload) === "react-app") {
        for (const file of normalizedFiles) {
            if (/\.(tsx?|jsx?)$/i.test(file.path)) {
                validateReactImports(file.path, file.content);
            }
        }
    }

    return {
        project: {
            ...payload,
            entryFile,
            files: normalizedFiles,
        },
        warnings: [],
    };
}

export const virtualProjectValidationLimits = {
    maxFiles: MAX_FILES,
    maxFileSize: MAX_FILE_SIZE,
    maxTotalSize: MAX_TOTAL_SIZE,
    reactImportAllowlist: Array.from(REACT_IMPORT_ALLOWLIST),
};
