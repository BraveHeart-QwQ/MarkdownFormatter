//===----------------------------------------------------------------------===//
//
// @desc    : 统一导出所有 stringify handlers
//
//===----------------------------------------------------------------------===//

import type { Handle } from "./tableHandler.js";
import { tableHandler } from "./tableHandler.js";
import { listItemHandler } from "./listItemHandler.js";
import type { FormatterConfig } from "../config.js";

export type { Handle };

// handler map 传入 remark-stringify：`.data('settings', { handlers })`
export type Handlers = Partial<Record<string, Handle>>;

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

    // TODO heading handler — 根据 HeadingExtraData 在输出前后插入空行
    // TODO list handler   — 根据 ListExtraData 输出正确的缩进

    return handlers;
}

