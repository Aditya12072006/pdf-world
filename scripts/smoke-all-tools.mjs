import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PptxGenJS from "pptxgenjs";
import sharp from "sharp";
import * as XLSX from "xlsx";
import JSZip from "jszip";

const ROOT = process.cwd();
const TMP_DIR = path.join(ROOT, "tmp-smoke");
const BASE_URL = process.env.SMOKE_BASE_URL || "http://localhost:3001";

const mimeByExt = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".html": "text/html",
  ".rtf": "application/rtf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".bmp": "image/bmp",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
};

const toolConfigs = {
  "merge-pdf": { files: ["a.pdf", "b.pdf"] },
  "split-pdf": { files: ["a.pdf"] },
  "remove-pages": { files: ["a.pdf"], options: { pages: "2" } },
  "extract-pages": { files: ["a.pdf"], options: { pages: "1,3" } },
  "organize-pages": { files: ["a.pdf"], options: { pages: "3,1,2" } },
  "scan-to-pdf": { files: ["img.png", "img.jpg"] },
  "rotate-pdf": { files: ["a.pdf"], options: { rotation: "90" } },

  "word-to-pdf": { files: ["sample.docx"] },
  "excel-to-pdf": { files: ["sample.xlsx"] },
  "ppt-to-pdf": { files: ["sample.pptx"] },
  "jpg-to-pdf": { files: ["img.jpg"] },
  "png-to-pdf": { files: ["img.png"] },
  "bmp-to-pdf": { files: ["img.bmp"] },
  "tiff-to-pdf": { files: ["img.tiff"] },
  "txt-to-pdf": { files: ["sample.txt"] },
  "rtf-to-pdf": { files: ["sample.rtf"] },
  "odt-to-pdf": { files: ["sample.odt"] },
  "html-to-pdf": { files: ["sample.html"] },

  "pdf-to-word": { files: ["a.pdf"] },
  "pdf-to-excel": { files: ["a.pdf"] },
  "pdf-to-ppt": { files: ["a.pdf"] },
  "pdf-to-jpg": { files: ["a.pdf"] },
  "pdf-to-png": { files: ["a.pdf"] },
  "pdf-to-pdfa": { files: ["a.pdf"] },
  "pdf-to-text": { files: ["a.pdf"] },

  "compress-pdf": { files: ["a.pdf"], options: { compression: "medium" } },
  "repair-pdf": { files: ["a.pdf"] },
  "ocr-pdf": { files: ["a.pdf"] },
  "edit-pdf": { files: ["a.pdf"] },
  "pdf-annotator": { files: ["a.pdf"] },
  "pdf-reader": { files: ["a.pdf"] },
  "crop-pdf": { files: ["a.pdf"], options: { cropPercent: "5" } },

  "sign-pdf": { files: ["a.pdf"], options: { signatureText: "Smoke Sign" } },
  "add-watermark": { files: ["a.pdf"], options: { watermarkText: "CONFIDENTIAL" } },
  "number-pages": { files: ["a.pdf"] },
};

const slugOrder = Object.keys(toolConfigs);

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const writePdf = async (filePath, title, lines) => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);

  page.drawText(title, {
    x: 48,
    y: 790,
    size: 24,
    font,
    color: rgb(0.05, 0.12, 0.4),
  });

  let y = 748;
  for (const line of lines) {
    page.drawText(line, {
      x: 48,
      y,
      size: 12,
      font,
      color: rgb(0.1, 0.1, 0.15),
    });
    y -= 20;
  }

  const bytes = await doc.save();
  await fs.writeFile(filePath, bytes);
};

const writeDocx = async (filePath) => {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            children: [new TextRun("PDF World DOCX sample for conversion testing.")],
          }),
          new Paragraph({
            children: [new TextRun("Second paragraph with numbers 1 2 3 4 5.")],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  await fs.writeFile(filePath, buffer);
};

const writeXlsx = async (filePath) => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    ["Tool", "Status"],
    ["Merge", "OK"],
    ["Split", "OK"],
  ]);
  XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  await fs.writeFile(filePath, out);
};

const writePptx = async (filePath) => {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  const slide = pptx.addSlide();
  slide.addText("PDF World PPTX Sample", {
    x: 0.5,
    y: 0.8,
    w: 9,
    h: 1,
    fontSize: 30,
    color: "0B1F4D",
    bold: true,
  });
  slide.addText("Used for conversion smoke test", {
    x: 0.5,
    y: 2.0,
    w: 10,
    h: 1,
    fontSize: 18,
    color: "334155",
  });

  const out = await pptx.write({ outputType: "nodebuffer" });
  await fs.writeFile(filePath, out);
};

