"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Building2,
  Mail,
  Pencil,
  Phone,
  ScrollText,
  Tag,
  Trash2,
  TriangleAlert,
  User,
} from "lucide-react";

import Modal from "./Modal";
import { Badge, Button, Card, EmptyState, SectionCard, Spinner } from "./ui";
import { shortDate } from "@/lib/format";
import { apiError, deleteVendor as deleteApi, fetchVendor } from "@/lib/api";
import type { Vendor } from "@/lib/types";

export default function VendorDetail({ id }: { id: string }) {
  const router = useRouter();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchVendor(id)
      .then((data) => {
        if (!cancelled) setVendor(data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err, "Could not load this vendor"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function onDelete() {
    if (!vendor) return;
    setDeleting(true);
    try {
      await deleteApi(vendor._id);
      toast.success(`Vendor "${vendor.name}" deleted`);
      router.push("/vendors");
      router.refresh();
    } catch (err) {
      toast.error(apiError(err, "Could not delete the vendor"));
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-3 p-16 text-zinc-500">
        <Spinner className="h-5 w-5" />
        Loading vendor…
      </Card>
    );
  }

  if (error || !vendor) {
    return (
      <Card>
        <EmptyState
          icon={<TriangleAlert size={40} />}
          title="Vendor not available"
          description={error ?? "This record may have been deleted."}
          action={
            <Link
              href="/vendors"
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Back to vendors
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Card className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Link
              href="/vendors"
              aria-label="Back to vendors"
              className="mt-0.5 rounded-lg border border-zinc-300 bg-white p-2 text-zinc-600 hover:bg-zinc-50"
            >
              <ArrowLeft size={16} />
            </Link>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900">{vendor.name}</h2>
                {vendor.category && (
                  <Badge className="bg-brand-100 text-brand-800 ring-brand-200">
                    {vendor.category}
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-zinc-500">
                {vendor.vendorCode && (
                  <span className="font-mono text-xs">{vendor.vendorCode}</span>
                )}
                {vendor.gstNumber && (
                  <span className="font-mono text-xs">{vendor.gstNumber}</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/vendors/${encodeURIComponent(vendor._id)}/edit`}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
            >
              <Pencil size={15} />
              Edit
            </Link>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete vendor"
              title="Delete"
              className="rounded-lg border border-zinc-300 bg-white p-2 text-zinc-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      </Card>

      <SectionCard title="Contact" icon={<Building2 size={16} />}>
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          <Pair label="Contact person" value={vendor.contactPerson} icon={<User size={13} />} />
          <Pair label="Phone" value={vendor.phone} icon={<Phone size={13} />} />
          <Pair label="Email" value={vendor.email} icon={<Mail size={13} />} />
          <Pair label="Added" value={shortDate(vendor.createdAt)} />
        </dl>
        {vendor.address && (
          <div className="mt-4 border-t border-zinc-100 pt-3">
            <p className="text-xs font-medium text-zinc-500">Address</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700">{vendor.address}</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title="What they supply" icon={<Tag size={16} />}>
        {vendor.suppliesTags.length ? (
          <div className="flex flex-wrap gap-2">
            {vendor.suppliesTags.map((tag) => (
              <Badge key={tag} className="bg-brand-100 text-brand-800 ring-brand-200">
                {tag}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">Nothing recorded yet</p>
        )}
      </SectionCard>

      {vendor.notes && (
        <SectionCard title="Notes" icon={<ScrollText size={16} />}>
          <p className="whitespace-pre-wrap text-sm text-zinc-600">{vendor.notes}</p>
        </SectionCard>
      )}

      <Modal
        open={confirmDelete}
        title="Delete vendor"
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
          This permanently removes{" "}
          <span className="font-semibold text-zinc-900">{vendor.name}</span> from the vendor
          master.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          Purchase orders already raised against this vendor keep their own copy of the
          supplier details and are not affected.
        </p>
      </Modal>
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
