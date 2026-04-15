import type { Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";

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
