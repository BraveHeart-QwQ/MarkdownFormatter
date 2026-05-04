//===----------------------------------------------------------------------===//
//
// @desc    : 统一导出所有 stringify handlers
//
//===----------------------------------------------------------------------===//

import type { List, ListItem, Nodes, Parents } from "mdast";
import type { Handle } from "./tableHandler.js";
import { tableHandler } from "./tableHandler.js";
import { listItemHandler } from "./listItemHandler.js";
import { linkHandler, imageHandler, textHandler, definitionHandler, emphasisHandler, strongHandler, markHandler } from "./escapeFixHandler.js";
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
 * 允许紧凑的代码块
 */
function compactCodeBlockJoin(left: Nodes, right: Nodes): number | undefined {
    if (right.type !== "code") return undefined;
    const leftEnd = left.position?.end?.line;
    const rightStart = right.position?.start?.line;
    if (leftEnd !== undefined && rightStart !== undefined && leftEnd + 1 === rightStart)
        return 0;
    return undefined;
}

/**
 * 当公式块与前一节点紧凑时（原文无空行），保持紧凑排版
 */
function compactMathJoin(left: Nodes, right: Nodes): number | undefined {
    if (right.type !== "math") return undefined;
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
    const isNestedBlockNode = (t: string) => ["list", "table", "math", "code", "blockquote"].includes(t); // compact in list
    const countNonListChildren = (item: ListItem) => item.children.filter(c => !isListNode(c.type)).length;
    if (parent.type === "list" && left.type === "listItem" && right.type === "listItem") {
        const leftItem = left as ListItem;
        if (countNonListChildren(leftItem) > 1) {
            return 1;
        }
        return 0;
    }
    if (parent.type === "listItem" && !isListNode(left.type) && isNestedBlockNode(right.type)) {
        const listItemParent = parent as ListItem;
        // Keep one blank line only for first paragraph -> fenced code transitions.
        if (right.type === "code") {
            const leftIndex = listItemParent.children.indexOf(left as ListItem["children"][number]);
            return leftIndex === 0 ? 1 : 0;
        }
        return 0;
    }
    if (parent.type === "listItem" && !isListNode(left.type) && !isListNode(right.type)) {
        return 1;
    }
    return undefined
}

/**
 * 正确输出数学元素
 */
function mathHandler(node: { value?: string; meta?: string | null; data?: { rawMeta?: string } }): string {
    const raw = node.value || "";
    // Prefer the raw meta extracted from source (preserves backslashes that remark
    // would other wise process as markdown escape sequences, e.g. \{ -> {).
    const meta = node.data?.rawMeta !== undefined ? node.data.rawMeta : (node.meta ?? "");
    if (!raw && !meta) {
        return "$$";
    }
    // Only lines starting with $$ can act as closing fences (scan line starts only)
    const lineStartStreak = (raw.match(/^\$+/gm) || [])?.reduce((max, m) => Math.max(max, m.length), 0);
    const seq = "$".repeat(Math.max(lineStartStreak + 1, 2));
    // When closing $$ inline (not at line start), remark-math absorbs it into value
    const lastLine = raw.split("\n").pop() || "";
    if (/\$\$+$/.test(lastLine)) {
        if (meta) {
            // Has meta (e.g. $$\begin{array}), then keep the inline closing verbatim
            return seq + meta + "\n" + raw;
        } else {
            const trailingDollors = /\$\$+$/.exec(lastLine)![0].length;
            const stripped = raw.slice(0, raw.length - trailingDollors).trimEnd();
            return seq + "\n" + stripped;
        }
    }
    if (meta) {
        // $$meta opener with standalone closing -> reconstruct as inline closing style
        return seq + meta + "\n" + raw + seq;
    }
    let result = seq + "\n";
    if (raw) result += raw + "\n";
    result += seq;
    return result;
}

function inlineMathHandler(node: { value: string; data?: { marker?: string } }): string {
    const marker = node.data?.marker ?? "$";
    return marker + node.value + marker;
}

/**
 * 自定义 blockquote handler：按源文本保留 marker 后空格（`>` / `> `）。
 */
function blockquoteHandler(node: { data?: { blockquoteSpaceAfterMarker?: boolean } }, _parent: object | null, state: any, info: object): string {
    const exit = state.enter("blockquote");
    const tracker = state.createTracker(info);
    const marker = node.data?.blockquoteSpaceAfterMarker === true ? "> " : ">";
    tracker.move(marker);
    tracker.shift(marker.length);
    const value = state.indentLines(
        state.containerFlow(node, tracker.current()),
        (line: string, _index: number, blank: boolean) => {
            return blank ? ">" : marker + line;
        },
    );
    exit();
    return value;
}

/**
 * 构建传给 remark-stringify 的 join 函数数组。
 */
export function buildJoinFunctions(_config: FormatterConfig): JoinFn[] {
    return [headingLineSpacingJoin, compactListJoin, compactMathJoin, compactCodeBlockJoin, compactTableJoin, listSpreadJoin];
}

/**
 * 自定义 code handler：根据节点是否原本为围栏代码块，决定输出形式。
 *
 * - 原本为围栏（`originallyFenced: true`）或带 lang/meta：输出为围栏代码块。
 * - 否则若 `parseIndentAsCodeBlock: true`：输出为围栏（与 remark 默认行为一致）。
 * - 否则：输出为 4 空格缩进代码块，保留原始风格。
 *
 * remark-stringify 的全局 `fences` 设置会无差别影响所有 code 节点，无法
 * 区分"原本就是围栏"和"原本是缩进"两种情况，因此自定义 handler 替换之。
 */
function buildCodeHandler(config: FormatterConfig): Handle {
    return function (node: object): string {
        const n = node as {
            lang?: string | null;
            meta?: string | null;
            value?: string;
            data?: { originallyFenced?: boolean };
        };
        const value = n.value ?? "";
        const hasLangOrMeta = !!n.lang || !!n.meta;
        const shouldFence =
            n.data?.originallyFenced === true
            || hasLangOrMeta
            || config.blockIndent.parseIndentAsCodeBlock;

        if (!shouldFence) {
            // 4 空格缩进代码块：每行前加 4 空格（空行保持空）
            return value.split("\n").map(line => (line.length > 0 ? "    " + line : "")).join("\n");
        }

        // 围栏：选择 ≥3 且超过内容中最长反引号序列的长度
        const runs = value.match(/`+/g) ?? [];
        const maxRun = runs.reduce((m, r) => Math.max(m, r.length), 0);
        const fence = "`".repeat(Math.max(3, maxRun + 1));
        const lang = n.lang ?? "";
        const metaPart = n.meta ? " " + n.meta : "";
        return value.length > 0
            ? fence + lang + metaPart + "\n" + value + "\n" + fence
            : fence + lang + metaPart + "\n" + fence;
    };
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
    handlers["mark"] = markHandler;
    handlers["blockquote"] = blockquoteHandler as unknown as Handle;
    handlers["math"] = mathHandler;
    handlers["inlineMath"] = inlineMathHandler as unknown as Handle;
    handlers["code"] = buildCodeHandler(config);

    return handlers;
}

