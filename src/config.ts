//===----------------------------------------------------------------------===//
//
// @desc    : 格式化配置文件
//
//===----------------------------------------------------------------------===//

// Formatter 需求：
// - [x] 文本矫正（文本基础正则替换）
// - [x] 块缩进处理（普通缩进当作代码块处理，其他时候无序列表块缩进为 2，有序列表块缩进为 4）
// - [x] 列表规范化：`- xxx`、`1. xxx`
// - [x] 行间距（特别是标题）
// - [x] 列表、Table 的行结尾去除 `。` 号
// - [x] 词间距
// - [x] inline 格式化与去格式化（code、math、strong）
// - [x] 特殊：标题不含序号
// - [x] 特殊：Table 格式化（对齐、宽度有限、标题行、消除左右两端竖边）
// - [x] 特殊：支持添加固定结尾

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
    spaceBetweenChineseAndNumber: boolean; // 是否在中文和数字之间添加空格
    spaceBetweenWordAndInlineCode: boolean; // 是否在中英文和行内代码之间添加空格
    spaceBetweenWordAndInlineEquation: boolean; // 是否在中英文和行内公式之间添加空格
    spaceBetweenInlineElements: boolean; // 产生空格的规则，是否适用于其他行内元素（如加粗、斜体、Mark）。若为 true，则其产生空格的方式，类似于没有该标记时产生空格的结果（空格添加在 inline 标记外）
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

/* Inline 元素格式化（辅助工具） */
export interface InlineConfig {
    // 该格式化应在 wordSpacing 之前执行
    // 基本格式化（写死）：去除 inline 内的首尾空格
    handleInlineCode: "normal" | "allEnglishWord" | "removeAll"; // 正常处理 | 所有相邻英文（包括英文符号）都格式化为 inline code | 移除所有 inline code
    handleInlineMath: "normal" | "allEnglishWord" | "removeAll"; // 正常处理 | 所有相邻英文（包括英文符号）都格式化为 inline math | 移除所有 inline math
    handleInlineStrong: "normal" | "allEnglishWord" | "removeAll"; // 正常处理 | 所有相邻英文（包括英文符号）单词都格式化为 inline strong | 移除所有 inline strong
}

/* 特殊格式化需求 */
export interface OtherConfig {
    removeHeaderNumber: boolean; // 移除标题中的序号（如 `1.`、`2.3`、`一、`），这在 AI 产生的 MD 中比较常见
    singleCharTableHead: boolean; // 将表格 Header 行格式化为 a | b | c... 这样的单字符，因为大部分 Table 是不显示 Header 行
    trimTrailingWhitespace: boolean; // 删除每行行尾的多余空格
    enableCustomEnding: boolean, // 是否启用添加固定结尾，默认为 true，但如果某些 profile 不想开启这个，可以主动设为 false（例如格式化选择内容）
    spacingLineBeforeCustomEnding: number; // 在 customEnding 之前添加的空行数
    customEnding: string | null; // 在文档末尾添加一个固定的结尾（如 `---End---`），如果不需要则设为 null
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

/**
 * 校验一个 PartialConfig 对象是否合法。
 * 以 k_defaultFormatterConfig 为 schema 来源，检查：
 *   - 顶层是否存在未知的 section key
 *   - 每个 section 内是否存在未知的子 key
 * @returns 错误信息数组，为空则校验通过
 */
export function validatePartialConfig(obj: unknown): string[] {
    const errors: string[] = [];

    if (typeof obj !== "object" || obj === null || Array.isArray(obj)) {
        return ["Config root must be a JSON object."];
    }

    const validSections = new Set(Object.keys(k_defaultFormatterConfig));

    for (const section of Object.keys(obj as Record<string, unknown>)) {
        if (!validSections.has(section)) {
            errors.push(`Unknown config section "${section}".`);
            continue;
        }

        const sectionVal = (obj as Record<string, unknown>)[section];
        if (typeof sectionVal !== "object" || sectionVal === null || Array.isArray(sectionVal)) {
            errors.push(`Config section "${section}" must be an object.`);
            continue;
        }

        const validKeys = new Set(
            Object.keys(k_defaultFormatterConfig[section as keyof FormatterConfig] as object),
        );
        for (const key of Object.keys(sectionVal as Record<string, unknown>)) {
            if (!validKeys.has(key)) {
                errors.push(`Unknown key "${key}" in config section "${section}".`);
            }
        }
    }

    return errors;
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
        spaceBetweenChineseAndNumber: true,
        spaceBetweenWordAndInlineCode: true,
        spaceBetweenWordAndInlineEquation: true,
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
        maxFormatColumnWidth: 80,
    },

    /* Inline 元素格式化 */
    inline: {
        handleInlineCode: "normal",
        handleInlineMath: "normal",
        handleInlineStrong: "normal",
    },

    /* 特殊格式化需求 */
    other: {
        removeHeaderNumber: true,
        singleCharTableHead: false,
        trimTrailingWhitespace: true,
        enableCustomEnding: true,
        spacingLineBeforeCustomEnding: 1,
        customEnding: null,
    },
};
