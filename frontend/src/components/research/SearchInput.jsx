import React from 'react';
import { IconSearch, IconArrowRight, IconPaperclip, IconBrain } from '../Icons';

export default function SearchInput({
  query,
  setQuery,
  handlePrimaryAction,
  pdfFile,
  handlePdfIconClick,
  handlePdfFileSelected,
  fileInputRef,
  deepResearch,
  setDeepResearch
}) {
  return (
    <>
      <div className="input-row">
        <div className="input-wrap">
          <IconSearch size={17} />
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handlePrimaryAction()}
            placeholder={pdfFile ? "Ask about the attached PDF..." : "Impact of AI on healthcare in 2024..."}
            autoFocus
          />
          <button className="attach-btn" onClick={handlePdfIconClick} title="Attach PDF">
            <IconPaperclip size={15} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={handlePdfFileSelected}
            style={{ display: "none" }}
          />
        </div>
        <button
          className="go-btn"
          style={{ opacity: query.trim() ? 1 : 0.4 }}
          onClick={handlePrimaryAction}
          disabled={!query.trim()}
        >
          <span>Research</span>
          <IconArrowRight size={15} color="#fff" />
        </button>
      </div>

      <div className="deep-research-wrap" style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
        <button
          onClick={() => setDeepResearch(!deepResearch)}
          className={`deep-research-btn ${deepResearch ? "active" : ""}`}
        >
          <IconBrain size={15} />
          {deepResearch ? "Deep Research Enabled" : "Enable Deep Research"}
        </button>
      </div>
    </>
  );
}
