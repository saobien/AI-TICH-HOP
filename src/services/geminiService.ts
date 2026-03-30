export async function askGemini(prompt: string) {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  const data = await res.json();
  return data.text;
}

export async function integrateAIIntoLessonPlan(
  apiKey: string,
  data: {
    subject: string;
    grade: string;
    htmlContent: string;
  }
) {
  const prompt = `
Bạn là chuyên gia giáo dục. Hãy tích hợp nội dung ứng dụng AI vào kế hoạch bài dạy (KHBD) sau đây.

Môn học: ${data.subject}
Khối lớp: ${data.grade}

Nội dung KHBD gốc (định dạng HTML):
${data.htmlContent}

YÊU CẦU BẮT BUỘC:
1. Giữ nguyên toàn bộ cấu trúc và nội dung HTML gốc.
2. Chèn thêm các hoạt động, gợi ý sử dụng AI vào các phần phù hợp.
3. Bọc TẤT CẢ nội dung AI thêm vào trong thẻ: <span class="ai-content" style="color:blue;font-weight:bold;">[Nội dung AI]</span>
4. CHỈ TRẢ VỀ MÃ HTML THUẦN TÚY. TUYỆT ĐỐI KHÔNG dùng markdown, không có backtick, không có lời giải thích ngoài HTML.
`;

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      apiKey,
    }),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.error || "Lỗi API");
  }

  return result.text;
}
