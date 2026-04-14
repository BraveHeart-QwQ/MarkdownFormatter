import { describe, it } from "vitest";

export function listSuite(): void {
    describe("list", () => {
        it.todo("无序列表标记符统一为 unorderedMarker 配置值");
        it.todo("有序列表样式按 orderedStyle 处理（notSequential / sequential）");
        it.todo("列表项行尾去除 trimTrailingChars 中指定的字符");
        it.todo("嵌套列表缩进行（非直接列表行）不受 trimTrailingChars 影响");
    });
}
