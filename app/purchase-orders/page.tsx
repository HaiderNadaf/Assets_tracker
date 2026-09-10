import { Suspense } from "react";
import PurchaseOrderTable from "@/components/PurchaseOrderTable";

export const metadata = { title: "Purchase Orders - AssetTrack" };

export default function PurchaseOrdersPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white" />}>
      <PurchaseOrderTable />
    </Suspense>
  );
}
