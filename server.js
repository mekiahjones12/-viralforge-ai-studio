import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();

app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "ViralForge AI Backend"
  });
});

app.post("/api/generate", async (req, res) => {
  try {
    const {
      topic,
      niche = "General",
      platform = "YouTube Shorts",
      style = "High Energy",
      length = "30 seconds"
    } = req.body;

    if (!topic) {
      return res.status(400).json({
        error: "Topic is required."
      });
    }

    const prompt = `
You are ViralForge AI.

Create a high-quality short-form video package.

Topic: ${topic}
Niche: ${niche}
Platform: ${platform}
Style: ${style}
Length: ${length}

Give me:

HOOK:
SCRIPT:
TITLE:
DESCRIPTION:
HASHTAGS:
CTA:

Make the writing natural, specific, engaging,
and easy to say out loud.
Do not promise that it will go viral.
`;

    const response = await client.responses.create({
      model: "gpt-5",
      input: prompt
    });

    res.json({
      success: true,
      result: response.output_text
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "AI generation failed."
    });
  }
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`ViralForge running on port ${PORT}`);
});
