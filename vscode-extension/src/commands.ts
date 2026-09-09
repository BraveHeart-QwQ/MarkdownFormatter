import * as vscode from "vscode";
import {
    collectHeadingLevelEdits,
    type HeadingLevelDelta,
    type OffsetRange,
} from "../../src/headingLevel.js";
import { loadFormatterConfig, workspaceRootFor } from "./configLoader.js";
import { applyFormatToDocument, applyFormatToRanges } from "./formattingProvider.js";
import { k_builtinProfiles, pickProfile, type ProfileEntry } from "./profile.js";
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

export function cmdFormatSelectionWithBuiltinProfile(profileName: string): (editor: vscode.TextEditor) => Promise<void> {
    return async (editor: vscode.TextEditor): Promise<void> => {
        if (editor.document.languageId !== "markdown") return;
        const selections = editor.selections.filter((selection) => !selection.isEmpty);
        if (selections.length === 0) {
            vscode.window.showInformationMessage("Markdown Formatter: No text selected.");
            return;
        }
        const extraFiles: ProfileEntry[] = k_builtinProfiles[profileName] ?? [];
        let config;
        try {
            config = loadFormatterConfig(workspaceRootFor(editor.document.uri), extraFiles);
        } catch (err) {
            vscode.window.showErrorMessage(`Markdown Formatter: ${(err as Error).message}`);
            return;
        }
        const selectionConfig = withSelectionDefaultConfig(config);
        await applyFormatToRanges(editor.document, selections, selectionConfig);
    };
}

function selectionLineRanges(
    document: vscode.TextDocument,
    selections: readonly vscode.Selection[],
): OffsetRange[] {
    return selections.map((selection) => {
        // VS Code selections are half-open. When a selection ends at column 0,
        // that final line is not part of the selection and must not be included.
        const endLine = selection.end.character === 0 && selection.end.line > selection.start.line
            ? selection.end.line - 1
            : selection.end.line;
        const start = document.offsetAt(new vscode.Position(selection.start.line, 0));
        const end = document.offsetAt(document.lineAt(endLine).rangeIncludingLineBreak.end);
        return { start, end };
    });
}

async function changeSelectedHeadingLevels(
    editor: vscode.TextEditor,
    delta: HeadingLevelDelta,
): Promise<void> {
    if (editor.document.languageId !== "markdown") return;

    const selections = editor.selections.filter((selection) => !selection.isEmpty);
    if (selections.length === 0) {
        vscode.window.showInformationMessage("Markdown Formatter: No text selected.");
        return;
    }

    const document = editor.document;
    const source = document.getText();
    let edits;
    try {
        edits = collectHeadingLevelEdits(source, delta, selectionLineRanges(document, selections));
    } catch (err) {
        vscode.window.showErrorMessage(`Markdown Formatter: changing heading levels failed — ${(err as Error).message}`);
        return;
    }
    if (edits.length === 0) return;

    const applied = await editor.edit((editBuilder) => {
        for (const edit of edits) {
            editBuilder.replace(
                new vscode.Range(document.positionAt(edit.start), document.positionAt(edit.end)),
                edit.replacement,
            );
        }
    });

    if (!applied) {
        vscode.window.showErrorMessage("Markdown Formatter: could not apply heading level changes.");
    }
}

/** 将选区内的标题下沉一级（H1 → H2，依此类推）。 */
export async function cmdIndentSelectedHeadings(editor: vscode.TextEditor): Promise<void> {
    await changeSelectedHeadingLevels(editor, 1);
}

/** 将选区内的标题提升一级（H2 → H1，依此类推）。 */
export async function cmdOutdentSelectedHeadings(editor: vscode.TextEditor): Promise<void> {
    await changeSelectedHeadingLevels(editor, -1);
}
