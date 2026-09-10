import EditPurchaseOrderClient from "./EditPurchaseOrderClient";

export const metadata = { title: "Edit Purchase Order - AssetTrack" };

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditPurchaseOrderClient id={id} />;
}
