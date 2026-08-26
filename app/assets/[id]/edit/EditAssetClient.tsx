"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import AssetForm from "@/components/AssetForm";
import { Card, EmptyState, Spinner } from "@/components/ui";
import { apiError, fetchAsset, fetchOptions } from "@/lib/api";
import type { Asset, FilterOptions } from "@/lib/types";

export default function EditAssetClient({ id }: { id: string }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [options, setOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchAsset(id)
      .then((data) => {
        if (!cancelled) setAsset(data);
      })
      .catch((err) => {
        if (!cancelled) setError(apiError(err, "Could not load this asset"));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    fetchOptions()
      .then(setOptions)
      .catch(() => setOptions(null));
  }, []);

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

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center gap-3">
        <Link
          href={`/assets/${encodeURIComponent(asset._id)}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
        <div>
          <h2 className="text-base font-semibold text-zinc-800">
            Editing{" "}
            <span className="font-mono text-brand-700">{asset.assetCode}</span>
          </h2>
          <p className="text-xs text-zinc-500">{asset.product}</p>
        </div>
      </div>

      <AssetForm asset={asset} options={options} />
    </div>
  );
}
