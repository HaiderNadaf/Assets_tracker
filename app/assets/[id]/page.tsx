import AssetDetail from "@/components/AssetDetail";

export const metadata = { title: "Asset Details — AssetTrack" };

export default async function AssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AssetDetail id={id} />;
}
