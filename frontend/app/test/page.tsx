"use client";

import { DEFAULT_BACKEND_HOST, DEFAULT_BACKEND_URL } from "@/constants";

export default function Home() {
  // set up web socket connection
  const ws = new WebSocket(`ws://${DEFAULT_BACKEND_HOST}/ws`);
  ws.onopen = () => {
    console.log("connected");
    // send message to server
    ws.send("Hello, Server");
    // join room
    ws.send(JSON.stringify({ type: "join", name: "test" }));
  };
  ws.onmessage = (event) => {
    console.log(event.data);
  };
  ws.onclose = () => {
    console.log("disconnected");
  };

  return (
    <main className="max-w-5xl mx-auto">
      <div className="mt-6">
        <h2 className="text-2xl font-bold">Websocket Test</h2>
      </div>
    </main>
  );
}
