import type { Config } from "tailwindcss";
import { nextui } from "@nextui-org/theme";

/** Paleta corporativa Flexiplast (logo) */
const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        flexi: {
          brand: "#E31E24",
          "brand-dark": "#C41A22",
          "brand-light": "#FF4A52",
          navy: "#1D3A6C",
          "navy-dark": "#152E52",
          "navy-light": "#2A5085",
          surface: "#F0F3F8",
          muted: "#E8EDF5",
        },
      },
      boxShadow: {
        flexi: "0 4px 24px -4px rgba(29, 58, 108, 0.15)",
      },
    },
  },
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary: {
              DEFAULT: "#1D3A6C",
              foreground: "#ffffff",
            },
            secondary: {
              DEFAULT: "#E31E24",
              foreground: "#ffffff",
            },
            background: "#f0f3f8",
            foreground: "#1a2744",
          },
        },
      },
    }),
  ],
};
export default config;
