const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ACTION_SYSTEM_PROMPTS = {
  chat: "You are Code Studio AI, an expert software engineer and pair programmer. You provide concise, accurate, and high-quality programming assistance with clean code snippets and clear explanations.",
  explain: "You are Code Studio AI. Explain the provided code clearly and concisely. Highlight the core algorithm, control flow, inputs, outputs, and any important edge cases. Use clear bullet points and code references.",
  debug: "You are Code Studio AI. Perform a thorough code review to find bugs, security flaws, off-by-one errors, or performance bottlenecks. Clearly explain the issue and provide the corrected code.",
  optimize: "You are Code Studio AI. Refactor and optimize the provided code for runtime efficiency, memory usage, and modern idiomatic cleanliness. Explain each optimization made.",
  test: "You are Code Studio AI. Write clean, comprehensive unit tests for the provided code. Cover typical usage, boundary cases, and error conditions using idiomatic testing frameworks.",
  generate: "You are Code Studio AI. Generate clean, modular, production-ready code fulfilling the user prompt. Include type definitions or docstrings where appropriate.",
};

export async function generateAIResponse({
  prompt = "",
  code = "",
  language = "javascript",
  action = "chat",
  history = [],
  apiKey = process.env.GEMINI_API_KEY,
  model = DEFAULT_MODEL,
} = {}) {
  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is not configured on the server. Please add your GEMINI_API_KEY to your server environment variables.");
    error.status = 503;
    throw error;
  }

  const trimmedPrompt = typeof prompt === "string" ? prompt.trim() : "";
  const trimmedCode = typeof code === "string" ? code.trim() : "";

  if (!trimmedPrompt && !trimmedCode) {
    const error = new Error("Please provide a prompt or code context for the AI assistant.");
    error.status = 400;
    throw error;
  }

  const systemInstruction = ACTION_SYSTEM_PROMPTS[action] || ACTION_SYSTEM_PROMPTS.chat;

  let userContent = trimmedPrompt;
  if (trimmedCode) {
    userContent = trimmedPrompt
      ? `${trimmedPrompt}\n\nLanguage: ${language}\n\`\`\`${language}\n${trimmedCode}\n\`\`\``
      : `Language: ${language}\n\`\`\`${language}\n${trimmedCode}\n\`\`\``;
  }

  // Format previous history messages if provided (up to last 6 for context)
  const contents = [];
  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      if (msg && typeof msg.content === "string" && (msg.role === "user" || msg.role === "assistant")) {
        contents.push({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        });
      }
    }
  }

  contents.push({
    role: "user",
    parts: [{ text: userContent }],
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(25000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || `Gemini API returned status ${response.status}`;
      const err = new Error(message);
      err.status = response.status === 429 ? 429 : 502;
      throw err;
    }

    const data = await response.json();
    const candidate = data?.candidates?.[0];
    const textPart = candidate?.content?.parts?.[0]?.text;

    if (!textPart) {
      throw new Error("No response received from the AI model.");
    }

    return {
      ok: true,
      text: textPart,
      model,
      action,
    };
  } catch (error) {
    if (error.name === "TimeoutError") {
      const timeoutError = new Error("The AI service request timed out. Please try again.");
      timeoutError.status = 504;
      throw timeoutError;
    }
    throw error;
  }
}
