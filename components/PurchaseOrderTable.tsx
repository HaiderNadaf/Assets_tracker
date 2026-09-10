"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Filter,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import Modal from "./Modal";
import DateField from "./DateField";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner } from "./ui";
import { PAGE_SIZES } from "@/lib/constants";
import { ENTITY_STYLES, PO_STATUS_STYLES, money, shortDate } from "@/lib/format";
import {
  apiError,
  deletePurchaseOrder as deleteApi,
  downloadFile,
  fetchPoOptions,
  fetchPurchaseOrders,
  poExportUrl,
  poPdfUrl,
} from "@/lib/api";
import {
  ENTITIES,
  PO_STATUSES,
  type Pagination,
  type PoFilterOptions,
  type PurchaseOrder,
} from "@/lib/types";

interface Column {
  key: string;
  label: string;
  sortKey?: string;
  align?: "right" | "center";
}

const COLUMNS: Column[] = [
  { key: "poNumber", label: "PO Number", sortKey: "poNumber" },
  { key: "entity", label: "Entity", sortKey: "entity", align: "center" },
  { key: "poDate", label: "PO Date", sortKey: "poDate" },
  { key: "supplier", label: "Supplier" },
  { key: "items", label: "Lines", align: "center" },
  { key: "taxable", label: "Taxable", align: "right" },
  { key: "gst", label: "GST", align: "right" },
  { key: "total", label: "Order Value", sortKey: "grandTotal", align: "right" },
  { key: "expectedDate", label: "Expected", sortKey: "expectedDate" },
  { key: "status", label: "Status", sortKey: "status", align: "center" },
];

