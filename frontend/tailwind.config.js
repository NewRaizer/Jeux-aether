/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#EFEDE4",
        surface: "#FBFAF5",
        ink: "#15151B",
        muted: "#73726B",
        hairline: "#D6D3C6",
        accent: "#3A33FF",
        "accent-press": "#2620C9",
        success: "#1C7A55",
        warning: "#A8721A",
        danger: "#C13C2A",
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "sans-serif"],
        sans: ['"IBM Plex Sans"', "sans-serif"],
        mono: ['"IBM Plex Mono"', "monospace"],
      },
      borderRadius: {
        DEFAULT: "0px",
      },
      boxShadow: {
        hard: "5px 5px 0 #15151B",
        "hard-sm": "3px 3px 0 #15151B",
        "hard-accent": "5px 5px 0 #3A33FF",
      },
      letterSpacing: {
        eyebrow: "0.18em",
      },
    },
  },
  plugins: [],
};
