import { Suspense } from "react";
import VendorTable from "@/components/VendorTable";

export const metadata = { title: "Vendors - AssetTrack" };

export default function VendorsPage() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-white" />}>
      <VendorTable />
    </Suspense>
  );
}
