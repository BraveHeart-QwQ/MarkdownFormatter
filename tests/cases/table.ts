import { describe, expect, it } from "vitest";
import { k_defaultFormatterConfig } from "../../src/config.js";
import type { FormatterConfig } from "../../src/config.js";
import { fmt } from "../helpers.js";

function makeConfig(overrides: Partial<FormatterConfig["table"]>): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        table: { ...k_defaultFormatterConfig.table, ...overrides },
    };
}

function makeConfigWithOther(
    tableOverrides: Partial<FormatterConfig["table"]>,
    otherOverrides: Partial<FormatterConfig["other"]>,
): FormatterConfig {
    return {
        ...k_defaultFormatterConfig,
        table: { ...k_defaultFormatterConfig.table, ...tableOverrides },
        other: { ...k_defaultFormatterConfig.other, ...otherOverrides },
    };
}

export function tableSuite(): void {
    describe("table", () => {
        it("列按最大宽度对齐（左对齐，自动补空格）", async () => {
            const input = [
                "| a | b |",
                "| --- | --- |",
                "| short | a very long cell |",
            ].join("\n");
            const result = await fmt(input, makeConfig({ removeOuterBorders: false }));
            const lines = result.split("\n");
            // 每行应有相同宽度（同一列对齐）
            expect(lines[0]).toBe("| a     | b                |");
            const maxRowLen = Math.max(lines[0].length, lines[2].length);
            expect(lines[1].length).toBe(maxRowLen);
            expect(lines[1]).toMatch(/^\|-+\|-+\|$/);
            expect(lines[2]).toBe("| short | a very long cell |");
        });

        it("removeOuterBorders 为 true 时去除左右竖线边框", async () => {
            const input = [
                "| 名称 | 值 |",
                "| --- | --- |",
                "| foo | bar |",
            ].join("\n");
            const result = await fmt(input, makeConfig({ removeOuterBorders: true }));
            const lines = result.split("\n");
            expect(lines[0]).not.toMatch(/^\|/);
            expect(lines[0]).not.toMatch(/\|$/);
            expect(lines[0]).toContain(" | ");
        });

        it("removeOuterBorders 为 false 时保留左右竖线边框", async () => {
            const input = [
                "| 名称 | 值 |",
                "| --- | --- |",
                "| foo | bar |",
            ].join("\n");
            const result = await fmt(input, makeConfig({ removeOuterBorders: false }));
            const lines = result.split("\n");
            for (const line of lines) {
                expect(line).toMatch(/^\|/);
                expect(line).toMatch(/\|$/);
            }
        });

        it("maxFormatColumnWidth 下仅对齐每行可容纳的前缀列", async () => {
            const longCell = "x".repeat(30);
            const input = [
                "| h1 | h2 | h3 |",
                "| --- | --- | --- |",
                `| a | bb | ${longCell} |`,
                "| aa | b | y |",
            ].join("\n");
            const config = makeConfig({ removeOuterBorders: false, maxFormatColumnWidth: 20 })
            const result = await fmt(input, config);
            const lines = result.split("\n");

            // 第 3 列太长时，仅前两列参与该行对齐；后续列保持原样
            expect(lines[0]).toBe("| h1  | h2  | h3  |");
            expect(lines[1].length).toBe(config.table.maxFormatColumnWidth);
            expect(lines[1]).toMatch(/^\|---\|---\|-+\|$/);
            expect(lines[2]).toBe(`| a   | bb  | ${longCell} |`);
            // 短行仍可继续对齐到第 3 列，且不被超长列拉宽
            expect(lines[3]).toBe("| aa  | b   | y   |");
        });

        it("maxFormatColumnWidth 下仅对齐每行可容纳的前缀列（二）", async () => {
            const longCell = "x".repeat(40);
            const input = [
                "| h1 | h2 | h3 |",
                "| --- | --- | --- |",
                `| a | bb | ${longCell} |`,
                "| aa | b | y |",
            ].join("\n");
            const config = makeConfig({ removeOuterBorders: true, maxFormatColumnWidth: 20 })
            const result = await fmt(input, config);
            const lines = result.split("\n");

            // 第 3 列太长时，仅前两列参与该行对齐；后续列保持原样
            expect(lines[0]).toBe("h1  | h2  | h3");
            expect(lines[1].length).toBe(config.table.maxFormatColumnWidth);
            expect(lines[1]).toMatch(`----|-----|---------`);
            expect(lines[2]).toBe(`a   | bb  | ${longCell}`);
            // 短行仍可继续对齐到第 3 列，且不被超长列拉宽
            expect(lines[3]).toBe("aa  | b   | y");
        });

        it("最小单元格宽度应为 4（一）", async () => {
            const input = [
                "a|b|c|d",
                "-|-|-|-",
                "x|y|z|w",
            ].join("\n");
            const result = await fmt(input, makeConfig({ removeOuterBorders: true, trimTrailingChars: ["。"] }));
            const lines = result.split("\n");
            expect(lines[0]).toContain("a   | b   | c   | d");
            expect(lines[1]).toContain("----|-----|-----|--");
            expect(lines[2]).toContain("x   | y   | z   | w");
        });


        it("trimTrailingChars 去除单元格行尾字符", async () => {
            const input = [
                "| 描述 | 说明 |",
                "| --- | --- |",
                "| 第一项。 | 内容。 |",
                "| 第二项。 | 详情。 |",
            ].join("\n");
            const result = await fmt(input, makeConfig({ trimTrailingChars: ["。"] }));
            expect(result).not.toContain("第一项。");
            expect(result).not.toContain("内容。");
            expect(result).toContain("第一项");
            expect(result).toContain("内容");
        });

        it("table.enabled 为 false 时 removeOuterBorders 配置不生效", async () => {
            // enabled: false 时不注册我们的 handler，而是使用 remark-gfm 默认行为
            // remark-gfm 默认保留外边框，所以即使配置 removeOuterBorders: true 也不生效
            const input = [
                "| a | b |",
                "| --- | --- |",
                "| x | y |",
            ].join("\n");
            const result = await fmt(input, makeConfig({ enabled: false, removeOuterBorders: true }));
            // 默认 remark-gfm 输出带外边框
            expect(result.split("\n")[0]).toMatch(/^\|/);
        });

        it("singleCharTableHead 将表头格式化为单字符", async () => {
            const input = [
                "| 算法名称 | 准确率 | 训练速度 |",
                "| --- | --- | --- |",
                "| 线性回归 | 中等 | 快速 |",
            ].join("\n");
            const result = await fmt(
                input,
                makeConfigWithOther({}, { singleCharTableHead: true }),
            );
            const lines = result.split("\n");
            // 表头行应包含单字符 a, b, c
            expect(lines[0]).toContain("a");
            expect(lines[0]).toContain("b");
            expect(lines[0]).toContain("c");
            expect(lines[0]).not.toContain("算法名称");
        });

        it("CJK 字符宽度按 2 计算，列宽正确对齐", async () => {
            const input = [
                "| 算法 | accuracy |",
                "| --- | --- |",
                "| ab | 中文内容 |",
            ].join("\n");
            const result = await fmt(input, makeConfig({ removeOuterBorders: false }));
            const lines = result.split("\n");
            // "算法" 显示宽 4，"ab" 显示宽 2，第一列宽应为 4（等于"算法"宽）
            // "accuracy" 显示宽 8，"中文内容" 显示宽 8，第二列宽应为 8
            expect(lines[0]).toBe("| 算法 | accuracy |");
            const maxRowLen = Math.max(lines[0].length, lines[2].length);
            expect(lines[1].length).toBeGreaterThanOrEqual(maxRowLen);
            expect(lines[1]).toMatch(/^\|-+\|-+\|$/);
            expect(lines[2]).toBe("| ab   | 中文内容 |");
        });

        it("分隔行按列对齐宽度生成正确长度的 ---", async () => {
            const input = [
                "| short | a very long cell |",
                "| --- | --- |",
                "| x | y |",
            ].join("\n");
            const result = await fmt(input, makeConfig({ removeOuterBorders: false }));
            const lines = result.split("\n");
            // 分隔行中 "---..." 长度应匹配 colWidths
            expect(lines[1]).toMatch(/^\|-+\|-+\|$/);
        });

        it("Table Spacing Line 测试", async () => {
            const input = [
                "[table: title=\"标题\"]",
                "a | b",
                "--- | ---",
                "x | y",
            ].join("\n");
            const result = await fmt(input, makeConfig({ removeOuterBorders: false }));
            const lines = result.split("\n");
            expect(lines.length).toBe(4); // no extra blank line before table
        });
    });
}
