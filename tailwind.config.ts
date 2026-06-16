import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bw: {
          dark: "#020617",
          navy: "#0f172a",
          blue: "#2563eb",
          cyan: "#22d3ee",
          light: "#e5e7eb",
        },
      },
    },
  },
  plugins: [],
};

export default config;
