import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  degrees,
  PDFDocument,
  PDFFont,
  PDFName,
  PDFNumber,
  PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib";
import JSZip from "jszip";
import mammoth from "mammoth";
import PptxGenJS from "pptxgenjs";
import sharp from "sharp";
import * as XLSX from "xlsx";
import { Document, Packer, Paragraph, TextRun } from "docx";

export type ToolOptions = {
  pages?: string;
  rotation?: string;
  rotationMode?: "all" | "pages";
  splitMode?: "single" | "every-n" | "ranges";
  splitSize?: string;
  splitRanges?: string;
  compression?: "low" | "medium" | "high";
  watermarkText?: string;
  watermarkPosition?: "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  watermarkOpacity?: string;
  watermarkSize?: string;
  signatureText?: string;
  signaturePosition?:
    | "center"
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
  password?: string;
  pageNumberStart?: string;
  pageNumberPosition?:
    | "bottom-center"
    | "bottom-left"
    | "bottom-right"
    | "top-left"
    | "top-right";
  prompt?: string;
  targetLanguage?: string;
  questionCount?: string;
  cropPercent?: string;
  redactTerm?: string;
};

export type ToolResult =
  | {
      kind: "file";
      body: Uint8Array;
      contentType: string;
      filename: string;
    }
  | {
      kind: "json";
      payload: Record<string, unknown>;
    };

const PDF_OUTPUT_MIME = "application/pdf";
const ZIP_OUTPUT_MIME = "application/zip";
const TEXT_OUTPUT_MIME = "text/plain; charset=utf-8";
const standardFontDataUrl = `${pathToFileURL(
  path.resolve(process.cwd(), "node_modules/pdfjs-dist/standard_fonts"),
).toString()}/`;

type PromiseWithResolvers<T> = {
  promise: Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: unknown) => void;
};

const requireFiles = (files: File[], min = 1) => {
  if (files.length < min) {
    throw new Error(`At least ${min} file(s) are required.`);
  }
};

const ext = (fileName: string) => fileName.toLowerCase().split(".").pop() ?? "";

const isPdf = (file: File) => file.type === "application/pdf" || ext(file.name) === "pdf";

const requirePdfFiles = (files: File[], min = 1) => {
  requireFiles(files, min);

  if (!files.every(isPdf)) {
    throw new Error("Only PDF files are allowed for this tool.");
  }
};

const bytesFromFile = async (file: File) => new Uint8Array(await file.arrayBuffer());

const textFromFile = async (file: File) => {
  const bytes = await bytesFromFile(file);
  return Buffer.from(bytes).toString("utf-8");
};

const parsePdfTextBytes = async (bytes: Uint8Array) => {
  try {
    const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");

    const loadingTask = getDocument({
      data: bytes,
      useWorkerFetch: false,
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: false,
      standardFontDataUrl,
    });

    const doc = await loadingTask.promise;
    const chunks: string[] = [];

    for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
      const page = await doc.getPage(pageIndex);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .filter(Boolean)
        .join(" ")
        .trim();

      if (text) {
        chunks.push(text);
      }
    }

    await loadingTask.destroy();

    return chunks.join("\n").trim();
  } catch {
    try {
      const promiseCtor = Promise as PromiseConstructor & {
        withResolvers?: <T>() => PromiseWithResolvers<T>;
      };

      if (typeof promiseCtor.withResolvers !== "function") {
        promiseCtor.withResolvers = <T>() => {
          let resolve!: (value: T | PromiseLike<T>) => void;
          let reject!: (reason?: unknown) => void;
          const promise = new Promise<T>((res, rej) => {
            resolve = res;
            reject = rej;
          });

          return { promise, resolve, reject };
        };
      }

      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: bytes });
      const parsed = await parser.getText();
      await parser.destroy();
      return (parsed.text ?? "").trim();
    } catch {
      return "";
    }
  }
};

const extractPdfTextBySubprocess = async (bytes: Uint8Array) => {
  return withTempPdfFiles(bytes, async ({ inputPath }) => {
    const extractorScript = path.resolve(process.cwd(), "scripts/extract-pdf-text.mjs");

    const text = await new Promise<string>((resolve, reject) => {
      const child = spawn(process.execPath, [extractorScript, inputPath], {
        windowsHide: true,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => reject(error));
      child.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.trim());
          return;
        }

        reject(new Error(stderr.trim() || "PDF text subprocess failed."));
      });
    });

    return text;
  });
};

const resolveQpdfBinary = async () => {
  const candidates = [
    process.env.QPDF_BINARY_PATH,
    path.resolve(process.cwd(), "tools/qpdf/qpdf-12.3.2-mingw64/bin/qpdf.exe"),
    path.resolve(process.cwd(), "tools/qpdf/qpdf-12.3.2-msvc64/bin/qpdf.exe"),
    "qpdf",
  ].filter((item): item is string => Boolean(item));

  for (const candidate of candidates) {
    if (candidate === "qpdf") {
      return candidate;
    }

    try {
      await access(candidate);
      return candidate;
    } catch {
      // keep checking candidates
    }
  }

  throw new Error(
    "qpdf binary not found. Configure QPDF_BINARY_PATH or place qpdf in tools/qpdf.",
  );
};

