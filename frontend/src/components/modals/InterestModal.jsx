import { useTheme } from "../ThemeContext";
import { IconTarget, IconCheck } from "../Icons";

export default function InterestModal({
  INTEREST_OPTIONS,
  selectedInterests,
  toggleInterest,
  setShowInterestModal,
  savingInterests,
  saveInterestsAndLoadTrends
}) {
  const { theme } = useTheme();

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-icon">
          <IconTarget size={24} color={theme.accentText} />
        </div>
        <h2 className="modal-title">Personalize your feed</h2>
        <p className="modal-sub">
          Select up to <strong style={{ color: theme.textSecondary }}>4 research areas</strong> to
          customize your AI headline feed.
        </p>
        <div className="interest-grid">
          {INTEREST_OPTIONS.map((option) => {
            const active = selectedInterests.includes(option);
            return (
              <button 
                key={option} 
                className={`interestChip ${active ? "interestChipActive" : ""}`} 
                onClick={() => toggleInterest(option)}
              >
                {active && <IconCheck size={12} color={theme.accentText} />}
                {option}
              </button>
            );
          })}
        </div>
        <div className="modal-actions">
          <button className="skip-btn" onClick={() => setShowInterestModal(false)}>Skip for now</button>
          <button
            className="modal-save-btn"
            style={{ opacity: selectedInterests.length === 0 || savingInterests ? 0.4 : 1 }}
            onClick={saveInterestsAndLoadTrends}
            disabled={selectedInterests.length === 0 || savingInterests}
          >
            {savingInterests ? "Saving..." : `Continue (${selectedInterests.length}/4)`}
          </button>
        </div>
      </div>
    </div>
  );
}
