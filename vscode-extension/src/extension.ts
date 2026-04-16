import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";
import { k_defaultFormatterConfig, type FormatterConfig } from "../../src/config.js";
import { format } from "../../src/pipeline.js";

// TODO
// - [ ] 代码合理拆分多个文件，不要挤在 extension.ts
// - [x] 提供文档格式化、选中区域格式化
// - [x] 提供一个 py 脚本将插件打包为 .visx
// - [ ] 允许用户在项目内自定义配置文件，然后在 settings.json 里*组合**使用。提供格式化命令（全文和选中），允许用户指定组合配置
// - [ ] 内置一个默认样式，可以作为基础的被叠加配置
// - [ ] 格式化器改一下，支持自动从执行路径读取配置
// - [ ] import 里的 `../` 设法删掉？

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

class MarkdownFormattingProvider
    implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {

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

    async provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken,
    ): Promise<vscode.TextEdit[]> {
        const workspaceRoot =
            vscode.workspace.getWorkspaceFolder(document.uri)?.uri.fsPath ??
            path.dirname(document.uri.fsPath);

        const config = loadFormatterConfig(workspaceRoot);
        const original = document.getText(range);

        const formatted = await format(original, config);

        if (formatted === original) return [];
        return [vscode.TextEdit.replace(range, formatted)];
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
        vscode.languages.registerDocumentRangeFormattingEditProvider(
            { language: "markdown", scheme: "file" },
            provider,
        ),
        vscode.commands.registerTextEditorCommand(
            "markdownFormatter.formatDocument",
            async (editor) => {
                if (editor.document.languageId !== "markdown") return;
                await vscode.commands.executeCommand("editor.action.formatDocument");
            },
        ),
        vscode.commands.registerTextEditorCommand(
            "markdownFormatter.formatSelection",
            async (editor) => {
                if (editor.document.languageId !== "markdown") return;
                if (editor.selection.isEmpty) {
                    vscode.window.showInformationMessage("Markdown Formatter: No text selected.");
                    return;
                }
                await vscode.commands.executeCommand("editor.action.formatSelection");
            },
        ),
    );
}

export function deactivate(): void { }
