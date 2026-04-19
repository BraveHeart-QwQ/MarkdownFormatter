import * as vscode from "vscode";
import {
    cmdFormatDocument,
    cmdFormatDocumentWithProfile,
    cmdFormatSelectionWithProfile,
} from "./commands.js";
import { MarkdownFormattingProvider } from "./formattingProvider.js";

// TODO
// - [x] 代码合理拆分多个文件，不要挤在 extension.ts
// - [x] 提供文档格式化、选中区域格式化
// - [x] 提供一个 py 脚本将插件打包为 .visx
// - [x] 允许用户在项目内自定义配置文件，然后在 settings.json 里*组合**使用。提供格式化命令（全文和选中），允许用户指定组合配置
// - [ ] import 里的 `../` 设法删掉？

const k_markdownSelector: vscode.DocumentSelector = { language: "markdown", scheme: "file" };

export function activate(context: vscode.ExtensionContext): void {
    const provider = new MarkdownFormattingProvider();

    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(k_markdownSelector, provider),
        vscode.languages.registerDocumentRangeFormattingEditProvider(k_markdownSelector, provider),
        vscode.commands.registerTextEditorCommand("markdownFormatter.formatDocument", cmdFormatDocument),
        vscode.commands.registerTextEditorCommand("markdownFormatter.formatDocumentWithProfile", cmdFormatDocumentWithProfile),
        vscode.commands.registerTextEditorCommand("markdownFormatter.formatSelectionWithProfile", cmdFormatSelectionWithProfile),
    );
}

export function deactivate(): void { }
