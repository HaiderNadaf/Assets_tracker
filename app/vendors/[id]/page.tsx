import VendorDetail from "@/components/VendorDetail";

export const metadata = { title: "Vendor - AssetTrack" };

export default async function VendorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <VendorDetail id={id} />;
}