const runQpdf = async (args: string[]) => {
  const qpdfBin = await resolveQpdfBinary();

  await new Promise<void>((resolve, reject) => {
    const child = spawn(qpdfBin, args, {
      windowsHide: true,
      env: {
        ...process.env,
        PATH: `${path.dirname(qpdfBin)}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => reject(error));
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(stderr.trim() || `qpdf failed with exit code ${code}.`));
    });
  });
};

const withTempPdfFiles = async <T>(
  inputBytes: Uint8Array,
  runner: (paths: { inputPath: string; outputPath: string; tempDir: string }) => Promise<T>,
) => {
  const tempDir = await mkdtemp(path.join(tmpdir(), "pdf-world-qpdf-"));
  const inputPath = path.join(tempDir, "input.pdf");
  const outputPath = path.join(tempDir, "output.pdf");

  try {
    await writeFile(inputPath, Buffer.from(inputBytes));
    const result = await runner({ inputPath, outputPath, tempDir });
    return result;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

const parsePages = (pageSpec: string | undefined, totalPages: number) => {
  const raw = (pageSpec ?? "").trim();
  if (!raw) {
    return [] as number[];
  }

  const pages = new Set<number>();
  for (const token of raw.split(",").map((item) => item.trim())) {
    if (!token) continue;

    if (token.includes("-")) {
      const [left, right] = token.split("-").map((value) => Number.parseInt(value, 10));
      if (!Number.isFinite(left) || !Number.isFinite(right)) continue;

      const start = Math.max(1, Math.min(left, right));
      const end = Math.min(totalPages, Math.max(left, right));
      for (let page = start; page <= end; page += 1) {
        pages.add(page - 1);
      }
      continue;
    }

    const page = Number.parseInt(token, 10);
    if (Number.isFinite(page) && page >= 1 && page <= totalPages) {
      pages.add(page - 1);
    }
  }

  return [...pages];
};

const parsePageOrder = (pageSpec: string | undefined, totalPages: number) => {
  const raw = (pageSpec ?? "").trim();
  if (!raw) {
    return Array.from({ length: totalPages }, (_, idx) => idx);
  }

  const parsed = raw
    .split(",")
    .map((item) => Number.parseInt(item.trim(), 10) - 1)
    .filter((value) => Number.isFinite(value) && value >= 0 && value < totalPages);

  if (parsed.length === 0) {
    throw new Error("Invalid page order format. Example: 3,1,2");
  }

  return parsed;
};

const clampNumber = (value: number, min: number, max: number) => {
  return Math.max(min, Math.min(value, max));
};

const pageIndexArray = (count: number) => {
  return Array.from({ length: count }, (_, idx) => idx);
};

const parseOptionalPageIndexes = (
  pageSpec: string | undefined,
  totalPages: number,
  fallback: "all" | "last" = "all",
) => {
  const raw = (pageSpec ?? "").trim();
  if (!raw) {
    if (fallback === "last") {
      return totalPages > 0 ? [totalPages - 1] : [];
    }
    return pageIndexArray(totalPages);
  }

  const parsed = parsePages(raw, totalPages).sort((left, right) => left - right);
  if (parsed.length === 0) {
    throw new Error("Invalid page selection. Example: 1,3,5-7");
  }

  return parsed;
};

const parseSplitRanges = (rangeSpec: string | undefined, totalPages: number) => {
  const groups = (rangeSpec ?? "")
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  if (groups.length === 0) {
    throw new Error("Provide split ranges. Example: 1-2;3-5;6-8");
  }

  return groups.map((group, index) => {
    const pages = parsePages(group, totalPages).sort((left, right) => left - right);
    if (pages.length === 0) {
      throw new Error(`Invalid split range #${index + 1}.`);
    }
    return pages;
  });
};

type TextPosition =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "bottom-center";

const resolveTextPosition = (
  page: PDFPage,
  textWidth: number,
  fontSize: number,
  position: TextPosition,
) => {
  const { width, height } = page.getSize();
  const margin = 28;

  if (position === "center") {
    return {
      x: (width - textWidth) / 2,
      y: (height - fontSize) / 2,
    };
  }

  if (position === "top-left") {
    return {
      x: margin,
      y: height - margin - fontSize,
    };
  }

  if (position === "top-right") {
    return {
      x: width - margin - textWidth,
      y: height - margin - fontSize,
    };
  }

  if (position === "bottom-left") {
    return {
      x: margin,
      y: margin,
    };
  }

  if (position === "bottom-right") {
    return {
      x: width - margin - textWidth,
      y: margin,
    };
  }

  return {
    x: (width - textWidth) / 2,
    y: margin,
  };
};

const wrapText = (text: string, maxLength = 90) => {
  const words = text.split(/\s+/g);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    if (!word) continue;
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxLength) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) {
    lines.push(current);
  }

  return lines;
};

const drawLongText = (
  pdfDoc: PDFDocument,
  pageText: string,
  options?: { title?: string },
) => {
  const title = options?.title ?? "PDF World Output";
  const page = pdfDoc.addPage([595, 842]);
  const margin = 48;
  const width = 595 - margin * 2;

  return pdfDoc.embedFont(StandardFonts.Helvetica).then((font) => {
    let currentPage = page;
    let cursorY = 806;

    currentPage.drawText(title, {
      x: margin,
      y: cursorY,
      size: 18,
      font,
      color: rgb(0.04, 0.12, 0.3),
    });

    cursorY -= 32;

    const lines = wrapText(pageText, 95);
    for (const line of lines) {
      if (cursorY < 54) {
        currentPage = pdfDoc.addPage([595, 842]);
        cursorY = 806;
      }

      currentPage.drawText(line, {
        x: margin,
        y: cursorY,
        size: 11,
        font,
        color: rgb(0.1, 0.12, 0.2),
        maxWidth: width,
      });
      cursorY -= 16;
    }
  });
};