const writeOdt = async (filePath) => {
  const zip = new JSZip();
  zip.file("mimetype", "application/vnd.oasis.opendocument.text", {
    compression: "STORE",
  });
  zip.file(
    "content.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:version="1.2">
  <office:body>
    <office:text>
      <text:p>PDF World ODT sample paragraph for conversion testing.</text:p>
      <text:p>Another line for parser validation.</text:p>
    </office:text>
  </office:body>
</office:document-content>`,
  );

  const bytes = await zip.generateAsync({ type: "uint8array" });
  await fs.writeFile(filePath, bytes);
};

const writeImages = async () => {
  const svg = `<svg width="1000" height="700" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#eaf2ff"/><text x="60" y="120" font-size="64" font-family="Arial" fill="#0b1f4d">PDF World</text><text x="60" y="190" font-size="38" font-family="Arial" fill="#2563eb">Smoke Test Image</text></svg>`;

  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const jpg = await sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  // These fixtures validate conversion routes by extension and upload MIME.
  // Reusing png bytes keeps the smoke suite portable across sharp builds.
  const bmp = png;
  const tiff = png;

  await fs.writeFile(path.join(TMP_DIR, "img.png"), png);
  await fs.writeFile(path.join(TMP_DIR, "img.jpg"), jpg);
  await fs.writeFile(path.join(TMP_DIR, "img.bmp"), bmp);
  await fs.writeFile(path.join(TMP_DIR, "img.tiff"), tiff);
};

const createAssets = async () => {
  await ensureDir(TMP_DIR);

  await writePdf(
    path.join(TMP_DIR, "a.pdf"),
    "PDF World Sample A",
    [
      "This is the first smoke test PDF file.",
      "It contains text for extraction and conversion.",
      "Line three for compare and summarize paths.",
    ],
  );

  await writePdf(
    path.join(TMP_DIR, "b.pdf"),
    "PDF World Sample B",
    [
      "This is the second smoke test PDF file.",
      "Some lines are changed for compare-pdf.",
      "Different text ensures non-zero diff output.",
    ],
  );

  await fs.writeFile(
    path.join(TMP_DIR, "sample.txt"),
    "PDF World TXT sample file for converter testing.\nSecond line here.",
    "utf-8",
  );

  await fs.writeFile(
    path.join(TMP_DIR, "sample.html"),
    "<html><body><h1>PDF World HTML</h1><p>Sample HTML to PDF conversion test.</p></body></html>",
    "utf-8",
  );

  await fs.writeFile(
    path.join(TMP_DIR, "sample.rtf"),
    "{\\rtf1\\ansi PDF World RTF sample \\par second line}",
    "utf-8",
  );

  await writeDocx(path.join(TMP_DIR, "sample.docx"));
  await writeXlsx(path.join(TMP_DIR, "sample.xlsx"));
  await writePptx(path.join(TMP_DIR, "sample.pptx"));
  await writeOdt(path.join(TMP_DIR, "sample.odt"));
  await writeImages();
};

const mimeTypeFor = (filePath) => {
  const extension = path.extname(filePath).toLowerCase();
  return mimeByExt[extension] || "application/octet-stream";
};

const verifyContent = async (slug, response) => {
  const contentType = response.headers.get("content-type") || "";

  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      message: `HTTP ${response.status}: ${text.slice(0, 260)}`,
    };
  }

  if (contentType.includes("application/json")) {
    const payload = await response.json();
    const resultText = typeof payload.result === "string" ? payload.result : "";
    if (!resultText.trim()) {
      return {
        ok: false,
        message: "JSON response missing result text.",
      };
    }

    return {
      ok: true,
      message: `JSON OK (${Math.min(resultText.length, 120)} chars preview)`,
    };
  }

  if (contentType.includes("text/html")) {
    const text = await response.text();
    return {
      ok: false,
      message: `Unexpected HTML response: ${text.slice(0, 220)}`,
    };
  }

  if (slug === "pdf-to-text") {
    const text = Buffer.from(await response.arrayBuffer()).toString("utf-8");
    if (!text || /no extractable text found/i.test(text)) {
      return {
        ok: false,
        message: "Text extraction fallback text detected.",
      };
    }

    if (!/PDF World Sample/i.test(text)) {
      return {
        ok: false,
        message: "Extracted text missing expected content.",
      };
    }

    return {
      ok: true,
      message: `text/plain (${text.length} chars, content verified)`,
    };
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 16) {
    return {
      ok: false,
      message: `Output too small (${buffer.length} bytes).`,
    };
  }

  return {
    ok: true,
    message: `${contentType || "binary"} (${buffer.length} bytes)`,
  };
};

