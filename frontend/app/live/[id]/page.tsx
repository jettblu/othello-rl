import OthelloBoard from "@/components/othelloBoard";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="w-full max-w-5xl mx-auto min-w-0">
      <div className="mt-4 sm:mt-6">
        <OthelloBoard gameId={id} />
      </div>
    </main>
  );
}
