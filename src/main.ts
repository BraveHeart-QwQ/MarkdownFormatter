//===----------------------------------------------------------------------===//
//
// @desc    : CLI 入口
//
//===----------------------------------------------------------------------===//

import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { format } from "./pipeline.js";
import { k_defaultFormatterConfig, FormatterConfig, validatePartialConfig } from "./config.js";

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
    output: string | null;    // -o <file>：指定输出文件
    inPlace: boolean;         // -w：写回输入文件
    configPaths: string[];    // -c <file>：可多次指定
    inlineConfigs: string[];  // -j <json>：内联 JSON 配置，可多次指定
}

function printUsage(): void {
    console.error("Usage: markdown-formatter [options] <input.md>");
    console.error("");
    console.error("Options:");
    console.error("  -o, --output <file>     Write output to specified file (default: stdout)");
    console.error("  -w, --write             Write output back to the input file (in-place)");
    console.error("  -c, --config <file>     Config JSON file to merge; may be specified multiple times");
    console.error("  -j, --config-json <json>  Inline partial config as a JSON string; may be specified multiple times");
    console.error("  -h, --help              Show this help message");
}

type ParseArgsResult = ParsedArgs | string; // string = error message

function parseArgs(argv: string[]): ParseArgsResult {
    const args = argv.slice(2);
    const configPaths: string[] = [];
    const inlineConfigs: string[] = [];
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
            if (!output) return `Option ${arg} requires a file argument.`;
        } else if (arg === "-w" || arg === "--write") {
            inPlace = true;
        } else if (arg === "-c" || arg === "--config") {
            const val = args[++i] ?? null;
            if (!val) return `Option ${arg} requires a file argument.`;
            configPaths.push(val);
        } else if (arg === "-j" || arg === "--config-json") {
            const val = args[++i] ?? null;
            if (!val) return `Option ${arg} requires a JSON string argument.`;
            inlineConfigs.push(val);
        } else if (!arg.startsWith("-")) {
            if (input !== null) return "Only one input file may be specified.";
            input = arg;
        } else {
            return `Unknown option: ${arg}`;
        }
    }

    if (!input) return "No input file specified.";
    if (inPlace && output) return "Options -w and -o are mutually exclusive.";

    return { input, output, inPlace, configPaths, inlineConfigs };
}

// ── Entry point ───────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const parsed = parseArgs(process.argv);
    if (typeof parsed === "string") {
        console.error(`Error: ${parsed}`);
        console.error("");
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
        const autoErrors = validatePartialConfig(partialCfg!);
        if (autoErrors.length > 0) {
            for (const e of autoErrors) console.error(`Error in config "${autoConfigPath}": ${e}`);
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
        const fileErrors = validatePartialConfig(partialCfg);
        if (fileErrors.length > 0) {
            for (const e of fileErrors) console.error(`Error in config "${configPath}": ${e}`);
            process.exit(1);
        }
        overrides.push(partialCfg);
    }

    // 处理 -j / --config-json 的内联配置（优先级最高，在文件配置之后应用）
    for (const jsonStr of parsed.inlineConfigs) {
        let partialCfg: PartialConfig;
        try {
            partialCfg = JSON.parse(jsonStr) as PartialConfig;
        } catch (err) {
            console.error(`Error: invalid JSON in --config-json: ${(err as Error).message}`);
            process.exit(1);
        }
        const inlineErrors = validatePartialConfig(partialCfg);
        if (inlineErrors.length > 0) {
            for (const e of inlineErrors) console.error(`Error in --config-json: ${e}`);
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

