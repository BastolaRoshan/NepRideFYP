/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: "hsl(43 74% 52%)",  // #d4af37
          light: "hsl(45 73% 63%)",     // #e6c758
          dark: "hsl(43 74% 42%)",      // #b8941f
        },
      },
    },
  },
}
