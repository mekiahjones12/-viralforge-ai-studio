import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: GEMINI_API_KEY
    })
  : null;

// ========================================
// HEALTH
// ========================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "ViralForge AI Studio",
    version: "5.0.0",
    aiConfigured: Boolean(GEMINI_API_KEY),
    features: [
      "Gemini text generation",
      "Veo 3.1 video generation"
    ],
    message: "ViralForge Gemini backend is running."
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
    throw new Error(
      "GEMINI_API_KEY is not configured on the server."
    );
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: prompt
  });

  return response.text || "";
}

// ========================================
// MAIN AI GENERATOR
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

    // ====================================
    // SCRIPTS
    // ====================================

    if (type === "scripts") {
      if (!topic.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Topic is required."
        });
      }

      prompt = `
You are ViralForge AI, an expert short-form content strategist.

Create 3 highly different short-form video scripts.

Topic: ${topic}
Niche: ${niche}
Platform: ${platform}
Style: ${style}
Length: ${length}
Audience: ${audience}
Tone: ${tone}
Goal: ${goal}

For every script use:

HOOK:
SETUP:
BODY:
PAYOFF:
CTA:

Make the scripts sound natural when spoken aloud.

Prioritize:
- strong first 2 seconds
- curiosity
- clear storytelling
- natural language
- retention
- specific details
- an engaging ending

Do not claim that anything is guaranteed to go viral.
`;

    // ====================================
    // HOOKS
    // ====================================

    } else if (type === "hooks") {
      if (!topic.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Topic is required."
        });
      }

      prompt = `
You are ViralForge Hook Lab.

Create exactly 12 strong short-form video hooks.

Topic: ${topic}
Niche: ${niche}
Platform: ${platform}
Style: ${style}

Use different approaches including:
- curiosity
- questions
- unexpected statements
- mistakes
- stories
- controversial-but-safe ideas
- problems
- solutions
- challenges
- surprising facts

Number them 1 through 12.

Keep each hook short enough to say naturally.

Do not promise guaranteed views.
`;

    // ====================================
    // IDEAS
    // ====================================

    } else if (type === "ideas") {

      prompt = `
You are ViralForge Idea Lab.

Create exactly 20 original short-form content ideas.

Niche: ${niche}
Platform: ${platform}
Goal: ${goal}
Audience: ${audience}

For every idea include:

TITLE:
CONCEPT:
HOOK:
WHY IT COULD WORK:

Make every idea substantially different.

Avoid fake statistics and guaranteed-virality claims.
`;

    // ====================================
    // CAPTIONS
    // ====================================

    } else if (type === "caption") {

      if (!topic.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Topic is required."
        });
      }

      prompt = `
You are ViralForge Caption AI.

Create 5 different captions for:

Topic: ${topic}
Tone: ${tone}
Platform: ${platform}
Niche: ${niche}

Make them:
- natural
- engaging
- short-form friendly
- easy to read
- appropriate for the platform

Number them 1 through 5.

Include a few relevant hashtags with each.
`;

    // ====================================
    // SCORE
    // ====================================

    } else if (type === "score") {

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

Score it from 0-100 using:

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

    } else {

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
// VEO 3.1 VIDEO GENERATION
// ========================================

app.post("/api/video", async (req, res) => {
  try {
    if (!ai) {
      return res.status(500).json({
        ok: false,
        error: "GEMINI_API_KEY is not configured."
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

    console.log("Starting Veo 3.1 generation...");

    let operation = await ai.models.generateVideos({
      model: "veo-3.1-generate-preview",
      prompt: prompt.trim(),
      config: {
        aspectRatio
      }
    });

    console.log("Veo operation started.");

    // Poll until finished
    while (!operation.done) {
      await new Promise(resolve =>
        setTimeout(resolve, 10000)
      );

      operation = await ai.operations.getVideosOperation(
        operation
      );

      console.log("Checking Veo status...");
    }

    if (
      !operation.response ||
      !operation.response.generatedVideos ||
      operation.response.generatedVideos.length === 0
    ) {
      throw new Error("Veo did not return a generated video.");
    }

    const generatedVideo =
      operation.response.generatedVideos[0];

    res.json({
      ok: true,
      message: "Video generated successfully.",
      video: generatedVideo
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
// START SERVER
// ========================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log("🔥 ViralForge AI Studio");
  console.log("================================");
  console.log(`Port: ${PORT}`);
  console.log(
    `Gemini configured: ${Boolean(GEMINI_API_KEY)}`
  );
  console.log("Server is running.");
});
