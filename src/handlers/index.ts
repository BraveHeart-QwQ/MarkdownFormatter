//===----------------------------------------------------------------------===//
//
// @desc    : 统一导出所有 stringify handlers
//
//===----------------------------------------------------------------------===//

import type { Nodes, Parents } from "mdast";
import type { Handle } from "./tableHandler.js";
import { tableHandler } from "./tableHandler.js";
import { listItemHandler } from "./listItemHandler.js";
import type { FormatterConfig } from "../config.js";

export type { Handle };

// handler map 传入 remark-stringify：`.data('settings', { handlers })`
export type Handlers = Partial<Record<string, Handle>>;

// join 函数类型：决定相邻块节点之间插入几个空行（返回 n → n+1 个 \n）
export type JoinFn = (left: Nodes, right: Nodes, parent: Parents) => number | undefined;

/**
 * lineSpacing join 函数：
 * - 若相邻节点中至少有一个 heading（已由 plugin 写入 blankLinesBefore/blankLinesAfter），
 *   则取两侧值的较大者作为实际空行数。
 * - 两侧均无数据时返回 undefined，让 remark-stringify 使用默认间距。
 */
function headingLineSpacingJoin(left: Nodes, right: Nodes): number | undefined {
    type LSData = { blankLinesAfter?: number; blankLinesBefore?: number };
    const leftAfter = (left.data as LSData | undefined)?.blankLinesAfter;
    const rightBefore = (right.data as LSData | undefined)?.blankLinesBefore;

    if (leftAfter === undefined && rightBefore === undefined)
        return undefined;

    const candidates: number[] = [];
    if (leftAfter !== undefined)
        candidates.push(leftAfter);
    if (rightBefore !== undefined)
        candidates.push(rightBefore);
    return Math.max(...candidates);
}

/**
 * 构建传给 remark-stringify 的 join 函数数组。
 */
export function buildJoinFunctions(_config: FormatterConfig): JoinFn[] {
    return [headingLineSpacingJoin];
}

/**
 * 根据配置构建 remark-stringify 使用的 handler map。
 */
export function buildHandlers(config: FormatterConfig): Handlers {
    const handlers: Handlers = {};

    if (config.table.enabled) {
        handlers["table"] = tableHandler(config);
    }

    // 自定义 listItem handler：使用 blockIndent.unorderedListIndent / orderedListIndent
    handlers["listItem"] = listItemHandler(config);

    // TODO heading handler — 根据 HeadingExtraData 在输出前后插入空行
    // TODO list handler   — 根据 ListExtraData 输出正确的缩进

    return handlers;
}