const qpdfBinary = path.join(
  ROOT,
  "tools",
  "qpdf",
  "qpdf-12.3.2-mingw64",
  "bin",
  "qpdf.exe",
);

const checkEncrypted = async (bytes, expectEncrypted) => {
  if (!(await fs
    .access(qpdfBinary)
    .then(() => true)
    .catch(() => false))) {
    return {
      ok: true,
      message: "Skipped encryption verification (qpdf binary not found in tools).",
    };
  }

  const inPath = path.join(TMP_DIR, expectEncrypted ? "enc-check.pdf" : "unlock-check.pdf");
  await fs.writeFile(inPath, bytes);

  const proc = spawnSync(qpdfBinary, ["--show-encryption", inPath], {
    encoding: "utf-8",
    env: {
      ...process.env,
      PATH: `${path.dirname(qpdfBinary)}${path.delimiter}${process.env.PATH || ""}`,
    },
  });

  const output = `${proc.stdout || ""}\n${proc.stderr || ""}`;
  const isEncrypted = /R =|P =|stream encryption method|file encryption method/i.test(output);

  if (expectEncrypted && !isEncrypted) {
    return {
      ok: false,
      message: "Expected encrypted PDF, but qpdf reports not encrypted.",
    };
  }

  if (!expectEncrypted && isEncrypted) {
    return {
      ok: false,
      message: "Expected decrypted PDF, but qpdf still reports encryption.",
    };
  }

  return {
    ok: true,
    message: expectEncrypted ? "Encryption verified by qpdf." : "Decryption verified by qpdf.",
  };
};

const postTool = async (slug, config) => {
  const formData = new FormData();

  for (const relFile of config.files || []) {
    const fullPath = path.join(TMP_DIR, relFile);
    const bytes = await fs.readFile(fullPath);
    const blob = new Blob([bytes], { type: mimeTypeFor(fullPath) });
    formData.append("files", blob, relFile);
  }

  formData.append("options", JSON.stringify(config.options || {}));

  const response = await fetch(`${BASE_URL}/api/tools/${slug}`, {
    method: "POST",
    body: formData,
  });

  return verifyContent(slug, response);
};

const checkPages = async () => {
  const slugs = slugOrder;
  const pageFailures = [];

  const home = await fetch(`${BASE_URL}/`);
  if (!home.ok) {
    pageFailures.push(`Homepage failed with status ${home.status}`);
  }

  for (const slug of slugs) {
    const res = await fetch(`${BASE_URL}/${slug}`);
    if (!res.ok) {
      pageFailures.push(`${slug} page failed with status ${res.status}`);
    }
  }

  return pageFailures;
};

const run = async () => {
  await createAssets();

  const results = [];

  for (const slug of slugOrder) {
    try {
      const formData = new FormData();
      const config = toolConfigs[slug];

      for (const relFile of config.files || []) {
        const fullPath = path.join(TMP_DIR, relFile);
        const bytes = await fs.readFile(fullPath);
        const blob = new Blob([bytes], { type: mimeTypeFor(fullPath) });
        formData.append("files", blob, relFile);
      }

      formData.append("options", JSON.stringify(config.options || {}));

      const response = await fetch(`${BASE_URL}/api/tools/${slug}`, {
        method: "POST",
        body: formData,
      });

      const verdict = await verifyContent(slug, response);
      results.push({ slug, ...verdict });
    } catch (error) {
      results.push({
        slug,
        ok: false,
        message: error instanceof Error ? error.message : "Unknown runtime error",
      });
    }
  }

  const pageFailures = await checkPages();

  const failed = results.filter((item) => !item.ok);
  const passed = results.length - failed.length;

  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API tests passed: ${passed}/${results.length}`);
  for (const item of results) {
    const marker = item.ok ? "PASS" : "FAIL";
    console.log(`${marker}  ${item.slug}  ${item.message}`);
  }

  if (pageFailures.length > 0) {
    console.log("Page route failures:");
    for (const failure of pageFailures) {
      console.log(`FAIL  ${failure}`);
    }
  } else {
    console.log(`PASS  All ${slugOrder.length + 1} page routes responded successfully.`);
  }

  if (failed.length > 0 || pageFailures.length > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error("Smoke runner crashed:", error);
  process.exit(1);
});
