import * as vscode from "vscode";
import { loadFormatterConfig, workspaceRootFor } from "./configLoader.js";
import { applyFormatToDocument, applyFormatToRanges } from "./formattingProvider.js";
import { pickProfile } from "./profile.js";
import { withSelectionDefaultConfig } from "./utils.js";

export async function cmdFormatDocument(editor: vscode.TextEditor): Promise<void> {
    if (editor.document.languageId !== "markdown") return;
    await vscode.commands.executeCommand("editor.action.formatDocument");
}

export async function cmdFormatDocumentWithProfile(editor: vscode.TextEditor): Promise<void> {
    if (editor.document.languageId !== "markdown") return;
    const extraFiles = await pickProfile();
    if (extraFiles === undefined) return;
    let config;
    try {
        config = loadFormatterConfig(workspaceRootFor(editor.document.uri), extraFiles);
    } catch (err) {
        vscode.window.showErrorMessage(`Markdown Formatter: ${(err as Error).message}`);
        return;
    }
    await applyFormatToDocument(editor.document, config);
}

export async function cmdFormatSelectionWithProfile(editor: vscode.TextEditor): Promise<void> {
    if (editor.document.languageId !== "markdown") return;
    const selections = editor.selections.filter((selection) => !selection.isEmpty);
    if (selections.length === 0) {
        vscode.window.showInformationMessage("Markdown Formatter: No text selected.");
        return;
    }
    const extraFiles = await pickProfile();
    if (extraFiles === undefined) return;
    let config;
    try {
        config = loadFormatterConfig(workspaceRootFor(editor.document.uri), extraFiles);
    } catch (err) {
        vscode.window.showErrorMessage(`Markdown Formatter: ${(err as Error).message}`);
        return;
    }
    const selectionConfig = withSelectionDefaultConfig(config);
    await applyFormatToRanges(editor.document, selections, selectionConfig);
}
