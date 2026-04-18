import type { VercelRequest, VercelResponse } from '@vercel/node';
import HTMLtoDOCX from 'html-to-docx';
import sizeOf from 'image-size';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add basic headers for safety
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  // Handle preflight (OPTIONS) request
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let { html, title } = req.body;
    if (!html) return res.status(400).json({ error: 'No content' });

    console.log('Generating .docx from HTML on Vercel. Raw length:', html.length);

    let cleanedHtml = html;
    
    // 1. Remove residual placeholders
    cleanedHtml = cleanedHtml.replace(/<img[^>]+src=["']\[\[RESERVED_IMG_CONTENT_\d+\]\]["'][^>]*>/gi, '');
    cleanedHtml = cleanedHtml.replace(/<img[^>]+src=["']FILE_IMAGE_[^"']*["'][^>]*>/gi, '');
    
    // 2. Comprehensive check for all <img> tags
    cleanedHtml = cleanedHtml.replace(/<img[^>]+>/gi, (imgTag) => {
      try {
        const srcMatch = imgTag.match(/src\s*=\s*(['"])(.*?)\1/i) || imgTag.match(/src\s*=\s*([^>\s]+)/i);
        if (!srcMatch) return '';
        
        const src = srcMatch[2] || srcMatch[1];
        
        if (src.startsWith('data:image/')) {
          if (src.includes('data:undefined')) return '';
          try {
            const base64Data = src.split(';base64,')[1];
            if (!base64Data) return '';
            const buffer = Buffer.from(base64Data, 'base64');
            sizeOf(buffer);
          } catch (e) {
            return '';
          }
          return `<img src="${src}" style="max-width: 100%; height: auto;" />`;
        }
        
        if (src.startsWith('http://') || src.startsWith('https://')) {
          return `<img src="${src}" style="max-width: 100%; height: auto;" />`;
        }
      } catch (e) {
        console.error('Error sanitising image tag:', e);
      }
      return ''; 
    });

    // @ts-ignore
    const fileBuffer = await HTMLtoDOCX(cleanedHtml, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
      font: 'Times New Roman',
      fontSize: 26, // 13pt
    });

    const safeTitle = (title || 'lesson-plan').replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const encodedTitle = encodeURIComponent(title || 'lesson-plan');
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}.docx"; filename*=UTF-8''${encodedTitle}.docx`);
    res.setHeader('Content-Length', Buffer.byteLength(fileBuffer));
    
    return res.end(fileBuffer);
  } catch (error: any) {
    console.error('DOCX Generation Error:', error);
    return res.status(500).json({ error: `Không thể tạo file .docx: ${error.message || 'Lỗi không xác định'}` });
  }
}
