import type { Paragraph, Text } from "mdast";
import type { FormatterConfig, WordSpacingConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";

// CJK 字符范围（BMP）：常用汉字、扩展A区、兼容区
const CJK = '\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff';

// 词字符：CJK / 拉丁字母 / 数字（即「中英文」，不含符号）
const WORD_RE = new RegExp(`[${CJK}A-Za-z0-9]`);

const CJK_RE = new RegExp(`[${CJK}]`);

// 使用「条件式」空格策略的行内元素类型（去掉标记后是否产生空格）
const CONDITIONAL_TYPES: ReadonlySet<string> = new Set(['strong', 'emphasis', 'delete', 'mark', 'ins']);

/** 判断左右两个字符按当前规则是否应产生空格（用于条件式空格）。 */
function wouldNeedSpace(lc: string, rc: string, cfg: WordSpacingConfig): boolean {
    const lCJK = CJK_RE.test(lc), rCJK = CJK_RE.test(rc);
    const lLat = /[A-Za-z]/.test(lc), rLat = /[A-Za-z]/.test(rc);
    const lNum = /[0-9]/.test(lc), rNum = /[0-9]/.test(rc);
    if (cfg.spaceBetweenChineseAndEnglish && ((lCJK && rLat) || (lLat && rCJK))) return true;
    if (cfg.spaceBetweenChineseAndNumber && ((lCJK && rNum) || (lNum && rCJK))) return true;
    return false;
}

/** 从任意 AST 节点中递归提取第一个可见文字字符（跳过空值）。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstChar(node: any): string {
    if ('value' in node && typeof node.value === 'string') return node.value[0] ?? '';
    if (Array.isArray(node.children)) {
        for (const child of node.children) {
            const ch = firstChar(child);
            if (ch) return ch;
        }
    }
    return '';
}

/** 从任意 AST 节点中递归提取最后一个可见文字字符（跳过空值）。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function lastChar(node: any): string {
    if ('value' in node && typeof node.value === 'string') {
        const v = node.value as string;
        return v[v.length - 1] ?? '';
    }
    if (Array.isArray(node.children)) {
        for (let i = node.children.length - 1; i >= 0; i--) {
            const ch = lastChar(node.children[i]);
            if (ch) return ch;
        }
    }
    return '';
}

/**
 * 根据 config.wordSpacing 在 Text 节点中插入空格（中英文、数字、行内元素边界）。
 *
 * 行内元素边界分两种策略：
 *   1. 强制空格（inlineCode / inlineMath）：只要相邻字符是中英文或数字（即「词字符」），
 *      无论词字符种类是否相同，都强制插入空格。
 *   2. 条件空格（strong / emphasis / delete / mark 等其他行内元素）：
 *      取行内元素「边界内侧字符」与「边界外侧字符」，判断如果去掉标记后这两个字符
 *      相邻是否会按当前规则产生空格（即 spaceBetweenChineseAndEnglish /
 *      spaceBetweenChineseAndNumber 规则），若是则在标记外插入空格。
 */
export function registerWordSpacing(registry: VisitorRegistry, config: FormatterConfig): void {
    const cfg = config.wordSpacing;

    // ── Text-level spacing（在单个 Text 节点内处理中英文 / 数字边界）─────────
    if (cfg.spaceBetweenChineseAndEnglish || cfg.spaceBetweenChineseAndNumber) {
        const patterns: Array<[RegExp, string]> = [];
        if (cfg.spaceBetweenChineseAndEnglish) {
            patterns.push([new RegExp(`([${CJK}])([A-Za-z])`, 'gu'), '$1 $2']);
            patterns.push([new RegExp(`([A-Za-z])([${CJK}])`, 'gu'), '$1 $2']);
        }
        if (cfg.spaceBetweenChineseAndNumber) {
            patterns.push([new RegExp(`([${CJK}])([0-9])`, 'gu'), '$1 $2']);
            patterns.push([new RegExp(`([0-9])([${CJK}])`, 'gu'), '$1 $2']);
        }
        registry.text.push((node: Text) => {
            for (const [re, rep] of patterns) {
                node.value = node.value.replace(re, rep);
            }
        });
    }

    // ── Inline-element boundary spacing（在段落层面处理行内元素左右边距）────
    const anyInlineSpacing = cfg.spaceBetweenWordAndInlineCode
        || cfg.spaceBetweenWordAndInlineEquation
        || cfg.spaceBetweenInlineElements;
    if (!anyInlineSpacing) return;

    registry.paragraph.push((node: Paragraph) => {
        const children = node.children;
        for (let i = 0; i + 1 < children.length; i++) {
            const left = children[i];
            const right = children[i + 1];

            // ── 强制空格：inlineCode ──────────────────────────────────────────
            if (cfg.spaceBetweenWordAndInlineCode) {
                if (left.type === 'text' && right.type === 'inlineCode') {
                    const t = left as Text;
                    if (WORD_RE.test(t.value[t.value.length - 1] ?? '')) t.value += ' ';
                } else if (left.type === 'inlineCode' && right.type === 'text') {
                    const t = right as Text;
                    if (WORD_RE.test(t.value[0] ?? '')) t.value = ' ' + t.value;
                }
            }

            // ── 强制空格：inlineMath ──────────────────────────────────────────
            if (cfg.spaceBetweenWordAndInlineEquation) {
                if (left.type === 'text' && right.type === 'inlineMath') {
                    const t = left as Text;
                    if (WORD_RE.test(t.value[t.value.length - 1] ?? '')) t.value += ' ';
                } else if (left.type === 'inlineMath' && right.type === 'text') {
                    const t = right as Text;
                    if (WORD_RE.test(t.value[0] ?? '')) t.value = ' ' + t.value;
                }
            }

            // ── 条件空格：其他行内元素（去掉标记后是否产生空格）────────────
            if (cfg.spaceBetweenInlineElements) {
                if (left.type === 'text' && CONDITIONAL_TYPES.has(right.type)) {
                    const t = left as Text;
                    const lc = t.value[t.value.length - 1] ?? '';
                    const rc = firstChar(right);
                    if (wouldNeedSpace(lc, rc, cfg)) t.value += ' ';
                } else if (CONDITIONAL_TYPES.has(left.type) && right.type === 'text') {
                    const t = right as Text;
                    const lc = lastChar(left);
                    const rc = t.value[0] ?? '';
                    if (wouldNeedSpace(lc, rc, cfg)) t.value = ' ' + t.value;
                }
            }
        }
    });
}
