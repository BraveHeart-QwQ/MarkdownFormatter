import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { fmt } from "../helpers.js";
import { format } from "../../src/pipeline.js";

function makeConfig(otherOverrides: Partial<FormatterConfig["other"]>): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        other: { ...k_defaultFormatterConfig.other, ...otherOverrides },
    };
}

export function otherSuite(): void {
    describe("other", () => {
        describe("removeHeaderNumber", () => {
            const config = makeConfig({ removeHeaderNumber: true });

            it("移除阿拉伯数字单级序号（1.）", async () => {
                expect(await fmt("# 1. 标题", config)).toBe("# 标题");
            });

            it("移除阿拉伯数字多级序号（2.3）", async () => {
                expect(await fmt("## 2.3 标题", config)).toBe("## 标题");
            });

            it("移除更深层级序号（1.2.3）", async () => {
                expect(await fmt("### 1.2.3 标题", config)).toBe("### 标题");
            });

            it("移除末尾带点的序号（1.2.）", async () => {
                expect(await fmt("## 1.2. 标题", config)).toBe("## 标题");
            });

            it("移除中文数字序号（一、）", async () => {
                expect(await fmt("# 一、标题", config)).toBe("# 标题");
            });

            it("移除中文多字序号（十三、）", async () => {
                expect(await fmt("## 十三、标题", config)).toBe("## 标题");
            });

            it("无序号的标题不受影响", async () => {
                expect(await fmt("# 普通标题", config)).toBe("# 普通标题");
            });

            it("removeHeaderNumber 为 false 时保留序号", async () => {
                const offConfig = makeConfig({ removeHeaderNumber: false });
                expect(await fmt("# 1. 标题", offConfig)).toBe("# 1. 标题");
            });
        });

        describe("singleCharTableHead", () => {
            const config = makeConfig({ singleCharTableHead: true });

            it("将表格 Header 行格式化为单字符（a | b | c...）", async () => {
                const input = [
                    "| 名称 | 描述 | 值 |",
                    "| --- | --- | --- |",
                    "| foo | bar | 1 |",
                ].join("\n");
                const result = await fmt(input, config);
                const lines = result.split("\n");
                // 表头行应含 a / b / c
                expect(lines[0]).toContain("a");
                expect(lines[0]).toContain("b");
                expect(lines[0]).toContain("c");
                // 数据行不受影响
                expect(lines[2]).toContain("foo");
            });

            it("singleCharTableHead 为 false 时保留原始表头", async () => {
                const offConfig = makeConfig({ singleCharTableHead: false });
                const input = [
                    "| 名称 | 值 |",
                    "| --- | --- |",
                    "| foo | 1 |",
                ].join("\n");
                const result = await fmt(input, offConfig);
                expect(result).toContain("名称");
            });
        });

        describe("customEnding", () => {
            it("customEnding 为 null 时不追加结尾", async () => {
                const config = makeConfig({ customEnding: null });
                const result = await format("# Hello", config);
                expect(result).toBe("# Hello");
            });

            it("追加固定结尾文本", async () => {
                const config = makeConfig({ customEnding: "---End---", spacingLineBeforeCustomEnding: 1 });
                const result = await format("# Hello", config);
                expect(result).toBe("# Hello\n---End---\n");
            });

            it("spacingLineBeforeCustomEnding 控制空行数", async () => {
                const config = makeConfig({ customEnding: "---End---", spacingLineBeforeCustomEnding: 3 });
                const result = await format("# Hello", config);
                expect(result).toBe("# Hello\n\n\n---End---\n");
            });

            it("spacingLineBeforeCustomEnding 为 0 时无空行", async () => {
                const config = makeConfig({ customEnding: "---End---", spacingLineBeforeCustomEnding: 0 });
                const result = await format("# Hello", config);
                expect(result).toBe("# Hello---End---\n");
            });

            it("文档已包含 customEnding 时不重复追加", async () => {
                const config = makeConfig({ customEnding: "---End---", spacingLineBeforeCustomEnding: 1 });
                const result = await format("# Hello\n\n---End---\n", config);
                expect(result).toBe("# Hello\n\n---End---\n");
            });

            it("已有 customEnding 但间距不同时规范化间距", async () => {
                const config = makeConfig({ customEnding: "---End---", spacingLineBeforeCustomEnding: 1 });
                const result = await format("# Hello\n\n\n\n---End---\n", config);
                expect(result).toBe("# Hello\n\n---End---\n");
            });
        });

        describe("trimTrailingWhitespace（一）", () => {
            it("保留 fenced code block 行尾空格，仅清理代码块外行尾空格", async () => {
                const config = makeConfig({
                    trimTrailingWhitespace: true,
                    enableCustomEnding: false,
                    customEnding: null,
                });
                const input = [
                    "- outside  ",
                    "",
                    "  ```ts",
                    "  const a = 1;  ",
                    "  const b = 2;  ",
                    "  ```",
                    "",
                    "tail  ",
                ].join("\n");

                const result = await format(input, config);

                expect(result).toContain("  ```ts\n  const a = 1;  \n  const b = 2;  \n  ```");
                expect(result).toContain("- outside\n\n  ```ts");
                expect(result.endsWith("tail")).toBe(true);
            });
        });

        describe("trimTrailingWhitespace（二）", () => {
            it("保留 fenced code block 行尾空格，仅清理代码块外行尾空格", async () => {
                const config = makeConfig({
                    trimTrailingWhitespace: true,
                    enableCustomEnding: false,
                    customEnding: null,
                });
                const input = [
                    "> outside  ",
                    ">",
                    "> ```ts",
                    "> const a = 1;  ",
                    "> const b = 2;  ",
                    "> ```",
                    "",
                    "tail  ",
                ].join("\n");

                const result = await format(input, config);

                expect(result).toContain("> ```ts\n> const a = 1;  \n> const b = 2;  \n> ```");
                expect(result).toContain("> outside\n>\n> ```ts");
                expect(result.endsWith("tail")).toBe(true);
            });
        });

        describe("stripInlineFromHeadings", () => {
            const config = makeConfig({ stripInlineFromHeadings: true });

            it("移除行内代码标记，保留代码文本", async () => {
                expect(await fmt("# 含有 `code` 的标题", config)).toBe("# 含有 code 的标题");
            });

            it("移除加粗标记，保留文本", async () => {
                expect(await fmt("# **加粗标题**", config)).toBe("# 加粗标题");
            });

            it("移除斜体标记，保留文本", async () => {
                expect(await fmt("# *斜体标题*", config)).toBe("# 斜体标题");
            });

            it("移除行内公式标记，保留公式文本", async () => {
                expect(await fmt("# 公式 $E=mc^2$", config)).toBe("# 公式 E=mc^2");
            });

            it("移除链接标记，保留显示文本", async () => {
                expect(await fmt("# [链接文字](https://example.com)", config)).toBe("# 链接文字");
            });

            it("同时含多种 inline 元素时全部去除并拼接", async () => {
                expect(await fmt("# **加粗** 与 `code`", config)).toBe("# 加粗 与 code");
            });

            it("纯文本标题不受影响", async () => {
                expect(await fmt("# 普通标题", config)).toBe("# 普通标题");
            });

            it("stripInlineFromHeadings 为 false 时保留 inline 标记", async () => {
                const offConfig = makeConfig({ stripInlineFromHeadings: false });
                expect(await fmt("# **加粗标题**", offConfig)).toBe("# **加粗标题**");
            });

            it("各级标题均生效", async () => {
                expect(await fmt("## **二级** 标题", config)).toBe("## 二级 标题");
                expect(await fmt("### `三级` 标题", config)).toBe("### 三级 标题");
            });
        });
    });
}
