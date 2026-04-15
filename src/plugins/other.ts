import type { Heading, Table, Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";

// 匹配标题开头的序号，涵盖：
//   1. / 1.2 / 1.2.3. （阿拉伯数字，要求后有空格，避免误判）
//   一、/ 二、 / 三、 （中文数字序号）
const HEADER_NUMBER_RE = /^(?:\d+(?:\.\d+)*\.?\s+|[一二三四五六七八九十百千万]+[、]\s*)/u;

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
