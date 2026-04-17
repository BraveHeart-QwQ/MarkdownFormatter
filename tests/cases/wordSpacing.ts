import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { fmt } from "../helpers.js";

/** 全部关闭的基础配置 */
const off: FormatterConfig["wordSpacing"] = {
    spaceBetweenChineseAndEnglish: false,
    spaceBetweenChineseAndNumber: false,
    spaceBetweenWordAndInlineCode: false,
    spaceBetweenWordAndInlineEquation: false,
    spaceBetweenInlineElements: false,
};

function makeConfig(overrides: Partial<FormatterConfig["wordSpacing"]>): FormatterConfig {
    return { ...k_defaultFormatterConfig, wordSpacing: { ...off, ...overrides } };
}

export function wordSpacingSuite(): void {
    describe("wordSpacing", () => {

        // ── spaceBetweenChineseAndEnglish ────────────────────────────────────

        it("中文后接英文时插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndEnglish: true });
            expect(await fmt("你好world", cfg)).toBe("你好 world");
        });

        it("英文后接中文时插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndEnglish: true });
            expect(await fmt("hello世界", cfg)).toBe("hello 世界");
        });

        it("中英文混排时所有边界均插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndEnglish: true });
            expect(await fmt("中文mixed中文", cfg)).toBe("中文 mixed 中文");
        });

        it("已有空格时不重复插入", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndEnglish: true });
            expect(await fmt("中文 world", cfg)).toBe("中文 world");
        });

        it("关闭时中英文之间不插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndEnglish: false });
            expect(await fmt("你好world", cfg)).toBe("你好world");
        });

        // ── spaceBetweenChineseAndNumber ─────────────────────────────────────

        it("中文后接数字时插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndNumber: true });
            expect(await fmt("共100个", cfg)).toBe("共 100 个");
        });

        it("数字后接中文时插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndNumber: true });
            expect(await fmt("第2章", cfg)).toBe("第 2 章");
        });

        it("关闭时中文与数字之间不插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndNumber: false });
            expect(await fmt("共100个", cfg)).toBe("共100个");
        });

        // ── 标点符号不产生词间距 ──────────────────────────────────────────────

        it("中文标点后接英文字母不插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndEnglish: true });
            // ，（U+FF0C）不在 CJK 汉字范围内，不触发词间距
            expect(await fmt("你好，world", cfg)).toBe("你好，world");
        });

        it("中文标点后接数字不插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndNumber: true });
            // 「：」(U+FF1A) 不在 CJK 汉字范围内，不触发词间距；但「个」是汉字，会与前面的数字产生间距
            expect(await fmt("共有：100", cfg)).toBe("共有：100");
        });

        // ── spaceBetweenWordAndInlineCode ────────────────────────────────────

        it("中文左侧紧接行内代码时补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineCode: true });
            expect(await fmt("使用`code`示例", cfg)).toBe("使用 `code` 示例");
        });

        it("英文左侧紧接行内代码时补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineCode: true });
            expect(await fmt("use`code`here", cfg)).toBe("use `code` here");
        });

        it("行内代码右侧文本已有空格时不重复", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineCode: true });
            expect(await fmt("使用 `code` 示例", cfg)).toBe("使用 `code` 示例");
        });

        it("行内代码位于段落开头时右侧词字符前补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineCode: true });
            expect(await fmt("`code`之后", cfg)).toBe("`code` 之后");
        });

        it("行内代码位于段落末尾时左侧词字符后补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineCode: true });
            expect(await fmt("之前`code`", cfg)).toBe("之前 `code`");
        });

        it("行内代码左侧为符号时不补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineCode: true });
            expect(await fmt("，`code`", cfg)).toBe("，`code`");
        });

        it("关闭时行内代码左右不插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineCode: false });
            expect(await fmt("使用`code`示例", cfg)).toBe("使用`code`示例");
        });

        // ── spaceBetweenWordAndInlineEquation ────────────────────────────────

        it("中文左侧紧接行内公式时补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineEquation: true });
            expect(await fmt("设$x^2$为例", cfg)).toBe("设 $x^2$ 为例");
        });

        it("英文左侧紧接行内公式时补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineEquation: true });
            expect(await fmt("let$x$be", cfg)).toBe("let $x$ be");
        });

        it("行内公式右侧文本已有空格时不重复", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineEquation: true });
            expect(await fmt("设 $x^2$ 为例", cfg)).toBe("设 $x^2$ 为例");
        });

        it("行内公式左侧为符号时不补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineEquation: true });
            expect(await fmt("，$x$，", cfg)).toBe("，$x$，");
        });

        it("关闭时行内公式左右不插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenWordAndInlineEquation: false });
            expect(await fmt("设$x^2$为例", cfg)).toBe("设$x^2$为例");
        });

        // ── spaceBetweenInlineElements（条件式：去掉标记后是否产生空格）───────

        it("加粗英文与中文边界补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndEnglish: true });
            expect(await fmt("这是**important**内容", cfg)).toBe("这是 **important** 内容");
        });

        it("加粗内容两侧均为中文时不补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndEnglish: true });
            expect(await fmt("这是**重点**内容", cfg)).toBe("这是**重点**内容");
        });

        it("斜体英文与中文边界补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndEnglish: true });
            expect(await fmt("这是*emphasis*内容", cfg)).toBe("这是 _emphasis_ 内容");
        });

        it("加粗数字与中文边界补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndNumber: true });
            expect(await fmt("共**100**个", cfg)).toBe("共 **100** 个");
        });

        it("spaceBetweenChineseAndEnglish 关闭时条件式不补充空格", async () => {
            const cfg = makeConfig({ spaceBetweenInlineElements: true, spaceBetweenChineseAndEnglish: false });
            expect(await fmt("这是**important**内容", cfg)).toBe("这是**important**内容");
        });

        it("关闭时行内加粗元素左右不插入空格", async () => {
            const cfg = makeConfig({ spaceBetweenInlineElements: false });
            expect(await fmt("这是**重点**内容", cfg)).toBe("这是**重点**内容");
        });

        // ── 不修改代码块内容 ─────────────────────────────────────────────────

        it("不修改围栏代码块内的中英文文本", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndEnglish: true });
            const input = "```\n你好world\n```";
            expect(await fmt(input, cfg)).toContain("你好world");
        });

        it("不修改行内代码内的文本", async () => {
            const cfg = makeConfig({ spaceBetweenChineseAndEnglish: true });
            expect(await fmt("`你好world`", cfg)).toContain("`你好world`");
        });
    });
}
