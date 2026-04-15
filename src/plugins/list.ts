import type { ListItem, Paragraph, Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";

/**
 * 根据 config.list 规范化 List / ListItem：标记符、缩进、尾部字符。
 * - 标记符和有序样式通过 remark-stringify 的 settings 控制（见 pipeline.ts）
 * - 此处处理 trimTrailingChars：去除列表项第一段末尾的指定字符
 */
export function registerListFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    if (!config.list.enabled) return;
    if (config.list.trimTrailingChars.length === 0) return;

    const charsToTrim = config.list.trimTrailingChars;

    registry.listItem.push((node: ListItem) => {
        // 只处理列表项的第一个段落（续行段落不受影响）
        const firstPara = node.children.find((child): child is Paragraph => child.type === "paragraph");
        if (!firstPara || firstPara.children.length === 0)
            return;

        // 只处理段落最后一个直接子节点为 Text 的情况（不伸入行内元素内部）
        const lastChild = firstPara.children[firstPara.children.length - 1];
        if (lastChild.type !== "text")
            return;

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
