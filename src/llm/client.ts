import { FluencyBridgeSettings, PROVIDER_DEFAULTS, TranslationResult } from "../types";

export class LLMClient {
  private settings: FluencyBridgeSettings;

  constructor(settings: FluencyBridgeSettings) {
    this.settings = settings;
  }

  updateSettings(settings: FluencyBridgeSettings) {
    this.settings = settings;
  }

  private getEndpoint(): string {
    if (this.settings.provider === "custom" && this.settings.customEndpoint.trim()) {
      return this.settings.customEndpoint.trim();
    }
    return PROVIDER_DEFAULTS[this.settings.provider].endpoint;
  }

  private getModel(): string {
    if (this.settings.model.trim()) {
      return this.settings.model.trim();
    }
    return PROVIDER_DEFAULTS[this.settings.provider].defaultModel;
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      const endpoint = this.getEndpoint();
      const model = this.getModel();
      const apiKey = this.settings.apiKey.trim();

      if (!apiKey && this.settings.provider !== "custom") {
        return {
          success: false,
          message: "API Key boş olamaz. Lütfen geçerli bir anahtar girin.",
        };
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }

      if (this.settings.provider === "openrouter") {
        headers["HTTP-Referer"] = "https://obsidian.md";
        headers["X-Title"] = "Obsidian Fluency Bridge";
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: "Reply with 'OK' if you hear me." }],
          max_tokens: 100,
          temperature: 0.1,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        return {
          success: false,
          message: `API Hatası (${res.status}): ${errorText.slice(0, 200)}`,
        };
      }

      return {
        success: true,
        message: `Bağlantı başarılı! (${this.settings.provider.toUpperCase()} - ${model})`,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Bağlantı kurulamadı: ${msg}` };
    }
  }

  async translateInFlow(
    expression: string,
    contextSentence: string
  ): Promise<TranslationResult> {
    const endpoint = this.getEndpoint();
    const model = this.getModel();
    const apiKey = this.settings.apiKey.trim();

    if (!apiKey && this.settings.provider !== "custom") {
      throw new Error(
        "Fluency Bridge API Anahtarı ayarlanmamış! Lütfen Eklenti Ayarlarından API anahtarınızı girin."
      );
    }

    const systemPrompt = `You are Fluency Bridge, an expert bilingual writing coach specialized in helping users write natural, fluent, and idiomatic ${this.settings.targetLanguage} while thinking in ${this.settings.nativeLanguage}.

The user is writing in ${this.settings.targetLanguage}, but hit a mental roadblock and wrote a phrase or word in [brackets] in ${this.settings.nativeLanguage}.

Your goals:
1. Provide the most natural, idiomatic, and contextually accurate ${this.settings.targetLanguage} replacement that fits seamlessly into the sentence's grammar, rhythm, and tone.
2. CONSTRUCTIVE FLUENCY & NUANCE COACHING:
   - Review the surrounding sentence for any typos (misspellings), unnatural collocations, or phrasing that could be expressed more clearly or idiomatically.
   - If there is a typo (e.g. "hearth" instead of "heart") or a phrase that would sound significantly more natural (e.g. "do research" instead of "make research"):
     a) Provide a friendly, concise, and constructive tip in Turkish in the "feedback" field (e.g. "İpucu: Cümledeki 'make research' yerine 'do research' kullanımı daha doğaldır.").
     b) Populate the "flaggedItem" object with:
        - "original": the EXACT substring as it appears in the user's sentence (e.g. "hearth" or "make research")
        - "suggestion": the improved target language word or phrase (e.g. "heart" or "do research")
        - "reason": concise reason in Turkish (e.g. "Yazım hatası" or "Doğal eşdizim")
   - If the sentence is already completely natural and error-free, set "feedback" to null and "flaggedItem" to null.
   - Do NOT lecture or moralize about tone or intent. Focus purely on constructive writing polish, clarity, and linguistic nuances.
3. Extract the key vocabulary item (word or collocation phrase) to add to the user's active vocabulary list.

You MUST respond strictly with valid JSON conforming to this schema (no markdown fences, no extra text):
{
  "replacement": "exact replacement string for inside or including the brackets",
  "feedback": "Optional concise, constructive tip in Turkish about typos, phrasing improvements, or nuance, or null",
  "flaggedItem": {
    "original": "exact word or phrase from the sentence that has a typo or unnatural usage",
    "suggestion": "improved word or phrase",
    "reason": "kısa açıklama (örn: Yazım hatası veya Doğal eşdizim)"
  },
  "vocabItem": {
    "term": "the key target language word or idiom",
    "definition": "Türkçe anlamı ve kullanım notu",
    "example": "the full sentence with the replacement applied"
  }
}`;

    const userPrompt = `Context Sentence: "${contextSentence}"
Bracketed/Target Expression: "${expression}"

Provide the natural replacement to substitute the bracketed text directly.`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    if (this.settings.provider === "openrouter") {
      headers["HTTP-Referer"] = "https://obsidian.md";
      headers["X-Title"] = "Obsidian Fluency Bridge";
    }

    const payload: Record<string, unknown> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 1024,
      response_format: { type: "json_object" },
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM API Hatası [${res.status}]: ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("Modelden boş yanıt alındı.");
    }

    let parsed: TranslationResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Fallback if model wraps in code fences or has formatting issues
      const cleaned = content.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
      parsed = JSON.parse(cleaned);
    }

    parsed.feedback = parsed.feedback || parsed.warning || null;
    if (parsed.flaggedItem) {
      if (
        typeof parsed.flaggedItem !== "object" ||
        !parsed.flaggedItem.original ||
        !parsed.flaggedItem.suggestion
      ) {
        parsed.flaggedItem = null;
      }
    } else {
      parsed.flaggedItem = null;
    }
    return parsed;
  }
}
