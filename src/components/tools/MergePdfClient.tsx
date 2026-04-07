"use client";

import { useMemo, useState } from "react";

import { AdSlot } from "@/components/AdSlot";
import { MasterFileUploader } from "@/components/upload/MasterFileUploader";

export const MergePdfClient = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canMerge = useMemo(
    () => files.length >= 2 && !isProcessing,
    [files.length, isProcessing],
  );

  const mergePdfs = async () => {
    if (!canMerge) return;

    setError(null);
    setIsProcessing(true);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const response = await fetch("/api/tools/merge-pdf", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Unable to merge files right now.");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "pdf-world-merged.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="space-y-4 rounded-2xl border border-brand-100 bg-white p-6 shadow-card">
      <MasterFileUploader
        files={files}
        onFilesChange={setFiles}
        accept={{ "application/pdf": [".pdf"] }}
      />

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={mergePdfs}
          disabled={!canMerge}
          className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isProcessing ? "Merging..." : "Merge PDF Now"}
        </button>

        <button
          type="button"
          onClick={() => setFiles([])}
          className="rounded-xl border border-brand-200 bg-white px-5 py-3 text-sm font-semibold text-brand-900 transition hover:border-brand-500"
        >
          Clear Files
        </button>
      </div>

      {isProcessing ? (
        <AdSlot variant="processing" slotLabel="Processing Ad" className="mt-3" />
      ) : null}

      {error ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
    </section>
  );
};
