import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { fmt } from "../helpers.js";

/** 关闭 wordSpacing，只测 inline 行为 */
function makeConfig(overrides: Partial<FormatterConfig["inline"]>): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        wordSpacing: {
            spaceBetweenChineseAndEnglish: false,
            spaceBetweenChineseAndNumber: false,
            spaceBetweenWordAndInlineCode: false,
            spaceBetweenWordAndInlineEquation: false,
            spaceBetweenInlineElements: false,
        },
        inline: { ...k_defaultFormatterConfig.inline, ...overrides },
    };
}

/** 为 mark+词间距组合测试使用的配置（仅开启指定的 wordSpacing 选项）*/
function makeMarkSpacingConfig(wordSpacingOverrides: Partial<FormatterConfig["wordSpacing"]>): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        wordSpacing: {
            spaceBetweenChineseAndEnglish: false,
            spaceBetweenChineseAndNumber: false,
            spaceBetweenWordAndInlineCode: false,
            spaceBetweenWordAndInlineEquation: false,
            spaceBetweenInlineElements: false,
            ...wordSpacingOverrides,
        },
    };
}

export function inlineSuite(): void {
    describe("inline", () => {

        // ── 基础行为：去除 inline 元素首尾空格（写死）───────────────────────

        it("不去除 inlineCode 内首尾空格", async () => {
            const cfg = makeConfig({});
            expect(await fmt("使用`  code  `示例", cfg)).toBe("使用`  code  `示例");
        });

        it("去除 inlineMath 内首尾空格", async () => {
            const cfg = makeConfig({});
            expect(await fmt("设$ x^2 $为例", cfg)).toBe("设$x^2$为例");
        });

        // ── normalizeStrong ────────────────────────────────────────────────

        it("__ 将保留原文", async () => {
            const cfg = makeConfig({});
            expect(await fmt("this is __important__ text", cfg)).toBe("this is __important__ text");
        });

        it("_ 将保留原文", async () => {
            const cfg = makeConfig({});
            expect(await fmt("this is _emphasis_ text", cfg)).toBe("this is _emphasis_ text");
        });

        // ── handleInlineCode = 'removeAll' ────────────────────────────────

        it("removeAll 移除行内代码标记，保留内容", async () => {
            const cfg = makeConfig({ handleInlineCode: "removeAll" });
            expect(await fmt("使用`code`示例", cfg)).toBe("使用code示例");
        });

        it("removeAll 同段多个行内代码均被移除", async () => {
            const cfg = makeConfig({ handleInlineCode: "removeAll" });
            expect(await fmt("`foo` 和 `bar`", cfg)).toBe("foo 和 bar");
        });

        // ── handleInlineCode = 'allEnglishWord' ───────────────────────────

        it("allEnglishWord 将 Text 节点中的英文单词包裹为行内代码", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("使用 hello 示例", cfg)).toBe("使用 `hello` 示例");
        });

        it("allEnglishWord 在标题中生效", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("## 使用 hello 示例", cfg)).toBe("## 使用 `hello` 示例");
        });

        it("removeAll 在标题中生效", async () => {
            const cfg = makeConfig({ handleInlineCode: "removeAll" });
            expect(await fmt("## 使用`code`示例", cfg)).toBe("## 使用code示例");
        });

        it("allEnglishWord 在表格单元格中生效", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            const input = [
                "| 列 |",
                "| --- |",
                "| 使用 hello 示例 |",
            ].join("\n");
            const result = await fmt(input, cfg);
            expect(result).toContain("`hello`");
        });

        it("removeAll 在表格单元格中生效", async () => {
            const cfg = makeConfig({ handleInlineCode: "removeAll" });
            const input = [
                "| 列 |",
                "| --- |",
                "| 使用`code`示例 |",
            ].join("\n");
            const result = await fmt(input, cfg);
            expect(result).toContain("使用code示例");
            expect(result).not.toContain("`code`");
        });

        it("allEnglishWord 多个英文单词分别包裹", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("foo 和 bar", cfg)).toBe("`foo` 和 `bar`");
        });

        it("allEnglishWord 识别包含英文符号（如 %）", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("折扣 %rate% 可用", cfg)).toBe("折扣 `%rate%` 可用");
        });

        it("allEnglishWord 识别不同英文符号边界（C++ 与 #tag）", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("使用 C++ 与 #tag", cfg)).toBe("使用 `C++` 与 `#tag`");
        });

        it("allEnglishWord 纯符号片段也包裹", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("仅符号 %%% 应变化", cfg)).toBe("仅符号 `%%%` 应变化");
        });

        it("allEnglishWord 已有 inlineCode 节点不重复包裹", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("使用`code`示例", cfg)).toBe("使用`code`示例");
        });

        it("handleInlineCode allEnglishWord 复杂情况", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("测试  a +  b 的变化", cfg)).toBe("测试 `a +  b` 的变化");
        });

        it("handleInlineCode normal 不自动包裹英文符号组合", async () => {
            const cfg = makeConfig({ handleInlineCode: "normal" });
            expect(await fmt("折扣 %rate% 可用", cfg)).toBe("折扣 %rate% 可用");
        });

        it("handleInlineCode removeAll 保留带符号内容", async () => {
            const cfg = makeConfig({ handleInlineCode: "removeAll" });
            expect(await fmt("保留`%rate%`内容", cfg)).toBe("保留%rate%内容");
        });

        it("handleInlineCode allEnglishWord 纯符号片段包裹", async () => {
            const cfg = makeConfig({ handleInlineCode: "allEnglishWord" });
            expect(await fmt("- %_co-de_% 应变化", cfg)).toBe("- `%_co-de_%` 应变化");
        });

        // ── handleInlineStrong = 'removeAll' ──────────────────────────────

        it("handleInlineStrong removeAll 移除加粗标记，保留内容", async () => {
            const cfg = makeConfig({ handleInlineStrong: "removeAll" });
            expect(await fmt("这是**重点**内容", cfg)).toBe("这是重点内容");
        });

        it("handleInlineStrong removeAll 保留 strong 内部子节点", async () => {
            // strong 内部有 inlineCode 子节点
            const cfg = makeConfig({ handleInlineStrong: "removeAll" });
            expect(await fmt("**`code`**", cfg)).toBe("`code`");
        });

        // ── handleInlineStrong = 'allEnglishWord' ─────────────────────────

        it("handleInlineStrong allEnglishWord 将英文单词加粗", async () => {
            const cfg = makeConfig({ handleInlineStrong: "allEnglishWord" });
            expect(await fmt("使用 hello 示例", cfg)).toBe("使用 **hello** 示例");
        });

        it("handleInlineStrong allEnglishWord 在标题中生效", async () => {
            const cfg = makeConfig({ handleInlineStrong: "allEnglishWord" });
            expect(await fmt("## 使用 hello 示例", cfg)).toBe("## 使用 **hello** 示例");
        });

        it("handleInlineStrong allEnglishWord 识别包含英文符号（如 %）", async () => {
            const cfg = makeConfig({ handleInlineStrong: "allEnglishWord" });
            expect(await fmt("折扣 %rate% 可用", cfg)).toBe("折扣 **%rate%** 可用");
        });

        it("handleInlineStrong allEnglishWord 识别不同英文符号边界（C++ 与 #tag）", async () => {
            const cfg = makeConfig({ handleInlineStrong: "allEnglishWord" });
            expect(await fmt("使用 C++ 与 #tag", cfg)).toBe("使用 **C++** 与 **#tag**");
        });

        it("handleInlineStrong allEnglishWord 纯符号片段包裹", async () => {
            const cfg = makeConfig({ handleInlineStrong: "allEnglishWord" });
            expect(await fmt("- %_co-de_% 应变化", cfg)).toBe("- **%_co-de_%** 应变化");
        });

        it("handleInlineStrong allEnglishWord 复杂情况", async () => {
            const cfg = makeConfig({ handleInlineStrong: "allEnglishWord" });
            expect(await fmt("测试  a  + b \n的变化", cfg)).toBe("测试 **a  + b**\n的变化");
        });

        it("handleInlineStrong normal 不自动包裹英文符号组合", async () => {
            const cfg = makeConfig({ handleInlineStrong: "normal" });
            expect(await fmt("折扣 %rate% 可用", cfg)).toBe("折扣 %rate% 可用");
        });

        it("handleInlineStrong removeAll 保留带符号内容", async () => {
            const cfg = makeConfig({ handleInlineStrong: "removeAll" });
            expect(await fmt("这是**rate%off**内容", cfg)).toBe("这是rate%off内容");
        });

        // ── handleInlineMath = 'removeAll' ────────────────────────────────

        it("handleInlineMath removeAll 移除行内公式标记，保留内容", async () => {
            const cfg = makeConfig({ handleInlineMath: "removeAll" });
            expect(await fmt("设$x^2$为例", cfg)).toBe("设x^2为例");
        });

        it("handleInlineMath removeAll 在表格单元格中生效", async () => {
            const cfg = makeConfig({ handleInlineMath: "removeAll" });
            const input = [
                "| 列 |",
                "| --- |",
                "| 设$x^2$为例 |",
            ].join("\n");
            const result = await fmt(input, cfg);
            expect(result).toContain("设x^2为例");
            expect(result).not.toContain("$x^2$");
        });

        // ── handleInlineMath = 'allEnglishWord' ───────────────────────────

        it("handleInlineMath allEnglishWord 将英文单词包裹为行内公式", async () => {
            const cfg = makeConfig({ handleInlineMath: "allEnglishWord" });
            // + 是符号不是英文字母，alpha 和 beta 分别包裹为独立公式
            expect(await fmt("设   alpha +  beta  为例", cfg)).toBe("设 $alpha +  beta$ 为例");
        });

        it("handleInlineMath allEnglishWord 识别包含英文符号（如 %）", async () => {
            const cfg = makeConfig({ handleInlineMath: "allEnglishWord" });
            expect(await fmt("折扣 %rate% 可用", cfg)).toBe("折扣 $%rate%$ 可用");
        });

        it("handleInlineMath allEnglishWord 识别不同英文符号边界（C++ 与 #tag）", async () => {
            const cfg = makeConfig({ handleInlineMath: "allEnglishWord" });
            expect(await fmt("使用 C++ 与 #tag", cfg)).toBe("使用 $C++$ 与 $#tag$");
        });

        it("handleInlineMath allEnglishWord 纯符号片段不包裹", async () => {
            const cfg = makeConfig({ handleInlineMath: "allEnglishWord" });
            expect(await fmt("仅符号 %%% 不应变化", cfg)).toBe("仅符号 $%%%$ 不应变化");
        });

        it("handleInlineMath normal 不自动包裹英文符号组合", async () => {
            const cfg = makeConfig({ handleInlineMath: "normal" });
            expect(await fmt("折扣 %rate% 可用", cfg)).toBe("折扣 %rate% 可用");
        });

        it("handleInlineMath removeAll 保留带符号内容", async () => {
            const cfg = makeConfig({ handleInlineMath: "removeAll" });
            expect(await fmt("保留$%rate%$内容", cfg)).toBe("保留%rate%内容");
        });

        it("handleInlineMath allEnglishWord 纯符号片段包裹", async () => {
            const cfg = makeConfig({ handleInlineMath: "allEnglishWord" });
            expect(await fmt("- %_co-de_% 应变化", cfg)).toBe("- $%_co-de_%$ 应变化");
        });

        // ── mark（== ==）────────────────────────────────────────────────

        it("mark 基础：原样保留 ==text==", async () => {
            const cfg = makeConfig({});
            expect(await fmt("这是==高亮==内容", cfg)).toBe("这是==高亮==内容");
        });

        it("mark 基础：英文 mark 原样保留", async () => {
            const cfg = makeConfig({});
            expect(await fmt("this is ==important== text", cfg)).toBe("this is ==important== text");
        });

        it("mark spaceBetweenInlineElements：mark 英文与中文边界补充空格", async () => {
            const cfg = makeMarkSpacingConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndEnglish: true });
            expect(await fmt("这是==important==内容", cfg)).toBe("这是 ==important== 内容");
        });

        it("mark spaceBetweenInlineElements：mark 内容两侧均为中文时不补充空格", async () => {
            const cfg = makeMarkSpacingConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndEnglish: true });
            expect(await fmt("这是==高亮==内容", cfg)).toBe("这是==高亮==内容");
        });

        it("mark spaceBetweenInlineElements：mark 数字与中文边界补充空格", async () => {
            const cfg = makeMarkSpacingConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndNumber: true });
            expect(await fmt("共==100==个", cfg)).toBe("共 ==100== 个");
        });

        it("mark spaceBetweenInlineElements：关闭时 mark 左右不插入空格", async () => {
            const cfg = makeMarkSpacingConfig({ spaceBetweenInlineElements: false });
            expect(await fmt("这是==important==内容", cfg)).toBe("这是==important==内容");
        });

        it("mark 段落中多个 mark 节点均处理", async () => {
            const cfg = makeMarkSpacingConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndEnglish: true });
            expect(await fmt("==A==与==B==对比", cfg)).toBe("==A== 与 ==B== 对比");
        });

        // ── removeLinks ────────────────────────────────────────────────────

        it("removeLinks 移除链接标记，保留显示文本", async () => {
            const cfg = makeConfig({ removeLinks: true });
            expect(await fmt("[点击这里](https://example.com)", cfg)).toBe("点击这里");
        });

        it("removeLinks 保留链接内部行内格式", async () => {
            const cfg = makeConfig({ removeLinks: true });
            expect(await fmt("[**重点**内容](https://example.com)", cfg)).toBe("**重点**内容");
        });

        it("removeLinks 段落中多个链接均被移除", async () => {
            const cfg = makeConfig({ removeLinks: true });
            expect(await fmt("参见[文档](https://a.com)和[示例](https://b.com)", cfg)).toBe("参见文档和示例");
        });

        it("removeLinks false 时保留链接", async () => {
            const cfg = makeConfig({ removeLinks: false });
            expect(await fmt("[点击这里](https://example.com)", cfg)).toBe("[点击这里](https://example.com)");
        });

        it("removeLinks 标题中的链接被移除", async () => {
            const cfg = makeConfig({ removeLinks: true });
            expect(await fmt("## 参见[文档](https://example.com)", cfg)).toBe("## 参见文档");
        });

        it("removeLinks 表格单元格中的链接被移除", async () => {
            const cfg = makeConfig({ removeLinks: true });
            const input = [
                "| 链接 |",
                "| --- |",
                "| [示例](https://example.com) |",
            ].join("\n");
            const result = await fmt(input, cfg);
            expect(result).toContain("示例");
            expect(result).not.toContain("https://example.com");
        });

        // ── capitalizeWords ────────────────────────────────────────────────

        it("capitalizeWords 将普通段落中的英文单词首字母大写", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            expect(await fmt("hello world", cfg)).toBe("Hello World");
        });

        it("capitalizeWords 已大写的单词保持不变", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            expect(await fmt("Hello World", cfg)).toBe("Hello World");
        });

        it("capitalizeWords 混合中英文", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            expect(await fmt("使用 hello 示例", cfg)).toBe("使用 Hello 示例");
        });

        it("capitalizeWords 多个英文单词均大写首字母", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            expect(await fmt("the quick brown fox", cfg)).toBe("The Quick Brown Fox");
        });

        it("capitalizeWords 在标题中生效", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            expect(await fmt("## hello world", cfg)).toBe("## Hello World");
        });

        it("capitalizeWords 在表格单元格中生效", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            const input = [
                "| col |",
                "| --- |",
                "| hello world |",
            ].join("\n");
            const result = await fmt(input, cfg);
            expect(result).toContain("Hello World");
        });

        it("capitalizeWords 不影响 inlineCode 内容", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            expect(await fmt("使用`hello`示例", cfg)).toBe("使用`hello`示例");
        });

        it("capitalizeWords 不影响 inlineMath 内容", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            expect(await fmt("设$alpha$为例", cfg)).toBe("设$alpha$为例");
        });

        it("capitalizeWords 不影响 strong 内的子文本", async () => {
            const cfg = makeConfig({ capitalizeWords: true });
            expect(await fmt("这是**important**内容", cfg)).toBe("这是**important**内容");
        });

        it("capitalizeWords false 时不大写", async () => {
            const cfg = makeConfig({ capitalizeWords: false });
            expect(await fmt("hello World", cfg)).toBe("hello World");
        });

    });
}
