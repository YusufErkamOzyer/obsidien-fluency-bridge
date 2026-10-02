import { StateField, StateEffect } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { Editor } from "obsidian";
import {
  ExtractedTarget,
  FluencyBridgeSettings,
  TranslationResult,
} from "../types";

export interface FluencyDecorationSpec {
  from: number;
  to: number;
  type: "replaced" | "nuance";
  tooltip: string;
}

export const addFluencyDecorations = StateEffect.define<FluencyDecorationSpec[]>();
export const clearFluencyDecorations = StateEffect.define<void>();

/**
 * CodeMirror 6 Editor Extension:
 * Applies visual styling and hover tooltips directly in the editor DOM without adding
 * any HTML tags or characters into the underlying Markdown file.
 */
export const fluencyHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // Automatically adjust ranges as user types or modifies text
    decorations = decorations.map(tr.changes);

    for (const effect of tr.effects) {
      if (effect.is(addFluencyDecorations)) {
        const marks = effect.value.map((spec) =>
          Decoration.mark({
            class: `fb-highlight fb-${spec.type}`,
            attributes: {
              title: spec.tooltip,
            },
          }).range(spec.from, spec.to)
        );

        decorations = decorations.update({
          add: marks,
          sort: true,
        });
      } else if (effect.is(clearFluencyDecorations)) {
        decorations = Decoration.none;
      }
    }

    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

/**
 * Safely extracts the CodeMirror 6 EditorView instance from an Obsidian Editor.
 */
export function getEditorView(editor: Editor): EditorView | null {
  if (!editor) return null;
  if ((editor as any).cm instanceof EditorView) {
    return (editor as any).cm;
  }
  if ((editor as any).editor?.cm instanceof EditorView) {
    return (editor as any).editor.cm;
  }
  if ((editor as any).cm && typeof (editor as any).cm.dispatch === "function") {
    return (editor as any).cm as EditorView;
  }
  return null;
}

export class HighlightManager {
  static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Searches for a target word/phrase on a given line while avoiding specified character spans.
   */
  static findWordInLine(
    lineText: string,
    word: string,
    options?: { excludeRange?: { start: number; end: number } }
  ): { start: number; end: number } | null {
    if (!word || !word.trim()) return null;

    const raw = word.trim();
    const escaped = this.escapeRegex(raw);

    const tryPattern = (pattern: RegExp) => {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(lineText)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;

        if (options?.excludeRange) {
          const { start, end } = options.excludeRange;
          if (matchStart < end && matchEnd > start) {
            continue;
          }
        }

        return { start: matchStart, end: matchEnd };
      }
      return null;
    };

    // 1. Try matching with word boundary first
    const wbResult = tryPattern(new RegExp(`\\b${escaped}\\b`, "gi"));
    if (wbResult) return wbResult;

    // 2. Fallback to exact substring match
    return tryPattern(new RegExp(escaped, "gi"));
  }

  /**
   * Applies the translation to the editor text cleanly (ZERO HTML tags)
   * and dispatches visual CodeMirror 6 editor decorations for replaced & nuance words.
   */
  static applyToEditor(
    editor: Editor,
    target: ExtractedTarget,
    result: TranslationResult,
    settings: FluencyBridgeSettings
  ): { cursorCh: number; line: number } {
    const style = settings.highlightStyle || "decorations";
    const highlightReplaced = settings.highlightReplacedText ?? true;
    const highlightNuance = settings.highlightFlaggedNuances ?? true;

    // The text to insert into the document: purely natural text (or ==text== if user explicitly chose markdown)
    let textToInsert = result.replacement;
    if (style === "markdown" && highlightReplaced) {
      textToInsert = `==${result.replacement}==`;
    }

    const fromOffset = editor.posToOffset(target.replaceRange.from);

    // Replace bracketed text in the document with clean replacement
    editor.replaceRange(
      textToInsert,
      target.replaceRange.from,
      target.replaceRange.to
    );

    const toOffset = fromOffset + textToInsert.length;
    const newCursorPos = editor.offsetToPos(toOffset);
    editor.setCursor(newCursorPos);

    // Apply CodeMirror 6 visual decorations (no text pollution)
    if (style === "decorations") {
      const editorView = getEditorView(editor);
      if (editorView) {
        const decos: FluencyDecorationSpec[] = [];

        // 1. Replaced expression decoration
        if (highlightReplaced) {
          decos.push({
            from: fromOffset,
            to: toOffset,
            type: "replaced",
            tooltip: `Orijinal: [${target.rawExpression}]`,
          });
        }

        // 2. Nuance / Typo flagged word decoration
        if (highlightNuance && result.flaggedItem?.original) {
          const lineNum = target.replaceRange.from.line;
          const lineText = editor.getLine(lineNum);
          const match = this.findWordInLine(lineText, result.flaggedItem.original, {
            excludeRange: {
              start: target.replaceRange.from.ch,
              end: target.replaceRange.from.ch + textToInsert.length,
            },
          });

          if (match) {
            const nuanceFrom = editor.posToOffset({ line: lineNum, ch: match.start });
            const nuanceTo = editor.posToOffset({ line: lineNum, ch: match.end });
            decos.push({
              from: nuanceFrom,
              to: nuanceTo,
              type: "nuance",
              tooltip: `💡 Öneri: ${result.flaggedItem.suggestion} (${result.flaggedItem.reason || "İpucu"})`,
            });
          }
        }

        if (decos.length > 0) {
          editorView.dispatch({
            effects: [addFluencyDecorations.of(decos)],
          });
        }
      }
    }

    return { cursorCh: newCursorPos.ch, line: newCursorPos.line };
  }

  /**
   * Clears CodeMirror 6 editor decorations and any legacy HTML marks.
   */
  static clearHighlights(editor: Editor): { legacyRemovedCount: number } {
    // 1. Clear CodeMirror 6 Decorations
    const editorView = getEditorView(editor);
    if (editorView) {
      editorView.dispatch({
        effects: [clearFluencyDecorations.of()],
      });
    }

    // 2. Also strip any legacy <mark class="fb-..."> tags from file content if present
    const content = editor.getValue();
    const regex = /<mark\s+class="[^"]*fb-(?:highlight|replaced|nuance)[^"]*"[^>]*>([\s\S]*?)<\/mark>/gi;
    let legacyRemovedCount = 0;
    const cleaned = content.replace(regex, (_match, group1) => {
      legacyRemovedCount++;
      return group1;
    });

    if (legacyRemovedCount > 0) {
      editor.setValue(cleaned);
    }

    return { legacyRemovedCount };
  }
}
