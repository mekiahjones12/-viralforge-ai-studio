```js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = process.env.PORT || 10000;

app.set("trust proxy", 1);

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
    version: "9.0.0",
    aiConfigured: Boolean(GEMINI_API_KEY),
    features: [
      "Gemini automatic retry",
      "Gemini automatic model fallback",
      "Veo 3.1 video generation",
      "Veo video downloading",
      "Veo browser playback",
      "HTTPS video URLs"
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
    version: "9.0.0",
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

    console.log(`Trying Gemini model: ${model}`);

    for (
      let attempt = 1;
      attempt <= MAX_RETRIES_PER_MODEL;
      attempt++
    ) {

      try {

        console.log(
          `Gemini attempt ${attempt}/${MAX_RETRIES_PER_MODEL}`
        );

        const response =
          await ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              thinkingConfig: {
                thinkingLevel: "low"
              }
            }
          });

        const text =
          response.text || "";

        if (!text.trim()) {
          throw new Error(
            `Gemini model ${model} returned an empty response.`
          );
        }

        console.log(
          `Gemini success using ${model}`
        );

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

        if (!isTemporaryError(error)) {
          throw error;
        }

        if (attempt < MAX_RETRIES_PER_MODEL) {

          const delay =
            RETRY_DELAY_MS *
            Math.pow(2, attempt - 1);

          console.log(
            `Retrying in ${delay}ms...`
          );

          await sleep(delay);
        }
      }
    }
  }

  throw new Error(
    `All Gemini models are temporarily unavailable. Last error: ${
      lastError?.message || "Unknown Gemini error"
    }`
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
    // UNKNOWN
    // ========================================

    else {

      return res.status(400).json({
        ok: false,
        error: `Unknown AI type: ${type}`
      });

    }

    const result =
      await askGemini(prompt);

    res.json({
      ok: true,
      result: result.text,
      model: result.model
    });

  } catch (error) {

    console.error(
      "GEMINI ERROR:",
      error
    );

    res.status(500).json({
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
        error:
          "Video prompt is required."
      });

    }

    if (!["9:16", "16:9"].includes(aspectRatio)) {

      return res.status(400).json({
        ok: false,
        error:
          "aspectRatio must be 9:16 or 16:9."
      });

    }

    console.log(
      "================================"
    );

    console.log(
      "🎬 STARTING VEO 3.1"
    );

    console.log(
      "================================"
    );

    console.log(
      "Prompt:",
      prompt.trim()
    );

    console.log(
      "Aspect ratio:",
      aspectRatio
    );

    // ========================================
    // START VEO
    // ========================================

    let operation =
      await ai.models.generateVideos({
        model: VIDEO_MODEL,
        prompt: prompt.trim(),
        config: {
          aspectRatio
        }
      });

    console.log(
      "⏳ Veo operation started."
    );

    // ========================================
    // WAIT FOR VEO
    // ========================================

    while (!operation.done) {

      await sleep(10000);

      operation =
        await ai.operations.getVideosOperation({
          operation
        });

      console.log(
        "⏳ Checking Veo status..."
      );
    }

    console.log(
      "✅ Veo operation finished."
    );

    // ========================================
    // CHECK OPERATION ERROR
    // ========================================

    if (operation.error) {

      console.error(
        "Veo operation error:",
        JSON.stringify(
          operation.error,
          null,
          2
        )
      );

      throw new Error(
        operation.error.message ||
        "Veo generation failed."
      );
    }

    // ========================================
    // GET GENERATED VIDEO
    // ========================================

    const generatedVideos =
      operation?.response?.generatedVideos || [];

    console.log(
      "Generated video count:",
      generatedVideos.length
    );

    if (!generatedVideos.length) {

      console.error(
        "FULL VEO RESPONSE:"
      );

      console.error(
        JSON.stringify(
          operation,
          null,
          2
        )
      );

      throw new Error(
        "Veo finished but returned no generated video."
      );
    }

    const videoFile =
      generatedVideos[0]?.video;

    if (!videoFile) {

      console.error(
        "VIDEO OBJECT:"
      );

      console.error(
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

    // ========================================
    // CREATE LOCAL FILE
    // ========================================

    const videoId =
      crypto.randomUUID();

    const filePath =
      path.join(
        "/tmp",
        `viralforge-${videoId}.mp4`
      );

    console.log(
      "⬇️ Downloading Veo video..."
    );

    await ai.files.download({
      file: videoFile,
      downloadPath: filePath
    });

    console.log(
      "✅ Veo video downloaded."
    );

    // ========================================
    // VERIFY FILE
    // ========================================

    if (!fs.existsSync(filePath)) {

      throw new Error(
        "Veo download completed but the MP4 file was not created."
      );
    }

    const stats =
      fs.statSync(filePath);

    console.log(
      `📦 Video size: ${stats.size} bytes`
    );

    if (stats.size === 0) {

      throw new Error(
        "Veo created an empty video file."
      );
    }

    // ========================================
    // SAVE VIDEO ID
    // ========================================

    videoFiles.set(
      videoId,
      filePath
    );

    // ========================================
    // ALWAYS USE HTTPS
    // ========================================

    const host =
      req.get("host");

    const videoUrl =
      `https://${host}/api/video-file/${videoId}`;

    console.log(
      "================================"
    );

    console.log(
      "🎉 VIDEO READY"
    );

    console.log(
      videoUrl
    );

    console.log(
      "================================"
    );

    // ========================================
    // RETURN TO FRONTEND
    // ========================================

    return res.json({
      ok: true,
      videoUrl,
      message:
        "Veo 3.1 video generated successfully.",
      aspectRatio,
      model: VIDEO_MODEL
    });

  } catch (error) {

    console.error(
      "================================"
    );

    console.error(
      "❌ VEO ERROR"
    );

    console.error(
      error?.message || error
    );

    console.error(
      "================================"
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
// SERVE GENERATED VIDEO
// ========================================

app.get(
  "/api/video-file/:id",
  (req, res) => {

    try {

      const filePath =
        videoFiles.get(
          req.params.id
        );

      if (!filePath) {

        return res.status(404).json({
          ok: false,
          error:
            "Video not found or the server restarted."
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

      const stat =
        fs.statSync(filePath);

      res.status(200);

      res.set({
        "Content-Type": "video/mp4",
        "Content-Length": stat.size,
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*"
      });

      const range =
        req.headers.range;

      if (!range) {

        const stream =
          fs.createReadStream(filePath);

        stream.pipe(res);

        return;
      }

      const parts =
        range
          .replace(/bytes=/, "")
          .split("-");

      const start =
        parseInt(parts[0], 10);

      const end =
        parts[1]
          ? parseInt(parts[1], 10)
          : stat.size - 1;

      if (
        Number.isNaN(start) ||
        start < 0 ||
        start >= stat.size ||
        end < start
      ) {

        return res.status(416).set({
          "Content-Range":
            `bytes */${stat.size}`
        }).end();

      }

      const safeEnd =
        Math.min(
          end,
          stat.size - 1
        );

      const chunkSize =
        safeEnd - start + 1;

      res.status(206);

      res.set({
        "Content-Length": chunkSize,
        "Content-Range":
          `bytes ${start}-${safeEnd}/${stat.size}`,
        "Accept-Ranges": "bytes"
      });

      const stream =
        fs.createReadStream(
          filePath,
          {
            start,
            end: safeEnd
          }
        );

      stream.pipe(res);

    } catch (error) {

      console.error(
        "VIDEO SERVING ERROR:",
        error
      );

      if (!res.headersSent) {

        res.status(500).json({
          ok: false,
          error:
            "Could not serve video."
        });

      }

    }

  }
);

// ========================================
// 404
// ========================================

app.use((req, res) => {

  res.status(404).json({
    ok: false,
    error:
      "Endpoint not found."
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

    if (!res.headersSent) {

      res.status(500).json({
        ok: false,
        error:
          "Internal server error."
      });

    }

  }
);

// ========================================
// START
// ========================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      "================================"
    );

    console.log(
      "🔥 ViralForge AI Studio"
    );

    console.log(
      "================================"
    );

    console.log(
      "Version: 9.0.0"
    );

    console.log(
      `Port: ${PORT}`
    );

    console.log(
      `Gemini configured: ${Boolean(GEMINI_API_KEY)}`
    );

    console.log(
      `Text models: ${TEXT_MODELS.join(", ")}`
    );

    console.log(
      `Video model: ${VIDEO_MODEL}`
    );

    console.log(
      "Automatic retry: ENABLED"
    );

    console.log(
      "Automatic fallback: ENABLED"
    );

    console.log(
      "Veo download: ENABLED"
    );

    console.log(
      "Video streaming: ENABLED"
    );

    console.log(
      "HTTPS video URLs: ENABLED"
    );

    console.log(
      "Server is running."
    );

  }
);
```
