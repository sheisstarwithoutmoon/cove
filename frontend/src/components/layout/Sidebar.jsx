import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { useTheme } from "../ThemeContext";
import {
  IconSearch, IconPlus, IconFileText, IconSun, IconMoon, IconLogOut, IconChevronLeft, IconMenu
} from "../Icons";

export default function Sidebar({
  user,
  pastReports,
  sidebarCollapsed,
  setSidebarCollapsed,
  isMobile,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  setView,
  setQuery,
  setReport
}) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [hoveredHistItem, setHoveredHistItem] = useState(null);

  const sidebarWidth = isMobile ? 252 : (sidebarCollapsed ? 58 : 252);

  return (
    <aside
      className="sidebar"
      style={{
        width: sidebarWidth,
        transform: isMobile ? (mobileSidebarOpen ? "translateX(0)" : "translateX(-100%)") : "translateX(0)",
        boxShadow: isMobile && mobileSidebarOpen ? theme.shadowLg : "none",
      }}
    >
      <div className="sidebar-header">
        <button
          className="collapse-btn"
          onClick={() => (isMobile ? setMobileSidebarOpen(false) : setSidebarCollapsed(!sidebarCollapsed))}
          title={isMobile ? "Close" : (sidebarCollapsed ? "Expand" : "Collapse")}
        >
          {sidebarCollapsed ? <IconMenu size={17} color={theme.textTertiary} /> : <IconChevronLeft size={17} color={theme.textTertiary} />}
        </button>
        {(!sidebarCollapsed || isMobile) && (
          <div className="logo-row">
            <div className="logo-mark"><IconSearch size={14} color={theme.accentText} /></div>
            <span className="logo-text">Cove</span>
          </div>
        )}
      </div>

      <button
        className="new-btn"
        style={{ justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start" }}
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

      <div className="history-section">
        {(!sidebarCollapsed || isMobile) && <div className="hist-label">Recent</div>}
        <div className="history-list">
          {pastReports.slice(0, 25).map((r) => (
            <div
              key={r.id}
              className="hist-item"
              style={{ background: hoveredHistItem === r.id ? theme.bgHover : "transparent", justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start" }}
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
                : <span className="hist-text">{r.query?.substring(0, 36)}{r.query?.length > 36 ? "…" : ""}</span>
              }
            </div>
          ))}
          {pastReports.length === 0 && (!sidebarCollapsed || isMobile) && (
            <div className="hist-empty">No research yet</div>
          )}
        </div>
      </div>

      <div className="sidebar-bottom">
        {/* Theme toggle */}
        <button className="theme-toggle" onClick={toggleTheme} title={isDark ? "Switch to light mode" : "Switch to dark mode"}>
          {isDark ? <IconSun size={14} color={theme.textTertiary} /> : <IconMoon size={14} color={theme.textTertiary} />}
          {(!sidebarCollapsed || isMobile) && <span>{isDark ? "Light mode" : "Dark mode"}</span>}
        </button>

        <div className="user-row" style={{ justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start" }}>
          <img src={user.photoURL} alt="" className="avatar" referrerPolicy="no-referrer" />
          {(!sidebarCollapsed || isMobile) && <span className="user-name">{user.displayName?.split(" ")[0]}</span>}
        </div>

        <button className="sign-out-btn" style={{ justifyContent: sidebarCollapsed && !isMobile ? "center" : "flex-start" }} onClick={() => signOut(auth)} title="Sign out">
          <IconLogOut size={14} color={theme.textMuted} />
          {(!sidebarCollapsed || isMobile) && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  );
}
