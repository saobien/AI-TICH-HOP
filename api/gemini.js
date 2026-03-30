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

    // ✅ FIX 1: Đổi sang model còn hoạt động (gemini-pro đã bị khai tử)
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    let text = response.text();

    // ✅ FIX 2: Xóa markdown fences nếu Gemini trả về ```html ... ```
    text = text
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return res.status(200).json({ text });

  } catch (err) {
    console.error("🔥 GEMINI ERROR:", err);

    return res.status(500).json({
      error: err.message || "Lỗi server",
    });
  }
}