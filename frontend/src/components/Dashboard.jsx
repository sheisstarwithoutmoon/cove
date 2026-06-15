import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useTheme } from "./ThemeContext";
import useResponsive from "../hooks/useResponsive";
import { useAuth } from "../hooks/useAuth";

import AgentProgress from "./AgentProgress";
import ReportView from "./ReportView";
import Sidebar from "./layout/Sidebar";
import InterestModal from "./modals/InterestModal";
import TrendsFeed from "./trends/TrendsFeed";
import PipelineOverview from "./research/PipelineOverview";
import ExampleQueries from "./research/ExampleQueries";
import SearchInput from "./research/SearchInput";
import { IconAlertTriangle, IconClock, IconLoader, IconX, IconFileText, IconMenu } from "./Icons";
import ErrorBoundary from "./shared/ErrorBoundary";
import "./Dashboard.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Dashboard() {
  const { theme } = useTheme();
  const { getToken, user } = useAuth();
  const isMobile = useResponsive(900);

  const INTEREST_OPTIONS = [
    "Healthcare AI", "Finance AI", "Robotics", "Computer Vision",
    "NLP / LLMs", "AI Safety", "Cybersecurity", "Education AI",
  ];

  const [query, setQuery] = useState("");
  const [deepResearch, setDeepResearch] = useState(false);
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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isMobile) setMobileSidebarOpen(false);
  }, [isMobile]);

  async function loadHistory() {
    try {
      const token = await getToken();
      if (!token) return;
      const { data } = await axios.get(`${API}/reports`, { headers: { Authorization: `Bearer ${token}` } });
      setPastReports(data.reports || []);
    } catch (e) { console.error("Failed to load history:", e.message); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    async function loadProfileAndTrends() {
      setTrendsLoading(true);
      try {
        const token = await getToken();
        if (!token) return;
        const { data: profile } = await axios.get(`${API}/profile`, { headers: { Authorization: `Bearer ${token}` } });
        const interests = Array.isArray(profile?.interests) ? profile.interests : [];
        setSelectedInterests(interests);
        setInterestsLoaded(true);
        if (interests.length === 0) setShowInterestModal(true);

        const interestQuery = interests.join(",");
        const trendsResponse = await axios.get(`${API}/ai-trends`, { params: interestQuery ? { interests: interestQuery } : undefined });
        setAiTrends(trendsResponse.data?.trends || []);
      } catch (e) {
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
      await axios.put(`${API}/profile`, { interests: selectedInterests }, { headers: { Authorization: `Bearer ${token}` } });
      const interestQuery = selectedInterests.join(",");
      const { data } = await axios.get(`${API}/ai-trends`, { params: { interests: interestQuery } });
      setAiTrends(data.trends || []);
      setShowInterestModal(false);
    } catch (e) { setError("Could not save interests."); }
    finally { setSavingInterests(false); }
  }

  function toggleInterest(interest) {
    setSelectedInterests(prev => prev.includes(interest) ? prev.filter(x => x !== interest) : prev.length >= 4 ? prev : [...prev, interest]);
  }

  async function processPdfContext(file) {
    if (!file) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      const { data } = await axios.post(`${API}/pdf/context`, formData, { headers: { Authorization: `Bearer ${token}` } });
      return data;
    } catch (e) {
      setPdfError("Failed to process attached PDF.");
      return null;
    } finally { setPdfLoading(false); }
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
      let payload = { query, deepResearch };
      if (pdfFile) {
        setAgentUpdates([{ type: "agent_start", agent: "pdf", message: `Reading ${pdfFile.name}...` }]);
        const pdfData = await processPdfContext(pdfFile);
        if (!pdfData?.context) { setError("Could not read PDF context."); setView("home"); return; }
        setAgentUpdates(prev => [...prev, { type: "agent_done", agent: "pdf", message: `Context from ${pdfData.meta?.pageCount || 0} pages` }]);
        payload = { query, pdfContext: pdfData.context, pdfMeta: pdfData.meta, deepResearch };
      }
      const response = await fetch(`${API}/research/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok || !response.body) throw new Error("Failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) buffer += decoder.decode();
        else buffer += decoder.decode(value, { stream: true });

        const events = buffer.split("\n\n");
        buffer = done ? "" : events.pop() || "";
        for (const event of events) {
          const lines = event.split("\n").map(l => l.trim()).filter(l => l.startsWith("data:"));
          if (!lines.length) continue;
          const payloadText = lines.map(l => l.replace(/^data:\s?/, "")).join("\n");
          try {
            const data = JSON.parse(payloadText);
            if (data.type === "complete") { setReport(data.report); setView("report"); loadHistory(); }
            else if (data.type === "error") { setError(data.message); setView("home"); }
            else setAgentUpdates(prev => [...prev, data]);
          } catch {}
        }
        if (done) break;
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
      setView("home");
    }
  }

  return (
    <ErrorBoundary>
      <div className="page">
        {isMobile && mobileSidebarOpen && <div className="sidebar-overlay" onClick={() => setMobileSidebarOpen(false)} />}

        {showInterestModal && interestsLoaded && (
          <InterestModal 
            INTEREST_OPTIONS={INTEREST_OPTIONS}
            selectedInterests={selectedInterests}
            toggleInterest={toggleInterest}
            setShowInterestModal={setShowInterestModal}
            savingInterests={savingInterests}
            saveInterestsAndLoadTrends={saveInterestsAndLoadTrends}
          />
        )}

        <Sidebar 
          user={user}
          pastReports={pastReports}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
          isMobile={isMobile}
          mobileSidebarOpen={mobileSidebarOpen}
          setMobileSidebarOpen={setMobileSidebarOpen}
          setView={setView}
          setQuery={setQuery}
          setReport={setReport}
        />

        <main className="main-layout" style={{ marginLeft: isMobile ? 0 : (sidebarCollapsed ? 58 : 252) }}>
          {isMobile && (
            <div className="mobile-top-bar">
              <button className="mobile-menu-btn" onClick={() => setMobileSidebarOpen(true)}>
                <IconMenu size={17} color="var(--text-tertiary)" />
                <span className="mobile-menu-text">Menu</span>
              </button>
              <div className="mobile-brand">Cove</div>
            </div>
          )}

          {view === "home" && (
            <div className="center-wrap">
              <h1 className="heading">What do you want to research?</h1>
              <p className="subheading">Every claim verified. No hallucinations.</p>

              {error && (
                <div className="error-banner">
                  <IconAlertTriangle size={14} color="var(--danger)" />
                  <span>{error}</span>
                </div>
              )}

              <SearchInput 
                query={query} setQuery={setQuery} handlePrimaryAction={handlePrimaryAction}
                pdfFile={pdfFile} handlePdfIconClick={handlePdfIconClick} handlePdfFileSelected={handlePdfFileSelected}
                fileInputRef={fileInputRef} deepResearch={deepResearch} setDeepResearch={setDeepResearch}
              />

              {(pdfLoading || pdfFile || pdfError) && (
                <div className="pdf-status">
                  {pdfLoading && <span className="pdf-chip"><IconLoader size={13} color="var(--text-tertiary)" /> Preparing PDF...</span>}
                  {!pdfLoading && pdfFile && (
                    <span className="pdf-chip">
                      <IconFileText size={13} color="var(--text-tertiary)" /> {pdfFile.name}
                      <button className="pdf-remove" onClick={() => setPdfFile(null)}><IconX size={12} color="var(--text-tertiary)" /></button>
                    </span>
                  )}
                  {pdfError && <span className="pdf-chip" style={{ borderColor: "var(--danger-border)", color: "var(--danger)" }}><IconAlertTriangle size={13} color="var(--danger)" />{pdfError}</span>}
                </div>
              )}

              <ExampleQueries setQuery={setQuery} />
              <PipelineOverview />
              <TrendsFeed selectedInterests={selectedInterests} trendsLoading={trendsLoading} aiTrends={aiTrends} />
            </div>
          )}

          {view === "researching" && (
            <div className="research-wrap">
              <div className="research-header">
                <IconClock size={17} color="var(--text-muted)" />
                <p className="query-label">"{query}"</p>
              </div>
              <AgentProgress updates={agentUpdates} />
              <div className="wait-row">
                <IconClock size={14} color="var(--text-muted)" />
                <span className="wait-msg">Agents working — this takes ~30 seconds</span>
              </div>
            </div>
          )}

          {view === "report" && report && (
            <ReportView report={report} onBack={() => { setView("home"); setQuery(""); }} />
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}
