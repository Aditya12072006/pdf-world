"use client";

import { useDropzone } from "react-dropzone";
import { UploadCloud } from "lucide-react";

type Props = {
  files: File[];
  onFilesChange: (files: File[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  multiple?: boolean;
  helperText?: string;
};

export const MasterFileUploader = ({
  files,
  onFilesChange,
  accept,
  maxFiles = 20,
  multiple = true,
  helperText,
}: Props) => {
  const onDrop = (acceptedFiles: File[]) => {
    if (multiple) {
      onFilesChange([...files, ...acceptedFiles].slice(0, maxFiles));
      return;
    }

    onFilesChange(acceptedFiles.slice(0, 1));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    multiple,
    maxFiles,
  });

  return (
    <section className="space-y-4">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${
          isDragActive
            ? "border-brand-600 bg-brand-50"
            : "border-brand-100 bg-white hover:border-brand-400"
        }`}
      >
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto mb-3 text-brand-600" size={34} />
        <p className="text-sm font-semibold text-brand-900 sm:text-base">
          Drag and drop files here, or tap to upload
        </p>
        <p className="mt-1 text-xs text-slate-600">
          {helperText ??
            (multiple
              ? `Multi-file upload enabled. Max ${maxFiles} files.`
              : "Single-file upload enabled.")}
        </p>
      </div>

      {files.length > 0 ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="rounded-xl border border-brand-100 bg-brand-50/40 p-3"
            >
              <p className="truncate text-sm font-medium text-brand-900">{file.name}</p>
              <p className="text-xs text-slate-600">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
};
