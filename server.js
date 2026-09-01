import express from "express";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { randomUUID } from "crypto";
import fs from "fs";

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

const TEXT_MODELS = [
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
];

const VIDEO_MODEL = "veo-3.1-generate-preview";

const MAX_RETRIES_PER_MODEL = 2;
const RETRY_DELAY_MS = 2000;

// ========================================
// VIDEO STORAGE
// ========================================

const videoFiles = new Map();

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
  const message = String(error?.message || "").toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("unavailable") ||
    message.includes("overloaded") ||
    message.includes("high demand") ||
    message.includes("temporarily")
  );
}

// ========================================
// HEALTH
// ========================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "ViralForge AI Studio",
    version: "11.0.0",
    aiConfigured: Boolean(GEMINI_API_KEY),
    features: [
      "Gemini automatic retry",
      "Gemini automatic model fallback",
      "Veo 3.1 video generation",
      "Video file serving"
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
    version: "11.0.0",
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
      "GEMINI_API_KEY is not configured on Render."
    );
  }

  let lastError = null;

  for (const model of TEXT_MODELS) {
    console.log("Trying Gemini model: " + model);

    for (
      let attempt = 1;
      attempt <= MAX_RETRIES_PER_MODEL;
      attempt++
    ) {
      try {
        console.log(
          "Gemini attempt " +
          attempt +
          "/" +
          MAX_RETRIES_PER_MODEL +
          " using " +
          model
        );

        const response = await ai.models.generateContent({
          model: model,
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
            "Gemini model " +
            model +
            " returned an empty response."
          );
        }

        console.log(
          "Gemini success using " + model
        );

        return {
          text: text,
          model: model
        };

      } catch (error) {
        lastError = error;

        console.error(
          "Gemini " +
          model +
          " attempt " +
          attempt +
          " failed:",
          error?.message || error
        );

        if (!isTemporaryError(error)) {
          throw error;
        }

        if (attempt < MAX_RETRIES_PER_MODEL) {
          const delay =
            RETRY_DELAY_MS *
            Math.pow(2, attempt - 1);

          console.log(
            "Retrying in " +
            delay +
            "ms..."
          );

          await sleep(delay);
        }
      }
    }

    console.log(
      "Moving to next Gemini model..."
    );
  }

  throw new Error(
    "All Gemini models failed. Last error: " +
    (lastError?.message || "Unknown error")
  );
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
- strong opening
- curiosity
- clear storytelling
- specific details
- retention
- satisfying payoff
- natural CTA

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
    // UNKNOWN
    // ========================================

    else {
      return res.status(400).json({
        ok: false,
        error: "Unknown AI type: " + type
      });
    }

    const result = await askGemini(prompt);

    return res.json({
      ok: true,
      result: result.text,
      model: result.model
    });

  } catch (error) {
    console.error(
      "GEMINI ERROR:",
      error?.message || error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Gemini request failed."
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
        error:
          "GEMINI_API_KEY is not configured on Render."
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

    if (
      aspectRatio !== "9:16" &&
      aspectRatio !== "16:9"
    ) {
      return res.status(400).json({
        ok: false,
        error:
          "aspectRatio must be 9:16 or 16:9."
      });
    }

    console.log(
      "Starting Veo 3.1 video generation..."
    );

    let operation = await ai.models.generateVideos({
      model: VIDEO_MODEL,
      prompt: prompt.trim(),
      config: {
        aspectRatio: aspectRatio
      }
    });

    console.log(
      "Veo operation started."
    );

    while (!operation.done) {
      await sleep(10000);

      operation =
        await ai.operations.getVideosOperation({
          operation: operation
        });

      console.log(
        "Checking Veo generation status..."
      );
    }

    console.log(
      "Veo operation finished."
    );

    const generatedVideos =
      operation?.response?.generatedVideos || [];

    if (generatedVideos.length === 0) {
      console.error(
        "Veo returned no generated videos:",
        JSON.stringify(
          operation,
          null,
          2
        )
      );

      throw new Error(
        "Veo finished but returned no generated videos."
      );
    }

    const videoFile =
      generatedVideos[0]?.video;

    if (!videoFile) {
      console.error(
        "Veo generated video object:",
        JSON.stringify(
          generatedVideos[0],
          null,
          2
        )
      );

      throw new Error(
        "Veo finished but no video file was found."
      );
    }

    const videoId = randomUUID();

    const filePath =
      "/tmp/viralforge-" +
      videoId +
      ".mp4";

    console.log(
      "Downloading generated video..."
    );

    await ai.files.download({
      file: videoFile,
      downloadPath: filePath
    });

    if (!fs.existsSync(filePath)) {
      throw new Error(
        "Video download completed but the file was not found."
      );
    }

    const stats =
      fs.statSync(filePath);

    if (stats.size <= 0) {
      throw new Error(
        "Downloaded video file is empty."
      );
    }

    videoFiles.set(
      videoId,
      filePath
    );

    const videoUrl =
      `${req.protocol}://${req.get("host")}/api/video-file/${videoId}`;

    console.log(
      "Video ready: " + videoUrl
    );

    return res.json({
      ok: true,
      videoUrl: videoUrl,
      message:
        "Veo 3.1 video generated successfully.",
      aspectRatio: aspectRatio,
      model: VIDEO_MODEL
    });

  } catch (error) {
    console.error(
      "VEO ERROR:",
      error?.message || error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Veo video generation failed."
    });
  }
});

// ========================================
// SERVE VIDEO FILE
// ========================================

app.get(
  "/api/video-file/:id",
  (req, res) => {
    const filePath =
      videoFiles.get(
        req.params.id
      );

    if (!filePath) {
      return res.status(404).json({
        ok: false,
        error: "Video not found."
      });
    }

    if (!fs.existsSync(filePath)) {
      videoFiles.delete(
        req.params.id
      );

      return res.status(404).json({
        ok: false,
        error:
          "Video file no longer exists."
      });
    }

    res.sendFile(
      filePath,
      {
        headers: {
          "Content-Type": "video/mp4",
          "Accept-Ranges": "bytes",
          "Cache-Control":
            "public, max-age=3600"
        }
      },
      error => {
        if (error) {
          console.error(
            "Video playback error:",
            error.message
          );
        }
      }
    );
  }
);

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

app.use(
  (err, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      err
    );

    res.status(500).json({
      ok: false,
      error:
        "Internal server error."
    });
  }
);

// ========================================
// START SERVER
// ========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "================================"
    );

    console.log(
      "ViralForge AI Studio"
    );

    console.log(
      "================================"
    );

    console.log(
      "Port: " + PORT
    );

    console.log(
      "Gemini configured: " +
      Boolean(GEMINI_API_KEY)
    );

    console.log(
      "Text models: " +
      TEXT_MODELS.join(", ")
    );

    console.log(
      "Video model: " +
      VIDEO_MODEL
    );

    console.log(
      "Automatic retry: ENABLED"
    );

    console.log(
      "Automatic fallback: ENABLED"
    );

    console.log(
      "Video file serving: ENABLED"
    );

    console.log(
      "Server is running."
    );
  }
);
