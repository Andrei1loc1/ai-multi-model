import type { VirtualProjectKind, VirtualProjectPayload } from "@/app/lib/workspaces/types";

export type VirtualProjectSnapshotInput = Pick<VirtualProjectPayload, "kind" | "entryFile" | "files">;

export type VirtualProjectSnapshotFile = {
    path: string;
    language: string;
    content: string;
    extension: string;
};

export type VirtualProjectReactSnapshot = {
    sourceFiles: string[];
    entryFileChoice: string | null;
    importedCssFiles: string[];
    jsxClassNames: string[];
    cssSelectors: string[];
    cssClassNames: string[];
};

export type VirtualProjectSnapshot = {
    kind: VirtualProjectKind;
    entryFile: string;
    entryFileExists: boolean;
    entryFileChoice: string | null;
    files: VirtualProjectSnapshotFile[];
    importedCssFiles: string[];
    jsxClassNames: string[];
    cssSelectors: string[];
    candidateEditableFiles: string[];
    react: VirtualProjectReactSnapshot | null;
};

const REACT_SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const STYLE_EXTENSIONS = new Set([".css"]);
const EDITABLE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".css",
    ".json",
    ".md",
    ".mdx",
    ".html",
    ".htm",
]);

const REACT_ENTRY_CANDIDATES = [
    "src/main.tsx",
    "src/main.jsx",
    "src/index.tsx",
    "src/index.jsx",
    "app/page.tsx",
    "app/page.jsx",
    "pages/index.tsx",
    "pages/index.jsx",
    "index.tsx",
    "index.jsx",
    "main.tsx",
    "main.jsx",
    "src/App.tsx",
    "src/App.jsx",
    "app.tsx",
    "app.jsx",
];

function normalizeText(value: string) {
    return value.replace(/\r\n/g, "\n");
}

export function normalizeVirtualProjectPath(path: string) {
    return String(path)
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/")
        .trim();
}

export function getVirtualProjectFileExtension(path: string) {
    const normalized = normalizeVirtualProjectPath(path);
    const match = normalized.match(/(\.[^.\/]+)$/);
    return match ? match[1].toLowerCase() : "";
}

function getVirtualProjectDirectory(path: string) {
    const normalized = normalizeVirtualProjectPath(path);
    const index = normalized.lastIndexOf("/");
    return index >= 0 ? normalized.slice(0, index) : "";
}

function joinVirtualProjectPath(baseDir: string, relativePath: string) {
    const combined = [baseDir, relativePath].filter(Boolean).join("/");
    const segments = combined.split("/").filter(Boolean);
    const resolved: string[] = [];

    for (const segment of segments) {
        if (segment === ".") {
            continue;
        }

        if (segment === "..") {
            resolved.pop();
            continue;
        }

        resolved.push(segment);
    }

    return resolved.join("/");
}

function sortUniquePaths(paths: Iterable<string>) {
    return Array.from(new Set(paths)).sort((left, right) => left.localeCompare(right));
}

function isReactSourceFile(path: string) {
    return REACT_SOURCE_EXTENSIONS.has(getVirtualProjectFileExtension(path));
}

function isCssFile(path: string) {
    return STYLE_EXTENSIONS.has(getVirtualProjectFileExtension(path));
}

function isEditableFile(path: string) {
    return EDITABLE_EXTENSIONS.has(getVirtualProjectFileExtension(path));
}

function normalizeFiles(input: VirtualProjectSnapshotInput["files"]): VirtualProjectSnapshotFile[] {
    const withMetadata = input.map((file, index) => ({
        path: normalizeVirtualProjectPath(file.path),
        language: file.language.trim() || "text",
        content: normalizeText(file.content),
        extension: getVirtualProjectFileExtension(file.path),
        originalIndex: index,
    }));

    const deduped = new Map<string, (typeof withMetadata)[number]>();
    for (const file of withMetadata) {
        if (!deduped.has(file.path)) {
            deduped.set(file.path, file);
        }
    }

    return Array.from(deduped.values())
        .sort((left, right) => left.path.localeCompare(right.path) || left.originalIndex - right.originalIndex)
        .map(({ path, language, content, extension }) => ({ path, language, content, extension }));
}

