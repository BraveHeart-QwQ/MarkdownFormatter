import type { List, ListItem, Paragraph, Root, Text } from "mdast";
import type { FormatterConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";
import { visit } from "unist-util-visit";
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
            const nestedList: List = { type: "list", ordered: list.ordered, spread: false, start: list.ordered ? 1 : null, children: nestedItems };
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
 * 将列表项中"被解析器合并为单段但实际含有缩进续行"的段落拆分为多个段落。
 *
 * 例如输入 `- item\n    indent content`，解析器会生成单个段落 "item\nindent content"，
 * 但因续行列相对段落起始列有额外缩进，说明原文意图是两段，此处据此拆开。
 */
export function splitIndentedContinuations(tree: Root): void {
    visit(tree, "listItem", (listItem: ListItem) => {
        const newChildren: ListItem["children"] = [];
        let modified = false;

        for (const child of listItem.children) {
            if (child.type !== "paragraph") { newChildren.push(child); continue; }

            const para = child as Paragraph;
            if (para.children.length !== 1 || para.children[0].type !== "text") {
                newChildren.push(para); continue;
            }

            const textNode = para.children[0] as Text;
            if (!textNode.value.includes("\n")) { newChildren.push(para); continue; }

            const paraStartCol = para.position?.start?.column;
            const textEndCol = textNode.position?.end?.column;
            if (paraStartCol === undefined || textEndCol === undefined) {
                newChildren.push(para); continue;
            }

            // 用末行长度反推续行起始列
            const lastNl = textNode.value.lastIndexOf("\n");
            const lastPart = textNode.value.substring(lastNl + 1);
            const contCol = textEndCol - lastPart.length;

            if (contCol < (listItem.position?.start?.column ?? 1) + 2) { newChildren.push(para); continue; }

            // 按 \n 拆成多个段落
            for (const part of textNode.value.split("\n")) {
                newChildren.push({
                    type: "paragraph",
                    children: [{ type: "text", value: part } as Text],
                } as Paragraph);
            }
            modified = true;
        }

        if (modified) {
            listItem.children = newChildren;
            listItem.spread = true;
        } else if (!listItem.spread && listItem.children.length > 1 &&
            listItem.children.every(c => c.type === "paragraph")
        ) {
            listItem.spread = true;
        }
    });
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
