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
        cream: "var(--cream)",
        "ms-black": "var(--black)",
        yellow: "var(--yellow)",
        coral: "var(--coral)",
        green: "var(--green)",
        purple: "var(--purple)",
        blue: "var(--blue)",
        amber: "var(--amber)",
      },
    },
  },
  plugins: [],
};
export default config;
