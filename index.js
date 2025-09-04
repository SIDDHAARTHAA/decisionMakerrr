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
  You are an AI that outputs short outcomes.
  The outcome must be concise but realistic.
  It should describe the result or future state
  of the given decision and time span.

  Examples:
  Decision: "coding", Time: "1 year" → "able to build small projects, comfortable with basic programming, possibly a junior developer"
  Decision: "exercise", Time: "6 months" → "noticeable improvement in strength and stamina, leaner body, healthier lifestyle"
  Decision: "learn guitar", Time: "2 years" → "can play songs smoothly, good sense of rhythm, considered an intermediate guitarist"
  Decision: "fasting", Time: "
  Now generate one outcome:
  Decision: "${decision}", Time: "${time}", Intensity: "${intensity}
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  // extract text from new SDK response shape
  return response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// test route
app.get("/", async (req, res) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "Hello, say something random!",
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
  const { decision, time, intensity } = req.body;

  if (!decision) {
    return res.status(400).json({ error: "decision is required" });
  }
  if(!time) {
    time = "generally"
  }
  if(!intensity) intensity = "generally"

  try {
    const outcome = await getDecisionOutcome(decision, time, intensity);
    res.json({ decision, time, intensity, outcome });
  } catch (err) {
    console.error("Error:", err?.message || err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
