import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { format } from "../../src/pipeline.js";
import { fmt } from "../helpers.js";

function makeConfig(overrides: Partial<FormatterConfig["blockIndent"]>): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        blockIndent: { ...k_defaultFormatterConfig.blockIndent, ...overrides },
    };
}

export function blockIndentSuite(): void {
    describe("blockIndent", () => {
        // ── parseIndentAsCodeBlock ───────────────────────────────────────────

        it("将 4 空格缩进识别为代码块并转为 fenced code block", async () => {
            // 4 空格缩进的普通文本被 remark 解析为 code 节点
            const input = "    console.log('hello')";
            const result = await fmt(input, makeConfig({ parseIndentAsCodeBlock: true }));
            expect(result).toMatch(/^```/);
            expect(result).toContain("console.log('hello')");
            expect(result).toMatch(/```$/);
        });

        it("fenced code block 本身不受影响", async () => {
            const input = "```js\nconsole.log(1)\n```";
            const result = await fmt(input, makeConfig({ parseIndentAsCodeBlock: true }));
            expect(result).toContain("```js");
            expect(result).toContain("console.log(1)");
        });

        it("parseIndentAsCodeBlock 为 false 时，缩进代码块保持缩进格式输出", async () => {
            const input = "    code block";
            // 直接调用 format（不 trim），检查 4 空格缩进格式
            const result = await format(input, makeConfig({ parseIndentAsCodeBlock: false }));
            expect(result).not.toMatch(/^```/m);
            expect(result).toMatch(/^ {4}\S/m);
        });

        // ── unorderedListIndent ──────────────────────────────────────────────

        it("unorderedListIndent 控制无序列表紧凑列表项缩进", async () => {
            // tight list，每项只有一行，continuation 也受 size 影响
            const input = "- item1\n- item2";
            const result = await fmt(input, makeConfig({ unorderedListIndent: 2 }));
            expect(result).toBe("- item1\n- item2");
        });

        it("unorderedListIndent=4 时无序列表续行缩进为 4 空格", async () => {
            // loose list（项之间有空行）会有续行段落
            const input = "- first\n\n  paragraph\n\n- second";
            const result = await fmt(input, makeConfig({ unorderedListIndent: 4 }));
            // 续行段落应该缩进 4 空格
            expect(result).toMatch(/^ {4}\S/m);
        });

        it("unorderedListIndent=2 时无序列表续行缩进为 2 空格", async () => {
            const input = "- first\n\n  paragraph\n\n- second";
            const result = await fmt(input, makeConfig({ unorderedListIndent: 2 }));
            // 续行段落缩进 2 空格
            expect(result).toMatch(/^ {2}\S/m);
            // 不应该有 4 空格缩进
            expect(result).not.toMatch(/^ {4}\S/m);
        });

        // ── orderedListIndent ────────────────────────────────────────────────

        it("orderedListIndent 控制有序列表续行缩进", async () => {
            const input = "1. first\n\n   paragraph\n\n1. second";
            const result = await fmt(input, makeConfig({ orderedListIndent: 4 }));
            // 续行段落应缩进 4 空格
            expect(result).toMatch(/^ {4}\S/m);
        });

        it("orderedListIndent=3 时有序列表续行缩进为 3 空格", async () => {
            const input = "1. first\n\n   paragraph\n\n1. second";
            const result = await fmt(input, makeConfig({ orderedListIndent: 3 }));
            // 续行段落缩进 3 空格（'1.' + 1 = 3 最小）
            expect(result).toMatch(/^ {3}\S/m);
        });

        it("有序列表标记自身宽度超过 orderedListIndent 时取标记宽度", async () => {
            // '10.' = 3 chars, size = max(3+1, 3) = 4
            const input = Array.from({ length: 10 }, (_, i) => `${i + 1}. item${i + 1}`).join("\n");
            const result = await fmt(input, makeConfig({ orderedListIndent: 3 }));
            // 第 10 项内容行应存在
            expect(result).toContain("item10");
        });
    });
}