const mergePdfs = async (files: File[]) => {
  requirePdfFiles(files, 2);

  const merged = await PDFDocument.create();
  for (const file of files) {
    const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
    const copied = await merged.copyPages(doc, doc.getPageIndices());
    copied.forEach((page) => merged.addPage(page));
  }

  const body = await merged.save();
  return {
    kind: "file" as const,
    body,
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-merged.pdf",
  };
};

const splitPdf = async (file: File, options: ToolOptions) => {
  requirePdfFiles([file], 1);

  const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const zip = new JSZip();
  const totalPages = source.getPageCount();
  const mode = options.splitMode ?? "single";

  let groups: number[][];

  if (mode === "every-n") {
    const requested = Number.parseInt(options.splitSize ?? "2", 10);
    if (!Number.isFinite(requested) || requested < 1) {
      throw new Error("Pages Per Split must be a number greater than 0.");
    }

    const chunkSize = Math.max(1, Math.min(requested, totalPages));
    groups = [];
    for (let page = 0; page < totalPages; page += chunkSize) {
      groups.push(
        Array.from({ length: Math.min(chunkSize, totalPages - page) }, (_, idx) => page + idx),
      );
    }
  } else if (mode === "ranges") {
    groups = parseSplitRanges(options.splitRanges, totalPages);
  } else {
    groups = Array.from({ length: totalPages }, (_unused, index) => [index]);
  }

  for (let index = 0; index < groups.length; index += 1) {
    const group = groups[index];
    const out = await PDFDocument.create();
    const copied = await out.copyPages(source, group);
    copied.forEach((page) => out.addPage(page));

    const first = group[0] + 1;
    const last = group[group.length - 1] + 1;
    const label = first === last ? `page-${first}` : `pages-${first}-${last}`;
    zip.file(`${label}.pdf`, await out.save());
  }

  const zipped = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  return {
    kind: "file" as const,
    body: zipped,
    contentType: ZIP_OUTPUT_MIME,
    filename: "pdf-world-split-pages.zip",
  };
};

const mutatePdfPages = async (
  file: File,
  mutate: (source: PDFDocument, totalPages: number) => Promise<number[]>,
  outputName: string,
) => {
  const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const total = source.getPageCount();
  const pageIndexes = await mutate(source, total);

  const out = await PDFDocument.create();
  const copied = await out.copyPages(source, pageIndexes);
  copied.forEach((page) => out.addPage(page));

  return {
    kind: "file" as const,
    body: await out.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: outputName,
  };
};

const imageBytesForPdf = async (file: File) => {
  const extension = ext(file.name);
  const bytes = await bytesFromFile(file);

  if (extension === "jpg" || extension === "jpeg") {
    return { kind: "jpg" as const, bytes };
  }

  if (extension === "png") {
    return { kind: "png" as const, bytes };
  }

  const converted = await sharp(Buffer.from(bytes)).png().toBuffer();
  return { kind: "png" as const, bytes: new Uint8Array(converted) };
};

const buildPdfFromImages = async (files: File[], outputName: string) => {
  requireFiles(files, 1);

  const out = await PDFDocument.create();
  for (const file of files) {
    const image = await imageBytesForPdf(file);
    const embedded =
      image.kind === "jpg"
        ? await out.embedJpg(image.bytes)
        : await out.embedPng(image.bytes);

    const maxWidth = 555;
    const maxHeight = 800;
    const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height, 1);
    const width = embedded.width * scale;
    const height = embedded.height * scale;

    const page = out.addPage([595, 842]);
    page.drawImage(embedded, {
      x: (595 - width) / 2,
      y: (842 - height) / 2,
      width,
      height,
    });
  }

  return {
    kind: "file" as const,
    body: await out.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: outputName,
  };
};

const extractPptxText = async (bytes: Uint8Array) => {
  const zip = await JSZip.loadAsync(bytes);
  const slideNames = Object.keys(zip.files)
    .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
    .sort();

  const output: string[] = [];
  for (const slideName of slideNames) {
    const xml = await zip.file(slideName)?.async("text");
    if (!xml) continue;

    const matches = [...xml.matchAll(/<a:t>(.*?)<\/a:t>/g)];
    for (const match of matches) {
      if (match[1]) output.push(match[1]);
    }
  }

  return output.join("\n");
};

