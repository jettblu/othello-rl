import OthelloBoard from "@/components/othelloBoard";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="max-w-5xl mx-auto">
      <div className="mt-6">
        <OthelloBoard gameId={id} />
      </div>
    </main>
  );
}
