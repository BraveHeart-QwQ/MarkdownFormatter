import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { fmt } from "../helpers.js";

function makeConfig(overrides: Partial<FormatterConfig["lineSpacing"]>): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        lineSpacing: { ...k_defaultFormatterConfig.lineSpacing, ...overrides },
    };
}

export function lineSpacingSuite(): void {
    describe("lineSpacing", () => {
        it("H1 前空行数符合 blankLinesBeforeH1 配置", async () => {
            // blankLinesBeforeH1=0 → 段落与 H1 之间无空行
            const result = await fmt("intro\n\n# Title", makeConfig({ blankLinesBeforeH1: 0 }));
            expect(result).toBe("intro\n# Title");
        });

        it("H1 后空行数符合 blankLinesAfterH1 配置", async () => {
            // blankLinesAfterH1=2 → H1 与正文之间 2 个空行
            const result = await fmt("# Title\n\ntext", makeConfig({ blankLinesAfterH1: 2 }));
            expect(result).toBe("# Title\n\n\ntext");
        });

        it("H2 前空行数符合 blankLinesBeforeH2 配置", async () => {
            // blankLinesBeforeH2=2 → 正文与 H2 之间 2 个空行
            const result = await fmt("text\n\n## H2", makeConfig({ blankLinesBeforeH2: 2 }));
            expect(result).toBe("text\n\n\n## H2");
        });

        it("H2 后空行数符合 blankLinesAfterH2 配置", async () => {
            // blankLinesAfterH2=1 → H2 与正文之间 1 个空行
            const result = await fmt("## H2\n\ntext", makeConfig({ blankLinesAfterH2: 1 }));
            expect(result).toBe("## H2\n\ntext");
        });

        it("H3 前后空行数符合配置", async () => {
            // blankLinesBeforeH3=1, blankLinesAfterH3=1
            const result = await fmt("text\n\n### H3\n\nmore", makeConfig({ blankLinesBeforeH3: 1, blankLinesAfterH3: 1 }));
            expect(result).toBe("text\n\n### H3\n\nmore");
        });

        it("H4 后空行数为 0 时紧贴正文", async () => {
            // blankLinesAfterH4=0 → H4 与正文之间无空行
            const result = await fmt("#### H4\n\ntext", makeConfig({ blankLinesAfterH4: 0 }));
            expect(result).toBe("#### H4\ntext");
        });

        it("相邻标题取 Before/After 较大值作为实际间隔", async () => {
            // H1 blankLinesAfter=1, H2 blankLinesBefore=3 → gap = max(1,3) = 3
            const result = await fmt(
                "# H1\n\n## H2",
                makeConfig({ blankLinesAfterH1: 1, blankLinesBeforeH2: 3 }),
            );
            expect(result).toBe("# H1\n\n\n\n## H2");
        });

        it("相邻标题 After 值大于 Before 时取 After", async () => {
            // H2 blankLinesAfter=3, H3 blankLinesBefore=1 → gap = max(3,1) = 3
            const result = await fmt(
                "## H2\n\n### H3",
                makeConfig({ blankLinesAfterH2: 3, blankLinesBeforeH3: 1 }),
            );
            expect(result).toBe("## H2\n\n\n\n### H3");
        });

        it("customSpacingRules: 匹配段落，控制前后空行数", async () => {
            const cfg = makeConfig({
                customSpacingRules: [{ pattern: "^NOTE:", blankLinesBefore: 2, blankLinesAfter: 2 }],
            });
            const result = await fmt("intro\n\nNOTE: something\n\noutro", cfg);
            expect(result).toBe("intro\n\n\nNOTE: something\n\n\noutro");
        });

        it("customSpacingRules: 不匹配段落不受影响", async () => {
            const cfg = makeConfig({
                customSpacingRules: [{ pattern: "^NOTE:", blankLinesBefore: 2, blankLinesAfter: 2 }],
            });
            const result = await fmt("intro\n\nregular text\n\noutro", cfg);
            expect(result).toBe("intro\n\nregular text\n\noutro");
        });

        it("customSpacingRules: 代码块不受影响", async () => {
            const cfg = makeConfig({
                customSpacingRules: [{ pattern: "console\\.log", blankLinesBefore: 2, blankLinesAfter: 0 }],
            });
            // code block text matches pattern but customSpacingRules only applies to paragraphs
            const result = await fmt("text\n\n```\nconsole.log(1)\n```\n\nafter", cfg);
            expect(result).toBe("text\n\n```\nconsole.log(1)\n```\n\nafter");
        });

        it("customSpacingRules: 多规则后定义的覆盖前定义的", async () => {
            const cfg = makeConfig({
                customSpacingRules: [
                    { pattern: "important", blankLinesBefore: 1, blankLinesAfter: 1 },
                    { pattern: "also important", blankLinesBefore: 3, blankLinesAfter: 3 },
                ],
            });
            // matches both rules → last rule wins: before=3, after=3
            const result = await fmt("intro\n\nThis is also important\n\noutro", cfg);
            expect(result).toBe("intro\n\n\n\nThis is also important\n\n\n\noutro");
        });

        it("customSpacingRules: 标题不受影响", async () => {
            const cfg = makeConfig({
                blankLinesBeforeH2: 3,
                customSpacingRules: [{ pattern: "^Special", blankLinesBefore: 0, blankLinesAfter: 0 }],
            });
            // Heading text matches pattern but customSpacingRules only applies to paragraphs
            const result = await fmt("text\n\n## Special Section\n\nafter", cfg);
            expect(result).toBe("text\n\n\n\n## Special Section\n\nafter");
        });

        it("customSpacingRules：复杂测试", async () => {
            const cfg = makeConfig({
                customSpacingRules: [{ pattern: ":::", blankLinesBefore: 1, blankLinesAfter: 1 }],
            });
            // Heading text matches pattern but customSpacingRules only applies to paragraphs
            const result = await fmt("Content:\n::: details DetailTitle\nDetailContent\n:::\n\n- TestList\n\n  ::: details DetailsTitle\n  DetailsContent\n  :::", cfg);
            expect(result).toBe("Content:\n::: details DetailTitle\n\nDetailContent\n\n:::\n\n- TestList\n\n  ::: details DetailsTitle\n\n  DetailsContent\n\n  :::");
        });
    });
}
