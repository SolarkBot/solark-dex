import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#05080c",
        panel: "#0b1016",
        line: "rgba(135, 165, 195, 0.14)",
        cyan: "#82d7ff",
        blue: "#4a8dff",
        mist: "#8ea3b9",
        success: "#8ce9c7",
        danger: "#ff7b7b",
      },
      boxShadow: {
        panel: "0 30px 80px rgba(0, 0, 0, 0.45)",
      },
      backgroundImage: {
        "scene-grid":
          "linear-gradient(rgba(122, 154, 187, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(122, 154, 187, 0.06) 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};

export default config;
