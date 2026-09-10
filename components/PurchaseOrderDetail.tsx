"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ClipboardList,
  FileText,
  Landmark,
  Paperclip,
  Pencil,
  ScrollText,
  Trash2,
  TriangleAlert,
  Truck,
} from "lucide-react";

import Modal from "./Modal";
import FilePreviewModal, { type Preview } from "./FilePreview";
import { Badge, Button, Card, EmptyState, SectionCard, Select, Spinner } from "./ui";
import { ENTITY_STYLES, PO_STATUS_STYLES, fileSize, money, shortDate } from "@/lib/format";
import {
  apiError,
  deletePurchaseOrder as deleteApi,
  downloadFile,
  fetchPurchaseOrder,
  poPdfUrl,
  setPurchaseOrderStatus,
} from "@/lib/api";
import { PO_STATUSES, type PoStatus, type PurchaseOrder } from "@/lib/types";

export default function PurchaseOrderDetail({ id }: { id: string }) {
  const router = useRouter();

  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [preview, setPreview] = useState<Preview | null>(null);
  const [printing, setPrinting] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchPurchaseOrder(id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err, "Could not load this purchase order"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onDownloadPdf() {
    if (!order || printing) return;
    setPrinting(true);
    const toastId = toast.loading("Building PDF…");
    try {
      await downloadFile(poPdfUrl(order._id), `PO-${order.poNumber}.pdf`);
      toast.success("PDF downloaded", { id: toastId });
    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setPrinting(false);
    }
  }

  async function onStatusChange(status: PoStatus) {
    if (!order) return;
    setSavingStatus(true);
    try {
      setOrder(await setPurchaseOrderStatus(order._id, status));
      toast.success(`Marked ${status}`);
    } catch (err) {
      toast.error(apiError(err, "Could not update the status"));
    } finally {
      setSavingStatus(false);
    }
  }

  async function onDelete() {
    if (!order) return;
    setDeleting(true);
    try {
      await deleteApi(order._id);
      toast.success(`PO ${order.poNumber} deleted`);
      router.push("/purchase-orders");
      router.refresh();
    } catch (err) {
      toast.error(apiError(err, "Could not delete the purchase order"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-3 p-16 text-zinc-500">
        <Spinner className="h-5 w-5" />
        Loading purchase order…
      </Card>
    );
  }

  if (error || !order) {
    return (
      <Card>
        <EmptyState
          icon={<TriangleAlert size={40} />}
          title="Purchase order not available"
          description={error ?? "This record may have been deleted."}
          action={
            <Link
              href="/purchase-orders"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Back to purchase orders
            </Link>
          }
        />
      </Card>
    );
  }

  const t = order.totals;
  const gstLabel =
    order.gstMode === "CGST+SGST"
      ? `CGST + SGST @ ${order.gstPercent}%`
      : order.gstMode === "IGST"
        ? `IGST @ ${order.gstPercent}%`
        : `GST @ ${order.gstPercent}%`;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-4">
      {/* ---------------- Header ---------------- */}
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Link
              href="/purchase-orders"
              aria-label="Back to purchase orders"
              className="mt-0.5 rounded-lg border border-zinc-300 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-mono text-lg font-bold text-zinc-900">
                  {order.poNumber}
                </h2>
                <Badge className={ENTITY_STYLES[order.entity]}>{order.entity}</Badge>
                <Badge className={PO_STATUS_STYLES[order.status]}>{order.status}</Badge>
              </div>
              <p className="mt-0.5 text-sm text-zinc-500">
                {order.supplier.name || "No supplier"} · {shortDate(order.poDate)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm text-zinc-600">
              Status:
              <Select
                value={order.status}
                disabled={savingStatus}
                onChange={(e) => void onStatusChange(e.target.value as PoStatus)}
                className="w-auto py-1.5"
              >
                {PO_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </label>

            <Button variant="secondary" onClick={() => void onDownloadPdf()} disabled={printing}>
              {printing ? <Spinner /> : <FileText size={15} />}
              {printing ? "Building…" : "Download PDF"}
            </Button>

            <Link
              href={`/purchase-orders/${encodeURIComponent(order._id)}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Pencil size={15} />
              Edit
            </Link>

            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete purchase order"
              title="Delete"
              className="rounded-lg border border-zinc-300 bg-white p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Order value" value={money(t.grandTotal)} accent />
          <Tile label="Taxable" value={money(t.taxableAmount)} />
          <Tile label={gstLabel} value={money(t.gstAmount)} />
          <Tile label="Lines" value={String(t.itemCount)} />
        </div>
      </Card>

      {/* ---------------- References ---------------- */}
      <SectionCard
        title="Order details"
        icon={<ClipboardList size={16} />}
        description="What this order cites and who raised it"
      >
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <Pair label="PO date" value={shortDate(order.poDate)} icon={<CalendarDays size={13} />} />
          <Pair
            label="Expected delivery"
            value={shortDate(order.expectedDate)}
            icon={<Truck size={13} />}
          />
          <Pair label="Supplier's ref." value={order.supplierRef} />
          <Pair label="Other reference(s)" value={order.otherReference} />
          <Pair label="Department" value={order.department} />
          <Pair label="Requested by" value={order.requestedBy} />
          <Pair label="Approved by" value={order.approvedBy} />
          <Pair label="Created" value={shortDate(order.createdAt)} />
          <Pair label="Last updated" value={shortDate(order.updatedAt)} />
        </dl>
      </SectionCard>

      {/* ---------------- Parties ---------------- */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <PartyCard
          title="Buyer"
          icon={<Landmark size={16} />}
          name={order.buyer.name}
          address={order.buyer.address}
          gstNumber={order.buyer.gstNumber}
        />
        <PartyCard
          title="Supplier"
          icon={<Building2 size={16} />}
          name={order.supplier.name}
          address={order.supplier.address}
          gstNumber={order.supplier.gstNumber}
          extra={[
            order.supplier.contactPerson,
            order.supplier.phone,
            order.supplier.email,
          ].filter(Boolean)}
        />
        <PartyCard
          title="Place of delivery"
          icon={<Truck size={16} />}
          name={order.deliverTo.name}
          address={order.deliverTo.address}
          gstNumber={order.deliverTo.gstNumber}
        />
      </div>

      {/* ---------------- Items ---------------- */}
      <SectionCard title="Items" icon={<ClipboardList size={16} />}>
        <div className="thin-scroll -mx-2 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-left">
                <th className="px-3 py-2 text-xs font-semibold text-zinc-600">S.No</th>
                <th className="px-3 py-2 text-xs font-semibold text-zinc-600">
                  Product Name and Description
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-600">
                  Qty
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-600">
                  Price
                </th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-zinc-600">
                  Unit
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-600">
                  Total Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {order.items.map((item) => {
                const heading = item.kind === "heading";
                return (
                  <tr key={item._id ?? item.label} className={heading ? "bg-brand-50/50" : ""}>
                    <td className="px-3 py-2 font-mono text-xs text-zinc-500">
                      {item.label}
                    </td>
                    <td className="px-3 py-2">
                      <div style={item.kind === "sub" ? { paddingLeft: 14 } : undefined}>
                        <p
                          className={
                            heading
                              ? "font-semibold text-brand-800 underline underline-offset-2"
                              : "font-medium text-zinc-800"
                          }
                        >
                          {item.name || "—"}
                        </p>
                        {item.description && (
                          <p className="text-xs text-zinc-500">{item.description}</p>
                        )}
                        {item.hsnCode && (
                          <p className="font-mono text-[11px] text-zinc-400">
                            HSN {item.hsnCode}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-zinc-600">
                      {heading ? "" : item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right text-zinc-600">
                      {heading ? "" : money(item.price)}
                    </td>
                    <td className="px-3 py-2 text-center text-zinc-600">
                      {heading ? "" : item.unit}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-zinc-800">
                      {heading ? "" : money(item.amount)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <dl className="w-full max-w-sm rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
            <TotalRow label="Total" value={money(t.subTotal)} />
            {t.discount > 0 && (
              <TotalRow label="Less discount" value={`- ${money(t.discount)}`} />
            )}
            <TotalRow label="Total amount" value={money(t.taxableAmount)} />
            {order.gstMode === "CGST+SGST" ? (
              <>
                <TotalRow label={`CGST @ ${order.gstPercent / 2}%`} value={money(t.cgstAmount)} />
                <TotalRow label={`SGST @ ${order.gstPercent / 2}%`} value={money(t.sgstAmount)} />
              </>
            ) : (
              <TotalRow label={gstLabel} value={money(t.gstAmount)} />
            )}
            <div className="mt-2 flex items-center justify-between border-t border-zinc-300 pt-2">
              <dt className="font-semibold text-zinc-800">Sub total in rupees</dt>
              <dd className="text-base font-bold text-brand-700">{money(t.grandTotal)}</dd>
            </div>
          </dl>
        </div>
      </SectionCard>

      {/* ---------------- Terms + attachments ---------------- */}
      {(order.terms.length > 0 || order.notes || order.attachments.length > 0) && (
        <SectionCard title="Terms & attachments" icon={<ScrollText size={16} />}>
          {order.terms.length > 0 && (
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-zinc-700">
              {order.terms.map((term, i) => (
                <li key={i}>{term}</li>
              ))}
            </ol>
          )}

          {order.notes && (
            <p className="mt-4 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
              {order.notes}
            </p>
          )}

          {order.attachments.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {order.attachments.map((file) => (
                <button
                  key={file.publicId}
                  type="button"
                  onClick={() =>
                    setPreview({ label: `${order.poNumber} — ${file.fileName}`, file })
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 hover:border-brand-300 hover:bg-brand-50"
                >
                  <Paperclip size={14} className="text-zinc-400" />
                  <span className="max-w-[200px] truncate">{file.fileName}</span>
                  <span className="text-[11px] text-zinc-400">{fileSize(file.bytes)}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      <FilePreviewModal preview={preview} onClose={() => setPreview(null)} />

      <Modal
        open={confirmDelete}
        title="Delete purchase order"
        onClose={() => setConfirmDelete(false)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void onDelete()} disabled={deleting}>
              {deleting ? <Spinner /> : <Trash2 size={15} />}
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          This permanently removes PO{" "}
          <span className="font-mono font-semibold text-zinc-900">{order.poNumber}</span>{" "}
          and every file attached to it.
        </p>
        <p className="mt-2 text-sm font-medium text-rose-600">This cannot be undone.</p>
      </Modal>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function Tile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <p className="truncate text-[11px] font-medium uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p
        className={
          accent
            ? "mt-0.5 text-lg font-bold text-brand-700"
            : "mt-0.5 text-lg font-semibold text-zinc-800"
        }
      >
        {value}
      </p>
    </div>
  );
}

function Pair({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-zinc-800">{value || "—"}</dd>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <dt className="text-zinc-600">{label}</dt>
      <dd className="font-medium text-zinc-800">{value}</dd>
    </div>
  );
}

function PartyCard({
  title,
  icon,
  name,
  address,
  gstNumber,
  extra,
}: {
  title: string;
  icon: React.ReactNode;
  name: string;
  address: string;
  gstNumber: string;
  extra?: string[];
}) {
  return (
    <SectionCard title={title} icon={icon}>
      <p className="text-sm font-semibold text-zinc-900">{name || "—"}</p>
      {address && (
        <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{address}</p>
      )}
      {gstNumber && (
        <p className="mt-2 font-mono text-xs text-zinc-500">GSTN {gstNumber}</p>
      )}
      {extra?.length ? (
        <p className="mt-2 text-xs text-zinc-500">{extra.join(" · ")}</p>
      ) : null}
    </SectionCard>
  );
}
