// server.js
import express from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// .env should have: API_KEY=your_gemini_key
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function getDecisionOutcome(decision, time, intensity) {
  const prompt = `
You are an AI that outputs structured JSON only.
If time or intensity is "general", suggest realistic values.
Output must be valid JSON, no markdown, no text outside JSON.

Format:
{
  "outcome": "short realistic result in <=12 words",
  "time": "realistic time span",
  "intensity": "realistic intensity"
}

Examples:
Decision: "coding", Time: "1 year", Intensity: "daily 2h"
→ {"outcome": "can build projects, solid basics, problem-solving improved", "time": "1 year", "intensity": "daily 2h"}

Decision: "exercise", Time: "general", Intensity: "general"
→ {"outcome": "better stamina, noticeable strength gains", "time": "6 months", "intensity": "3 times a week"}

Now return JSON for:
Decision: "${decision}", Time: "${time}", Intensity: "${intensity}"
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  let text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Try parsing JSON safely
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("Failed to parse AI response:", text);
    return {
      outcome: "Could not generate outcome",
      time,
      intensity,
    };
  }
}


// test route
app.get("/", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Say something random in JSON: {\"msg\": \"...\"}",
    });
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    res.send(text);
  } catch (err) {
    console.error("Error:", err?.message || err);
    res.status(500).send("Error: " + (err?.message || "unknown"));
  }
});

// API endpoint
app.post("/decision", async (req, res) => {
  let { decision, time, intensity } = req.body;

  if (!decision) {
    return res.status(400).json({ error: "decision is required" });
  }

  if (!time) time = "general";
  if (!intensity) intensity = "general";

  try {
    const result = await getDecisionOutcome(decision, time, intensity);

    // update time and intensity if AI suggested better ones
    time = result.time || time;
    intensity = result.intensity || intensity;

    res.json({
      decision,
      time,
      intensity,
      outcome: result.outcome,
    });
  } catch (err) {
    console.error("Error:", err?.message || err);
    res.status(500).json({ error: "Something went wrong" });
  }
});


app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
