import { Editor } from "obsidian";
import {
  ExtractedTarget,
  FlaggedItem,
  FluencyBridgeSettings,
  HighlightStyle,
  TranslationResult,
} from "../types";

export class HighlightManager {
  /**
   * Safely escapes HTML special characters to prevent attribute and content corruption.
   */
  static escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /**
   * Escapes special characters for RegExp matching.
   */
  static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * Formats the replaced expression according to selected highlight style.
   */
  static formatReplacement(
    replacement: string,
    rawOriginal: string,
    style: HighlightStyle,
    enabled: boolean
  ): string {
    if (!enabled || style === "none") {
      return replacement;
    }

    if (style === "html") {
      const tooltip = `Orijinal: [${this.escapeHtml(rawOriginal)}]`;
      return `<mark class="fb-highlight fb-replaced" title="${tooltip}">${this.escapeHtml(replacement)}</mark>`;
    }

    if (style === "markdown") {
      return `==${replacement}==`;
    }

    return replacement;
  }

  /**
   * Formats a flagged nuance or typo word according to selected highlight style.
   */
  static formatNuance(
    word: string,
    suggestion: string,
    reason: string,
    style: HighlightStyle
  ): string {
    if (style === "html") {
      const tooltip = `💡 Öneri: ${this.escapeHtml(suggestion)} (${this.escapeHtml(reason || "İpucu")})`;
      return `<mark class="fb-highlight fb-nuance" title="${tooltip}">${this.escapeHtml(word)}</mark>`;
    }

    if (style === "markdown") {
      return `==${word}==`;
    }

    return word;
  }

  /**
   * Searches for a word or phrase in text that is NOT located inside existing HTML tags.
   */
  static findMatchOutsideTags(text: string, word: string): RegExpExecArray | null {
    if (!word || !word.trim()) return null;

    const escaped = this.escapeRegex(word.trim());

    // Gather ranges of existing HTML tags
    const tagRegex = /<[^>]+>/g;
    const tagSpans: Array<{ start: number; end: number }> = [];
    let tagMatch: RegExpExecArray | null;
    while ((tagMatch = tagRegex.exec(text)) !== null) {
      tagSpans.push({
        start: tagMatch.index,
        end: tagMatch.index + tagMatch[0].length,
      });
    }

    const checkMatch = (pattern: RegExp): RegExpExecArray | null => {
      let m: RegExpExecArray | null;
      while ((m = pattern.exec(text)) !== null) {
        const mStart = m.index;
        const mEnd = mStart + m[0].length;
        const isInsideTag = tagSpans.some(
          (span) => mStart < span.end && mEnd > span.start
        );
        if (!isInsideTag) {
          return m;
        }
      }
      return null;
    };

    // 1. Try word-boundary match first
    const wordBoundaryPattern = new RegExp(`\\b${escaped}\\b`, "gi");
    const wbMatch = checkMatch(wordBoundaryPattern);
    if (wbMatch) return wbMatch;

    // 2. Fallback to generic substring match
    const fallbackPattern = new RegExp(escaped, "gi");
    return checkMatch(fallbackPattern);
  }

  /**
   * Replaces the first occurrence of flagged word in text with the formatted nuance highlight.
   */
  static highlightNuanceInString(
    text: string,
    flagged: FlaggedItem,
    style: HighlightStyle
  ): { updatedText: string; matched: boolean } {
    if (!flagged.original || !flagged.original.trim()) {
      return { updatedText: text, matched: false };
    }

    const match = this.findMatchOutsideTags(text, flagged.original);
    if (!match || match.index === undefined) {
      return { updatedText: text, matched: false };
    }

    const matchedStr = match[0];
    const start = match.index;
    const end = start + matchedStr.length;

    const formatted = this.formatNuance(
      matchedStr,
      flagged.suggestion,
      flagged.reason,
      style
    );

    const updatedText = text.slice(0, start) + formatted + text.slice(end);
    return { updatedText, matched: true };
  }

  /**
   * Applies the translation and optional nuance highlighting cleanly to the active editor.
   */
  static applyToEditor(
    editor: Editor,
    target: ExtractedTarget,
    result: TranslationResult,
    settings: FluencyBridgeSettings
  ): { cursorCh: number; line: number } {
    const isSingleLine = target.replaceRange.from.line === target.replaceRange.to.line;
    const style = settings.highlightStyle || "html";
    const highlightReplaced = settings.highlightReplacedText ?? true;
    const highlightNuance = settings.highlightFlaggedNuances ?? true;

    const formattedReplacement = this.formatReplacement(
      result.replacement,
      target.rawExpression,
      style,
      highlightReplaced
    );

    if (isSingleLine) {
      const lineNum = target.replaceRange.from.line;
      const lineText = editor.getLine(lineNum);
      const fromCh = target.replaceRange.from.ch;
      const toCh = target.replaceRange.to.ch;

      let prefix = lineText.slice(0, fromCh);
      let suffix = lineText.slice(toCh);

      if (highlightNuance && result.flaggedItem && style !== "none") {
        const prefixRes = this.highlightNuanceInString(
          prefix,
          result.flaggedItem,
          style
        );
        if (prefixRes.matched) {
          prefix = prefixRes.updatedText;
        } else {
          const suffixRes = this.highlightNuanceInString(
            suffix,
            result.flaggedItem,
            style
          );
          if (suffixRes.matched) {
            suffix = suffixRes.updatedText;
          }
        }
      }

      const newLine = prefix + formattedReplacement + suffix;
      editor.setLine(lineNum, newLine);

      const cursorCh = prefix.length + formattedReplacement.length;
      editor.setCursor({ line: lineNum, ch: cursorCh });
      return { cursorCh, line: lineNum };
    } else {
      // Multi-line replacement fallback
      editor.replaceRange(
        formattedReplacement,
        target.replaceRange.from,
        target.replaceRange.to
      );
      const cursorCh = target.replaceRange.from.ch + formattedReplacement.length;
      editor.setCursor({ line: target.replaceRange.from.line, ch: cursorCh });
      return { cursorCh, line: target.replaceRange.from.line };
    }
  }

  /**
   * Strips all Fluency Bridge highlight marks (<mark class="...fb-...">) from a given string.
   */
  static stripHighlights(content: string): { cleaned: string; count: number } {
    const regex = /<mark\s+class="[^"]*fb-(?:highlight|replaced|nuance)[^"]*"[^>]*>([\s\S]*?)<\/mark>/gi;
    let count = 0;
    const cleaned = content.replace(regex, (_match, group1) => {
      count++;
      return group1;
    });
    return { cleaned, count };
  }
}
