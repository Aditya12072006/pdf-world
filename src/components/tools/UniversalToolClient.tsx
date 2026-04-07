"use client";

import { useMemo, useState } from "react";

import { AdSlot } from "@/components/AdSlot";
import { MasterFileUploader } from "@/components/upload/MasterFileUploader";
import { ToolDefinition } from "@/lib/types";

type Props = {
  tool: ToolDefinition;
};

const PDF_ONLY = new Set([
  "merge-pdf",
  "split-pdf",
  "remove-pages",
  "extract-pages",
  "organize-pages",
  "rotate-pdf",
  "pdf-to-word",
  "pdf-to-excel",
  "pdf-to-ppt",
  "pdf-to-jpg",
  "pdf-to-png",
  "pdf-to-pdfa",
  "pdf-to-text",
  "compress-pdf",
  "repair-pdf",
  "ocr-pdf",
  "edit-pdf",
  "pdf-annotator",
  "pdf-reader",
  "crop-pdf",
  "redact-pdf",
  "flatten-pdf",
  "sign-pdf",
  "request-signatures",
  "unlock-pdf",
  "protect-pdf",
  "add-watermark",
  "number-pages",
  "compare-pdf",
  "chat-with-pdf",
  "ai-pdf-summarizer",
  "translate-pdf",
  "ai-question-generator",
]);

const IMAGE_TO_PDF = new Set(["jpg-to-pdf", "png-to-pdf", "bmp-to-pdf", "tiff-to-pdf"]);

const MIN_FILE_COUNTS: Record<string, number> = {
  "merge-pdf": 2,
  "compare-pdf": 2,
  "i-pdf-assistant": 0,
};

const MULTI_FILE = new Set([
  "merge-pdf",
  "scan-to-pdf",
  "jpg-to-pdf",
  "png-to-pdf",
  "bmp-to-pdf",
  "tiff-to-pdf",
]);

const needsPages = new Set(["remove-pages", "extract-pages", "organize-pages"]);
const needsRotation = new Set(["rotate-pdf"]);
const needsCompression = new Set(["compress-pdf"]);
const needsWatermarkText = new Set(["add-watermark"]);
const needsSignatureText = new Set(["sign-pdf", "request-signatures"]);
const needsSplitOptions = new Set(["split-pdf"]);
const needsRotationScope = new Set(["rotate-pdf"]);
const needsWatermarkOptions = new Set(["add-watermark"]);
const needsPageNumberOptions = new Set(["number-pages"]);
const needsSignOptions = new Set(["sign-pdf"]);
const needsPassword = new Set(["protect-pdf", "unlock-pdf"]);
const needsPrompt = new Set([
  "i-pdf-assistant",
  "chat-with-pdf",
  "ai-pdf-summarizer",
  "translate-pdf",
  "ai-question-generator",
]);
const needsTargetLanguage = new Set(["translate-pdf"]);
const needsQuestionCount = new Set(["ai-question-generator"]);
const needsCrop = new Set(["crop-pdf"]);
const needsRedact = new Set(["redact-pdf"]);
const toolsWithPageInput = new Set([
  "remove-pages",
  "extract-pages",
  "organize-pages",
  "rotate-pdf",
  "add-watermark",
  "number-pages",
  "sign-pdf",
]);

const pagesFieldMeta: Record<string, { label: string; placeholder: string }> = {
  "remove-pages": {
    label: "Pages to remove",
    placeholder: "Example: 2,4,8-10",
  },
  "extract-pages": {
    label: "Pages to extract",
    placeholder: "Example: 1,3,4-6",
  },
  "organize-pages": {
    label: "New page order",
    placeholder: "Example: 3,1,2,4",
  },
  "rotate-pdf": {
    label: "Pages to rotate",
    placeholder: "Example: 1,2,5-8",
  },
  "add-watermark": {
    label: "Pages to watermark (optional)",
    placeholder: "Leave empty for all pages",
  },
  "number-pages": {
    label: "Pages to number (optional)",
    placeholder: "Leave empty for all pages",
  },
  "sign-pdf": {
    label: "Page to sign (optional)",
    placeholder: "Leave empty for last page",
  },
};

