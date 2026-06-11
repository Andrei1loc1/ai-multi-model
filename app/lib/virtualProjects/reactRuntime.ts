import * as ts from "typescript";
import { validateVirtualProjectPayload } from "@/app/lib/virtualProjects/validate";
import type { VirtualProjectPayload } from "@/app/lib/workspaces/types";

const REACT_VERSION = "19.2.4";

// CDN pentru pachete externe - toate se încarcă via esm.sh
function esmCdn(specifier: string, version?: string) {
    const url = version ? `https://esm.sh/${specifier}@${version}?dev` : `https://esm.sh/${specifier}?dev`;
    return url;
}

const EXTERNAL_ALLOWLIST: Record<string, string> = {
    "react": esmCdn("react", REACT_VERSION),
    "react-dom": esmCdn("react-dom", REACT_VERSION),
    "react-dom/client": esmCdn("react-dom/client", REACT_VERSION),
    "react/jsx-runtime": esmCdn("react/jsx-runtime", REACT_VERSION),
    "react/jsx-dev-runtime": esmCdn("react/jsx-dev-runtime", REACT_VERSION),
    "framer-motion": esmCdn("framer-motion"),
    "lucide-react": esmCdn("lucide-react"),
    "tailwindcss": esmCdn("tailwindcss"),
    "clsx": esmCdn("clsx"),
    "tailwind-merge": esmCdn("tailwind-merge"),
    "zustand": esmCdn("zustand"),
    "axios": esmCdn("axios"),
    "date-fns": esmCdn("date-fns"),
    "lodash": esmCdn("lodash-es"),
    "uuid": esmCdn("uuid"),
    "recharts": esmCdn("recharts"),
    "@tanstack/react-query": esmCdn("@tanstack/react-query"),
};

export type ReactPreviewBuildInput = Pick<VirtualProjectPayload, "entryFile" | "files"> & {
    title?: string;
    rootId?: string;
    backgroundColor?: string;
};

export type ReactPreviewBuildResult =
    | {
          ok: true;
          html: string;
          entryFile: string;
          moduleCount: number;
          warnings: string[];
      }
    | {
          ok: false;
          errors: string[];
          warnings: string[];
      };

type NormalizedModule = {
    path: string;
    source: string;
    extension: string;
};

function normalizeVirtualPath(path: string) {
    return path
        .replace(/\\/g, "/")
        .replace(/^\.\/+/, "")
        .replace(/^\/+/, "")
        .replace(/\/{2,}/g, "/")
        .trim();
}

function getExtension(path: string) {
    const normalized = normalizeVirtualPath(path);
    const match = normalized.match(/\.([^.\/]+)$/);
    return match ? `.${match[1].toLowerCase()}` : "";
}

function transpileToCommonJs(source: string, fileName: string) {
    const result = ts.transpileModule(source, {
        fileName,
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.CommonJS,
            jsx: ts.JsxEmit.React,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            allowJs: true,
            isolatedModules: true,
        },
        reportDiagnostics: true,
    });

    const diagnostics =
        result.diagnostics?.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")) || [];
    const needsReactGlobal = /\.(jsx|tsx)$/i.test(fileName);

    return {
        code: needsReactGlobal ? `const React = require("react");\n${result.outputText}` : result.outputText,
        diagnostics,
    };
}

