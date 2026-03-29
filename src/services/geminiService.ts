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
Bạn là giáo viên. Hãy tích hợp AI vào kế hoạch bài dạy sau:

Môn học: ${data.subject}
Lớp: ${data.grade}

Nội dung:
${data.htmlContent}

Yêu cầu:
- Giữ nguyên HTML
- Bổ sung hoạt động AI
- Trình bày rõ ràng
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