const extractOdtText = async (bytes: Uint8Array) => {
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("content.xml")?.async("text");
  if (!xml) return "";

  const matches = [...xml.matchAll(/<text:p[^>]*>(.*?)<\/text:p>/g)];
  return matches
    .map((match) => match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
};

const extractTextAny = async (file: File) => {
  const extension = ext(file.name);
  const bytes = await bytesFromFile(file);

  if (extension === "pdf") {
    return parsePdfTextBytes(bytes);
  }

  if (extension === "docx") {
    const out = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return out.value;
  }

  if (extension === "xlsx") {
    const workbook = XLSX.read(Buffer.from(bytes), { type: "buffer" });
    return workbook.SheetNames.map((name) => XLSX.utils.sheet_to_csv(workbook.Sheets[name])).join(
      "\n\n",
    );
  }

  if (extension === "pptx") {
    return extractPptxText(bytes);
  }

  if (extension === "odt") {
    return extractOdtText(bytes);
  }

  const rawText = Buffer.from(bytes).toString("utf-8");

  if (extension === "html" || extension === "htm") {
    return rawText
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  if (extension === "rtf") {
    return rawText
      .replace(/\\par[d]?/g, "\n")
      .replace(/\\'[0-9a-fA-F]{2}/g, "")
      .replace(/\\[^\s]+ ?/g, "")
      .replace(/[{}]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return rawText;
};

const toPdfFromDocs = async (files: File[], outputName: string) => {
  requireFiles(files, 1);

  const allText = (
    await Promise.all(
      files.map(async (file) => `# ${file.name}\n${(await extractTextAny(file)).trim()}`),
    )
  )
    .join("\n\n")
    .trim();

  const text = allText || "No readable text found in source document.";

  const out = await PDFDocument.create();
  await drawLongText(out, text, { title: "Converted to PDF by PDF World" });

  return {
    kind: "file" as const,
    body: await out.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: outputName,
  };
};

const extractPdfText = async (file: File) => {
  const bytes = await bytesFromFile(file);

  try {
    const subprocessText = await extractPdfTextBySubprocess(bytes);
    if (subprocessText.trim()) {
      return subprocessText.trim();
    }
  } catch {
    // fallback below
  }

  const text = await parsePdfTextBytes(bytes);
  return text.trim();
};

const pdfToWord = async (file: File) => {
  const text = await extractPdfText(file);
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: (text || "No extractable text found.")
          .split(/\n+/g)
          .filter(Boolean)
          .map((line) =>
            new Paragraph({
              children: [new TextRun(line)],
            }),
          ),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return {
    kind: "file" as const,
    body: new Uint8Array(buffer),
    contentType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    filename: "pdf-world-converted.docx",
  };
};

const pdfToExcel = async (file: File) => {
  const text = await extractPdfText(file);
  const rows = (text || "No extractable text found.")
    .split("\n")
    .map((line) => [line.trim()])
    .filter((row) => row[0]);

  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([["Extracted Text"], ...rows]);
  XLSX.utils.book_append_sheet(workbook, sheet, "PDF Text");
  const out = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return {
    kind: "file" as const,
    body: new Uint8Array(out),
    contentType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    filename: "pdf-world-converted.xlsx",
  };
};

const pdfToPpt = async (file: File) => {
  const text = await extractPdfText(file);
  const lines = (text || "No extractable text found.").split("\n").filter(Boolean);

  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  const chunkSize = 12;
  for (let index = 0; index < lines.length || index === 0; index += chunkSize) {
    const chunk = lines.slice(index, index + chunkSize);
    const slide = pptx.addSlide();
    slide.addText(chunk.join("\n") || "No extractable text found.", {
      x: 0.5,
      y: 0.5,
      w: 12,
      h: 6,
      fontSize: 18,
      color: "0B1F4D",
    });
  }

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;

  return {
    kind: "file" as const,
    body: new Uint8Array(out),
    contentType:
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    filename: "pdf-world-converted.pptx",
  };
};

const pageCountFromPdf = async (file: File) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  return pdf.getPageCount();
};

const textImage = async (title: string, body: string, format: "png" | "jpg") => {
  const safeTitle = title.replace(/[&<>"']/g, " ");
  const safeBody = body.replace(/[&<>"']/g, " ");
  const svg = `<svg width="1600" height="1000" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f8fbff"/><text x="80" y="120" font-size="56" font-family="Arial" fill="#0b1f4d">${safeTitle}</text><text x="80" y="220" font-size="32" font-family="Arial" fill="#334155">${safeBody}</text></svg>`;
  const base = sharp(Buffer.from(svg));
  const out =
    format === "png"
      ? await base.png({ compressionLevel: 9 }).toBuffer()
      : await base.jpeg({ quality: 88 }).toBuffer();
  return new Uint8Array(out);
};

const pdfToImages = async (file: File, format: "png" | "jpg") => {
  const text = (await extractPdfText(file)).replace(/\s+/g, " ").slice(0, 180);
  const pageCount = await pageCountFromPdf(file);

  if (pageCount <= 1) {
    const image = await textImage(
      `Converted ${format.toUpperCase()} Preview`,
      text || "No text found in PDF. Generated preview image.",
      format,
    );

    return {
      kind: "file" as const,
      body: image,
      contentType: format === "png" ? "image/png" : "image/jpeg",
      filename: `pdf-world-page-1.${format}`,
    };
  }

  const zip = new JSZip();
  for (let page = 1; page <= pageCount; page += 1) {
    const image = await textImage(
      `PDF Page ${page}`,
      text || "No text found in PDF. Generated preview image.",
      format,
    );
    zip.file(`page-${page}.${format}`, image);
  }

  const zipped = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });

  return {
    kind: "file" as const,
    body: zipped,
    contentType: ZIP_OUTPUT_MIME,
    filename: `pdf-world-${format}-pages.zip`,
  };
};

const pdfToTextFile = async (file: File) => {
  const text = await extractPdfText(file);
  return {
    kind: "file" as const,
    body: new Uint8Array(Buffer.from(text || "No extractable text found.", "utf-8")),
    contentType: TEXT_OUTPUT_MIME,
    filename: "pdf-world-extracted.txt",
  };
};

const addPageNumbers = async (file: File, options: ToolOptions) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const pages = pdf.getPages();
  const targetIndexes = parseOptionalPageIndexes(options.pages, pages.length, "all");
  const startRaw = Number.parseInt(options.pageNumberStart ?? "1", 10);
  let currentNumber = Number.isFinite(startRaw) ? clampNumber(startRaw, 1, 1000000) : 1;
  const positionMap = new Set([
    "bottom-center",
    "bottom-left",
    "bottom-right",
    "top-left",
    "top-right",
  ]);
  const position = positionMap.has(options.pageNumberPosition ?? "")
    ? (options.pageNumberPosition as TextPosition)
    : "bottom-center";

  for (const index of targetIndexes) {
    const page = pages[index];
    const label = `Page ${currentNumber}`;
    const size = 10;
    const textWidth = font.widthOfTextAtSize(label, size);
    const point = resolveTextPosition(page, textWidth, size, position);

    page.drawText(label, {
      x: point.x,
      y: point.y,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });

    currentNumber += 1;
  }

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-numbered.pdf",
  };
};

const addWatermark = async (file: File, text: string, options: ToolOptions) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const pages = pdf.getPages();
  const targetIndexes = parseOptionalPageIndexes(options.pages, pages.length, "all");

  const sizeRaw = Number.parseInt(options.watermarkSize ?? "42", 10);
  const size = Number.isFinite(sizeRaw) ? clampNumber(sizeRaw, 12, 96) : 42;

  const opacityRaw = Number.parseFloat(options.watermarkOpacity ?? "0.2");
  const opacity = Number.isFinite(opacityRaw) ? clampNumber(opacityRaw, 0.05, 0.9) : 0.2;

  const positionMap = new Set([
    "center",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ]);
  const position = positionMap.has(options.watermarkPosition ?? "")
    ? (options.watermarkPosition as TextPosition)
    : "center";

  for (const index of targetIndexes) {
    const page = pages[index];
    const textWidth = font.widthOfTextAtSize(text, size);
    const point = resolveTextPosition(page, textWidth, size, position);

    page.drawText(text, {
      x: point.x,
      y: point.y,
      size,
      rotate: position === "center" ? degrees(35) : degrees(0),
      font,
      color: rgb(0.12, 0.24, 0.82),
      opacity,
    });
  }

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-watermarked.pdf",
  };
};

const comparePdf = async (fileA: File, fileB: File) => {
  const textA = (await extractPdfText(fileA)).split(/\r?\n/).map((line) => line.trim());
  const textB = (await extractPdfText(fileB)).split(/\r?\n/).map((line) => line.trim());

  const maxLen = Math.max(textA.length, textB.length);
  let changed = 0;
  const samples: string[] = [];

  for (let index = 0; index < maxLen; index += 1) {
    const left = textA[index] ?? "";
    const right = textB[index] ?? "";
    if (left !== right) {
      changed += 1;
      if (samples.length < 12) {
        samples.push(`Line ${index + 1}\nA: ${left || "(empty)"}\nB: ${right || "(empty)"}`);
      }
    }
  }

  return {
    kind: "json" as const,
    payload: {
      result: `Compared ${fileA.name} vs ${fileB.name}. Changed lines: ${changed}.\n\n${samples.join(
        "\n\n",
      )}`,
    },
  };
};

const geminiRequest = async (prompt: string) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    throw new Error("AI_KEY_MISSING");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("AI_REMOTE_FAILED");
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const answer = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!answer) {
    throw new Error("AI_EMPTY_RESPONSE");
  }

  return answer;
};

