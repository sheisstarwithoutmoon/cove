/**
 * Design tokens for Cove — dark & light themes.
 * Every color in the app references these tokens for full consistency.
 */

export const darkTheme = {
  name: "dark",

  // Backgrounds
  bgPrimary: "#0a0a12",
  bgSecondary: "#0e0e18",
  bgCard: "rgba(255,255,255,0.02)",
  bgElevated: "rgba(255,255,255,0.04)",
  bgHover: "rgba(255,255,255,0.05)",
  bgOverlay: "rgba(0,0,0,0.7)",

  // Borders
  border: "rgba(255,255,255,0.06)",
  borderSubtle: "rgba(255,255,255,0.04)",
  borderStrong: "rgba(255,255,255,0.1)",

  // Text
  textPrimary: "#ffffff",
  textSecondary: "rgba(255,255,255,0.74)",
  textTertiary: "rgba(255,255,255,0.56)",
  textMuted: "rgba(255,255,255,0.40)",

  // Accent — purple
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  accentBg: "rgba(167,139,250,0.08)",
  accentBorder: "rgba(167,139,250,0.18)",
  accentText: "#a78bfa",

  // Status
  success: "#34d399",
  successBg: "rgba(52,211,153,0.08)",
  successBorder: "rgba(52,211,153,0.15)",
  warning: "#fbbf24",
  warningBg: "rgba(251,191,36,0.08)",
  danger: "#f87171",
  dangerBg: "rgba(248,113,113,0.06)",
  dangerBorder: "rgba(248,113,113,0.15)",
  info: "#60a5fa",

  // Agent colors
  agentPdf: "#22d3ee",
  agentOrchestrator: "#a78bfa",
  agentSearch: "#60a5fa",
  agentSummarizer: "#34d399",
  agentVerifier: "#fbbf24",
  agentReporter: "#f87171",

  // Shadows
  shadowSm: "0 1px 3px rgba(0,0,0,0.3)",
  shadowMd: "0 8px 30px rgba(0,0,0,0.4)",
  shadowLg: "0 32px 100px rgba(0,0,0,0.5)",

  // Input
  inputBg: "rgba(255,255,255,0.04)",
  inputBorder: "rgba(255,255,255,0.08)",
  inputText: "#ffffff",
  inputPlaceholder: "rgba(255,255,255,0.45)",

  // Scrollbar
  scrollThumb: "rgba(255,255,255,0.08)",
  scrollThumbHover: "rgba(255,255,255,0.14)",
};

export const lightTheme = {
  name: "light",

  // Backgrounds
  bgPrimary: "#f7f8fa",
  bgSecondary: "#ffffff",
  bgCard: "rgba(0,0,0,0.015)",
  bgElevated: "rgba(0,0,0,0.03)",
  bgHover: "rgba(0,0,0,0.04)",
  bgOverlay: "rgba(255,255,255,0.55)",

  // Borders
  border: "rgba(0,0,0,0.08)",
  borderSubtle: "rgba(0,0,0,0.04)",
  borderStrong: "rgba(0,0,0,0.12)",

  // Text
  textPrimary: "#1a1a2e",
  textSecondary: "rgba(0,0,0,0.76)",
  textTertiary: "rgba(0,0,0,0.62)",
  textMuted: "rgba(0,0,0,0.48)",

  // Accent — purple
  accent: "#7c3aed",
  accentLight: "#a78bfa",
  accentBg: "rgba(124,58,237,0.06)",
  accentBorder: "rgba(124,58,237,0.18)",
  accentText: "#7c3aed",

  // Status
  success: "#059669",
  successBg: "rgba(5,150,105,0.06)",
  successBorder: "rgba(5,150,105,0.15)",
  warning: "#d97706",
  warningBg: "rgba(217,119,6,0.06)",
  danger: "#dc2626",
  dangerBg: "rgba(220,38,38,0.05)",
  dangerBorder: "rgba(220,38,38,0.12)",
  info: "#2563eb",

  // Agent colors
  agentPdf: "#0891b2",
  agentOrchestrator: "#7c3aed",
  agentSearch: "#2563eb",
  agentSummarizer: "#059669",
  agentVerifier: "#d97706",
  agentReporter: "#dc2626",

  // Shadows
  shadowSm: "0 1px 3px rgba(0,0,0,0.06)",
  shadowMd: "0 8px 30px rgba(0,0,0,0.08)",
  shadowLg: "0 32px 100px rgba(0,0,0,0.1)",

  // Input
  inputBg: "rgba(0,0,0,0.02)",
  inputBorder: "rgba(0,0,0,0.1)",
  inputText: "#1a1a2e",
  inputPlaceholder: "rgba(0,0,0,0.52)",

  // Scrollbar
  scrollThumb: "rgba(0,0,0,0.1)",
  scrollThumbHover: "rgba(0,0,0,0.18)",
};
