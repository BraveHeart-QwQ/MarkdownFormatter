//===----------------------------------------------------------------------===//
//
// @desc    : 统一导出所有 ast plugins
//
//===----------------------------------------------------------------------===//

import type { Heading, InlineCode, List, ListItem, Paragraph, Root, Strong, Table, TableCell, TableRow, Text } from "mdast";
import { visit } from "unist-util-visit";
import type { FormatterConfig } from "../config.js";

// ── Visitor Registry ──────────────────────────────────────────────────────────

/**
 * 各 sub-transform 向此 registry 注册回调，而不是各自调用 visit()。
 * runSinglePass 在唯一一次 DFS 里按节点类型分发给所有已注册的回调。
 */
interface VisitorRegistry {
    text: Array<(node: Text) => void>;
    heading: Array<(node: Heading) => void>;
    list: Array<(node: List) => void>;
    listItem: Array<(node: ListItem) => void>;
    table: Array<(node: Table) => void>;
    tableRow: Array<(node: TableRow) => void>;
    tableCell: Array<(node: TableCell) => void>;
    inlineCode: Array<(node: InlineCode) => void>;
    strong: Array<(node: Strong) => void>;
}

function createRegistry(): VisitorRegistry {
    return {
        text: [],
        heading: [],
        list: [],
        listItem: [],
        table: [],
        tableRow: [],
        tableCell: [],
        inlineCode: [],
        strong: [],
    };
}

/**
 * 对 tree 执行唯一一次 DFS，每个节点按其类型分发给 registry 中已注册的回调。
 */
function runSinglePass(tree: Root, registry: VisitorRegistry): void {
    visit(tree, (node) => {
        switch (node.type) {
            case "text": for (const h of registry.text) h(node as Text); break;
            case "heading": for (const h of registry.heading) h(node as Heading); break;
            case "list": for (const h of registry.list) h(node as List); break;
            case "listItem": for (const h of registry.listItem) h(node as ListItem); break;
            case "table": for (const h of registry.table) h(node as Table); break;
            case "tableRow": for (const h of registry.tableRow) h(node as TableRow); break;
            case "tableCell": for (const h of registry.tableCell) h(node as TableCell); break;
            case "inlineCode": for (const h of registry.inlineCode) h(node as InlineCode); break;
            case "strong": for (const h of registry.strong) h(node as Strong); break;
        }
    });
}

// ── Sub-transforms ────────────────────────────────────────────────────────────
// 每个 sub-transform 向 registry 注册所需节点类型的回调（原地修改节点 / 写入 ExtraData）。

/**
 * 对 AST 中所有 Text 节点按序应用 config.textCorrection.replacements 正则替换。
 */
function registerTextReplacement(registry: VisitorRegistry, config: FormatterConfig): void {
    const replacements = config.textCorrection.replacements;
    if (replacements.length === 0) return;

    registry.text.push((node: Text) => {
        for (const { pattern, replacement } of replacements) {
            node.value = node.value.replace(new RegExp(pattern, "gu"), replacement);
        }
    });
}

/**
 * 根据 config.lineSpacing 对 Heading 节点写入 blankLinesBefore / blankLinesAfter。
 * TODO 实现
 */
function registerLineSpacing(registry: VisitorRegistry, config: FormatterConfig): void {
    void registry;
    void config;
}

/**
 * 根据 config.wordSpacing 在 Text 节点中插入空格（中英文、数字、行内元素边界）。
 * TODO 实现
 */
function registerWordSpacing(registry: VisitorRegistry, config: FormatterConfig): void {
    void registry;
    void config;
}

/**
 * 根据 config.list 规范化 List / ListItem：标记符、缩进、尾部字符。
 * - 标记符和有序样式通过 remark-stringify 的 settings 控制（见 pipeline.ts）
 * - 此处处理 trimTrailingChars：去除列表项第一段末尾的指定字符
 */
function registerListFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    if (!config.list.enabled) return;
    if (config.list.trimTrailingChars.length === 0) return;

    const charsToTrim = config.list.trimTrailingChars;

    registry.listItem.push((node: ListItem) => {
        // 只处理列表项的第一个段落（续行段落不受影响）
        const firstPara = node.children.find((child): child is Paragraph => child.type === "paragraph");
        if (!firstPara || firstPara.children.length === 0)
            return;

        // 只处理段落最后一个直接子节点为 Text 的情况（不伸入行内元素内部）
        const lastChild = firstPara.children[firstPara.children.length - 1];
        if (lastChild.type !== "text")
            return;

        const textNode = lastChild as Text;
        let value = textNode.value;
        let changed = true;
        while (changed) {
            changed = false;
            for (const ch of charsToTrim) {
                if (value.endsWith(ch)) {
                    value = value.slice(0, -ch.length);
                    changed = true;
                }
            }
        }
        textNode.value = value;
    });
}

/**
 * 根据 config.table 计算列宽、写入 TableExtraData / TableRowExtraData。
 * TODO 实现
 */
function registerTableFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    void registry;
    void config;
}

/**
 * 根据 config.inline 处理 InlineCode / Strong / Math 节点。
 * TODO 实现
 */
function registerInlineFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    void registry;
    void config;
}

/**
 * 处理 config.other 中的杂项规则：移除标题序号、singleCharTableHead 等。
 * TODO 实现
 */
function registerOtherFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    void registry;
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
        const registry = createRegistry();

        registerTextReplacement(registry, config);
        registerLineSpacing(registry, config);
        registerWordSpacing(registry, config);
        registerListFormatting(registry, config);
        registerTableFormatting(registry, config);
        registerInlineFormatting(registry, config);
        registerOtherFormatting(registry, config);

        runSinglePass(tree, registry);
    };
}
