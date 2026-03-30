import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const { prompt, apiKey } = req.body;

    // ✅ Validation: Check API key
    if (!apiKey || apiKey.trim() === "") {
      return res.status(400).json({
        error: "Thiếu API key",
      });
    }

    // ✅ Validation: Check prompt
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({
        error: "Thiếu prompt",
      });
    }

    // ✅ Validation: Limit prompt length for free tier
    if (prompt.length > 10000) {
      return res.status(400).json({
        error: "Prompt quá dài (tối đa 10,000 ký tự). Hiện tại: " + prompt.length + " ký tự",
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // ✅ FIX 1: Dùng gemini-2.5-flash cho free tier (tốt nhất hiện nay)
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      // Fallback: nếu lỗi, thử gemini-2.5-flash-lite
    });

    // ✅ FIX 2: Thêm timeout (30 giây) vì free tier có thể chậm
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout: Gemini mất quá lâu để trả lời (>30s). Thử lại sau.")), 30000)
    );

    const result = await Promise.race([
      model.generateContent(prompt),
      timeoutPromise,
    ]);

    const response = await result.response;
    let text = response.text();

    // ✅ FIX 3: Xóa markdown fences
    text = text
      .replace(/^```html\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return res.status(200).json({ text });

  } catch (err) {
    console.error("🔥 GEMINI ERROR:", err);

    let errorMsg = err.message || "Lỗi server";

    // ✅ FIX 4: Xử lý chi tiết các loại lỗi
    if (
      errorMsg.includes("404") ||
      errorMsg.includes("not found") ||
      errorMsg.includes("model")
    ) {
      errorMsg =
        "❌ Model không tồn tại hoặc không hỗ trợ free tier. Hãy thử 'gemini-2.5-flash' hoặc 'gemini-2.5-flash-lite'";
    } else if (
      errorMsg.includes("429") ||
      errorMsg.includes("quota") ||
      errorMsg.includes("limit") ||
      errorMsg.includes("RESOURCE_EXHAUSTED")
    ) {
      errorMsg =
        "⏸️ Đã hết quota miễn phí hôm nay. Thử lại sau hoặc nâng cấp lên paid tier.";
    } else if (
      errorMsg.includes("permission") ||
      errorMsg.includes("API key") ||
      errorMsg.includes("UNAUTHENTICATED")
    ) {
      errorMsg =
        "🔐 API key không hợp lệ hoặc chưa được kích hoạt. Kiểm tra lại API key.";
    } else if (errorMsg.includes("Timeout")) {
      errorMsg =
        "⏱️ Gemini mất quá lâu để trả lời. Thử lại sau hoặc sử dụng prompt ngắn hơn.";
    }

    return res.status(500).json({
      error: errorMsg,
    });
  }
}