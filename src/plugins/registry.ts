//===----------------------------------------------------------------------===//
//
// @desc    : VisitorRegistry — 统一 DFS 分发基础设施
//
//===----------------------------------------------------------------------===//

import type { Heading, InlineCode, List, ListItem, Paragraph, Root, Strong, Table, TableCell, TableRow, Text } from "mdast";
import { visit } from "unist-util-visit";

/** remark-math 注入 AST 的行内公式节点（mdast-util-math 的局部声明） */
export interface InlineMath { type: "inlineMath"; value: string; }

/**
 * 各 sub-transform 向此 registry 注册回调，而不是各自调用 visit()。
 * runSinglePass 在唯一一次 DFS 里按节点类型分发给所有已注册的回调。
 */
export interface VisitorRegistry {
    text: Array<(node: Text) => void>;
    heading: Array<(node: Heading) => void>;
    paragraph: Array<(node: Paragraph) => void>;
    list: Array<(node: List) => void>;
    listItem: Array<(node: ListItem) => void>;
    table: Array<(node: Table) => void>;
    tableRow: Array<(node: TableRow) => void>;
    tableCell: Array<(node: TableCell) => void>;
    inlineCode: Array<(node: InlineCode) => void>;
    inlineMath: Array<(node: InlineMath) => void>;
    strong: Array<(node: Strong) => void>;
}

export function createRegistry(): VisitorRegistry {
    return {
        text: [],
        heading: [],
        paragraph: [],
        list: [],
        listItem: [],
        table: [],
        tableRow: [],
        tableCell: [],
        inlineCode: [],
        inlineMath: [],
        strong: [],
    };
}

/**
 * 对 tree 执行唯一一次 DFS，每个节点按其类型分发给 registry 中已注册的回调。
 */
export function runSinglePass(tree: Root, registry: VisitorRegistry): void {
    visit(tree, (node) => {
        switch (node.type) {
            case "text": for (const h of registry.text) h(node as Text); break;
            case "heading": for (const h of registry.heading) h(node as Heading); break;
            case "paragraph": for (const h of registry.paragraph) h(node as Paragraph); break;
            case "list": for (const h of registry.list) h(node as List); break;
            case "listItem": for (const h of registry.listItem) h(node as ListItem); break;
            case "table": for (const h of registry.table) h(node as Table); break;
            case "tableRow": for (const h of registry.tableRow) h(node as TableRow); break;
            case "tableCell": for (const h of registry.tableCell) h(node as TableCell); break;
            case "inlineCode": for (const h of registry.inlineCode) h(node as InlineCode); break;
            case "inlineMath": for (const h of registry.inlineMath) h(node as InlineMath); break;
            case "strong": for (const h of registry.strong) h(node as Strong); break;
        }
    });
}
