"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AssetForm from "@/components/AssetForm";
import { fetchOptions } from "@/lib/api";
import type { FilterOptions } from "@/lib/types";

export default function NewAssetClient() {
  const [options, setOptions] = useState<FilterOptions | null>(null);

  // Suggestions only — the form works fine if this request fails.
  useEffect(() => {
    fetchOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href="/assets"
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft size={15} />
          Back to assets
        </Link>
        <div>
          <h2 className="text-base font-semibold text-zinc-800">New asset record</h2>
          <p className="text-xs text-zinc-500">
            Fill in what you know — only the product is required.
          </p>
        </div>
      </div>

      <AssetForm options={options} />
    </div>
  );
}
