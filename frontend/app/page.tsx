import OthelloBoard from "@/components/othelloBoard";

export default function Home() {
  return (
    <main className="w-full max-w-5xl mx-auto min-w-0">
      <div className="mt-4 sm:mt-6">
        <OthelloBoard />
      </div>
    </main>
  );
}
