import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import HTMLtoDOCX from 'html-to-docx';
import sizeOf from 'image-size';

const app = express();
const PORT = 3000;
app.use(express.json({ limit: '50mb' }));

// API endpoint for AI integration to bypass client-side header issues
app.post("/api/integrate-ai", async (req, res) => {
  const { apiKey, data, model } = req.body;
  if (!apiKey || !data) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
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
    res.status(200).send(resultHtml);
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

// API endpoint to generate a real .docx file from HTML
app.post('/api/generate-docx', async (req, res) => {
  try {
    let { html, title } = req.body;
    if (!html) return res.status(400).json({ error: 'No content' });

    console.log('Generating .docx from HTML. Raw length:', html.length);

    // CRITICAL: html-to-docx fails with "unsupported file type: undefined" if it finds <img> tags 
    // with invalid, empty, or placeholder src attributes. 
    // We must strictly sanitize all <img> tags.
    let cleanedHtml = html;
    
    // 1. Remove images that use placeholders which weren't replaced
    // This is a safety measure to remove any residual placeholders
    cleanedHtml = cleanedHtml.replace(/<img[^>]+src=["']\[\[RESERVED_IMG_CONTENT_\d+\]\]["'][^>]*>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<img[^>]+src=["']FILE_IMAGE_[^"']*["'][^>]*>/gi, '');
    
    // 2. Comprehensive check for all <img> tags to ensure only valid data: or http: sources remain
    // We use a more aggressive approach: find all img tags and only keep ones that have a valid src
    cleanedHtml = cleanedHtml.replace(/<img[^>]+>/gi, (imgTag) => {
      try {
        // Extract the src attribute using a few different patterns to be safe
        const srcMatch = imgTag.match(/src\s*=\s*(['"])(.*?)\1/i) || imgTag.match(/src\s*=\s*([^>\s]+)/i);
        
        if (!srcMatch) {
          console.warn('Stripping img tag with no src attribute');
          return '';
        }
        
        const src = srcMatch[2] || srcMatch[1]; // [2] for quoted, [1] for unquoted
        
        // Check if it's a data URL
        if (src.startsWith('data:image/')) {
          if (src.includes('data:undefined')) return '';
          
          try {
            // Validate the base64 content
            const base64Data = src.split(';base64,')[1];
            if (!base64Data) return '';
            const buffer = Buffer.from(base64Data, 'base64');
            sizeOf(buffer); // Throws if invalid
          } catch (e) {
            console.warn('Stripping data:image tag with invalid buffer content');
            return '';
          }
          
          // Re-construct the tag to be clean
          return `<img src="${src}" style="max-width: 100%; height: auto;" />`;
        }
        
        // Check if it's a real web URL
        if (src.startsWith('http://') || src.startsWith('https://')) {
          return `<img src="${src}" style="max-width: 100%; height: auto;" />`;
        }
      } catch (e) {
        console.error('Error sanitizing image tag:', e);
      }
      
      return ''; 
    });

    console.log('Cleaned HTML length:', cleanedHtml.length);

    // @ts-ignore
    const fileBuffer = await HTMLtoDOCX(cleanedHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      font: 'Times New Roman',
      fontSize: 26,
    });

    const safeTitle = (title || 'lesson-plan').replace(/[^a-zA-Z0-9.\-_ ]/g, '_');
    const encodedTitle = encodeURIComponent(title || 'lesson-plan');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"; filename*=UTF-8''${encodedTitle}.docx`);
    res.send(Buffer.from(fileBuffer));
  } catch (error: any) {
    console.error('DOCX Generation Error:', error);
    // Log a bit of the HTML to help debug
    if (req.body.html) {
      console.error('HTML Snippet:', req.body.html.substring(0, 500));
    }
    res.status(500).json({ error: `Không thể tạo file .docx: ${error.message || 'Lỗi không xác định'}` });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });

  // Global error handler to ensure JSON responses even for middleware errors
  app.use((err: any, req: any, res: any, next: any) => {
    console.error('Global Server Error:', err);
    res.status(err.status || 500).json({ 
      error: err.message || 'Lỗi hệ thống không xác định' 
    });
  });
}

startServer();
