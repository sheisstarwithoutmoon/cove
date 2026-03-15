import { useState, useEffect, useRef } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { useTheme } from "./ThemeContext";
import AgentProgress from "./AgentProgress";
import ReportView from "./ReportView";
import axios from "axios";
import {
  IconSearch, IconPlus, IconPaperclip, IconArrowRight, IconLogOut,
  IconTarget, IconCheck, IconX, IconAlertTriangle, IconClock,
  IconBrain, IconGlobe, IconFileText, IconShield, IconEdit,
  IconTrendingUp, IconMenu, IconChevronLeft, IconExternalLink, IconLoader,
  IconSun, IconMoon,
} from "./Icons";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Dashboard({ user }) {
  const { theme, isDark, toggleTheme } = useTheme();

  const INTEREST_OPTIONS = [
    "Healthcare AI", "Finance AI", "Robotics", "Computer Vision",
    "NLP / LLMs", "AI Safety", "Cybersecurity", "Education AI",
  ];

  const [query, setQuery] = useState("");
  const [view, setView] = useState("home");
  const [agentUpdates, setAgentUpdates] = useState([]);
  const [report, setReport] = useState(null);
  const [pastReports, setPastReports] = useState([]);
  const [error, setError] = useState(null);

  const [pdfFile, setPdfFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState(null);

  const [selectedInterests, setSelectedInterests] = useState([]);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [savingInterests, setSavingInterests] = useState(false);
  const [interestsLoaded, setInterestsLoaded] = useState(false);

  const [aiTrends, setAiTrends] = useState([]);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 900);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [hoveredHistItem, setHoveredHistItem] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    function handleResize() {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setMobileSidebarOpen(false);
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  async function getToken() {
    return await auth.currentUser.getIdToken();
  }

  async function loadHistory() {
    try {
      const token = await getToken();
      const { data } = await axios.get(`${API}/reports`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPastReports(data.reports || []);
    } catch (e) {
      console.error("Failed to load history:", e.message);
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    async function loadProfileAndTrends() {
      setTrendsLoading(true);
      try {
        const token = await getToken();
        const { data: profile } = await axios.get(`${API}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const interests = Array.isArray(profile?.interests) ? profile.interests : [];
        setSelectedInterests(interests);
        setInterestsLoaded(true);
        if (interests.length === 0) setShowInterestModal(true);

        const interestQuery = interests.join(",");
        const trendsResponse = await axios.get(`${API}/ai-trends`, {
          params: interestQuery ? { interests: interestQuery } : undefined,
        });
        setAiTrends(trendsResponse.data?.trends || []);
      } catch (e) {
        console.error("Failed to load profile/trends:", e.message);
        setInterestsLoaded(true);
      } finally {
        setTrendsLoading(false);
      }
    }
    loadProfileAndTrends();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveInterestsAndLoadTrends() {
    if (selectedInterests.length === 0) return;
    setSavingInterests(true);
    try {
      const token = await getToken();
      await axios.put(`${API}/profile`, { interests: selectedInterests }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const interestQuery = selectedInterests.join(",");
      const { data } = await axios.get(`${API}/ai-trends`, { params: { interests: interestQuery } });
      setAiTrends(data.trends || []);
      setShowInterestModal(false);
    } catch (e) {
      console.error("Failed to save interests:", e.message);
      setError("Could not save interests. Please try again.");
    } finally {
      setSavingInterests(false);
    }
  }

  function toggleInterest(interest) {
    setSelectedInterests((prev) => {
      if (prev.includes(interest)) return prev.filter((x) => x !== interest);
      if (prev.length >= 4) return prev;
      return [...prev, interest];
    });
  }

  async function processPdfContext(file) {
    if (!file) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(`${API}/pdf/context`, formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });
      return data;
    } catch (e) {
      setPdfError(e?.response?.data?.error || "Failed to process attached PDF.");
      return null;
    } finally {
      setPdfLoading(false);
    }
  }

  function handlePdfIconClick() { fileInputRef.current?.click(); }
  function handlePdfFileSelected(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFile(file);
    setPdfError(null);
    e.target.value = "";
  }

  async function handlePrimaryAction() {
    if (!query.trim()) return;
    setView("researching");
    setAgentUpdates([]);
    setReport(null);
    setError(null);
    try {
      const token = await getToken();
      let payload = { query };
      if (pdfFile) {
        setAgentUpdates([{ type: "agent_start", agent: "pdf", message: `Reading ${pdfFile.name}...` }]);
        const pdfData = await processPdfContext(pdfFile);
        if (!pdfData?.context) { setError("Could not read PDF context. Try another file."); setView("home"); return; }
        setAgentUpdates((prev) => [...prev, { type: "agent_done", agent: "pdf", message: `Attached context from ${pdfData.meta?.pageCount || 0} pages` }]);
        payload = { query, pdfContext: pdfData.context, pdfMeta: pdfData.meta };
      }
      const response = await fetch(`${API}/research/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok || !response.body) {
        throw new Error("Failed to start research stream");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          buffer += decoder.decode();
        } else {
          buffer += decoder.decode(value, { stream: true });
        }

        const events = buffer.split("\n\n");
        buffer = done ? "" : events.pop() || "";

        for (const event of events) {
          const lines = event
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("data:"));

          if (!lines.length) continue;

          const payloadText = lines.map((line) => line.replace(/^data:\s?/, "")).join("\n");
          try {
            const data = JSON.parse(payloadText);
            if (data.type === "complete") { setReport(data.report); setView("report"); loadHistory(); }
            else if (data.type === "error") { setError(data.message); setView("home"); }
            else { setAgentUpdates((prev) => [...prev, data]); }
          } catch {}
        }

        if (done) break;
      }
    } catch (e) {
      console.error("Research error:", e);
      setError("Something went wrong. Please try again.");
      setView("home");
    }
  }

  const EXAMPLES = [
    "Impact of AI on healthcare in 2024",
    "Latest breakthroughs in quantum computing",
    "How does CRISPR gene editing work?",
  ];

  const PIPELINE_STEPS = [
    { Icon: IconBrain, name: "Orchestrator", desc: "Breaks query into sub-questions" },
    { Icon: IconGlobe, name: "Search Agent", desc: "Finds real sources via Tavily" },
    { Icon: IconFileText, name: "Summarizer", desc: "Extracts key claims" },
    { Icon: IconShield, name: "Verifier", desc: "Checks every citation is real" },
    { Icon: IconEdit, name: "Reporter", desc: "Compiles final report" },
  ];

  const s = getStyles(theme, isDark, isMobile);
  const sidebarWidth = isMobile ? 252 : (sidebarCollapsed ? 58 : 252);

  return (
    <div style={s.page}>
      {isMobile && mobileSidebarOpen && <div style={s.sidebarOverlay} onClick={() => setMobileSidebarOpen(false)} />}

      {/* ── Interest Modal ── */}
      {showInterestModal && interestsLoaded && (
        <div style={s.modalOverlay}>
          <div style={s.modalCard}>
            <div style={s.modalIcon}>
              <IconTarget size={24} color={theme.accentText} />
            </div>
            <h2 style={s.modalTitle}>Personalize your feed</h2>
            <p style={s.modalSub}>
              Select up to <strong style={{ color: theme.textSecondary }}>4 research areas</strong> to
              customize your AI headline feed.
            </p>
            <div style={s.interestGrid}>
              {INTEREST_OPTIONS.map((option) => {
                const active = selectedInterests.includes(option);
                return (
                  <button key={option} style={{ ...s.interestChip, ...(active ? s.interestChipActive : {}) }} onClick={() => toggleInterest(option)}>
                    {active && <IconCheck size={12} color={theme.accentText} />}
                    {option}
                  </button>
                );
              })}
            </div>
            <div style={s.modalActions}>
              <button style={s.skipBtn} onClick={() => setShowInterestModal(false)}>Skip for now</button>
              <button
                style={{ ...s.modalSaveBtn, opacity: selectedInterests.length === 0 || savingInterests ? 0.4 : 1 }}
                onClick={saveInterestsAndLoadTrends}
                disabled={selectedInterests.length === 0 || savingInterests}
              >
                {savingInterests ? "Saving..." : `Continue (${selectedInterests.length}/4)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside
        style={{
          ...s.sidebar,
          width: sidebarWidth,
          transform: isMobile ? (mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
          boxShadow: isMobile && mobileSidebarOpen ? theme.shadowLg : "none",
        }}
      >
        <div style={s.sidebarHeader}>
          <button
            style={s.collapseBtn}
            onClick={() => (isMobile ? setMobileSidebarOpen(false) : setSidebarCollapsed(!sidebarCollapsed))}
            title={isMobile ? "Close" : (sidebarCollapsed ? "Expand" : "Collapse")}
          >
            {sidebarCollapsed ? <IconMenu size={17} color={theme.textTertiary} /> : <IconChevronLeft size={17} color={theme.textTertiary} />}
          </button>
          {(!sidebarCollapsed || isMobile) && (
            <div style={s.logoRow}>
              <div style={s.logoMark}><IconSearch size={14} color={theme.accentText} /></div>
              <span style={s.logoText}>Cove</span>
            </div>
          )}
        </div>

        <button
          style={{ ...s.newBtn, justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start" }}
          onClick={() => {
            setView("home");
            setQuery("");
            setReport(null);
            if (isMobile) setMobileSidebarOpen(false);
          }}
          title="New Research"
        >
          <IconPlus size={15} color={theme.accentText} />
          {(!sidebarCollapsed || isMobile) && <span>New Research</span>}
        </button>

        <div style={s.historySection}>
          {(!sidebarCollapsed || isMobile) && <div style={s.histLabel}>Recent</div>}
          <div style={s.historyList}>
            {pastReports.slice(0, 25).map((r) => (
              <div
                key={r.id}
                style={{ ...s.histItem, background: hoveredHistItem === r.id ? theme.bgHover : "transparent", justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start" }}
                onClick={() => {
                  setReport(r.report);
                  setView("report");
                  if (isMobile) setMobileSidebarOpen(false);
                }}
                onMouseEnter={() => setHoveredHistItem(r.id)}
                onMouseLeave={() => setHoveredHistItem(null)}
                title={r.query}
              >
                {sidebarCollapsed && !isMobile
                  ? <IconFileText size={14} color={theme.textMuted} />
                  : <span style={s.histText}>{r.query?.substring(0, 36)}{r.query?.length > 36 ? "…" : ""}</span>
                }
              </div>
            ))}
            {pastReports.length === 0 && (!sidebarCollapsed || isMobile) && (
              <div style={s.histEmpty}>No research yet</div>
            )}
          </div>
        </div>

        <div style={s.sidebarBottom}>
          {/* Theme toggle */}
          <button style={s.themeToggle} onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            {isDark ? <IconSun size={14} color={theme.textTertiary} /> : <IconMoon size={14} color={theme.textTertiary} />}
            {(!sidebarCollapsed || isMobile) && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
          </button>

          <div style={{ ...s.userRow, justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start" }}>
            <img src={user.photoURL} alt="" style={s.avatar} referrerPolicy="no-referrer" />
            {(!sidebarCollapsed || isMobile) && <span style={s.userName}>{user.displayName?.split(" ")[0]}</span>}
          </div>

          <button style={{ ...s.signOutBtn, justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start" }} onClick={() => signOut(auth)} title="Sign out">
            <IconLogOut size={14} color={theme.textMuted} />
            {(!sidebarCollapsed || isMobile) && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ ...s.main, marginLeft: isMobile ? 0 : (sidebarCollapsed ? 58 : 252) }}>
        {isMobile && (
          <div style={s.mobileTopBar}>
            <button style={s.mobileMenuBtn} onClick={() => setMobileSidebarOpen(true)}>
              <IconMenu size={17} color={theme.textTertiary} />
              <span style={s.mobileMenuText}>Menu</span>
            </button>
            <div style={s.mobileBrand}>Cove</div>
          </div>
        )}

        {view === "home" && (
          <div style={s.center}>
            <h1 style={s.heading}>What do you want to research?</h1>
            <p style={s.subheading}>Every claim verified. No hallucinations.</p>

            {error && (
              <div style={s.error}>
                <IconAlertTriangle size={14} color={theme.danger} />
                <span>{error}</span>
              </div>
            )}

            <div style={s.inputRow}>
              <div style={s.inputWrap}>
                <IconSearch size={17} color={theme.textMuted} />
                <input
                  style={s.input}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePrimaryAction()}
                  placeholder={pdfFile ? "Ask about the attached PDF..." : "Impact of AI on healthcare in 2024..."}
                  autoFocus
                />
                <button style={s.attachBtn} onClick={handlePdfIconClick} title="Attach PDF">
                  <IconPaperclip size={15} color={theme.textTertiary} />
                </button>
                <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handlePdfFileSelected} style={{ display: "none" }} />
              </div>
              <button style={{ ...s.goBtn, opacity: query.trim() ? 1 : 0.4 }} onClick={handlePrimaryAction} disabled={!query.trim()}>
                <span>Research</span>
                <IconArrowRight size={15} color="#fff" />
              </button>
            </div>

            {(pdfLoading || pdfFile || pdfError) && (
              <div style={s.pdfStatus}>
                {pdfLoading && <span style={s.pdfChip}><IconLoader size={13} color={theme.textTertiary} /> Preparing PDF...</span>}
                {!pdfLoading && pdfFile && (
                  <span style={s.pdfChip}>
                    <IconFileText size={13} color={theme.textTertiary} />
                    {pdfFile.name}
                    <button style={s.pdfRemove} onClick={() => setPdfFile(null)}><IconX size={12} color={theme.textTertiary} /></button>
                  </span>
                )}
                {pdfError && <span style={{ ...s.pdfChip, borderColor: theme.dangerBorder, color: theme.danger }}><IconAlertTriangle size={13} color={theme.danger} />{pdfError}</span>}
              </div>
            )}

            <div style={s.examples}>
              {EXAMPLES.map((q) => (
                <button key={q} style={s.exBtn} onClick={() => setQuery(q)}>{q}</button>
              ))}
            </div>

            {/* Pipeline */}
            <div style={s.sectionCard}>
              <div style={s.sectionTitle}>How it works</div>
              <div style={s.pipelineGrid}>
                {PIPELINE_STEPS.map(({ Icon, name, desc }) => (
                  <div key={name} style={s.pipelineStep}>
                    <div style={s.pipelineIcon}><Icon size={17} color={theme.accentLight} /></div>
                    <div style={s.pipelineName}>{name}</div>
                    <div style={s.pipelineDesc}>{desc}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Trends */}
            <div style={s.sectionCard}>
              <div style={{ ...s.sectionTitle, display: "flex", alignItems: "center", gap: 6 }}>
                <IconTrendingUp size={13} color={theme.textMuted} />
                Latest research — {selectedInterests.join(", ") || "General"}
              </div>
              <div style={s.trendsGrid}>
                {trendsLoading && <div style={s.trendsLoading}><IconLoader size={14} color={theme.textMuted} /> Loading papers...</div>}
                {!trendsLoading && aiTrends.length === 0 && <p style={s.trendsEmpty}>Could not load trends right now.</p>}
                {!trendsLoading && aiTrends.map((item, idx) => (
                  <a key={`${item.link}-${idx}`} href={item.link} target="_blank" rel="noopener noreferrer" style={s.trendCard}>
                    <div style={s.trendTitle}>{item.title}</div>
                    <div style={s.trendMeta}>{item.source} · {new Date(item.published).toLocaleDateString()}</div>
                    <div style={s.trendSummary}>{item.summary?.slice(0, 200)}...</div>
                    <div style={s.trendLink}><IconExternalLink size={11} color={theme.textMuted} /> Read paper</div>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

        {view === "researching" && (
          <div style={s.researchWrap}>
            <div style={s.researchHeader}>
              <IconSearch size={17} color={theme.textMuted} />
              <p style={s.queryLabel}>"{query}"</p>
            </div>
            <AgentProgress updates={agentUpdates} />
            <div style={s.waitRow}>
              <IconClock size={14} color={theme.textMuted} />
              <span style={s.waitMsg}>Agents working — this takes ~30 seconds</span>
            </div>
          </div>
        )}

        {view === "report" && report && (
          <ReportView report={report} onBack={() => { setView("home"); setQuery(""); }} />
        )}
      </main>
    </div>
  );
}

/* ─── Styles (theme-aware) ─── */
function getStyles(t, isDark, isMobile) {
  return {
    page: {
      display: "flex",
      minHeight: "100vh",
      background: t.bgPrimary,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: t.textPrimary,
      transition: "background 0.25s ease, color 0.25s ease",
    },

    /* Modal */
    modalOverlay: {
      position: "fixed", inset: 0, zIndex: 1000,
      background: t.bgOverlay,
      backdropFilter: "blur(16px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      animation: "fadeIn 0.25s ease",
    },
    sidebarOverlay: {
      position: "fixed",
      inset: 0,
      background: t.bgOverlay,
      zIndex: 90,
    },
    modalCard: {
      background: isDark ? "#13131f" : "#ffffff",
      border: `1px solid ${t.border}`,
      borderRadius: 18,
      padding: isMobile ? "26px 18px" : "38px 34px",
      maxWidth: 480, width: "92%",
      textAlign: "center",
      boxShadow: t.shadowLg,
    },
    modalIcon: {
      width: 50, height: 50, borderRadius: 14,
      background: t.accentBg,
      border: `1px solid ${t.accentBorder}`,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      marginBottom: 16,
    },
    modalTitle: { margin: "0 0 8px", color: t.textPrimary, fontSize: 21, fontWeight: 700, letterSpacing: "-0.3px" },
    modalSub: { margin: "0 0 22px", color: t.textTertiary, fontSize: 13.5, lineHeight: 1.6 },
    interestGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 26, justifyContent: "center" },
    interestChip: {
      border: `1px solid ${t.border}`, background: t.bgCard,
      color: t.textSecondary, borderRadius: 999, padding: "8px 16px",
      cursor: "pointer", fontSize: 13, fontWeight: 500,
      display: "flex", alignItems: "center", gap: 6, transition: "all 0.15s ease",
    },
    interestChipActive: {
      border: `1px solid ${t.accentBorder}`, background: t.accentBg, color: t.accentText,
    },
    modalActions: { display: "flex", gap: 10, justifyContent: "center", flexDirection: isMobile ? "column" : "row" },
    skipBtn: {
      background: "transparent", border: `1px solid ${t.border}`,
      color: t.textTertiary, borderRadius: 10, padding: "10px 20px",
      fontWeight: 500, cursor: "pointer", fontSize: 13,
    },
    modalSaveBtn: {
      background: t.accent, border: "none", color: "#fff",
      borderRadius: 10, padding: "10px 24px", fontWeight: 600,
      cursor: "pointer", fontSize: 13, transition: "opacity 0.2s",
    },

    /* Sidebar */
    sidebar: {
      background: isDark ? "#0c0c16" : "#ffffff",
      borderRight: `1px solid ${t.border}`,
      display: "flex", flexDirection: "column",
      position: "fixed", height: "100vh", top: 0, left: 0,
      zIndex: 100, transition: "width 0.2s ease, transform 0.2s ease",
      overflow: "hidden",
    },
    sidebarHeader: {
      padding: "14px 14px 10px",
      display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
    },
    collapseBtn: {
      background: "transparent", border: "none", cursor: "pointer",
      padding: 4, display: "flex", alignItems: "center", justifyContent: "center",
      borderRadius: 6, flexShrink: 0,
    },
    logoRow: { display: "flex", alignItems: "center", gap: 8 },
    logoMark: {
      width: 26, height: 26, borderRadius: 7,
      background: t.accentBg,
      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    logoText: { fontWeight: 700, fontSize: 16, color: t.textPrimary, letterSpacing: "-0.3px" },
    newBtn: {
      background: t.accentBg, border: `1px solid ${t.accentBorder}`,
      color: t.accentText, borderRadius: 9, padding: "10px 13px",
      cursor: "pointer", fontSize: 13, fontWeight: 600,
      margin: "2px 10px 10px", display: "flex", alignItems: "center", gap: 8,
      transition: "all 0.15s ease", whiteSpace: "nowrap", overflow: "hidden", flexShrink: 0,
    },

    historySection: {
      flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
      padding: "0 10px", overflow: "hidden",
    },
    histLabel: {
      color: t.textMuted, fontSize: 10, textTransform: "uppercase",
      letterSpacing: 1.5, padding: "10px 6px 6px", flexShrink: 0, fontWeight: 600,
    },
    historyList: {
      flex: 1, overflowY: "auto", overflowX: "hidden", paddingRight: 2,
      scrollbarWidth: "thin", scrollbarColor: `${t.scrollThumb} transparent`,
    },
    histItem: {
      fontSize: 12.5, padding: "8px 10px", borderRadius: 7,
      cursor: "pointer", display: "flex", alignItems: "center",
      transition: "all 0.12s ease", overflow: "hidden",
    },
    histText: {
      color: isDark ? t.textTertiary : t.textSecondary,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    },
    histEmpty: { color: t.textMuted, fontSize: 12, padding: "12px 10px", textAlign: "center" },

    sidebarBottom: {
      flexShrink: 0, padding: "8px 10px 14px",
      borderTop: `1px solid ${t.border}`,
    },
    themeToggle: {
      background: t.bgElevated,
      border: `1px solid ${t.border}`,
      color: t.textTertiary,
      borderRadius: 7,
      padding: "7px 10px",
      cursor: "pointer",
      fontSize: 12,
      fontWeight: 500,
      width: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      transition: "all 0.15s ease",
      marginBottom: 10,
      whiteSpace: "nowrap",
      overflow: "hidden",
    },
    userRow: {
      display: "flex", alignItems: "center", gap: 10,
      marginBottom: 8, overflow: "hidden",
    },
    avatar: {
      width: 28, height: 28, borderRadius: "50%",
      border: `1.5px solid ${t.border}`, flexShrink: 0,
    },
    userName: {
      color: t.textSecondary, fontSize: 13, fontWeight: 500,
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    },
    signOutBtn: {
      background: "transparent",
      border: `1px solid ${t.border}`,
      color: t.textMuted,
      borderRadius: 7, padding: "7px 12px",
      cursor: "pointer", fontSize: 12, fontWeight: 500,
      width: "100%", display: "flex",
      alignItems: "center", gap: 8,
      transition: "all 0.15s ease",
      whiteSpace: "nowrap", overflow: "hidden",
    },

    /* Main */
    main: {
      flex: 1, padding: isMobile ? "16px 14px 28px" : "34px clamp(18px, 3.6vw, 44px)",
      overflowY: "auto", minHeight: "100vh",
      transition: "margin-left 0.2s ease",
    },
    mobileTopBar: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
      position: "sticky",
      top: 0,
      zIndex: 5,
      padding: "8px 0",
      background: t.bgPrimary,
    },
    mobileMenuBtn: {
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: t.bgElevated,
      border: `1px solid ${t.border}`,
      color: t.textTertiary,
      borderRadius: 8,
      padding: "7px 10px",
      fontSize: 12,
      fontWeight: 600,
      cursor: "pointer",
    },
    mobileMenuText: { color: t.textSecondary },
    mobileBrand: {
      color: t.textPrimary,
      fontSize: 15,
      fontWeight: 700,
      letterSpacing: "-0.3px",
    },
    center: { maxWidth: 980, width: "100%", margin: isMobile ? "6px auto 0" : "24px auto 0" },
    heading: {
      fontSize: isMobile ? 30 : 42, fontWeight: 750, color: t.textPrimary,
      marginBottom: 8, textAlign: "center", letterSpacing: "-0.5px", lineHeight: 1.2,
    },
    subheading: {
      color: isDark ? t.textTertiary : t.textSecondary,
      fontSize: isMobile ? 15 : 18,
      textAlign: "center", marginBottom: isMobile ? 20 : 34, fontWeight: 500,
    },
    error: {
      background: t.dangerBg, border: `1px solid ${t.dangerBorder}`,
      borderRadius: 10, padding: "10px 16px",
      color: t.danger, fontSize: 13, marginBottom: 20,
      display: "flex", alignItems: "center", gap: 8,
    },
    inputRow: { display: "flex", gap: 10, marginBottom: 16, flexDirection: isMobile ? "column" : "row" },
    inputWrap: {
      flex: 1, display: "flex", alignItems: "center", gap: 10,
      background: t.inputBg, border: `1px solid ${t.inputBorder}`,
      borderRadius: 12, padding: "0 14px", transition: "border-color 0.2s ease",
    },
    input: {
      flex: 1, background: "none", border: "none",
      padding: "14px 0", color: t.inputText, fontSize: isMobile ? 15 : 16,
      outline: "none", fontFamily: "inherit",
    },
    attachBtn: {
      background: "none", border: "none", cursor: "pointer",
      padding: 4, display: "flex", alignItems: "center", borderRadius: 6,
    },
    goBtn: {
      background: t.accent, border: "none", color: "#fff",
      padding: isMobile ? "13px 18px" : "14px 24px", borderRadius: 12, cursor: "pointer",
      fontSize: isMobile ? 15 : 16, fontWeight: 700, display: "flex",
      alignItems: "center", gap: 7, transition: "opacity 0.2s",
      whiteSpace: "nowrap", flexShrink: 0, justifyContent: "center",
    },

    pdfStatus: { marginBottom: 14, display: "flex", flexWrap: "wrap", gap: 8 },
    pdfChip: {
      display: "inline-flex", alignItems: "center", gap: 6,
      background: t.bgCard, border: `1px solid ${t.border}`,
      borderRadius: 8, padding: "5px 10px", fontSize: 12, color: t.textSecondary,
    },
    pdfRemove: {
      background: "none", border: "none", cursor: "pointer",
      padding: 2, display: "flex", alignItems: "center", marginLeft: 2, borderRadius: 4,
    },

    examples: {
      display: "flex", flexWrap: "wrap", gap: 8,
      marginBottom: isMobile ? 24 : 36, justifyContent: "center",
    },
    exBtn: {
      background: t.bgCard, border: `1px solid ${t.border}`,
      color: t.textTertiary, borderRadius: 8, padding: "7px 14px",
      cursor: "pointer", fontSize: isMobile ? 13 : 14, transition: "all 0.15s ease",
    },

    sectionCard: {
      background: t.bgCard, border: `1px solid ${t.border}`,
      borderRadius: 14, padding: isMobile ? "14px 14px" : "20px 22px", marginBottom: 22,
    },
    sectionTitle: {
      color: isDark ? t.textMuted : t.textSecondary, fontSize: 13, textTransform: "uppercase",
      letterSpacing: 1.8, fontWeight: 600, marginBottom: 16,
    },

    pipelineGrid: { display: "flex", gap: 8, flexWrap: "wrap" },
    pipelineStep: {
      flex: isMobile ? "1 1 100%" : "1 1 90px", background: t.bgElevated,
      borderRadius: 10, padding: "14px 10px", textAlign: "center",
    },
    pipelineIcon: {
      width: 34, height: 34, borderRadius: 9,
      background: t.accentBg,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      marginBottom: 8,
    },
    pipelineName: { color: t.textPrimary, fontSize: 12, fontWeight: 600, marginBottom: 4 },
    pipelineDesc: { color: isDark ? t.textMuted : t.textSecondary, fontSize: 13, lineHeight: 1.5 },

    trendsGrid: { display: "grid", gap: 8 },
    trendsLoading: {
      display: "flex", alignItems: "center", gap: 8,
      color: isDark ? t.textTertiary : t.textSecondary, fontSize: 14, padding: "8px 0",
    },
    trendsEmpty: { color: isDark ? t.textMuted : t.textSecondary, fontSize: 14, margin: 0, padding: "8px 0" },
    trendCard: {
      display: "block", background: t.bgElevated,
      border: `1px solid ${t.borderSubtle}`, borderRadius: 10,
      padding: "14px 16px", textDecoration: "none", transition: "border-color 0.2s",
    },
    trendTitle: { color: t.textPrimary, fontSize: isMobile ? 16 : 20, fontWeight: 700, marginBottom: 5, lineHeight: 1.45 },
    trendMeta: { color: isDark ? t.textMuted : t.textSecondary, fontSize: 13, marginBottom: 7 },
    trendSummary: { color: isDark ? t.textTertiary : t.textSecondary, fontSize: isMobile ? 13 : 15, lineHeight: 1.6, marginBottom: 8 },
    trendLink: { color: isDark ? t.textMuted : t.textSecondary, fontSize: 13, display: "flex", alignItems: "center", gap: 4 },

    researchWrap: { maxWidth: 560, margin: isMobile ? "16px auto 0" : "50px auto 0" },
    researchHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 24 },
    queryLabel: { color: t.textTertiary, fontSize: isMobile ? 15 : 17, fontStyle: "italic", margin: 0, fontWeight: 400 },
    waitRow: { display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 },
    waitMsg: { color: t.textMuted, fontSize: 12 },
  };
}
