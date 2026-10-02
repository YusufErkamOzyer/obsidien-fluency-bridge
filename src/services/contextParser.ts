import { Editor } from "obsidian";
import { ExtractedTarget } from "../types";

export class ContextParser {
  /**
   * Extracts the target expression and surrounding context sentence from the active editor.
   */
  static extractTarget(editor: Editor): ExtractedTarget | null {
    const selection = editor.getSelection();
    const cursor = editor.getCursor();
    const lineNum = cursor.line;
    const lineText = editor.getLine(lineNum);

    // 1. If user explicitly selected text, use selection
    if (selection && selection.trim().length > 0) {
      const from = editor.getCursor("from");
      const to = editor.getCursor("to");
      return {
        rawExpression: selection.trim(),
        fullSentence: lineText.trim() || selection.trim(),
        replaceRange: { from, to },
      };
    }

    // 2. Scan for bracketed expressions [like this] on the current line
    const regex = /\[([^\]]+)\]/g;
    let match: RegExpExecArray | null;
    const matches: Array<{
      fullMatch: string;
      innerContent: string;
      start: number;
      end: number;
      distanceToCursor: number;
    }> = [];

    while ((match = regex.exec(lineText)) !== null) {
      const start = match.index;
      const end = match.index + match[0].length;
      const innerContent = match[1];

      // Distance calculation from cursor.ch to the bracket span
      let distance = 0;
      if (cursor.ch < start) {
        distance = start - cursor.ch;
      } else if (cursor.ch > end) {
        distance = cursor.ch - end;
      } else {
        distance = 0; // Cursor is inside or at the edge of the brackets
      }

      matches.push({
        fullMatch: match[0],
        innerContent,
        start,
        end,
        distanceToCursor: distance,
      });
    }

    if (matches.length === 0) {
      return null;
    }

    // Sort by proximity to cursor: prioritize the one where cursor is inside or closest
    matches.sort((a, b) => a.distanceToCursor - b.distanceToCursor);
    const bestMatch = matches[0];

    return {
      rawExpression: bestMatch.innerContent,
      fullSentence: lineText.trim(),
      replaceRange: {
        from: { line: lineNum, ch: bestMatch.start },
        to: { line: lineNum, ch: bestMatch.end },
      },
    };
  }
}
