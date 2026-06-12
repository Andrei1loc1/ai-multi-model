export async function register() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const orig: any = process.emit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    process.emit = function (event: any, ...args: any[]): any {
        if (event === "warning") {
            const err = args[0] as Error | undefined;
            if (err?.message?.includes("url.parse()")) {
                return false;
            }
        }
        return orig.apply(this, arguments);
    };
}