export default function PurchaseOrderTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<PurchaseOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [options, setOptions] = useState<PoFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PurchaseOrder | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState<string | null>(null);

  /* -------- URL-backed query state -------- */
  const query = useMemo(() => {
    const get = (k: string) => searchParams.get(k) ?? "";
    return {
      page: Number(get("page")) || 1,
      limit: Number(get("limit")) || 20,
      search: get("search"),
      status: get("status"),
      entity: get("entity"),
      supplier: get("supplier"),
      department: get("department"),
      dateFrom: get("dateFrom"),
      dateTo: get("dateTo"),
      sortBy: get("sortBy") || "createdAt",
      sortOrder: (get("sortOrder") || "desc") as "asc" | "desc",
    };
  }, [searchParams]);

  const applyParams = useCallback(
    (patch: Record<string, string | number | undefined>, resetPage = true) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined || v === "" || v === null) next.delete(k);
        else next.set(k, String(v));
      }
      if (resetPage && !("page" in patch)) next.delete("page");
      router.replace(`/purchase-orders${next.toString() ? `?${next}` : ""}`, {
        scroll: false,
      });
    },
    [router, searchParams]
  );

  /* -------- Search box, debounced into the URL -------- */
  const [searchText, setSearchText] = useState(query.search);

  // Pull the URL back into the box when it changes from elsewhere (a chip was
  // cleared, a sidebar shortcut was used).
  const [urlSearch, setUrlSearch] = useState(query.search);
  if (urlSearch !== query.search) {
    setUrlSearch(query.search);
    setSearchText(query.search);
  }

  useEffect(() => {
    if (searchText === query.search) return;
    const t = setTimeout(() => applyParams({ search: searchText }), 350);
    return () => clearTimeout(t);
  }, [searchText, query.search, applyParams]);

  /* -------- Data -------- */
  const [reloadKey, setReloadKey] = useState(0);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetchPurchaseOrders(query)
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setPagination(res.pagination);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(apiError(err, "Could not load purchase orders"));
        setRows([]);
        setPagination(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, reloadKey]);

  useEffect(() => {
    fetchPoOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, [rows.length]);

  /* -------- Active filter chips -------- */
  const chips = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    if (query.search) list.push({ key: "search", label: `Search: ${query.search}` });
    if (query.status) list.push({ key: "status", label: query.status });
    if (query.entity) list.push({ key: "entity", label: `Entity: ${query.entity}` });
    if (query.supplier) list.push({ key: "supplier", label: query.supplier });
    if (query.department) list.push({ key: "department", label: query.department });
    if (query.dateFrom) list.push({ key: "dateFrom", label: `From ${query.dateFrom}` });
    if (query.dateTo) list.push({ key: "dateTo", label: `To ${query.dateTo}` });
    return list;
  }, [query]);

  const toggleSort = (sortKey?: string) => {
    if (!sortKey) return;
    const sameField = query.sortBy === sortKey;
    applyParams({
      sortBy: sortKey,
      sortOrder: sameField && query.sortOrder === "asc" ? "desc" : "asc",
    });
  };

  // The export covers every row the filters match, not just the visible page.
  const downloadHref = poExportUrl({
    search: query.search,
    status: query.status,
    entity: query.entity,
    supplier: query.supplier,
    department: query.department,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  async function onDownloadExcel() {
    if (downloading) return;
    setDownloading(true);
    const toastId = toast.loading("Building spreadsheet…");
    try {
      await downloadFile(downloadHref, "purchase-orders.xlsx");
      toast.success("Excel downloaded", { id: toastId });
    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setDownloading(false);
    }
  }

  async function onDownloadPdf(po: PurchaseOrder) {
    if (printing) return;
    setPrinting(po._id);
    const toastId = toast.loading("Building PDF…");
    try {
      await downloadFile(poPdfUrl(po._id), `PO-${po.poNumber}.pdf`);
      toast.success("PDF downloaded", { id: toastId });
    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setPrinting(null);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteApi(pendingDelete._id);
      toast.success(`PO ${pendingDelete.poNumber} deleted`);
      setPendingDelete(null);
      reload();
    } catch (err) {
      toast.error(apiError(err, "Could not delete the purchase order"));
    } finally {
      setDeleting(false);
    }
  }

  // A running value for the filtered set, so the register answers "how much have
  // we committed" without opening the export.
  const pageValue = rows.reduce((sum, r) => sum + (r.totals?.grandTotal ?? 0), 0);

  return (
    <div className="flex flex-col gap-3">
      {/* ---------- Toolbar ---------- */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={reload}
            aria-label="Refresh"
            className="rounded-lg border border-zinc-300 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
          </button>

          <Link
            href="/purchase-orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} />
            Create PO
          </Link>

          <div className="relative min-w-[220px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by PO number, supplier, item…"
              className="pl-9"
            />
          </div>
        </div>

        {chips.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-100 px-2.5 py-1 text-xs font-medium text-brand-800"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => applyParams({ [chip.key]: undefined })}
                  aria-label={`Clear ${chip.label}`}
                  className="rounded hover:bg-brand-200"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => router.replace("/purchase-orders", { scroll: false })}
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium",
              showFilters || chips.length
                ? "border-brand-300 bg-brand-50 text-brand-800"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50"
            )}
          >
            <Filter size={15} />
            Filters
          </button>

          {rows.length > 0 && (
            <span className="text-sm text-zinc-600">
              This page:{" "}
              <span className="font-semibold text-zinc-800">{money(pageValue)}</span>
            </span>
          )}

          <button
            type="button"
            onClick={() => void onDownloadExcel()}
            disabled={downloading}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            title={
              pagination
                ? `Download all ${pagination.total.toLocaleString()} matching orders as Excel`
                : "Download as Excel"
            }
          >
            {downloading ? <Spinner /> : <Download size={15} />}
            {downloading ? "Building…" : "Download Excel"}
          </button>
        </div>

        {showFilters && (
          <div className="animate-fade-in mt-3 grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status">
              <Select
                value={query.status}
                onChange={(e) => applyParams({ status: e.target.value })}
              >
                <option value="">All statuses</option>
                {PO_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Entity">
              <Select
                value={query.entity}
                onChange={(e) => applyParams({ entity: e.target.value })}
              >
                <option value="">All companies</option>
                {ENTITIES.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Supplier">
              <Select
                value={query.supplier}
                onChange={(e) => applyParams({ supplier: e.target.value })}
              >
                <option value="">All suppliers</option>
                {(options?.suppliers ?? []).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Department">
              <Select
                value={query.department}
                onChange={(e) => applyParams({ department: e.target.value })}
              >
                <option value="">All departments</option>
                {(options?.departments ?? []).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Ordered from">
              <DateField
                value={query.dateFrom}
                onChange={(iso) => applyParams({ dateFrom: iso })}
              />
            </Field>

            <Field label="Ordered to">
              <DateField
                value={query.dateTo}
                onChange={(iso) => applyParams({ dateTo: iso })}
              />
            </Field>

            <Field label="Rows per page">
              <Select
                value={String(query.limit)}
                onChange={(e) => applyParams({ limit: e.target.value })}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} per page
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </Card>

      {/* ---------- Table ---------- */}
      <Card className="overflow-hidden">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[1000px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-brand-50/80 text-left">
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    className={clsx(
                      "whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-zinc-700",
                      c.align === "right" && "text-right",
                      c.align === "center" && "text-center",
                      c.sortKey && "cursor-pointer select-none hover:text-brand-800"
                    )}
                    onClick={() => toggleSort(c.sortKey)}
                  >
                    <span
                      className={clsx(
                        "inline-flex items-center gap-1",
                        c.align === "right" && "flex-row-reverse"
                      )}
                    >
                      {c.label}
                      {c.sortKey === query.sortBy &&
                        (query.sortOrder === "asc" ? (
                          <ArrowUp size={12} />
                        ) : (
                          <ArrowDown size={12} />
                        ))}
                    </span>
                  </th>
                ))}
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold text-zinc-700">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-zinc-100">
              {loading && rows.length === 0 ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {COLUMNS.map((c) => (
                      <td key={c.key} className="px-3 py-2.5">
                        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                      </td>
                    ))}
                    <td className="px-3 py-2.5">
                      <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1}>
                    {error ? (
                      <EmptyState
                        title="Could not load purchase orders"
                        description={error}
                        action={
                          <Button variant="secondary" onClick={reload}>
                            <RefreshCw size={15} />
                            Try again
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        icon={<ShoppingCart size={40} />}
                        title="No purchase orders yet"
                        description={
                          chips.length
                            ? "No orders match the current filters."
                            : "Raise your first purchase order to start the register."
                        }
                        action={
                          <Link
                            href="/purchase-orders/new"
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                          >
                            <Plus size={16} />
                            Create PO
                          </Link>
                        }
                      />
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((po) => (
                  <tr key={po._id} className="transition hover:bg-brand-50/40">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/purchase-orders/${encodeURIComponent(po._id)}`}
                        className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                      >
                        {po.poNumber}
                      </Link>
                      {po.supplierRef && (
                        <p className="truncate text-[11px] text-zinc-400">
                          Ref {po.supplierRef}
                        </p>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <Badge className={ENTITY_STYLES[po.entity]}>{po.entity}</Badge>
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600">
                      {shortDate(po.poDate)}
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="min-w-0 max-w-[240px]">
                        <p className="truncate font-medium text-zinc-800">
                          {po.supplier?.name || "—"}
                        </p>
                        {po.supplier?.gstNumber && (
                          <p className="truncate font-mono text-[11px] text-zinc-500">
                            {po.supplier.gstNumber}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-center text-zinc-600">
                      {po.totals?.itemCount ?? 0}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-zinc-700">
                      {money(po.totals?.taxableAmount)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-zinc-700">
                      {po.gstPercent ? (
                        <>
                          {money(po.totals?.gstAmount)}
                          <span className="ml-1 text-xs text-zinc-400">
                            {po.gstPercent}%
                          </span>
                        </>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold text-brand-700">
                      {money(po.totals?.grandTotal)}
                    </td>

                    <td className="whitespace-nowrap px-3 py-2.5 text-zinc-600">
                      {shortDate(po.expectedDate)}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <Badge className={PO_STATUS_STYLES[po.status]}>{po.status}</Badge>
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/purchase-orders/${encodeURIComponent(po._id)}`}
                          aria-label={`View ${po.poNumber}`}
                          title="View"
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-brand-100 hover:text-brand-700"
                        >
                          <Eye size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => void onDownloadPdf(po)}
                          disabled={printing === po._id}
                          aria-label={`Download PO ${po.poNumber}`}
                          title="Download PDF"
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-brand-100 hover:text-brand-700 disabled:opacity-40"
                        >
                          {printing === po._id ? <Spinner /> : <FileText size={16} />}
                        </button>
                        <Link
                          href={`/purchase-orders/${encodeURIComponent(po._id)}/edit`}
                          aria-label={`Edit ${po.poNumber}`}
                          title="Edit"
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-brand-100 hover:text-brand-700"
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(po)}
                          aria-label={`Delete ${po.poNumber}`}
                          title="Delete"
                          className="rounded-md p-1.5 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3">
            <p className="text-sm text-zinc-600">
              Showing <span className="font-semibold">{pagination.from}</span> to{" "}
              <span className="font-semibold">{pagination.to}</span> of{" "}
              <span className="font-semibold">{pagination.total.toLocaleString()}</span>{" "}
              orders
            </p>
            <PageNav
              page={pagination.page}
              totalPages={pagination.totalPages}
              onChange={(p) => applyParams({ page: p }, false)}
            />
          </div>
        )}
      </Card>

      {/* ---------- Delete confirmation ---------- */}
      <Modal
        open={!!pendingDelete}
        title="Delete purchase order"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setPendingDelete(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} disabled={deleting}>
              {deleting ? <Spinner /> : <Trash2 size={15} />}
              {deleting ? "Deleting…" : "Delete permanently"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          This permanently removes PO{" "}
          <span className="font-mono font-semibold text-zinc-900">
            {pendingDelete?.poNumber}
          </span>{" "}
          ({pendingDelete?.supplier?.name}) and every file attached to it.
        </p>
        <p className="mt-2 text-sm font-medium text-rose-600">This cannot be undone.</p>
      </Modal>
    </div>
  );
}

function PageNav({
  page,
  totalPages,
  onChange,
}: {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}) {
  // A sliding window of at most 5 page buttons around the current page.
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => start + i).filter(
    (p) => p >= 1 && p <= totalPages
  );

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={17} />
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          aria-current={p === page ? "page" : undefined}
          className={clsx(
            "min-w-8 rounded-md px-2.5 py-1.5 text-sm font-medium",
            p === page ? "bg-brand-600 text-white" : "text-zinc-600 hover:bg-zinc-100"
          )}
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
        className="rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
}
