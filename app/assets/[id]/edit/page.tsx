import EditAssetClient from "./EditAssetClient";

export const metadata = { title: "Edit Asset — AssetTrack" };

export default async function EditAssetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EditAssetClient id={id} />;
}
