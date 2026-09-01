import OthelloBoard from "@/components/othelloBoard";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="h-full w-full max-w-5xl mx-auto min-w-0">
      <OthelloBoard gameId={id} />
    </main>
  );
}
