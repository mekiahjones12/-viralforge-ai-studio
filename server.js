import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

const apiKey = process.env.OPENAI_API_KEY;

const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

// ================================
// HEALTH
// ================================

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "ViralForge AI Studio",
    version: "4.0.0",
    aiConfigured: Boolean(apiKey),
    message: "ViralForge backend is running."
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(apiKey),
    uptime: process.uptime()
  });
});

// ================================
// OPENAI
// ================================

async function askAI(prompt) {
  if (!openai) {
    throw new Error(
      "OPENAI_API_KEY is not configured on Render."
    );
  }

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    input: prompt
  });

  return response.output_text || "";
}

// ================================
// MAIN GENERATOR
// ================================

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

    // ----------------------------
    // SCRIPTS
    // ----------------------------

    if (type === "scripts") {
      if (!topic.trim()) {
        return res.status(400).json({
          ok: false,
          error: "Topic is required."
        });
      }

      prompt = `
You are ViralForge AI.

Create 3 different short-form video scripts.

Topic: ${topic}
Niche: ${niche}
Platform: ${platform}
Style: ${style}
Length: ${length}
Audience: ${audience}

For each version include:

HOOK:
SETUP:
BODY:
PAYOFF:
CTA:

Make the scripts natural, entertaining, and different from each other.
Do not guarantee virality.
`;
    }

    // ----------------------------
    // HOOKS
    // ----------------------------

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
- surprising ideas
- mistakes
- stories
- bold openings
- problems
- solutions

Number them 1 through 12.

Keep them short and natural.
Do not promise guaranteed views.
`;
    }

    // ----------------------------
    // IDEAS
    // ----------------------------

    else if (type === "ideas") {
      prompt = `
You are ViralForge Idea Lab.

Create exactly 20 original short-form content ideas.

Niche: ${niche}
Platform: ${platform}
Goal: ${goal}

For every idea include:

1. Title
2. Concept
3. Hook
4. Why people may want to watch

Make every idea different.
Avoid fake statistics and guaranteed-virality claims.
`;
    }

    // ----------------------------
    // CAPTION
    // ----------------------------

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

Make them natural, engaging, and appropriate for short-form content.

Number them 1 through 5.
Include a few relevant hashtags with each.
`;
    }

    // ----------------------------
    // SCORE
    // ----------------------------

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

Give a score from 0-100 based on:

- Hook strength
- Curiosity
- Specificity
- Clarity
- Retention potential
- CTA
- Overall structure

Return your answer EXACTLY like this:

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

    const result = await askAI(prompt);

    res.json({
      ok: true,
      result
    });

  } catch (error) {
    console.error("AI ERROR:", error);

    res.status(500).json({
      ok: false,
      error: error?.message || "AI request failed."
    });
  }
});

// ================================
// OPTIONAL DIRECT ENDPOINTS
// ================================

app.post("/api/scripts", async (req, res) => {
  req.body = {
    ...(req.body || {}),
    type: "scripts"
  };

  return app._router
    ? res.redirect(307, "/api/generate")
    : res.status(500).json({
        ok: false,
        error: "Server routing error."
      });
});

app.post("/api/hooks", async (req, res) => {
  req.body = {
    ...(req.body || {}),
    type: "hooks"
  };

  return res.redirect(307, "/api/generate");
});

app.post("/api/ideas", async (req, res) => {
  req.body = {
    ...(req.body || {}),
    type: "ideas"
  };

  return res.redirect(307, "/api/generate");
});

app.post("/api/caption", async (req, res) => {
  req.body = {
    ...(req.body || {}),
    type: "caption"
  };

  return res.redirect(307, "/api/generate");
});

app.post("/api/score", async (req, res) => {
  req.body = {
    ...(req.body || {}),
    type: "score"
  };

  return res.redirect(307, "/api/generate");
});

// ================================
// 404
// ================================

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Endpoint not found."
  });
});

// ================================
// ERROR HANDLER
// ================================

app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err);

  res.status(500).json({
    ok: false,
    error: "Internal server error."
  });
});

// ================================
// START
// ================================

app.listen(PORT, "0.0.0.0", () => {
  console.log("================================");
  console.log("🔥 ViralForge AI Studio");
  console.log("================================");
  console.log(`Port: ${PORT}`);
  console.log(`OpenAI configured: ${Boolean(apiKey)}`);
  console.log("Server is running.");
});
