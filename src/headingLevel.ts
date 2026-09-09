//===----------------------------------------------------------------------===//
//
// @desc    : 独立的 Markdown 标题级别调整能力
//
//===----------------------------------------------------------------------===//

import type { Heading, Root, Text } from "mdast";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { visit } from "unist-util-visit";

/** 标题级别变化量：+1 为缩进，-1 为反缩进。 */
export type HeadingLevelDelta = -1 | 1;

/** Markdown 源文本中的半开区间 `[start, end)`。 */
export interface OffsetRange {
    start: number;
    end: number;
}

/** 对 Markdown 源文本执行的一处最小编辑。 */
export interface HeadingLevelEdit extends OffsetRange {
    replacement: string;
    oldDepth: Heading["depth"];
    newDepth: Heading["depth"];
}

function buildParser() {
    return remark()
        .use(remarkGfm, { singleTilde: false })
        .use(remarkMath);
}

function validateRanges(markdown: string, ranges: readonly OffsetRange[] | undefined): void {
    if (ranges === undefined) return;

    for (const range of ranges) {
        if (
            !Number.isInteger(range.start)
            || !Number.isInteger(range.end)
            || range.start < 0
            || range.end < range.start
            || range.end > markdown.length
        ) {
            throw new RangeError(`Invalid Markdown offset range: [${range.start}, ${range.end})`);
        }
    }
}

function intersectsAnyRange(
    start: number,
    end: number,
    ranges: readonly OffsetRange[] | undefined,
): boolean {
    if (ranges === undefined) return true;
    return ranges.some((range) => range.start < end && start < range.end);
}

function shiftedDepth(depth: Heading["depth"], delta: HeadingLevelDelta): Heading["depth"] {
    return Math.max(1, Math.min(6, depth + delta)) as Heading["depth"];
}

function lineStartAt(markdown: string, offset: number): number {
    return markdown.lastIndexOf("\n", Math.max(0, offset - 1)) + 1;
}

function contentEndBeforeLine(markdown: string, lineStart: number): number {
    let end = lineStart;
    if (end > 0 && markdown[end - 1] === "\n") end--;
    if (end > 0 && markdown[end - 1] === "\r") end--;
    return end;
}

/**
 * 将多行 Setext 标题局部序列化为单行 ATX 标题。
 *
 * Setext 允许标题内容跨行，而 ATX 不允许。这里只克隆并序列化当前 heading，
 * 同时把 text 节点中的软换行折叠为空格，避免改变文档的其他部分。
 */
function stringifyAsAtx(
    processor: ReturnType<typeof buildParser>,
    node: Heading,
    depth: Heading["depth"],
): string {
    const cloned = JSON.parse(JSON.stringify(node)) as Heading;
    cloned.depth = depth;
    delete cloned.position;

    visit(cloned, "text", (textNode: Text) => {
        textNode.value = textNode.value.replace(/[\r\n]+/g, " ");
    });

    const root: Root = { type: "root", children: [cloned] };
    return processor.stringify(root).replace(/\r?\n$/, "");
}

function collectAtxEdit(
    markdown: string,
    node: Heading,
    start: number,
    newDepth: Heading["depth"],
): HeadingLevelEdit | undefined {
    const source = markdown.slice(start, node.position?.end.offset);
    const marker = /^(#{1,6})(?=[\t ]|$)/.exec(source);
    if (!marker) return undefined;

    return {
        start,
        end: start + marker[1].length,
        replacement: "#".repeat(newDepth),
        oldDepth: node.depth,
        newDepth,
    };
}

function collectSetextEdit(
    markdown: string,
    processor: ReturnType<typeof buildParser>,
    node: Heading,
    start: number,
    end: number,
    newDepth: Heading["depth"],
): HeadingLevelEdit | undefined {
    const underlineStart = lineStartAt(markdown, end);
    const underlineSource = markdown.slice(underlineStart, end);
    const underlineMarker = /([=-]+)[\t ]*$/.exec(underlineSource);
    if (!underlineMarker) return undefined;

    // Setext 原生支持 H1/H2；在这两个级别之间切换时只改下划线字符。
    if (newDepth <= 2) {
        const markerStart = underlineStart + underlineMarker.index;
        return {
            start: markerStart,
            end: markerStart + underlineMarker[1].length,
            replacement: (newDepth === 1 ? "=" : "-").repeat(underlineMarker[1].length),
            oldDepth: node.depth,
            newDepth,
        };
    }

    // H2 -> H3 必须切换成 ATX。单行标题直接复用原始内容，以保留 inline 标记。
    const isSingleContentLine = node.position!.end.line === node.position!.start.line + 1;
    const replacement = isSingleContentLine
        ? `${"#".repeat(newDepth)} ${markdown.slice(start, contentEndBeforeLine(markdown, underlineStart))}`
        : stringifyAsAtx(processor, node, newDepth);

    return {
        start,
        end,
        replacement,
        oldDepth: node.depth,
        newDepth,
    };
}

/**
 * 解析完整 Markdown，并返回调整标题级别所需的最小文本编辑。
 *
 * `ranges` 为源文本 offset 的半开区间。省略时处理全文；传入时，只处理与
 * 任一区间相交的标题。结果按 start 升序排列，且互不重叠。
 */
export function collectHeadingLevelEdits(
    markdown: string,
    delta: HeadingLevelDelta,
    ranges?: readonly OffsetRange[],
): HeadingLevelEdit[] {
    validateRanges(markdown, ranges);

    const processor = buildParser();
    const tree = processor.parse(markdown);
    const edits: HeadingLevelEdit[] = [];

    visit(tree, "heading", (node: Heading) => {
        const start = node.position?.start.offset;
        const end = node.position?.end.offset;
        if (start === undefined || end === undefined) return;
        if (!intersectsAnyRange(start, end, ranges)) return;

        const newDepth = shiftedDepth(node.depth, delta);
        if (newDepth === node.depth) return;

        const edit = collectAtxEdit(markdown, node, start, newDepth)
            ?? collectSetextEdit(markdown, processor, node, start, end, newDepth);
        if (edit) edits.push(edit);
    });

    return edits.sort((left, right) => left.start - right.start);
}

/** 批量调整 Markdown 标题级别，并返回修改后的完整文本。 */
export function shiftHeadingLevels(
    markdown: string,
    delta: HeadingLevelDelta,
    ranges?: readonly OffsetRange[],
): string {
    const edits = collectHeadingLevelEdits(markdown, delta, ranges);
    let result = markdown;

    for (let index = edits.length - 1; index >= 0; index--) {
        const edit = edits[index];
        result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
    }

    return result;
}
