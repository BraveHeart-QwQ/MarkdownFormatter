import type { Table, Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";

/**
 * 处理 config.other 中的杂项规则：singleCharTableHead。
 */
export function registerOtherFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
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
