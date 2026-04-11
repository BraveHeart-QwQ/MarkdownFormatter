//===----------------------------------------------------------------------===//
//
// @desc    : 格式化配置文件
//
//===----------------------------------------------------------------------===//

// TODO Formatter 需求：
// - [ ] 文本矫正（预处理，保护代码块，文本基础正则替换）
// - [ ] 块缩进处理（普通缩进当作代码块处理，其他时候无序列表块缩进为 2，有序列表块缩进为 4）
// - [ ] 列表规范化：`- xxx`、`1. xxx`
// - [ ] 列表、Table 的行结尾去除 `。` 号
// - [ ] 标题不含序号
// - [ ] Table 格式化（对齐、宽度有限、标题行、消除左右两端竖边）
// - [ ] inline 格式化与去格式化（code、math、strong）
// - [ ] 行间距（特别是标题）

/* 文本规范化：预处理与基础正则替换 */
export interface TextCorrectionConfig {
    enabled: boolean; // 是否启用文本矫正
    replacements: Array<{ pattern: string | RegExp; replacement: string }>; // 自定义替换规则，按顺序应用
}

/* 块缩进处理 */
export interface BlockIndentConfig {
    indentAsCodeBlock: boolean; // 普通缩进（4 空格/Tab）当作代码块处理（会被格式化为代码块 fence）
    unorderedListIndent: number; // 无序列表块缩进空格数
    orderedListIndent: number; // 有序列表块缩进空格数
}

/* 行间距处理 */
export interface LineSpacingConfig {
    blankLinesBeforeH1: number; // H1 标题前空行数
    blankLinesAfterH1: number; // H1 标题后空行数
    blankLinesBeforeH2: number; // H2 标题前空行数
    blankLinesAfterH2: number; // H2 标题后空行数
    blankLinesBeforeH3: number; // H3 标题前空行数
    blankLinesAfterH3: number; // H3 标题后空行数
    blankLinesBeforeH4: number; // H4 标题前空行数
    blankLinesAfterH4: number; // H4 标题后空行数
}

/* 词间距处理 */
export interface WordSpacingConfig {
    spaceBetweenChineseAndEnglish: boolean; // 是否在中文和英文之间添加空格
    spaceBetweenWordAndNumber: boolean; // 是否在中英和数字之间添加空格
    spaceBetweenInlineElements: boolean; // 是否在行内元素（如代码、数学公式）与其他文本之间添加空格
}

/* 列表格式化 */
export interface ListConfig {
    unorderedMarker: "-"; // 无序列表标记符，固定为 `-`
    orderedStyle: "sequential"; // 有序列表标记格式，固定为 `1.` 不递增
}

/* 标题格式化 */
export interface HeadingConfig {
    removeNumbering: boolean; // 是否移除标题中的序号（如 `1.`、`一、`），这在 AI 产生的 MD 中比较常见
}

/* Table 格式化 */
export interface TableConfig {
    enabled: boolean; // 是否启用 Table 格式化
    maxColumnWidth: number; // 单元格内容最大宽度（字符数），0 表示不限制
    defaultAlignment: "left" | "center" | "right"; // 列对齐方式默认值
    removeOuterBorders: boolean; // 是否消除左右两端的竖线边框
    trimTrailingChars: Array<string>; // 行结尾要去除的字符列表，比如去除 `。`
}

/* Inline 元素格式化 */
export interface InlineConfig {
    normalizeCode: boolean; // 是否规范化行内代码（去首尾空格）
    /* 是否规范化行内数学公式 */
    normalizeMath: boolean;
    /* 是否规范化加粗（`**` 统一格式） */
    normalizeStrong: boolean;
}

export interface FormatterConfig {
    /* 文本矫正 */
    textCorrection: TextCorrectionConfig;
    /* 块缩进处理 */
    blockIndent: BlockIndentConfig;
    /* 列表格式化 */
    list: ListConfig;
    /* 标题格式化 */
    heading: HeadingConfig;
    /* Table 格式化 */
    table: TableConfig;
    /* inline 元素格式化 */
    inline: InlineConfig;
    /* 行间距 */
    spacing: LineSpacingConfig;
}

export const defaultFormatterConfig: FormatterConfig = {
    textCorrection: {
        enabled: true,
        replacements: [],
    },
    blockIndent: {
        indentAsCodeBlock: true,
        unorderedListIndent: 2,
        orderedListIndent: 4,
    },
    list: {
        unorderedMarker: "-",
        orderedStyle: "sequential",
        removeTrailingPeriod: true,
    },
    heading: {
        removeNumbering: true,
        blankLinesBefore: 1,
        blankLinesAfter: 1,
    },
    table: {
        enabled: true,
        maxColumnWidth: 0,
        defaultAlignment: "left",
        removeOuterBorders: true,
        removeTrailingPeriod: true,
    },
    inline: {
        normalizeCode: true,
        normalizeMath: true,
        normalizeStrong: true,
    },
    spacing: {
        paragraphSpacing: 1,
        codeBlockSpacing: 1,
    },
};
