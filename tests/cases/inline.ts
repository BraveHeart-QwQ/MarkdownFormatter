import { describe, it } from "vitest";

export function inlineSuite(): void {
    describe("inline", () => {
        it.todo("去除 inline 元素首尾空格（基础行为，写死）");
        it.todo("normalizeStrong 将 __ 统一替换为 **");
        it.todo("handleInlineCode = 'removeAll' 时移除所有行内代码标记");
        it.todo("handleInlineCode = 'allEnglishWord' 时将英文单词格式化为行内代码");
        it.todo("handleInlineMath / handleInlineStrong 分别按配置处理");
    });
}
