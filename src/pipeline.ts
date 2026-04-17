//===----------------------------------------------------------------------===//
//
// @desc    : 组装 unified pipeline 的入口文件
//
//===----------------------------------------------------------------------===//

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { FormatterConfig } from "./config.js";
import { buildHandlers, buildJoinFunctions } from "./handlers/index.js";
import { remarkFormatter } from "./plugins/index.js";

// ── Step 2: 预处理 ─────────────────────────────────────────────────────────────

/**
 * 在解析前对 Markdown 原始文本进行预处理（文本层面）。
 *
 * - 统一换行符（CRLF / CR → LF）
 * - TODO 块缩进处理（config.blockIndent.parseIndentAsCodeBlock）
 *   将 4 空格 / Tab 缩进块识别为代码，转为 fenced code block
 */
export function preprocess(input: string, config: FormatterConfig): string {
    const text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    return text;
}

// ── Step 6: 后处理 ─────────────────────────────────────────────────────────────

/**
 * 在 stringify 后对输出文本进行后处理（文本层面）。
 *
 * - 保证文件末尾恰好一个换行符
 * - TODO 其他需在文本层面处理的规则
 */
export function postprocess(output: string, config: FormatterConfig): string {
    let result = output;
    if (config.other.trimTrailingWhitespace) {
        result = result.replace(/[^\S\n]+$/gm, "");
    }
    return result.trimEnd() + "\n";
}

// ── Steps 3–5: unified pipeline ───────────────────────────────────────────────

/**
 * 构建 unified 处理器：
 *   remark ( parse ) → remarkGfm → remarkFormatter ( AST 变换 ) → stringify
 *
 * stringify 阶段通过 settings.handlers 注入自定义 handler，利用节点上的
 * ExtraData 实现精细化格式化输出。
 */
function buildProcessor(config: FormatterConfig) {
    const settings: Record<string, unknown> = {
        handlers: buildHandlers(config),
        join: buildJoinFunctions(config),
        unsafe: [
            {
                character: "]",
                inConstruct: "phrasing",
                notInConstruct: ["label", "reference", "autolink", "destinationLiteral", "destinationRaw", "titleQuote", "titleApostrophe"],
            }
        ],
    };

    // parseIndentAsCodeBlock:
    //   true  → fences:true（输出 fenced code block，也是 remark 默认行为）
    //   false → fences:false（保留缩进格式输出）
    settings.fences = config.blockIndent.parseIndentAsCodeBlock;

    settings.emphasis = config.inline.italicMark;

    if (config.list.enabled) {
        settings.bullet = config.list.unorderedMarker;
        settings.incrementListMarker = config.list.orderedStyle === "sequential";
    }

    return remark()
        .use(remarkGfm)
        .use(remarkMath)
        .use(remarkFormatter, config)
        .data("settings", settings);
}

// ── 公开入口 ───────────────────────────────────────────────────────────────────

/**
 * 对一段 Markdown 文本执行完整的格式化流程：
 *
 * 1. 预处理（文本层面正则、换行符统一）
 * 2. Remark 解析 → MDAST
 * 3. AST 插件处理（格式化 + 写入 ExtraData）
 * 4. stringify（自定义 handlers 读取 ExtraData 精细输出）
 * 5. 后处理（文本层面收尾）
 */
export async function format(input: string, config: FormatterConfig): Promise<string> {
    const preprocessed = preprocess(input, config);
    const processor = buildProcessor(config);
    const file = await processor.process(preprocessed);
    return postprocess(String(file), config);
}
