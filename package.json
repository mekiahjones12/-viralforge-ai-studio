import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: GEMINI_API_KEY })
  : null;

const TEXT_MODEL = "gemini-3.7-flash";
const VIDEO_MODEL = "veo-3.1-generate-preview";

// ========================================
// HEALTH
// ========================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "ViralForge AI Studio",
    version: "6.0.0",
    aiConfigured: Boolean(GEMINI_API_KEY),
    features: [
      "Gemini 3.7 Flash",
      "Veo 3.1 video generation"
    ],
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
// GEMINI TEXT
// ========================================

async function askGemini(prompt) {
  if (!ai) {
    throw new Error("GEMINI_API_KEY is not configured on Render.");
  }

  const response = await ai.models.generateContent({
    model: TEXT_MODEL,
    contents: prompt
  });

  return response.text || "";
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

    else {
      return res.status(400).json({
        ok: false,
        error: `Unknown AI type: ${type}`
      });
    }

    const result = await askGemini(prompt);

    res.json({
      ok: true,
      result
    });

  } catch (error) {
    console.error("GEMINI ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error?.message || "Gemini request failed."
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
      await new Promise(resolve => {
        setTimeout(resolve, 10000);
      });

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
      error: error?.message || "Veo video generation failed."
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
  console.log(`Text model: ${TEXT_MODEL}`);
  console.log(`Video model: ${VIDEO_MODEL}`);
  console.log("Server is running.");
});
