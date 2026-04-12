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
    replacements: Array<{ pattern: string; replacement: string }>; // 自定义替换规则，按顺序应用。这里 pattern 是正则
}

/* 块缩进处理 */
export interface BlockIndentConfig {
    parseIndentAsCodeBlock: boolean; // 普通缩进（4 空格/Tab）当作代码块处理（会退缩进，并用代码块 fence 包裹）
    unorderedListIndent: number; // 无序列表块缩进空格数
    orderedListIndent: number; // 有序列表块缩进空格数
}

/* 行间距处理 */
export interface LineSpacingConfig {
    // 如果相邻，则取 Before 和 After 中最大的那个作为间隔
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
    // 注意，中英符号并不会产生词间距
    spaceBetweenChineseAndEnglish: boolean; // 是否在中文和英文之间添加空格
    spaceBetweenWordAndNumber: boolean; // 是否在中英和数字之间添加空格
    spaceBetweenInlineElements: boolean; // 是否在行内元素（如代码、数学公式）与其他文本之间添加空格
}

/* 列表格式化 */
export interface ListConfig {
    enabled: boolean; // 是否启用文本矫正
    unorderedMarker: "-" | "*" | "+"; // 无序列表标记符
    orderedStyle: "notSequential" | "sequential"; // 有序列表标记格式
    trimTrailingChars: Array<string>; // 行结尾要去除的字符列表，比如去除 `。`；注意，列表下缩进的内容（非直接列表所在行），不受该配置影响
}

/* Table 格式化 */
export interface TableConfig {
    // 列表默认靠左对齐，自动插入空格对齐列
    enabled: boolean; // 是否启用 Table 格式化
    removeOuterBorders: boolean; // 是否消除左右两端的竖线边框
    trimTrailingChars: Array<string>; // 行结尾要去除的字符列表，比如去除 `。`
    maxFormatColumnWidth: number; // 当格式化后**某一行**的总宽度超过这个值时，该行不参与 Table 格式化列对齐（Table 其他行不受影响），而是直接转为纯粹的按 ` | ` 分隔的文本
}

/* Inline 元素格式化 */
export interface InlineConfig {
    // 基本格式化（写死）：去除 inline 内的首尾空格
    normalizeStrong: boolean; // 是否规范化加粗（`**` 统一格式）
    handleInlineCode: "normal" | "allEnglishWord" | "removeAll"; // 正常处理 | 所有英文单词都格式化为 inline code | 移除所有 inline code
    handleInlineMath: "normal" | "allEnglishWord" | "removeAll"; // 正常处理 | 所有英文单词都格式化为 inline code | 移除所有 inline code
    handleInlineStrong: "normal" | "allEnglishWord" | "removeAll"; // 正常处理 | 所有英文单词都格式化为 inline code | 移除所有 inline code
}

/* 特殊格式化需求 */
export interface OtherConfig {
    removeHeaderNumber: boolean; // 移除标题中的序号（如 `1.`、`一、`），这在 AI 产生的 MD 中比较常见
    singleCharTableHead: boolean; // 将表格 Header 行格式化为 a | b | c... 这样的单字符，因为大部分 Table 是不显示 Header 行
}

//====================== 总配置 ======================//

export interface FormatterConfig {
    textCorrection: TextCorrectionConfig;
    blockIndent: BlockIndentConfig;
    lineSpacing: LineSpacingConfig;
    wordSpacing: WordSpacingConfig;
    list: ListConfig;
    table: TableConfig;
    inline: InlineConfig;
    other: OtherConfig;
}

export const k_defaultFormatterConfig: FormatterConfig = {
    /* 文本规范化：预处理与基础正则替换 */
    textCorrection: {
        replacements: [],
    },

    /* 块缩进处理 */
    blockIndent: {
        parseIndentAsCodeBlock: true,
        unorderedListIndent: 2,
        orderedListIndent: 4,
    },

    /* 行间距处理 */
    lineSpacing: {
        blankLinesBeforeH1: 0,
        blankLinesAfterH1: 1,
        blankLinesBeforeH2: 3,
        blankLinesAfterH2: 1,
        blankLinesBeforeH3: 1,
        blankLinesAfterH3: 1,
        blankLinesBeforeH4: 1,
        blankLinesAfterH4: 0,
    },

    /* 词间距处理 */
    wordSpacing: {
        // 注意，中英符号并不会产生词间距
        spaceBetweenChineseAndEnglish: true,
        spaceBetweenWordAndNumber: true,
        spaceBetweenInlineElements: true,
    },

    /* 列表格式化 */
    list: {
        enabled: true,
        unorderedMarker: "-",
        orderedStyle: "notSequential",
        trimTrailingChars: ["。"], // 默认移除中文句号
    },

    /* Table 格式化 */
    table: {
        // 列表默认靠左对齐，自动插入空格对齐列
        enabled: true,
        removeOuterBorders: true,
        trimTrailingChars: ["。"], // 默认移除中文句号
        maxFormatColumnWidth: 65,
    },

    /* Inline 元素格式化 */
    inline: {
        normalizeStrong: true,
        handleInlineCode: "normal",
        handleInlineMath: "normal",
        handleInlineStrong: "normal",
    },

    /* 特殊格式化需求 */
    other: {
        removeHeaderNumber: true,
        singleCharTableHead: false,
    },
};
