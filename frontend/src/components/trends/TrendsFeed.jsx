import { useTheme } from "../ThemeContext";
import { IconTrendingUp, IconLoader, IconExternalLink } from "../Icons";

export default function TrendsFeed({ selectedInterests, trendsLoading, aiTrends }) {
  const { theme } = useTheme();

  return (
    <div className="section-card">
      <div className="section-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <IconTrendingUp size={13} color={theme.textMuted} />
        Latest research — {selectedInterests.join(", ") || "General"}
      </div>
      <div className="trends-grid">
        {trendsLoading && <div className="trends-loading"><IconLoader size={14} color={theme.textMuted} /> Loading papers...</div>}
        {!trendsLoading && aiTrends.length === 0 && <p className="trends-empty">Could not load trends right now.</p>}
        {!trendsLoading && aiTrends.map((item, idx) => (
          <a key={`${item.link}-${idx}`} href={item.link} target="_blank" rel="noopener noreferrer" className="trend-card">
            <div className="trend-title">{item.title}</div>
            <div className="trend-meta">{item.source} · {new Date(item.published).toLocaleDateString()}</div>
            <div className="trend-summary">{item.summary?.slice(0, 200)}...</div>
            <div className="trend-link"><IconExternalLink size={11} color={theme.textMuted} /> Read paper</div>
          </a>
        ))}
      </div>
    </div>
  );
}
