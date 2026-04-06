const DEFAULT_PYODIDE_CDN_INDEX = "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/";
const DEFAULT_PYODIDE_LOADER = `${DEFAULT_PYODIDE_CDN_INDEX}pyodide.js`;

export type PythonRunStatus = "success" | "error" | "timeout";

export type PythonRunResult = {
    status: PythonRunStatus;
    stdout: string;
    stderr: string;
    result: unknown;
    durationMs: number;
    errorMessage: string | null;
};

export type PythonRuntimeOptions = {
    loaderUrl?: string;
    indexUrl?: string;
};

export type PythonRuntimeSession = {
    ready: Promise<void>;
    run(code: string, timeoutMs?: number): Promise<PythonRunResult>;
    dispose(): void;
};

type WorkerRequest =
    | {
          type: "init";
          requestId: string;
          loaderUrl: string;
          indexUrl: string;
      }
    | {
          type: "run";
          requestId: string;
          code: string;
      };

type WorkerResponse =
    | {
          type: "ready";
          requestId: string;
      }
    | {
          type: "result";
          requestId: string;
          payload: PythonRunResult;
      }
    | {
          type: "error";
          requestId: string;
          errorMessage: string;
      };

function createRequestId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function serializeError(error: unknown) {
    if (error instanceof Error) {
        return error.stack || error.message;
    }

    return typeof error === "string" ? error : JSON.stringify(error);
}

function createPythonWorkerSource() {
    return `
      let pyodide = null;
      let stdoutChunks = [];
      let stderrChunks = [];

      function pushStdout(text) {
        stdoutChunks.push(text);
      }

      function pushStderr(text) {
        stderrChunks.push(text);
      }

      function makeResult(status, result, errorMessage, startTime) {
        return {
          status,
          stdout: stdoutChunks.join(''),
          stderr: stderrChunks.join(''),
          result: result ?? null,
          durationMs: Date.now() - startTime,
          errorMessage: errorMessage ?? null,
        };
      }

      self.onmessage = async (event) => {
        const message = event.data;

        if (message.type === 'init') {
          try {
            importScripts(message.loaderUrl);
            pyodide = await loadPyodide({ indexURL: message.indexUrl });
            pyodide.setStdout({ batched: pushStdout });
            pyodide.setStderr({ batched: pushStderr });
            self.postMessage({ type: 'ready', requestId: message.requestId });
          } catch (error) {
            self.postMessage({
              type: 'error',
              requestId: message.requestId,
              errorMessage: error instanceof Error ? error.stack || error.message : String(error),
            });
          }
          return;
        }

        if (message.type === 'run') {
          const startTime = Date.now();
          stdoutChunks = [];
          stderrChunks = [];

          try {
            if (!pyodide) {
              throw new Error('Pyodide is not initialized.');
            }

            const value = await pyodide.runPythonAsync(message.code);
            let converted = value;

            if (converted && typeof converted === 'object') {
              if (typeof converted.toJs === 'function') {
                try {
                  const convertedValue = converted.toJs({ create_proxies: false });
                  if (typeof converted.destroy === 'function') {
                    converted.destroy();
                  }
                  converted = convertedValue;
                } catch {
                  if (typeof converted.destroy === 'function') {
                    converted.destroy();
                  }
                  converted = String(value);
                }
              }
            }

            self.postMessage({
              type: 'result',
              requestId: message.requestId,
              payload: makeResult('success', converted, null, startTime),
            });
          } catch (error) {
            self.postMessage({
              type: 'result',
              requestId: message.requestId,
              payload: makeResult(
                'error',
                null,
                error instanceof Error ? error.stack || error.message : String(error),
                startTime
              ),
            });
          }
        }
      };
    `;
}

function createPythonWorker(loaderUrl: string, indexUrl: string) {
    const worker = new Worker(URL.createObjectURL(new Blob([createPythonWorkerSource()], { type: "text/javascript" })));
    const initRequestId = createRequestId();

    const initPromise = new Promise<void>((resolve, reject) => {
        const handleMessage = (event: MessageEvent<WorkerResponse>) => {
            const message = event.data;
            if (message.requestId !== initRequestId) {
                return;
            }

            if (message.type === "ready") {
                worker.removeEventListener("message", handleMessage as EventListener);
                resolve();
                return;
            }

            if (message.type === "error") {
                worker.removeEventListener("message", handleMessage as EventListener);
                reject(new Error(message.errorMessage));
            }
        };

        worker.addEventListener("message", handleMessage as EventListener);
        worker.postMessage({
            type: "init",
            requestId: initRequestId,
            loaderUrl,
            indexUrl,
        } satisfies WorkerRequest);
    });

    return {
        worker,
        initPromise,
    };
}

export function createPythonRuntime(options: PythonRuntimeOptions = {}): PythonRuntimeSession {
    const loaderUrl = options.loaderUrl || DEFAULT_PYODIDE_LOADER;
    const indexUrl = options.indexUrl || DEFAULT_PYODIDE_CDN_INDEX;
    let workerState = createPythonWorker(loaderUrl, indexUrl);
    let disposed = false;
    let runQueue: Promise<unknown> = Promise.resolve();

    async function ensureReady() {
        if (disposed) {
            throw new Error("Python runtime session has been disposed.");
        }

        await workerState.initPromise;
    }

    async function run(code: string, timeoutMs = 10_000) {
        await ensureReady();

        return new Promise<PythonRunResult>((resolve, reject) => {
            const requestId = createRequestId();
            const worker = workerState.worker;
            let finished = false;

            const cleanup = () => {
                worker.removeEventListener("message", handleMessage as EventListener);
                if (timeoutHandle) {
                    clearTimeout(timeoutHandle);
                }
            };

            const restartWorker = () => {
                try {
                    worker.terminate();
                } catch {
                    // noop
                }
                if (!disposed) {
                    workerState = createPythonWorker(loaderUrl, indexUrl);
                }
            };

            const handleMessage = (event: MessageEvent<WorkerResponse>) => {
                const message = event.data;
                if (message.requestId !== requestId || finished) {
                    return;
                }

                if (message.type === "result") {
                    finished = true;
                    cleanup();
                    resolve(message.payload);
                    return;
                }

                if (message.type === "error") {
                    finished = true;
                    cleanup();
                    reject(new Error(message.errorMessage));
                }
            };

            const timeoutHandle = globalThis.setTimeout(() => {
                if (finished) {
                    return;
                }

                finished = true;
                cleanup();
                restartWorker();
                resolve({
                    status: "timeout",
                    stdout: "",
                    stderr: "",
                    result: null,
                    durationMs: timeoutMs,
                    errorMessage: `Python execution timed out after ${timeoutMs}ms.`,
                });
            }, timeoutMs);

            worker.addEventListener("message", handleMessage as EventListener);
            worker.postMessage({
                type: "run",
                requestId,
                code,
            } satisfies WorkerRequest);
        });
    }

    return {
        ready: workerState.initPromise,
        run(code: string, timeoutMs = 10_000) {
            runQueue = runQueue.then(
                () => run(code, timeoutMs),
                () => run(code, timeoutMs)
            );
            return runQueue as Promise<PythonRunResult>;
        },
        dispose() {
            disposed = true;
            try {
                workerState.worker.terminate();
            } catch {
                // noop
            }
        },
    };
}

export function serializePythonRunError(error: unknown) {
    return serializeError(error);
}

export const pythonRuntimeDefaults = {
    loaderUrl: DEFAULT_PYODIDE_LOADER,
    indexUrl: DEFAULT_PYODIDE_CDN_INDEX,
    defaultTimeoutMs: 10_000,
};
