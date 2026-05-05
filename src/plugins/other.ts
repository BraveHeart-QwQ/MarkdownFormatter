import type { Heading, PhrasingContent, Table, Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { InlineMath, VisitorRegistry } from "./registry.js";

// 匹配标题开头的序号，涵盖：
//   1. / 1.2 / 1.2.3. （阿拉伯数字，要求后有空格，避免误判）
//   一、/ 二、 / 三、 （中文数字序号）
const HEADER_NUMBER_RE = /^(?:\d+(?:\.\d+)*\.?\s+|[一二三四五六七八九十百千万]+[、]\s*)/u;

/**
 * 递归提取 phrasing 节点中的纯文本内容。
 * - text → 原始文本
 * - inlineCode / inlineMath → .value（去除标记符）
 * - image → alt 文本
 * - 其他容器节点（strong、emphasis、link、delete、mark 等）→ 递归子节点
 */
function extractPlainText(node: PhrasingContent): string {
    if (node.type === "text") return (node as Text).value;
    if (node.type === "inlineCode") return (node as { value: string }).value;
    if (node.type === "inlineMath") return (node as InlineMath).value;
    if (node.type === "image") return (node as { alt?: string }).alt ?? "";
    if (node.type === "break") return "";
    const children = (node as { children?: PhrasingContent[] }).children;
    if (children) return children.map(extractPlainText).join("");
    return "";
}

/**
 * 处理 config.other 中的杂项规则：removeHeaderNumber、singleCharTableHead
 */
export function registerOtherFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    if (config.other.removeHeaderNumber) {
        // 移除标题首个 Text 子节点前缀的序号（如 `1.`、`2.3`、`一、`）
        registry.heading.push((node: Heading) => {
            if (node.children.length === 0) return;
            const first = node.children[0];
            if (first.type !== "text") return;
            first.value = first.value.replace(HEADER_NUMBER_RE, "");
        });
    }

    if (config.other.stripInlineFromHeadings) {
        // 将标题内所有 inline 元素（代码、加粗、公式、链接等）替换为纯文本
        registry.heading.push((node: Heading) => {
            const text = (node.children as PhrasingContent[]).map(extractPlainText).join("");
            node.children = text ? [{ type: "text", value: text } as Text] : [];
        });
    }

    if (!config.other.singleCharTableHead) return;

    // 将每张表的表头行各格替换为单字符（a, b, c, ...）
    registry.table.push((node: Table) => {
        if (node.children.length === 0) return;
        const headerRow = node.children[0];
        for (let i = 0; i < headerRow.children.length; i++) {
            const cell = headerRow.children[i];
            const char = String.fromCharCode("a".charCodeAt(0) + i);
            cell.children = [{ type: "text", value: char } as Text];
        }
    });
}
