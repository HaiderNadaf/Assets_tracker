"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  ArrowLeftRight,
  BadgeIndianRupee,
  Boxes,
  Building2,
  Calendar,
  ClipboardCheck,
  Download,
  Eye,
  FileText,
  Mail,
  MapPin,
  Pencil,
  Plus,
  Landmark,
  ShieldCheck,
  Trash2,
  TrendingDown,
  TriangleAlert,
  Wrench,
} from "lucide-react";

import Modal from "./Modal";
import DateField from "./DateField";
import FilePreviewModal, { isImage, type Preview } from "./FilePreview";
import {
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  SectionCard,
  Spinner,
  Textarea,
} from "./ui";
import {
  ENTITY_STYLES,
  STATUS_STYLES,
  WARRANTY_STYLES,
  dateTime,
  fileSize,
  initials,
  money,
  shortDate,
} from "@/lib/format";
import {
  addServiceRecord as addServiceRecordApi,
  addTransfer as addTransferApi,
  apiError,
  deleteAsset as deleteAssetApi,
  downloadFile,
  fetchAsset,
  invoiceUrl,
  verifyAsset as verifyAssetApi,
} from "@/lib/api";
import type { Asset, StoredFile } from "@/lib/types";

export default function AssetDetail({ id }: { id: string }) {
  const router = useRouter();

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTransfer, setShowTransfer] = useState(false);
  const [showService, setShowService] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchAsset(id)
      .then((data) => {
        if (cancelled) return;
        setAsset(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(apiError(err, "Could not load this asset"));
        setAsset(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onDownloadPdf() {
    if (!asset || downloading) return;
    setDownloading(true);
    const toastId = toast.loading("Preparing PDF…");
    try {
      await downloadFile(invoiceUrl(asset._id), `${asset.assetCode || "asset"}-invoice.pdf`);
      toast.success("PDF downloaded", { id: toastId });
    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setDownloading(false);
    }
  }

  async function onDelete() {
    if (!asset) return;
    setBusy(true);
    try {
      await deleteAssetApi(asset._id);
      toast.success(`${asset.assetCode} deleted`);
      router.push("/assets");
      router.refresh();
    } catch (err) {
      toast.error(apiError(err, "Could not delete the asset"));
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-3 p-16 text-zinc-500">
        <Spinner className="h-5 w-5" />
        Loading asset…
      </Card>
    );
  }

  if (error || !asset) {
    return (
      <Card>
        <EmptyState
          icon={<TriangleAlert size={40} />}
          title="Asset not available"
          description={error ?? "This record may have been deleted."}
          action={
            <Link
              href="/assets"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Back to assets
            </Link>
          }
        />
      </Card>
    );
  }

  const book = asset.book;
  const serviceTotal = (asset.serviceRecords ?? []).reduce(
    (sum, r) => sum + (r.serviceCost || 0),
    0
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      {/* ---------------- Header ---------------- */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50">
            {asset.photo?.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={asset.photo.url} alt={asset.product} className="h-full w-full object-cover" />
            ) : (
              <Boxes size={30} className="text-zinc-300" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-brand-100 px-2 py-0.5 font-mono text-sm font-bold text-brand-800">
                {asset.assetCode}
              </span>
              {asset.entity && (
                <Badge className={ENTITY_STYLES[asset.entity]}>{asset.entity}</Badge>
              )}
              <Badge className={STATUS_STYLES[asset.status]}>{asset.status}</Badge>
              <Badge className={WARRANTY_STYLES[asset.warrantyStatus ?? "Unknown"]}>
                {asset.warrantyStatus ?? "Warranty unknown"}
              </Badge>
              <Badge
                className={
                  asset.physicalVerification.verified
                    ? "bg-brand-100 text-brand-800 ring-brand-200"
                    : "bg-amber-100 text-amber-800 ring-amber-200"
                }
              >
                {asset.physicalVerification.verified ? "Verified" : "Not verified"}
              </Badge>
            </div>

            <h2 className="mt-2 truncate text-xl font-bold text-zinc-900">{asset.product}</h2>
            <p className="text-sm text-zinc-500">
              {[asset.brand, asset.category, asset.productNumber]
                .filter(Boolean)
                .join(" · ") || "—"}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              Added {shortDate(asset.createdAt)} · updated {shortDate(asset.updatedAt)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href="/assets"
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <ArrowLeft size={15} />
              Back
            </Link>
            <button
              type="button"
              onClick={() => void onDownloadPdf()}
              disabled={downloading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
              title="Download this asset as a one-page PDF record"
            >
              {downloading ? <Spinner /> : <Download size={15} />}
              {downloading ? "Preparing…" : "Download PDF"}
            </button>
            <Link
              href={`/assets/${encodeURIComponent(asset._id)}/edit`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Pencil size={15} />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setShowDelete(true)}
              aria-label="Delete asset"
              className="rounded-lg border border-zinc-300 bg-white p-2 text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Money strip */}
        <div className="grid grid-cols-2 divide-x divide-zinc-200 border-t border-zinc-200 bg-zinc-50 lg:grid-cols-4">
          {[
            { label: "Purchase cost", value: money(asset.purchaseCost), icon: BadgeIndianRupee },
            {
              label: "Accumulated depreciation",
              value: money(book?.accumulatedDepreciation ?? 0),
              icon: TrendingDown,
            },
            {
              label: "Current book value",
              value: money(book?.currentValue ?? asset.purchaseCost),
              icon: BadgeIndianRupee,
              accent: true,
            },
            { label: "Service spend", value: money(serviceTotal), icon: Wrench },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="flex items-center gap-3 px-5 py-3.5">
              <Icon size={17} className={accent ? "text-brand-600" : "text-zinc-400"} />
              <div className="min-w-0">
                <p className="truncate text-[11px] uppercase tracking-wide text-zinc-500">
                  {label}
                </p>
                <p
                  className={
                    accent
                      ? "text-base font-bold text-brand-700"
                      : "text-base font-semibold text-zinc-800"
                  }
                >
                  {value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ---------------- Left column ---------------- */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <SectionCard title="Purchase & Vendor" icon={<Calendar size={16} />}>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-3">
              <Fact label="Purchase date" value={shortDate(asset.purchaseDate)} />
              <Fact label="Payment date" value={shortDate(asset.paymentDate)} />
              <Fact label="Invoice number" value={asset.invoiceNumber || "—"} mono />
              <Fact label="Vendor" value={asset.vendor || "—"} />
              <Fact label="Product number" value={asset.productNumber || "—"} mono />
              <Fact label="Category" value={asset.category || "—"} />
              <Fact label="Brand" value={asset.brand || "—"} />
            </dl>
          </SectionCard>

          <SectionCard title="Depreciation" icon={<TrendingDown size={16} />}>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
              <Fact label="Method" value={asset.depreciation.method} />
              <Fact
                label="Rate"
                value={asset.depreciation.ratePercent ? `${asset.depreciation.ratePercent}%` : "—"}
              />
              <Fact
                label="Useful life"
                value={
                  asset.depreciation.usefulLifeYears
                    ? `${asset.depreciation.usefulLifeYears} yrs`
                    : "—"
                }
              />
              <Fact label="Salvage value" value={money(asset.depreciation.salvageValue)} />
              <Fact label="Age" value={`${(book?.yearsElapsed ?? 0).toFixed(2)} yrs`} />
              <Fact label="Per year" value={money(book?.annualDepreciation ?? 0)} />
              <Fact label="Accumulated" value={money(book?.accumulatedDepreciation ?? 0)} />
              <Fact
                label="Book value"
                value={money(book?.currentValue ?? asset.purchaseCost)}
                accent
              />
            </dl>
          </SectionCard>

          {/* Maintenance & service details */}
          <SectionCard
            title="🔧 Maintenance & Service Details"
            icon={<Wrench size={16} />}
            description={
              asset.serviceRecords?.length
                ? `${asset.serviceRecords.length} entries · ${money(serviceTotal)} service cost`
                : undefined
            }
            action={
              <Button variant="secondary" onClick={() => setShowService(true)}>
                <Plus size={15} />
                Add entry
              </Button>
            }
          >
            {!asset.serviceRecords?.length ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                No service entries recorded.
              </p>
            ) : (
              <div className="thin-scroll -mx-1 overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                      <th className="py-2 pr-3 font-medium">Photo</th>
                      <th className="py-2 pr-3 font-medium">Description</th>
                      <th className="py-2 pr-3 font-medium">Purchased</th>
                      <th className="py-2 pr-3 font-medium">Serviced</th>
                      <th className="py-2 pr-3 font-medium">Paid</th>
                      <th className="py-2 pr-3 text-right font-medium">Purchase</th>
                      <th className="py-2 pr-3 text-right font-medium">Service</th>
                      <th className="py-2 pr-3 font-medium">Invoice</th>
                      <th className="py-2 pr-3 font-medium">Vendor</th>
                      <th className="py-2 font-medium">Warranty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {asset.serviceRecords.map((r, i) => (
                      <tr key={r._id ?? i} className="hover:bg-brand-50/40">
                        <td className="py-2.5 pr-3">
                          {r.photo?.url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setPreview({ label: `🔧 Service #${i + 1} photo`, file: r.photo! })
                              }
                              aria-label={`Preview service ${i + 1} photo`}
                              className="block h-9 w-9 overflow-hidden rounded border border-zinc-200 hover:border-brand-400"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={r.photo.url} alt="" className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <span className="text-zinc-300">—</span>
                          )}
                        </td>
                        <td className="min-w-[160px] py-2.5 pr-3 text-zinc-700">
                          {r.description || "—"}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-600">
                          {shortDate(r.purchaseDate)}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-600">
                          {shortDate(r.serviceDate)}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-zinc-600">
                          {shortDate(r.paymentDate)}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-right text-zinc-700">
                          {r.purchaseCost ? money(r.purchaseCost) : "—"}
                        </td>
                        <td className="whitespace-nowrap py-2.5 pr-3 text-right font-medium text-zinc-800">
                          {r.serviceCost ? money(r.serviceCost) : "—"}
                        </td>
                        <td className="py-2.5 pr-3 font-mono text-xs text-zinc-600">
                          {r.invoiceNumber || "—"}
                        </td>
                        <td className="py-2.5 pr-3 text-zinc-600">{r.vendor || "—"}</td>
                        <td className="py-2.5 text-zinc-600">{r.warrantyPeriod || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          {/* Transfer history */}
          <SectionCard
            title="🔄 Transfer History"
            icon={<ArrowLeftRight size={16} />}
            description={
              asset.transferHistory.length
                ? `${asset.transferHistory.length} movements`
                : undefined
            }
            action={
              <Button variant="secondary" onClick={() => setShowTransfer(true)}>
                <Plus size={15} />
                Record transfer
              </Button>
            }
          >
            {asset.transferHistory.length === 0 ? (
              <p className="py-4 text-center text-sm text-zinc-500">
                This asset has never been transferred.
              </p>
            ) : (
              <ol className="relative ml-2 border-l border-zinc-200 pl-5">
                {[...asset.transferHistory]
                  .sort((a, b) => +new Date(b.date) - +new Date(a.date))
                  .map((t, i) => (
                    <li key={t._id ?? i} className="relative pb-5 last:pb-0">
                      <span className="absolute -left-[26px] top-1 flex h-3 w-3 items-center justify-center rounded-full border-2 border-white bg-brand-500" />
                      <p className="text-xs text-zinc-500">{dateTime(t.date)}</p>
                      <p className="mt-0.5 text-sm text-zinc-800">
                        <span className="text-zinc-500">{t.fromEmployee || "Unassigned"}</span>
                        {" → "}
                        <span className="font-medium">{t.toEmployee || "Unassigned"}</span>
                      </p>
                      <p className="text-xs text-zinc-500">
                        {[
                          t.fromDepartment || t.toDepartment
                            ? `${t.fromDepartment || "—"} → ${t.toDepartment || "—"}`
                            : null,
                          t.fromLocation || t.toLocation
                            ? `${t.fromLocation || "—"} → ${t.toLocation || "—"}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join("  ·  ")}
                      </p>
                      {t.remarks && (
                        <p className="mt-1 text-xs italic text-zinc-500">{t.remarks}</p>
                      )}
                    </li>
                  ))}
              </ol>
            )}
          </SectionCard>

          {asset.notes && (
            <SectionCard title="Notes" icon={<FileText size={16} />}>
              <p className="whitespace-pre-wrap text-sm text-zinc-700">{asset.notes}</p>
            </SectionCard>
          )}
        </div>

        {/* ---------------- Right column ---------------- */}
        <div className="flex flex-col gap-4">
          <SectionCard title="Ownership" icon={<Landmark size={16} />}>
            <dl className="flex flex-col gap-3">
              <Fact label="FA code" value={asset.assetCode} mono />
              <div className="min-w-0">
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">Belongs to</dt>
                <dd className="mt-1">
                  {asset.entity ? (
                    <Badge className={ENTITY_STYLES[asset.entity]}>{asset.entity}</Badge>
                  ) : (
                    <span className="text-sm text-zinc-400">Not set</span>
                  )}
                </dd>
              </div>
            </dl>
          </SectionCard>

          <SectionCard title="Assignment" icon={<Building2 size={16} />}>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                  {initials(asset.assignedEmployee.name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-zinc-800">
                    {asset.assignedEmployee.name || "Unassigned"}
                  </p>
                  {asset.assignedEmployee.employeeId && (
                    <p className="truncate font-mono text-xs text-zinc-500">
                      {asset.assignedEmployee.employeeId}
                    </p>
                  )}
                </div>
              </div>

              {asset.assignedEmployee.email && (
                <p className="flex items-center gap-2 text-sm text-zinc-600">
                  <Mail size={14} className="shrink-0 text-zinc-400" />
                  <a
                    href={`mailto:${asset.assignedEmployee.email}`}
                    className="truncate hover:text-brand-700 hover:underline"
                  >
                    {asset.assignedEmployee.email}
                  </a>
                </p>
              )}
              <p className="flex items-center gap-2 text-sm text-zinc-600">
                <Building2 size={14} className="shrink-0 text-zinc-400" />
                {asset.department || "No department"}
              </p>
              <p className="flex items-center gap-2 text-sm text-zinc-600">
                <MapPin size={14} className="shrink-0 text-zinc-400" />
                {asset.location || "No location"}
              </p>
            </div>
          </SectionCard>

          <SectionCard title="Documents" icon={<FileText size={16} />}>
            <div className="flex flex-col gap-2">
              <DocLink
                label="🧾 Purchase invoice"
                file={asset.purchaseInvoice}
                onOpen={setPreview}
              />
              <DocLink
                label="📄 Warranty document"
                file={asset.warranty.document}
                onOpen={setPreview}
              />
              <DocLink label="📷 Asset photo" file={asset.photo} onOpen={setPreview} />
              <DocLink
                label="📸 Verification photo"
                file={asset.physicalVerification.photo}
                onOpen={setPreview}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Warranty"
            icon={<ShieldCheck size={16} />}
            action={
              <Badge className={WARRANTY_STYLES[asset.warrantyStatus ?? "Unknown"]}>
                {asset.warrantyStatus ?? "Unknown"}
              </Badge>
            }
          >
            <dl className="flex flex-col gap-3">
              <Fact label="Provider" value={asset.warranty.provider || "—"} />
              <Fact label="Expires" value={shortDate(asset.warranty.expiryDate)} />
            </dl>
          </SectionCard>

          <SectionCard
            title="✅ Physical Verification"
            icon={<ClipboardCheck size={16} />}
            action={
              <Button variant="secondary" onClick={() => setShowVerify(true)}>
                Record
              </Button>
            }
          >
            <dl className="flex flex-col gap-3">
              <Fact
                label="Status"
                value={asset.physicalVerification.verified ? "Verified" : "Not verified"}
                accent={asset.physicalVerification.verified}
              />
              <Fact label="Last verified" value={shortDate(asset.physicalVerification.verifiedOn)} />
              <Fact label="By" value={asset.physicalVerification.verifiedBy || "—"} />
              {asset.physicalVerification.remarks && (
                <Fact label="Remarks" value={asset.physicalVerification.remarks} />
              )}
            </dl>
            <div className="mt-3">
              <DocLink
                label="📸 Verification photo"
                file={asset.physicalVerification.photo}
                onOpen={setPreview}
              />
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ---------------- Modals ---------------- */}
      <ServiceModal
        open={showService}
        assetId={asset._id}
        onClose={() => setShowService(false)}
        onSaved={(next) => {
          setAsset(next);
          setShowService(false);
        }}
      />

      <TransferModal
        open={showTransfer}
        asset={asset}
        onClose={() => setShowTransfer(false)}
        onSaved={(next) => {
          setAsset(next);
          setShowTransfer(false);
        }}
      />

      <VerifyModal
        open={showVerify}
        asset={asset}
        onClose={() => setShowVerify(false)}
        onSaved={(next) => {
          setAsset(next);
          setShowVerify(false);
        }}
      />

      <FilePreviewModal preview={preview} onClose={() => setPreview(null)} />

      <Modal
        open={showDelete}
        title="Delete asset"
        onClose={() => setShowDelete(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowDelete(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void onDelete()} disabled={busy}>
              {busy ? <Spinner /> : <Trash2 size={15} />}
              {busy ? "Deleting…" : "Delete permanently"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          This permanently removes{" "}
          <span className="font-mono font-semibold text-zinc-900">{asset.assetCode}</span> and
          every file uploaded against it.
        </p>
        <p className="mt-2 text-sm font-medium text-rose-600">This cannot be undone.</p>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

function Fact({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd
        className={[
          "truncate text-sm",
          mono ? "font-mono" : "",
          accent ? "font-bold text-brand-700" : "font-medium text-zinc-800",
        ].join(" ")}
        title={value}
      >
        {value}
      </dd>
    </div>
  );
}

function DocLink({
  label,
  file,
  onOpen,
}: {
  label: string;
  file?: StoredFile | null;
  onOpen: (preview: Preview) => void;
}) {
  if (!file?.url) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-dashed border-zinc-200 px-3 py-2 text-sm text-zinc-400">
        <span>{label}</span>
        <span className="text-xs">Not uploaded</span>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => onOpen({ label, file })}
      className="flex w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm transition hover:border-brand-300 hover:bg-brand-50"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {isImage(file) ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={file.url}
            alt=""
            className="h-9 w-9 shrink-0 rounded border border-zinc-200 object-cover"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-zinc-200 bg-zinc-50 text-brand-600">
            <FileText size={16} />
          </span>
        )}
        <span className="min-w-0">
          <span className="block truncate text-zinc-700">{label}</span>
          <span className="block truncate text-xs text-zinc-400">
            {file.fileName || "View file"}
            {file.bytes ? ` · ${fileSize(file.bytes)}` : ""}
          </span>
        </span>
      </span>
      <Eye size={15} className="shrink-0 text-brand-600" />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Modals                                                              */
/* ------------------------------------------------------------------ */

function ServiceModal({
  open,
  assetId,
  onClose,
  onSaved,
}: {
  open: boolean;
  assetId: string;
  onClose: () => void;
  onSaved: (asset: Asset) => void;
}) {
  const empty = {
    description: "",
    purchaseDate: "",
    serviceDate: "",
    paymentDate: "",
    purchaseCost: "",
    serviceCost: "",
    invoiceNumber: "",
    vendor: "",
    warrantyPeriod: "",
  };

  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<typeof empty>) => setForm((f) => ({ ...f, ...patch }));

  async function save() {
    if (!form.description.trim() && !form.serviceDate && !form.serviceCost) {
      toast.error("Add a description, service date or cost");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([key, value]) => fd.append(key, String(value ?? "")));
      if (file) fd.append("photo", file);

      const next = await addServiceRecordApi(assetId, fd);
      toast.success("Service entry added");
      setForm(empty);
      setFile(null);
      onSaved(next);
    } catch (err) {
      toast.error(apiError(err, "Could not save the entry"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Add maintenance / service entry"
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : "Add entry"}
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="📝 Description" className="sm:col-span-3">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            placeholder="e.g. Screen replaced under AMC"
          />
        </Field>

        <Field label="📅 Purchase Date">
          <DateField value={form.purchaseDate} onChange={(iso) => set({ purchaseDate: iso })} />
        </Field>
        <Field label="🛠️ Service Date">
          <DateField value={form.serviceDate} onChange={(iso) => set({ serviceDate: iso })} />
        </Field>
        <Field label="💳 Payment Date">
          <DateField value={form.paymentDate} onChange={(iso) => set({ paymentDate: iso })} />
        </Field>

        <Field label="💰 Purchase Cost">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.purchaseCost}
            onChange={(e) => set({ purchaseCost: e.target.value })}
            placeholder="0.00"
          />
        </Field>
        <Field label="🔧 Service Cost">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={form.serviceCost}
            onChange={(e) => set({ serviceCost: e.target.value })}
            placeholder="0.00"
          />
        </Field>
        <Field label="🛡️ Warranty Period">
          <Input
            value={form.warrantyPeriod}
            onChange={(e) => set({ warrantyPeriod: e.target.value })}
            placeholder="e.g. 6 months"
          />
        </Field>

        <Field label="🧾 Invoice Number">
          <Input
            value={form.invoiceNumber}
            onChange={(e) => set({ invoiceNumber: e.target.value })}
            placeholder="e.g. SRV-8891"
          />
        </Field>
        <Field label="🏬 Vendor / Supplier" className="sm:col-span-2">
          <Input
            value={form.vendor}
            onChange={(e) => set({ vendor: e.target.value })}
            placeholder="e.g. Dell Service Centre"
          />
        </Field>

        <Field label="📷 Photo" hint="Optional" className="sm:col-span-3">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-brand-700"
          />
        </Field>
      </div>
    </Modal>
  );
}

function TransferModal({
  open,
  asset,
  onClose,
  onSaved,
}: {
  open: boolean;
  asset: Asset;
  onClose: () => void;
  onSaved: (asset: Asset) => void;
}) {
  const [form, setForm] = useState({
    date: "",
    toEmployee: "",
    toDepartment: "",
    toLocation: "",
    remarks: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.toEmployee.trim() && !form.toDepartment.trim() && !form.toLocation.trim()) {
      toast.error("Set at least one destination");
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("date", form.date || new Date().toISOString());
      fd.append("toEmployee", form.toEmployee.trim());
      fd.append("toDepartment", form.toDepartment.trim());
      fd.append("toLocation", form.toLocation.trim());
      fd.append("remarks", form.remarks.trim());

      const next = await addTransferApi(asset._id, fd);
      toast.success("Transfer recorded");
      setForm({ date: "", toEmployee: "", toDepartment: "", toLocation: "", remarks: "" });
      onSaved(next);
    } catch (err) {
      toast.error(apiError(err, "Could not record the transfer"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Record transfer"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : "Record transfer"}
          </Button>
        </>
      }
    >
      <div className="mb-3 rounded-lg bg-zinc-50 p-3 text-xs text-zinc-600">
        Currently with{" "}
        <span className="font-medium text-zinc-800">
          {asset.assignedEmployee.name || "nobody"}
        </span>
        {asset.department ? ` · ${asset.department}` : ""}
        {asset.location ? ` · ${asset.location}` : ""}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Date">
          <DateField
            value={form.date}
            onChange={(iso) => setForm({ ...form, date: iso })}
          />
        </Field>
        <Field label="To employee">
          <Input
            value={form.toEmployee}
            onChange={(e) => setForm({ ...form, toEmployee: e.target.value })}
            placeholder="New custodian"
          />
        </Field>
        <Field label="To department">
          <Input
            value={form.toDepartment}
            onChange={(e) => setForm({ ...form, toDepartment: e.target.value })}
          />
        </Field>
        <Field label="To location">
          <Input
            value={form.toLocation}
            onChange={(e) => setForm({ ...form, toLocation: e.target.value })}
          />
        </Field>
        <Field label="Remarks" className="sm:col-span-2">
          <Input
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            placeholder="Reason for the move"
          />
        </Field>
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        The asset&apos;s current assignment fields are updated to match this transfer.
      </p>
    </Modal>
  );
}

function VerifyModal({
  open,
  asset,
  onClose,
  onSaved,
}: {
  open: boolean;
  asset: Asset;
  onClose: () => void;
  onSaved: (asset: Asset) => void;
}) {
  const [verified, setVerified] = useState(true);
  const [verifiedBy, setVerifiedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("verified", String(verified));
      fd.append("verifiedOn", new Date().toISOString());
      fd.append("verifiedBy", verifiedBy.trim());
      fd.append("remarks", remarks.trim());
      if (file) fd.append("verificationPhoto", file);

      const next = await verifyAssetApi(asset._id, fd);
      toast.success("Verification recorded");
      setFile(null);
      onSaved(next);
    } catch (err) {
      toast.error(apiError(err, "Could not record the verification"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Record physical verification"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving && <Spinner />}
            {saving ? "Saving…" : "Save verification"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <Checkbox
          label="Asset was physically sighted and matches this record"
          checked={verified}
          onChange={(e) => setVerified(e.target.checked)}
        />
        <Field label="Verified by">
          <Input
            value={verifiedBy}
            onChange={(e) => setVerifiedBy(e.target.value)}
            placeholder="Auditor name"
          />
        </Field>
        <Field label="Remarks">
          <Textarea
            rows={2}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Condition, discrepancies…"
          />
        </Field>
        <Field label="📸 Verification photo" hint="Optional — replaces any existing photo">
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-xs file:font-medium file:text-brand-700"
          />
        </Field>
      </div>
    </Modal>
  );
}
