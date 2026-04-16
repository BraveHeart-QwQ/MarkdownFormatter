//===----------------------------------------------------------------------===//
//
// @desc    : CLI 入口
//
//===----------------------------------------------------------------------===//

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { format } from "./pipeline.js";
import { k_defaultFormatterConfig, FormatterConfig } from "./config.js";

// ── Config merging ────────────────────────────────────────────────────────────

type PartialConfig = {
    [K in keyof FormatterConfig]?: Partial<FormatterConfig[K]>;
};

function mergeConfig(base: FormatterConfig, ...overrides: PartialConfig[]): FormatterConfig {
    let result = { ...base };
    for (const override of overrides) {
        for (const key of Object.keys(override) as Array<keyof FormatterConfig>) {
            if (override[key] !== undefined) {
                result = { ...result, [key]: { ...result[key], ...(override[key] as object) } };
            }
        }
    }
    return result;
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

export const k_defualtFormatName = "markdown.format";

interface ParsedArgs {
    input: string;
    output: string | null; // -o <file>：指定输出文件
    inPlace: boolean;      // -w：写回输入文件
    configPaths: string[]; // -c <file>：可多次指定
}

function printUsage(): void {
    console.error("Usage: markdown-formatter [options] <input.md>");
    console.error("");
    console.error("Options:");
    console.error("  -o, --output <file>   Write output to specified file (default: stdout)");
    console.error("  -w, --write           Write output back to the input file (in-place)");
    console.error("  -c, --config <file>   Config JSON file to merge; may be specified multiple times");
    console.error("  -h, --help            Show this help message");
}

function parseArgs(argv: string[]): ParsedArgs | null {
    const args = argv.slice(2);
    const configPaths: string[] = [];
    let output: string | null = null;
    let inPlace = false;
    let input: string | null = null;

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === "-h" || arg === "--help") {
            printUsage();
            process.exit(0);
        } else if (arg === "-o" || arg === "--output") {
            output = args[++i] ?? null;
            if (!output) return null;
        } else if (arg === "-w" || arg === "--write") {
            inPlace = true;
        } else if (arg === "-c" || arg === "--config") {
            const val = args[++i] ?? null;
            if (!val) return null;
            configPaths.push(val);
        } else if (!arg.startsWith("-")) {
            if (input !== null) return null; // 不支持多个位置参数
            input = arg;
        } else {
            return null; // 未知 flag
        }
    }

    if (!input) return null;
    if (inPlace && output) return null; // -w 与 -o 互斥

    return { input, output, inPlace, configPaths };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const parsed = parseArgs(process.argv);
    if (!parsed) {
        printUsage();
        process.exit(1);
    }

    // 依次加载并叠加配置
    const overrides: PartialConfig[] = [];

    // 自动加载工作目录下的 markdown.format
    const autoConfigPath = join(process.cwd(), k_defualtFormatName);
    if (existsSync(autoConfigPath)) {
        let raw: string;
        try {
            raw = readFileSync(autoConfigPath, "utf-8");
        } catch (err) {
            console.error(`Error: cannot read config "${autoConfigPath}": ${(err as Error).message}`);
            process.exit(1);
        }
        let partialCfg: PartialConfig;
        try {
            partialCfg = JSON.parse(raw!) as PartialConfig;
        } catch (err) {
            console.error(`Error: invalid JSON in config "${autoConfigPath}": ${(err as Error).message}`);
            process.exit(1);
        }
        overrides.push(partialCfg!);
    }

    for (const configPath of parsed.configPaths) {
        let raw: string;
        try {
            raw = readFileSync(configPath, "utf-8");
        } catch (err) {
            console.error(`Error: cannot read config "${configPath}": ${(err as Error).message}`);
            process.exit(1);
        }
        let partialCfg: PartialConfig;
        try {
            partialCfg = JSON.parse(raw) as PartialConfig;
        } catch (err) {
            console.error(`Error: invalid JSON in config "${configPath}": ${(err as Error).message}`);
            process.exit(1);
        }
        overrides.push(partialCfg);
    }
    const config = mergeConfig(k_defaultFormatterConfig, ...overrides);

    // 读取输入文件
    let input: string;
    try {
        input = readFileSync(parsed.input, "utf-8");
    } catch (err) {
        console.error(`Error: cannot read "${parsed.input}": ${(err as Error).message}`);
        process.exit(1);
    }

    const result = await format(input, config);

    // 写出结果
    const outputPath = parsed.inPlace ? parsed.input : parsed.output;
    if (outputPath) {
        try {
            writeFileSync(outputPath, result, "utf-8");
        } catch (err) {
            console.error(`Error: cannot write "${outputPath}": ${(err as Error).message}`);
            process.exit(1);
        }
    } else {
        process.stdout.write(result);
    }
}

main().catch((err: unknown) => {
    console.error("Unexpected error:", err);
    process.exit(1);
});

