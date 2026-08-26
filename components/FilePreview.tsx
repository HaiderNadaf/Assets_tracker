"use client";

import { ExternalLink, FileText } from "lucide-react";
import Modal from "./Modal";
import { fileSize } from "@/lib/format";
import type { StoredFile } from "@/lib/types";

export interface Preview {
  label: string;
  file: StoredFile;
}

/** Cloudinary stores PDFs with resourceType "image", so check the format first. */
export function isPdf(file: StoredFile): boolean {
  return file.format === "pdf" || /\.pdf($|\?)/i.test(file.url);
}

export function isImage(file: StoredFile): boolean {
  return file.resourceType === "image" && !isPdf(file);
}

/**
 * Previews a file in place. Images and PDFs render inline; anything Cloudinary
 * stores as a raw office document can only be opened externally, so that case
 * says so rather than showing an empty frame.
 */
export default function FilePreviewModal({
  preview,
  onClose,
}: {
  preview: Preview | null;
  onClose: () => void;
}) {
  const file = preview?.file;

  return (
    <Modal
      open={!!preview}
      title={preview?.label ?? ""}
      onClose={onClose}
      width="max-w-4xl"
      footer={
        file && (
          <>
            <span className="mr-auto truncate text-xs text-zinc-500">
              {file.fileName}
              {file.bytes ? ` · ${fileSize(file.bytes)}` : ""}
            </span>
            <a
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <ExternalLink size={15} />
              Open in new tab
            </a>
          </>
        )
      }
    >
      {file && (
        <div className="flex items-center justify-center">
          {isImage(file) ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={file.url}
              alt={preview.label}
              className="max-h-[70vh] w-auto max-w-full rounded-lg object-contain"
            />
          ) : isPdf(file) ? (
            <iframe
              src={file.url}
              title={preview.label}
              className="h-[70vh] w-full rounded-lg border border-zinc-200"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <FileText size={40} className="text-zinc-300" />
              <p className="text-sm font-medium text-zinc-700">
                This file type cannot be previewed here
              </p>
              <p className="text-sm text-zinc-500">
                Use &ldquo;Open in new tab&rdquo; below to download it.
              </p>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
