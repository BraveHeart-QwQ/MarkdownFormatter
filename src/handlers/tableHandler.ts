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
        // Normalize explicit left alignment marker to default separator style.
        case "left": return "-".repeat(w);
        default: return "-".repeat(w);
    }
}

/** 将 content 用尾部空格补齐到目标显示宽度。 */
function padCell(content: string, targetWidth: number): string {
    return content + " ".repeat(Math.max(0, targetWidth - displayWidth(content)));
}

function escapeTableCellPipes(content: string): string {
    let result = "";
    let trailingBackslashes = 0;

    for (const ch of content) {
        if (ch === "|") {
            if (trailingBackslashes % 2 === 0) {
                result += "\\|";
            } else {
                result += "|";
            }
            trailingBackslashes = 0;
            continue;
        }

        result += ch;
        trailingBackslashes = ch === "\\" ? trailingBackslashes + 1 : 0;
    }

    return result;
}

/**
 * 计算前缀单元格（前 prefixCellCount 列）的原始内容宽度（含分隔符开销）。
 * 用于判断这一前缀是否仍在 maxFormatColumnWidth 范围内。
 */
function rawPrefixWidth(cells: string[], prefixCellCount: number, removeOuterBorders: boolean): number {
    if (prefixCellCount <= 0) return 0;

    const m = Math.min(prefixCellCount, cells.length);
    const contentSum = cells.slice(0, m).reduce((acc, c) => acc + displayWidth(c), 0);
    const gapTotal = 3 * Math.max(0, m - 1); // " | " between prefix cells
    return removeOuterBorders
        ? contentSum + gapTotal
        : contentSum + gapTotal + 4; // leading "| " + trailing " |"
}

/**
 * 计算某行可参与对齐的前缀列数：
 * 找到最大的 m，使得前 m 列仍在 maxFormatColumnWidth 范围内。
 */
function alignedPrefixCellCount(
    cells: string[],
    numCols: number,
    removeOuterBorders: boolean,
    maxFormatColumnWidth: number,
): number {
    let count = 0;
    for (let m = 1; m <= numCols; m++) {
        if (rawPrefixWidth(cells, m, removeOuterBorders) <= maxFormatColumnWidth) {
            count = m;
        } else {
            break;
        }
    }
    return count;
}

/** 将一行单元格渲染为 Markdown 表格行字符串。 */
function renderRow(cells: string[], alignPrefixCount: number, colWidths: number[], removeOuterBorders: boolean): string {
    const padded = cells.map((cell, c) => (c < alignPrefixCount ? padCell(cell, colWidths[c]) : cell));
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
    alignPrefixCols: number,
    minLineWidth: number,
): string {
    const sepCellWidths = colWidths.map((w, c) => (c < alignPrefixCols ? w : 3));

    // Width model must match rendered data rows.
    // - removeOuterBorders=true rows look like "col0 | col1", overhead = 3*(n-1)
    // - removeOuterBorders=false rows look like "| col0 | col1 |", each cell has
    //   two surrounding spaces, so separator cells must absorb +2 dashes each.
    //   Effective overhead therefore becomes 3*n + 1.
    const overhead = removeOuterBorders ? 3 * (numCols - 1) : (3 * numCols + 1);
    const totalWidth = sepCellWidths.reduce((a, b) => a + b, 0) + overhead;

    const lastColWidths = sepCellWidths.slice();
    if (totalWidth > maxFormatColumnWidth) {
        const excess = totalWidth - maxFormatColumnWidth;
        // 优先压缩最后一个参与对齐的列；若没有对齐列，则退化到第 0 列。
        const shrinkIndex = Math.max(0, Math.min(numCols - 1, alignPrefixCols - 1));
        lastColWidths[shrinkIndex] = Math.max(3, lastColWidths[shrinkIndex] - excess);
    }

    const buildSeparatorLine = (cellWidths: number[]): string => {
        const sepCells = cellWidths.map((w, c) => {
            // When removeOuterBorders, data rows surround each "|" with spaces (" | ").
            // The separator joins with bare "|", so each cell must absorb those spaces
            // as extra dashes: +1 for the first/last column (one adjacent space each),
            // +2 for middle columns (one space on each side).
            if (removeOuterBorders && numCols > 1) {
                const extra = (c === 0 || c === numCols - 1) ? 1 : 2;
                return makeSepCell(align[c], w + extra);
            }
            if (!removeOuterBorders) {
                return makeSepCell(align[c], w + 2);
            }
            return makeSepCell(align[c], w);
        });
        return removeOuterBorders
            ? sepCells.join("|")
            : "|" + sepCells.join("|") + "|";
    };

    let separatorLine = buildSeparatorLine(lastColWidths);
    const currentWidth = displayWidth(separatorLine);
    // Try to keep separator length close to row width, but never exceed maxFormatColumnWidth.
    const targetWidth = Math.min(minLineWidth, maxFormatColumnWidth);
    if (currentWidth < targetWidth && numCols > 0) {
        lastColWidths[numCols - 1] += (targetWidth - currentWidth);
        separatorLine = buildSeparatorLine(lastColWidths);
    }

    return separatorLine;
}

// TODO 优化一下对齐算法
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
                return escapeTableCellPipes(content.trim());
            })
        );

        // ── Step 2: 逐行计算“可参与对齐”的前缀列数 m ───────────────────────
        const alignPrefixCounts: number[] = cellStrs.map(cells =>
            alignedPrefixCellCount(cells, numCols, cfg.removeOuterBorders, cfg.maxFormatColumnWidth),
        );

        // ── Step 3: 仅基于“参与对齐”的单元格求每列最大显示宽度（≥3） ─────────
        const colWidths: number[] = Array.from({ length: numCols }, (_, c) => {
            let maxW = 3;
            for (let r = 0; r < cellStrs.length; r++) {
                if (alignPrefixCounts[r] <= c) continue;
                maxW = Math.max(maxW, displayWidth(cellStrs[r][c] ?? ""));
            }
            return maxW;
        });

        const alignPrefixCols = Math.max(0, ...alignPrefixCounts);

        // ── Step 4: 生成各行字符串（每行只对齐前 m 列） ───────────────────────
        const renderedRows: string[] = [];
        renderedRows.push(renderRow(cellStrs[0], alignPrefixCounts[0], colWidths, cfg.removeOuterBorders));
        for (let r = 1; r < rows.length; r++) {
            renderedRows.push(renderRow(cellStrs[r], alignPrefixCounts[r], colWidths, cfg.removeOuterBorders));
        }

        const maxRenderedRowWidth = Math.max(...renderedRows.map(displayWidth));
        const lines: string[] = [];
        lines.push(renderedRows[0]);
        lines.push(renderSeparator(
            colWidths,
            align,
            cfg.removeOuterBorders,
            cfg.maxFormatColumnWidth,
            numCols,
            alignPrefixCols,
            maxRenderedRowWidth,
        ));
        lines.push(...renderedRows.slice(1));

        return lines.join("\n");
    };
}
