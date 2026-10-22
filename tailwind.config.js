/** @type {import('tailwindcss').Config} */
// Token desain "Zovora" — sinkron dengan docs/PATTERN DESIGN.txt §2 dan
// src/theme/tokens.ts. Jangan menulis hex langsung di komponen.
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./screens/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Skala Sky (guideline §2.1). `DEFAULT` dipertahankan agar kelas lama
        // `bg-primary` / `text-primary` di layar W0 tetap resolve ke brand.
        primary: {
          DEFAULT: "#0284C7",
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
        },
        // Skala Slate.
        neutral: {
          DEFAULT: "#64748B",
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        success: { 50: "#F0FDF4", 100: "#DCFCE7", 500: "#22C55E", 700: "#15803D" },
        warning: { 50: "#FFFBEB", 100: "#FEF3C7", 500: "#F59E0B", 700: "#B45309" },
        danger: { 50: "#FEF2F2", 100: "#FEE2E2", 500: "#EF4444", 700: "#B91C1C" },
        peach: { 100: "#FFEDD5", 200: "#FED7AA", 300: "#FDBA74" },
        // Alias lama (layar W0) — dipetakan ke token Zovora terdekat.
        secondary: "#0EA5E9",
        accent: "#7DD3FC",
        background: "#F8FAFC",
      },
      fontFamily: {
        inter: ["Inter_400Regular"],
        "inter-medium": ["Inter_500Medium"],
        "inter-semibold": ["Inter_600SemiBold"],
        "inter-bold": ["Inter_700Bold"],
      },
      fontSize: {
        caption: ["10px", "14px"],
        xs: ["12px", "16px"],
        sm: ["14px", "20px"],
        base: ["16px", "24px"],
        lg: ["18px", "24px"],
        xl: ["20px", "26px"],
        "2xl": ["24px", "30px"],
        "4xl": ["32px", "38px"],
      },
      borderRadius: {
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "24px",
      },
      boxShadow: {
        bar: "0 -2px 8px rgba(15,23,42,0.06)",
        float: "0 2px 8px rgba(15,23,42,0.12)",
        modal: "0 8px 24px rgba(15,23,42,0.20)",
      },
    },
  },
  plugins: [],
};
