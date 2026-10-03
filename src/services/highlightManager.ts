import { StateField, StateEffect, EditorState } from "@codemirror/state";
import { Decoration, DecorationSet, EditorView } from "@codemirror/view";
import { Editor, editorInfoField } from "obsidian";
import {
  ExtractedTarget,
  FlaggedItem,
  FluencyBridgeSettings,
  StoredHighlight,
  TranslationResult,
} from "../types";

export interface FluencyDecorationSpec {
  from: number;
  to: number;
  type: "replaced" | "nuance";
  tooltip: string;
  /** For nuance highlights: the correct form. The highlight is removed once the word equals it. */
  suggestion?: string;
}

export const addFluencyDecorations = StateEffect.define<FluencyDecorationSpec[]>();
export const clearFluencyDecorations = StateEffect.define<void>();

/** Case/space/punctuation-insensitive form used to compare a word with its suggested correction. */
export function normalizeForMatch(text: string): string {
  return (text || "")
    .trim()
    .replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

/** True when the edited text now equals the suggested correction. */
export function matchesSuggestion(text: string, suggestion?: string): boolean {
  const target = normalizeForMatch(suggestion ?? "");
  return target.length > 0 && normalizeForMatch(text) === target;
}

type MarkSpec = { class?: string; attributes?: { title?: string }; suggestion?: string };

function buildMark(spec: FluencyDecorationSpec) {
  return Decoration.mark({
    class: `fb-highlight fb-${spec.type}`,
    attributes: {
      title: spec.tooltip,
    },
    suggestion: spec.suggestion,
  });
}

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
    if (tr.docChanged) {
      const isNuance = (value: Decoration) =>
        ((value.spec as MarkSpec).class ?? "").includes("fb-nuance");

      // Nuance (typo) highlights are re-anchored by hand so partial edits keep them alive:
      //   - an edit inside / replacing the word keeps the highlight over the edited word,
      //   - typing right before or after the word does not extend it,
      //   - it is dropped only when the word now equals the suggested correction.
      const survivors: Array<ReturnType<Decoration["range"]>> = [];
      const iter = decorations.iter();
      while (iter.value) {
        if (isNuance(iter.value)) {
          const spec = iter.value.spec as MarkSpec;
          const from = tr.changes.mapPos(iter.from, 1);
          const to = tr.changes.mapPos(iter.to, -1);

          if (to > from) {
            const newText = tr.newDoc.sliceString(from, to);
            const oldText = tr.startState.doc.sliceString(iter.from, iter.to);
            const fixed = spec.suggestion
              ? matchesSuggestion(newText, spec.suggestion)
              : newText !== oldText; // legacy highlights saved without a suggestion
            if (!fixed) survivors.push(iter.value.range(from, to));
          }
        }
        iter.next();
      }

      decorations = decorations
        .update({ filter: (_from, _to, value) => !isNuance(value) })
        .map(tr.changes)
        .update({ add: survivors, sort: true });
    }

    for (const effect of tr.effects) {
      if (effect.is(addFluencyDecorations)) {
        const marks = effect.value
          .filter((spec) => spec.to > spec.from)
          .map((spec) => buildMark(spec).range(spec.from, spec.to));

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
 * Snapshot of all live highlights in an editor state, in a JSON-serializable form.
 */
export function extractStoredHighlights(state: EditorState): StoredHighlight[] {
  const set = state.field(fluencyHighlightField, false);
  const out: StoredHighlight[] = [];
  if (!set) return out;

  const iter = set.iter();
  while (iter.value) {
    const spec = iter.value.spec as {
      class?: string;
      attributes?: { title?: string };
      suggestion?: string;
    };
    out.push({
      from: iter.from,
      to: iter.to,
      text: state.doc.sliceString(iter.from, iter.to),
      type: spec.class?.includes("fb-nuance") ? "nuance" : "replaced",
      tooltip: spec.attributes?.title ?? "",
      suggestion: spec.suggestion,
    });
    iter.next();
  }
  return out;
}

/**
 * Re-locates persisted highlights inside the current document text.
 * If the text still sits at the stored offset it is used as-is; otherwise the nearest
 * occurrence of the same text is used. Highlights whose text no longer exists are dropped.
 */
export function resolveStoredHighlights(
  docText: string,
  stored: StoredHighlight[]
): FluencyDecorationSpec[] {
  const resolved: FluencyDecorationSpec[] = [];

  for (const h of stored) {
    if (!h.text) continue;

    let from = -1;
    if (docText.slice(h.from, h.from + h.text.length) === h.text) {
      from = h.from;
    } else {
      let best = -1;
      let bestDist = Infinity;
      let idx = docText.indexOf(h.text);
      while (idx !== -1) {
        const dist = Math.abs(idx - h.from);
        if (dist < bestDist) {
          best = idx;
          bestDist = dist;
        }
        idx = docText.indexOf(h.text, idx + 1);
      }
      from = best;
    }

    if (from < 0) continue;
    resolved.push({
      from,
      to: from + h.text.length,
      type: h.type,
      tooltip: h.tooltip,
      suggestion: h.suggestion,
    });
  }

  return resolved;
}

export interface HighlightUpdateLike {
  startState: EditorState;
  state: EditorState;
  docChanged: boolean;
  changes: { iterChangedRanges: (f: (fromA: number, toA: number) => void) => void };
  transactions: ReadonlyArray<{ effects: ReadonlyArray<StateEffect<any>> }>;
}

/**
 * Decides whether an editor update changed a note's highlights and, if so, reports a fresh snapshot.
 * Pure (apart from the callback) so it can be unit-tested without a DOM.
 */
export function handleHighlightUpdate(
  update: HighlightUpdateLike,
  onChange: (path: string, highlights: StoredHighlight[]) => void
) {
  const touchedHighlights = update.transactions.some((tr) =>
    tr.effects.some((e) => e.is(addFluencyDecorations) || e.is(clearFluencyDecorations))
  );
  if (!update.docChanged && !touchedHighlights) return;

  const before = update.startState.field(fluencyHighlightField, false)?.size ?? 0;
  const after = update.state.field(fluencyHighlightField, false)?.size ?? 0;
  if (before === 0 && after === 0) return;

  // Obsidian swaps the whole document when a different note is loaded into a reused editor.
  // That is not a user edit; saving here would wipe the highlights of the note.
  if (update.docChanged && !touchedHighlights) {
    const oldLen = update.startState.doc.length;
    let replacedWholeDoc = false;
    update.changes.iterChangedRanges((fromA, toA) => {
      if (oldLen > 0 && fromA === 0 && toA === oldLen) replacedWholeDoc = true;
    });
    if (replacedWholeDoc) return;
  }

  const file = update.state.field(editorInfoField, false)?.file;
  if (!file) return;

  onChange(file.path, extractStoredHighlights(update.state));
}

/**
 * Editor extension that reports every change of the highlight set together with the note path,
 * so the plugin can persist highlights and restore them after the note is closed and reopened.
 */
export function createHighlightPersistence(
  onChange: (path: string, highlights: StoredHighlight[]) => void
) {
  return EditorView.updateListener.of((update) => handleHighlightUpdate(update, onChange));
}

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
   * Finds EVERY occurrence of a word/phrase on a line.
   * Tolerates different whitespace, surrounding punctuation and letter case.
   * Whole-word matches are preferred; a plain substring match is used only if none exist.
   */
  static findAllInLine(lineText: string, word: string): Array<{ start: number; end: number }> {
    const cleaned = (word || "").trim().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, "");
    if (!cleaned) return [];

    const body = cleaned.split(/\s+/).map((part) => this.escapeRegex(part)).join("\\s+");

    const collect = (pattern: RegExp) => {
      const found: Array<{ start: number; end: number }> = [];
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(lineText)) !== null) {
        if (match[0].length === 0) {
          pattern.lastIndex++;
          continue;
        }
        found.push({ start: match.index, end: match.index + match[0].length });
      }
      return found;
    };

    const wholeWord = collect(
      new RegExp(`(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`, "giu")
    );
    if (wholeWord.length > 0) return wholeWord;

    return collect(new RegExp(body, "giu"));
  }

  /**
   * Collects all distinct flagged items from a result (new array form + legacy single form).
   */
  static collectFlaggedItems(result: TranslationResult): FlaggedItem[] {
    const all: FlaggedItem[] = [
      ...(result.flaggedItems ?? []),
      ...(result.flaggedItem ? [result.flaggedItem] : []),
    ];
    const seen = new Set<string>();
    const unique: FlaggedItem[] = [];
    for (const item of all) {
      const key = (item?.original ?? "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(item);
    }
    return unique;
  }

  /**
   * Computes the nuance decorations for a line: every occurrence of every flagged item,
   * never overlapping the replaced span or each other.
   */
  static computeNuanceSpecs(
    lineText: string,
    lineStartOffset: number,
    items: FlaggedItem[],
    occupied: Array<{ start: number; end: number }>
  ): FluencyDecorationSpec[] {
    const specs: FluencyDecorationSpec[] = [];
    const taken = [...occupied];
    const overlaps = (s: number, e: number) => taken.some((t) => s < t.end && e > t.start);

    for (const item of items) {
      const tooltip = `💡 Öneri: ${item.suggestion} (${item.reason || "İpucu"})`;
      for (const m of this.findAllInLine(lineText, item.original)) {
        if (overlaps(m.start, m.end)) continue;
        taken.push(m);
        specs.push({
          from: lineStartOffset + m.start,
          to: lineStartOffset + m.end,
          type: "nuance",
          tooltip,
          suggestion: item.suggestion,
        });
      }
    }
    return specs;
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

        // 2. Nuance / typo decorations: ALL flagged items, ALL their occurrences
        const items = this.collectFlaggedItems(result);
        if (highlightNuance && items.length > 0) {
          const lineNum = target.replaceRange.from.line;
          const lineText = editor.getLine(lineNum);
          const lineStartOffset = editor.posToOffset({ line: lineNum, ch: 0 });
          const replacedSpan = {
            start: target.replaceRange.from.ch,
            end: target.replaceRange.from.ch + textToInsert.length,
          };
          decos.push(
            ...this.computeNuanceSpecs(lineText, lineStartOffset, items, [replacedSpan])
          );
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
   * Re-applies persisted highlights to an editor (used after a note is reopened).
   * Returns the number of highlights applied; does nothing if the editor already shows highlights.
   */
  static restoreToEditor(editor: Editor, stored: StoredHighlight[]): number {
    const editorView = getEditorView(editor);
    if (!editorView || stored.length === 0) return 0;

    const current = editorView.state.field(fluencyHighlightField, false);
    if (!current || current.size > 0) return 0;

    const specs = resolveStoredHighlights(editorView.state.doc.toString(), stored);
    if (specs.length === 0) return 0;

    editorView.dispatch({ effects: [addFluencyDecorations.of(specs)] });
    return specs.length;
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
