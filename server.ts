import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

const EXPORT_EXCLUDE_DIRS = new Set([
  "node_modules",
  "dist",
  "exports",
  ".git",
  ".vercel",
  "build",
  "coverage",
]);

const EXPORT_EXCLUDE_FILES = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".DS_Store",
]);

function addDirectoryToZip(zip: JSZip, rootDir: string, currentDir: string) {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXPORT_EXCLUDE_DIRS.has(entry.name)) continue;
      addDirectoryToZip(zip, rootDir, path.join(currentDir, entry.name));
    } else if (entry.isFile()) {
      if (
        EXPORT_EXCLUDE_FILES.has(entry.name) ||
        (entry.name.startsWith(".env.") && entry.name !== ".env.example") ||
        entry.name.endsWith(".log")
      ) {
        continue;
      }
      const fullPath = path.join(currentDir, entry.name);
      const relPath = path.relative(rootDir, fullPath).split(path.sep).join("/");
      zip.file(relPath, fs.readFileSync(fullPath));
    }
  }
}

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "she-guard-api" });
  });

  app.get("/api/export/download", async (_req, res) => {
    try {
      const zip = new JSZip();
      addDirectoryToZip(zip, __dirname, __dirname);
      const buffer = await zip.generateAsync({
        type: "nodebuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
      });
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Disposition", 'attachment; filename="she-guard-web.zip"');
      res.setHeader("Content-Length", String(buffer.length));
      return res.send(buffer);
    } catch (error) {
      console.error("ZIP export generation failed:", error);
      return res.status(500).json({ error: "Failed to generate project ZIP archive." });
    }
  });

  app.post("/api/ai/analyze-distress", async (req, res) => {
    try {
      const rawText = typeof req.body?.text === "string" ? req.body.text.trim() : "";

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

      const ai = getGeminiClient();
      if (!ai) {
        return res.status(503).json({
          error: "AI text analysis service is not configured yet. Manual SOS remains fully available.",
        });
      }

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
              distressLevel: {
                type: Type.STRING,
                description: "Must be one of: none, low, moderate, high",
              },
              detectedSignals: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Short phrases describing observed distress or safety signals, or empty if none.",
              },
              summary: {
                type: Type.STRING,
                description: "A 1-2 sentence calm explanation of what the text indicates.",
              },
              recommendedAction: {
                type: Type.STRING,
                description: "Practical, non-alarmist next step for the user.",
              },
              suggestSosConfirmation: {
                type: Type.BOOLEAN,
                description: "True if moderate or high distress/fear/emergency language is present and SOS review is recommended.",
              },
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

      const jsonText = (response.text ?? "{}").trim();
      const parsed = JSON.parse(jsonText);

      const allowedLevels = ["none", "low", "moderate", "high"];
      const distressLevel = allowedLevels.includes(parsed.distressLevel)
        ? parsed.distressLevel
        : "low";

      return res.json({
        distressLevel,
        detectedSignals: Array.isArray(parsed.detectedSignals)
          ? parsed.detectedSignals.slice(0, 6).map(String)
          : [],
        summary:
          typeof parsed.summary === "string" && parsed.summary.trim()
            ? parsed.summary.trim()
            : "Analysis completed.",
        recommendedAction:
          typeof parsed.recommendedAction === "string" && parsed.recommendedAction.trim()
            ? parsed.recommendedAction.trim()
            : "Stay aware of your surroundings and use Manual SOS if you feel unsafe.",
        suggestSosConfirmation: Boolean(parsed.suggestSosConfirmation),
      });
    } catch (error) {
      console.error("AI distress analysis failed:", error);
      return res.status(500).json({
        error:
          "Unable to complete AI text analysis right now. Manual SOS and trusted contact outreach work independently.",
      });
    }
  });

  if (isProduction) {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== "true",
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SHE-GUARD server listening on http://0.0.0.0:${PORT}`);
  });
}

createApp();
