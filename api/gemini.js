import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: "nodejs",
};

export default async function handler(req, res) {
  try {
    const { prompt, apiKey } = req.body;

    // 1. Kiểm tra đầu vào
    if (!apiKey || apiKey.trim() === "") {
      return res.status(400).json({ error: "Thiếu API key" });
    }

    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ error: "Thiếu prompt" });
    }

    // 2. Chuẩn hóa chuỗi Unicode (Fix lỗi ký tự tiếng Việt lạ)
    const cleanPrompt = String(prompt).normalize("NFC");

    // 3. Khởi tạo Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Lưu ý: Hiện tại 1.5-flash hoặc 2.0-flash là bản ổn định nhất cho free tier. 
    // Nếu 'gemini-2.5-flash' báo lỗi 404, hãy đổi về 'gemini-1.5-flash'.
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    });

    // 4. Thiết lập Timeout (Free tier đôi khi phản hồi lâu)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout: Gemini mất quá lâu để trả lời (>200s).")), 200000)
    );

    // 5. Gọi API với cấu trúc Object (Đây là cách fix lỗi ByteString triệt để nhất)
    const result = await Promise.race([
      model.generateContent({
        contents: [
          {
            role: "user",
            parts: [{ text: cleanPrompt }],
          },
        ],
      }),
      timeoutPromise,
    ]);

    const response = await result.response;
    let text = response.text();

    // 6. Hậu xử lý văn bản (Xóa markdown nếu có)
    text = text
      .replace(/^```(html|json|javascript|text)?\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();

    return res.status(200).json({ text });

  } catch (err) {
    console.error("🔥 GEMINI ERROR:", err);

    let errorMsg = err.message || "Lỗi không xác định";

    // Xử lý các mã lỗi phổ biến
    if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      errorMsg = "❌ Model không tồn tại. Hãy thử 'gemini-1.5-flash'.";
    } else if (errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED")) {
      errorMsg = "⏸️ Hết hạn mức (Quota) miễn phí. Hãy thử lại sau.";
    } else if (errorMsg.includes("API key") || errorMsg.includes("UNAUTHENTICATED")) {
      errorMsg = "🔐 API key không hợp lệ.";
    } else if (errorMsg.includes("ByteString") || errorMsg.includes("7841")) {
      errorMsg = "⚠️ Lỗi mã hóa ký tự. Hãy thử rút ngắn prompt hoặc bỏ các ký tự lạ.";
    }

    return res.status(500).json({
      error: errorMsg,
      detail: err.message
    });
  }
}
