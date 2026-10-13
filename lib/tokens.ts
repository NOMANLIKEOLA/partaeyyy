// Single source of truth for design values — components reference these,
// never raw hex or magic numbers.
export const tokens = {
  color: {
    ink: "var(--color-ink)",
    panel: "var(--color-panel)",
    panel2: "var(--color-panel2)",
    hairline: "var(--color-hairline)",
    paper: "var(--color-paper)",
    paperDim: "var(--color-paperDim)",
    amber: "var(--color-amber)",
    coral: "var(--color-coral)",
    teal: "var(--color-teal)"
  },
  radius: {
    sm: "8px",
    md: "10px",
    lg: "14px",
    pill: "999px"
  },
  motion: {
    fast: "0.15s",
    base: "0.25s",
    slow: "0.4s",
    easeOut: [0.16, 1, 0.3, 1] as const,
    spring: { type: "spring", stiffness: 260, damping: 22 } as const
  },
  space: {
    xs: "0.5rem",
    sm: "0.75rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2.5rem"
  }
} as const;