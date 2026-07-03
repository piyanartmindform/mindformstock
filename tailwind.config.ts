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
          DEFAULT: "#2B9ED4",
          50: "#EBF6FC",
          100: "#D7EDF9",
          200: "#AFDAF3",
          300: "#87C8EC",
          400: "#5FB5E6",
          500: "#2B9ED4",
          600: "#227FAA",
          700: "#1A607F",
          800: "#114055",
          900: "#09202A",
        },
      },
    },
  },
  plugins: [],
};

export default config;
