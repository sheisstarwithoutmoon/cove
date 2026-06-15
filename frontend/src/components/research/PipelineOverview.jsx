import React from 'react';
import { IconBrain, IconGlobe, IconFileText, IconShield, IconEdit } from '../Icons';

const PIPELINE_STEPS = [
  { Icon: IconBrain, name: "Orchestrator", desc: "Breaks query into sub-questions" },
  { Icon: IconGlobe, name: "Search Agent", desc: "Finds real sources via Tavily" },
  { Icon: IconFileText, name: "Summarizer", desc: "Extracts key claims" },
  { Icon: IconShield, name: "Verifier", desc: "Checks every citation is real" },
  { Icon: IconEdit, name: "Reporter", desc: "Compiles final report" },
];

export default function PipelineOverview() {
  return (
    <div className="section-card">
      <div className="section-title">How it works</div>
      <div className="pipeline-grid">
        {PIPELINE_STEPS.map(({ Icon, name, desc }) => (
          <div key={name} className="pipeline-step">
            <div className="pipeline-icon">
              <Icon size={17} />
            </div>
            <div className="pipeline-name">{name}</div>
            <div className="pipeline-desc">{desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
