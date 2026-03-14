import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { useTheme } from "./ThemeContext";
import { IconSearch, IconBrain, IconGlobe, IconFileText, IconShield, IconEdit, IconSun, IconMoon } from "./Icons";

export default function Login() {
  const { theme, isDark, toggleTheme } = useTheme();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  const s = getStyles(theme, isDark);

  return (
    <div style={s.page}>
      <div style={s.glow} />

      {/* Theme toggle — top right */}
      <button style={s.themeToggle} onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
        {isDark ? <IconSun size={16} color={theme.textTertiary} /> : <IconMoon size={16} color={theme.textTertiary} />}
      </button>

      <div style={s.card}>
        <div style={s.logoCircle}>
          <IconSearch size={26} color={theme.accentText} />
        </div>
        <h1 style={s.title}>Cove</h1>
        <p style={s.sub}>
          Multi-agent AI research with verified citations.
          <br />
          No hallucinations. Every source checked.
        </p>

        <div style={s.features}>
          {[
            [IconBrain, "Orchestrator breaks down your query"],
            [IconGlobe, "Search agent finds real sources"],
            [IconFileText, "Summarizer extracts key claims"],
            [IconShield, "Verifier checks every citation"],
            [IconEdit, "Report writer compiles findings"],
          ].map(([Icon, text], i) => (
            <div key={i} style={s.feature}>
              <div style={s.featureIcon}>
                <Icon size={15} color={theme.accentLight} />
              </div>
              <span>{text}</span>
            </div>
          ))}
        </div>

        <button style={s.btn} onClick={handleLogin}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10, flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

function getStyles(t, isDark) {
  return {
    page: {
      minHeight: "100vh",
      background: t.bgPrimary,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
    },
    glow: {
      position: "absolute",
      width: 500,
      height: 500,
      borderRadius: "50%",
      background: isDark
        ? "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)"
        : "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%)",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      pointerEvents: "none",
    },
    themeToggle: {
      position: "absolute",
      top: 20,
      right: 20,
      background: t.bgElevated,
      border: `1px solid ${t.border}`,
      borderRadius: 10,
      padding: "8px 10px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
      transition: "all 0.2s ease",
    },
    card: {
      background: isDark ? "rgba(255,255,255,0.03)" : "#ffffff",
      backdropFilter: "blur(24px)",
      border: `1px solid ${t.border}`,
      borderRadius: 20,
      padding: "48px 42px",
      maxWidth: 440,
      width: "90%",
      textAlign: "center",
      position: "relative",
      zIndex: 1,
      boxShadow: t.shadowMd,
    },
    logoCircle: {
      width: 56,
      height: 56,
      borderRadius: 16,
      background: t.accentBg,
      border: `1px solid ${t.accentBorder}`,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20,
    },
    title: {
      color: t.textPrimary,
      fontSize: 30,
      fontWeight: 700,
      margin: "0 0 10px",
      letterSpacing: "-0.5px",
    },
    sub: {
      color: t.textTertiary,
      fontSize: 14,
      lineHeight: 1.65,
      margin: "0 0 32px",
    },
    features: {
      marginBottom: 32,
      textAlign: "left",
    },
    feature: {
      color: t.textSecondary,
      fontSize: 13,
      padding: "10px 0",
      borderBottom: `1px solid ${t.borderSubtle}`,
      display: "flex",
      alignItems: "center",
      gap: 12,
    },
    featureIcon: {
      width: 32,
      height: 32,
      borderRadius: 8,
      background: t.accentBg,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    btn: {
      background: isDark ? "#fff" : t.accent,
      color: isDark ? "#1a1a2e" : "#fff",
      border: "none",
      borderRadius: 10,
      padding: "12px 28px",
      fontSize: 14,
      fontWeight: 600,
      cursor: "pointer",
      display: "inline-flex",
      alignItems: "center",
      transition: "all 0.2s ease",
    },
  };
}