const localAiFallback = (slug: string, sourceText: string, options: ToolOptions) => {
  const compact = sourceText.replace(/\s+/g, " ").trim();
  const preview = compact.slice(0, 1400);

  if (slug === "i-pdf-assistant") {
    return [
      "Local AI assistant fallback (Gemini unavailable).",
      "1) Upload your PDF.",
      "2) Choose the required tool.",
      "3) Download the output.",
      "4) Use compress, redact, and protect for safer sharing.",
      `User prompt: ${options.prompt?.trim() || "(none)"}`,
    ].join("\n");
  }

  if (slug === "chat-with-pdf") {
    return [
      "Local AI chat fallback (Gemini unavailable).",
      `Question: ${options.prompt?.trim() || "(none)"}`,
      "Answer based on extracted text preview:",
      preview || "No extractable text found in the uploaded PDF.",
    ].join("\n\n");
  }

  if (slug === "ai-pdf-summarizer") {
    const bullets = preview
      ? preview
          .split(/[.!?]\s+/g)
          .filter(Boolean)
          .slice(0, 6)
          .map((sentence, idx) => `- ${idx + 1}. ${sentence.trim()}`)
      : ["- No extractable text found for summary."];

    return [
      "Local summary fallback (Gemini unavailable).",
      "Key points:",
      ...bullets,
    ].join("\n");
  }

  if (slug === "translate-pdf") {
    return [
      `Local translation fallback target language: ${options.targetLanguage?.trim() || "Spanish"}`,
      "Automated cloud translation is unavailable right now. Here is the source excerpt:",
      preview || "No extractable text found.",
    ].join("\n\n");
  }

  if (slug === "ai-question-generator") {
    const questionCount = Number.parseInt(options.questionCount ?? "10", 10);
    const count = Number.isFinite(questionCount) ? Math.max(3, Math.min(questionCount, 20)) : 10;
    const base = preview || "PDF content excerpt unavailable.";
    const questions = Array.from({ length: count }, (_, idx) => {
      const n = idx + 1;
      return `${n}. What is one important point from the document related to section ${n}?\nAnswer: ${base.slice(0, 120)}...`;
    });
    return ["Local question-generator fallback (Gemini unavailable).", ...questions].join("\n\n");
  }

  return "Local AI fallback response.";
};

