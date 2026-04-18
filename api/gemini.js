import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: "nodejs",
};

// Hàm lọc ký tự đặc biệt từ Word
function cleanWordText(text) {
  return String(text)
    .normalize("NFC")
    .replace(/[\u201C\u201D]/g, '"') 
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\u2014/g, "-")
    .replace(/\u00A0/g, " ") 
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "")
    .trim();
}

export default async function handler(req, res) {
  try {
    let { prompt, apiKey } = req.body;

    if (!apiKey) return res.status(400).json({ error: "Thiếu API key" });
    if (!prompt) return res.status(400).json({ error: "Thiếu nội dung prompt" });

    // ✅ BƯỚC QUAN TRỌNG: Làm sạch dữ liệu từ Word
    const sanitizedPrompt = cleanWordText(prompt);

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Sử dụng gemini-1.5-flash để đạt tốc độ và độ ổn định cao nhất
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Timeout: Gemini phản hồi quá lâu")), 150000)
    );

    // ✅ BƯỚC QUAN TRỌNG 2: Ép kiểu dữ liệu về Object có cấu trúc
    const result = await Promise.race([
      model.generateContent({
        contents: [{ role: "user", parts: [{ text: sanitizedPrompt }] }]
      }),
      timeoutPromise,
    ]);

    const response = await result.response;
    let text = response.text();

    // Làm sạch Markdown trả về
    text = text.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "").trim();

    return res.status(200).json({ text });

  } catch (err) {
    console.error("🔥 LỖI:");
    
    // Nếu vẫn lỗi ByteString, ta sẽ báo lỗi cụ thể để xử lý
    let msg = err.message;
    if (msg.includes("ByteString") || msg.includes("7841")) {
       msg = "Dữ liệu Word chứa ký tự không thể xử lý. Hãy thử copy văn bản dán vào Notepad trước rồi mới dán vào đây.";
    }

    return res.status(500).json({ error: msg });
  }
}
