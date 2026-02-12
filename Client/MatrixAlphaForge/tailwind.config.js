/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        alpha: {
          primary: "#8C1FF9",
          surface: "#FFFFFF",
          deep: "#1A1625",
          body: "#4A4557",
          muted: "#8E8AA0",
          border: "#F3F0F8",
          success: "#00C896",
          danger: "#FF4D4D",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
}