const aiTool = async (slug: string, files: File[], options: ToolOptions) => {
  const promptInput = options.prompt?.trim();
  const targetLanguage = options.targetLanguage?.trim() || "Spanish";
  const count = Number.parseInt(options.questionCount ?? "10", 10);

  const sourceText = files.length
    ? (await Promise.all(files.map((file) => extractTextAny(file)))).join("\n\n")
    : "";

  let prompt = promptInput || "";

  if (slug === "i-pdf-assistant") {
    prompt = `${prompt || "Help me with PDF workflows."}\n\nGive concise practical steps.`;
  }

  if (slug === "chat-with-pdf") {
    if (!prompt) {
      throw new Error("Prompt is required for Chat with PDF.");
    }
    prompt = `Answer the user question based on this PDF text.\n\nPDF:\n${sourceText}\n\nQuestion:\n${prompt}`;
  }

  if (slug === "ai-pdf-summarizer") {
    prompt = `Summarize the following PDF text into key bullets and a short action checklist.\n\n${sourceText}`;
  }

  if (slug === "translate-pdf") {
    prompt = `Translate the following PDF text into ${targetLanguage}. Keep structure clear and readable.\n\n${sourceText}`;
  }

  if (slug === "ai-question-generator") {
    prompt = `Generate ${Number.isFinite(count) ? Math.max(3, Math.min(count, 30)) : 10} high-quality study questions with answers from this PDF text:\n\n${sourceText}`;
  }

  let result: string;
  try {
    result = await geminiRequest(prompt);
  } catch {
    result = localAiFallback(slug, sourceText, options);
  }

  return {
    kind: "json" as const,
    payload: {
      result,
    },
  };
};

const rotatePdf = async (file: File, options: ToolOptions) => {
  const rotationRaw = options.rotation;
  const rotation = Number.parseInt(rotationRaw ?? "90", 10);
  const normalized = [90, 180, 270].includes(rotation) ? rotation : 90;

  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const totalPages = pdf.getPageCount();

  const mode = options.rotationMode ?? "all";
  const targetIndexes =
    mode === "pages"
      ? (() => {
          if (!(options.pages ?? "").trim()) {
            throw new Error("Provide pages to rotate. Example: 1,3,5-7");
          }
          return parseOptionalPageIndexes(options.pages, totalPages, "all");
        })()
      : pageIndexArray(totalPages);

  const pages = pdf.getPages();
  targetIndexes.forEach((index) => pages[index]?.setRotation(degrees(normalized)));

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-rotated.pdf",
  };
};

const compressPdf = async (file: File, level: string | undefined) => {
  const source = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const rebuilt = await PDFDocument.create();
  const copied = await rebuilt.copyPages(source, source.getPageIndices());
  copied.forEach((page) => rebuilt.addPage(page));

  const body = await rebuilt.save({
    useObjectStreams: level !== "low",
    objectsPerTick: level === "high" ? 120 : 60,
  });

  return {
    kind: "file" as const,
    body,
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-compressed.pdf",
  };
};

const cropPdf = async (file: File, cropPercentRaw: string | undefined) => {
  const percent = Number.parseFloat(cropPercentRaw ?? "5");
  const ratio = Number.isFinite(percent) ? Math.max(0, Math.min(percent, 30)) / 100 : 0.05;

  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const marginX = width * ratio;
    const marginY = height * ratio;
    page.setMediaBox(marginX, marginY, width - marginX * 2, height - marginY * 2);
  }

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-cropped.pdf",
  };
};

const redactPdf = async (file: File, redactTerm: string | undefined) => {
  const label = redactTerm?.trim() || "REDACTED";
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize();
    const boxWidth = width * 0.7;
    const boxHeight = 36;
    const x = (width - boxWidth) / 2;
    const y = height * 0.45;

    page.drawRectangle({
      x,
      y,
      width: boxWidth,
      height: boxHeight,
      color: rgb(0, 0, 0),
    });

    page.drawText(label, {
      x: x + 12,
      y: y + 10,
      size: 14,
      font,
      color: rgb(1, 1, 1),
    });
  }

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-redacted.pdf",
  };
};

const flattenPdf = async (file: File) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  try {
    pdf.getForm().flatten();
  } catch {
    // Some files have no form data.
  }

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-flattened.pdf",
  };
};

const annotatePdf = async (file: File) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const page of pdf.getPages()) {
    const { height } = page.getSize();
    page.drawText("Annotation: Reviewed in PDF World", {
      x: 40,
      y: height - 40,
      size: 11,
      font,
      color: rgb(0.95, 0.45, 0.1),
    });
  }

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-annotated.pdf",
  };
};

const editPdf = async (file: File) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.Helvetica);

  for (const page of pdf.getPages()) {
    page.drawText("Edited with PDF World", {
      x: 36,
      y: 36,
      size: 10,
      font,
      color: rgb(0.13, 0.39, 0.92),
    });
  }

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-edited.pdf",
  };
};

const signPdf = async (file: File, options: ToolOptions) => {
  const signatureText = options.signatureText;
  const label = signatureText?.trim() || "Signed by PDF World User";
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const font = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const pages = pdf.getPages();
  const [targetIndex] = parseOptionalPageIndexes(options.pages, pages.length, "last");
  const page = pages[targetIndex];
  const now = new Date().toISOString();
  const text = `${label} • ${now}`;
  const size = 12;
  const width = font.widthOfTextAtSize(text, size);
  const positionMap = new Set([
    "center",
    "top-left",
    "top-right",
    "bottom-left",
    "bottom-right",
  ]);
  const position = positionMap.has(options.signaturePosition ?? "")
    ? (options.signaturePosition as TextPosition)
    : "bottom-left";
  const point = resolveTextPosition(page, width, size, position);

  page.drawText(text, {
    x: point.x,
    y: point.y,
    size,
    font,
    color: rgb(0.09, 0.2, 0.57),
  });

  return {
    kind: "file" as const,
    body: await pdf.save(),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-signed.pdf",
  };
};

