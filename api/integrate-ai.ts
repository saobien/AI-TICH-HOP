import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { apiKey, data, model } = req.body;

  if (!apiKey || !data) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
      Bạn là một chuyên gia giáo dục tại Việt Nam, am hiểu Công văn 5512 của Bộ Giáo dục và Đào tạo.
      Nhiệm vụ của bạn là đọc nội dung giáo án dưới đây và tích hợp các năng lực AI (Trí tuệ nhân tạo) vào giáo án đó theo đúng tinh thần và yêu cầu của Công văn 5512.
      
      Thông tin giáo án:
      - Môn học: ${data.subject}
      - Khối lớp: ${data.grade}
      
      Nội dung hiện tại (có thể chứa HTML và các thẻ <img> có thuộc tính src bắt đầu bằng "[[RESERVED_IMG_CONTENT_" - Đây là các hình ảnh gốc cực kỳ quan trọng, bạn TUYỆT ĐỐI không được xóa, sửa hoặc thay đổi vị trí của các thẻ này):
      ${data.htmlContent}
      
      Dựa vào Khối lớp (${data.grade}) và môn học (${data.subject}), bạn hãy áp dụng CHÍNH XÁC Khung năng lực và Yêu cầu cần đạt (YCCĐ) theo QĐ 3439/QĐ-BGDDT:
      
      1. XÁC ĐỊNH NĂNG LỰC AI (Chèn vào phần "I. MỤC TIÊU"): 
         Chọn 1-2 năng lực cực kỳ sát với bài học này từ 4 thành phần sau:
         - NLa: Tư duy lấy con người làm trung tâm (Nhận biết AI là công cụ do người tạo, con người luôn giữ quyền kiểm soát).
         - NLb: Đạo đức AI (Sử dụng an toàn, minh bạch, bảo vệ riêng tư, không thiên kiến/bias).
         - NLc: Kĩ thuật và ứng dụng AI (Hiểu nguyên lý dữ liệu/thuật toán, sử dụng Prompt, ứng dụng vào học tập/đời sống).
         - NLd: Thiết kế hệ thống AI (Quy trình huấn luyện: Thu thập -> Dạy máy -> Kiểm thử -> Tối ưu).
         => Lưu ý: Cấp Tiểu học tập trung nhận diện; THCS tập trung nguyên lý/đánh giá; THPT tập trung thiết kế/đạo đức phức tạp/Prompt Engineering.
  
      2. BỔ SUNG CÔNG CỤ SỐ & AI (Chèn vào phần "II. THIẾT BỊ DẠY HỌC"):
         - Đề xuất công cụ cụ thể: Gemini, ChatGPT, Bing, Canva Magic, Teachable Machine, Scratch AI...
  
      3. LỒNG GHÉP HOẠT ĐỘNG AI (Chèn vào phần "III. TIẾN TRÌNH DẠY HỌC"):
         - Tích hợp AI vào các hoạt động: Khởi động (Tạo hứng thú), Khám phá (Tìm kiếm thông tin), Luyện tập (Sửa lỗi/gợi ý), Vận dụng (Tạo sản phẩm).
         - Phải bám sát Khung nội dung 4 chủ đề (A, B, C, D) của QĐ 3439 cho Khối: ${data.grade}.
  
      4. ĐỀ XUẤT ĐÁNH GIÁ (Chèn vào phần "IV"): Đưa câu hỏi/bài tập kiểm tra năng lực AI của học sinh.
  
      YÊU CẦU ĐỊNH DẠNG & BẢO TỒN (BẮT BUỘC):
      1. TIÊU ĐỀ BÀI HỌC: Phải được CĂN GIỮA (text-align: center) và IN ĐẬM.
      2. NỘI DUNG VĂN BẢN: Toàn bộ các đoạn văn nội dung PHẢI được CĂN ĐỀU HAI BÊN (style="text-align: justify;"). Đây là yêu cầu bắt buộc.
      3. HÌNH ẢNH: TUYỆT ĐỐI giữ nguyên các thẻ <img> có src="[[RESERVED_IMG_CONTENT_...]]" ở đúng vị trí.
      4. NỔI BẬT NỘI DUNG MỚI: Chỉ phần nội dung AI được chèn thêm mới nằm trong <span style="color: blue"><b>[Nội dung AI]</b></span> (Màu xanh và in đậm).
      5. GIỮ NGUYÊN NỘI DUNG GỐC: Tuyệt đối không xóa bất kỳ thông tin chuyên môn nào của giáo án gốc.
      
      QUY TẮC PHẢN HỒI:
      - Trả về duy nhất mã HTML hoàn chỉnh, không có văn bản giải thích.
      - Tuyệt đối không cắt xén hoặc tóm tắt nội dung gốc.
    `;

    const response = await ai.models.generateContent({
      model: model || 'gemini-3-flash-preview',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let text = response.text || '';
    const htmlMatch = text.match(/<html[\s\S]*<\/html>/i) || text.match(/<body[\s\S]*<\/body>/i) || [text];
    const resultHtml = htmlMatch[0].replace(/```html|```/g, '').trim();

    return res.status(200).send(resultHtml);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal Server Error',
      details: error
    });
  }
}
