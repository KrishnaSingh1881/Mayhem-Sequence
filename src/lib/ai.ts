import crypto from "crypto";

const GEMMA_API_URL = process.env.GEMMA_API_URL || "http://localhost:11434/api/chat";
const GEMMA_MODEL = process.env.GEMMA_MODEL || "gemma2";

export async function callAI(systemPrompt: string, userContent: string): Promise<string> {
  try {
    const response = await fetch(GEMMA_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service returned ${response.status}`);
    }

    const data = await response.json();
    
    // Handle both Ollama /api/chat and OpenAI-compatible response structures
    const text = data.message?.content || data.choices?.[0]?.message?.content || "";
    
    if (!text) {
      throw new Error("AI service returned an empty response");
    }

    return text;
  } catch (error) {
    console.error("AI call error:", error);
    throw new Error("AI service unavailable");
  }
}

export function hashInput(data: object): string {
  const str = JSON.stringify(data);
  return crypto.createHash("md5").update(str).digest("hex");
}
