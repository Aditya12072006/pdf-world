import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          500: "#2563eb",
          600: "#1d4ed8",
          900: "#0b1f4d",
        },
      },
      boxShadow: {
        card: "0 10px 35px rgba(11, 31, 77, 0.08)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at 20% 20%, rgba(37,99,235,0.22), transparent 55%), radial-gradient(circle at 85% 30%, rgba(11,31,77,0.18), transparent 50%)",
      },
    },
  },
  plugins: [],
};

export default config;
