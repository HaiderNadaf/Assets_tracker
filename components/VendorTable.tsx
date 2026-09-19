"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import clsx from "clsx";
import toast from "react-hot-toast";
import {
  Building2,
  Eye,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import Modal from "./Modal";
import { Badge, Button, Card, EmptyState, Spinner } from "./ui";
import { apiError, deleteVendor as deleteApi, fetchVendors } from "@/lib/api";
import type { Vendor } from "@/lib/types";

export default function VendorTable() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [rows, setRows] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Vendor | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const urlSearch = searchParams.get("search") ?? "";
  const [searchText, setSearchText] = useState(urlSearch);

  const applySearch = useCallback(
    (value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) next.set("search", value);
      else next.delete("search");
      router.replace(`/vendors${next.toString() ? `?${next}` : ""}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (searchText === urlSearch) return;
    const t = setTimeout(() => applySearch(searchText), 300);
    return () => clearTimeout(t);
  }, [searchText, urlSearch, applySearch]);

  const reload = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  useEffect(() => {
    let cancelled = false;
    fetchVendors(urlSearch)
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(apiError(err, "Could not load vendors"));
        setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [urlSearch, reloadKey]);

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await deleteApi(pendingDelete._id);
      toast.success(`Vendor "${pendingDelete.name}" deleted`);
      setPendingDelete(null);
      reload();
    } catch (err) {
      toast.error(apiError(err, "Could not delete the vendor"));
    } finally {
      setDeleting(false);
    }
  }

  const empty = !loading && rows.length === 0;

  return (
    <div className="flex flex-col gap-3">
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
            href="/vendors/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Plus size={16} />
            Add vendor
          </Link>

          <div className="relative min-w-[220px] flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search by name, code, GST, contact, what they supply…"
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {searchText && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
            >
              <X size={12} />
              Clear
            </button>
          )}
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="thin-scroll overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-brand-50/80 text-left">
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-zinc-700">
                  Vendor
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-zinc-700">
                  Contact
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-zinc-700">
                  Supplies
                </th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-xs font-semibold text-zinc-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading && rows.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <td key={j} className="px-3 py-2.5">
                        <div className="h-4 w-full animate-pulse rounded bg-zinc-100" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : empty ? (
                <tr>
                  <td colSpan={4}>
                    {error ? (
                      <EmptyState
                        title="Could not load vendors"
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
                        icon={<Building2 size={40} />}
                        title="No vendors yet"
                        description={
                          urlSearch
                            ? "No vendors match this search."
                            : "Add your first vendor to start the master list."
                        }
                        action={
                          <Link
                            href="/vendors/new"
                            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                          >
                            <Plus size={16} />
                            Add vendor
                          </Link>
                        }
                      />
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((v) => (
                  <tr key={v._id} className="transition hover:bg-brand-50/40">
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/vendors/${encodeURIComponent(v._id)}`}
                        className="font-medium text-brand-700 hover:underline"
                      >
                        {v.name}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {v.category && (
                          <Badge className="bg-brand-50 text-brand-700 ring-brand-200">
                            {v.category}
                          </Badge>
                        )}
                        {v.vendorCode && (
                          <span className="font-mono text-[11px] text-zinc-500">
                            {v.vendorCode}
                          </span>
                        )}
                        {v.gstNumber && (
                          <span className="font-mono text-[11px] text-zinc-400">
                            {v.gstNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      <div className="min-w-0 max-w-[220px]">
                        <p className="truncate text-zinc-700">
                          {v.contactPerson || "—"}
                        </p>
                        <p className="truncate text-[11px] text-zinc-400">
                          {[v.phone, v.email].filter(Boolean).join(" · ") || "—"}
                        </p>
                      </div>
                    </td>

                    <td className="px-3 py-2.5">
                      {v.suppliesTags.length ? (
                        <div className="flex max-w-[280px] flex-wrap gap-1">
                          {v.suppliesTags.slice(0, 4).map((tag) => (
                            <Badge key={tag} className="bg-zinc-100 text-zinc-700 ring-zinc-200">
                              {tag}
                            </Badge>
                          ))}
                          {v.suppliesTags.length > 4 && (
                            <Badge className="bg-zinc-100 text-zinc-500 ring-zinc-200">
                              +{v.suppliesTags.length - 4}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-300">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/vendors/${encodeURIComponent(v._id)}`}
                          aria-label={`View ${v.name}`}
                          title="View"
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-brand-100 hover:text-brand-700"
                        >
                          <Eye size={16} />
                        </Link>
                        <Link
                          href={`/vendors/${encodeURIComponent(v._id)}/edit`}
                          aria-label={`Edit ${v.name}`}
                          title="Edit"
                          className="rounded-md p-1.5 text-zinc-500 hover:bg-brand-100 hover:text-brand-700"
                        >
                          <Pencil size={16} />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setPendingDelete(v)}
                          aria-label={`Delete ${v.name}`}
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
      </Card>

      <Modal
        open={!!pendingDelete}
        title="Delete vendor"
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
          <span className="font-semibold text-zinc-900">{pendingDelete?.name}</span> from the
          vendor master.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Purchase orders already raised against this vendor keep their own copy of the
          supplier details and are not affected.
        </p>
      </Modal>
    </div>
  );
}
