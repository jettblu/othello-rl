import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        phosphor: "var(--phosphor)",
        amber: "var(--amber)",
        crt: {
          bg: "var(--ink)",
          dim: "var(--crt-dim)",
          line: "var(--crt-line)",
          phosphor: "var(--phosphor)",
          amber: "var(--amber)",
        },
        p1: "var(--phosphor)",
        p2: "var(--amber)",
      },
      fontFamily: {
        mono: ["var(--font-plex-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
