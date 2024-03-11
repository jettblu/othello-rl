import OthelloBoard from "@/components/othelloBoard";

export default function Page({ params }: { params: { id: string } }) {
  const id = params.id;
  let realtimeConfig = {
    gameId: id,
  };
  return (
    <main className="max-w-5xl mx-auto">
      <div className="mt-6">
        <OthelloBoard realtimeConfig={realtimeConfig} />
      </div>
    </main>
  );
}
