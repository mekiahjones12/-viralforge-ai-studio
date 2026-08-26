import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// --------------------------------------------------
// OPENAI
// --------------------------------------------------

const apiKey = process.env.OPENAI_API_KEY;

const openai = apiKey
  ? new OpenAI({ apiKey })
  : null;

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "ViralForge AI Studio",
    version: "3.0.0",
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

// --------------------------------------------------
// AI HELPER
// --------------------------------------------------

async function generateAI(prompt) {
  if (!openai) {
    return {
      ok: false,
      error:
        "OPENAI_API_KEY is not configured on Render. Add it under Environment Variables."
    };
  }

  try {
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: prompt
    });

    return {
      ok: true,
      text: response.output_text || ""
    };
  } catch (error) {
    console.error("OpenAI error:", error);

    return {
      ok: false,
      error: error?.message || "OpenAI request failed."
    };
  }
}

// --------------------------------------------------
// GENERAL AI ENDPOINT
// --------------------------------------------------

app.post("/api/generate", async (req, res) => {
  const {
    topic,
    niche = "General",
    platform = "TikTok",
    style = "High Energy",
    length = "30 seconds",
    audience = "Everyone"
  } = req.body || {};

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Topic is required."
    });
  }

  const prompt = `
You are the AI engine for ViralForge, a short-form content studio.

Create useful, original short-form content.

Topic: ${topic}
Niche: ${niche}
Platform: ${platform}
Style: ${style}
Length: ${length}
Audience: ${audience}

Return:

1. A powerful hook.
2. A complete short-form script.
3. On-screen text suggestions.
4. A caption.
5. A short call to action.
6. 5 relevant hashtags.

Keep the writing natural and engaging.
Do not guarantee that the content will go viral.
`;

  const result = await generateAI(prompt);

  if (!result.ok) {
    return res.status(503).json(result);
  }

  res.json(result);
});

// --------------------------------------------------
// 3 SCRIPT VARIATIONS
// --------------------------------------------------

app.post("/api/scripts", async (req, res) => {
  const {
    topic,
    niche = "General",
    platform = "TikTok",
    style = "High Energy",
    length = "30 seconds",
    audience = "Everyone"
  } = req.body || {};

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Topic is required."
    });
  }

  const prompt = `
You are ViralForge AI.

Create THREE completely different short-form video scripts.

Topic: ${topic}
Niche: ${niche}
Platform: ${platform}
Style: ${style}
Length: ${length}
Audience: ${audience}

SCRIPT 1 — CURIOSITY
Use an intriguing opening and create a strong curiosity gap.

SCRIPT 2 — STORY
Use a short story structure with a beginning, turning point and payoff.

SCRIPT 3 — VALUE
Give practical information quickly and clearly.

For EACH script include:

HOOK:
SETUP:
BODY:
PAYOFF:
CTA:

Make every version substantially different.
Avoid fake statistics and unsupported claims.
Do not guarantee virality.
`;

  const result = await generateAI(prompt);

  if (!result.ok) {
    return res.status(503).json(result);
  }

  res.json(result);
});

// --------------------------------------------------
// HOOK LAB
// --------------------------------------------------

app.post("/api/hooks", async (req, res) => {
  const {
    topic,
    niche = "General",
    style = "Mixed"
  } = req.body || {};

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Topic is required."
    });
  }

  const prompt = `
You are ViralForge Hook Lab.

Generate exactly 12 original short-form video hooks.

Topic: ${topic}
Niche: ${niche}
Hook style: ${style}

Mix different approaches such as:

- curiosity
- surprising statement
- question
- story
- mistake
- bold claim
- problem/solution
- unexpected angle

Number them 1 through 12.

Keep each hook concise and natural.
Do not use fake claims like "this will guarantee millions of views."
`;

  const result = await generateAI(prompt);

  if (!result.ok) {
    return res.status(503).json(result);
  }

  res.json(result);
});

// --------------------------------------------------
// IDEA LAB
// --------------------------------------------------

app.post("/api/ideas", async (req, res) => {
  const {
    niche = "General",
    platform = "TikTok",
    goal = "Growth"
  } = req.body || {};

  const prompt = `
You are ViralForge Idea Lab.

Generate exactly 20 original short-form content ideas.

Niche: ${niche}
Platform: ${platform}
Goal: ${goal}

For every idea provide:

1. Title
2. Concept
3. Suggested hook
4. Why someone might want to watch

Make all 20 ideas different.

Avoid fake statistics and guaranteed-virality claims.
`;

  const result = await generateAI(prompt);

  if (!result.ok) {
    return res.status(503).json(result);
  }

  res.json(result);
});

// --------------------------------------------------
// CAPTION GENERATOR
// --------------------------------------------------

app.post("/api/caption", async (req, res) => {
  const {
    topic,
    tone = "Confident",
    platform = "TikTok"
  } = req.body || {};

  if (!topic || !String(topic).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Topic is required."
    });
  }

  const prompt = `
You are ViralForge Caption AI.

Create 5 different captions for a short-form video.

Topic: ${topic}
Tone: ${tone}
Platform: ${platform}

Each caption should:

- sound natural
- encourage interaction
- fit short-form content
- avoid spammy language
- include a small set of relevant hashtags

Number them 1 through 5.
`;

  const result = await generateAI(prompt);

  if (!result.ok) {
    return res.status(503).json(result);
  }

  res.json(result);
});

// --------------------------------------------------
// VIRAL SCORE
// --------------------------------------------------

app.post("/api/score", async (req, res) => {
  const { text } = req.body || {};

  if (!text || !String(text).trim()) {
    return res.status(400).json({
      ok: false,
      error: "Content is required."
    });
  }

  const prompt = `
You are ViralForge's content scoring system.

Analyze this short-form content:

"""
${text}
"""

Give a score from 0-100 based ONLY on writing/content signals.

Evaluate:

- Hook strength
- Curiosity
- Specificity
- Clarity
- Retention potential
- CTA
- Overall structure

Return JSON ONLY in this format:

{
  "score": 0,
  "hook": 0,
  "curiosity": 0,
  "specificity": 0,
  "clarity": 0,
  "retention": 0,
  "cta": 0,
  "strengths": [],
  "improvements": []
}

Do not claim that the score predicts actual views.
`;

  const result = await generateAI(prompt);

  if (!result.ok) {
    return res.status(503).json(result);
  }

  let parsed;

  try {
    const cleaned = result.text
      .replace(/^```json/i, "")
      .replace(/^```/i, "")
      .replace(/```$/i, "")
      .trim();

    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      score: null,
      raw: result.text
    };
  }

  res.json({
    ok: true,
    result: parsed
  });
});

// --------------------------------------------------
// 404
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Endpoint not found."
  });
});

// --------------------------------------------------
// ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("Server error:", err);

  res.status(500).json({
    ok: false,
    error: "Internal server error."
  });
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, "0.0.0.0", () => {
  console.log("======================================");
  console.log("🔥 ViralForge AI Studio Backend");
  console.log("======================================");
  console.log(`Port: ${PORT}`);
  console.log(`OpenAI configured: ${Boolean(apiKey)}`);
  console.log("Server is running.");
});
