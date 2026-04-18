import type { List, ListItem, Paragraph, Root, Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";
import { trimTrailingChars } from "./utils.js";

type AnyNode = { type: string; children?: AnyNode[] };

function mergeChildren(node: AnyNode): void {
    if (!node.children) return;
    for (const child of node.children) mergeChildren(child);
    let i = 0;
    while (i < node.children.length - 1) {
        const a = node.children[i] as unknown as List;
        const b = node.children[i + 1] as unknown as List;
        if (a.type === "list" && !a.ordered && b.type === "list" && !b.ordered) {
            const aCol = (a as any).position?.start?.column;
            const bCol = (b as any).position?.start?.column;
            if (aCol !== undefined && bCol !== undefined && bCol > aCol) {
                // b is indented deeper - nest it under the last item of a
                const lastItem = a.children[a.children.length - 1] as unknown as AnyNode;
                if (lastItem) {
                    (lastItem.children ??= []).push(b as unknown as AnyNode);
                    node.children.splice(i + 1, 1);
                }
                else {
                    i++;
                }
            } else {
                a.children.push(...b.children);
                node.children.splice(i + 1, 1);
            }
        } else {
            i++;
        }
    }
}

export function mergeAdjacentUnorderedLists(tree: Root): void {
    mergeChildren(tree as unknown as AnyNode);
}

function nestSiblings(node: AnyNode): void {
    if (!node.children) return;
    for (const child of node.children)
        nestSiblings(child);
    if (node.type !== "list") return;

    const list = node as unknown as List;
    let i = 0;
    while (i < list.children.length - 1) {
        const current = list.children[i];
        const next = list.children[i + 1];
        const currentCol = current.position?.start?.column;
        const nextCol = next.position?.start?.column;
        if (currentCol !== undefined && nextCol !== undefined && nextCol > currentCol) {
            const nestedItems: ListItem[] = [];
            while (i + 1 < list.children.length) {
                const candidate = list.children[i + 1];
                const candidateCol = candidate.position?.start?.column;
                if (candidateCol !== undefined && candidateCol > currentCol) {
                    nestedItems.push(candidate);
                    list.children.splice(i + 1, 1);
                }
                else {
                    break;
                }
            }
            const nestedList: List = { type: "list", ordered: false, spread: false, start: null, children: nestedItems };
            (current.children as unknown as AnyNode[]).push(nestedList as unknown as AnyNode);
        }
        i++;
    }
}

export function nestIndentedListItems(tree: Root): void {
    nestSiblings(tree as unknown as AnyNode);
}

function trimListItemNode(node: ListItem, charsToTrim: string[]): void {
    // 只处理列表项的第一个段落（续行段落不受影响）
    const firstPara = node.children.find((child): child is Paragraph => child.type === "paragraph");
    if (!firstPara || firstPara.children.length === 0) return;

    // 只处理段落最后一个直接子节点为 Text 的情况（不伸入行内元素内部）
    const lastChild = firstPara.children[firstPara.children.length - 1];
    if (lastChild.type !== "text") return;

    (lastChild as Text).value = trimTrailingChars((lastChild as Text).value, charsToTrim);
}

/**
 * 根据 config.list 规范化 List / ListItem：标记符、缩进、尾部字符。
 * - 标记符和有序样式通过 remark-stringify 的 settings 控制（见 pipeline.ts）
 * - 此处处理 trimTrailingChars：去除列表项第一段末尾的指定字符
 */
export function registerListFormatting(registry: VisitorRegistry, config: FormatterConfig): void {
    if (!config.list.enabled) return;
    if (config.list.trimTrailingChars.length === 0) return;

    const charsToTrim = config.list.trimTrailingChars;
    registry.listItem.push(node => trimListItemNode(node, charsToTrim));
}
