"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Eye,
  Download,
  Filter,
  Pencil,
  Plus,
  Landmark,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import Modal from "./Modal";
import DateField from "./DateField";
import FilePreviewModal, { type Preview } from "./FilePreview";
import { Badge, Button, Card, EmptyState, Field, Input, Select, Spinner } from "./ui";
import { PAGE_SIZES } from "@/lib/constants";
import { useStoredState } from "@/lib/useStoredState";
import {
  ENTITY_STYLES,
  STATUS_STYLES,
  WARRANTY_STYLES,
  initials,
  money,
  shortDate,
} from "@/lib/format";
import {
  apiError,
  deleteAsset as deleteAssetApi,
  downloadFile,
  exportUrl,
  fetchAssets,
  fetchOptions,
} from "@/lib/api";
import {
  ASSET_STATUSES,
  ENTITIES,
  type Asset,
  type FilterOptions,
  type Pagination,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Column definitions                                                  */
/* ------------------------------------------------------------------ */

type ColumnKey =
  | "assetCode"
  | "entity"
  | "photo"
  | "product"
  | "productNumber"
  | "purchaseDate"
  | "purchaseCost"
  | "gst"
  | "totalCost"
  | "bookValue"
  | "assignedEmployee"
  | "department"
  | "location"
  | "warranty"
  | "verified"
  | "status";

interface Column {
  key: ColumnKey;
  label: string;
  sortKey?: string;
  align?: "right" | "center";
  defaultOn: boolean;
}

const COLUMNS: Column[] = [
  { key: "photo", label: "Photo", defaultOn: true },
  { key: "assetCode", label: "FA Code", sortKey: "assetCode", defaultOn: true },
  { key: "entity", label: "Entity", sortKey: "entity", align: "center", defaultOn: true },
  { key: "product", label: "Product", sortKey: "product", defaultOn: true },
  { key: "productNumber", label: "Product Number", defaultOn: true },
  { key: "purchaseDate", label: "Purchased", sortKey: "purchaseDate", defaultOn: true },
  {
    key: "purchaseCost",
    label: "Purchase Cost",
    sortKey: "purchaseCost",
    align: "right",
    defaultOn: true,
  },
  { key: "gst", label: "GST", align: "right", defaultOn: true },
  { key: "totalCost", label: "Total Cost", align: "right", defaultOn: true },
  { key: "bookValue", label: "Book Value", align: "right", defaultOn: true },
  { key: "assignedEmployee", label: "Assigned To", defaultOn: true },
  { key: "department", label: "Department", sortKey: "department", defaultOn: true },
  { key: "location", label: "Location", sortKey: "location", defaultOn: false },
  { key: "warranty", label: "Warranty", defaultOn: false },
  { key: "verified", label: "Verified", align: "center", defaultOn: true },
  { key: "status", label: "Status", sortKey: "status", align: "center", defaultOn: true },
];

const DEFAULT_COLUMNS = COLUMNS.filter((c) => c.defaultOn).map((c) => c.key);
const VALID_KEYS = new Set<string>(COLUMNS.map((c) => c.key));
// Bumped when columns are added: a saved v1 layout has no knowledge of the new
// keys, so it would silently hide them. Bumping resets the choice once rather
// than leaving people wondering where the new columns went.
const STORAGE_KEY = "assettrack.columns.v2";
const DENSITY_KEY = "assettrack.density.v1";

type Density = "compact" | "comfortable";

function decodeColumns(raw: string): ColumnKey[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    // Drop anything from an older build that no longer exists.
    const keys = parsed.filter((k): k is ColumnKey => typeof k === "string" && VALID_KEYS.has(k));
    return keys.length ? keys : null;
  } catch {
    return null;
  }
}

const encodeColumns = (keys: ColumnKey[]) => JSON.stringify(keys);
const decodeDensity = (raw: string): Density | null =>
  raw === "compact" || raw === "comfortable" ? raw : null;
const encodeDensity = (value: Density) => value;

/* ------------------------------------------------------------------ */

