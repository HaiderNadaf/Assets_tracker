"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeftRight,
  BadgeIndianRupee,
  Building2,
  CalendarDays,
  ClipboardCheck,
  FileText,
  Info,
  Laptop,
  Plus,
  Landmark,
  Save,
  ShieldCheck,
  TrendingDown,
  Trash2,
  Wrench,
  X,
} from "lucide-react";

import FileInput from "./FileInput";
import DateField from "./DateField";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  Field,
  Input,
  SectionCard,
  Select,
  Spinner,
  Textarea,
} from "./ui";
import {
  ALL_PRODUCTS,
  CATEGORIES,
  DEPARTMENTS,
  LOCATIONS,
  PRODUCT_CATEGORY,
} from "@/lib/constants";
import { computeDepreciation } from "@/lib/depreciation";
import { dateInput, money, shortDate, ENTITY_STYLES, STATUS_STYLES } from "@/lib/format";
import {
  createAsset as createAssetApi,
  updateAsset as updateAssetApi,
  apiError,
} from "@/lib/api";
import {
  ASSET_STATUSES,
  DEPRECIATION_METHODS,
  ENTITIES,
  type Asset,
  type AssetStatus,
  type DepreciationMethod,
  type Entity,
  type FilterOptions,
  type StoredFile,
  type ServiceRecord,
  type TransferEntry,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Form state                                                          */
/* ------------------------------------------------------------------ */

interface FormState {
  assetCode: string;
  entity: Entity | "";
  product: string;
  category: string;
  brand: string;
  productNumber: string;
  purchaseDate: string;
  paymentDate: string;
  invoiceNumber: string;
  vendor: string;
  purchaseCost: string;
  depMethod: DepreciationMethod;
  depRate: string;
  depLife: string;
  depSalvage: string;
  employeeName: string;
  employeeId: string;
  employeeEmail: string;
  department: string;
  location: string;
  warrantyProvider: string;
  warrantyExpiry: string;
  verified: boolean;
  verifiedOn: string;
  verifiedBy: string;
  verificationRemarks: string;
  status: AssetStatus;
  notes: string;
}

/**
 * A service row as the form holds it: the stored photo (if any), plus a pending
 * file the user just picked and a flag for clearing the stored one.
 */
interface ServiceRow {
  key: string;
  description: string;
  purchaseDate: string;
  serviceDate: string;
  paymentDate: string;
  purchaseCost: string;
  serviceCost: string;
  invoiceNumber: string;
  vendor: string;
  warrantyPeriod: string;
  photo: StoredFile | null;
  file: File | null;
  removePhoto: boolean;
}

let rowSeq = 0;
const nextRowKey = () => `svc-${(rowSeq += 1)}`;

function emptyServiceRow(): ServiceRow {
  return {
    key: nextRowKey(),
    description: "",
    purchaseDate: "",
    serviceDate: "",
    paymentDate: "",
    purchaseCost: "",
    serviceCost: "",
    invoiceNumber: "",
    vendor: "",
    warrantyPeriod: "",
    photo: null,
    file: null,
    removePhoto: false,
  };
}

function toServiceRow(record: ServiceRecord): ServiceRow {
  return {
    key: nextRowKey(),
    description: record.description ?? "",
    purchaseDate: dateInput(record.purchaseDate),
    serviceDate: dateInput(record.serviceDate),
    paymentDate: dateInput(record.paymentDate),
    purchaseCost: record.purchaseCost ? String(record.purchaseCost) : "",
    serviceCost: record.serviceCost ? String(record.serviceCost) : "",
    invoiceNumber: record.invoiceNumber ?? "",
    vendor: record.vendor ?? "",
    warrantyPeriod: record.warrantyPeriod ?? "",
    photo: record.photo ?? null,
    file: null,
    removePhoto: false,
  };
}

/** Draft rows collected on the create form and sent with the first save. */
type DraftTransfer = Pick<
  TransferEntry,
  "date" | "toEmployee" | "toDepartment" | "toLocation" | "remarks"
>;

function initialState(asset?: Asset): FormState {
  return {
    assetCode: asset?.assetCode ?? "",
    entity: asset?.entity ?? "",
    product: asset?.product ?? "",
    category: asset?.category ?? "",
    brand: asset?.brand ?? "",
    productNumber: asset?.productNumber ?? "",
    purchaseDate: dateInput(asset?.purchaseDate),
    paymentDate: dateInput(asset?.paymentDate),
    invoiceNumber: asset?.invoiceNumber ?? "",
    vendor: asset?.vendor ?? "",
    purchaseCost: asset?.purchaseCost ? String(asset.purchaseCost) : "",
    depMethod: asset?.depreciation?.method ?? "SLM",
    depRate: asset?.depreciation?.ratePercent ? String(asset.depreciation.ratePercent) : "",
    depLife: asset?.depreciation?.usefulLifeYears
      ? String(asset.depreciation.usefulLifeYears)
      : "",
    depSalvage: asset?.depreciation?.salvageValue
      ? String(asset.depreciation.salvageValue)
      : "",
    employeeName: asset?.assignedEmployee?.name ?? "",
    employeeId: asset?.assignedEmployee?.employeeId ?? "",
    employeeEmail: asset?.assignedEmployee?.email ?? "",
    department: asset?.department ?? "",
    location: asset?.location ?? "",
    warrantyProvider: asset?.warranty?.provider ?? "",
    warrantyExpiry: dateInput(asset?.warranty?.expiryDate),
    verified: asset?.physicalVerification?.verified ?? false,
    verifiedOn: dateInput(asset?.physicalVerification?.verifiedOn),
    verifiedBy: asset?.physicalVerification?.verifiedBy ?? "",
    verificationRemarks: asset?.physicalVerification?.remarks ?? "",
    status: asset?.status ?? "Active",
    notes: asset?.notes ?? "",
  };
}

const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

/* ------------------------------------------------------------------ */

export default function AssetForm({
  asset,
  options,
}: {
  asset?: Asset;
  options?: FilterOptions | null;
}) {
  const router = useRouter();
  const isEdit = !!asset;

  const [form, setForm] = useState<FormState>(() => initialState(asset));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [photo, setPhoto] = useState<File | null>(null);
  const [invoice, setInvoice] = useState<File | null>(null);
  const [warrantyDoc, setWarrantyDoc] = useState<File | null>(null);
  const [verificationPhoto, setVerificationPhoto] = useState<File | null>(null);

  const [removePhoto, setRemovePhoto] = useState(false);
  const [removeInvoice, setRemoveInvoice] = useState(false);
  const [removeWarrantyDoc, setRemoveWarrantyDoc] = useState(false);
  const [removeVerificationPhoto, setRemoveVerificationPhoto] = useState(false);

  const [services, setServices] = useState<ServiceRow[]>(() =>
    (asset?.serviceRecords ?? []).map(toServiceRow)
  );

  const [draftTransfers, setDraftTransfers] = useState<DraftTransfer[]>([]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const updateService = (key: string, patch: Partial<ServiceRow>) =>
    setServices((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const serviceTotal = services.reduce((sum, r) => sum + (Number(r.serviceCost) || 0), 0);

  // Suggestions merge the starter catalogue with whatever is already saved.
  const productOptions = useMemo(
    () => Array.from(new Set([...ALL_PRODUCTS, ...(options?.products ?? [])])).sort(),
    [options]
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set([...CATEGORIES, ...(options?.categories ?? [])])).sort(),
    [options]
  );
  const departmentOptions = useMemo(
    () => Array.from(new Set([...DEPARTMENTS, ...(options?.departments ?? [])])).sort(),
    [options]
  );
  const locationOptions = useMemo(
    () => Array.from(new Set([...LOCATIONS, ...(options?.locations ?? [])])).sort(),
    [options]
  );

  const book = useMemo(
    () =>
      computeDepreciation(Number(form.purchaseCost) || 0, form.purchaseDate || null, {
        method: form.depMethod,
        ratePercent: Number(form.depRate) || 0,
        usefulLifeYears: Number(form.depLife) || 0,
        salvageValue: Number(form.depSalvage) || 0,
      }),
    [form.purchaseCost, form.purchaseDate, form.depMethod, form.depRate, form.depLife, form.depSalvage]
  );

  function onProductChange(value: string) {
    setForm((f) => ({
      ...f,
      product: value,
      // Only auto-fill the category when the user has not chosen one.
      category: f.category || PRODUCT_CATEGORY.get(value) || "",
    }));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!form.assetCode.trim()) next.assetCode = "Enter the FA code";
    if (!form.entity) next.entity = "Choose ENP or GCC";
    if (!form.product.trim()) next.product = "Select or type a product";
    if (form.purchaseCost && Number(form.purchaseCost) < 0)
      next.purchaseCost = "Cost cannot be negative";
    if (form.depRate && (Number(form.depRate) < 0 || Number(form.depRate) > 100))
      next.depRate = "Rate must be between 0 and 100";
    if (form.employeeEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.employeeEmail))
      next.employeeEmail = "Enter a valid email";
    if (
      form.purchaseDate &&
      form.paymentDate &&
      new Date(form.paymentDate) < new Date(form.purchaseDate)
    )
      next.paymentDate = "Payment cannot precede the purchase date";
    if (
      form.purchaseDate &&
      form.warrantyExpiry &&
      new Date(form.warrantyExpiry) < new Date(form.purchaseDate)
    )
      next.warrantyExpiry = "Warranty cannot expire before the purchase date";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.append("assetCode", form.assetCode.trim().toUpperCase());
    fd.append("entity", form.entity);
    fd.append("product", form.product.trim());
    fd.append("category", form.category.trim());
    fd.append("brand", form.brand.trim());
    fd.append("productNumber", form.productNumber.trim());
    fd.append("purchaseDate", form.purchaseDate);
    fd.append("paymentDate", form.paymentDate);
    fd.append("invoiceNumber", form.invoiceNumber.trim());
    fd.append("vendor", form.vendor.trim());
    fd.append("purchaseCost", form.purchaseCost || "0");
    fd.append("department", form.department.trim());
    fd.append("location", form.location.trim());
    fd.append("status", form.status);
    fd.append("notes", form.notes.trim());

    fd.append(
      "depreciation",
      JSON.stringify({
        method: form.depMethod,
        ratePercent: Number(form.depRate) || 0,
        usefulLifeYears: Number(form.depLife) || 0,
        salvageValue: Number(form.depSalvage) || 0,
      })
    );
    fd.append(
      "assignedEmployee",
      JSON.stringify({
        name: form.employeeName.trim(),
        employeeId: form.employeeId.trim(),
        email: form.employeeEmail.trim(),
      })
    );
    fd.append(
      "warranty",
      JSON.stringify({
        provider: form.warrantyProvider.trim(),
        expiryDate: form.warrantyExpiry || null,
      })
    );
    fd.append(
      "physicalVerification",
      JSON.stringify({
        verified: form.verified,
        verifiedOn: form.verifiedOn || null,
        verifiedBy: form.verifiedBy.trim(),
        remarks: form.verificationRemarks.trim(),
      })
    );

    // Rows keep an existing photo by echoing its publicId; a new pick rides along
    // as servicePhoto_<index> and wins on the server.
    fd.append(
      "serviceRecords",
      JSON.stringify(
        services.map((row) => ({
          description: row.description.trim(),
          purchaseDate: row.purchaseDate || null,
          serviceDate: row.serviceDate || null,
          paymentDate: row.paymentDate || null,
          purchaseCost: Number(row.purchaseCost) || 0,
          serviceCost: Number(row.serviceCost) || 0,
          invoiceNumber: row.invoiceNumber.trim(),
          vendor: row.vendor.trim(),
          warrantyPeriod: row.warrantyPeriod.trim(),
          photoPublicId: row.removePhoto ? "" : (row.photo?.publicId ?? ""),
        }))
      )
    );
    services.forEach((row, index) => {
      if (row.file) fd.append(`servicePhoto_${index}`, row.file);
    });

    if (photo) fd.append("photo", photo);
    if (invoice) fd.append("purchaseInvoice", invoice);
    if (warrantyDoc) fd.append("warrantyDocument", warrantyDoc);
    if (verificationPhoto) fd.append("verificationPhoto", verificationPhoto);

    if (isEdit) {
      if (removePhoto) fd.append("removePhoto", "true");
      if (removeInvoice) fd.append("removePurchaseInvoice", "true");
      if (removeWarrantyDoc) fd.append("removeWarrantyDocument", "true");
      if (removeVerificationPhoto) fd.append("removeVerificationPhoto", "true");
    } else {
      if (draftTransfers.length)
        fd.append("transferHistory", JSON.stringify(draftTransfers));
    }

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
      const saved = isEdit
        ? await updateAssetApi(asset!._id, fd)
        : await createAssetApi(fd);
      toast.success(isEdit ? "Asset updated" : `Asset ${saved.assetCode} created`);
      router.push(`/assets/${encodeURIComponent(saved._id)}`);
      router.refresh();
    } catch (err) {
      toast.error(apiError(err, "Could not save the asset"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {/* ---------------- Ownership ---------------- */}
      <SectionCard
        title="Ownership"
        icon={<Landmark size={16} />}
        description="Which company owns this asset, and its FA code"
      >
        <div className={grid}>
          <Field
            label="🏛️ Belongs to"
            required
            error={errors.entity}
            hint={!errors.entity ? "The owning company" : undefined}
          >
            <Select
              value={form.entity}
              invalid={!!errors.entity}
              onChange={(e) => set("entity", e.target.value as Entity | "")}
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
            label="🏷️ FA Code"
            required
            error={errors.assetCode}
            hint={!errors.assetCode ? "Your asset tag, e.g. FA-00001 — must be unique" : undefined}
          >
            <Input
              value={form.assetCode}
              invalid={!!errors.assetCode}
              onChange={(e) => set("assetCode", e.target.value.toUpperCase())}
              placeholder="FA-00001"
              className="font-mono uppercase"
              autoComplete="off"
            />
          </Field>

          <div className="flex items-end pb-2">
            {form.entity ? (
              <Badge className={ENTITY_STYLES[form.entity]}>{form.entity}</Badge>
            ) : (
              <span className="text-xs text-zinc-400">No company selected</span>
            )}
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Identity ---------------- */}
      <SectionCard
        title="Asset Identity"
        icon={<Laptop size={16} />}
        description="Photo, product and product number"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
          <div className="flex flex-col gap-4">
            <FileInput
              label="📷 Asset Photo"
              variant="image"
              accept="image/*"
              file={photo}
              onFileChange={setPhoto}
              existing={asset?.photo}
              removed={removePhoto}
              onRemovedChange={setRemovePhoto}
              hint="JPG / PNG / WebP, max 10 MB"
            />
          </div>

          <div className={grid}>
            <Field label="💻 Product" required error={errors.product} className="sm:col-span-2 lg:col-span-1">
              <Input
                list="product-options"
                value={form.product}
                invalid={!!errors.product}
                onChange={(e) => onProductChange(e.target.value)}
                placeholder="e.g. Dell Laptop"
              />
              <datalist id="product-options">
                {productOptions.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>

            <Field label="Category">
              <Input
                list="category-options"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                placeholder="e.g. Laptop"
              />
              <datalist id="category-options">
                {categoryOptions.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>

            <Field label="Brand / Make">
              <Input
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
                placeholder="e.g. Dell"
              />
            </Field>

            <Field label="🔢 Product Number" hint="Manufacturer product / service tag number">
              <Input
                value={form.productNumber}
                onChange={(e) => set("productNumber", e.target.value)}
                placeholder="e.g. 5CG1234ABC"
                className="font-mono"
              />
            </Field>

            <Field label="Status">
              <Select
                value={form.status}
                onChange={(e) => set("status", e.target.value as AssetStatus)}
              >
                {ASSET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex items-end">
              <Badge className={STATUS_STYLES[form.status]}>{form.status}</Badge>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Purchase ---------------- */}
      <SectionCard
        title="Purchase Details"
        icon={<BadgeIndianRupee size={16} />}
        description="Invoice, cost and vendor"
      >
        <div className={grid}>
          <Field label="📅 Purchase Date">
            <DateField
              value={form.purchaseDate}
              onChange={(iso) => set("purchaseDate", iso)}
            />
          </Field>

          <Field
            label="💳 Payment Date"
            error={errors.paymentDate}
            hint={!errors.paymentDate ? "When the invoice was actually paid" : undefined}
          >
            <DateField
              invalid={!!errors.paymentDate}
              value={form.paymentDate}
              onChange={(iso) => set("paymentDate", iso)}
            />
          </Field>

          <Field label="💰 Purchase Cost" error={errors.purchaseCost} hint="Amount in ₹">
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              invalid={!!errors.purchaseCost}
              value={form.purchaseCost}
              onChange={(e) => set("purchaseCost", e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <Field label="Invoice Number">
            <Input
              value={form.invoiceNumber}
              onChange={(e) => set("invoiceNumber", e.target.value)}
              placeholder="e.g. INV-2026-0042"
            />
          </Field>

          <Field label="Vendor / Supplier">
            <Input
              value={form.vendor}
              onChange={(e) => set("vendor", e.target.value)}
              placeholder="e.g. Redington India"
            />
          </Field>

          <div className="sm:col-span-2">
            <FileInput
              label="🧾 Purchase Invoice"
              variant="document"
              file={invoice}
              onFileChange={setInvoice}
              existing={asset?.purchaseInvoice}
              removed={removeInvoice}
              onRemovedChange={setRemoveInvoice}
              hint="PDF or image, max 10 MB"
            />
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Maintenance & service details ---------------- */}
      <SectionCard
        title="Maintenance & Service Details"
        icon={<Wrench size={16} />}
        description="One entry per service or repair — add as many as you need"
        action={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setServices((rows) => [...rows, emptyServiceRow()])}
          >
            <Plus size={15} />
            Add entry
          </Button>
        }
      >
        {services.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-500">
            No service entries yet — use <span className="font-medium">Add entry</span> to
            record one.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {services.map((row, index) => (
              <div
                key={row.key}
                className="rounded-lg border border-zinc-200 bg-zinc-50/60 p-4"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Service #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setServices((rows) => rows.filter((r) => r.key !== row.key))
                    }
                    aria-label={`Remove service entry ${index + 1}`}
                    className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className={grid}>
                  <Field
                    label="📝 Description"
                    className="sm:col-span-2 lg:col-span-3"
                    hint="What was done, or what was purchased"
                  >
                    <Textarea
                      rows={2}
                      value={row.description}
                      onChange={(e) => updateService(row.key, { description: e.target.value })}
                      placeholder="e.g. Screen replaced under AMC"
                    />
                  </Field>

                  <Field label="📅 Purchase Date">
                    <DateField
                      value={row.purchaseDate}
                      onChange={(iso) => updateService(row.key, { purchaseDate: iso })}
                    />
                  </Field>

                  <Field label="🛠️ Service Date">
                    <DateField
                      value={row.serviceDate}
                      onChange={(iso) => updateService(row.key, { serviceDate: iso })}
                    />
                  </Field>

                  <Field label="💳 Payment Date">
                    <DateField
                      value={row.paymentDate}
                      onChange={(iso) => updateService(row.key, { paymentDate: iso })}
                    />
                  </Field>

                  <Field label="💰 Purchase Cost" hint="Amount in ₹">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.purchaseCost}
                      onChange={(e) => updateService(row.key, { purchaseCost: e.target.value })}
                      placeholder="0.00"
                    />
                  </Field>

                  <Field label="🔧 Service Cost" hint="Amount in ₹">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={row.serviceCost}
                      onChange={(e) => updateService(row.key, { serviceCost: e.target.value })}
                      placeholder="0.00"
                    />
                  </Field>

                  <Field label="🧾 Invoice Number">
                    <Input
                      value={row.invoiceNumber}
                      onChange={(e) => updateService(row.key, { invoiceNumber: e.target.value })}
                      placeholder="e.g. SRV-8891"
                    />
                  </Field>

                  <Field label="🏬 Vendor / Supplier">
                    <Input
                      value={row.vendor}
                      onChange={(e) => updateService(row.key, { vendor: e.target.value })}
                      placeholder="e.g. Dell Service Centre"
                    />
                  </Field>

                  <Field label="🛡️ Warranty Period" hint="e.g. 6 months, 1 year">
                    <Input
                      value={row.warrantyPeriod}
                      onChange={(e) => updateService(row.key, { warrantyPeriod: e.target.value })}
                      placeholder="e.g. 6 months"
                    />
                  </Field>

                  <div className="sm:col-span-2 lg:col-span-3">
                    <FileInput
                      label="📷 Photo"
                      variant="image"
                      accept="image/*"
                      file={row.file}
                      onFileChange={(file) => updateService(row.key, { file })}
                      existing={row.photo}
                      removed={row.removePhoto}
                      onRemovedChange={(removed) =>
                        updateService(row.key, { removePhoto: removed })
                      }
                      hint="Photo of the service or its invoice"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-brand-50 px-4 py-2.5">
              <span className="text-xs font-medium text-brand-800">
                {services.length} {services.length === 1 ? "entry" : "entries"}
              </span>
              <span className="text-sm font-semibold text-brand-800">
                Total service cost: {money(serviceTotal)}
              </span>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ---------------- Depreciation ---------------- */}
      <SectionCard
        title="Depreciation"
        icon={<TrendingDown size={16} />}
        description="Book value is recalculated from the purchase date"
      >
        <div className={grid}>
          <Field label="📉 Method">
            <Select
              value={form.depMethod}
              onChange={(e) => set("depMethod", e.target.value as DepreciationMethod)}
            >
              {DEPRECIATION_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m === "SLM"
                    ? "SLM — Straight Line"
                    : m === "WDV"
                      ? "WDV — Written Down Value"
                      : "None — do not depreciate"}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Rate (% per year)"
            error={errors.depRate}
            hint={form.depMethod === "SLM" ? "Leave blank to use useful life" : undefined}
          >
            <Input
              type="number"
              min={0}
              max={100}
              step="0.01"
              invalid={!!errors.depRate}
              disabled={form.depMethod === "None"}
              value={form.depRate}
              onChange={(e) => set("depRate", e.target.value)}
              placeholder="e.g. 15"
            />
          </Field>

          <Field label="Useful Life (years)">
            <Input
              type="number"
              min={0}
              step="0.5"
              disabled={form.depMethod !== "SLM"}
              value={form.depLife}
              onChange={(e) => set("depLife", e.target.value)}
              placeholder="e.g. 5"
            />
          </Field>

          <Field label="Salvage / Residual Value" hint="Floor the book value stops at">
            <Input
              type="number"
              min={0}
              step="0.01"
              disabled={form.depMethod === "None"}
              value={form.depSalvage}
              onChange={(e) => set("depSalvage", e.target.value)}
              placeholder="0.00"
            />
          </Field>

          <div className="sm:col-span-2 lg:col-span-2">
            <Card className="h-full bg-zinc-50 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Live preview
              </p>
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["Age", `${book.yearsElapsed.toFixed(2)} yrs`],
                  ["Per year", money(book.annualDepreciation)],
                  ["Accumulated", money(book.accumulatedDepreciation)],
                  ["Book value", money(book.currentValue)],
                ].map(([label, value], i) => (
                  <div key={label}>
                    <dt className="text-[11px] text-zinc-500">{label}</dt>
                    <dd
                      className={
                        i === 3
                          ? "text-sm font-bold text-brand-700"
                          : "text-sm font-semibold text-zinc-800"
                      }
                    >
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Assignment ---------------- */}
      <SectionCard
        title="Assignment & Location"
        icon={<Building2 size={16} />}
        description="Changing custody automatically logs a transfer"
      >
        <div className={grid}>
          <Field label="👤 Assigned Employee">
            <Input
              list="employee-options"
              value={form.employeeName}
              onChange={(e) => set("employeeName", e.target.value)}
              placeholder="e.g. Kiran Kumar"
            />
            <datalist id="employee-options">
              {(options?.employees ?? []).map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>

          <Field label="Employee ID">
            <Input
              value={form.employeeId}
              onChange={(e) => set("employeeId", e.target.value)}
              placeholder="e.g. EMP-1042"
              className="font-mono"
            />
          </Field>

          <Field label="Employee Email" error={errors.employeeEmail}>
            <Input
              type="email"
              invalid={!!errors.employeeEmail}
              value={form.employeeEmail}
              onChange={(e) => set("employeeEmail", e.target.value)}
              placeholder="name@company.com"
            />
          </Field>

          <Field label="🏢 Department">
            <Input
              list="department-options"
              value={form.department}
              onChange={(e) => set("department", e.target.value)}
              placeholder="e.g. Accounts"
            />
            <datalist id="department-options">
              {departmentOptions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
          </Field>

          <Field label="📍 Location">
            <Input
              list="location-options"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Head Office"
            />
            <datalist id="location-options">
              {locationOptions.map((l) => (
                <option key={l} value={l} />
              ))}
            </datalist>
          </Field>
        </div>
      </SectionCard>

      {/* ---------------- Warranty ---------------- */}
      <SectionCard
        title="Warranty"
        icon={<ShieldCheck size={16} />}
        description="AMC or manufacturer warranty and its paperwork"
      >
        <div className={grid}>
          <Field label="Provider">
            <Input
              value={form.warrantyProvider}
              onChange={(e) => set("warrantyProvider", e.target.value)}
              placeholder="e.g. Dell ProSupport"
            />
          </Field>

          <Field label="Expiry Date" error={errors.warrantyExpiry}>
            <DateField
              invalid={!!errors.warrantyExpiry}
              value={form.warrantyExpiry}
              onChange={(iso) => set("warrantyExpiry", iso)}
            />
          </Field>

          <div className="sm:col-span-2 lg:col-span-1">
            <FileInput
              label="📄 Warranty Document"
              variant="document"
              file={warrantyDoc}
              onFileChange={setWarrantyDoc}
              existing={asset?.warranty?.document}
              removed={removeWarrantyDoc}
              onRemovedChange={setRemoveWarrantyDoc}
              hint="PDF or image, max 10 MB"
            />
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Physical verification ---------------- */}
      <SectionCard
        title="Physical Verification"
        icon={<ClipboardCheck size={16} />}
        description="Audit trail for the last physical check"
      >
        <div className={grid}>
          <div className="flex items-end pb-2 sm:col-span-2 lg:col-span-3">
            <Checkbox
              label="✅ Physically verified"
              checked={form.verified}
              onChange={(e) => {
                const checked = e.target.checked;
                setForm((f) => ({
                  ...f,
                  verified: checked,
                  // Default the date to today the first time it is ticked.
                  verifiedOn: checked && !f.verifiedOn ? dateInput(new Date()) : f.verifiedOn,
                }));
              }}
            />
          </div>

          <Field label="Verified On">
            <DateField
              disabled={!form.verified}
              value={form.verifiedOn}
              onChange={(iso) => set("verifiedOn", iso)}
            />
          </Field>

          <Field label="Verified By">
            <Input
              disabled={!form.verified}
              value={form.verifiedBy}
              onChange={(e) => set("verifiedBy", e.target.value)}
              placeholder="Auditor name"
            />
          </Field>

          <Field label="Remarks">
            <Input
              disabled={!form.verified}
              value={form.verificationRemarks}
              onChange={(e) => set("verificationRemarks", e.target.value)}
              placeholder="Condition, observations…"
            />
          </Field>

          <div className="sm:col-span-2 lg:col-span-2">
            <FileInput
              label="📸 Verification Photo"
              variant="image"
              accept="image/*"
              file={verificationPhoto}
              onFileChange={setVerificationPhoto}
              existing={asset?.physicalVerification?.photo}
              removed={removeVerificationPhoto}
              onRemovedChange={setRemoveVerificationPhoto}
              hint="Photo taken during the audit"
            />
          </div>
        </div>
      </SectionCard>

      {/* ---------------- Transfer history ---------------- */}
      <HistorySection
        isEdit={isEdit}
        assetId={asset?._id}
        title="🔄 Transfer History"
        icon={<ArrowLeftRight size={16} />}
        savedCount={asset?.transferHistory?.length ?? 0}
        drafts={draftTransfers}
        onAddDraft={(row) => setDraftTransfers((rows) => [...rows, row])}
        onRemoveDraft={(i) => setDraftTransfers((rows) => rows.filter((_, idx) => idx !== i))}
      />

      {/* ---------------- Notes ---------------- */}
      <SectionCard title="Notes" icon={<FileText size={16} />}>
        <Textarea
          rows={3}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          placeholder="Anything else worth recording about this asset…"
        />
      </SectionCard>

      {/* ---------------- Sticky action bar ---------------- */}
      {/* Sticky rather than fixed, so it tracks the content column whatever
          width the sidebar is currently at. */}
      <div className="sticky bottom-0 z-30 rounded-t-xl border border-zinc-200 bg-white/95 px-5 py-3 shadow-[0_-2px_8px_rgba(16,24,40,0.06)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="hidden text-xs text-zinc-500 sm:block">
            {isEdit ? (
              <>
                Editing <span className="font-mono font-semibold">{asset!.assetCode}</span> ·
                last updated {shortDate(asset!.updatedAt)}
              </>
            ) : (
              "The FA code must be unique across the register."
            )}
          </p>
          <div className="ml-auto flex items-center gap-2">
            <Link
              href={isEdit ? `/assets/${encodeURIComponent(asset!._id)}` : "/assets"}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <X size={15} />
              Cancel
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner /> : <Save size={15} />}
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Asset"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Transfer draft rows                                                 */
/* ------------------------------------------------------------------ */

function HistorySection({
  isEdit,
  assetId,
  title,
  icon,
  savedCount,
  drafts,
  onAddDraft,
  onRemoveDraft,
}: {
  isEdit: boolean;
  assetId?: string;
  title: string;
  icon: React.ReactNode;
  savedCount: number;
  drafts: DraftTransfer[];
  onAddDraft: (row: DraftTransfer) => void;
  onRemoveDraft: (index: number) => void;
}) {
  const [row, setRow] = useState<Record<string, string>>({});
  const update = (k: string, v: string) => setRow((r) => ({ ...r, [k]: v }));

  function add() {
    if (!row.toEmployee?.trim() && !row.toDepartment?.trim() && !row.toLocation?.trim()) return;
    onAddDraft({
      date: row.date || new Date().toISOString().slice(0, 10),
      toEmployee: (row.toEmployee ?? "").trim(),
      toDepartment: (row.toDepartment ?? "").trim(),
      toLocation: (row.toLocation ?? "").trim(),
      remarks: (row.remarks ?? "").trim(),
    });
    setRow({});
  }

  // On an existing asset this log is append-only and lives on the detail page.
  if (isEdit) {
    return (
      <SectionCard title={title} icon={icon}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-zinc-600">
            <Info size={15} className="text-zinc-400" />
            {savedCount === 0
              ? "No entries recorded yet."
              : `${savedCount} ${savedCount === 1 ? "entry" : "entries"} recorded.`}
          </p>
          <Link
            href={`/assets/${encodeURIComponent(assetId ?? "")}`}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Manage on the asset page
          </Link>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title={title}
      icon={icon}
      description="Optional — rows added here are saved with the asset"
    >
      <div className="flex flex-col gap-3">
        {drafts.length > 0 && (
          <ul className="divide-y divide-zinc-200 rounded-lg border border-zinc-200">
            {drafts.map((d, i) => (
              <li key={i} className="flex items-center gap-3 px-3 py-2 text-sm">
                <CalendarDays size={14} className="shrink-0 text-zinc-400" />
                <span className="w-24 shrink-0 text-xs text-zinc-500">{shortDate(d.date)}</span>
                <span className="min-w-0 flex-1 truncate text-zinc-700">
                  {[d.toEmployee, d.toDepartment, d.toLocation].filter(Boolean).join(" · ")}
                </span>
                <button
                  type="button"
                  onClick={() => onRemoveDraft(i)}
                  aria-label="Remove row"
                  className="shrink-0 rounded p-1 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field label="Date">
            <DateField value={row.date ?? ""} onChange={(iso) => update("date", iso)} />
          </Field>
          <Field label="To Employee">
            <Input
              value={row.toEmployee ?? ""}
              onChange={(e) => update("toEmployee", e.target.value)}
            />
          </Field>
          <Field label="To Department">
            <Input
              value={row.toDepartment ?? ""}
              onChange={(e) => update("toDepartment", e.target.value)}
            />
          </Field>
          <Field label="To Location">
            <Input
              value={row.toLocation ?? ""}
              onChange={(e) => update("toLocation", e.target.value)}
            />
          </Field>
          <Field label="Remarks">
            <Input value={row.remarks ?? ""} onChange={(e) => update("remarks", e.target.value)} />
          </Field>
        </div>

        <div>
          <Button type="button" variant="secondary" onClick={add}>
            Add entry
          </Button>
        </div>
      </div>
    </SectionCard>
  );
}
