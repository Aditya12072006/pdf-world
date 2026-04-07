import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Missing input PDF path.");
  process.exit(1);
}

const bytes = new Uint8Array(readFileSync(inputPath));
const standardFontDataUrl = `${pathToFileURL(
  path.resolve(process.cwd(), "node_modules/pdfjs-dist/standard_fonts"),
).toString()}/`;

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
  const chunks = [];

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
  process.stdout.write(chunks.join("\n").trim());
} catch (error) {
  console.error(error instanceof Error ? error.message : "PDF text extraction failed.");
  process.exit(1);
}
