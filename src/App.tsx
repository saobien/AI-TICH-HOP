import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Key, Loader2, CheckCircle2, AlertCircle, Trash2, Sparkles, Settings2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import { cn } from './lib/utils';
import { integrateAIIntoLessonPlan } from './services/geminiService';

const GRADES = ['Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5', 'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9', 'Lớp 10', 'Lớp 11', 'Lớp 12'];
const SUBJECTS = [
  'Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lí', 'Hóa học', 'Sinh học', 
  'Lịch sử', 'Địa lí', 'Giáo dục kinh tế và pháp luật', 'Tin học', 
  'Công nghệ', 'Âm nhạc', 'Mĩ thuật', 'Giáo dục thể chất', 'Hoạt động trải nghiệm, hướng nghiệp'
];

const MODELS = [
  { id: 'gemini-3-flash-preview', name: 'Gemini 2.0 Flash (Nhanh)', selected: true },
  { id: 'gemini-3.1-pro-preview', name: 'Gemini 1.5 Pro (Thông minh)', selected: false },
];

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [imageMap, setImageMap] = useState<{[key: string]: string}>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultHtml, setResultHtml] = useState('');
  const [docxBlob, setDocxBlob] = useState<Blob | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);
    const savedModel = localStorage.getItem('GEMINI_MODEL');
    if (savedModel) setSelectedModel(savedModel);
  }, []);

    // Conversion for preview: replace placeholders with real dataUrls
    const renderPreviewHtml = (html: string) => {
      let preview = html;
      Object.entries(imageMap).forEach(([id, dataUrl]) => {
        const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedId, 'gi');
        preview = preview.replace(regex, dataUrl as string);
      });
      return preview;
    };

  const handleSaveConfig = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    localStorage.setItem('GEMINI_MODEL', selectedModel);
    alert('Đã lưu cấu hình!');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx') {
      setError('Hỗ trợ duy nhất định dạng .docx (Word 2007 trở lên)');
      return;
    }

    setFile(selectedFile);
    setError('');
    setImageMap({});

    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      try {
        let imageCounter = 0;
        const currentImageMap: {[key: string]: string} = {};
        const result = await mammoth.convertToHtml(
          { arrayBuffer },
          { 
            ignoreEmptyParagraphs: false,
            styleMap: [
              "u => u",
              "i => i",
              "em => i",
              "b => b",
              "strong => b",
              "strike => s",
              "p[style-name='Section Title'] => h1:fresh",
              "p[style-name='Subsection Title'] => h2:fresh",
              "p[style-name='Normal'] => p:fresh",
              "p[style-name='Title'] => h1:fresh",
              "p[style-name='Subtitle'] => h2:fresh",
              "p[style-name='Tiêu đề'] => h1:fresh",
              "p[style-name='Tiêu đề 1'] => h1:fresh",
              "p[style-name='Tiêu đề 2'] => h2:fresh",
              "p[style-name='Tiêu đề 3'] => h3:fresh",
              "p[style-name='Heading 1'] => h1:fresh",
              "p[style-name='Heading 2'] => h2:fresh",
              "p[style-name='Heading 3'] => h3:fresh",
              "p[style-name='Heading 4'] => h4:fresh",
              "p[style-name='Center'] => p.center:fresh",
              "p[style-name='Centered'] => p.center:fresh",
              "p[style-name='Quote'] => blockquote:fresh",
            ],
            convertImage: mammoth.images.imgElement((image: any) => {
              return image.read("base64").then((imageBuffer: string) => {
                const id = `[[RESERVED_IMG_CONTENT_${imageCounter++}]]`;
                const dataUrl = `data:${image.contentType};base64,${imageBuffer}`;
                currentImageMap[id] = dataUrl;
                return { src: id };
              });
            })
          }
        );
        setImageMap(currentImageMap);
        setHtmlContent(result.value);
      } catch (err) {
        setError('Lỗi khi đọc file DOCX. Vui lòng kiểm tra lại file của bạn.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleProcess = async () => {
    if (!apiKey) {
      setError('Vui lòng nhập API Key');
      return;
    }
    if (!subject || !grade || !htmlContent) {
      setError('Vui lòng điền đầy đủ thông tin và tải file');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResultHtml('');

    try {
      const integratedHtml = await integrateAIIntoLessonPlan(apiKey, {
        subject,
        grade,
        htmlContent: htmlContent
      }, selectedModel);
      setResultHtml(integratedHtml || '');

      // Pre-generate DOCX immediately after processing
      if (integratedHtml) {
        let docxHtml = integratedHtml;
        Object.entries(imageMap).forEach(([id, dataUrl]) => {
          const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(src=["'])?${escapedId}(["'])?`, 'gi');
          docxHtml = docxHtml.replace(regex, (match, p1, p2) => {
            if (p1 && p2) return `${p1}${dataUrl}${p2}`;
            return dataUrl as string;
          });
        });

        const styles = `
          <style>
            @page { margin: 2cm 1.5cm 2cm 3cm; }
            body { 
              font-family: 'Times New Roman', serif; 
              font-size: 13pt; 
              line-height: 1.5; 
              color: #000; 
              text-align: justify; 
            }
            h1, h2, h3, h4 { color: #000; font-weight: bold; margin-top: 12pt; margin-bottom: 6pt; }
            h1 { font-size: 16pt; text-transform: uppercase; text-align: center; }
            h2 { font-size: 14pt; padding-bottom: 2pt; }
            p { margin: 0 0 10pt 0; text-align: justify; }
            table { border-collapse: collapse; width: 100%; margin: 12pt 0; border: 1pt solid black; }
            td, th { padding: 8pt; vertical-align: top; font-size: 13pt; border: 1pt solid black; }
            th { background-color: #f2f2f2; font-weight: bold; text-align: center; }
            span[style*="color: blue"] { color: blue; font-weight: bold; }
            b, strong { font-weight: bold; }
            i, em { font-style: italic; }
            u { text-decoration: underline; }
            .center { text-align: center; }
            .right { text-align: right; }
            .justify { text-align: justify; }
            img { max-width: 100%; height: auto; display: block; margin: 12pt auto; }
          </style>
        `;
        const fullHtml = `<html><head><meta charset="utf-8">${styles}</head><body>${docxHtml}</body></html>`;

        const docxResponse = await fetch('/api/generate-docx', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html: fullHtml,
            title: `Giao_an_AI_${subject}_${grade}`
          })
        });

        if (docxResponse.ok) {
          const blob = await docxResponse.blob();
          setDocxBlob(blob);
        }
      }
    } catch (err: any) {
      console.error('AI Integration Error:', err);
      const errorMessage = err.message || (typeof err === 'object' ? JSON.stringify(err) : 'Có lỗi xảy ra.');
      setError(`Lỗi: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (docxBlob) {
      saveAs(docxBlob, `Giao_an_AI_${subject}_${grade}.docx`);
    } else {
      setError('File chưa sẵn sàng hoặc có lỗi khi tạo. Vui lòng bấm "Thiết kế giáo án AI" để tạo lại.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] font-sans text-[#064E3B] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-4 bg-white rounded-full mb-6 shadow-lg shadow-emerald-500/10 border border-emerald-50"
          >
            <div className="w-24 h-24 md:w-32 md:h-32 flex items-center justify-center">
              <img 
                src="/image/logovh.jpg" 
                alt="Logo Trường THPT Văn Hiến" 
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'w-full h-full bg-emerald-100 rounded-full flex items-center justify-center';
                    fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sparkles"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-black text-emerald-900 mb-4 tracking-tight uppercase"
          >
            TÍCH HỢP AI VÀO <span className="text-emerald-600">KẾ HOẠCH BÀI DẠY</span>
          </motion.h1>
          <div className="space-y-2">
            <p className="text-lg font-medium text-emerald-800/80 max-w-2xl mx-auto">
              Tự động tích hợp năng lực AI vào giáo án mẫu 5512, giữ nguyên định dạng và làm nổi bật nội dung mới.
            </p>
            <p className="text-sm font-semibold text-emerald-600">
              Hỗ trợ tích hợp AI vào KHBD bởi Trần Quốc Minh_GV Trường THPT Văn Hiến
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar - Config */}
          <aside className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-emerald-900/5 border border-emerald-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-emerald-800">
                  <Settings2 className="w-6 h-6 text-emerald-500" /> Cấu hình
                </h2>
                <button 
                  onClick={handleSaveConfig}
                  className="bg-emerald-500 text-white p-2 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  <CheckCircle2 className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2 text-emerald-900/60 uppercase tracking-wider">Gemini API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Nhập API Key..."
                    className="w-full bg-emerald-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm focus:border-emerald-500 focus:bg-white transition-all outline-none"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold mb-2 text-emerald-900/60 uppercase tracking-wider">Mô hình AI</label>
                  <div className="space-y-2">
                    {MODELS.map(m => (
                      <label key={m.id} className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl cursor-pointer hover:bg-emerald-50 transition-colors border-2 border-transparent has-[:checked]:border-emerald-500">
                        <input 
                          type="radio" 
                          name="model" 
                          value={m.id} 
                          checked={selectedModel === m.id}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 bg-emerald-100 border-emerald-300"
                        />
                        <span className="text-sm font-medium text-emerald-900">{m.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-[2rem] p-8 shadow-xl shadow-emerald-900/5 border border-emerald-100">
              <h2 className="flex items-center gap-2 text-xl font-bold mb-6 text-emerald-800">
                <FileText className="w-6 h-6 text-emerald-500" /> Thông tin bài dạy
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2 text-emerald-900/60 uppercase tracking-wider">Môn học</label>
                  <select 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full bg-emerald-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm focus:border-emerald-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Chọn môn học...</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 text-emerald-900/60 uppercase tracking-wider">Khối lớp</label>
                  <select 
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-emerald-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm focus:border-emerald-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                  >
                    <option value="">Chọn khối lớp...</option>
                    {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
            </section>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-8 space-y-6">
            {/* Upload Area */}
            <section className="bg-white rounded-[2rem] p-10 shadow-xl shadow-emerald-900/5 border border-emerald-100 text-center">
              {!file ? (
                <div className="group border-4 border-dashed border-emerald-100 rounded-[2rem] p-16 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all cursor-pointer relative overflow-hidden">
                    <input
                      type="file"
                      accept=".docx"
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="relative z-0">
                      <div className="w-20 h-20 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                        <Upload className="w-10 h-10 text-emerald-600" />
                      </div>
                      <p className="text-2xl font-black text-emerald-900">Tải lên tài liệu</p>
                      <p className="text-emerald-600/60 mt-2 font-medium">Hỗ trợ duy nhất file Word (.docx)</p>
                    </div>
                </div>
              ) : (
                <div className="flex items-center justify-between bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                      <FileText className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-emerald-900 truncate max-w-[300px]">{file.name}</p>
                      <p className="text-sm text-emerald-600/60 font-bold uppercase tracking-tighter">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => { 
                      setFile(null); 
                      setHtmlContent(''); 
                      setResultHtml(''); 
                      setDocxBlob(null);
                      setImageMap({});
                      setError('');
                    }}
                    className="bg-white text-red-500 hover:bg-red-50 p-3 rounded-2xl transition-all shadow-sm active:scale-90"
                    title="Xóa tài liệu và giải phóng bộ nhớ"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>
              )}

              <button
                disabled={isProcessing || !file || !subject || !grade}
                onClick={handleProcess}
                className={cn(
                  "mt-10 w-full py-5 rounded-[1.5rem] font-black text-xl transition-all flex items-center justify-center gap-3 shadow-2xl",
                  isProcessing || !file || !subject || !grade
                    ? "bg-emerald-100 text-emerald-300 cursor-not-allowed shadow-none"
                    : "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/30 hover:-translate-y-1 active:translate-y-0"
                )}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-7 h-7 animate-spin" />
                    Đang xử lý dữ liệu...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-6 h-6" />
                    Bắt đầu tích hợp AI
                  </>
                )}
              </button>
            </section>

            {/* Input Preview Area */}
            <AnimatePresence>
              {htmlContent && !resultHtml && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="bg-white rounded-[2rem] p-10 shadow-xl shadow-emerald-900/5 border border-emerald-100"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-black text-emerald-900 uppercase tracking-tight">Nội dung gốc</h2>
                    <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-4 py-2 rounded-xl text-sm">
                      <FileText className="w-4 h-4" /> 
                      Phát hiện: Định dạng .docx
                    </div>
                  </div>
                  <div className="relative bg-emerald-50/20 rounded-3xl border border-emerald-100 p-8 overflow-auto max-h-[400px]">
                    <div 
                      className="prose prose-emerald max-w-none prose-headings:text-emerald-900 prose-p:text-emerald-800"
                      dangerouslySetInnerHTML={{ __html: renderPreviewHtml(htmlContent) }} 
                    />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* Error Display */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-50 border-2 border-red-100 text-red-700 px-8 py-5 rounded-3xl flex items-center gap-4 shadow-lg shadow-red-900/5"
                >
                  <AlertCircle className="w-6 h-6 flex-shrink-0" />
                  <p className="font-bold">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Result Area */}
            <AnimatePresence>
              {resultHtml && (
                <motion.section
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-[2rem] p-10 shadow-2xl shadow-emerald-900/10 border border-emerald-100"
                >
                  <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
                    <div>
                      <h2 className="text-2xl font-black text-emerald-900">Giáo án đã tích hợp</h2>
                      <div className="flex flex-col gap-1">
                        <p className="text-emerald-600 font-medium">Nội dung AI được đánh dấu bằng <span className="text-blue-600 font-bold">màu xanh dương</span></p>
                        <p className="text-xs text-amber-600 font-semibold italic flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Lưu ý: Vui lòng rà soát kỹ để đảm bảo AI không bỏ sót nội dung gốc do giới hạn xử lý.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                    >
                      <Download className="w-5 h-5" /> Tải về
                    </button>
                  </div>
                  
                  <div className="relative bg-white rounded-3xl border border-emerald-100 p-8 overflow-auto max-h-[600px] shadow-inner shadow-emerald-900/5">
                    <style>
                      {`
                        .word-preview {
                          font-family: 'Times New Roman', serif;
                          font-size: 13pt;
                          line-height: 1.5;
                          text-align: justify;
                          color: #000;
                        }
                        .word-preview h1 { text-align: center; width: 100%; font-size: 16pt; text-transform: uppercase; margin-top: 12pt; }
                        .word-preview h2 { font-size: 14pt; margin-top: 12pt; }
                        .word-preview p { text-align: justify; margin-bottom: 10pt; }
                        .word-preview .center { text-align: center; }
                        .word-preview .right { text-align: right; }
                        .word-preview .justify { text-align: justify; }
                        .word-preview table { border-collapse: collapse; width: 100%; border: 1px solid black; }
                        .word-preview td, .word-preview th { padding: 8px; border: 1px solid black; }
                        .word-preview span[style*="color: blue"] { color: blue; font-weight: bold; }
                      `}
                    </style>
                    <div 
                      className="prose prose-emerald max-w-none prose-headings:text-emerald-900 prose-p:text-emerald-800 word-preview"
                      dangerouslySetInnerHTML={{ __html: renderPreviewHtml(resultHtml) }}
                    />
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </main>
        </div>

        {/* Footer */}
        <footer className="mt-16 pb-8 text-center border-t border-emerald-100 pt-8">
          <p className="text-sm font-medium text-emerald-900/40 flex items-center justify-center gap-2">
            Powered by <span className="font-bold text-emerald-600">Gemini</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
