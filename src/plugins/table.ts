import type { TableCell, Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";

/**
 * 根据 config.table 处理 TableCell：去除行尾 trimTrailingChars 指定的字符。
 * 列宽计算与列对齐由 tableHandler 在 stringify 阶段完成。
 */
export function registerTableFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    if (!config.table.enabled) return;

    const charsToTrim = config.table.trimTrailingChars;
    if (charsToTrim.length === 0) return;

    registry.tableCell.push((cell: TableCell) => {
        if (cell.children.length === 0) return;
        const lastChild = cell.children[cell.children.length - 1];
        if (lastChild.type !== "text") return;

        const textNode = lastChild as Text;
        let value = textNode.value;
        let changed = true;
        while (changed) {
            changed = false;
            for (const ch of charsToTrim) {
                if (value.endsWith(ch)) {
                    value = value.slice(0, -ch.length);
                    changed = true;
                }
            }
        }
        textNode.value = value;
    });
}
