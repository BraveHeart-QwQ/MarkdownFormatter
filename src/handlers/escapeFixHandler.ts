//===----------------------------------------------------------------------===//
//
// @desc    : Handlers that fix over-escaping bugs in mdast-util-to-markdown
//
//===----------------------------------------------------------------------===//

import type { Handle } from "./tableHandler.js"

// Minimal State interface mirroring mdast-util-to-markdown internals
interface UnsafePattern {
    character?: string;
    inConstruct?: string | string[];
    noInConstruct?: string | string[];
    atBreak?: boolean;
    before?: string;
    after?: string;
}

// Tracker interface for managing position and context during escaping
interface Tracker {
    move(s: string): string;
    shift(n: number): void;
    current(): object;
}

interface ToMarkdownState {
    unsafe: UnsafePattern[];
    options: { quote?: string; resourceLink?: boolean };
    stack: string[];
    enter(type: string): () => void;
    createTracker(info: object): Tracker;
    containerPhrasing(node: object, info: object): string;
    safe(value: string | null | undefined, info: object): string;
}

/**
 * Returns true when the URL contains only balanced (matched) parentheses.
 * This mirrors the CommonMark rule that allows unescaped balanced parens in
 * link destinations.
 */
function hasBalancedParens(url: string): boolean {
    let depth = 0;
    for (const ch of url) {
        if (ch === "(") depth++;
        else if (ch === ")") { depth--; if (depth < 0) return false; }
    }
    return depth === 0;
}

/**
 * mdast-util-to-markdown@2 has a bug: the `&` phrasing unsafe rule lacks
 * `noInConstruct: fullPhrasingSpans`, so `&` gets incorrectly escaped inside
 * inline link/image URLs.
 *
 * Additionally, `(` and `)` are over-escaped in `destinationRaw` context when
 * the URL contains balanced parentheses — CommonMark allows those natively.
 *
 * This function strips both sets of rules temporarily during URL serialization.
 */
function safeUrl(state: ToMarkdownState, url: string, info: object): string {
    const original = state.unsafe;
    const balanced = hasBalancedParens(url);
    state.unsafe = original.filter((p) => {
        if (p.character === "&") {
            const c = p.inConstruct;
            if (typeof c === "string" ? c === "phrasing" : (Array.isArray(c) && c.includes("phrasing")))
                return false;
        }
        if (balanced && (p.character === "(" || p.character === ")")) {
            const c = p.inConstruct;
            if (typeof c === "string" && c === "destinationRaw") return false;
            if (Array.isArray(c) && c.includes("destinationRaw")) return false;
        }
        return true;
    });
    const result = state.safe(url, info);
    state.unsafe = original;
    return result;
}

function getQuote(state: ToMarkdownState): string {
    return state.options.quote === "'" ? "'" : '"';
}

/** Replicate formatLinkAsAutolink without importing the library helper. */
function isAutolink(
    node: { url: string; title?: string; children: Array<{ type: string; value?: string }> },
    state: ToMarkdownState
): boolean {
    if (state.options.resourceLink) return false;
    if (!node.url || node.title) return false;
    if (node.children.length !== 1 || node.children[0].type !== "text") return false;
    const raw = (node.children[0] as { type: string; value: string }).value;
    if (raw !== node.url && "mailto:" + raw !== node.url) return false;
    if (!/^[a-z][a-z+.-]+:/i.test(node.url)) return false;
    if (/[\0- <>\u007F]/.test(node.url)) return false;
    return true;
}

/**
 * Custom link handler - identical to mdast-util-to-markdown@2 link.js except
 * it uses `safeUrl()` for the destination so `&` is not over-escaped.
 */
