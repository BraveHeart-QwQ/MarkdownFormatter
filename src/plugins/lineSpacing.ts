import type { Heading } from "mdast";
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
