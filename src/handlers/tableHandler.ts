//===----------------------------------------------------------------------===//
//
// @desc    : Table 节点 stringify handler
//
//===----------------------------------------------------------------------===//

import type { Table } from "mdast";
import type { FormatterConfig } from "../config.js";

// mdast-util-to-markdown handler 函数类型（避免对传递依赖的直接 import）
export type Handle = (node: object, parent: object | null, state: object, info: object) => string;

// mdast-util-to-markdown State 的最小接口
interface ToMarkdownState {
    containerPhrasing(parent: object, info: object): string;
    createTracker(info: object): { move(s: string): string; shift(n: number): void; current(): object };
}

/** 计算字符串的显示列宽（CJK 全角字符计 2 列，其余计 1 列）。 */
function displayWidth(s: string): number {
    let w = 0;
    for (const ch of s) {
        const cp = ch.codePointAt(0) ?? 0;
        w += (
            (cp >= 0x1100 && cp <= 0x115F) ||
            (cp >= 0x2E80 && cp <= 0x303E) ||
            (cp >= 0x3041 && cp <= 0x33FF) ||
            (cp >= 0x3400 && cp <= 0x4DBF) ||
            (cp >= 0x4E00 && cp <= 0x9FFF) ||
            (cp >= 0xA000 && cp <= 0xA4CF) ||
            (cp >= 0xAC00 && cp <= 0xD7AF) ||
            (cp >= 0xF900 && cp <= 0xFAFF) ||
            (cp >= 0xFE30 && cp <= 0xFE6F) ||
            (cp >= 0xFF01 && cp <= 0xFF60) ||
            (cp >= 0xFFE0 && cp <= 0xFFE6) ||
            (cp >= 0x20000 && cp <= 0x2A6DF) ||
            (cp >= 0x2A700 && cp <= 0x2CEAF)
        ) ? 2 : 1;
    }
    return w;
}

/** 生成分隔行中某列的分隔符，按 alignType 加冒号，宽度至少 3。 */
function makeSepCell(alignType: string | null | undefined, width: number): string {
    const w = Math.max(width, 3);
    switch (alignType) {
        case "center": return ":" + "-".repeat(w - 2) + ":";
        case "right": return "-".repeat(w - 1) + ":";
        case "left": return ":" + "-".repeat(w - 1);
        default: return "-".repeat(w);
    }
}

/** 将 content 用尾部空格补齐到目标显示宽度。 */
function padCell(content: string, targetWidth: number): string {
    return content + " ".repeat(Math.max(0, targetWidth - displayWidth(content)));
}

/** 计算格式化前某行的原始内容宽度（含分隔符开销），用于判断是否超限。 */
function rawRowWidth(cells: string[], numCols: number, removeOuterBorders: boolean): number {
    const contentSum = cells.reduce((acc, c) => acc + displayWidth(c), 0);
    const gapTotal = 3 * (numCols - 1); // " | " between cells
    return removeOuterBorders
        ? contentSum + gapTotal
        : contentSum + gapTotal + 4; // leading "| " + trailing " |"
}

/** 将一行单元格渲染为 Markdown 表格行字符串。 */
function renderRow(cells: string[], skip: boolean, colWidths: number[], removeOuterBorders: boolean): string {
    if (skip) {
        return removeOuterBorders
            ? cells.join(" | ")
            : "| " + cells.join(" | ") + " |";
    }
    const padded = cells.map((cell, c) => padCell(cell, colWidths[c]));
    return removeOuterBorders
        ? padded.join(" | ").trimEnd()
        : "| " + padded.join(" | ") + " |";
}

/** 渲染分隔行（始终按列宽对齐，超限时压缩最右列）。 */
function renderSeparator(
    colWidths: number[],
    align: (string | null | undefined)[],
    removeOuterBorders: boolean,
    maxFormatColumnWidth: number,
    numCols: number,
): string { // BUG 对于没有两侧 `|` 的情况，分隔的左右两侧少 `-`
    const overhead = removeOuterBorders ? numCols - 1 : numCols + 1;
    const totalWidth = colWidths.reduce((a, b) => a + b, 0) + overhead;

    const lastColWidths = colWidths.slice();
    if (totalWidth > maxFormatColumnWidth) {
        const excess = totalWidth - maxFormatColumnWidth;
        lastColWidths[numCols - 1] = Math.max(3, lastColWidths[numCols - 1] - excess);
    }

    const sepCells = lastColWidths.map((w, c) => makeSepCell(align[c], w));
    return removeOuterBorders
        ? sepCells.join("|")
        : "|" + sepCells.join("|") + "|";
}

/**
 * 返回 Table 节点的 stringify handler。
 *
 * - 对每列自动补空格对齐（按显示宽度，CJK 计 2 列）
 * - 根据 config.table.removeOuterBorders 去掉首尾竖线
 * - 当某行自身内容宽度超过 config.table.maxFormatColumnWidth 时，该行跳过列对齐
 * - trimTrailingChars 已在 plugin 阶段处理（修改 AST）
 */
export function tableHandler(config: FormatterConfig): Handle {
    return function (node, _parent, state, info): string {
        const table = node as Table;
        const s = state as ToMarkdownState;
        const cfg = config.table;

        const rows = table.children;
        if (rows.length === 0) return "";

        const numCols = Math.max(...rows.map(r => r.children.length));
        if (numCols === 0) return "";

        const align = table.align ?? [];

        // ── Step 1: 对每个单元格求 phrasing 字符串，转义内部 `|` ──────────────
        const tracker = s.createTracker(info);
        void tracker;
        const cellStrs: string[][] = rows.map(row =>
            Array.from({ length: numCols }, (_, c) => {
                const cell = row.children[c];
                if (!cell) return "";
                const content = s.containerPhrasing(cell, { before: "|", after: "|" });
                // containerPhrasing 可能添加首尾空格用于 markdown 安全起见；表格单元格不需要
                return content.trim().replace(/\|/g, "\\|");
            })
        );

        // ── Step 2: 求每列最大显示宽度（≥3，以容纳最短分隔符 ---） ─────────────
        const colWidths: number[] = Array.from({ length: numCols }, (_, c) => {
            let maxW = 3;
            for (const row of cellStrs) {
                maxW = Math.max(maxW, displayWidth(row[c] ?? ""));
            }
            return maxW;
        });

        // ── Step 3: 逐行检查原始内容宽度，超限则跳过列对齐 ───────────────────
        const skipRows: boolean[] = cellStrs.map(cells => rawRowWidth(cells, numCols, cfg.removeOuterBorders) > cfg.maxFormatColumnWidth);

        // ── Step 4: 生成各行字符串 ────────────────────────────────────────────
        const lines: string[] = [];
        lines.push(renderRow(cellStrs[0], skipRows[0], colWidths, cfg.removeOuterBorders));  // 表头行
        lines.push(renderSeparator(colWidths, align, cfg.removeOuterBorders, cfg.maxFormatColumnWidth, numCols)); // 分隔行（始终对齐）
        for (let r = 1; r < rows.length; r++) {
            lines.push(renderRow(cellStrs[r], skipRows[r], colWidths, cfg.removeOuterBorders));
        }

        return lines.join("\n");
    };
}
