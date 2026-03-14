import { useTheme } from "./ThemeContext";
import { IconPaperclip, IconBrain, IconGlobe, IconFileText, IconShield, IconEdit, IconCheck, IconLoader } from "./Icons";

export default function AgentProgress({ updates }) {
  const { theme, isDark } = useTheme();

  const AGENTS = {
    pdf:          { Icon: IconPaperclip,  label: "PDF Context",       color: theme.agentPdf },
    orchestrator: { Icon: IconBrain,      label: "Orchestrator",      color: theme.agentOrchestrator },
    search:       { Icon: IconGlobe,      label: "Search Agent",      color: theme.agentSearch },
    summarizer:   { Icon: IconFileText,   label: "Summarizer",        color: theme.agentSummarizer },
    verifier:     { Icon: IconShield,     label: "Citation Verifier", color: theme.agentVerifier },
    reporter:     { Icon: IconEdit,       label: "Report Writer",     color: theme.agentReporter },
  };

  const ORDER = ["pdf", "orchestrator", "search", "summarizer", "verifier", "reporter"];

  const getStatus = (key) => {
    const u = updates.filter((x) => x.agent === key);
    if (!u.length) return "pending";
    const last = u[u.length - 1];
    return last.type === "agent_done" ? "done" : "running";
  };
  const getMessage = (key) => {
    const u = updates.filter((x) => x.agent === key);
    return u.length ? u[u.length - 1].message : "Waiting...";
  };

  const s = getStyles(theme);

  return (
    <div style={s.box}>
      <div style={s.heading}>Research Pipeline</div>
      {ORDER.map((key, i) => {
        const a = AGENTS[key];
        const status = getStatus(key);
        const Icon = a.Icon;
        return (
          <div key={key}>
            <div style={{ ...s.row, opacity: status === "pending" ? (isDark ? 0.55 : 0.72) : 1 }}>
              <div style={{
                ...s.icon,
                background: status === "done" ? a.color + "14" : theme.bgElevated,
                borderColor: status !== "pending" ? a.color : theme.border,
              }}>
                <Icon size={18} color={status !== "pending" ? a.color : theme.textMuted} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ ...s.name, color: status === "done" ? a.color : theme.textPrimary }}>
                  {a.label}
                </div>
                <div style={s.msg}>{getMessage(key)}</div>
              </div>
              <div style={s.statusBadge}>
                {status === "running" && <IconLoader size={14} color={theme.info} />}
                {status === "done" && <IconCheck size={14} color={a.color} />}
              </div>
            </div>
            {i < ORDER.length - 1 && <div style={s.line} />}
          </div>
        );
      })}
    </div>
  );
}

function getStyles(theme) {
  return {
    box: {
      background: theme.bgCard,
      border: `1px solid ${theme.border}`,
      borderRadius: 14,
      padding: "22px 24px",
      marginBottom: 24,
    },
    heading: {
      color: theme.textTertiary,
      fontSize: 11,
      textTransform: "uppercase",
      letterSpacing: 2,
      fontWeight: 600,
      marginBottom: 20,
    },
    row: {
      display: "flex",
      alignItems: "center",
      gap: 14,
      padding: "8px 0",
      transition: "opacity 0.3s ease",
    },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      border: "1px solid",
      transition: "all 0.3s ease",
    },
    name: {
      fontSize: 13,
      fontWeight: 600,
      marginBottom: 2,
      transition: "color 0.3s ease",
    },
    msg: {
      fontSize: 13,
      color: theme.textMuted,
    },
    statusBadge: {
      width: 20,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    line: {
      marginLeft: 20,
      width: 1,
      height: 12,
      borderLeft: `1px dashed ${theme.borderSubtle}`,
      margin: "1px 0 1px 20px",
    },
  };
}