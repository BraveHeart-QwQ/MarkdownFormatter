import { type FormatterConfig } from "../../src/config.js";
import { mergeConfig } from "./configLoader.js";

function isBlankLine(line: string): boolean {
    return line.trim().length === 0;
}

function normalizeBlankLines(text: string): string {
    return text.split("\n").map((line) => (isBlankLine(line) ? "" : line)).join("\n");
}

function countLeadingBlankLines(lines: string[]): number {
    let count = 0;
    while (count < lines.length && isBlankLine(lines[count])) count++;
    return count;
}

function countTrailingBlankLines(lines: string[]): number {
    let count = 0;
    while (count < lines.length && isBlankLine(lines[lines.length - 1 - count])) count++;
    return count;
}

export function preserveSelectionBlankLines(original: string, formatted: string): string {
    const originalLines = original.split("\n");
    const leadingBlankLines = countLeadingBlankLines(originalLines);
    const trailingBlankLines = countTrailingBlankLines(originalLines);

    const normalizedFormatted = normalizeBlankLines(formatted);
    const bodyLines = normalizedFormatted.split("\n");
    const bodyStart = countLeadingBlankLines(bodyLines);
    const bodyEnd = bodyLines.length - countTrailingBlankLines(bodyLines);
    const core = bodyLines.slice(bodyStart, Math.max(bodyStart, bodyEnd));

    return [
        ...Array.from({ length: leadingBlankLines }, () => ""),
        ...core,
        ...Array.from({ length: trailingBlankLines }, () => ""),
    ].join("\n");
}

export function withSelectionDefaultConfig(config: FormatterConfig): FormatterConfig {
    // Selection formatting should not append fixed endings by default.
    return mergeConfig(config, { other: { enableCustomEnding: false } });
}
