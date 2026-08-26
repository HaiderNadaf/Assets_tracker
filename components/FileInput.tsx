"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import type { StoredFile } from "@/lib/types";
import { fileSize } from "@/lib/format";

interface Props {
  label: string;
  /** File already stored on Cloudinary, if this is an edit. */
  existing?: StoredFile | null;
  /** The newly picked file, owned by the parent form. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Set when the user clears an existing Cloudinary file. */
  removed: boolean;
  onRemovedChange: (removed: boolean) => void;
  accept?: string;
  variant?: "image" | "document";
  hint?: string;
}

const MAX_BYTES = 10 * 1024 * 1024;

export default function FileInput({
  label,
  existing,
  file,
  onFileChange,
  removed,
  onRemovedChange,
  accept,
  variant = "image",
  hint,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const isImage = variant === "image";

  const preview = useMemo(
    () => (file && file.type.startsWith("image/") ? URL.createObjectURL(file) : null),
    [file]
  );

  // Object URLs must be revoked or the tab leaks memory on every re-pick.
  useEffect(() => {
    if (!preview) return;
    return () => URL.revokeObjectURL(preview);
  }, [preview]);

  const accept_ = accept ?? (isImage ? "image/*" : "image/*,application/pdf,.doc,.docx,.xls,.xlsx");

  const showExisting = !!existing?.url && !removed && !file;

  function accept_file(next: File | null) {
    setError(null);
    if (next && next.size > MAX_BYTES) {
      setError("File is larger than 10 MB");
      return;
    }
    onFileChange(next);
    if (next) onRemovedChange(false);
  }

  function clear() {
    accept_file(null);
    if (inputRef.current) inputRef.current.value = "";
    if (existing?.url) onRemovedChange(true);
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-zinc-700">{label}</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const dropped = e.dataTransfer.files?.[0];
          if (dropped) accept_file(dropped);
        }}
        className={clsx(
          "relative flex items-center gap-3 rounded-lg border border-dashed p-3 transition",
          dragging ? "border-brand-500 bg-brand-50" : "border-zinc-300 bg-zinc-50/60"
        )}
      >
        {/* Thumbnail / icon */}
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="h-full w-full object-cover" />
          ) : showExisting && existing!.resourceType === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={existing!.url} alt="" className="h-full w-full object-cover" />
          ) : showExisting || file ? (
            <FileText size={20} className="text-brand-600" />
          ) : isImage ? (
            <ImageIcon size={20} className="text-zinc-300" />
          ) : (
            <FileText size={20} className="text-zinc-300" />
          )}
        </div>

        {/* Meta */}
        <div className="min-w-0 flex-1">
          {file ? (
            <>
              <p className="truncate text-sm font-medium text-zinc-800">{file.name}</p>
              <p className="text-xs text-brand-700">Ready to upload · {fileSize(file.size)}</p>
            </>
          ) : showExisting ? (
            <>
              <a
                href={existing!.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block truncate text-sm font-medium text-brand-700 hover:underline"
              >
                {existing!.fileName || "View uploaded file"}
              </a>
              <p className="text-xs text-zinc-500">
                Stored on Cloudinary{existing!.bytes ? ` · ${fileSize(existing!.bytes)}` : ""}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-zinc-600">
                {removed ? "Will be removed on save" : "Drag a file here or browse"}
              </p>
              <p className="text-xs text-zinc-400">{hint ?? "Max 10 MB"}</p>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          <label
            htmlFor={inputId}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Upload size={13} />
            Browse
          </label>
          {(file || showExisting) && (
            <button
              type="button"
              onClick={clear}
              aria-label={`Remove ${label}`}
              className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>

        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept={accept_}
          className="sr-only"
          onChange={(e) => accept_file(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