export const UniversalToolClient = ({ tool }: Props) => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultText, setResultText] = useState<string>("");

  const [pages, setPages] = useState("1,2");
  const [rotation, setRotation] = useState("90");
  const [rotationMode, setRotationMode] = useState("all");
  const [splitMode, setSplitMode] = useState("single");
  const [splitSize, setSplitSize] = useState("2");
  const [splitRanges, setSplitRanges] = useState("1-2;3-4");
  const [compression, setCompression] = useState("medium");
  const [watermarkText, setWatermarkText] = useState("CONFIDENTIAL");
  const [watermarkPosition, setWatermarkPosition] = useState("center");
  const [watermarkOpacity, setWatermarkOpacity] = useState("0.2");
  const [watermarkSize, setWatermarkSize] = useState("42");
  const [signatureText, setSignatureText] = useState("Signed by PDF World User");
  const [signaturePosition, setSignaturePosition] = useState("bottom-left");
  const [password, setPassword] = useState("");
  const [pageNumberStart, setPageNumberStart] = useState("1");
  const [pageNumberPosition, setPageNumberPosition] = useState("bottom-center");
  const [prompt, setPrompt] = useState("Summarize this PDF with key points.");
  const [targetLanguage, setTargetLanguage] = useState("Spanish");
  const [questionCount, setQuestionCount] = useState("10");
  const [cropPercent, setCropPercent] = useState("5");
  const [redactTerm, setRedactTerm] = useState("PRIVATE");

  const minFileCount = MIN_FILE_COUNTS[tool.slug] ?? 1;
  const allowMultiple = MULTI_FILE.has(tool.slug) || minFileCount > 1;

  const accept = useMemo(() => {
    let output: Record<string, string[]>;

    if (PDF_ONLY.has(tool.slug)) {
      output = { "application/pdf": [".pdf"] };
      return output;
    }

    if (IMAGE_TO_PDF.has(tool.slug)) {
      output = { "image/*": [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"] };
      return output;
    }

    output = {
      "application/pdf": [".pdf"],
      "text/plain": [".txt", ".rtf", ".html", ".htm"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
        ".docx",
      ],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [
        ".pptx",
      ],
      "image/*": [".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/msword": [".doc"],
      "application/vnd.ms-powerpoint": [".ppt"],
    };
    return output;
  }, [tool.slug]);

  const canProcess = files.length >= minFileCount && !isProcessing;
  const needsUpload = tool.slug !== "i-pdf-assistant";

  const onSubmit = async () => {
    if (!canProcess && needsUpload) {
      return;
    }

    setError(null);
    setResultText("");
    setIsProcessing(true);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      formData.append(
        "options",
        JSON.stringify({
          pages,
          rotation,
          rotationMode,
          splitMode,
          splitSize,
          splitRanges,
          compression,
          watermarkText,
          watermarkPosition,
          watermarkOpacity,
          watermarkSize,
          signatureText,
          signaturePosition,
          password,
          pageNumberStart,
          pageNumberPosition,
          prompt,
          targetLanguage,
          questionCount,
          cropPercent,
          redactTerm,
        }),
      );

      const response = await fetch(`/api/tools/${tool.slug}`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const msg = await response.text();
        throw new Error(msg || "Unable to process this request.");
      }

      const contentType = response.headers.get("content-type") ?? "";

      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { result?: string; summary?: string };
        setResultText(payload.result ?? payload.summary ?? "Done.");
      } else {
        const blob = await response.blob();
        const contentDisposition = response.headers.get("content-disposition") ?? "";
        const fileNameMatch = /filename=([^;]+)/i.exec(contentDisposition);
        const fileName = fileNameMatch?.[1]?.replace(/"/g, "") ?? `${tool.slug}-output`;

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = fileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Processing failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
      {needsUpload ? (
        <MasterFileUploader
          files={files}
          onFilesChange={setFiles}
          accept={accept}
          multiple={allowMultiple}
          maxFiles={allowMultiple ? 20 : 1}
          helperText={`Upload ${minFileCount > 1 ? `${minFileCount}+ files` : "your file"} for ${tool.title}.`}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {toolsWithPageInput.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">
              {pagesFieldMeta[tool.slug]?.label || "Page selection"}
            </span>
            <input
              value={pages}
              onChange={(event) => setPages(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
              placeholder={pagesFieldMeta[tool.slug]?.placeholder || "Example: 1,3,4-6"}
            />
          </label>
        ) : null}

        {needsSplitOptions.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Split Mode</span>
            <select
              value={splitMode}
              onChange={(event) => setSplitMode(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            >
              <option value="single">Every page as separate file</option>
              <option value="every-n">Every N pages</option>
              <option value="ranges">Custom ranges</option>
            </select>
          </label>
        ) : null}

        {needsSplitOptions.has(tool.slug) && splitMode === "every-n" ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Pages Per Split</span>
            <input
              value={splitSize}
              onChange={(event) => setSplitSize(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
              placeholder="Example: 2"
            />
          </label>
        ) : null}

        {needsSplitOptions.has(tool.slug) && splitMode === "ranges" ? (
          <label className="space-y-1 text-sm text-slate-700 sm:col-span-2">
            <span className="font-semibold text-brand-900">Split Ranges</span>
            <input
              value={splitRanges}
              onChange={(event) => setSplitRanges(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
              placeholder="Example: 1-2;3-5;6-8"
            />
          </label>
        ) : null}

        {needsRotation.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Rotation Angle</span>
            <select
              value={rotation}
              onChange={(event) => setRotation(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            >
              <option value="90">90</option>
              <option value="180">180</option>
              <option value="270">270</option>
            </select>
          </label>
        ) : null}

        {needsRotationScope.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Rotate Scope</span>
            <select
              value={rotationMode}
              onChange={(event) => setRotationMode(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            >
              <option value="all">All pages</option>
              <option value="pages">Selected pages</option>
            </select>
          </label>
        ) : null}

        {needsCompression.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Compression Level</span>
            <select
              value={compression}
              onChange={(event) => setCompression(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
        ) : null}

        {needsWatermarkText.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Watermark Text</span>
            <input
              value={watermarkText}
              onChange={(event) => setWatermarkText(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
        ) : null}

        {needsWatermarkOptions.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Watermark Position</span>
            <select
              value={watermarkPosition}
              onChange={(event) => setWatermarkPosition(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            >
              <option value="center">Center</option>
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-right">Bottom Right</option>
            </select>
          </label>
        ) : null}

        {needsWatermarkOptions.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Watermark Opacity</span>
            <input
              value={watermarkOpacity}
              onChange={(event) => setWatermarkOpacity(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
              placeholder="0.2"
            />
          </label>
        ) : null}

        {needsWatermarkOptions.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Watermark Size</span>
            <input
              value={watermarkSize}
              onChange={(event) => setWatermarkSize(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
              placeholder="42"
            />
          </label>
        ) : null}

        {needsSignatureText.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Signature Label</span>
            <input
              value={signatureText}
              onChange={(event) => setSignatureText(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
        ) : null}

        {needsSignOptions.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Signature Position</span>
            <select
              value={signaturePosition}
              onChange={(event) => setSignaturePosition(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            >
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
              <option value="center">Center</option>
            </select>
          </label>
        ) : null}

        {needsPassword.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Password</span>
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              type="password"
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
              placeholder="Enter PDF password"
            />
          </label>
        ) : null}

        {needsCrop.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Crop Margin (%)</span>
            <input
              value={cropPercent}
              onChange={(event) => setCropPercent(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
        ) : null}

        {needsRedact.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Redaction Label</span>
            <input
              value={redactTerm}
              onChange={(event) => setRedactTerm(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
        ) : null}

        {needsPageNumberOptions.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Starting Number</span>
            <input
              value={pageNumberStart}
              onChange={(event) => setPageNumberStart(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
              placeholder="1"
            />
          </label>
        ) : null}

        {needsPageNumberOptions.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Number Position</span>
            <select
              value={pageNumberPosition}
              onChange={(event) => setPageNumberPosition(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            >
              <option value="bottom-center">Bottom Center</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="bottom-right">Bottom Right</option>
              <option value="top-left">Top Left</option>
              <option value="top-right">Top Right</option>
            </select>
          </label>
        ) : null}

        {needsTargetLanguage.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Target Language</span>
            <input
              value={targetLanguage}
              onChange={(event) => setTargetLanguage(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
        ) : null}

        {needsQuestionCount.has(tool.slug) ? (
          <label className="space-y-1 text-sm text-slate-700">
            <span className="font-semibold text-brand-900">Question Count</span>
            <input
              value={questionCount}
              onChange={(event) => setQuestionCount(event.target.value)}
              className="w-full rounded-xl border border-brand-200 px-3 py-2"
            />
          </label>
        ) : null}
      </div>

      {needsPrompt.has(tool.slug) ? (
        <label className="block space-y-1 text-sm text-slate-700">
          <span className="font-semibold text-brand-900">Prompt</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            className="w-full rounded-xl border border-brand-200 px-3 py-2"
          />
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={needsUpload ? !canProcess : isProcessing}
          className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isProcessing ? "Processing..." : `Run ${tool.title}`}
        </button>

        {needsUpload ? (
          <button
            type="button"
            onClick={() => setFiles([])}
            className="rounded-xl border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-900 transition hover:border-brand-500"
          >
            Clear Files
          </button>
        ) : null}
      </div>

      {isProcessing ? <AdSlot variant="processing" slotLabel="Processing Ad" /> : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {resultText ? (
        <div className="rounded-xl border border-brand-100 bg-brand-50/40 p-4">
          <h3 className="text-sm font-semibold text-brand-900">Result</h3>
          <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{resultText}</pre>
        </div>
      ) : null}
    </section>
  );
};
