import * as vscode from "vscode";
import { type PartialFormatterConfig } from "./configLoader.js";

export type ProfileEntry = string | PartialFormatterConfig;

// ── Built-in profiles ─────────────────────────────────────────────────────────

export const k_builtinProfiles: Record<string, ProfileEntry[]> = {
    "ClearInlineCodeAndMath": [{ inline: { handleInlineCode: "removeAll", handleInlineMath: "removeAll" }, other: { enableCustomEnding: false } }],
    "ClearInlineCode": [{ inline: { handleInlineCode: "removeAll" }, other: { enableCustomEnding: false } }],
    "ClearInlineMath": [{ inline: { handleInlineMath: "removeAll" }, other: { enableCustomEnding: false } }],
    "FormatInlineToCode": [{ inline: { handleInlineCode: "allEnglishWord" }, other: { enableCustomEnding: false } }],
    "FormatInlineToMath": [{ inline: { handleInlineMath: "allEnglishWord" }, other: { enableCustomEnding: false } }],
};

/**
 * Show a QuickPick of built-in profiles and those defined in `markdownFormatter.profiles`,
 * and return the config entries for the chosen profile. Returns `undefined` when the user cancels.
 * User-defined profiles with the same name as a built-in override the built-in.
 */
export async function pickProfile(): Promise<ProfileEntry[] | undefined> {
    const vsConfig = vscode.workspace.getConfiguration("markdownFormatter");
    const userProfiles: Record<string, ProfileEntry[]> = vsConfig.get("profiles") ?? {};

    // Merge: built-ins first, user profiles override by name
    const profiles: Record<string, ProfileEntry[]> = { ...k_builtinProfiles, ...userProfiles };
    const profileNames = Object.keys(profiles);

    const picked = await vscode.window.showQuickPick(profileNames, {
        placeHolder: "Select a config profile to apply",
        title: "Markdown Formatter",
    });
    if (picked === undefined) return undefined;

    return profiles[picked] ?? [];
}
