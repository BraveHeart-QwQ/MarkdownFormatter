import * as vscode from "vscode";
import {
    cmdFormatDocument,
    cmdFormatDocumentWithProfile,
    cmdFormatSelectionWithProfile,
    cmdFormatSelectionWithBuiltinProfile,
} from "./commands.js";
import { MarkdownFormattingProvider } from "./formattingProvider.js";

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

    const k_builtinProfileCommands: Array<{ name: string; id: string }> = [
        { name: "ClearLinks", id: "clearLinks" },
        { name: "ClearInlineStrong", id: "clearInlineStrong" },
        { name: "ClearInlineStrongCodeAndMath", id: "clearInlineStrongCodeAndMath" },
        { name: "ClearInlineCodeAndMath", id: "clearInlineCodeAndMath" },
        { name: "ClearInlineCode", id: "clearInlineCode" },
        { name: "ClearInlineMath", id: "clearInlineMath" },
        { name: "FormatInlineToCode", id: "formatInlineToCode" },
        { name: "FormatInlineToMath", id: "formatInlineToMath" },
    ];
    for (const { name, id } of k_builtinProfileCommands) {
        context.subscriptions.push(
            vscode.commands.registerTextEditorCommand(`markdownFormatter.profile.${id}.selection`, cmdFormatSelectionWithBuiltinProfile(name)),
        );
    }
}

export function deactivate(): void { }
