export type LLMProvider = "groq" | "gemini" | "openrouter" | "custom";

export interface FluencyBridgeSettings {
  provider: LLMProvider;
  apiKey: string;
  model: string;
  customEndpoint: string;
  vocabularyPath: string;
  autoLogVocabulary: boolean;
  enableNuanceTips: boolean;
  enableSlangAlerts?: boolean; // backwards compatibility
  nativeLanguage: string;
  targetLanguage: string;
}

export const DEFAULT_SETTINGS: FluencyBridgeSettings = {
  provider: "groq",
  apiKey: "",
  model: "openai/gpt-oss-120b",
  customEndpoint: "https://api.groq.com/openai/v1/chat/completions",
  vocabularyPath: "Vocabulary.md",
  autoLogVocabulary: true,
  enableNuanceTips: true,
  nativeLanguage: "Turkish",
  targetLanguage: "English",
};

export const PROVIDER_DEFAULTS: Record<
  LLMProvider,
  { endpoint: string; defaultModel: string; placeholderKey: string }
> = {
  groq: {
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    defaultModel: "openai/gpt-oss-120b",
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
  warning?: string | null; // backwards compatibility
  vocabItem?: {
    term: string;
    definition: string;
    example: string;
  } | null;
}
