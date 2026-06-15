import { IconArrowLeft, IconCheck, IconAlertTriangle, IconExternalLink } from "./Icons";

export default function ReportView({ report, onBack }) {
  const confidenceColor = (c) => ({ high: "var(--success)", medium: "var(--warning)", low: "var(--danger)" }[c] || "var(--text-tertiary)");
  const confidenceBg = (c) => ({ high: "var(--success-bg)", medium: "var(--warning-bg)", low: "var(--danger-bg)" }[c] || "transparent");

  return (
    <div className="rv-wrap">
      {/* Top bar */}
      <div className="rv-topbar">
        <button className="rv-back" onClick={onBack}>
          <IconArrowLeft size={15} color="var(--text-primary)" />
          <span>New Research</span>
        </button>
        <div className="rv-stat-row">
          <span className="rv-stat-badge">
            <IconCheck size={13} color="var(--success)" />
            {report.verifiedCount} verified
          </span>
          {report.flaggedCount > 0 && (
            <span className="rv-stat-badge rv-stat-danger">
              <IconAlertTriangle size={13} color="var(--danger)" />
              {report.flaggedCount} flagged
            </span>
          )}
        </div>
      </div>

      <h1 className="rv-title">{report.title}</h1>

      <Section label="Executive Summary">
        <p className="rv-body">{report.executive_summary}</p>
      </Section>

      {report.comprehensive_analysis && report.comprehensive_analysis.length > 0 && (
        <Section label="Detailed Analysis">
          {report.comprehensive_analysis.map((paragraph, idx) => (
            <p key={idx} className="rv-body" style={{ marginBottom: 14 }}>{paragraph}</p>
          ))}
        </Section>
      )}

      <Section label="Key Findings">
        {report.key_findings?.map((f, i) => (
          <div key={i} className="rv-finding">
            <div className="rv-num">{i + 1}</div>
            <div style={{ flex: 1 }}>
              <p className="rv-finding-text">{f.finding}</p>
              {f.source_url && (
                <a href={f.source_url} target="_blank" rel="noopener noreferrer" className="rv-link">
                  <IconExternalLink size={12} color="var(--info)" />
                  <span>{f.source_title || f.source_url}</span>
                </a>
              )}
            </div>
          </div>
        ))}
      </Section>

      {report.conclusion && (
        <Section label="Conclusion">
          <p className="rv-body">{report.conclusion}</p>
        </Section>
      )}

      <Section label="Sources & Citation Verification">
        {report.sources?.map((src, i) => (
          <div key={i} className="rv-src-row">
            <div 
              className={`rv-status-dot ${src.urlAlive ? "rv-status-alive" : "rv-status-dead"}`} 
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="rv-src-title">{src.title}</div>
              <a href={src.url} target="_blank" rel="noopener noreferrer" className="rv-src-url">
                {src.url.length > 65 ? src.url.slice(0, 65) + "..." : src.url}
              </a>
            </div>
            <div className="rv-badge" style={{ color: confidenceColor(src.confidence), background: confidenceBg(src.confidence) }}>
              {src.confidence}
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

function Section({ label, children }) {
  return (
    <div style={{ marginBottom: 36 }}>
      <div className="rv-section-label">{label}</div>
      {children}
    </div>
  );
}