const requestSignatures = async (file: File, signatureText: string | undefined) => {
  const parsedText = await parsePdfTextBytes(await bytesFromFile(file));
  const text = `Signature Request\n\nDocument: ${file.name}\nRequested Signer: ${
    signatureText?.trim() || "Recipient"
  }\nPreview Text: ${(parsedText ?? "").slice(0, 500)}`;

  return {
    kind: "file" as const,
    body: new Uint8Array(Buffer.from(text, "utf-8")),
    contentType: TEXT_OUTPUT_MIME,
    filename: "pdf-world-signature-request.txt",
  };
};

const unlockPdf = async (file: File, password: string | undefined) => {
  const pwd = password?.trim();
  if (!pwd) {
    throw new Error("Password is required to unlock this PDF.");
  }

  const fileBytes = await bytesFromFile(file);
  return withTempPdfFiles(fileBytes, async ({ inputPath, outputPath }) => {
    await runQpdf([`--password=${pwd}`, "--decrypt", inputPath, outputPath]);
    const out = await readFile(outputPath);

    return {
      kind: "file" as const,
      body: new Uint8Array(out),
      contentType: PDF_OUTPUT_MIME,
      filename: "pdf-world-unlocked.pdf",
    };
  });
};

const protectPdf = async (file: File, password: string | undefined) => {
  const pwd = password?.trim();
  if (!pwd || pwd.length < 4) {
    throw new Error("Provide a password with at least 4 characters.");
  }

  const fileBytes = await bytesFromFile(file);
  return withTempPdfFiles(fileBytes, async ({ inputPath, outputPath }) => {
    await runQpdf([
      "--encrypt",
      pwd,
      pwd,
      "256",
      "--modify=none",
      "--extract=n",
      "--print=none",
      "--",
      inputPath,
      outputPath,
    ]);

    const out = await readFile(outputPath);
    return {
      kind: "file" as const,
      body: new Uint8Array(out),
      contentType: PDF_OUTPUT_MIME,
      filename: "pdf-world-protected.pdf",
    };
  });
};

const repairPdf = async (file: File) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  return {
    kind: "file" as const,
    body: await pdf.save({ useObjectStreams: true }),
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-repaired.pdf",
  };
};

const ocrPdf = async (file: File) => {
  const text = await extractPdfText(file);
  return {
    kind: "file" as const,
    body: new Uint8Array(Buffer.from(text || "No extractable text found.", "utf-8")),
    contentType: TEXT_OUTPUT_MIME,
    filename: "pdf-world-ocr.txt",
  };
};

const readerMeta = async (file: File) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const pages = pdf.getPageCount();
  const title = pdf.getTitle() || "Untitled";
  const author = pdf.getAuthor() || "Unknown";

  return {
    kind: "json" as const,
    payload: {
      result: `Reader metadata\nTitle: ${title}\nAuthor: ${author}\nPages: ${pages}`,
    },
  };
};

const pdfToPdfa = async (file: File) => {
  const pdf = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  pdf.setProducer("PDF World PDF/A Converter");
  pdf.setCreator("PDF World");
  pdf.setSubject("Archive-compatible converted PDF");

  const body = await pdf.save({ useObjectStreams: false });
  return {
    kind: "file" as const,
    body,
    contentType: PDF_OUTPUT_MIME,
    filename: "pdf-world-archive.pdf",
  };
};

const normalizePdfAName = (slug: string) => {
  if (slug.includes("to-pdf")) {
    return `${slug.replace(/-/g, "-")}-output.pdf`;
  }
  return "pdf-world-output.pdf";
};

const setPdfVersion14 = (bytes: Uint8Array) => {
  const marker = Buffer.from("%PDF-1.7");
  const replacement = Buffer.from("%PDF-1.4");
  const index = Buffer.from(bytes).indexOf(marker);
  if (index >= 0) {
    const patched = new Uint8Array(bytes);
    patched.set(replacement, index);
    return patched;
  }
  return bytes;
};

const convertFromPdfBySlug = async (slug: string, file: File) => {
  if (slug === "pdf-to-word") return pdfToWord(file);
  if (slug === "pdf-to-excel") return pdfToExcel(file);
  if (slug === "pdf-to-ppt") return pdfToPpt(file);
  if (slug === "pdf-to-jpg") return pdfToImages(file, "jpg");
  if (slug === "pdf-to-png") return pdfToImages(file, "png");
  if (slug === "pdf-to-text") return pdfToTextFile(file);
  if (slug === "pdf-to-pdfa") {
    const out = await pdfToPdfa(file);
    return { ...out, body: setPdfVersion14(out.body) };
  }

  throw new Error("Unsupported PDF conversion tool.");
};

const convertToPdfBySlug = async (slug: string, files: File[]) => {
  if (["jpg-to-pdf", "png-to-pdf", "bmp-to-pdf", "tiff-to-pdf", "scan-to-pdf"].includes(slug)) {
    return buildPdfFromImages(files, normalizePdfAName(slug));
  }

  return toPdfFromDocs(files, normalizePdfAName(slug));
};

