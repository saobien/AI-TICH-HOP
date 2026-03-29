import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Key, Loader2, CheckCircle2, AlertCircle, Trash2, Sparkles } from 'lucide-react';
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

export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [htmlContent, setHtmlContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultHtml, setResultHtml] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSaveKey = () => {
    localStorage.setItem('GEMINI_API_KEY', apiKey);
    alert('Đã lưu API Key vào trình duyệt!');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.docx')) {
      setError('Vui lòng chọn file định dạng .docx');
      return;
    }

    setFile(selectedFile);
    setError('');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const arrayBuffer = event.target?.result as ArrayBuffer;
      try {
        // Convert docx to HTML to preserve formatting for Gemini
        const result = await mammoth.convertToHtml({ arrayBuffer });
        setHtmlContent(result.value);
      } catch (err) {
        setError('Không thể đọc nội dung file Word.');
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
      setError('Vui lòng điền đầy đủ thông tin và tải file giáo án');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResultHtml('');

	try {
	  setError('');
	  setResultHtml('');

	  if (!apiKey) {
		throw new Error("Vui lòng nhập API key");
	  }

	  const integratedHtml = await integrateAIIntoLessonPlan(apiKey, {
		subject,
		grade,
		htmlContent
	  });

	  if (!integratedHtml) {
		throw new Error("AI không trả dữ liệu");
	  }

	  setResultHtml(integratedHtml);

	} catch (err: any) {
	  console.error(err);
	  setError(err.message || "Có lỗi xảy ra");
	} finally {
	  setIsProcessing(false);
	}
  };

  const handleDownload = () => {
    if (!resultHtml) return;

    // Use a trick: Word can open HTML files and preserve formatting.
    // We wrap the HTML in a full document structure with the correct MIME type.
    const header = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Export</title>
      <style>
        body { font-family: 'Times New Roman', serif; }
        table { border-collapse: collapse; width: 100%; }
        table, th, td { border: 1px solid black; padding: 5px; }
        .ai-content { color: blue; }
      </style>
      </head><body>
    `;
    const footer = "</body></html>";
    const source = header + resultHtml + footer;

    const blob = new Blob(['\ufeff', source], {
      type: 'application/msword'
    });

    saveAs(blob, `Giao_an_AI_${subject}_${grade}.doc`);
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] font-sans text-[#064E3B] p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="mb-12 text-center">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="inline-block p-3 bg-emerald-100 rounded-2xl mb-4"
          >
            <Sparkles className="w-8 h-8 text-emerald-600" />
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
              <h2 className="flex items-center gap-2 text-xl font-bold mb-6 text-emerald-800">
                <Key className="w-6 h-6 text-emerald-500" /> Cấu hình
              </h2>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-bold mb-2 text-emerald-900/60 uppercase tracking-wider">Gemini API Key</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Nhập API Key..."
                      className="flex-1 bg-emerald-50 border-2 border-transparent rounded-2xl px-5 py-3 text-sm focus:border-emerald-500 focus:bg-white transition-all outline-none"
                    />
                    <button 
                      onClick={handleSaveKey}
                      title="Lưu Key"
                      className="bg-emerald-500 text-white p-3 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                    >
                      <CheckCircle2 className="w-6 h-6" />
                    </button>
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
                    <p className="text-2xl font-black text-emerald-900">Tải lên giáo án gốc</p>
                    <p className="text-emerald-600/60 mt-2 font-medium">Hỗ trợ định dạng .docx (Word)</p>
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
                    onClick={() => { setFile(null); setHtmlContent(''); }}
                    className="bg-white text-red-500 hover:bg-red-50 p-3 rounded-2xl transition-all shadow-sm active:scale-90"
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
                      <p className="text-emerald-600 font-medium">Nội dung AI được đánh dấu bằng <span className="text-blue-600 font-bold">màu xanh dương</span></p>
                    </div>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                    >
                      <Download className="w-5 h-5" /> Tải về (.doc)
                    </button>
                  </div>
                  
                  <div className="relative bg-emerald-50/30 rounded-3xl border border-emerald-100 p-8 overflow-auto max-h-[600px]">
                    <div 
                      className="prose prose-emerald max-w-none prose-headings:text-emerald-900 prose-p:text-emerald-800"
                      dangerouslySetInnerHTML={{ __html: resultHtml }}
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
