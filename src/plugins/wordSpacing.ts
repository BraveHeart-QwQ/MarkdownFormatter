import type { Paragraph, PhrasingContent, Strong, Text } from "mdast";
import type { FormatterConfig, WordSpacingConfig } from "../config.js";
import type { VisitorRegistry } from "./registry.js";
import { CJK, CJK_PUNC_RE, LAT_PUNC_RE, firstNonWhitespaceChar, lastNonWhitespaceChar } from "./utils.js";


// 词字符：CJK / 拉丁字母 / 数字（即「中英文」，不含符号）
const WORD_RE = new RegExp(`[${CJK}A-Za-z0-9]`);

const CJK_RE = new RegExp(`[${CJK}]`);

// 使用「条件式」空格策略的行内元素类型（去掉标记后是否产生空格）
const CONDITIONAL_TYPES: ReadonlySet<string> = new Set(['strong', 'emphasis', 'delete', 'mark', 'ins']);

/** 判断左右两个字符按当前规则是否应产生空格（用于条件式空格）。 */
function wouldNeedSpace(lc: string, rc: string, cfg: WordSpacingConfig): boolean {
    if (!lc || !rc) return false;
    if (CJK_PUNC_RE.test(lc) || CJK_PUNC_RE.test(rc)) return false;
    const lCJK = CJK_RE.test(lc), rCJK = CJK_RE.test(rc);
    const lLat = /[A-Za-z]/.test(lc) || LAT_PUNC_RE.test(lc);
    const rLat = /[A-Za-z]/.test(rc) || LAT_PUNC_RE.test(rc);
    const lNum = /[0-9]/.test(lc), rNum = /[0-9]/.test(rc);
    if (cfg.spaceBetweenChineseAndEnglish && ((lCJK && rLat) || (lLat && rCJK))) return true;
    if (cfg.spaceBetweenChineseAndNumber && ((lCJK && rNum) || (lNum && rCJK))) return true;
    return false;
}

function shouldRemoveSpace(lc: string, rc: string, cfg: WordSpacingConfig): boolean {
    return cfg.spaceBetweenChineseAndEnglish && (CJK_PUNC_RE.test(lc) || CJK_PUNC_RE.test(rc));
}

function normalizeRawInlineMarkerSpacing(value: string, cfg: WordSpacingConfig): string {
    return value.replace(/(\S)(\*\*|__)[^\S\r\n]*(\S)/gu, (match, lc: string, marker: string, rc: string) => {
        if (wouldNeedSpace(lc, rc, cfg)) return `${lc}${marker} ${rc}`;
        if (shouldRemoveSpace(lc, rc, cfg)) return `${lc}${marker}${rc}`;
        return match;
    });
}

function normalizeConditionalInlineBoundaries(children: PhrasingContent[], cfg: WordSpacingConfig): void {
    for (let i = 0; i + 1 < children.length; i++) {
        const left = children[i];
        const right = children[i + 1];

        if (left.type === 'text' && CONDITIONAL_TYPES.has(right.type)) {
            const t = left as Text;
            const lc = lastNonWhitespaceChar(t.value);
            const rc = firstChar(right);
            if (wouldNeedSpace(lc, rc, cfg)) {
                t.value = t.value.replace(/[^\S\r\n]*$/, ' ');
            } else if (shouldRemoveSpace(lc, rc, cfg)) {
                t.value = t.value.replace(/[^\S\r\n]+$/, '');
            }
        } else if (CONDITIONAL_TYPES.has(left.type) && right.type === 'text') {
            const t = right as Text;
            const lc = lastChar(left);
            const rc = firstNonWhitespaceChar(t.value);
            if (wouldNeedSpace(lc, rc, cfg)) {
                t.value = t.value.replace(/^[^\S\r\n]*/, ' ');
            } else if (shouldRemoveSpace(lc, rc, cfg)) {
                t.value = t.value.replace(/^[^\S\r\n]+/, '');
            }
        }
    }
}

