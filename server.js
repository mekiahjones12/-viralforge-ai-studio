import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ========================================
// GEMINI CONFIG
// ========================================

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

// Primary model + fallbacks
const TEXT_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

const VIDEO_MODEL = "veo-3.1-generate-preview";

// Retry settings
const MAX_RETRIES_PER_MODEL = 2;
const RETRY_DELAY_MS = 2000;

// ========================================
// HELPERS
// ========================================

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getErrorStatus(error) {
  return (
    error?.status ||
    error?.code ||
    error?.error?.status ||
    error?.error?.code ||
    null
  );
}

function isTemporaryError(error) {
  const status = getErrorStatus(error);

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    error?.message?.includes("UNAVAILABLE") ||
    error?.message?.includes("overloaded") ||
    error?.message?.includes("high demand")
  );
}

// ========================================
// HEALTH
// ========================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "ViralForge AI Studio",
    version: "7.0.0",
    aiConfigured: Boolean(GEMINI_API_KEY),
    features: [
      "Gemini automatic retry",
      "Gemini automatic model fallback",
      "Veo 3.1 video generation"
    ],
    models: {
      text: TEXT_MODELS,
      video: VIDEO_MODEL
    },
    message: "ViralForge backend is running."
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(GEMINI_API_KEY),
    uptime: process.uptime()
  });
});

// ========================================
// GEMINI TEXT WITH RETRY + FALLBACK
// ========================================

async function askGemini(prompt) {
  if (!ai) {
    throw new Error(
      "GEMINI_API_KEY is not configured on Render."
    );
  }

  let lastError = null;

  // Try every model
  for (const model of TEXT_MODELS) {
    console.log(`Trying Gemini model: ${model}`);

    // Retry each model
    for (let attempt = 1; attempt <= MAX_RETRIES_PER_MODEL; attempt++) {
      try {
        console.log(
          `Gemini attempt ${attempt}/${MAX_RETRIES_PER_MODEL} using ${model}`
        );

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config: {
            thinkingConfig: {
              thinkingLevel: "low"
            }
          }
        });

        const text = response.text || "";

        if (!text.trim()) {
          throw new Error(
            `Gemini model ${model} returned an empty response.`
          );
        }

        console.log(`Gemini success using ${model}`);

        return {
          text,
          model
        };

      } catch (error) {
        lastError = error;

        console.error(
          `Gemini ${model} attempt ${attempt} failed:`,
          error?.message || error
        );

        // Don't waste time retrying permanent errors
        if (!isTemporaryError(error)) {
          throw error;
        }

        // Wait before retrying
        if (attempt < MAX_RETRIES_PER_MODEL) {
          const delay =
            RETRY_DELAY_MS * Math.pow(2, attempt - 1);

          console.log(
            `Temporary Gemini error. Retrying in ${delay}ms...`
          );

          await sleep(delay);
        }
      }
    }

    console.log(
      `Model ${model} unavailable. Moving to next fallback model...`
    );
  }

  throw new Error(
    `All Gemini models are temporarily unavailable. Last error: ${
      lastError?.message || "Unknown Gemini error"
    }`
  );
}

// ========================================
// MAIN GENERATOR
// ========================================

