"use client";

import { useEffect, useRef, useState } from "react";
import { FileText, Plus, X } from "lucide-react";
import { fileSize } from "@/lib/format";
import type { StoredFile } from "@/lib/types";

/** One row: a file already stored on the record, or one just picked. */
export interface FileSlot {
  key: string;
  stored?: StoredFile;
  file?: File;
  /** Object URL for a pending image preview — revoked when the slot goes away. */
  preview?: string;
}

let seq = 0;
export const fileSlotKey = () => `fs-${(seq += 1)}`;

export function storedFileSlot(file: StoredFile): FileSlot {
  return { key: fileSlotKey(), stored: file };
}

const MAX_BYTES = 10 * 1024 * 1024;

function isImage(slot: FileSlot): boolean {
  if (slot.file) return slot.file.type.startsWith("image/");
  const f = slot.stored;
  return !!f && f.resourceType === "image" && f.format !== "pdf";
}

function nameOf(slot: FileSlot): string {
  return slot.file?.name ?? slot.stored?.fileName ?? "file";
}

/**
 * Multi-file picker for a document field. Order is meaningful: the first file is
 * the one used wherever a single attachment is shown (the PDF record, Excel),
 * so it can be promoted without re-uploading.
 */
export default function MultiFileInput({
  label,
  hint,
  accept,
  slots,
  onChange,
  max,
}: {
  label: string;
  hint?: string;
  accept?: string;
  slots: FileSlot[];
  onChange: (next: FileSlot[]) => void;
  max: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      slots.forEach((s) => s.preview && URL.revokeObjectURL(s.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const room = max - slots.length;

  function add(picked: FileList | null) {
    if (!picked?.length) return;
    setError(null);

    const chosen = Array.from(picked);
    const usable = chosen.filter((f) => f.size <= MAX_BYTES);
    if (usable.length < chosen.length) {
      setError(`${chosen.length - usable.length} file(s) skipped — over 10 MB`);
    }
    if (usable.length > room) {
      setError(`Only ${max} files allowed — ${usable.length - room} skipped`);
    }

    onChange([
      ...slots,
      ...usable.slice(0, room).map((file) => ({
        key: fileSlotKey(),
        file,
        preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      })),
    ]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function remove(key: string) {
    const slot = slots.find((s) => s.key === key);
    if (slot?.preview) URL.revokeObjectURL(slot.preview);
    onChange(slots.filter((s) => s.key !== key));
  }

  function promote(key: string) {
    const slot = slots.find((s) => s.key === key);
    if (!slot) return;
    onChange([slot, ...slots.filter((s) => s.key !== key)]);
  }

  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-700">{label}</label>

      {slots.length > 0 && (
        <ul className="mb-2 divide-y divide-zinc-200 rounded-lg border border-zinc-200">
          {slots.map((slot, i) => {
            const bytes = slot.file?.size ?? slot.stored?.bytes;
            const src = slot.preview ?? (isImage(slot) ? slot.stored?.url : undefined);
            return (
              <li key={slot.key} className="flex items-center gap-2.5 px-2.5 py-2">
                {src ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={src}
                    alt=""
                    className="h-8 w-8 shrink-0 rounded border border-zinc-200 object-cover"
                  />
                ) : (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-brand-600">
                    <FileText size={15} />
                  </span>
                )}

                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-700">{nameOf(slot)}</span>
                  <span className="block text-xs text-zinc-400">
                    {i === 0 && <span className="font-medium text-brand-700">Primary · </span>}
                    {bytes ? fileSize(bytes) : slot.file ? "pending" : ""}
                    {slot.file ? " · not saved yet" : ""}
                  </span>
                </span>

                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => promote(slot.key)}
                    title="Make primary"
                    aria-label={`Make ${nameOf(slot)} primary`}
                    className="shrink-0 rounded px-1.5 py-1 text-xs font-medium text-zinc-500 hover:bg-zinc-100 hover:text-brand-700"
                  >
                    Make primary
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(slot.key)}
                  aria-label={`Remove ${nameOf(slot)}`}
                  className="shrink-0 rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {room > 0 && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-zinc-300 py-2 text-sm font-medium text-zinc-500 transition hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700"
        >
          <Plus size={15} />
          {slots.length === 0 ? "Add files" : "Add more"}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        hidden
        onChange={(e) => add(e.target.files)}
      />

      <p className={`mt-1.5 text-xs ${error ? "text-rose-600" : "text-zinc-500"}`}>
        {error ?? (slots.length ? `${slots.length} of ${max} · first is primary` : hint)}
      </p>
    </div>
  );
}
