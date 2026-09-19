import EditVendorClient from "./EditVendorClient";

export const metadata = { title: "Edit Vendor - AssetTrack" };

export default async function EditVendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditVendorClient id={id} />;
}
