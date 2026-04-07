import type { VirtualProjectSnapshot } from "@/app/lib/virtualProjects/analyzer";

export type VirtualProjectValidatorStatus = "passed" | "failed" | "skipped";

export type VirtualProjectValidatorResult = {
    key: string;
    status: VirtualProjectValidatorStatus;
    message: string;
    filePaths?: string[];
};

type VirtualProjectValidator = (snapshot: VirtualProjectSnapshot) => VirtualProjectValidatorResult;

const REACT_UTILITY_CLASS_PREFIXES = [
    "absolute",
    "aspect-",
    "backdrop-",
    "block",
    "border",
    "bottom-",
    "break-",
    "brightness-",
    "capitalize",
    "clear-",
    "col-",
    "content-",
    "cursor-",
    "duration-",
    "divide-",
    "drop-shadow-",
    "ease-",
    "end-",
    "filter",
    "fixed",
    "flex",
    "float-",
    "font-",
    "gap-",
    "grid",
    "h-",
    "hover:",
    "inset-",
    "items-",
    "justify-",
    "left-",
    "leading-",
    "line-clamp-",
    "list-",
    "m-",
    "max-",
    "mb-",
    "md:",
    "min-",
    "mix-blend-",
    "ml-",
    "mr-",
    "mt-",
    "opacity-",
    "order-",
    "overflow-",
    "p-",
    "pb-",
    "pl-",
    "pointer-events-",
    "position-",
    "pr-",
    "pt-",
    "px-",
    "py-",
    "relative",
    "right-",
    "rotate-",
    "rounded",
    "scale-",
    "shadow",
    "shrink-",
    "skew-",
    "sm:",
    "space-",
    "sr-only",
    "sticky",
    "stroke-",
    "table-",
    "text-",
    "top-",
    "tracking-",
    "translate-",
    "transform",
    "transition",
    "underline",
    "uppercase",
    "visible",
    "w-",
    "z-",
];

function uniqueSorted(values: Iterable<string>) {
    return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function makeResult(
    key: string,
    status: VirtualProjectValidatorStatus,
    message: string,
    filePaths?: string[]
): VirtualProjectValidatorResult {
    return {
        key,
        status,
        message,
        filePaths: filePaths && filePaths.length ? uniqueSorted(filePaths) : undefined,
    };
}

function isProbablyUtilityClassName(className: string) {
    if (className.includes("[") || className.includes("]") || className.includes(":")) {
        return true;
    }

    return REACT_UTILITY_CLASS_PREFIXES.some((prefix) => className === prefix || className.startsWith(prefix));
}

function isProbablyStateOrHelperClassName(className: string) {
    return [
        "active",
        "completed",
        "disabled",
        "enabled",
        "empty",
        "error",
        "focus",
        "hidden",
        "hover",
        "loading",
        "open",
        "ready",
        "selected",
        "success",
        "visible",
    ].includes(className);
}

export const validateImportedCssCoherence: VirtualProjectValidator = (
    snapshot: VirtualProjectSnapshot
) => {
    if (snapshot.kind !== "react-app") {
        return makeResult(
            "imported-css-coherence",
            "skipped",
            "Imported CSS coherence is only checked for React virtual projects."
        );
    }

    if (!snapshot.importedCssFiles.length) {
        return makeResult(
            "imported-css-coherence",
            "skipped",
            "No imported CSS files were found in the snapshot."
        );
    }

    const availableCssFiles = new Set(snapshot.files.filter((file) => file.extension === ".css").map((file) => file.path));
    const missingFiles = snapshot.importedCssFiles.filter((path) => !availableCssFiles.has(path));

    if (missingFiles.length) {
        return makeResult(
            "imported-css-coherence",
            "failed",
            `Imported CSS coherence drift detected. Missing CSS files: ${missingFiles.join(", ")}.`,
            [...missingFiles, snapshot.entryFileChoice || snapshot.entryFile]
        );
    }

    return makeResult(
        "imported-css-coherence",
        "passed",
        `All ${snapshot.importedCssFiles.length} imported CSS files are present in the snapshot.`
    );
};

export const validateEntryFileExistence: VirtualProjectValidator = (
    snapshot: VirtualProjectSnapshot
) => {
    if (snapshot.entryFileExists) {
        return makeResult(
            "entry-file-existence",
            "passed",
            `Entry file "${snapshot.entryFile}" exists in the snapshot.`,
            [snapshot.entryFile]
        );
    }

    const fallback = snapshot.entryFileChoice && snapshot.entryFileChoice !== snapshot.entryFile
        ? ` Analyzer chose "${snapshot.entryFileChoice}" as the fallback entry.`
        : "";

    return makeResult(
        "entry-file-existence",
        "failed",
        `Entry file "${snapshot.entryFile}" was not found.${fallback}`,
        [snapshot.entryFile, snapshot.entryFileChoice].filter((value): value is string => Boolean(value))
    );
};

export const validateJsxCssContractDrift: VirtualProjectValidator = (
    snapshot: VirtualProjectSnapshot
) => {
    if (snapshot.kind !== "react-app" || !snapshot.react) {
        return makeResult(
            "jsx-css-contract-drift",
            "skipped",
            "JSX/CSS contract drift is only checked for React virtual projects."
        );
    }

    const semanticJsxClassNames = snapshot.react.jsxClassNames.filter((className) => !isProbablyUtilityClassName(className));
    const importedCssPaths = new Set(snapshot.react.importedCssFiles);
    const cssClassNames = new Set<string>();

    for (const file of snapshot.files) {
        if (file.extension !== ".css" || !importedCssPaths.has(file.path)) {
            continue;
        }

        for (const match of file.content.matchAll(/\.([_a-zA-Z][\w-]*)/g)) {
            if (match[1]) {
                cssClassNames.add(match[1]);
            }
        }
    }

    const semanticJsxClassNameSet = new Set(semanticJsxClassNames);

    if (!semanticJsxClassNames.length && !cssClassNames.size) {
        return makeResult(
            "jsx-css-contract-drift",
            "skipped",
            "No semantic JSX class names or imported CSS selectors were found."
        );
    }

    const missingSelectors = semanticJsxClassNames.filter((className) => !cssClassNames.has(className));
    const staleSelectors = Array.from(cssClassNames).filter(
        (className) =>
            !semanticJsxClassNameSet.has(className) &&
            !isProbablyUtilityClassName(className) &&
            !isProbablyStateOrHelperClassName(className)
    );

    if (!missingSelectors.length) {
        return makeResult(
            "jsx-css-contract-drift",
            "passed",
            staleSelectors.length
                ? `JSX class names are covered by imported CSS selectors. Extra CSS selectors were tolerated: ${staleSelectors.join(", ")}.`
                : "JSX class names and imported CSS selectors are aligned."
        );
    }

    const details: string[] = [];
    if (missingSelectors.length) {
        details.push(`missing selectors for JSX class names: ${missingSelectors.join(", ")}`);
    }

    return makeResult(
        "jsx-css-contract-drift",
        "failed",
        `JSX/CSS contract drift detected (${details.join("; ")}).`,
        [snapshot.entryFileChoice || snapshot.entryFile, ...snapshot.react.importedCssFiles]
    );
};

export const virtualProjectValidators: VirtualProjectValidator[] = [
    validateEntryFileExistence,
    validateImportedCssCoherence,
    validateJsxCssContractDrift,
];

export function runVirtualProjectValidators(snapshot: VirtualProjectSnapshot) {
    return virtualProjectValidators.map((validator) => validator(snapshot));
}
