import type { Heading, Root } from "mdast";
import { visit } from "unist-util-visit";
import type { FormatterConfig, LineSpacingConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";

function applyHeadingLineSpacing(node: Heading, cfg: LineSpacingConfig): void {
    let before: number;
    let after: number;
    switch (node.depth) {
        case 1: before = cfg.blankLinesBeforeH1; after = cfg.blankLinesAfterH1; break;
        case 2: before = cfg.blankLinesBeforeH2; after = cfg.blankLinesAfterH2; break;
        case 3: before = cfg.blankLinesBeforeH3; after = cfg.blankLinesAfterH3; break;
        default: before = cfg.blankLinesBeforeH4; after = cfg.blankLinesAfterH4; break;
    }
    node.data ??= {};
    node.data.blankLinesBefore = before;
    node.data.blankLinesAfter = after;
}

/**
 * 根据 config.lineSpacing 对 Heading 节点写入 blankLinesBefore / blankLinesAfter。
 * 实际输出间距由 stringify 阶段的 join 函数读取这些值来决定：
 *   gap = max(left.blankLinesAfter, right.blankLinesBefore)
 */
export function registerLineSpacing(registry: VisitorRegistry, config: FormatterConfig): void {
    registry.heading.push(node => applyHeadingLineSpacing(node, config.lineSpacing));
}

// ── customSpacingRules ─────────────────────────────────────────────────────────

type ParagraphNode = { type: string; children?: ParagraphNode[]; value?: string; data?: Record<string, unknown> };

/** 递归提取段落节点的纯文本内容。 */
function extractParagraphText(node: ParagraphNode): string {
    if (typeof node.value === "string") return node.value;
    if (Array.isArray(node.children)) return node.children.map(extractParagraphText).join("");
    return "";
}

/**
 * 根据 customSpacingRules 对匹配的 paragraph 节点写入 blankLinesBefore / blankLinesAfter。
 * 仅作用于段落，不影响标题、代码块等其他块元素。
 * 多条规则均匹配时，后定义的规则优先（后写覆盖前写）。
 */
export function applyCustomSpacingRules(tree: Root, cfg: LineSpacingConfig): void {
    const rules = cfg.customSpacingRules;
    if (!rules || rules.length === 0) return;

    const compiled = rules.map(r => ({
        regex: new RegExp(r.pattern),
        before: r.blankLinesBefore,
        after: r.blankLinesAfter,
    }));

    visit(tree, "paragraph", (node) => {
        const n = node as ParagraphNode;
        const text = extractParagraphText(n);
        for (const rule of compiled) {
            if (rule.regex.test(text)) {
                n.data ??= {};
                n.data.blankLinesBefore = rule.before;
                n.data.blankLinesAfter = rule.after;
            }
        }
    });
}