function linkHandlerFunc(node: object, _: object | null, state: object, info: object): string {
    const n = node as { url: string; title?: string; children: Array<{ type: string; value?: string }> };
    const s = state as ToMarkdownState;
    const quote = getQuote(s);
    const suffix = quote === '"' ? "Quote" : "Apostrophe";
    const tracker = s.createTracker(info);

    if (isAutolink(n, s)) {
        const savedStack = s.stack;
        s.stack = [];
        const exitAuto = s.enter("autolink");
        let v = tracker.move("<");
        v += tracker.move(s.containerPhrasing(n, { before: v, after: ">", ...tracker.current() }));
        v += tracker.move(">");
        exitAuto();
        s.stack = savedStack;
        return v;
    }

    const exit = s.enter("link");
    let subexit = s.enter("label");
    let value = tracker.move("[");
    value += tracker.move(s.containerPhrasing(n, { before: value, after: "](", ...tracker.current() }));
    value += tracker.move("](");
    subexit();

    if ((!n.url && n.title) || /[\0- \u007F]/.test(n.url)) {
        subexit = s.enter("destinationLiteral");
        value += tracker.move("<");
        value += tracker.move(safeUrl(s, n.url, { before: value, after: ">", ...tracker.current() }));
        value += tracker.move(">");
    } else {
        subexit = s.enter("destinationRaw");
        value += tracker.move(
            safeUrl(s, n.url, { before: value, after: n.title ? " " : ")", ...tracker.current() }),
        );
    }
    subexit();

    if (n.title) {
        subexit = s.enter(`title${suffix}`);
        value += tracker.move(" " + quote);
        value += tracker.move(s.safe(n.title, { before: value, after: quote, ...tracker.current() }));
        value += tracker.move(quote);
        subexit();
    }

    value += tracker.move(")");
    exit();
    return value;
}

/**
 * Custom image handler - identical to mdast-util-to-markdown@2 image.js except
 * it uses `safeUrl()` for the destination.
 */
function imageHandlerFunc(node: object, _: object | null, state: object, info: object): string {
    const n = node as { url: string; title?: string; alt?: string };
    const s = state as ToMarkdownState;
    const quote = getQuote(s);
    const suffix = quote === '"' ? "Quote" : "Apostrophe";
    const exit = s.enter("image");
    let subexit = s.enter("label");
    const tracker = s.createTracker(info);

    let value = tracker.move("![");
    value += tracker.move(s.safe(n.alt ?? "", { before: value, after: "](", ...tracker.current() }));
    value += tracker.move("](");
    subexit();

    if ((!n.url && n.title) || /[\0- \u007F]/.test(n.url)) {
        subexit = s.enter("destinationLiteral");
        value += tracker.move("<");
        value += tracker.move(safeUrl(s, n.url, { before: value, after: ">", ...tracker.current() }));
        value += tracker.move(">");
    } else {
        subexit = s.enter("destinationRaw");
        value += tracker.move(
            safeUrl(s, n.url, { before: value, after: n.title ? " " : ")", ...tracker.current() }),
        );
    }
    subexit();

    if (n.title) {
        subexit = s.enter(`title${suffix}`);
        value += tracker.move(" " + quote);
        value += tracker.move(s.safe(n.title, { before: value, after: quote, ...tracker.current() }));
        value += tracker.move(quote);
        subexit();
    }

    value += tracker.move(")");
    exit();
    return value;
}

/**
 * Returns true when the character is a Unicode "word character" in the
 * CommonMark sense: anything that is NOT whitespace, punctuation, or a symbol.
 * An underscore flanked on both sides by word characters cannot open or close
 * emphasis, so it does not need escaping.
 */
const NOT_WORD_RE = /[\s\p{P}\p{S}]/u;
function isWordChar(ch: string): boolean {
    return ch.length > 0 && !NOT_WORD_RE.test(ch);
}

/**
 * Escape `[` and `]` in non-empty bracket pairs so they are not reinterpreted
 * as link references on re-parse.  Standalone `[`, `]`, and empty `[]` are
 * left untouched.
 */
