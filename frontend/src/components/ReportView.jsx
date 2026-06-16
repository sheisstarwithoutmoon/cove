import { IconArrowLeft, IconCheck, IconAlertTriangle, IconExternalLink, IconSearch, IconScales, IconBarChart, IconDot } from "./Icons";

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
        <div className="rv-body">
          {report.executive_summary?.split("\n").map((para, idx) => para.trim() && (
            <div key={idx} style={{ marginBottom: 12 }}>{parseMarkdownToElements(para)}</div>
          ))}
        </div>
      </Section>

      {report.comprehensive_analysis && report.comprehensive_analysis.length > 0 && (
        <Section label="Detailed Analysis">
          {report.comprehensive_analysis.map((paragraph, idx) => (
            <div key={idx} style={{ marginBottom: 14 }}>{parseMarkdownToElements(paragraph)}</div>
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

      {/* Contradiction Detection */}
      {report.contradictions && report.contradictions.length > 0 && (
        <Section label={
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconScales size={15} color="var(--text-secondary)" />
            <span>Contradiction Detection</span>
          </span>
        }>
          {report.contradictions.map((c, idx) => (
            <div key={idx} className="rv-contradiction-card" style={{
              background: "var(--surface-secondary, rgba(255, 255, 255, 0.02))",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
            }}>
              <h3 style={{ margin: "0 0 8px 0", fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>{c.topic}</h3>
              {c.consensus && (
                <p className="rv-body" style={{ margin: "0 0 12px 0", fontStyle: "italic", fontSize: "13.5px", color: "var(--text-secondary)" }}>
                  <strong>Consensus Status:</strong> {c.consensus}
                </p>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "12px" }}>
                <div>
                  <h4 style={{ margin: "0 0 6px 0", color: "var(--success)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Supporting Views</h4>
                  {c.supporting_views?.map((v, sIdx) => (
                    <p key={sIdx} className="rv-body" style={{ fontSize: "13px", margin: "0 0 4px 0" }}>
                      • {v.view} <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>[Source idx: {v.source_indices?.join(', ')}]</span>
                    </p>
                  ))}
                </div>
                <div>
                  <h4 style={{ margin: "0 0 6px 0", color: "var(--danger)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Opposing Views</h4>
                  {c.opposing_views?.map((v, oIdx) => (
                    <p key={oIdx} className="rv-body" style={{ fontSize: "13px", margin: "0 0 4px 0" }}>
                      • {v.view} <span style={{ color: "var(--text-muted)", fontSize: "11px" }}>[Source idx: {v.source_indices?.join(', ')}]</span>
                    </p>
                  ))}
                </div>
              </div>
              {c.unresolved_questions && (
                <p className="rv-body" style={{ margin: "8px 0 0 0", fontSize: "13px", borderTop: "1px dashed var(--border-color, rgba(255, 255, 255, 0.08))", paddingTop: "8px", color: "var(--text-secondary)" }}>
                  <strong>Unresolved Questions:</strong> {c.unresolved_questions}
                </p>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Research Gaps */}
      {report.research_gaps && report.research_gaps.length > 0 && (
        <Section label={
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconSearch size={15} color="var(--text-secondary)" />
            <span>Research Gap Discovery</span>
          </span>
        }>
          <div style={{
            background: "var(--surface-secondary, rgba(255, 255, 255, 0.02))",
            borderRadius: "8px",
            padding: "16px",
            border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
            marginBottom: "16px"
          }}>
            {report.research_gaps.map((g, idx) => (
              <div key={idx} style={{ marginBottom: idx === report.research_gaps.length - 1 ? 0 : 16 }}>
                <h3 style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "600", color: "var(--warning)" }}>
                  {idx + 1}. {g.gap}
                </h3>
                <p className="rv-body" style={{ margin: 0, fontSize: "13px" }}>{g.details}</p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Evidence Graph */}
      {report.evidence_graph && report.evidence_graph.length > 0 && (
        <Section label={
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <IconBarChart size={15} color="var(--text-secondary)" />
            <span>Evidence Graph</span>
          </span>
        }>
          {report.evidence_graph.map((eg, idx) => (
            <div key={idx} style={{
              background: "var(--surface-secondary, rgba(255, 255, 255, 0.02))",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "16px",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{ margin: 0, fontSize: "14.5px", fontWeight: "600" }}>{eg.claim}</h3>
                <span style={{
                  padding: "2px 8px",
                  borderRadius: "12px",
                  fontSize: "11px",
                  fontWeight: "bold",
                  background: eg.confidence >= 0.7 ? "rgba(46, 125, 50, 0.15)" : "rgba(239, 108, 0, 0.15)",
                  color: eg.confidence >= 0.7 ? "#4caf50" : "#ff9800",
                }}>
                  Confidence: {Math.round((eg.confidence || 0) * 100)}%
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <h4 style={{ margin: "0 0 6px 0", color: "var(--success)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Supporting Papers</h4>
                  {eg.supporting_sources && eg.supporting_sources.length > 0 ? (
                    eg.supporting_sources.map((src, sIdx) => (
                      <div key={sIdx} style={{ fontSize: "13px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconDot size={8} color="var(--success)" />
                        <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--info)", textDecoration: "none" }}>{src.title}</a>
                      </div>
                    ))
                  ) : (
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>None cited</p>
                  )}
                </div>
                <div>
                  <h4 style={{ margin: "0 0 6px 0", color: "var(--danger)", fontSize: "11px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>Opposing Papers</h4>
                  {eg.opposing_sources && eg.opposing_sources.length > 0 ? (
                    eg.opposing_sources.map((src, oIdx) => (
                      <div key={oIdx} style={{ fontSize: "13px", marginBottom: "4px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconDot size={8} color="var(--danger)" />
                        <a href={src.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--info)", textDecoration: "none" }}>{src.title}</a>
                      </div>
                    ))
                  ) : (
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)" }}>None cited</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </Section>
      )}

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

function parseMarkdownToElements(text) {
  if (!text) return null;
  const lines = text.split("\n");
  let inList = false;
  let listItems = [];
  const elements = [];
  let keyCounter = 0;

  let inTable = false;
  let tableRows = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${keyCounter++}`} style={{ paddingLeft: "20px", marginBottom: "14px", listStyleType: "disc" }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ marginBottom: "6px", fontSize: "14.5px", color: "var(--text-secondary)", lineHeight: "1.6" }}>
              {parseInlineStyles(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = () => {
    if (tableRows.length > 0) {
      const headerRow = tableRows[0];
      const bodyRows = tableRows.slice(1);
      
      elements.push(
        <div key={`table-container-${keyCounter++}`} style={{ overflowX: "auto", marginBottom: "16px", marginTop: "12px" }}>
          <table style={{
            width: "100%",
            borderCollapse: "collapse",
            border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
            fontSize: "13.5px"
          }}>
            <thead>
              <tr style={{ background: "rgba(255, 255, 255, 0.03)" }}>
                {headerRow.map((cell, idx) => (
                  <th key={idx} style={{
                    padding: "10px 14px",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                    fontWeight: "600",
                    textAlign: "left"
                  }}>
                    {parseInlineStyles(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bodyRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))" }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{
                      padding: "10px 14px",
                      border: "1px solid var(--border-color, rgba(255,255,255,0.08))",
                      color: "var(--text-secondary)"
                    }}>
                      {parseInlineStyles(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }
  };

  for (let line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      if (inTable) flushTable();
      inList = true;
      listItems.push(trimmed.substring(2));
      continue;
    } else {
      if (inList) flushList();
    }

    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (inList) flushList();
      inTable = true;
      const cells = line.split("|").slice(1, -1);
      if (cells.every(c => c.trim().match(/^-+$/))) {
        continue;
      }
      tableRows.push(cells);
      continue;
    } else {
      if (inTable) flushTable();
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${keyCounter++}`} style={{ fontSize: "15.5px", fontWeight: "600", color: "var(--text-primary)", marginTop: "20px", marginBottom: "8px" }}>
          {parseInlineStyles(trimmed.substring(4))}
        </h3>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${keyCounter++}`} style={{ fontSize: "17.5px", fontWeight: "600", color: "var(--text-primary)", marginTop: "24px", marginBottom: "12px" }}>
          {parseInlineStyles(trimmed.substring(3))}
        </h2>
      );
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${keyCounter++}`} style={{ fontSize: "20.5px", fontWeight: "700", color: "var(--text-primary)", marginTop: "28px", marginBottom: "16px" }}>
          {parseInlineStyles(trimmed.substring(2))}
        </h1>
      );
    } else if (trimmed === "" || trimmed === "---") {
      if (trimmed === "---") {
        elements.push(<hr key={`hr-${keyCounter++}`} style={{ border: "0", borderTop: "1px solid var(--border-color, rgba(255,255,255,0.08))", margin: "20px 0" }} />);
      }
    } else {
      elements.push(
        <p key={`p-${keyCounter++}`} className="rv-body" style={{ marginBottom: "14px", lineHeight: "1.6" }}>
          {parseInlineStyles(line)}
        </p>
      );
    }
  }

  if (inList) flushList();
  if (inTable) flushTable();

  return elements;
}

function parseInlineStyles(text) {
  if (!text) return "";
  const parts = text.split(/\*\*([\s\S]*?)\*\*/g);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return <strong key={i} style={{ color: "var(--text-primary)", fontWeight: "600" }}>{part}</strong>;
    }
    return part;
  });
}