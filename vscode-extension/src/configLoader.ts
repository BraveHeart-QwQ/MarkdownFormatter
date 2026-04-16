import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { k_defaultFormatterConfig, type FormatterConfig } from "../../src/config.js";

export type PartialFormatterConfig = {
    [K in keyof FormatterConfig]?: Partial<FormatterConfig[K]>;
};

export function mergeConfig(base: FormatterConfig, ...overrides: PartialFormatterConfig[]): FormatterConfig {
    let result = { ...base };
    for (const override of overrides) {
        for (const key of Object.keys(override) as Array<keyof FormatterConfig>) {
            if (override[key] !== undefined) {
                result = { ...result, [key]: { ...result[key], ...(override[key] as object) } };
            }
        }
    }
    return result;
}

/**
 * Build a FormatterConfig for the given workspace root.
 *
 * @param workspaceRoot  Absolute path used to resolve relative file references.
 * @param extraFiles     Additional config files (from a profile) merged **after**
 *                       the global `markdownFormatter.configFiles` list.
 */
export function loadFormatterConfig(workspaceRoot: string, extraFiles: string[] = []): FormatterConfig {
    const vsConfig = vscode.workspace.getConfiguration("markdownFormatter");
    const baseFiles: string[] = vsConfig.get("configFiles") ?? [];
    const allFiles = [...baseFiles, ...extraFiles];

    const overrides: PartialFormatterConfig[] = [];
    for (const cf of allFiles) {
        const absPath = path.isAbsolute(cf) ? cf : path.join(workspaceRoot, cf);
        try {
            const raw = fs.readFileSync(absPath, "utf-8");
            overrides.push(JSON.parse(raw) as PartialFormatterConfig);
        } catch {
            vscode.window.showErrorMessage(`Markdown Formatter: cannot load config file "${absPath}"`);
        }
    }

    return mergeConfig(k_defaultFormatterConfig, ...overrides);
}

export function workspaceRootFor(uri: vscode.Uri): string {
    return vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath ?? path.dirname(uri.fsPath);
}