export default function AssetTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<Asset[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [showColumns, setShowColumns] = useState(false);
  const [density, setDensity] = useStoredState<Density>(
    DENSITY_KEY,
    "compact",
    decodeDensity,
    encodeDensity
  );
  const [visible, setVisible] = useStoredState<ColumnKey[]>(
    STORAGE_KEY,
    DEFAULT_COLUMNS,
    decodeColumns,
    encodeColumns
  );
  const [pendingDelete, setPendingDelete] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  const columnsRef = useRef<HTMLDivElement>(null);

  /* -------- URL-backed query state -------- */
  const query = useMemo(() => {
    const get = (k: string) => searchParams.get(k) ?? "";
    return {
      page: Number(get("page")) || 1,
      limit: Number(get("limit")) || 20,
      search: get("search"),
      serial: get("serial"),
      status: get("status"),
      entity: get("entity"),
      department: get("department"),
      location: get("location"),
      category: get("category"),
      verified: get("verified"),
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
      router.replace(`/assets${next.toString() ? `?${next}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  /* -------- Local text inputs, debounced into the URL -------- */
  const [searchText, setSearchText] = useState(query.search);
  const [serialText, setSerialText] = useState(query.serial);

  // Pull the URL back into the boxes when it changes from elsewhere (a chip was
  // cleared, a sidebar shortcut was used). Adjusting during render rather than in
  // an effect avoids a second render pass.
  const [urlText, setUrlText] = useState({ search: query.search, serial: query.serial });
  if (urlText.search !== query.search || urlText.serial !== query.serial) {
    setUrlText({ search: query.search, serial: query.serial });
    setSearchText(query.search);
    setSerialText(query.serial);
  }

  useEffect(() => {
    if (searchText === query.search) return;
    const t = setTimeout(() => applyParams({ search: searchText }), 350);
    return () => clearTimeout(t);
  }, [searchText, query.search, applyParams]);

  useEffect(() => {
    if (serialText === query.serial) return;
    const t = setTimeout(() => applyParams({ serial: serialText }), 350);
    return () => clearTimeout(t);
  }, [serialText, query.serial, applyParams]);

  const toggleColumn = (key: ColumnKey) => {
    const next = visible.includes(key)
      ? visible.filter((k) => k !== key)
      : COLUMNS.filter((c) => c.key === key || visible.includes(c.key)).map((c) => c.key);
    // Never let the user hide every column.
    if (next.length) setVisible(next);
  };

  /* -------- Close the columns popover on outside click -------- */
  useEffect(() => {
    if (!showColumns) return;
    const onClick = (e: MouseEvent) => {
      if (columnsRef.current && !columnsRef.current.contains(e.target as Node)) {
        setShowColumns(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [showColumns]);

  /* -------- Data -------- */
  const [reloadKey, setReloadKey] = useState(0);

  // Called from click handlers, so setting state here is fine.
  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    // The serial box is a second free-text search; the API searches both fields.
    fetchAssets({
      page: query.page,
      limit: query.limit,
      search: query.search || query.serial,
      status: query.status,
      entity: query.entity,
      department: query.department,
      location: query.location,
      category: query.category,
      verified: query.verified,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data);
        setPagination(res.pagination);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(apiError(err, "Could not load assets"));
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
    fetchOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, [rows.length]);

  /* -------- Active filter chips -------- */
  const chips = useMemo(() => {
    const list: { key: string; label: string }[] = [];
    if (query.search) list.push({ key: "search", label: `Search: ${query.search}` });
    if (query.serial) list.push({ key: "serial", label: `Serial: ${query.serial}` });
    if (query.status) list.push({ key: "status", label: `Status: ${query.status}` });
    if (query.entity) list.push({ key: "entity", label: `Entity: ${query.entity}` });
    if (query.department) list.push({ key: "department", label: query.department });
    if (query.location) list.push({ key: "location", label: query.location });
    if (query.category) list.push({ key: "category", label: query.category });
    if (query.verified)
      list.push({
        key: "verified",
        label: query.verified === "true" ? "Verified" : "Not verified",
      });
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

  async function onDownloadExcel() {
    if (downloading) return;
    setDownloading(true);
    const toastId = toast.loading("Building spreadsheet…");
    try {
      await downloadFile(downloadHref, "assets.xlsx");
      toast.success("Excel downloaded", { id: toastId });
    } catch (err) {
      toast.error((err as Error).message, { id: toastId });
    } finally {
      setDownloading(false);
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteAssetApi(pendingDelete._id);
      toast.success(`${pendingDelete.assetCode} deleted`);
      setPendingDelete(null);
      reload();
    } catch (err) {
      toast.error(apiError(err, "Could not delete the asset"));
    } finally {
      setDeleting(false);
    }
  }

  // The export covers every row the filters match, not just the visible page.
  const downloadHref = exportUrl({
    search: query.search || query.serial,
    status: query.status,
    entity: query.entity,
    department: query.department,
    location: query.location,
    category: query.category,
    verified: query.verified,
    dateFrom: query.dateFrom,
    dateTo: query.dateTo,
    sortBy: query.sortBy,
    sortOrder: query.sortOrder,
  });

  const shownColumns = COLUMNS.filter((c) => visible.includes(c.key));
  const cellPad = density === "compact" ? "px-3 py-2" : "px-4 py-3.5";

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
            href="/assets/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} />
            Create Asset
          </Link>

          <div className="relative min-w-[200px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by product, FA code, employee…"
              className="pl-9"
            />
          </div>

          <div className="relative min-w-[180px] flex-1">
            <Landmark
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <Input
              value={serialText}
              onChange={(e) => setSerialText(e.target.value)}
              placeholder="Search by product number…"
              className="pl-9 font-mono"
            />
          </div>
        </div>

        {/* Active filter chips */}
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
              onClick={() => router.replace("/assets", { scroll: false })}
              className="text-xs font-medium text-zinc-500 underline-offset-2 hover:text-zinc-800 hover:underline"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Density / filters / columns */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-zinc-600">
            Density:
            <Select
              value={density}
              onChange={(e) => setDensity(e.target.value as Density)}
              className="w-auto py-1.5"
            >
              <option value="compact">Compact</option>
              <option value="comfortable">Comfortable</option>
            </Select>
          </label>

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

          <button
            type="button"
            onClick={() => void onDownloadExcel()}
            disabled={downloading}
            className="ml-auto inline-flex items-center gap-2 rounded-lg border border-brand-300 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-800 hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-60"
            title={
              pagination
                ? `Download all ${pagination.total.toLocaleString()} matching records as Excel`
                : "Download as Excel"
            }
          >
            {downloading ? <Spinner /> : <Download size={15} />}
            {downloading ? "Building…" : "Download Excel"}
          </button>

          <div className="relative" ref={columnsRef}>
            <button
              type="button"
              onClick={() => setShowColumns((s) => !s)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <Columns3 size={15} />
              Columns
            </button>
            {showColumns && (
              <div className="animate-fade-in absolute right-0 z-30 mt-2 w-56 rounded-lg border border-zinc-200 bg-white p-2 shadow-lg">
                <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Visible columns
                </p>
                {COLUMNS.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    <input
                      type="checkbox"
                      checked={visible.includes(c.key)}
                      onChange={() => toggleColumn(c.key)}
                      className="h-3.5 w-3.5 rounded border-zinc-300 accent-brand-600"
                    />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="animate-fade-in mt-3 grid grid-cols-1 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Status">
              <Select value={query.status} onChange={(e) => applyParams({ status: e.target.value })}>
                <option value="">All statuses</option>
                {ASSET_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Entity">
              <Select value={query.entity} onChange={(e) => applyParams({ entity: e.target.value })}>
                <option value="">All companies</option>
                {ENTITIES.map((e) => (
                  <option key={e} value={e}>
                    {e}
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

            <Field label="Location">
              <Select
                value={query.location}
                onChange={(e) => applyParams({ location: e.target.value })}
              >
                <option value="">All locations</option>
                {(options?.locations ?? []).map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Category">
              <Select
                value={query.category}
                onChange={(e) => applyParams({ category: e.target.value })}
              >
                <option value="">All categories</option>
                {(options?.categories ?? []).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Verification">
              <Select
                value={query.verified}
                onChange={(e) => applyParams({ verified: e.target.value })}
              >
                <option value="">Any</option>
                <option value="true">Verified</option>
                <option value="false">Not verified</option>
              </Select>
            </Field>

            <Field label="Purchased from">
              <DateField
                value={query.dateFrom}
                onChange={(iso) => applyParams({ dateFrom: iso })}
              />
            </Field>

            <Field label="Purchased to">
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
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-brand-50/80 text-left">
                {shownColumns.map((c) => (
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
                    {shownColumns.map((c) => (
                      <td key={c.key} className={cellPad}>
                        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                      </td>
                    ))}
                    <td className={cellPad}>
                      <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                    </td>
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={shownColumns.length + 1}>
                    {error ? (
                      <EmptyState
                        title="Could not load assets"
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
                        icon={<Boxes size={40} />}
                        title="No assets found"
                        description={
                          chips.length
                            ? "No records match the current filters."
                            : "Create your first asset to start the register."
                        }
                        action={
                          <Link
                            href="/assets/new"
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                          >
                            <Plus size={16} />
                            Create Asset
                          </Link>
                        }
                      />
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row._id} className="transition hover:bg-brand-50/40">
                    {shownColumns.map((c) => (
                      <td
                        key={c.key}
                        className={clsx(
                          cellPad,
                          "align-middle",
                          c.align === "right" && "text-right",
                          c.align === "center" && "text-center"
                        )}
                      >
                        <Cell column={c.key} asset={row} onPreview={setPreview} />
                      </td>
                    ))}
                    <td className={clsx(cellPad, "text-center")}>
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/assets/${encodeURIComponent(row._id)}`}
                          aria-label={`View ${row.assetCode}`}
                          title="View"
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-brand-100 hover:text-brand-700"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/assets/${encodeURIComponent(row._id)}/edit`}
                          aria-label={`Edit ${row.assetCode}`}
                          title="Edit"
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-brand-100 hover:text-brand-700"
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(row)}
                          aria-label={`Delete ${row.assetCode}`}
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

        {/* ---------- Pagination ---------- */}
        {pagination && rows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 px-4 py-3">
            <p className="text-sm text-zinc-600">
              Showing <span className="font-semibold">{pagination.from}</span> to{" "}
              <span className="font-semibold">{pagination.to}</span> of{" "}
              <span className="font-semibold">{pagination.total.toLocaleString()}</span> records
            </p>
            <PageNav
              page={pagination.page}
              totalPages={pagination.totalPages}
              onChange={(p) => applyParams({ page: p }, false)}
            />
          </div>
        )}
      </Card>

      <FilePreviewModal preview={preview} onClose={() => setPreview(null)} />

      {/* ---------- Delete confirmation ---------- */}
      <Modal
        open={!!pendingDelete}
        title="Delete asset"
        onClose={() => setPendingDelete(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setPendingDelete(null)} disabled={deleting}>
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
          This permanently removes{" "}
          <span className="font-mono font-semibold text-zinc-900">
            {pendingDelete?.assetCode}
          </span>{" "}
          ({pendingDelete?.product}) and every file uploaded against it — photo, invoice,
          warranty document and verification photo.
        </p>
        <p className="mt-2 text-sm font-medium text-rose-600">This cannot be undone.</p>
      </Modal>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cell renderer                                                       */
/* ------------------------------------------------------------------ */

function Cell({
  column,
  asset,
  onPreview,
}: {
  column: ColumnKey;
  asset: Asset;
  onPreview: (preview: Preview) => void;
}) {
  switch (column) {
    case "photo":
      return asset.photo?.url ? (
        <button
          type="button"
          onClick={() =>
            onPreview({ label: `📷 ${asset.assetCode} — ${asset.product}`, file: asset.photo! })
          }
          aria-label={`Preview photo of ${asset.assetCode}`}
          title="Click to enlarge"
          className="group relative block h-9 w-9 overflow-hidden rounded-md border border-zinc-200 transition hover:border-brand-400"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.photo.url}
            alt=""
            className="h-full w-full object-cover transition group-hover:scale-110"
          />
          <span className="absolute inset-0 flex items-center justify-center bg-zinc-900/0 text-white opacity-0 transition group-hover:bg-zinc-900/45 group-hover:opacity-100">
            <Eye size={14} />
          </span>
        </button>
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-md border border-dashed border-zinc-200 text-zinc-300">
          <Boxes size={15} />
        </div>
      );

    case "assetCode":
      return (
        <Link
          href={`/assets/${encodeURIComponent(asset._id)}`}
          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
        >
          {asset.assetCode}
        </Link>
      );

    case "product":
      return (
        <div className="min-w-0">
          <p className="truncate font-medium text-zinc-800">{asset.product}</p>
          {(asset.brand || asset.category) && (
            <p className="truncate text-xs text-zinc-500">
              {[asset.brand, asset.category].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      );

    case "entity":
      return asset.entity ? (
        <Badge className={ENTITY_STYLES[asset.entity]}>{asset.entity}</Badge>
      ) : (
        <span className="text-zinc-300">—</span>
      );

    case "productNumber":
      return asset.productNumber ? (
        <span className="font-mono text-xs text-zinc-600">{asset.productNumber}</span>
      ) : (
        <span className="text-zinc-300">—</span>
      );

    case "purchaseDate":
      return <span className="whitespace-nowrap text-zinc-600">{shortDate(asset.purchaseDate)}</span>;

    case "purchaseCost":
      return <span className="whitespace-nowrap text-zinc-700">{money(asset.purchaseCost)}</span>;

    case "gst":
      // The rate is shown next to the amount, otherwise a bare figure is
      // ambiguous when different assets carry different rates.
      return asset.gstPercent ? (
        <span className="whitespace-nowrap text-zinc-700">
          {money(asset.gstAmount ?? 0)}
          <span className="ml-1 text-xs text-zinc-400">{asset.gstPercent}%</span>
        </span>
      ) : (
        <span className="text-zinc-300">—</span>
      );

    case "totalCost":
      return (
        <span className="whitespace-nowrap font-medium text-zinc-800">
          {money(asset.totalCost ?? asset.purchaseCost)}
        </span>
      );

    case "bookValue":
      return (
        <span className="whitespace-nowrap font-medium text-brand-700">
          {money(asset.book?.currentValue ?? asset.purchaseCost)}
        </span>
      );

    case "assignedEmployee":
      return asset.assignedEmployee?.name ? (
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-800">
            {initials(asset.assignedEmployee.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-zinc-800">{asset.assignedEmployee.name}</p>
            {asset.assignedEmployee.employeeId && (
              <p className="truncate font-mono text-[11px] text-zinc-500">
                {asset.assignedEmployee.employeeId}
              </p>
            )}
          </div>
        </div>
      ) : (
        <span className="text-xs text-zinc-400">Unassigned</span>
      );

    case "department":
      return asset.department ? (
        <Badge className="bg-zinc-100 text-zinc-700 ring-zinc-200">{asset.department}</Badge>
      ) : (
        <span className="text-zinc-300">—</span>
      );

    case "location":
      return <span className="text-zinc-600">{asset.location || "—"}</span>;

    case "warranty":
      return (
        <Badge className={WARRANTY_STYLES[asset.warrantyStatus ?? "Unknown"]}>
          {asset.warrantyStatus ?? "Unknown"}
        </Badge>
      );

    case "verified":
      return (
        <Badge
          className={
            asset.physicalVerification?.verified
              ? "bg-brand-100 text-brand-800 ring-brand-200"
              : "bg-zinc-100 text-zinc-500 ring-zinc-200"
          }
        >
          {asset.physicalVerification?.verified ? "Yes" : "No"}
        </Badge>
      );

    case "status":
      return <Badge className={STATUS_STYLES[asset.status]}>{asset.status}</Badge>;

    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Pagination control                                                  */
/* ------------------------------------------------------------------ */

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
            p === page
              ? "bg-brand-600 text-white"
              : "text-zinc-600 hover:bg-zinc-100"
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
