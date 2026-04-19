import * as vscode from "vscode";
import { type FormatterConfig } from "../../src/config.js";
import { format } from "../../src/pipeline.js";
import { loadFormatterConfig, workspaceRootFor } from "./configLoader.js";
import { preserveSelectionBlankLines, withSelectionDefaultConfig } from "./utils.js";

export async function applyFormatToDocument(
    document: vscode.TextDocument,
    config: FormatterConfig,
): Promise<void> {
    const original = document.getText();
    let formatted: string;
    try {
        formatted = await format(original, config);
    } catch (err) {
        vscode.window.showErrorMessage(`Markdown Formatter: formatting failed — ${(err as Error).message}`);
        return;
    }
    if (formatted === original) return;

    const fullRange = new vscode.Range(
        document.positionAt(0),
        document.positionAt(original.length),
    );
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, fullRange, formatted);
    await vscode.workspace.applyEdit(edit);
}

export async function applyFormatToRange(
    document: vscode.TextDocument,
    range: vscode.Range,
    config: FormatterConfig,
): Promise<void> {
    const original = document.getText(range);
    let formatted: string;
    try {
        formatted = await format(original, config);
    } catch (err) {
        vscode.window.showErrorMessage(`Markdown Formatter: formatting failed — ${(err as Error).message}`);
        return;
    }
    formatted = preserveSelectionBlankLines(original, formatted);
    if (formatted === original) return;

    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, formatted);
    await vscode.workspace.applyEdit(edit);
}

export class MarkdownFormattingProvider
    implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider {

    async provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken,
    ): Promise<vscode.TextEdit[]> {
        let config;
        try {
            config = loadFormatterConfig(workspaceRootFor(document.uri));
        } catch (err) {
            vscode.window.showErrorMessage(`Markdown Formatter: ${(err as Error).message}`);
            return [];
        }
        const original = document.getText();
        let formatted: string;
        try {
            formatted = await format(original, config);
        } catch (err) {
            vscode.window.showErrorMessage(`Markdown Formatter: formatting failed — ${(err as Error).message}`);
            return [];
        }
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
        let config;
        try {
            config = loadFormatterConfig(workspaceRootFor(document.uri));
        } catch (err) {
            vscode.window.showErrorMessage(`Markdown Formatter: ${(err as Error).message}`);
            return [];
        }
        config = withSelectionDefaultConfig(config);
        const original = document.getText(range);
        let formatted: string;
        try {
            formatted = await format(original, config);
        } catch (err) {
            vscode.window.showErrorMessage(`Markdown Formatter: formatting failed — ${(err as Error).message}`);
            return [];
        }
        formatted = preserveSelectionBlankLines(original, formatted);
        if (formatted === original) return [];
        return [vscode.TextEdit.replace(range, formatted)];
    }
}
