"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import VendorForm from "@/components/VendorForm";
import { Card, EmptyState, Spinner } from "@/components/ui";
import { apiError, fetchVendor } from "@/lib/api";
import type { Vendor } from "@/lib/types";

export default function EditVendorClient({ id }: { id: string }) {
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/vendors/${encodeURIComponent(vendor._id)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
        <div>
          <h2 className="text-base font-semibold text-zinc-800">
            Editing <span className="text-brand-700">{vendor.name}</span>
          </h2>
        </div>
      </div>

      <VendorForm vendor={vendor} />
    </div>
  );
}
