import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import multer from 'multer';
import HTMLtoDOCX from 'html-to-docx';
import sizeOf from 'image-size';

const app = express();
const PORT = 3000;
app.use(express.json({ limit: '50mb' }));
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

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=${encodeURIComponent(title || 'lesson-plan')}.docx`);
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
