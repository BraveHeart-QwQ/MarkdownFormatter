//===----------------------------------------------------------------------===//
//
// @desc    : 统一导出所有 ast plugins
//
//===----------------------------------------------------------------------===//

import type { Root } from "mdast";
import type { FormatterConfig } from "../config.js";

// ── Sub-transforms ────────────────────────────────────────────────────────────
// 每个 sub-transform 接受 AST root 和配置，原地修改节点（可写入 ExtraData）。

/**
 * 根据 config.lineSpacing 对 Heading 节点写入 blankLinesBefore / blankLinesAfter。
 * TODO 实现
 */
function applyLineSpacing(tree: Root, config: FormatterConfig): void {
    void tree;
    void config;
}

/**
 * 根据 config.wordSpacing 在 Text 节点中插入空格（中英文、数字、行内元素边界）。
 * TODO 实现
 */
function applyWordSpacing(tree: Root, config: FormatterConfig): void {
    void tree;
    void config;
}

/**
 * 根据 config.list 规范化 List / ListItem：标记符、缩进、尾部字符。
 * TODO 实现
 */
function applyListFormatting(tree: Root, config: FormatterConfig): void {
    void tree;
    void config;
}

/**
 * 根据 config.table 计算列宽、写入 TableExtraData / TableRowExtraData。
 * TODO 实现
 */
function applyTableFormatting(tree: Root, config: FormatterConfig): void {
    void tree;
    void config;
}

/**
 * 根据 config.inline 处理 InlineCode / Strong / Math 节点。
 * TODO 实现
 */
function applyInlineFormatting(tree: Root, config: FormatterConfig): void {
    void tree;
    void config;
}

/**
 * 处理 config.other 中的杂项规则：移除标题序号、singleCharTableHead 等。
 * TODO 实现
 */
function applyOtherFormatting(tree: Root, config: FormatterConfig): void {
    void tree;
    void config;
}

// ── Main plugin ───────────────────────────────────────────────────────────────

/**
 * 将所有格式化 AST 变换组合为一个 unified 插件。
 *
 * 用法：`.use(remarkFormatter, config)`
 *
 * unified 在执行时会以 `remarkFormatter.call(processor, config)` 调用本函数，
 * 返回值即为 transformer，在 parse 之后、stringify 之前被调用。
 */
export function remarkFormatter(config: FormatterConfig): (tree: Root) => void {
    return function (tree: Root): void {
        applyLineSpacing(tree, config);
        applyWordSpacing(tree, config);
        applyListFormatting(tree, config);
        applyTableFormatting(tree, config);
        applyInlineFormatting(tree, config);
        applyOtherFormatting(tree, config);
    };
}
