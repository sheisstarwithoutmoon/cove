import { useTheme } from "./ThemeContext";
import { IconArrowLeft, IconCheck, IconAlertTriangle, IconExternalLink } from "./Icons";

export default function ReportView({ report, onBack }) {
  const { theme } = useTheme();
  const s = getStyles(theme);

  const confidenceColor = (c) => ({ high: theme.success, medium: theme.warning, low: theme.danger }[c] || theme.textTertiary);
  const confidenceBg = (c) => ({ high: theme.successBg, medium: theme.warningBg, low: theme.dangerBg }[c] || "transparent");

  return (
    <div style={s.wrap}>
      {/* Top bar */}
      <div style={s.topbar}>
        <button style={s.back} onClick={onBack}>
          <IconArrowLeft size={15} color={theme.textPrimary} />
          <span>New Research</span>
        </button>
        <div style={s.statRow}>
          <span style={s.statBadge}>
            <IconCheck size={13} color={theme.success} />
            {report.verifiedCount} verified
          </span>
          {report.flaggedCount > 0 && (
            <span style={{ ...s.statBadge, color: theme.danger, background: theme.dangerBg, borderColor: theme.dangerBorder }}>
              <IconAlertTriangle size={13} color={theme.danger} />
              {report.flaggedCount} flagged
            </span>
          )}
        </div>
      </div>

      <h1 style={s.title}>{report.title}</h1>

      <Section label="Executive Summary" theme={theme}>
        <p style={s.body}>{report.executive_summary}</p>
      </Section>

      <Section label="Key Findings" theme={theme}>
        {report.key_findings?.map((f, i) => (
          <div key={i} style={s.finding}>
            <div style={s.num}>{i + 1}</div>
            <div style={{ flex: 1 }}>
              <p style={s.findingText}>{f.finding}</p>
              {f.source_url && (
                <a href={f.source_url} target="_blank" rel="noopener noreferrer" style={s.link}>
                  <IconExternalLink size={12} color={theme.info} />
                  <span>{f.source_title || f.source_url}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </Section>

      {report.conclusion && (
        <Section label="Conclusion" theme={theme}>
          <p style={s.body}>{report.conclusion}</p>
        </Section>
      )}

      <Section label="Sources & Citation Verification" theme={theme}>
        {report.sources?.map((src, i) => (
          <div key={i} style={s.srcRow}>
            <div style={{
              ...s.statusDot,
              background: src.urlAlive ? theme.success : theme.danger,
              boxShadow: src.urlAlive
                ? `0 0 8px ${theme.successBg}`
                : `0 0 8px ${theme.dangerBg}`,
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={s.srcTitle}>{src.title}</div>
              <a href={src.url} target="_blank" rel="noopener noreferrer" style={s.srcUrl}>
                {src.url.length > 65 ? src.url.slice(0, 65) + "..." : src.url}
              </a>
            </div>
            <div style={{ ...s.badge, color: confidenceColor(src.confidence), background: confidenceBg(src.confidence) }}>
              {src.confidence}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ label, children, theme }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{
        color: theme.textTertiary,
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 2,
        fontWeight: 600,
        marginBottom: 14,
      }}>{label}</div>
      {children}
    </div>
  );
}

function getStyles(t) {
  return {
    wrap: { maxWidth: 780, margin: "0 auto", paddingBottom: 60 },
    topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
    back: {
      background: t.bgElevated,
      border: `1px solid ${t.border}`,
      color: t.textPrimary,
      padding: "8px 16px",
      borderRadius: 8,
      cursor: "pointer",
      fontSize: 13,
      fontWeight: 500,
      display: "flex",
      alignItems: "center",
      gap: 8,
      transition: "all 0.2s ease",
    },
    statRow: { display: "flex", gap: 10 },
    statBadge: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      fontSize: 12,
      fontWeight: 600,
      color: t.success,
      background: t.successBg,
      border: `1px solid ${t.successBorder}`,
      borderRadius: 8,
      padding: "5px 12px",
    },
    title: {
      color: t.textPrimary,
      fontSize: 26,
      fontWeight: 700,
      marginBottom: 32,
      lineHeight: 1.35,
      letterSpacing: "-0.3px",
    },
    body: {
      color: t.textSecondary,
      fontSize: 14.5,
      lineHeight: 1.75,
      margin: 0,
    },
    finding: {
      display: "flex",
      gap: 14,
      background: t.bgCard,
      border: `1px solid ${t.border}`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    num: {
      width: 26,
      height: 26,
      background: t.accentBg,
      color: t.accentText,
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: 11,
      fontWeight: 700,
      flexShrink: 0,
    },
    findingText: {
      color: t.textSecondary,
      fontSize: 13.5,
      lineHeight: 1.65,
      margin: "0 0 8px",
    },
    link: {
      color: t.info,
      fontSize: 12,
      textDecoration: "none",
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
    },
    srcRow: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "14px 0",
      borderBottom: `1px solid ${t.borderSubtle}`,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: "50%",
      flexShrink: 0,
    },
    srcTitle: {
      color: t.textSecondary,
      fontSize: 13,
      marginBottom: 3,
      fontWeight: 500,
    },
    srcUrl: {
      color: t.textMuted,
      fontSize: 12,
      textDecoration: "none",
      display: "block",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    },
    badge: {
      fontSize: 10,
      fontWeight: 700,
      padding: "4px 10px",
      borderRadius: 20,
      textTransform: "uppercase",
      flexShrink: 0,
      letterSpacing: "0.5px",
    },
  };
}