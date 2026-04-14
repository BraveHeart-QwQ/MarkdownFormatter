import { describe, it } from "vitest";

export function tableSuite(): void {
    describe("table", () => {
        it.todo("列按最大宽度对齐（左对齐，自动补空格）");
        it.todo("removeOuterBorders 为 true 时去除左右竖线边框");
        it.todo("某行格式化总宽度超过 maxFormatColumnWidth 时该行跳过列对齐");
        it.todo("trimTrailingChars 去除单元格行尾字符");
        it.todo("table.enabled 为 false 时不执行 Table 格式化");
    });
}
