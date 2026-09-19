"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Building2, ListChecks, Plus, RotateCcw, Save, Tag, Trash2, Wand2 } from "lucide-react";

import { Button, Field, Input, SectionCard, Spinner, Textarea } from "./ui";
import { VENDOR_CATEGORIES } from "@/lib/constants";
import {
  apiError,
  createVendor as createApi,
  fetchNextVendorCode,
  fetchVendorCategories,
  updateVendor as updateApi,
} from "@/lib/api";
import type { Vendor } from "@/lib/types";

interface FormState {
  name: string;
  vendorCode: string;
  category: string;
  gstNumber: string;
  address: string;
  contactPerson: string;
  phone: string;
  email: string;
  notes: string;
}

function initialState(vendor?: Vendor): FormState {
  return {
    name: vendor?.name ?? "",
    vendorCode: vendor?.vendorCode ?? "",
    category: vendor?.category ?? "",
    gstNumber: vendor?.gstNumber ?? "",
    address: vendor?.address ?? "",
    contactPerson: vendor?.contactPerson ?? "",
    phone: vendor?.phone ?? "",
    email: vendor?.email ?? "",
    notes: vendor?.notes ?? "",
  };
}

export default function VendorForm({ vendor }: { vendor?: Vendor }) {
  const router = useRouter();
  const isEdit = !!vendor;

  const [form, setForm] = useState<FormState>(() => initialState(vendor));
  const [tags, setTags] = useState<string[]>(() => vendor?.suppliesTags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Categories already in use, merged with a starter list of suggestions -
  // free text underneath, so typing a new one just adds it.
  const [knownCategories, setKnownCategories] = useState<string[]>([]);
  useEffect(() => {
    fetchVendorCategories()
      .then(setKnownCategories)
      .catch(() => setKnownCategories([]));
  }, []);
  const categoryOptions = Array.from(new Set([...VENDOR_CATEGORIES, ...knownCategories])).sort();

  /**
   * The code the server would hand out next for the chosen category, and
   * whether the user has overridden it - the same "Auto" pattern the PO form
   * uses for PO numbers. An existing vendor is never renumbered, so editing
   * starts out "manual" and the suggestion is never fetched. Changing the
   * category re-derives the suggestion, the same way switching companies
   * re-derives a PO number - each category counts its own sequence.
   *
   * Debounced: category is free text now, so a fetch per keystroke would
   * hammer the API while someone is still typing a new category name.
   */
  const [autoCode, setAutoCode] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState(isEdit);

  useEffect(() => {
    if (isEdit || !form.category.trim()) return;
    let cancelled = false;
    const t = setTimeout(() => {
      fetchNextVendorCode(form.category)
        .then((code) => {
          if (!cancelled) setAutoCode(code);
        })
        .catch(() => {
          // Suggestion only - a failure here must not block typing a code.
          if (!cancelled) setAutoCode(null);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isEdit, form.category]);

  // Shows the suggestion until the user types, and their own value from then on.
  const vendorCode = manualCode ? form.vendorCode : (autoCode ?? form.vendorCode);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const addTag = () => {
    const value = tagInput.trim();
    if (!value) return;
    if (!tags.some((t) => t.toLowerCase() === value.toLowerCase())) {
      setTags((list) => [...list, value]);
    }
    setTagInput("");
  };

  const removeTag = (tag: string) =>
    setTags((list) => list.filter((t) => t !== tag));

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Enter the vendor's name";
    // Only enforced when adding a vendor - an older vendor saved before this
    // field existed can still be edited without being forced to categorise
    // itself first.
    if (!isEdit && !form.category) next.category = "Pick a category";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        vendorCode: vendorCode.trim(),
        category: form.category,
        gstNumber: form.gstNumber.trim().toUpperCase(),
        address: form.address.trim(),
        contactPerson: form.contactPerson.trim(),
        phone: form.phone.trim(),
        email: form.email.trim().toLowerCase(),
        suppliesTags: tags,
        notes: form.notes.trim(),
      };
      const saved = isEdit ? await updateApi(vendor!._id, payload) : await createApi(payload);
      toast.success(isEdit ? "Vendor updated" : `Vendor "${saved.name}" added`);
      router.push(`/vendors/${encodeURIComponent(saved._id)}`);
      router.refresh();
    } catch (err) {
      toast.error(apiError(err, "Could not save the vendor"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <SectionCard
        title="Vendor details"
        icon={<Building2 size={16} />}
        description="Who this vendor is and how to reach them"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Vendor name" required error={errors.name}>
            <Input
              value={form.name}
              invalid={!!errors.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="S And G Steel Infra"
            />
          </Field>

          <Field
            label="Category"
            required={!isEdit}
            error={errors.category}
            hint="Pick one, or type a new category - decides the vendor code's prefix"
          >
            <Input
              list="vendor-categories"
              value={form.category}
              invalid={!!errors.category}
              onChange={(e) => set("category", e.target.value)}
              placeholder="Steel & Structural"
            />
            <datalist id="vendor-categories">
              {categoryOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field
            label="Vendor code"
            hint={isEdit ? "Your own code for them, if any" : undefined}
          >
            <div className="flex items-center gap-2">
              <Input
                value={vendorCode}
                onChange={(e) => {
                  // Typing takes over: the suggestion stops filling the field.
                  setManualCode(true);
                  set("vendorCode", e.target.value);
                }}
                placeholder="SCPRO14"
                className="font-mono"
              />
              {!isEdit && autoCode && manualCode && (
                <button
                  type="button"
                  onClick={() => setManualCode(false)}
                  title={`Use ${autoCode}, the next free code`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-2 text-xs font-medium text-brand-800 hover:bg-brand-100"
                >
                  <RotateCcw size={13} />
                  Auto
                </button>
              )}
              {!isEdit && !manualCode && vendorCode && (
                <span
                  title="Filled automatically - type over it to use your own"
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-brand-100 px-2 py-1.5 text-[11px] font-semibold text-brand-800"
                >
                  <Wand2 size={12} />
                  Auto
                </span>
              )}
            </div>
          </Field>

          <Field label="GST number">
            <Input
              value={form.gstNumber}
              onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
              placeholder="29BCQPH9380B1Z8"
              className="font-mono uppercase"
            />
          </Field>

          <Field label="Contact person">
            <Input
              value={form.contactPerson}
              onChange={(e) => set("contactPerson", e.target.value)}
            />
          </Field>

          <Field label="Phone">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>

          <Field label="Email" error={errors.email}>
            <Input
              type="email"
              value={form.email}
              invalid={!!errors.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>

          <Field label="Address" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="What they supply"
        icon={<Tag size={16} />}
        description="Tags shown when this vendor is picked on a purchase order"
      >
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-medium text-brand-800"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
                className="rounded-full hover:bg-brand-200"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <p className="text-sm text-zinc-400">Nothing added yet</p>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addTag();
              }
            }}
            placeholder="MS Structural Steel"
            className="max-w-xs"
          />
          <Button type="button" variant="secondary" onClick={addTag}>
            <Plus size={15} />
            Add
          </Button>
        </div>
      </SectionCard>

      <SectionCard title="Notes" icon={<ListChecks size={16} />}>
        <Textarea
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything worth remembering about this vendor"
        />
      </SectionCard>

      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Spinner /> : <Save size={15} />}
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add vendor"}
        </Button>
      </div>
    </form>
  );
}
