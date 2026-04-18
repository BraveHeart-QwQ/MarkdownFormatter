//===----------------------------------------------------------------------===//
//
// @desc    : ListItem 节点 stringify handler（控制列表缩进宽度）
//
//===----------------------------------------------------------------------===//

import type { List, ListItem, Parents } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { Handle } from "./tableHandler.js";

// BUG 列表整体的上下行间隙不应被格式化
// TODO 列表 item 之间的间隙，取决于是否存在缩进内容

// mdast-util-to-markdown State 的最小接口（避免对传递依赖的直接 import）
interface ToMarkdownState {
    bulletCurrent: string | undefined;
    options: { incrementListMarker?: boolean };
    createTracker(info: object): { move(s: string): string; shift(n: number): void; current(): object };
    enter(type: string): () => void;
    indentLines(value: string, map: (line: string, index: number, blank: boolean) => string): string;
    containerFlow(node: object, info: object): string;
}

/**
 * 返回 ListItem 节点的 stringify handler。
 *
 * 替换 remark-stringify 默认的 listItemIndent 计算逻辑，
 * 改为读取 config.blockIndent.unorderedListIndent / orderedListIndent。
 *
 * 逻辑对照 mdast-util-to-markdown@2 list-item.js，唯一差异是 size 改用配置值。
 */
export function listItemHandler(config: FormatterConfig): Handle {
    return function (node: object, parent: object | null, state: object, info: object): string {
        const item = node as ListItem;
        const listParent = parent as (Parents & { ordered?: boolean | null; start?: number | null }) | null;
        const s = state as ToMarkdownState;

        // 取当前 bullet（由 list handler 写入 state.bulletCurrent）
        let bullet: string = s.bulletCurrent ?? "-";

        // 有序列表：将序号前置到 bullet
        if (listParent && listParent.type === "list" && (listParent as List).ordered) {
            const orderedList = listParent as List;
            const start = typeof orderedList.start === "number" && orderedList.start > -1
                ? orderedList.start : 1;
            const itemIndex = s.options.incrementListMarker === false
                ? 0 : orderedList.children.indexOf(item);
            bullet = String(start + itemIndex) + bullet;
        }

        // GFM 任务列表项：检测 checked 属性，生成 [ ] / [x] 前缀
        const checkable = typeof item.checked === "boolean"
            && item.children.length > 0
            && item.children[0].type === "paragraph";
        const checkbox = checkable ? "[" + (item.checked ? "x" : " ") + "] " : "";

        // 第一行 bullet 后固定 1 个空格（即 `1. AAA`），续行按配置缩进
        const isOrdered = !!(listParent && (listParent as List).ordered);
        const continuationSize = isOrdered
            ? config.blockIndent.orderedListIndent
            : config.blockIndent.unorderedListIndent;

        const tracker = s.createTracker(info);
        tracker.move(bullet + " ");
        if (checkable) tracker.move(checkbox);
        tracker.shift(continuationSize);
        const exit = s.enter("listItem");
        const value = s.indentLines(
            s.containerFlow(item, tracker.current()),
            (line: string, index: number, blank: boolean): string => {
                if (index) {
                    return (blank ? "" : " ".repeat(continuationSize)) + line;
                }
                return (blank ? bullet : bullet + " ") + checkbox + line;
            }
        );
        exit();

        return value;
    };
}