function normalizeModules(input: ReactPreviewBuildInput) {
    const validation = validateVirtualProjectPayload({
        kind: "react-app",
        title: input.title || "Virtual React Project",
        summary: input.title || "Virtual React Project",
        entryFile: input.entryFile,
        previewMode: "react",
        files: input.files,
    });

    const modules = validation.project.files.flatMap((file) => {
        const extension = getExtension(file.path);
        const normalizedPath = normalizeVirtualPath(file.path);

        if (extension === ".html" || extension === ".htm") {
            return [];
        }

        if (extension === ".css" || extension === ".json") {
            return [{
                path: normalizedPath,
                source: file.content,
                extension,
            }];
        }

        const transpiled = transpileToCommonJs(file.content, normalizedPath);
        if (transpiled.diagnostics.length) {
            throw new Error(
                `TypeScript transpilation failed for ${normalizedPath}: ${transpiled.diagnostics.join(" | ")}`
            );
        }

        return [{
            path: normalizedPath,
            source: transpiled.code,
            extension,
        }];
    });

    return {
        ...validation,
        modules,
    };
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function buildInlineBootstrap(params: {
    rootId: string;
    backgroundColor: string;
    entryFile: string;
    modules: NormalizedModule[];
}) {
      const moduleMap = Object.fromEntries(params.modules.map((module) => [module.path, module.source]));
    return `
      const rootId = ${JSON.stringify(params.rootId)};
      const entryFile = ${JSON.stringify(normalizeVirtualPath(params.entryFile))};
      const backgroundColor = ${JSON.stringify(params.backgroundColor)};
      const moduleSources = ${JSON.stringify(moduleMap)};
      const moduleCache = new Map();
      const loggedErrors = [];
      const storageBuckets = {
        local: new Map(),
        session: new Map(),
      };

      const reactNamespace = ReactModule;
      const reactDomNamespace = ReactDOMClientModule;

      const externalModuleMap = new Map();

      async function loadExternalModule(specifier) {
        if (externalModuleMap.has(specifier)) {
          return externalModuleMap.get(specifier);
        }

        const cdnUrl = EXTERNAL_ALLOWLIST[specifier];
        if (!cdnUrl) {
          throw new Error('Unsupported external import: ' + specifier);
        }

        const module = await import(cdnUrl);
        const wrapped = Object.freeze({ ...module, default: module.default || module });
        externalModuleMap.set(specifier, wrapped);
        return wrapped;
      }

      function createStorage(bucket) {
        return {
          getItem(key) {
            const normalizedKey = String(key);
            return bucket.has(normalizedKey) ? bucket.get(normalizedKey) : null;
          },
          setItem(key, value) {
            bucket.set(String(key), String(value));
          },
          removeItem(key) {
            bucket.delete(String(key));
          },
          clear() {
            bucket.clear();
          },
          key(index) {
            return Array.from(bucket.keys())[index] ?? null;
          },
          get length() {
            return bucket.size;
          }
        };
      }

      const localStorageShim = createStorage(storageBuckets.local);
      const sessionStorageShim = createStorage(storageBuckets.session);

      try {
        Object.defineProperty(window, 'localStorage', {
          configurable: true,
          enumerable: true,
          value: localStorageShim,
        });
      } catch {}

      try {
        Object.defineProperty(window, 'sessionStorage', {
          configurable: true,
          enumerable: true,
          value: sessionStorageShim,
        });
      } catch {}

      function normalizePath(path) {
        return String(path).replace(/\\\\/g, '/').replace(/^\\.\\/+/,'').replace(/^\\/+/, '').replace(/\\/{2,}/g, '/').trim();
      }

      function dirname(path) {
        const normalized = normalizePath(path);
        const index = normalized.lastIndexOf('/');
        return index >= 0 ? normalized.slice(0, index) : '';
      }

      function join(baseDir, relativePath) {
        const parts = (baseDir ? baseDir + '/' : '') + relativePath;
        const segments = parts.split('/').filter(Boolean);
        const resolved = [];
        for (const segment of segments) {
          if (segment === '.') continue;
          if (segment === '..') {
            resolved.pop();
            continue;
          }
          resolved.push(segment);
        }
        return resolved.join('/');
      }

      function resolveCandidate(basePath, specifier) {
        const normalized = normalizePath(specifier);
        const baseDir = dirname(basePath);
        const joined = normalizePath(join(baseDir, normalized));
        const candidates = [
          joined,
          joined + '.ts',
          joined + '.tsx',
          joined + '.js',
          joined + '.jsx',
          joined + '.mjs',
          joined + '.cjs',
          joined + '.json',
          joined + '.css',
          join(joined, 'index.ts'),
          join(joined, 'index.tsx'),
          join(joined, 'index.js'),
          join(joined, 'index.jsx'),
          join(joined, 'index.mjs'),
          join(joined, 'index.cjs'),
          join(joined, 'index.json'),
          join(joined, 'index.css')
        ].map(normalizePath);

        for (const candidate of candidates) {
          if (Object.prototype.hasOwnProperty.call(moduleSources, candidate)) {
            return candidate;
          }
        }

        throw new Error(\`Unable to resolve \${specifier} from \${basePath}\`);
      }

      function makeExternalModule(namespace) {
        return Object.freeze({ ...namespace, default: namespace });
      }

      const reactExternal = makeExternalModule(reactNamespace);
      const reactDomExternal = makeExternalModule(reactDomNamespace);

      function externalRequire(specifier) {
        if (specifier === 'react') return reactExternal;
        if (specifier === 'react-dom') return reactDomExternal;
        if (specifier === 'react-dom/client') return reactDomExternal;
        throw new Error(\`Unsupported external import: \${specifier}\`);
      }

      function resolveRequire(fromPath, specifier) {
        const reactExternal = externalRequire(specifier);
        if (reactExternal) return reactExternal;

        if (specifier.startsWith('.') || specifier.startsWith('/')) {
          return loadModule(resolveCandidate(fromPath, specifier));
        }

        if (EXTERNAL_ALLOWLIST[specifier]) {
          return loadExternalModule(specifier);
        }

        throw new Error('Unsupported import: ' + specifier + ' from ' + fromPath);
      }

      function loadCss(path) {
        const existing = document.querySelector(\`style[data-virtual-project-style="\${path}"]\`);
        if (existing) {
          return {};
        }

        const style = document.createElement('style');
        style.setAttribute('data-virtual-project-style', path);
        style.textContent = moduleSources[path];
        document.head.appendChild(style);
        return {};
      }

      function loadJson(path) {
        return JSON.parse(moduleSources[path]);
      }

      async function loadModule(path) {
        const normalizedPath = normalizePath(path);
        if (moduleCache.has(normalizedPath)) {
          return moduleCache.get(normalizedPath);
        }

        if (!Object.prototype.hasOwnProperty.call(moduleSources, normalizedPath)) {
          throw new Error('Unknown virtual module: ' + normalizedPath);
        }

        if (normalizedPath.endsWith('.css')) {
          const cssExports = loadCss(normalizedPath);
          moduleCache.set(normalizedPath, cssExports);
          return cssExports;
        }

        if (normalizedPath.endsWith('.json')) {
          const jsonExports = loadJson(normalizedPath);
          moduleCache.set(normalizedPath, jsonExports);
          return jsonExports;
        }

        // Pre-load external dependencies to avoid async issues during sync eval
        const code = moduleSources[normalizedPath];
        const importRegex = /import\s+(?:.*?from\s+)?['"]([^'"]+)['"]/g;
        const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
        const matches = [...code.matchAll(importRegex), ...code.matchAll(requireRegex)];
        for (const match of matches) {
          const specifier = match[1];
          if (EXTERNAL_ALLOWLIST[specifier] && !externalModuleMap.has(specifier)) {
            await loadExternalModule(specifier);
          }
        }

        const module = { exports: {} };
        moduleCache.set(normalizedPath, module.exports);

        const wrappedRequire = (specifier) => resolveRequire(normalizedPath, specifier);
        const wrappedExports = module.exports;
        const wrappedModule = module;
        const dirnameValue = dirname(normalizedPath);
        const fn = new Function(
          'require',
          'module',
          'exports',
          '__filename',
          '__dirname',
          'localStorage',
          'sessionStorage',
          'window',
          'document',
          'globalThis',
          moduleSources[normalizedPath]
        );
        fn(
          wrappedRequire,
          wrappedModule,
          wrappedExports,
          normalizedPath,
          dirnameValue,
          localStorageShim,
          sessionStorageShim,
          window,
          document,
          globalThis
        );

        moduleCache.set(normalizedPath, wrappedModule.exports);
        return wrappedModule.exports;
      }

      function showError(error) {
        const panel = document.getElementById('virtual-project-error');
        if (!panel) return;
        const message = error instanceof Error ? error.message : String(error);
        panel.textContent = message;
        panel.style.display = 'block';
        loggedErrors.push(message);
      }

      window.addEventListener('error', (event) => {
        showError(event.error || event.message);
      });

      window.addEventListener('unhandledrejection', (event) => {
        showError(event.reason || 'Unhandled rejection');
      });

      try {
        const entryModule = await loadModule(entryFile);
        const entryComponent = entryModule && entryModule.default ? entryModule.default : entryModule.App || entryModule;
        const appRoot = document.getElementById(rootId);

        if (!appRoot) {
          throw new Error(\`Missing preview root element: \${rootId}\`);
        }

        appRoot.style.background = backgroundColor;

        const canRenderEntryComponent =
          typeof entryComponent === 'function' ||
          typeof entryComponent === 'string' ||
          Boolean(
            entryComponent &&
            typeof entryComponent === 'object' &&
            '$$typeof' in entryComponent
          );

        if (canRenderEntryComponent) {
          const element = ReactModule.createElement(entryComponent);
          const reactRoot = ReactDOMClientModule.createRoot(appRoot);
          reactRoot.render(element);
        }

        window.parent?.postMessage(
          {
            type: 'virtual-project-react-ready',
            rootId,
            entryFile,
          },
          '*'
        );
      } catch (error) {
        showError(error);
        window.parent?.postMessage(
          {
            type: 'virtual-project-react-error',
            rootId,
            entryFile,
            error: error instanceof Error ? error.message : String(error),
          },
          '*'
        );
      }
    `;
}

export function buildReactPreviewDocument(input: ReactPreviewBuildInput): ReactPreviewBuildResult {
    try {
        const normalized = normalizeModules(input);
        const rootId = input.rootId || "root";
        const backgroundColor = input.backgroundColor || "transparent";
        const bootstrap = buildInlineBootstrap({
            rootId,
            backgroundColor,
            entryFile: normalized.project.entryFile,
            modules: normalized.modules,
        });

        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(normalized.project.title || "Virtual React Project")}</title>
    <style>
      html, body { width: 100%; min-height: 100%; margin: 0; background: ${backgroundColor}; overflow: auto; }
      body { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      #${rootId} { min-height: 100vh; width: 100%; }
      #virtual-project-error {
        display: none;
        position: fixed;
        inset: 16px;
        padding: 16px;
        border-radius: 18px;
        border: 1px solid rgba(248, 113, 113, 0.35);
        background: rgba(127, 29, 29, 0.72);
        color: #fee2e2;
        font: 13px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace;
        white-space: pre-wrap;
        overflow: auto;
        z-index: 9999;
      }
    </style>
  </head>
  <body>
    <div id="${rootId}"></div>
    <pre id="virtual-project-error"></pre>
    <script type="module">
      import * as ReactModule from ${JSON.stringify(REACT_CDN)};
      import * as ReactDOMClientModule from ${JSON.stringify(REACT_DOM_CLIENT_CDN)};
      ${bootstrap}
    </script>
  </body>
</html>`;

        return {
            ok: true,
            html,
            entryFile: normalized.project.entryFile,
            moduleCount: normalized.modules.length,
            warnings: normalized.warnings,
        };
    } catch (error) {
        return {
            ok: false,
            errors: [error instanceof Error ? error.message : String(error)],
            warnings: [],
        };
    }
}

export function validateReactPreviewInput(input: ReactPreviewBuildInput) {
    return normalizeModules(input);
}
