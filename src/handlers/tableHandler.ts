//===----------------------------------------------------------------------===//
//
// @desc    : Table 节点 stringify handler
//
//===----------------------------------------------------------------------===//

import type { Table } from "mdast";
import type { FormatterConfig } from "../config.js";

// mdast-util-to-markdown handler 函数类型（避免对传递依赖的直接 import）
export type Handle = (node: object, parent: object | null, state: object, info: object) => string;

/**
 * 返回 Table 节点的 stringify handler。
 *
 * 读取 plugin 阶段写入的 ExtraData：
 * - table.data.columnWidths   → 列对齐宽度
 * - table.data.removeOuterBorders → 是否去掉两端 |
 * - tableRow.data.skipColumnAlign → 是否跳过该行的列对齐
 *
 * TODO 实现
 */
export function tableHandler(_config: FormatterConfig): Handle {
    return function (node, _parent, _state, _info): string {
        void (node as Table);
        // TODO 根据 table.data.columnWidths 对每个单元格内容补充空格对齐
        // TODO 根据 table.data.removeOuterBorders 在输出时去掉首尾 |
        // TODO 跳过 skipColumnAlign 为 true 的行
        // TODO 处理 _config.table.trimTrailingChars
        // TODO 处理 _config.other.singleCharTableHead（header 行单字符化）
        return "";
    };
}
