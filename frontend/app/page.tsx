import Image from "next/image";
import OthelloBoard from "@/components/othelloBoard";
import store from "@/store";

export default function Home() {
  return (
    <main className="max-w-5xl mx-auto">
      <div className="mt-6">
        <OthelloBoard />
      </div>
    </main>
  );
}