function collectImportSpecifiers(source: string) {
    const matches = source.matchAll(
        /import\s+(?:[\w*\s{},]*from\s+)?["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g
    );

    return Array.from(matches, (match) => match[1] || match[2]).filter((value): value is string => Boolean(value));
}

function stripSpecifierQuery(specifier: string) {
    return specifier.split(/[?#]/, 1)[0];
}

function resolveRelativeVirtualPath(
    basePath: string,
    specifier: string,
    lookup: Map<string, VirtualProjectSnapshotFile>
) {
    const normalizedSpecifier = normalizeVirtualProjectPath(stripSpecifierQuery(specifier));
    const baseDir = getVirtualProjectDirectory(basePath);
    const joined = normalizeVirtualProjectPath(joinVirtualProjectPath(baseDir, normalizedSpecifier));
    const candidates = [
        joined,
        `${joined}.css`,
        joinVirtualProjectPath(joined, "index.css"),
    ].map(normalizeVirtualProjectPath);

    for (const candidate of candidates) {
        if (lookup.has(candidate)) {
            return candidate;
        }
    }

    return null;
}

function stripTemplateExpressions(value: string) {
    return value.replace(/\$\{[\s\S]*?\}/g, " ");
}

function extractClassTokensFromText(value: string) {
    return normalizeText(value)
        .split(/\s+/g)
        .map((token) => token.trim().replace(/^['"`{([<]+/, "").replace(/['"`}\])>;,]+$/, ""))
        .filter(Boolean);
}

function extractJsxClassNames(source: string) {
    const classNames = new Set<string>();
    const normalizedSource = normalizeText(source);
    const attributePatterns = [
        /\b(?:className|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g,
        /\b(?:className|class)\s*=\s*\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)\s*\}/g,
    ];

    for (const pattern of attributePatterns) {
        for (const match of normalizedSource.matchAll(pattern)) {
            const value = match[1] || match[2] || match[3] || "";
            for (const token of extractClassTokensFromText(stripTemplateExpressions(value))) {
                classNames.add(token);
            }
        }
    }

    return Array.from(classNames).sort((left, right) => left.localeCompare(right));
}

function normalizeCssSelector(selector: string) {
    return selector.replace(/\s+/g, " ").trim();
}

function extractCssSelectors(source: string) {
    const selectors = new Set<string>();
    const normalizedSource = normalizeText(source).replace(/\/\*[\s\S]*?\*\//g, "");

    for (const match of normalizedSource.matchAll(/([^{}]+)\{/g)) {
        const prelude = match[1]?.trim();
        if (!prelude || prelude.startsWith("@keyframes") || prelude.startsWith("@font-face")) {
            continue;
        }

        for (const selector of prelude.split(",")) {
            const normalizedSelector = normalizeCssSelector(selector);
            if (!normalizedSelector || normalizedSelector.startsWith("@")) {
                continue;
            }

            selectors.add(normalizedSelector);
        }
    }

    return Array.from(selectors).sort((left, right) => left.localeCompare(right));
}

function extractCssClassNames(selectors: string[]) {
    const classNames = new Set<string>();

    for (const selector of selectors) {
        for (const match of selector.matchAll(/\.([_a-zA-Z][\w-]*)/g)) {
            classNames.add(match[1]);
        }
    }

    return Array.from(classNames).sort((left, right) => left.localeCompare(right));
}

function chooseReactEntryFile(entryFile: string, files: VirtualProjectSnapshotFile[]) {
    const lookup = new Set(files.map((file) => file.path));
    const normalizedEntryFile = normalizeVirtualProjectPath(entryFile);

    if (lookup.has(normalizedEntryFile)) {
        return normalizedEntryFile;
    }

    for (const candidate of REACT_ENTRY_CANDIDATES) {
        const normalizedCandidate = normalizeVirtualProjectPath(candidate);
        if (lookup.has(normalizedCandidate)) {
            return normalizedCandidate;
        }
    }

    const firstReactSourceFile = files.find((file) => isReactSourceFile(file.path));
    return firstReactSourceFile ? firstReactSourceFile.path : null;
}

function chooseGeneralEntryFile(entryFile: string, files: VirtualProjectSnapshotFile[]) {
    const lookup = new Set(files.map((file) => file.path));
    const normalizedEntryFile = normalizeVirtualProjectPath(entryFile);

    if (lookup.has(normalizedEntryFile)) {
        return normalizedEntryFile;
    }

    return files.length ? files[0].path : null;
}

function buildCandidateEditableFiles(
    files: VirtualProjectSnapshotFile[],
    reactImportedCssFiles: string[],
    entryFileChoice: string | null
) {
    const priorityByPath = new Map<string, number>();

    for (const file of files) {
        if (isEditableFile(file.path)) {
            priorityByPath.set(file.path, 3);
        }
    }

    for (const path of files.filter((file) => isReactSourceFile(file.path)).map((file) => file.path)) {
        priorityByPath.set(path, Math.min(priorityByPath.get(path) ?? 2, 2));
    }

    for (const path of reactImportedCssFiles) {
        priorityByPath.set(path, Math.min(priorityByPath.get(path) ?? 1, 1));
    }

    if (entryFileChoice) {
        priorityByPath.set(entryFileChoice, Math.min(priorityByPath.get(entryFileChoice) ?? 0, 0));
    }

    return Array.from(priorityByPath.entries())
        .sort((left, right) => left[1] - right[1] || left[0].localeCompare(right[0]))
        .map(([path]) => path);
}

export function createVirtualProjectSnapshot(input: VirtualProjectSnapshotInput): VirtualProjectSnapshot {
    const files = normalizeFiles(input.files);
    const lookup = new Map(files.map((file) => [file.path, file] as const));
    const entryFile = normalizeVirtualProjectPath(input.entryFile);
    const entryFileExists = lookup.has(entryFile);
    const isReactProject = input.kind === "react-app";
    const entryFileChoice = isReactProject ? chooseReactEntryFile(entryFile, files) : chooseGeneralEntryFile(entryFile, files);

    const reactFiles = isReactProject
        ? files.filter((file) => isReactSourceFile(file.path))
        : [];

    const reactImportedCssFiles = isReactProject
        ? sortUniquePaths(
              reactFiles.flatMap((file) =>
                  collectImportSpecifiers(file.content)
                      .filter((specifier) => specifier.endsWith(".css") || specifier.includes(".css?") || specifier.includes(".css#"))
                      .map((specifier) => {
                          if (specifier.startsWith(".") || specifier.startsWith("/")) {
                              return resolveRelativeVirtualPath(file.path, specifier, lookup);
                          }

                          return null;
                      })
                      .filter((value): value is string => Boolean(value))
              )
          )
        : [];

    const jsxClassNames = isReactProject
        ? sortUniquePaths(reactFiles.flatMap((file) => extractJsxClassNames(file.content)))
        : [];

    const cssFiles = isReactProject
        ? files.filter((file) => isCssFile(file.path))
        : [];

    const cssSelectors = isReactProject
        ? sortUniquePaths(cssFiles.flatMap((file) => extractCssSelectors(file.content)))
        : [];

    const candidateEditableFiles = buildCandidateEditableFiles(files, reactImportedCssFiles, entryFileChoice);

    return {
        kind: input.kind,
        entryFile,
        entryFileExists,
        entryFileChoice,
        files,
        importedCssFiles: reactImportedCssFiles,
        jsxClassNames,
        cssSelectors,
        candidateEditableFiles,
        react: isReactProject
            ? {
                  sourceFiles: reactFiles.map((file) => file.path),
                  entryFileChoice,
                  importedCssFiles: reactImportedCssFiles,
                  jsxClassNames,
                  cssSelectors,
                  cssClassNames: extractCssClassNames(cssSelectors),
              }
            : null,
    };
}

export function analyzeVirtualProject(input: VirtualProjectSnapshotInput) {
    return createVirtualProjectSnapshot(input);
}

export function collectVirtualProjectEditableFiles(input: VirtualProjectSnapshotInput) {
    return createVirtualProjectSnapshot(input).candidateEditableFiles;
}