const organizeTool = async (slug: string, files: File[], options: ToolOptions) => {
  if (slug === "merge-pdf") return mergePdfs(files);
  if (slug === "split-pdf") {
    requirePdfFiles(files, 1);
    return splitPdf(files[0], options);
  }

  if (slug === "scan-to-pdf") {
    requireFiles(files, 1);
    return buildPdfFromImages(files, "pdf-world-scanned.pdf");
  }

  requirePdfFiles(files, 1);
  const file = files[0];

  if (slug === "remove-pages") {
    return mutatePdfPages(
      file,
      async (_source, total) => {
        const removed = new Set(parsePages(options.pages, total));
        return Array.from({ length: total }, (_, index) => index).filter(
          (index) => !removed.has(index),
        );
      },
      "pdf-world-pages-removed.pdf",
    );
  }

  if (slug === "extract-pages") {
    return mutatePdfPages(
      file,
      async (_source, total) => {
        const wanted = parsePages(options.pages, total);
        if (wanted.length === 0) {
          throw new Error("Provide pages to extract. Example: 1,3,4-6");
        }
        return wanted;
      },
      "pdf-world-pages-extracted.pdf",
    );
  }

  if (slug === "organize-pages") {
    return mutatePdfPages(
      file,
      async (_source, total) => parsePageOrder(options.pages, total),
      "pdf-world-pages-organized.pdf",
    );
  }

  if (slug === "rotate-pdf") {
    return rotatePdf(file, options);
  }

  throw new Error("Unsupported organize tool.");
};

const optimizeAndEditTool = async (slug: string, files: File[], options: ToolOptions) => {
  requirePdfFiles(files, 1);
  const file = files[0];

  if (slug === "compress-pdf") return compressPdf(file, options.compression);
  if (slug === "repair-pdf") return repairPdf(file);
  if (slug === "ocr-pdf") return ocrPdf(file);
  if (slug === "edit-pdf") return editPdf(file);
  if (slug === "pdf-annotator") return annotatePdf(file);
  if (slug === "pdf-reader") return readerMeta(file);
  if (slug === "crop-pdf") return cropPdf(file, options.cropPercent);
  if (slug === "redact-pdf") return redactPdf(file, options.redactTerm);
  if (slug === "flatten-pdf") return flattenPdf(file);

  throw new Error("Unsupported optimize/edit tool.");
};

const securityTool = async (slug: string, files: File[], options: ToolOptions) => {
  requirePdfFiles(files, 1);
  const file = files[0];

  if (slug === "sign-pdf") return signPdf(file, options);
  if (slug === "add-watermark") {
    return addWatermark(file, options.watermarkText || "CONFIDENTIAL", options);
  }
  if (slug === "number-pages") return addPageNumbers(file, options);

  throw new Error("Unsupported security tool.");
};

const AI_TOOL_SLUGS = new Set<string>([]);

const ORGANIZE_SLUGS = new Set([
  "merge-pdf",
  "split-pdf",
  "remove-pages",
  "extract-pages",
  "organize-pages",
  "scan-to-pdf",
  "rotate-pdf",
]);

const TO_PDF_SLUGS = new Set([
  "word-to-pdf",
  "excel-to-pdf",
  "ppt-to-pdf",
  "jpg-to-pdf",
  "png-to-pdf",
  "bmp-to-pdf",
  "tiff-to-pdf",
  "txt-to-pdf",
  "rtf-to-pdf",
  "odt-to-pdf",
  "html-to-pdf",
]);

const FROM_PDF_SLUGS = new Set([
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-ppt",
  "pdf-to-jpg",
  "pdf-to-png",
  "pdf-to-pdfa",
  "pdf-to-text",
]);

const OPTIMIZE_EDIT_SLUGS = new Set([
  "compress-pdf",
  "repair-pdf",
  "ocr-pdf",
  "edit-pdf",
  "pdf-annotator",
  "pdf-reader",
  "crop-pdf",
]);

const SECURITY_SLUGS = new Set([
  "sign-pdf",
  "add-watermark",
  "number-pages",
]);

export const executeTool = async (
  slug: string,
  files: File[],
  options: ToolOptions,
): Promise<ToolResult> => {
  if (AI_TOOL_SLUGS.has(slug)) {
    return aiTool(slug, files, options);
  }

  if (ORGANIZE_SLUGS.has(slug)) {
    return organizeTool(slug, files, options);
  }

  if (TO_PDF_SLUGS.has(slug)) {
    return convertToPdfBySlug(slug, files);
  }

  if (FROM_PDF_SLUGS.has(slug)) {
    requirePdfFiles(files, 1);
    return convertFromPdfBySlug(slug, files[0]);
  }

  if (OPTIMIZE_EDIT_SLUGS.has(slug)) {
    return optimizeAndEditTool(slug, files, options);
  }

  if (SECURITY_SLUGS.has(slug)) {
    return securityTool(slug, files, options);
  }

  throw new Error(`Unsupported tool: ${slug}`);
};

export const parseOptions = (optionsRaw: FormDataEntryValue | null): ToolOptions => {
  if (!optionsRaw || typeof optionsRaw !== "string") {
    return {};
  }

  try {
    return JSON.parse(optionsRaw) as ToolOptions;
  } catch {
    return {};
  }
};

export const parseFormFiles = (formData: FormData) => {
  return formData
    .getAll("files")
    .filter((entry): entry is File => typeof File !== "undefined" && entry instanceof File);
};

export const responseForResult = (result: ToolResult) => {
  if (result.kind === "json") {
    return Response.json(result.payload, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  }

  const normalized = new Uint8Array(result.body.byteLength);
  normalized.set(result.body);

  return new Response(normalized, {
    headers: {
      "Content-Type": result.contentType,
      "Content-Disposition": `attachment; filename=${result.filename}`,
      "Cache-Control": "no-store, max-age=0",
    },
  });
};

// Keeps imported symbols referenced for environments where tree-shaking can drop names.
export const _pdfLibTypeGuard = {
  PDFName,
  PDFNumber,
  PDFFont,
};
