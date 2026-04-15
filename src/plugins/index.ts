//===----------------------------------------------------------------------===//
//
// @desc    : 统一导出所有 ast plugins
//
//===----------------------------------------------------------------------===//

import type { Root } from "mdast";
import type { FormatterConfig } from "../config.js";
import { createRegistry, runSinglePass } from "./registry.js";
import { registerTextReplacement } from "./textCorrection.js";
import { registerLineSpacing } from "./lineSpacing.js";
import { registerWordSpacing } from "./wordSpacing.js";
import { registerListFormatting } from "./list.js";
import { registerTableFormatting } from "./table.js";
import { registerInlineFormatting } from "./inline.js";
import { registerOtherFormatting } from "./other.js";

// ── Main plugin ────────────────────────────────────────────────

/**
 * 将所有格式化 AST 变换组合为一个 unified 插件。
 *
 * 用法：`.use(remarkFormatter, config)`
 *
 * unified 在执行时会以 `remarkFormatter.call(processor, config)` 调用本函数，
 * 返回値即为 transformer，在 parse 之后、stringify 之前被调用。
 */
export function remarkFormatter(config: FormatterConfig): (tree: Root) => void {
    return function (tree: Root): void {
        const registry = createRegistry();

        // 这里的顺序很重要
        registerTextReplacement(registry, config);
        registerLineSpacing(registry, config);
        registerInlineFormatting(registry, config); // inline 应在 wordSpacing 之前执行
        registerWordSpacing(registry, config);
        registerListFormatting(registry, config);
        registerTableFormatting(registry, config);
        registerOtherFormatting(registry, config);

        runSinglePass(tree, registry);
    };
}
