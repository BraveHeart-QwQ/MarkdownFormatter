import { describe, expect, it } from "vitest";
import {
    collectHeadingLevelEdits,
    shiftHeadingLevels,
    type OffsetRange,
} from "../../src/headingLevel.js";

export function headingLevelSuite(): void {
    describe("headingLevel", () => {
        it("批量缩进 ATX 标题，并保持 H6 不变", () => {
            const input = "# H1\n\n## H2\n\n###### H6";
            expect(shiftHeadingLevels(input, 1)).toBe("## H1\n\n### H2\n\n###### H6");
        });

        it("批量反缩进 ATX 标题，并保持 H1 不变", () => {
            const input = "# H1\n\n## H2\n\n###### H6";
            expect(shiftHeadingLevels(input, -1)).toBe("# H1\n\n# H2\n\n##### H6");
        });

        it("只替换 ATX marker，保留缩进、closing marker、inline 和 CRLF", () => {
            const input = "  ## **Title** ##  \r\n> ### `Quoted`\r\n";
            expect(shiftHeadingLevels(input, 1)).toBe("  ### **Title** ##  \r\n> #### `Quoted`\r\n");
        });

        it("支持列表内的标题", () => {
            const input = "- item\n\n  ### Nested\n";
            expect(shiftHeadingLevels(input, -1)).toBe("- item\n\n  ## Nested\n");
        });

        it("忽略代码块、转义井号、普通文本和 H7", () => {
            const input = [
                "```md",
                "# fake",
                "```",
                "\\# escaped",
                "text # inline",
                "####### not-a-heading",
                "# real",
            ].join("\n");

            expect(shiftHeadingLevels(input, 1)).toBe([
                "```md",
                "# fake",
                "```",
                "\\# escaped",
                "text # inline",
                "####### not-a-heading",
                "## real",
            ].join("\n"));
        });

        it("只调整与指定范围相交的标题", () => {
            const input = "# First\n\n## Second\n\n### Third";
            const secondStart = input.indexOf("## Second");
            const ranges: OffsetRange[] = [
                { start: secondStart, end: secondStart + "## Second".length },
            ];

            expect(shiftHeadingLevels(input, 1, ranges)).toBe("# First\n\n### Second\n\n### Third");
        });

        it("重叠范围不会生成重复编辑", () => {
            const input = "# First\n## Second";
            const ranges: OffsetRange[] = [
                { start: 0, end: input.length },
                { start: 0, end: "# First".length },
            ];

            const edits = collectHeadingLevelEdits(input, 1, ranges);
            expect(edits).toHaveLength(2);
            expect(shiftHeadingLevels(input, 1, ranges)).toBe("## First\n### Second");
        });

        it("Setext H1/H2 之间切换时保留语法形式", () => {
            expect(shiftHeadingLevels("Title\n=====", 1)).toBe("Title\n-----");
            expect(shiftHeadingLevels("Title\n-----", -1)).toBe("Title\n=====");
        });

        it("Setext H2 缩进到 H3 时转换为 ATX", () => {
            expect(shiftHeadingLevels("**Title**\n-----------", 1)).toBe("### **Title**");
            expect(shiftHeadingLevels("> Quote title\n> -----------", 1)).toBe("> ### Quote title");
        });

        it("多行 Setext H2 转换为单行 ATX H3", () => {
            const input = "**First** line\nsecond `code`\n----------------";
            expect(shiftHeadingLevels(input, 1)).toBe("### **First** line second `code`");
        });

        it("拒绝越界的 offset range", () => {
            expect(() => shiftHeadingLevels("# Title", 1, [{ start: -1, end: 2 }])).toThrow(RangeError);
            expect(() => shiftHeadingLevels("# Title", 1, [{ start: 0, end: 20 }])).toThrow(RangeError);
        });
    });
}
