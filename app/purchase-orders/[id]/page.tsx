import PurchaseOrderDetail from "@/components/PurchaseOrderDetail";

export const metadata = { title: "Purchase Order - AssetTrack" };

export default async function PurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PurchaseOrderDetail id={id} />;
}
