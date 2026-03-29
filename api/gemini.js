import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const { prompt, apiKey } = req.body;

    // ✅ Check API key
    if (!apiKey || apiKey.trim() === "") {
      return res.status(400).json({
        error: "Thiếu API key",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-pro",
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text });

  } catch (err) {
    console.error("🔥 GEMINI ERROR:", err);

    return res.status(500).json({
      error: err.message || "Lỗi server",
    });
  }
}