function makeStrongLike(source: Strong, children: PhrasingContent[]): Strong {
    return {
        type: 'strong',
        children: children as Strong['children'],
        data: source.data,
    } as Strong;
}

function splitAmbiguousNestedStrong(children: PhrasingContent[], cfg: WordSpacingConfig): void {
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.type !== 'strong') continue;

        const strongChildren = child.children as PhrasingContent[];
        const nestedIndex = strongChildren.findIndex((nestedChild, index) => index > 0 && nestedChild.type === 'strong');
        if (nestedIndex === -1 || nestedIndex + 1 >= strongChildren.length) continue;

        const before = strongChildren.slice(0, nestedIndex);
        const nested = strongChildren[nestedIndex] as Strong;
        const after = strongChildren.slice(nestedIndex + 1);
        const lc = lastChar({ children: before });
        const rc = firstChar(nested);
        if (!wouldNeedSpace(lc, rc, cfg) && !shouldRemoveSpace(lc, rc, cfg)) continue;

        children.splice(
            i,
            1,
            makeStrongLike(child as Strong, before),
            ...(nested.children as PhrasingContent[]),
            makeStrongLike(child as Strong, after),
        );
    }
}

/** 从任意 AST 节点中递归提取第一个可见文字字符（跳过空值）。 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function firstChar(node: any): string {
    if ('value' in node && typeof node.value === 'string') return firstNonWhitespaceChar(node.value);
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
        return lastNonWhitespaceChar(node.value);
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
            const cjkPunc = CJK_PUNC_RE.source;
            patterns.push([new RegExp(`([${CJK}A-Za-z0-9])[^\\S\\r\\n]+(${cjkPunc})`, 'gu'), '$1$2']);
            patterns.push([new RegExp(`(${cjkPunc})[^\\S\\r\\n]+([${CJK}A-Za-z0-9])`, 'gu'), '$1$2']);
            patterns.push([new RegExp(`([${CJK}])([A-Za-z])`, 'gu'), '$1 $2']);
            patterns.push([new RegExp(`([A-Za-z])([${CJK}])`, 'gu'), '$1 $2']);
            // Handle identifiers ending with ')' before CJK, e.g. T(V_n)也是 -> T(V_n) 也是
            patterns.push([new RegExp(`([A-Za-z_][A-Za-z0-9_]*\\))([${CJK}])`, 'gu'), '$1 $2']);
            // LAT_PUNC（ASCII 括号类）与中文相邻时补充空格
            patterns.push([new RegExp(`([${CJK}])([()[\\]{}])`, 'gu'), '$1 $2']);
            patterns.push([new RegExp(`([()[\\]{}])([${CJK}])`, 'gu'), '$1 $2']);
        }
        if (cfg.spaceBetweenChineseAndNumber) {
            patterns.push([new RegExp(`([${CJK}])([0-9])`, 'gu'), '$1 $2']);
            patterns.push([new RegExp(`([0-9])([${CJK}])`, 'gu'), '$1 $2']);
        }
        registry.text.push((node: Text) => {
            for (const [re, rep] of patterns) {
                node.value = node.value.replace(re, rep);
            }
            node.value = normalizeRawInlineMarkerSpacing(node.value, cfg);
        });
    }

    // ── Inline-element boundary spacing（在段落层面处理行内元素左右边距）────
    const anyInlineSpacing = cfg.spaceBetweenWordAndInlineCode
        || cfg.spaceBetweenWordAndInlineEquation
        || cfg.spaceBetweenInlineElements;
    if (!anyInlineSpacing) return;

    registry.paragraph.push((node: Paragraph) => {
        const children = node.children;
        if (cfg.spaceBetweenInlineElements) {
            splitAmbiguousNestedStrong(children as PhrasingContent[], cfg);
        }

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
        }

        // ── 条件空格：其他行内元素（去掉标记后是否产生空格）────────────
        if (cfg.spaceBetweenInlineElements) {
            normalizeConditionalInlineBoundaries(children as PhrasingContent[], cfg);
        }
    });
}
