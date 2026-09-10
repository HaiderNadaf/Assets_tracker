"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import PurchaseOrderForm from "@/components/PurchaseOrderForm";
import { Card, EmptyState, Spinner } from "@/components/ui";
import { apiError, fetchPoOptions, fetchPurchaseOrder } from "@/lib/api";
import type { PoFilterOptions, PurchaseOrder } from "@/lib/types";

export default function EditPurchaseOrderClient({ id }: { id: string }) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [options, setOptions] = useState<PoFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchPoOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

  if (loading) {
    return (
      <Card className="flex items-center justify-center gap-3 p-16 text-zinc-500">
        <Spinner className="h-5 w-5" />
        Loading purchase order...
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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/purchase-orders/${encodeURIComponent(order._id)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
        <div>
          <h2 className="text-base font-semibold text-zinc-800">
            Editing PO <span className="font-mono text-brand-700">{order.poNumber}</span>
          </h2>
          <p className="text-xs text-zinc-500">{order.supplier.name}</p>
        </div>
      </div>

      <PurchaseOrderForm order={order} options={options} />
    </div>
  );
}
