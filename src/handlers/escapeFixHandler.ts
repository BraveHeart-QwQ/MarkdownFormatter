//===----------------------------------------------------------------------===//
//
// @desc    : URL Handlers, fix over-escaping bugs in mdast-util-to-markdown
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
 * mdast-util-to-markdown@2 has a bug: the `&` phrasing unsafe rule lacks
 * `noInConstruct: fullPhrasingSpans`, so `&` gets in correctly escaped inside
 * inline link/image URLs (which are `destinationRaw` context but still have
 * `phrasing` in the stack because links live inside paragraphs).
 * This function strips the rule temporarily during URL serialization.
 */
function safeUrl(state: ToMarkdownState, url: string, info: object): string {
    const original = state.unsafe;
    state.unsafe = original.filter((p) => {
        if (p.character !== "&") return true;
        const c = p.inConstruct;
        return typeof c === "string" ? c !== "phrasing" : !(Array.isArray(c) && c.includes("phrasing"));
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

export const linkHandler: Handle = Object.assign(linkHandlerFunc, { peek: () => "[" });
export const imageHandler: Handle = Object.assign(imageHandlerFunc, { peek: () => "!" });
