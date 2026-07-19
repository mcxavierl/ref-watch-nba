import type { Config } from "tailwindcss";

/** Tailwind config consumed by Satori when rendering dashboard OG images. */
const config: Config = {
  content: ["./src/components/og-components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
};

export default config;
