import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { k_defaultFormatterConfig, type FormatterConfig, validatePartialConfig } from "../../src/config.js";

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

import { ProfileEntry } from "./profile.js";

/**
 * Build a FormatterConfig for the given workspace root.
 *
 * @param workspaceRoot   Absolute path used to resolve relative file references.
 * @param extraEntries    Additional config entries (from a profile) merged **after**
 *                        the global `markdownFormatter.configFiles` list.
 *                        Each entry is either a file path string or an inline partial config object.
 */
export function loadFormatterConfig(workspaceRoot: string, extraEntries: ProfileEntry[] = []): FormatterConfig {
    const vsConfig = vscode.workspace.getConfiguration("markdownFormatter");
    const baseFiles: string[] = vsConfig.get("configFiles") ?? [];
    // base files are all strings; profile entries may be strings or inline objects
    const allEntries: ProfileEntry[] = [...baseFiles, ...extraEntries];

    // 读取 baseConfig（优先级低于 configFiles，用于全局基础配置）
    const baseInlineConfig: PartialFormatterConfig | undefined = vsConfig.get("baseConfig");
    const overrides: PartialFormatterConfig[] = [];
    if (baseInlineConfig && typeof baseInlineConfig === "object") {
        const errors = validatePartialConfig(baseInlineConfig);
        if (errors.length > 0) {
            throw new Error(`Invalid inline config in "markdownFormatter.baseConfig" setting:\n${errors.join("\n")}`);
        }
        overrides.push(baseInlineConfig);
    }

    for (const entry of allEntries) {
        if (typeof entry === "string") {
            const absPath = path.isAbsolute(entry) ? entry : path.join(workspaceRoot, entry);
            let partial: PartialFormatterConfig;
            try {
                const raw = fs.readFileSync(absPath, "utf-8");
                partial = JSON.parse(raw) as PartialFormatterConfig;
            } catch {
                throw new Error(`Cannot load config file "${absPath}"`);
            }
            const errors = validatePartialConfig(partial);
            if (errors.length > 0) {
                throw new Error(`Invalid config in "${absPath}":\n${errors.join("\n")}`);
            }
            overrides.push(partial);
        } else {
            // inline object entry from a profile
            const errors = validatePartialConfig(entry);
            if (errors.length > 0) {
                throw new Error(`Invalid inline config in profile entry:\n${errors.join("\n")}`);
            }
            overrides.push(entry);
        }
    }

    // 读取 settings 中的内联配置（优先级最高，覆盖文件配置）
    const inlineConfig: PartialFormatterConfig | undefined = vsConfig.get("config");
    if (inlineConfig && typeof inlineConfig === "object") {
        const errors = validatePartialConfig(inlineConfig);
        if (errors.length > 0) {
            throw new Error(`Invalid inline config in "markdownFormatter.config" setting:\n${errors.join("\n")}`);
        }
        overrides.push(inlineConfig);
    }

    return mergeConfig(k_defaultFormatterConfig, ...overrides);
}

export function workspaceRootFor(uri: vscode.Uri): string {
    return vscode.workspace.getWorkspaceFolder(uri)?.uri.fsPath ?? path.dirname(uri.fsPath);
}