function escapeBracketPairs(text: string): string {
    const openStack: number[] = [];
    const escapePositions = new Set<number>();

    for (let i = 0; i < text.length; i++) {
        if (text[i] === "\\") {
            i++;        // skip already-escaped character
            continue;
        }
        if (text[i] === "[") {
            openStack.push(i);
        } else if (text[i] === "]") {
            if (openStack.length > 0) {
                const openIdx = openStack.pop()!;
                if (i - openIdx > 1) {          // non-empty pair
                    escapePositions.add(openIdx);
                    escapePositions.add(i);
                }
            }
        }
    }

    if (escapePositions.size === 0) return text;

    let result = "";
    for (let i = 0; i < text.length; i++) {
        if (escapePositions.has(i)) result += "\\";
        result += text[i];
    }
    return result;
}

/**
 * Check if an emphasis-like delimiter (`*` or `_`) at this position could
 * open or close emphasis according to CommonMark flanking rules.
 * Returns true when the character needs escaping.
 */
function needsEmphasisEscape(ch: string, prev: string, next: string): boolean {
    // For `_`, intra-word position (word chars on both sides) never forms emphasis
    if (ch === "_" && isWordChar(prev) && isWordChar(next)) return false;

    const prevWs = prev === "" || /\s/.test(prev);
    const nextWs = next === "" || /\s/.test(next);
    // Both sides whitespace / empty → cannot be flanking → safe
    if (prevWs && nextWs) return false;

    return true;
}

/**
 * Custom text handler — removes the blanket `_`, `[`, `*`, `` ` ``, and `~`
 * unsafe rules and instead applies selective escaping:
 *  - `_` / `*` : only escaped when they could open/close emphasis
 *  - `~` : only escaped when adjacent to another `~` (potential strikethrough)
 *  - `` ` `` : only escaped when ≥ 2 backticks in the text (potential code span)
 *  - `[` : only escaped inside label / reference constructs
 */
