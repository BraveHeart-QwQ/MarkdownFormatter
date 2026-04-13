//===----------------------------------------------------------------------===//
//
// @desc    : CLI 入口
//
//===----------------------------------------------------------------------===//

import { readFileSync, writeFileSync } from "fs";
import { format } from "./pipeline.js";
import { k_defaultFormatterConfig } from "./config.js";

// ── Arg parsing ───────────────────────────────────────────────────────────────

function printUsage(): void {
    console.error("Usage: markdown-formatter <input.md> [output.md]");
    console.error("  If output is omitted, the result is written to stdout.");
}

function parseArgs(argv: string[]): { input: string; output: string | null } | null {
    const args = argv.slice(2); // strip node + script path
    if (args.length < 1 || args.length > 2) return null;
    return { input: args[0], output: args[1] ?? null };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const parsed = parseArgs(process.argv);
    if (!parsed) {
        printUsage();
        process.exit(1);
    }

    // TODO 支持通过 --config <path> 从 JSON 文件读取自定义配置
    //      支持读取多个配置，然后覆盖叠加得到最终配置
    const config = k_defaultFormatterConfig;

    let input: string;
    try {
        input = readFileSync(parsed.input, "utf-8");
    } catch (err) {
        console.error(`Error: cannot read "${parsed.input}": ${(err as Error).message}`);
        process.exit(1);
    }

    const output = await format(input, config);

    if (parsed.output) {
        try {
            writeFileSync(parsed.output, output, "utf-8");
        } catch (err) {
            console.error(`Error: cannot write "${parsed.output}": ${(err as Error).message}`);
            process.exit(1);
        }
    } else {
        process.stdout.write(output);
    }
}

main().catch((err: unknown) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});

