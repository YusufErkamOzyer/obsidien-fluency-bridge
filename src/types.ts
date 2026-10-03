export type LLMProvider = "groq" | "gemini" | "openrouter" | "custom";

export type HighlightStyle = "decorations" | "markdown" | "none";

export interface FlaggedItem {
  original: string;
  suggestion: string;
  reason: string;
}

/** A highlight persisted per note so it survives closing/reopening the note. */
export interface StoredHighlight {
  from: number;
  to: number;
  text: string; // exact text covered, used to re-locate the range if the note changed
  type: "replaced" | "nuance";
  tooltip: string;
}

export interface FluencyBridgeSettings {
  savedHighlights: Record<string, StoredHighlight[]>;
  provider: LLMProvider;
  apiKey: string;
  model: string;
  customEndpoint: string;
  vocabularyPath: string;
  autoLogVocabulary: boolean;
  enableSlangAlerts: boolean;
  enableNuanceTips: boolean;
  nativeLanguage: string;
  targetLanguage: string;
  highlightStyle: HighlightStyle;
  highlightReplacedText: boolean;
  highlightFlaggedNuances: boolean;
}

export const DEFAULT_SETTINGS: FluencyBridgeSettings = {
  savedHighlights: {},
  provider: "groq",
  apiKey: "",
  model: "llama-3.3-70b-versatile",
  customEndpoint: "https://api.groq.com/openai/v1/chat/completions",
  vocabularyPath: "Vocabulary.md",
  autoLogVocabulary: true,
  enableSlangAlerts: true,
  enableNuanceTips: true,
  nativeLanguage: "Turkish",
  targetLanguage: "English",
  highlightStyle: "decorations",
  highlightReplacedText: true,
  highlightFlaggedNuances: true,
};

export const PROVIDER_DEFAULTS: Record<
  LLMProvider,
  { endpoint: string; defaultModel: string; placeholderKey: string }
> = {
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "llama-3.3-70b-versatile",
    placeholderKey: "gsk_...",
  },
  gemini: {
    endpoint: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    defaultModel: "gemini-2.0-flash",
    placeholderKey: "AIzaSy...",
  },
  openrouter: {
    endpoint: "https://openrouter.ai/api/v1/chat/completions",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    placeholderKey: "sk-or-v1-...",
  },
  custom: {
    endpoint: "http://localhost:11434/v1/chat/completions",
    defaultModel: "llama3.1",
    placeholderKey: "Optional API Key",
  },
};

export interface ExtractedTarget {
  rawExpression: string; // The text inside [...] or selected text
  fullSentence: string;  // The sentence or line context
  replaceRange: {
    from: { line: number; ch: number };
    to: { line: number; ch: number };
  };
}

export interface TranslationResult {
  replacement: string;
  feedback?: string | null;
  warning?: string | null;
  flaggedItem?: FlaggedItem | null; // legacy single-item form
  flaggedItems?: FlaggedItem[];
  vocabItem?: {
    term: string;
    definition: string;
    example: string;
  } | null;
}
