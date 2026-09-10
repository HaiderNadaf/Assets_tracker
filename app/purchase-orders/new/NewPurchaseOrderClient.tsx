"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import PurchaseOrderForm from "@/components/PurchaseOrderForm";
import { fetchPoOptions } from "@/lib/api";
import type { PoFilterOptions } from "@/lib/types";

export default function NewPurchaseOrderClient() {
  const [options, setOptions] = useState<PoFilterOptions | null>(null);

  // Suggestions only - the form works fine if this request fails.
  useEffect(() => {
    fetchPoOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/purchase-orders"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft size={15} />
          Back to purchase orders
        </Link>
        <div>
          <h2 className="text-base font-semibold text-zinc-800">New purchase order</h2>
          <p className="text-xs text-zinc-500">
            The buyer block fills itself once you pick the company.
          </p>
        </div>
      </div>

      <PurchaseOrderForm options={options} />
    </div>
  );
}
