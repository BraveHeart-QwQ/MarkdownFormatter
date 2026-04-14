import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { fmt } from "../helpers.js";

function makeConfig(replacements: Array<{ pattern: string; replacement: string }>): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        textCorrection: { replacements },
    };
}

export function textCorrectionSuite(): void {
    describe("textCorrection", () => {
        // ── 基础行为 ─────────────────────────────────────────────────────────

        it("空 replacements 时不修改文本", async () => {
            const result = await fmt("Hello world", makeConfig([]));
            expect(result).toBe("Hello world");
        });

        it("简单字符串替换", async () => {
            const result = await fmt("foo bar foo", makeConfig([{ pattern: "foo", replacement: "baz" }]));
            expect(result).toBe("baz bar baz");
        });

        it("使用正则替换数字", async () => {
            const result = await fmt("第1章 第2章", makeConfig([{ pattern: "\\d+", replacement: "N" }]));
            expect(result).toBe("第N章 第N章");
        });

        it("全局替换（每次出现都替换，不只替换第一个）", async () => {
            const result = await fmt("a a a", makeConfig([{ pattern: "a", replacement: "b" }]));
            expect(result).toBe("b b b");
        });

        // ── 顺序与叠加 ───────────────────────────────────────────────────────

        it("多个替换规则按顺序应用", async () => {
            // 先把 foo → bar，再把 bar → baz，最终 foo 变 baz
            const result = await fmt("foo", makeConfig([
                { pattern: "foo", replacement: "bar" },
                { pattern: "bar", replacement: "baz" },
            ]));
            expect(result).toBe("baz");
        });

        it("后一条规则能作用于前一条规则的输出", async () => {
            // A→B，B→C：两次替换链式传递
            const result = await fmt("A", makeConfig([
                { pattern: "A", replacement: "B" },
                { pattern: "B", replacement: "C" },
            ]));
            expect(result).toBe("C");
        });

        // ── 正则能力 ─────────────────────────────────────────────────────────

        it("支持捕获组引用", async () => {
            // 将 (word) 变成 [word]
            // 注意：remark-stringify 会将 [ 转义为 \[，防止被解析成链接语法，这是正确行为
            const result = await fmt("(hello) (world)", makeConfig([
                { pattern: "\\((\\w+)\\)", replacement: "[$1]" },
            ]));
            expect(result).toBe("\\[hello] \\[world]");
        });

        it("支持 Unicode（中文字符匹配）", async () => {
            const result = await fmt("这是一段测试文字。", makeConfig([{ pattern: "。", replacement: "." }]));
            expect(result).toBe("这是一段测试文字.");
        });

        it("正则字符类：替换所有中文标点为英文标点", async () => {
            const result = await fmt("你好，世界！", makeConfig([
                { pattern: "，", replacement: "," },
                { pattern: "！", replacement: "!" },
            ]));
            expect(result).toBe("你好,世界!");
        });

        // ── 隔离性：不应修改代码块内容 ───────────────────────────────────────

        it("不修改围栏代码块内的文本", async () => {
            const input = "```\nfoo bar\n```";
            const result = await fmt(input, makeConfig([{ pattern: "foo", replacement: "baz" }]));
            expect(result).toContain("foo bar");
        });

        it("不修改行内代码内的文本", async () => {
            const input = "Use `foo` here";
            const result = await fmt(input, makeConfig([{ pattern: "foo", replacement: "baz" }]));
            expect(result).toContain("`foo`");
        });

        // ── 标题 / 列表 / 普通段落中均生效 ───────────────────────────────────

        it("替换标题中的文本", async () => {
            const result = await fmt("## foo section", makeConfig([{ pattern: "foo", replacement: "bar" }]));
            expect(result).toBe("## bar section");
        });

        it("替换无序列表项中的文本", async () => {
            const result = await fmt("- foo\n- foo again", makeConfig([{ pattern: "foo", replacement: "bar" }]));
            expect(result).toContain("bar");
            expect(result).not.toContain("foo");
        });

        it("段落中跨越多行的文本各自被替换", async () => {
            const input = "Line foo\n\nAnother foo";
            const result = await fmt(input, makeConfig([{ pattern: "foo", replacement: "bar" }]));
            expect(result).toBe("Line bar\n\nAnother bar");
        });
    });
}
