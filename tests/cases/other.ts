import { describe, it } from "vitest";

export function otherSuite(): void {
    describe("other", () => {
        it.todo("removeHeaderNumber 移除标题中的数字序号（如 '1.'、'一、'）");
        it.todo("singleCharTableHead 将表格 Header 行格式化为单字符（a | b | c...）");
    });
}
