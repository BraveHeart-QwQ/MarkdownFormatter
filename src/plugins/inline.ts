import type { InlineCode, Paragraph, PhrasingContent, Strong, Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { InlineMath, VisitorRegistry } from "./registry.js";

/** 将字符串按连续英文字母序列拆分为 {isWord, value} 片段数组。 */
function splitByEnglishWords(text: string): Array<{ isWord: boolean; value: string }> {
    const result: Array<{ isWord: boolean; value: string }> = [];
    const re = /([A-Za-z]+)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        if (match.index > lastIndex) {
            result.push({ isWord: false, value: text.slice(lastIndex, match.index) });
        }
        result.push({ isWord: true, value: match[0] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        result.push({ isWord: false, value: text.slice(lastIndex) });
    }
    return result;
}

/**
 * 在段落子节点列表中，将所有 Text 节点内的英文单词替换为指定类型的行内节点。
 * wrapWord 会被每个英文单词字符串调用，返回一个新的 PhrasingContent 节点。
 */
function wrapWordsInParagraph(
    node: Paragraph,
    wrapWord: (word: string) => PhrasingContent,
): void {
    const newChildren: PhrasingContent[] = [];
    for (const child of node.children) {
        if (child.type === "text") {
            for (const part of splitByEnglishWords((child as Text).value)) {
                if (part.isWord) {
                    newChildren.push(wrapWord(part.value));
                } else if (part.value) {
                    newChildren.push({ type: "text", value: part.value } as Text);
                }
            }
        } else {
            newChildren.push(child);
        }
    }
    node.children = newChildren as typeof node.children;
}

/**
 * 根据 config.inline 处理 InlineCode / Strong / InlineMath 节点。
 *
 * 基础行为（写死，始终执行）：
 *   - 去除 inlineCode / inlineMath 的首尾空格（value.trim()）
 *   - 去除 strong 第一 / 最后一个 Text 子节点的首尾空格
 *   - emphasis/strong 的 `_`/`*` 由原始文本定义，不强制转换
 *
 * handleInlineCode / handleInlineMath / handleInlineStrong（段落级别操作）：
 *   - 'normal'     : 仅做基础处理
 *   - 'removeAll'  : 移除所有对应行内标记（保留文本内容）
 *   - 'allEnglishWord' : 将段落 Text 节点中的英文单词包裹为对应行内节点
 *
 * 注意：段落级操作注册在 registry.paragraph，应在 wordSpacing 之前执行（见 index.ts）。
 */
export function registerInlineFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    const { handleInlineCode, handleInlineMath, handleInlineStrong } = config.inline;

    // ── 基础行为：去除首尾空格 ─────────────────────────────────────────────
    registry.inlineCode.push((node: InlineCode) => {
        node.value = node.value.trim();
    });

    registry.inlineMath.push((node: InlineMath) => {
        node.value = node.value.trim();
    });

    registry.strong.push((node: Strong) => {
        if (node.children.length === 0) return;
        const first = node.children[0];
        if (first.type === "text") (first as Text).value = (first as Text).value.trimStart();
        const last = node.children[node.children.length - 1];
        if (last.type === "text") (last as Text).value = (last as Text).value.trimEnd();
    });

    // ── handleInlineCode ────────────────────────────────────────────────────
    if (handleInlineCode === "removeAll") {
        registry.paragraph.push((node: Paragraph) => {
            node.children = (node.children as PhrasingContent[]).flatMap((child) =>
                child.type === "inlineCode"
                    ? [{ type: "text", value: (child as InlineCode).value } as Text]
                    : [child],
            ) as typeof node.children;
        });
    } else if (handleInlineCode === "allEnglishWord") {
        registry.paragraph.push((node: Paragraph) => {
            wrapWordsInParagraph(node, (word) => ({ type: "inlineCode", value: word }) as InlineCode);
        });
    }

    // ── handleInlineMath ────────────────────────────────────────────────────
    if (handleInlineMath === "removeAll") {
        registry.paragraph.push((node: Paragraph) => {
            node.children = (node.children as PhrasingContent[]).flatMap((child) =>
                child.type === "inlineMath"
                    ? [{ type: "text", value: (child as InlineMath).value } as Text]
                    : [child],
            ) as typeof node.children;
        });
    } else if (handleInlineMath === "allEnglishWord") {
        registry.paragraph.push((node: Paragraph) => {
            wrapWordsInParagraph(node, (word) => ({ type: "inlineMath", value: word }) as InlineMath);
        });
    }

    // ── handleInlineStrong ──────────────────────────────────────────────────
    if (handleInlineStrong === "removeAll") {
        registry.paragraph.push((node: Paragraph) => {
            const newChildren: PhrasingContent[] = [];
            for (const child of node.children) {
                if (child.type === "strong") {
                    newChildren.push(...((child as Strong).children as PhrasingContent[]));
                } else {
                    newChildren.push(child);
                }
            }
            node.children = newChildren as typeof node.children;
        });
    } else if (handleInlineStrong === "allEnglishWord") {
        registry.paragraph.push((node: Paragraph) => {
            wrapWordsInParagraph(node, (word) => ({
                type: "strong",
                children: [{ type: "text", value: word } as Text],
            }) as Strong);
        });
    }
}
