import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  // Garante que classes construídas dinamicamente (objetos JS, template strings)
  // são sempre incluídas no bundle CSS — sem isto o Tailwind JIT não as deteta.
  safelist: [
    // WorldBtn — gradientes ativos
    "from-world-seg", "to-world-seg-dark",
    "from-world-esc", "to-world-esc-dark",
    "from-world-eco", "to-world-eco-dark",
    // WorldBtn — sombras
    "world-btn-seg-shadow", "world-btn-esc-shadow", "world-btn-eco-shadow",
    // WorldBtn — ícone inativo
    "bg-world-seg/8", "text-world-seg",
    "bg-world-esc/8", "text-world-esc",
    "bg-world-eco/8", "text-world-eco",
    // Hero rotativo — badges e fundos
    "bg-world-seg/10", "border-world-seg/20",
    "bg-world-esc/10", "border-world-esc/20",
    "bg-world-eco/10", "border-world-eco/20",
    "from-world-seg/10", "via-world-seg/4",
    "from-world-esc/10", "via-world-esc/4",
    "from-world-eco/10", "via-world-eco/4",
    // Indicadores hero e botões ativos
    "bg-world-seg", "bg-world-esc", "bg-world-eco",
    // WorldCatalog — category strip
    "from-world-seg/6", "from-world-esc/6", "from-world-eco/6",
    "bg-world-seg/15", "bg-world-esc/15", "bg-world-eco/15",
    // WorldBtn inativo — border base
    "border-world-seg/25", "border-world-esc/25", "border-world-eco/25",
    // WorldBtn inativo — border hover (pattern+variants para Tailwind v3)
    {
      pattern: /border-world-(seg|esc|eco)\/(25|50)/,
      variants: ["hover"],
    },
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1600px",
      },

    },
    fontFamily: {
        heading: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        /* Cores dos mundos VRCF — usadas nos WorldBtn, hero, badges */
        "world-seg": {
          DEFAULT: "hsl(var(--world-seg))",
          light:   "hsl(var(--world-seg-light))",
          dark:    "hsl(var(--world-seg-dark))",
        },
        "world-esc": {
          DEFAULT: "hsl(var(--world-esc))",
          light:   "hsl(var(--world-esc-light))",
          dark:    "hsl(var(--world-esc-dark))",
        },
        "world-eco": {
          DEFAULT: "hsl(var(--world-eco))",
          light:   "hsl(var(--world-eco-light))",
          dark:    "hsl(var(--world-eco-dark))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