app.post("/api/generate", async (req, res) => {
  try {
    const {
      type = "scripts",
      topic = "",
      niche = "General",
      platform = "TikTok",
      style = "High Energy",
      length = "30 seconds",
      audience = "Everyone",
      tone = "Confident",
      goal = "Growth",
      text = ""
    } = req.body || {};

    let prompt = "";

    // ========================================
    // SCRIPTS
    // ========================================

    if (type === "scripts") {
      if (!topic.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Topic is required."
        });
      }

      prompt = `
You are ViralForge AI, an expert short-form content strategist.

Create 3 different short-form video scripts.

Topic: ${topic}
Niche: ${niche}
Platform: ${platform}
Style: ${style}
Length: ${length}
Audience: ${audience}
Tone: ${tone}
Goal: ${goal}

For each version include:

HOOK:
SETUP:
BODY:
PAYOFF:
CTA:

Make each script natural when spoken aloud.

Prioritize:
- a strong opening
- curiosity
- clear storytelling
- specific details
- retention
- a satisfying payoff
- a natural CTA

Do not guarantee views or virality.
`;
    }

    // ========================================
    // HOOKS
    // ========================================

    else if (type === "hooks") {
      if (!topic.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Topic is required."
        });
      }

      prompt = `
You are ViralForge Hook Lab.

Create exactly 12 short-form video hooks.

Topic: ${topic}
Niche: ${niche}
Style: ${style}

Use different approaches:
- curiosity
- questions
- surprising statements
- mistakes
- stories
- bold openings
- problems
- solutions

Number them 1 through 12.

Keep them short, natural, and easy to say.
Do not promise guaranteed views.
`;
    }

    // ========================================
    // IDEAS
    // ========================================

    else if (type === "ideas") {
      prompt = `
You are ViralForge Idea Lab.

Create exactly 20 original short-form content ideas.

Niche: ${niche}
Platform: ${platform}
Goal: ${goal}

For every idea include:

TITLE:
CONCEPT:
HOOK:
WHY IT COULD WORK:

Make every idea substantially different.

Avoid fake statistics and guaranteed-virality claims.
`;
    }

    // ========================================
    // CAPTIONS
    // ========================================

    else if (type === "caption") {
      if (!topic.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Topic is required."
        });
      }

      prompt = `
You are ViralForge Caption AI.

Create 5 different captions.

Topic: ${topic}
Tone: ${tone}
Platform: ${platform}
Niche: ${niche}

Make them natural, engaging, and appropriate for short-form content.

Number them 1 through 5.
Include a few relevant hashtags with each.
`;
    }

    // ========================================
    // SCORE
    // ========================================

    else if (type === "score") {
      if (!text.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Content is required."
        });
      }

      prompt = `
You are ViralForge's content scoring system.

Analyze this short-form content:

"""
${text}
"""

Score it from 0-100 based on:

- Hook strength
- Curiosity
- Specificity
- Clarity
- Retention potential
- CTA
- Overall structure

Return exactly:

SCORE: 0

HOOK: 0/100
CURIOSITY: 0/100
SPECIFICITY: 0/100
CLARITY: 0/100
RETENTION: 0/100
CTA: 0/100

STRENGTHS:
- ...

IMPROVEMENTS:
- ...

Do not claim the score predicts actual views.
`;
    }

    // ========================================
    // UNKNOWN TYPE
    // ========================================

    else {
      return res.status(400).json({
        ok: false,
        error: `Unknown AI type: ${type}`
      });
    }

    // ========================================
    // CALL GEMINI
    // ========================================

    const result = await askGemini(prompt);

    res.json({
      ok: true,
      result: result.text,
      model: result.model
    });

  } catch (error) {
    console.error("GEMINI ERROR:", error);

    res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Gemini request failed after retries and fallbacks."
    });
  }
});

// ========================================
// VEO 3.1 VIDEO GENERATOR
// ========================================

app.post("/api/video", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is not configured on Render."
      });
    }

    const {
      prompt,
      aspectRatio = "9:16"
    } = req.body || {};

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({
        ok: false,
        error: "Video prompt is required."
      });
    }

    if (!["9:16", "16:9"].includes(aspectRatio)) {
      return res.status(400).json({
        ok: false,
        error: "aspectRatio must be 9:16 or 16:9."
      });
    }

    console.log("Starting Veo 3.1 generation...");

    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL,
      prompt: prompt.trim(),
      config: {
        aspectRatio
      }
    });

    console.log("Veo operation started.");

    while (!operation.done) {
      await sleep(10000);

      operation = await ai.operations.getVideosOperation({
        operation
      });

      console.log("Checking Veo generation status...");
    }

    const generatedVideos =
      operation.response?.generatedVideos || [];

    if (!generatedVideos.length) {
      throw new Error(
        "Veo finished but did not return a video."
      );
    }

    const video = generatedVideos[0];

    res.json({
      ok: true,
      message: "Veo 3.1 video generated successfully.",
      video
    });

  } catch (error) {
    console.error("VEO ERROR:", error);

    res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Veo video generation failed."
    });
  }
});

// ========================================
// 404
// ========================================

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Endpoint not found."
  });
});

// ========================================
// ERROR HANDLER
// ========================================

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    ok: false,
    error: "Internal server error."
  });
});

// ========================================
// START
// ========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log("🔥 ViralForge AI Studio");
  console.log("================================");
  console.log(`Port: ${PORT}`);
  console.log(`Gemini configured: ${Boolean(GEMINI_API_KEY)}`);
  console.log(`Text models: ${TEXT_MODELS.join(", ")}`);
  console.log(`Video model: ${VIDEO_MODEL}`);
  console.log("Automatic retry: ENABLED");
  console.log("Automatic fallback: ENABLED");
  console.log("Server is running.");
});
