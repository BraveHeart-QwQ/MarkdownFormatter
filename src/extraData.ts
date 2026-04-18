//===----------------------------------------------------------------------===//
//
// @desc    : MDAST 节点 data 数据结构
//
//===----------------------------------------------------------------------===//

// 各节点的 ExtraData 由 AST plugins 阶段写入，由 stringify handlers 阶段读取。

// ── Heading ───────────────────────────────────────────────────────────────────

export interface HeadingExtraData {
    /** 此节点前需插入的空行数（由 lineSpacing plugin 写入） */
    blankLinesBefore?: number;
    /** 此节点后需插入的空行数（由 lineSpacing plugin 写入） */
    blankLinesAfter?: number;
}

// ── Table ─────────────────────────────────────────────────────────────────────

export interface TableExtraData {
    /** 各列的格式化宽度（字符数），用于对齐（由 tableFormatting plugin 写入） */
    columnWidths?: number[];
    /** 是否去除左右两端竖线（由 tableFormatting plugin 写入） */
    removeOuterBorders?: boolean;
}

export interface TableRowExtraData {
    /** 为 true 时，该行宽度超限，不参与列对齐，直接按 ` | ` 分隔输出 */
    skipColumnAlign?: boolean;
}

// ── List ──────────────────────────────────────────────────────────────────────

export interface ListExtraData {
    /** 子块缩进空格数（由 listFormatting plugin 写入） */
    indent?: number;
}

// ── Link ──────────────────────────────────────────────────────────────────────

export interface LinkExtraData {
    /** 为 true 时，源文本使用了 <url> 标准 autolink 语法 */
    standardAutolink?: boolean;
}

// ── Module Augmentation ───────────────────────────────────────────────────────
// 将上述接口合并到 @types/mdast 对应节点的 data 字段类型中。

declare module "mdast" {
    interface HeadingData extends HeadingExtraData { }
    interface TableData extends TableExtraData { }
    interface TableRowData extends TableRowExtraData { }
    interface ListData extends ListExtraData { }
    interface LinkData extends LinkExtraData { }
}
