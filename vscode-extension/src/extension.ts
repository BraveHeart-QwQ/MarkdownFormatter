import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { k_defaultFormatterConfig, type FormatterConfig } from "../../src/config.js";
import { format } from "../../src/pipeline.js";

// TODO
// - [ ] 代码合理拆分多个文件，不要挤在 extension.ts
// - [ ] 提供文档格式化、选中区域格式化
// - [ ] 提供一个 py 脚本将插件打包为 .visx
// - [ ] 允许用户在项目内自定义配置文件，然后在 settings.json 里*组合**使用。提供格式化命令（全文和选中），允许用户指定组合配置

// ── Config helpers ────────────────────────────────────────────────────────────

type PartialFormatterConfig = {
    [K in keyof FormatterConfig]?: Partial<FormatterConfig[K]>;
};

function mergeConfig(base: FormatterConfig, ...overrides: PartialFormatterConfig[]): FormatterConfig {
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

function loadFormatterConfig(workspaceRoot: string): FormatterConfig {
    const vsConfig = vscode.workspace.getConfiguration("markdownFormatter");
    const configFiles: string[] = vsConfig.get("configFiles") ?? [];

    const overrides: PartialFormatterConfig[] = [];
    for (const cf of configFiles) {
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

// ── Formatting provider ───────────────────────────────────────────────────────

class MarkdownFormattingProvider implements vscode.DocumentFormattingEditProvider {
    async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken,
    ): Promise<vscode.TextEdit[]> {
        const workspaceRoot =
            vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath ??
            path.dirname(document.uri.fsPath);

        const config = loadFormatterConfig(workspaceRoot);
        const original = document.getText();

        const formatted = await format(original, config);

        // Only emit an edit when the text actually changed
        if (formatted === original) return [];

        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(original.length),
        );
        return [vscode.TextEdit.replace(fullRange, formatted)];
    }
}

// ── Extension lifecycle ───────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
    const provider = new MarkdownFormattingProvider();

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            { language: "markdown", scheme: "file" },
            provider,
        ),
    );
}

export function deactivate(): void { }
