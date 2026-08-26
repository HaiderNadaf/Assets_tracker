import { Suspense } from "react";
import AssetTable from "@/components/AssetTable";

export const metadata = { title: "Assets — AssetTrack" };

export default function AssetsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white" />}>
      <AssetTable />
    </Suspense>
  );
}
