module.exports = {
    darkMode: ["class"],
    content: [
      "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    safelist: [
      'bg-gradient-to-br',
      'from-blue-600',
      'to-purple-600',
    ],
    theme: {
      extend: {
        // your extended config...
      },
    },
    plugins: [require("tailwindcss-animate")],
  }
  