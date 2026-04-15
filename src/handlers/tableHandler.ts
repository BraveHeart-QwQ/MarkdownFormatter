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
        function rawRowWidth(cells: string[]): number {
            const contentSum = cells.reduce((acc, c) => acc + displayWidth(c), 0);
            const gapTotal = 3 * (numCols - 1); // " | " between cells
            return cfg.removeOuterBorders
                ? contentSum + gapTotal
                : contentSum + gapTotal + 4; // leading "| " + trailing " |"
        }
        const skipRows: boolean[] = cellStrs.map(cells => rawRowWidth(cells) > cfg.maxFormatColumnWidth);

        // ── Step 4: 生成各行字符串 ────────────────────────────────────────────
        function renderRow(cells: string[], skip: boolean): string {
            if (skip) {
                return cfg.removeOuterBorders
                    ? cells.join(" | ")
                    : "| " + cells.join(" | ") + " |";
            }
            const padded = cells.map((cell, c) => padCell(cell, colWidths[c]));
            return cfg.removeOuterBorders
                ? padded.join(" | ").trimEnd()
                : "| " + padded.join(" | ") + " |";
        }

        function renderSeparator(): string {
            // 分隔行总宽度：每个单元格长度 = colWidths[c]，单元格之间 / 两端是 `|`
            // removeOuterBorders=false: 1 + sum(colWidths) + (numCols-1) + 1 = sum + numCols + 1
            // removeOuterBorders=true : sum(colWidths) + (numCols-1)
            const overhead = cfg.removeOuterBorders ? numCols - 1 : numCols + 1;
            const totalWidth = colWidths.reduce((a, b) => a + b, 0) + overhead;

            // 如果超限，压缩最右列宽度（最小 3，以维持 GFM 语法合法性）
            const lastColWidths = colWidths.slice();
            if (totalWidth > cfg.maxFormatColumnWidth) {
                const excess = totalWidth - cfg.maxFormatColumnWidth;
                lastColWidths[numCols - 1] = Math.max(3, lastColWidths[numCols - 1] - excess);
            }

            const sepCells = lastColWidths.map((w, c) => makeSepCell(align[c], w));
            return cfg.removeOuterBorders
                ? sepCells.join("|")
                : "|" + sepCells.join("|") + "|";
        }

        const lines: string[] = [];
        lines.push(renderRow(cellStrs[0], skipRows[0]));  // 表头行
        lines.push(renderSeparator());                     // 分隔行（始终对齐）
        for (let r = 1; r < rows.length; r++) {
            lines.push(renderRow(cellStrs[r], skipRows[r]));
        }

        return lines.join("\n");
    };
}
