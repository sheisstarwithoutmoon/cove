import { useTheme } from "./ThemeContext";
import useResponsive from "../hooks/useResponsive";
import { IconPaperclip, IconBrain, IconGlobe, IconFileText, IconShield, IconEdit, IconCheck, IconLoader } from "./Icons";

export default function AgentProgress({ updates }) {
  const { theme, isDark } = useTheme();
  const isMobile = useResponsive(900);

  const AGENTS = {
    pdf:          { Icon: IconPaperclip,  label: "PDF Context",       color: theme.agentPdf },
    orchestrator: { Icon: IconBrain,      label: "Orchestrator",      color: theme.agentOrchestrator },
    search:       { Icon: IconGlobe,      label: "Search Agent",      color: theme.agentSearch },
    summarizer:   { Icon: IconFileText,   label: "Summarizer",        color: theme.agentSummarizer },
    verifier:     { Icon: IconShield,     label: "Citation Verifier", color: theme.agentVerifier },
    reporter:     { Icon: IconEdit,       label: "Report Writer",     color: theme.agentReporter },
  };

  const hasPdf = updates.some((x) => x.agent === "pdf");
  const ORDER = hasPdf 
    ? ["pdf", "orchestrator", "search", "summarizer", "verifier", "reporter"]
    : ["orchestrator", "search", "summarizer", "verifier", "reporter"];

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

  return (
    <div className="ap-box">
      <div className="ap-heading">Research Pipeline</div>
      {ORDER.map((key, i) => {
        const a = AGENTS[key];
        const status = getStatus(key);
        const Icon = a.Icon;
        return (
          <div key={key}>
            <div className={`ap-row ${status === "pending" ? (isDark ? "pending-dark" : "pending-light") : ""}`}>
              <div 
                className="ap-icon"
                style={{
                  background: status === "done" ? a.color + "14" : "var(--bg-elevated)",
                  borderColor: status !== "pending" ? a.color : "var(--border)",
                }}
              >
                <Icon size={18} color={status !== "pending" ? a.color : "var(--text-muted)"} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="ap-name" style={{ color: status === "done" ? a.color : "var(--text-primary)" }}>
                  {a.label}
                </div>
                <div className="ap-msg">{getMessage(key)}</div>
              </div>
              <div className="ap-status-badge">
                {status === "running" && <IconLoader size={14} color="var(--info)" />}
                {status === "done" && <IconCheck size={14} color={a.color} />}
              </div>
            </div>
            {i < ORDER.length - 1 && <div className="ap-line" />}
          </div>
        );
      })}
    </div>
  );
}