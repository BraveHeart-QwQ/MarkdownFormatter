//===----------------------------------------------------------------------===//
//
// @desc    : 统一导出所有 stringify handlers
//
//===----------------------------------------------------------------------===//

import type { List, ListItem, Nodes, Parents } from "mdast";
import type { Handle } from "./tableHandler.js";
import { tableHandler } from "./tableHandler.js";
import { listItemHandler } from "./listItemHandler.js";
import { linkHandler, imageHandler, textHandler, definitionHandler, emphasisHandler, strongHandler } from "./escapeFixHandler.js";
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
 * 当非列表快紧凑时（原文无空行），保持紧凑排版
 */
function compactListJoin(left: Nodes, right: Nodes): number | undefined {
    if (right.type !== "list") return undefined;
    if (left.type === "list") return undefined;
    const leftEnd = left.position?.end?.line;
    const rightStart = right.position?.start?.line;
    if (leftEnd !== undefined && rightStart !== undefined && leftEnd + 1 === rightStart)
        return 0;
    return undefined;
}

/**
 * 当表格与前一节点紧凑时（原文无空行），保持紧凑排版
 */
function compactTableJoin(left: Nodes, right: Nodes): number | undefined {
    if (right.type !== "table") return undefined;
    const leftEnd = left.position?.end?.line;
    const rightStart = right.position?.start?.line;
    if (leftEnd !== undefined && rightStart !== undefined && leftEnd + 1 === rightStart)
        return 0;
    return undefined;
}

/**
 * 控制 list item 内部的行间距
 */
function listSpreadJoin(left: Nodes, right: Nodes, parent: Parents): number | undefined {
    const isListNode = (t: string) => t === "list";
    const countNonListChildren = (item: ListItem) => item.children.filter(c => !isListNode(c.type)).length;
    if (parent.type === "list" && left.type === "listItem" && right.type === "listItem") {
        const leftItem = left as ListItem;
        if (countNonListChildren(leftItem) > 1) {
            return 1;
        }
        return 0;
    }
    if (parent.type === "listItem" && !isListNode(left.type) && !isListNode(right.type)) {
        return 1;
    }
    return undefined
}

/**
 * 构建传给 remark-stringify 的 join 函数数组。
 */
export function buildJoinFunctions(_config: FormatterConfig): JoinFn[] {
    return [headingLineSpacingJoin, compactListJoin, compactTableJoin, listSpreadJoin];
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

    handlers["link"] = linkHandler;
    handlers["image"] = imageHandler;
    handlers["text"] = textHandler;
    handlers["definition"] = definitionHandler;
    handlers["emphasis"] = emphasisHandler;
    handlers["strong"] = strongHandler;

    return handlers;
}

