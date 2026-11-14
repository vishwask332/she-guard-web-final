import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const parsedBody =
      typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const rawText = typeof parsedBody?.text === "string" ? parsedBody.text.trim() : "";

    if (!rawText) {
      return res.status(400).json({
        error: "Please enter a short message or situation description to analyze.",
      });
    }
    if (rawText.length > 2000) {
      return res.status(400).json({
        error: "Text input must be 2,000 characters or fewer.",
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({
        error: "AI text analysis service is not configured. Manual SOS remains available.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: `Analyze the following text that a user voluntarily entered into a personal safety check tool:\n\n"""${rawText}"""`,
      config: {
        systemInstruction:
          "You are a calm, objective personal safety text classifier for SHE-GUARD. Evaluate ONLY the user-provided text for signals of distress, fear, coercion, stalking, entrapment, injury, or immediate emergency need. Never exaggerate calm or everyday messages. Return concise, plain-language guidance. Remind the user when high or moderate distress is detected that they may choose to activate Manual SOS or contact a trusted person—never imply automatic dispatch.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            distressLevel: { type: Type.STRING },
            detectedSignals: { type: Type.ARRAY, items: { type: Type.STRING } },
            summary: { type: Type.STRING },
            recommendedAction: { type: Type.STRING },
            suggestSosConfirmation: { type: Type.BOOLEAN },
          },
          required: [
            "distressLevel",
            "detectedSignals",
            "summary",
            "recommendedAction",
            "suggestSosConfirmation",
          ],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? "{}").trim());
    const allowedLevels = ["none", "low", "moderate", "high"];
    return res.status(200).json({
      distressLevel: allowedLevels.includes(parsed.distressLevel) ? parsed.distressLevel : "low",
      detectedSignals: Array.isArray(parsed.detectedSignals)
        ? parsed.detectedSignals.slice(0, 6).map(String)
        : [],
      summary: typeof parsed.summary === "string" ? parsed.summary.trim() : "Analysis completed.",
      recommendedAction:
        typeof parsed.recommendedAction === "string"
          ? parsed.recommendedAction.trim()
          : "Stay aware of your surroundings and use Manual SOS if you feel unsafe.",
      suggestSosConfirmation: Boolean(parsed.suggestSosConfirmation),
    });
  } catch (error) {
    console.error("Vercel AI distress analysis error:", error);
    return res.status(500).json({
      error: "Unable to complete AI text analysis right now. Manual SOS works independently.",
    });
  }
}
