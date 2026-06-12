export async function register() {
    const originalEmit = process.emit.bind(process) as typeof process.emit;
    const suppressUrlParse = (event: string, ...args: unknown[]): unknown => {
        if (event === "warning" && args[0] instanceof Error) {
            const msg = args[0].message || "";
            if (msg.includes("url.parse()") && msg.includes("DeprecationWarning")) {
                return false;
            }
        }
        return (originalEmit as (event: string, ...args: unknown[]) => unknown)(event, ...args);
    };
    // @ts-expect-error -- suppressing url.parse deprecation at runtime
    process.emit = suppressUrlParse;
}