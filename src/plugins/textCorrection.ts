import type { Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { InlineMath, MathBlock, VisitorRegistry } from "./registry.js";

/**
 * 对 AST 中所有 Text 节点按序应用 config.textCorrection.replacements 正则替换。
 */
export function registerTextReplacement(registry: VisitorRegistry, config: FormatterConfig): void {
    const replacements = config.textCorrection.replacements;
    if (replacements.length === 0) return;

    registry.text.push((node: Text) => {
        for (const { pattern, replacement } of replacements) {
            node.value = node.value.replace(new RegExp(pattern, "gu"), replacement);
        }
    });
}

/**
 * 对 AST 中所有 Text 节点将 Tab 字符替换为空格（仅影响普通文本，不影响代码块/行内代码）。
 */
export function registerTabReplacement(registry: VisitorRegistry, config: FormatterConfig): void {
    if (!config.blockIndent.removeTab) return;
    const spaces = " ".repeat(config.blockIndent.tabSize);
    registry.text.push((node: Text) => {
        node.value = node.value.replace(/\t/g, spaces);
    });
    // 行内公式和块级公式内的 Tab 统一替换为单个空格（不受 tabSize 影响）
    registry.inlineMath.push((node: InlineMath) => {
        node.value = node.value.replace(/\t/g, " ");
    });
    registry.math.push((node: MathBlock) => {
        node.value = node.value.replace(/\t/g, " ");
    });
}
