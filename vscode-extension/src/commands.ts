import * as vscode from "vscode";
import { loadFormatterConfig, workspaceRootFor } from "./configLoader.js";
import { applyFormatToDocument, applyFormatToRange } from "./formattingProvider.js";
import { pickProfile } from "./profile.js";

export async function cmdFormatDocument(editor: vscode.TextEditor): Promise<void> {
    if (editor.document.languageId !== "markdown") return;
    await vscode.commands.executeCommand("editor.action.formatDocument");
}

export async function cmdFormatSelection(editor: vscode.TextEditor): Promise<void> {
    if (editor.document.languageId !== "markdown") return;
    if (editor.selection.isEmpty) {
        vscode.window.showInformationMessage("Markdown Formatter: No text selected.");
        return;
    }
    await vscode.commands.executeCommand("editor.action.formatSelection");
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
    if (editor.selection.isEmpty) {
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
    await applyFormatToRange(editor.document, editor.selection, config);
}
