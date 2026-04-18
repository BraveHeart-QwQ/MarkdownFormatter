import * as vscode from "vscode";
import { type PartialFormatterConfig } from "./configLoader.js";

export type ProfileEntry = string | PartialFormatterConfig;

/**
 * Show a QuickPick of the profiles defined in `markdownFormatter.profiles` and
 * return the extra config entries for the chosen profile. Returns `undefined`
 * when the user cancels or no profiles are configured.
 */
export async function pickProfile(): Promise<ProfileEntry[] | undefined> {
    const vsConfig = vscode.workspace.getConfiguration("markdownFormatter");
    const profiles: Record<string, ProfileEntry[]> = vsConfig.get("profiles") ?? {};
    const profileNames = Object.keys(profiles);

    if (profileNames.length === 0) {
        vscode.window.showInformationMessage(
            "Markdown Formatter: No profiles defined. Add `markdownFormatter.profiles` to your settings.",
        );
        return undefined;
    }

    const picked = await vscode.window.showQuickPick(profileNames, {
        placeHolder: "Select a config profile to apply",
        title: "Markdown Formatter",
    });
    if (picked === undefined) return undefined;

    return profiles[picked] ?? [];
}
