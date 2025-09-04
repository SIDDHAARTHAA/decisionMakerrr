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
You are an AI that outputs JSON only.
Your job is to suggest a short realistic outcome.
If time or intensity are missing or "general", suggest suitable defaults.

Output format (strict JSON):
{
  "outcome": "short sentence (max 12 words)",
  "time": "final time used",
  "intensity": "final intensity used"
}

Examples:
Input: Decision: "coding", Time: "1 year", Intensity: "daily 2h"
Output: {"outcome":"can build projects, solid basics, problem-solving improved","time":"1 year","intensity":"daily 2h"}

Input: Decision: "exercise", Time: "", Intensity: ""
Output: {"outcome":"better stamina and health improvements","time":"6 months","intensity":"3 times a week"}

Input: Decision: "learn guitar", Time: "general", Intensity: ""
Output: {"outcome":"can play songs comfortably, intermediate guitarist","time":"2 years","intensity":"weekly practice"}

Now generate one outcome:
Decision: "${decision}", Time: "${time}", Intensity: "${intensity}"
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  const raw = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  let parsed;

  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { outcome: raw.trim(), time, intensity };
  }

  return parsed;
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
    res.json(result); // already structured with updated time/intensity
  } catch (err) {
    console.error("Error:", err?.message || err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
