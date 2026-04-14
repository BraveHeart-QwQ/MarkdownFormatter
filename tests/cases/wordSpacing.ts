import { describe, it } from "vitest";

export function wordSpacingSuite(): void {
    describe("wordSpacing", () => {
        it.todo("中英文之间插入空格（spaceBetweenChineseAndEnglish）");
        it.todo("中英文与数字之间插入空格（spaceBetweenWordAndNumber）");
        it.todo("行内元素（代码、数学公式）与周围文本之间插入空格（spaceBetweenInlineElements）");
        it.todo("中英文标点符号不产生词间距");
    });
}
