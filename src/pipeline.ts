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
 *   将 4 空格 / Tab 缩进块识别为代码，转为 fenced code block
 */
export function preprocess(input: string, config: FormatterConfig): string {
    let text = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (config.other.trimTrailingWhitespace) {
        text = text.replace(/[^\S\n]+$/gm, "");
    }
    text = normalizeListMarkerSpacing(text);
    return text;
}

// TODO preprocess 增加一个保护流程
// BUG 列表 后紧跟 `*` 修一下
/**
 * 规范化列表标记符后的空格：`-   text` → `- text`、`1.   text` → `1. text`。
 *
 * 宽标记（多余空格）会使 parser 将内容起始列推到更深的位置，
 * 导致后续缩进续行和子内容（如表格）被排除在列表项之外。
 * 在解析前统一为单空格，确保 parser 生成正确的 AST。
 */
function normalizeListMarkerSpacing(text: string): string {
    const lines = text.split('\n');
    let fenceChar = '';
    let fenceLen = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // 跟踪 fenced code block（避免修改代码块内容）
        const fenceMatch = line.match(/^\s*(`{3,}|~{3,})/);
        if (fenceMatch) {
            const char = fenceMatch[1][0];
            const len = fenceMatch[1].length;
            if (!fenceChar) {
                fenceChar = char;
                fenceLen = len;
            } else if (char === fenceChar && len >= fenceLen) {
                fenceChar = '';
                fenceLen = 0;
            }
            continue;
        }
        if (fenceChar) continue;

        // 无序列表：`-   text` → `- text`
        lines[i] = line.replace(/^(\s*[-*+]) {2,}(?=\S)/, '$1 ');
        // 有序列表：`1.   text` → `1. text`
        lines[i] = lines[i].replace(/^(\s*\d+[.)]) {2,}(?=\S)/, '$1 ');
    }

    return lines.join('\n');
}

// ── Step 6: 后处理 ─────────────────────────────────────────────────────────────

/**
 * 在 stringify 后对输出文本进行后处理（文本层面）。
 *
 * - 保证文件末尾恰好一个换行符
 */
export function postprocess(output: string, config: FormatterConfig): string {
    let result = output;
    if (config.other.trimTrailingWhitespace) {
        result = result.replace(/[^\S\n]+$/gm, "");
    }
    result = result.trimEnd() + "\n";

    // 在文档末尾追加固定结尾（若已存在则先移除再重新追加，以规范化间距）
    if (config.other.customEnding != null) {
        const ending = config.other.customEnding;
        if (result.trimEnd().endsWith(ending)) {
            result = result.trimEnd().slice(0, -ending.length).trimEnd() + "\n";
        }
        const spacingLines = "\n".repeat(config.other.spacingLineBeforeCustomEnding);
        result += spacingLines + ending + "\n";
    }

    return result;
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
    };

    // parseIndentAsCodeBlock:
    //   true  → fences:true（输出 fenced code block，也是 remark 默认行为）
    //   false → fences:false（保留缩进格式输出）
    settings.fences = config.blockIndent.parseIndentAsCodeBlock;

    if (config.list.enabled) {
        settings.bullet = config.list.unorderedMarker;
        settings.incrementListMarker = config.list.orderedStyle === "sequential";
    }

    return remark()
        .use(remarkGfm, { singleTilde: false }) // 允许 ~~strikethrough~~ 中的 ~ 被转义（不强制要求成对出现）
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