function textHandlerFunc(node: object, _: object | null, state: object, info: object): string {
    const n = node as { value: string };
    const s = state as ToMarkdownState;

    // Remove emphasis, bracket, backtick, and tilde unsafe patterns.
    // `]` default rules (label/reference only) are kept so that `]` inside
    // link labels is still escaped by safe() itself.
    const original = s.unsafe;
    s.unsafe = original.filter((p) =>
        p.character !== "_" && p.character !== "[" &&
        p.character !== "*" && p.character !== "`" && p.character !== "~" &&
        p.character !== "." && p.character !== "$" && p.character !== "&" &&
        p.character !== "<" && p.character !== ">"
    );
    const safeInfo = info as { before?: string; after?: string };
    const result = s.safe(n.value, info);
    s.unsafe = original;

    // Count backticks: a single backtick cannot form a code span on its own.
    let backtickCount = 0;
    for (let i = 0; i < result.length; i++) {
        if (result[i] === "`") backtickCount++;
    }

    // Selective re-escaping
    let escaped = "";
    for (let i = 0; i < result.length; i++) {
        const ch = result[i];
        const prev = i > 0 ? result[i - 1] : (safeInfo.before ?? "");
        const next = i < result.length - 1 ? result[i + 1] : (safeInfo.after ?? "");

        if (ch === "_" || ch === "*") {
            escaped += ch; // don't need to escape by default, make things worse in some cases. It's just a formatter not a markdown renderer
            // escaped += needsEmphasisEscape(ch, prev, next) ? "\\" + ch : ch;
        } else if (ch === "~") {
            // Only escape when adjacent to another ~ (potential ~~strikethrough~~)
            escaped += (next === "~" || prev === "~") ? "\\~" : "~";
        } else if (ch === "`") {
            // Only escape when ≥ 2 backticks exist (could form a code span)
            escaped += backtickCount >= 2 ? "\\`" : "`";
        } else {
            escaped += ch;
        }
    }

    // Inside label/reference constructs, escape all `[`
    if (s.stack.includes("label") || s.stack.includes("reference")) {
        escaped = escaped.replace(/\[/g, "\\[");
    }

    return escaped;
}

/**
 * safeDefinitionUrl: like safeUrl but also removes ( and ) rules in
 * destinationRaw context — definition URLs are terminated by whitespace,
 * not by ), so parens don't need escaping.
 */
function safeDefinitionUrl(state: ToMarkdownState, url: string, info: object): string {
    const original = state.unsafe;
    state.unsafe = original.filter((p) => {
        if (p.character === "(" || p.character === ")") {
            const c = p.inConstruct;
            if (typeof c === "string" && c === "destinationRaw") return false;
            if (Array.isArray(c) && c.includes("destinationRaw")) return false;
        }
        return true;
    });
    const result = state.safe(url, info);
    state.unsafe = original;
    return result;
}

/**
 * Custom definition handler — identical to mdast-util-to-markdown definition.js
 * except it uses safeDefinitionUrl() so ( and ) are not over-escaped in URLs.
 */
function definitionHandlerFunc(node: object, _: object | null, state: object, info: object): string {
    const n = node as { url: string; title?: string; identifier: string; label?: string };
    const s = state as ToMarkdownState & { associationId(node: object): string };
    const quote = getQuote(s);
    const suffix = quote === '"' ? "Quote" : "Apostrophe";
    const exit = s.enter("definition");
    let subexit = s.enter("label");
    const tracker = s.createTracker(info);

    let value = tracker.move("[");
    value += tracker.move(
        s.safe(s.associationId(n), { before: value, after: "]", ...tracker.current() }),
    );
    value += tracker.move("]: ");
    subexit();

    if (!n.url || /[\0- \u007F]/.test(n.url)) {
        subexit = s.enter("destinationLiteral");
        value += tracker.move("<");
        value += tracker.move(
            safeDefinitionUrl(s, n.url, { before: value, after: ">", ...tracker.current() }),
        );
        value += tracker.move(">");
    } else {
        subexit = s.enter("destinationRaw");
        value += tracker.move(
            safeDefinitionUrl(s, n.url, {
                before: value,
                after: n.title ? " " : "\n",
                ...tracker.current(),
            }),
        );
    }
    subexit();

    if (n.title) {
        subexit = s.enter(`title${suffix}`);
        value += tracker.move(" " + quote);
        value += tracker.move(
            s.safe(n.title, { before: value, after: quote, ...tracker.current() }),
        );
        value += tracker.move(quote);
        subexit();
    }

    exit();
    return value;
}

/**
 * Custom emphasis handler — uses the marker recorded on node.data.marker (`_` or `*`)
 * instead of always outputting `*`, preserving the original source delimiter.
 */
function emphasisHandlerFunc(node: object, _: object | null, state: object, info: object): string {
    const n = node as { children: object[]; data?: { marker?: string } };
    const s = state as ToMarkdownState;
    const marker = n.data?.marker ?? "*";
    const tracker = s.createTracker(info);
    const exit = s.enter("emphasis");
    let value = tracker.move(marker);
    value += tracker.move(s.containerPhrasing(n, { before: marker, after: marker, ...tracker.current() }));
    value += tracker.move(marker);
    exit();
    return value;
}

/**
 * Custom strong handler — uses the marker recorded on node.data.marker (`_` or `*`)
 * instead of always outputting `**`, preserving the original source delimiter.
 */
function strongHandlerFunc(node: object, _: object | null, state: object, info: object): string {
    const n = node as { children: object[]; data?: { marker?: string } };
    const s = state as ToMarkdownState;
    const singleMarker = n.data?.marker ?? "*";
    const marker = singleMarker + singleMarker;
    const tracker = s.createTracker(info);
    const exit = s.enter("strong");
    let value = tracker.move(marker);
    value += tracker.move(s.containerPhrasing(n, { before: marker, after: marker, ...tracker.current() }));
    value += tracker.move(marker);
    exit();
    return value;
}

export const linkHandler: Handle = Object.assign(linkHandlerFunc, { peek: () => "[" });
export const imageHandler: Handle = Object.assign(imageHandlerFunc, { peek: () => "!" });
export const textHandler: Handle = textHandlerFunc as Handle;
export const definitionHandler: Handle = definitionHandlerFunc as Handle;
export const emphasisHandler: Handle = emphasisHandlerFunc as Handle;
export const strongHandler: Handle = strongHandlerFunc as Handle;
