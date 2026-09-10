"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ClipboardList,
  FileText,
  Landmark,
  Layers,
  ListChecks,
  Paperclip,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
  Trash2,
  Truck,
  Wand2,
} from "lucide-react";

import DateField from "./DateField";
import MultiFileInput, { storedFileSlot, type FileSlot } from "./MultiFileInput";
import {
  Badge,
  Button,
  Field,
  Input,
  SectionCard,
  Select,
  Spinner,
  Textarea,
} from "./ui";
import {
  BUYER_PROFILES,
  DEFAULT_PO_TERMS,
  DEPARTMENTS,
  PO_CATEGORIES,
  PO_UNITS,
} from "@/lib/constants";
import { dateInput, money } from "@/lib/format";
import {
  apiError,
  createPurchaseOrder as createApi,
  fetchNextPoNumber,
  updatePurchaseOrder as updateApi,
} from "@/lib/api";
import {
  ENTITIES,
  GST_MODES,
  PO_STATUSES,
  type Entity,
  type GstMode,
  type PoFilterOptions,
  type PoItemKind,
  type PoStatus,
  type PurchaseOrder,
  type NextPoNumber,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Form state                                                          */
/* ------------------------------------------------------------------ */

interface PartyState {
  name: string;
  address: string;
  gstNumber: string;
}

/** One grid row as the form holds it — numbers stay strings while being typed. */
interface ItemRow {
  key: string;
  kind: PoItemKind;
  name: string;
  description: string;
  hsnCode: string;
  quantity: string;
  unit: string;
  price: string;
}

interface FormState {
  entity: Entity | "";
  poNumber: string;
  poDate: string;
  buyer: PartyState;
  supplier: PartyState & { contactPerson: string; phone: string; email: string };
  deliverTo: PartyState;
  supplierRef: string;
  otherReference: string;
  discount: string;
  gstPercent: string;
  gstMode: GstMode;
  status: PoStatus;
  expectedDate: string;
  department: string;
  requestedBy: string;
  approvedBy: string;
  notes: string;
}

let rowSeq = 0;
const nextKey = () => `po-row-${(rowSeq += 1)}`;

function emptyRow(kind: PoItemKind = "item"): ItemRow {
  return {
    key: nextKey(),
    kind,
    name: "",
    description: "",
    hsnCode: "",
    quantity: kind === "heading" ? "" : "1",
    unit: kind === "heading" ? "" : "NOS",
    price: "",
  };
}

const emptyParty = (): PartyState => ({ name: "", address: "", gstNumber: "" });

function initialState(po?: PurchaseOrder): FormState {
  return {
    entity: po?.entity ?? "",
    poNumber: po?.poNumber ?? "",
    poDate: dateInput(po?.poDate) || dateInput(new Date()),
    buyer: po?.buyer ?? emptyParty(),
    supplier: {
      name: po?.supplier?.name ?? "",
      address: po?.supplier?.address ?? "",
      gstNumber: po?.supplier?.gstNumber ?? "",
      contactPerson: po?.supplier?.contactPerson ?? "",
      phone: po?.supplier?.phone ?? "",
      email: po?.supplier?.email ?? "",
    },
    deliverTo: po?.deliverTo ?? emptyParty(),
    supplierRef: po?.supplierRef ?? "",
    otherReference: po?.otherReference ?? "",
    discount: po?.discount ? String(po.discount) : "",
    gstPercent: po?.gstPercent !== undefined ? String(po.gstPercent) : "18",
    gstMode: po?.gstMode ?? "GST",
    status: po?.status ?? "Draft",
    expectedDate: dateInput(po?.expectedDate),
    department: po?.department ?? "",
    requestedBy: po?.requestedBy ?? "",
    approvedBy: po?.approvedBy ?? "",
    notes: po?.notes ?? "",
  };
}

function initialRows(po?: PurchaseOrder): ItemRow[] {
  if (!po?.items?.length) return [emptyRow()];
  return po.items.map((item) => ({
    key: nextKey(),
    kind: item.kind,
    name: item.name ?? "",
    description: item.description ?? "",
    hsnCode: item.hsnCode ?? "",
    quantity: item.quantity ? String(item.quantity) : "",
    unit: item.unit ?? "",
    price: item.price ? String(item.price) : "",
  }));
}

/**
 * The printed S.No for each row, mirroring the server: a heading takes the next
 * number, the sub-rows beneath it take letters, and a plain item takes the next
 * number and closes the group.
 */
function computeLabels(rows: ItemRow[]): string[] {
  const labels: string[] = [];
  let group = 0;
  let letter = 0;
  let openGroup = false;

  for (const row of rows) {
    if (row.kind === "heading") {
      group += 1;
      letter = 0;
      openGroup = true;
      labels.push(String(group));
      continue;
    }

    if (row.kind === "sub" && openGroup) {
      labels.push(
        letter < 26
          ? String.fromCharCode(97 + letter)
          : `${String.fromCharCode(96 + Math.floor(letter / 26))}${String.fromCharCode(
              97 + (letter % 26)
            )}`
      );
      letter += 1;
      continue;
    }

    openGroup = false;
    group += 1;
    labels.push(String(group));
  }

  return labels;
}

const MAX_ATTACHMENTS = 10;
const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

const KIND_LABELS: Record<PoItemKind, string> = {
  item: "Item",
  heading: "Group heading",
  sub: "Sub-item",
};

/* ------------------------------------------------------------------ */

export default function PurchaseOrderForm({
  order,
  options,
}: {
  order?: PurchaseOrder;
  options?: PoFilterOptions | null;
}) {
  const router = useRouter();
  const isEdit = !!order;

  const [form, setForm] = useState<FormState>(() => initialState(order));
  const [rows, setRows] = useState<ItemRow[]>(() => initialRows(order));
  const [terms, setTerms] = useState<string[]>(
    () => order?.terms ?? [...DEFAULT_PO_TERMS]
  );
  const [attachments, setAttachments] = useState<FileSlot[]>(() =>
    (order?.attachments ?? []).map(storedFileSlot)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  /**
   * The number the server would hand out next for this company, and whether the
   * user has overridden it.
   *
   * An existing order is never renumbered, so editing starts out "manual" and
   * the suggestion is never applied.
   */
  const [autoNumber, setAutoNumber] = useState<NextPoNumber | null>(null);
  const [manualNumber, setManualNumber] = useState(isEdit);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  // Ask for the next number whenever the company or the order date changes -
  // the date matters because the sequence restarts each financial year.
  useEffect(() => {
    if (isEdit || !form.entity) return;
    let cancelled = false;
    fetchNextPoNumber(form.entity, form.poDate)
      .then((next) => {
        if (!cancelled) setAutoNumber(next);
      })
      .catch(() => {
        // Suggestion only - a failure here must not block typing a number.
        if (!cancelled) setAutoNumber(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, form.entity, form.poDate]);

  /**
   * The suggestion, but only while it still belongs to the company on screen.
   *
   * Matching on entity is what stops a number fetched for GCC being shown, or
   * saved, against ENP in the moment after the company is switched and before
   * the new request lands.
   */
  const suggestion =
    !isEdit && form.entity && autoNumber?.entity === form.entity ? autoNumber : null;

  // Derived rather than written into form state: the field shows the suggestion
  // until the user types, and their own value from then on.
  const poNumber = manualNumber ? form.poNumber : (suggestion?.poNumber ?? form.poNumber);

  const setParty = (
    which: "buyer" | "deliverTo",
    patch: Partial<PartyState>
  ): void => setForm((f) => ({ ...f, [which]: { ...f[which], ...patch } }));

  const setSupplier = (patch: Partial<FormState["supplier"]>): void =>
    setForm((f) => ({ ...f, supplier: { ...f.supplier, ...patch } }));

  const updateRow = (key: string, patch: Partial<ItemRow>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  /**
   * Choosing the company fills the buyer and delivery blocks from its profile,
   * but never overwrites something already typed.
   *
   * The PO number is the exception: it belongs to the company's own series, so
   * switching company always re-derives it. Carrying GCC's 050 across to ENP
   * would merge two registers that are meant to be counted separately.
   */
  function onEntityChange(value: Entity | "") {
    const profile = value ? BUYER_PROFILES[value] : undefined;
    // Back to automatic: the number is re-derived from the new company's series.
    if (!isEdit) setManualNumber(false);
    setForm((f) => {
      const buyer = f.buyer.name ? f.buyer : profile ?? emptyParty();
      return {
        ...f,
        entity: value,
        buyer,
        deliverTo: f.deliverTo.name ? f.deliverTo : buyer,
      };
    });
  }

  const copyBuyerToDelivery = () => setForm((f) => ({ ...f, deliverTo: { ...f.buyer } }));

  /* -------- Row operations -------- */

  const addRow = (kind: PoItemKind) => setRows((list) => [...list, emptyRow(kind)]);

  const removeRow = (key: string) =>
    setRows((list) => (list.length === 1 ? list : list.filter((r) => r.key !== key)));

  const moveRow = (key: string, delta: number) =>
    setRows((list) => {
      const at = list.findIndex((r) => r.key === key);
      const to = at + delta;
      if (at < 0 || to < 0 || to >= list.length) return list;
      const next = [...list];
      const [row] = next.splice(at, 1);
      next.splice(to, 0, row!);
      return next;
    });

  /* -------- Live totals, mirroring the server -------- */

  const round2 = (n: number) => Math.round(n * 100) / 100;

  const totals = useMemo(() => {
    const subTotal = round2(
      rows
        .filter((r) => r.kind !== "heading")
        .reduce((sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.price) || 0), 0)
    );
    const discount = round2(Math.min(Math.max(0, Number(form.discount) || 0), subTotal));
    const taxable = round2(subTotal - discount);
    const gstAmount = round2((taxable * (Number(form.gstPercent) || 0)) / 100);
    return {
      subTotal,
      discount,
      taxable,
      gstAmount,
      grandTotal: round2(taxable + gstAmount),
    };
  }, [rows, form.discount, form.gstPercent]);

  // The S.No each row will print with, so what you see while typing is what the
  // PDF produces.
  const labels = useMemo(() => computeLabels(rows), [rows]);

  /**
   * Says which series the number comes from, so it is never mistaken for the
   * company field sitting next to it.
   */
  const numberHint = isEdit
    ? "Changing this renumbers the order"
    : !form.entity
      ? "Pick the company first - it is numbered automatically"
      : suggestion
        ? manualNumber
          ? `Your own number. Next free for ${form.entity} is ${suggestion.poNumber}`
          : suggestion.financialYear
            ? `Next in ${form.entity}'s ${suggestion.financialYear} series - each company counts separately`
            : `Next in ${form.entity}'s series - each company counts separately`
        : "As printed, e.g. 049/2025-26";

  const departmentOptions = useMemo(
    () => Array.from(new Set([...DEPARTMENTS, ...(options?.departments ?? [])])).sort(),
    [options]
  );
  const unitOptions = useMemo(
    () => Array.from(new Set([...PO_UNITS, ...(options?.units ?? [])])),
    [options]
  );

  /* -------- Validation + submit -------- */

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!poNumber.trim()) next.poNumber = "Enter the PO number";
    if (!form.entity) next.entity = "Choose ENP or GCC";
    if (!form.supplier.name.trim()) next.supplierName = "Enter the supplier";
    if (!rows.some((r) => r.kind !== "heading" && (r.name.trim() || r.description.trim())))
      next.items = "Add at least one priced line";
    if (Number(form.gstPercent) < 0 || Number(form.gstPercent) > 100)
      next.gstPercent = "GST must be between 0 and 100";
    if (Number(form.discount) < 0) next.discount = "Discount cannot be negative";
    if (form.supplier.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.supplier.email))
      next.supplierEmail = "Enter a valid email";
    if (
      form.poDate &&
      form.expectedDate &&
      new Date(form.expectedDate) < new Date(form.poDate)
    )
      next.expectedDate = "Delivery cannot be before the order date";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.append("entity", form.entity);
    fd.append("poNumber", poNumber.trim());
    fd.append("poDate", form.poDate);
    fd.append("supplierRef", form.supplierRef.trim());
    fd.append("otherReference", form.otherReference.trim());
    fd.append("discount", form.discount || "0");
    fd.append("gstPercent", form.gstPercent || "0");
    fd.append("gstMode", form.gstMode);
    fd.append("status", form.status);
    fd.append("expectedDate", form.expectedDate);
    fd.append("department", form.department.trim());
    fd.append("requestedBy", form.requestedBy.trim());
    fd.append("approvedBy", form.approvedBy.trim());
    fd.append("notes", form.notes.trim());

    fd.append("buyer", JSON.stringify(form.buyer));
    fd.append("deliverTo", JSON.stringify(form.deliverTo));
    fd.append("supplier", JSON.stringify(form.supplier));

    // Blank rows are dropped rather than saved as empty lines.
    fd.append(
      "items",
      JSON.stringify(
        rows
          .filter((r) => r.name.trim() || r.description.trim())
          .map((r) => ({
            kind: r.kind,
            name: r.name.trim(),
            description: r.description.trim(),
            hsnCode: r.hsnCode.trim(),
            quantity: Number(r.quantity) || 0,
            unit: r.unit.trim(),
            price: Number(r.price) || 0,
          }))
      )
    );

    fd.append("terms", JSON.stringify(terms.map((t) => t.trim()).filter(Boolean)));

    // The id list sets the stored order server-side; new picks are appended.
    fd.append(
      "attachmentIds",
      JSON.stringify(attachments.filter((s) => s.stored).map((s) => s.stored!.publicId))
    );
    attachments.forEach((s) => {
      if (s.file) fd.append("attachment", s.file);
    });

    return fd;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the highlighted fields");
      return;
    }

    setSaving(true);
    try {
      const fd = buildFormData();
      const saved = isEdit ? await updateApi(order!._id, fd) : await createApi(fd);
      toast.success(isEdit ? "Purchase order updated" : `PO ${saved.poNumber} created`);
      router.push(`/purchase-orders/${encodeURIComponent(saved._id)}`);
      router.refresh();
    } catch (err) {
      const message = apiError(err, "Could not save the purchase order");
      toast.error(message);

      // Someone else took the number while this form was open. Nothing is
      // reserved until save, so fetch the next free one rather than leaving the
      // user to guess what it should be.
      if (!isEdit && /already in use/i.test(message) && form.entity) {
        try {
          const next = await fetchNextPoNumber(form.entity, form.poDate);
          setAutoNumber(next);
          setManualNumber(false);
          toast(`Moved on to ${next.poNumber} - press save again`, { icon: "🔢" });
        } catch {
          // Leave the typed number alone if even this fails.
        }
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* ---------------- Order header ---------------- */}
      <SectionCard
        title="Order"
        icon={<ClipboardList size={16} />}
        description="Who is ordering, the PO number, and when"
      >
        <div className={grid}>
          <Field label="Raised by" required error={errors.entity}>
            <Select
              value={form.entity}
              invalid={!!errors.entity}
              onChange={(e) => onEntityChange(e.target.value as Entity | "")}
            >
              <option value="">Select company…</option>
              {ENTITIES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="PO number"
            required
            error={errors.poNumber}
            hint={errors.poNumber ? undefined : numberHint}
          >
            <div className="flex items-center gap-2">
              <Input
                value={poNumber}
                invalid={!!errors.poNumber}
                onChange={(e) => {
                  // Typing takes over: the suggestion stops filling the field.
                  setManualNumber(true);
                  set("poNumber", e.target.value);
                }}
                placeholder="049/2025-26"
                className="font-mono"
              />
              {!isEdit && suggestion && manualNumber && (
                <button
                  type="button"
                  onClick={() => setManualNumber(false)}
                  title={`Use ${suggestion.poNumber}, the next number for ${form.entity}`}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-2.5 py-2 text-xs font-medium text-brand-800 hover:bg-brand-100"
                >
                  <RotateCcw size={13} />
                  Auto
                </button>
              )}
              {!isEdit && !manualNumber && poNumber && (
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

          <Field label="PO date">
            <DateField value={form.poDate} onChange={(iso) => set("poDate", iso)} />
          </Field>

          <Field label="Status">
            <Select
              value={form.status}
              onChange={(e) => set("status", e.target.value as PoStatus)}
            >
              {PO_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Expected delivery" error={errors.expectedDate}>
            <DateField
              value={form.expectedDate}
              invalid={!!errors.expectedDate}
              onChange={(iso) => set("expectedDate", iso)}
            />
          </Field>

          <Field label="Department">
            <Input
              list="po-departments"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="Which department is this for?"
            />
            <datalist id="po-departments">
              {departmentOptions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>

          <Field label="Supplier's ref." hint="Their quotation number">
            <Input
              value={form.supplierRef}
              onChange={(e) => set("supplierRef", e.target.value)}
              placeholder="FTMEP/1158/2026-27"
            />
          </Field>

          <Field label="Other reference(s)">
            <Input
              value={form.otherReference}
              onChange={(e) => set("otherReference", e.target.value)}
              placeholder="PROPOSAL"
            />
          </Field>

          <Field label="Requested by">
            <Input
              value={form.requestedBy}
              onChange={(e) => set("requestedBy", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ---------------- Supplier ---------------- */}
      <SectionCard
        title="Supplier"
        icon={<Building2 size={16} />}
        description="Who the order is placed with"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Supplier name" required error={errors.supplierName}>
            <Input
              list="po-suppliers"
              value={form.supplier.name}
              invalid={!!errors.supplierName}
              onChange={(e) => setSupplier({ name: e.target.value })}
              placeholder="FUTURE TECH MEP SERVICES"
            />
            <datalist id="po-suppliers">
              {(options?.suppliers ?? []).map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </Field>

          <Field label="GST number">
            <Input
              value={form.supplier.gstNumber}
              onChange={(e) => setSupplier({ gstNumber: e.target.value.toUpperCase() })}
              placeholder="29BFRPD9068Q1Z9"
              className="font-mono uppercase"
            />
          </Field>

          <Field label="Address" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.supplier.address}
              onChange={(e) => setSupplier({ address: e.target.value })}
              placeholder="Office no-1 no-44, Shivasmruthy, Banjara Layout, Horamavu Bangalore-560043."
            />
          </Field>

          <Field label="Contact person">
            <Input
              value={form.supplier.contactPerson}
              onChange={(e) => setSupplier({ contactPerson: e.target.value })}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input
                value={form.supplier.phone}
                onChange={(e) => setSupplier({ phone: e.target.value })}
              />
            </Field>
            <Field label="Email" error={errors.supplierEmail}>
              <Input
                type="email"
                value={form.supplier.email}
                invalid={!!errors.supplierEmail}
                onChange={(e) => setSupplier({ email: e.target.value })}
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Addresses ---------------- */}
      <SectionCard
        title="Addresses"
        icon={<Landmark size={16} />}
        description="Printed at the top of the order — pre-filled from the company profile"
        action={
          <button
            type="button"
            onClick={copyBuyerToDelivery}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <Truck size={14} />
            Deliver to buyer address
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Buyer
            </p>
            <Field label="Name">
              <Input
                value={form.buyer.name}
                onChange={(e) => setParty("buyer", { name: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <Textarea
                rows={3}
                value={form.buyer.address}
                onChange={(e) => setParty("buyer", { address: e.target.value })}
              />
            </Field>
            <Field label="GSTN">
              <Input
                value={form.buyer.gstNumber}
                onChange={(e) =>
                  setParty("buyer", { gstNumber: e.target.value.toUpperCase() })
                }
                className="font-mono uppercase"
              />
            </Field>
          </div>

          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              Place of delivery
            </p>
            <Field label="Name">
              <Input
                value={form.deliverTo.name}
                onChange={(e) => setParty("deliverTo", { name: e.target.value })}
              />
            </Field>
            <Field label="Address">
              <Textarea
                rows={3}
                value={form.deliverTo.address}
                onChange={(e) => setParty("deliverTo", { address: e.target.value })}
              />
            </Field>
            <Field label="GSTN">
              <Input
                value={form.deliverTo.gstNumber}
                onChange={(e) =>
                  setParty("deliverTo", { gstNumber: e.target.value.toUpperCase() })
                }
                className="font-mono uppercase"
              />
            </Field>
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Line items ---------------- */}
      <SectionCard
        title="Items"
        icon={<Layers size={16} />}
        description="A group heading numbers as 1, 2, 3 and its sub-items as a, b, c"
      >
        {errors.items && <p className="mb-3 text-xs text-rose-600">{errors.items}</p>}

        <div className="flex flex-col gap-3">
          {rows.map((row, index) => {
            const heading = row.kind === "heading";
            const amount = (Number(row.quantity) || 0) * (Number(row.price) || 0);

            return (
              <div
                key={row.key}
                className={
                  heading
                    ? "rounded-lg border border-brand-200 bg-brand-50/60 p-3"
                    : "rounded-lg border border-zinc-200 bg-white p-3"
                }
                style={row.kind === "sub" ? { marginLeft: 20 } : undefined}
              >
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-zinc-900 px-1.5 font-mono text-[11px] font-bold text-white">
                    {labels[index]}
                  </span>

                  <Select
                    value={row.kind}
                    onChange={(e) =>
                      updateRow(row.key, { kind: e.target.value as PoItemKind })
                    }
                    className="w-auto py-1 text-xs"
                  >
                    {(Object.keys(KIND_LABELS) as PoItemKind[]).map((k) => (
                      <option key={k} value={k}>
                        {KIND_LABELS[k]}
                      </option>
                    ))}
                  </Select>

                  {!heading && (
                    <span className="text-xs font-semibold text-zinc-700">
                      {money(amount)}
                    </span>
                  )}

                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveRow(row.key, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(row.key, 1)}
                      disabled={index === rows.length - 1}
                      aria-label="Move down"
                      className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-30"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeRow(row.key)}
                      disabled={rows.length === 1}
                      aria-label="Remove line"
                      className="rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {heading ? (
                  <Field label="Group name">
                    <Input
                      list="po-categories"
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      placeholder="Kitchen Wood"
                      className="font-semibold"
                    />
                  </Field>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-12">
                    <Field label="Product name" className="col-span-2 lg:col-span-4">
                      <Input
                        list="po-categories"
                        value={row.name}
                        onChange={(e) => updateRow(row.key, { name: e.target.value })}
                        placeholder="2RMT SS Kitchen Wood including filter"
                      />
                    </Field>
                    <Field label="Description" className="col-span-2 lg:col-span-3">
                      <Input
                        value={row.description}
                        onChange={(e) =>
                          updateRow(row.key, { description: e.target.value })
                        }
                        placeholder="Optional detail"
                      />
                    </Field>
                    <Field label="Qty" className="lg:col-span-1">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={row.quantity}
                        onChange={(e) => updateRow(row.key, { quantity: e.target.value })}
                      />
                    </Field>
                    <Field label="Unit" className="lg:col-span-1">
                      <Input
                        list="po-units"
                        value={row.unit}
                        onChange={(e) => updateRow(row.key, { unit: e.target.value })}
                      />
                    </Field>
                    <Field label="Price" className="lg:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        value={row.price}
                        onChange={(e) => updateRow(row.key, { price: e.target.value })}
                      />
                    </Field>
                    <Field label="HSN/SAC" className="lg:col-span-1">
                      <Input
                        value={row.hsnCode}
                        onChange={(e) => updateRow(row.key, { hsnCode: e.target.value })}
                      />
                    </Field>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <datalist id="po-units">
          {unitOptions.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <datalist id="po-categories">
          {PO_CATEGORIES.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>

        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => addRow("item")}>
            <Plus size={15} />
            Add item
          </Button>
          <Button type="button" variant="secondary" onClick={() => addRow("heading")}>
            <Plus size={15} />
            Add group heading
          </Button>
          <Button type="button" variant="secondary" onClick={() => addRow("sub")}>
            <Plus size={15} />
            Add sub-item
          </Button>
        </div>
      </SectionCard>

      {/* ---------------- Totals ---------------- */}
      <SectionCard
        title="Totals"
        icon={<FileText size={16} />}
        description="Discount comes off before GST is charged"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className={grid.replace("lg:grid-cols-3", "lg:grid-cols-2")}>
            <Field label="Less discount" error={errors.discount} hint="In rupees">
              <Input
                type="number"
                min={0}
                step="any"
                value={form.discount}
                invalid={!!errors.discount}
                onChange={(e) => set("discount", e.target.value)}
                placeholder="0"
              />
            </Field>
            <Field label="GST %" error={errors.gstPercent}>
              <Input
                type="number"
                min={0}
                max={100}
                step="any"
                value={form.gstPercent}
                invalid={!!errors.gstPercent}
                onChange={(e) => set("gstPercent", e.target.value)}
              />
            </Field>
            <Field label="Tax line" hint="How the tax prints on the PDF">
              <Select
                value={form.gstMode}
                onChange={(e) => set("gstMode", e.target.value as GstMode)}
              >
                {GST_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m === "GST" ? "Single GST line" : m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Approved by">
              <Input
                value={form.approvedBy}
                onChange={(e) => set("approvedBy", e.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <dl className="flex flex-col gap-2 text-sm">
              <Row label="Total" value={money(totals.subTotal)} />
              {totals.discount > 0 && (
                <Row label="Less discount" value={`- ${money(totals.discount)}`} />
              )}
              <Row label="Total amount" value={money(totals.taxable)} />
              <Row
                label={
                  form.gstMode === "CGST+SGST"
                    ? `CGST + SGST @ ${form.gstPercent || 0}%`
                    : form.gstMode === "IGST"
                      ? `IGST @ ${form.gstPercent || 0}%`
                      : `GST @ ${form.gstPercent || 0}%`
                }
                value={money(totals.gstAmount)}
              />
              <div className="mt-1 flex items-center justify-between border-t border-zinc-300 pt-2">
                <dt className="text-sm font-semibold text-zinc-800">Sub total</dt>
                <dd className="text-base font-bold text-brand-700">
                  {money(totals.grandTotal)}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-[11px] text-zinc-500">
              {rows.filter((r) => r.kind !== "heading").length} priced line
              {rows.filter((r) => r.kind !== "heading").length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Terms + attachments ---------------- */}
      <SectionCard
        title="Terms & attachments"
        icon={<ScrollText size={16} />}
        description="Printed under the grid, numbered in order"
      >
        <div className="flex flex-col gap-3">
          {terms.map((term, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="mt-2 w-4 shrink-0 text-sm font-semibold text-zinc-500">
                {i + 1}
              </span>
              <Input
                value={term}
                onChange={(e) =>
                  setTerms((list) => list.map((t, j) => (j === i ? e.target.value : t)))
                }
                placeholder="Delivery: Within 3 days after receipt of PO"
              />
              <button
                type="button"
                onClick={() => setTerms((list) => list.filter((_, j) => j !== i))}
                aria-label={`Remove term ${i + 1}`}
                className="mt-1 rounded p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setTerms((list) => [...list, ""])}
            >
              <ListChecks size={15} />
              Add term
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MultiFileInput
            label="Attachments"
            hint="Quotations, proposals, the signed copy"
            accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
            slots={attachments}
            onChange={setAttachments}
            max={MAX_ATTACHMENTS}
          />
          <Field label="Notes" hint="Printed under the terms">
            <Textarea
              rows={4}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      {/* ---------------- Save ---------------- */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur">
        <div className="flex items-center gap-2 text-sm text-zinc-600">
          <Paperclip size={15} className="text-zinc-400" />
          <span>
            {form.poNumber ? (
              <>
                PO <span className="font-mono font-semibold">{form.poNumber}</span>
              </>
            ) : (
              "New purchase order"
            )}
          </span>
          <Badge className="bg-brand-100 text-brand-800 ring-brand-200">
            {money(totals.grandTotal)}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? <Spinner /> : <Save size={15} />}
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create purchase order"}
          </Button>
        </div>
      </div>
    </form>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="font-medium text-zinc-800">{value}</dd>
    </div>
  );
}
