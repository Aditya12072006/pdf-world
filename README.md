# 🌎 PDF World - The Ultimate PDF Toolbox

**PDF World** is a high-performance web application for practical, day-to-day PDF work. From quick merge/split actions to advanced conversions and page-level editing, PDF World is designed to be fast, free, and simple to use.

## ✨ Key Features
- **Convert:** Word to PDF, Excel to PDF, PPT to PDF, JPG/PNG/BMP/TIFF to PDF, TXT/RTF/ODT/HTML to PDF.
- **Export from PDF:** PDF to Word, PDF to Excel, PDF to PPT, PDF to JPG/PNG, PDF to Text, PDF to PDF/A.
- **Organize:** Merge, Split, Remove Pages, Extract Pages, Organize Pages, Rotate PDF, Scan to PDF.
- **Optimize & Edit:** Compress PDF, Repair PDF, OCR PDF, Edit PDF, Annotate PDF, Read PDF, Crop PDF.
- **Signing & Marking:** Sign Pages, Add Watermark, Number Pages.
- **Privacy-first workflow:** Files are processed temporarily and not stored permanently.

## 🚀 Tech Stack
- **Frontend:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS
- **PDF/Document Engine:** pdf-lib, pdf-parse, docx, xlsx, sharp, jszip
- **Runtime:** Node.js

## 📈 Roadmap
- [x] Core UI/UX and tool architecture
- [x] Multi-tool conversion and organization workflows
- [x] Advanced page-level controls (rotate scope, split modes, watermark/number/sign options)
- [ ] Improve conversion fidelity for complex layouts
- [ ] Add richer in-browser preview experience

## 🛠️ Local Development
1. Install dependencies:
   ```bash
   npm install
   ```
2. Run dev server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   npm run start
   ```

## 📦 Deployment Notes
- This app uses Next.js dynamic API routes for file processing.
- Use a deployment target that supports Node.js server-side execution (for example Firebase App Hosting or Vercel).
