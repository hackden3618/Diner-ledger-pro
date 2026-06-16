/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        card: "var(--card)",
        input: "var(--input)",
        foreground: "var(--foreground)",
        muted: "var(--muted)",
        "muted-foreground": "var(--muted-foreground)",
        "muted-dark": "var(--muted-dark)",
        border: "var(--border)",
        "border-light": "var(--border-light)",
        "border-strong": "var(--border-strong)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        danger: "var(--danger)",
        destructive: "var(--destructive)",
        warning: "var(--warning)",
        info: "var(--info)",
      },
    },
  },
  plugins: [],
};
