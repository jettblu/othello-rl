import toast from "react-hot-toast";
export default function ShareGameButton({ url: url }: { url: string }) {
  function handleCopy() {
    navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard");
  }
  return (
    <div className="flex justify-center">
      <button
        onClick={handleCopy}
        className="bg-gray-800 text-white px-4 py-2 rounded-lg"
      >
        Share game
      </button>
    </div>
  );
}
