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

interface CompiledRule { regex: RegExp; before: number; after: number }

/** Match a single line against compiled rules; return the last matching rule's values. */
function matchLine(line: string, compiled: CompiledRule[]): { before: number; after: number } | undefined {
    let result: { before: number; after: number } | undefined;
    for (const rule of compiled) {
        if (rule.regex.test(line)) result = { before: rule.before, after: rule.after };
    }
    return result;
}

interface LineGroup {
    lines: string[];
    blankLinesBefore: number | undefined;
    blankLinesAfter: number | undefined;
}

/**
 * 将多行段落按匹配规则拆分为若干组。
 *
 * - `blankLinesAfter > 0` 的匹配行会在其后切分；
 * - `blankLinesBefore > 0` 的匹配行会在其前切分，但仅当此前已发生过切分时才生效
 *   （避免将段落首行之前的非匹配行拆出独立段落）。
 */
function groupLinesByRules(lines: string[], compiled: CompiledRule[]): LineGroup[] {
    const groups: LineGroup[] = [];
    let cur: string[] = [];
    let grpBefore: number | undefined;
    let grpAfter: number | undefined;
    let hadSplit = false;

    for (const line of lines) {
        const m = matchLine(line, compiled);

        // split-before: close the current group before this matching line
        if (m && m.before > 0 && hadSplit && cur.length > 0) {
            groups.push({ lines: cur, blankLinesBefore: grpBefore, blankLinesAfter: grpAfter });
            cur = [];
            grpBefore = undefined;
            grpAfter = undefined;
        }

        cur.push(line);
        if (m) {
            if (cur.length === 1) grpBefore = m.before; // first line of group → set blankLinesBefore
            grpAfter = m.after;
        }

        // split-after: close the group after this matching line
        if (m && m.after > 0) {
            groups.push({ lines: cur, blankLinesBefore: grpBefore, blankLinesAfter: grpAfter });
            cur = [];
            grpBefore = undefined;
            grpAfter = undefined;
            hadSplit = true;
        }
    }
    if (cur.length > 0) {
        groups.push({ lines: cur, blankLinesBefore: grpBefore, blankLinesAfter: grpAfter });
    }
    return groups;
}

/**
 * 根据 customSpacingRules 对匹配的 paragraph 节点写入 blankLinesBefore / blankLinesAfter。
 * 仅作用于段落，不影响标题、代码块等其他块元素。
 * 多条规则均匹配时，后定义的规则优先（后写覆盖前写）。
 *
 * 当一个段落包含多行且其中部分行匹配规则时，会将该段落拆分为多个段落节点，
 * 并在拆分后的节点上写入相应的间距数据。
 */
export function applyCustomSpacingRules(tree: Root, cfg: LineSpacingConfig): void {
    const rules = cfg.customSpacingRules;
    if (!rules || rules.length === 0) return;

    const compiled: CompiledRule[] = rules.map(r => ({
        regex: new RegExp(r.pattern),
        before: r.blankLinesBefore,
        after: r.blankLinesAfter,
    }));

    // Collect replacements for multi-line paragraph splitting (applied in reverse later).
    const replacements: Array<{
        parent: { children: ParagraphNode[] };
        index: number;
        newNodes: ParagraphNode[];
    }> = [];

    visit(tree, "paragraph", (node, index, parent) => {
        const n = node as ParagraphNode;
        const text = extractParagraphText(n);
        const lines = text.split("\n");

        // Single-line or no parent info → apply rules directly to the paragraph.
        if (lines.length <= 1 || index === undefined || parent === undefined) {
            for (const rule of compiled) {
                if (rule.regex.test(text)) {
                    n.data ??= {};
                    n.data.blankLinesBefore = rule.before;
                    n.data.blankLinesAfter = rule.after;
                }
            }
            return;
        }

        // Multi-line: check whether any individual line matches.
        if (!lines.some(l => matchLine(l, compiled) !== undefined)) return;

        const groups = groupLinesByRules(lines, compiled);
        if (groups.length <= 1) {
            // Only one group — just annotate the existing paragraph node.
            const g = groups[0];
            if (g.blankLinesBefore !== undefined || g.blankLinesAfter !== undefined) {
                n.data ??= {};
                if (g.blankLinesBefore !== undefined) n.data.blankLinesBefore = g.blankLinesBefore;
                if (g.blankLinesAfter !== undefined) n.data.blankLinesAfter = g.blankLinesAfter;
            }
            return;
        }

        // Multiple groups → replace the paragraph with one paragraph per group.
        const newNodes: ParagraphNode[] = groups.map(g => {
            const para: ParagraphNode = {
                type: "paragraph",
                children: [{ type: "text", value: g.lines.join("\n") }],
            };
            if (g.blankLinesBefore !== undefined || g.blankLinesAfter !== undefined) {
                para.data = {};
                if (g.blankLinesBefore !== undefined) para.data.blankLinesBefore = g.blankLinesBefore;
                if (g.blankLinesAfter !== undefined) para.data.blankLinesAfter = g.blankLinesAfter;
            }
            return para;
        });

        replacements.push({
            parent: parent as unknown as { children: ParagraphNode[] },
            index,
            newNodes,
        });
    });

    // Apply replacements in reverse index order so earlier indices stay valid.
    for (const { parent, index, newNodes } of replacements.reverse()) {
        parent.children.splice(index, 1, ...newNodes);
    }
}
