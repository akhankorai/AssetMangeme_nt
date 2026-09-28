import React from "react";

export default function DailyInspectionModal({
  dailyInspectionModal,
  dailyInspectionDraft,
  handleCloseDailyInspectionModal,
  handleToggleDailyCheckpoint,
  setDailyInspectionDraft,
  handleCompleteDailyInspection,
}) {
  if (!dailyInspectionModal) return null;

  return (
    <div className="assetModalBackdrop open" role="presentation" onClick={handleCloseDailyInspectionModal}>
      <section
        className="panel assetModal open dailyInspectionModal"
        role="dialog"
        aria-modal="true"
        aria-label="Daily Inspection Checklist"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panelHeader">
          <h2>Daily Inspection - {dailyInspectionModal.assetTag}</h2>
          <div className="assetModalActions">
            <button type="button" onClick={handleCloseDailyInspectionModal}>
              Close
            </button>
          </div>
        </div>
        <div className="dailyInspectionModalMeta">
          <span>{dailyInspectionModal.name}</span>
          <span>{dailyInspectionModal.category}</span>
          <span>{dailyInspectionModal.station}</span>
        </div>
        <div className="dailyInspectionChecklist">
          {[
            ["brakes", "Brakes condition"],
            ["tires", "Tire pressure & wear"],
            ["lights", "Head/Tail lights"],
            ["horn", "Horn functionality"],
            ["oilLeak", "No oil leakage"],
            ["battery", "Battery & ignition"],
          ].map(([key, label]) => (
            <label key={key} className="dailyInspectionCheckpoint">
              <input
                type="checkbox"
                checked={Boolean(dailyInspectionDraft.checkpoints?.[key])}
                onChange={(event) => handleToggleDailyCheckpoint(key, event.target.checked)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
        <div className="dailyInspectionDecisionRow">
          <span>Need Maintenance?</span>
          <label>
            <input
              type="radio"
              name="daily-inspection-maintenance"
              checked={dailyInspectionDraft.needsMaintenance === "yes"}
              onChange={() => setDailyInspectionDraft((current) => ({ ...current, needsMaintenance: "yes" }))}
            />
            Yes
          </label>
          <label>
            <input
              type="radio"
              name="daily-inspection-maintenance"
              checked={dailyInspectionDraft.needsMaintenance === "no"}
              onChange={() => setDailyInspectionDraft((current) => ({ ...current, needsMaintenance: "no" }))}
            />
            No
          </label>
        </div>
        <label className="assetField">
          <span>Inspector Notes</span>
          <textarea
            rows={3}
            value={dailyInspectionDraft.notes}
            onChange={(event) => setDailyInspectionDraft((current) => ({ ...current, notes: event.target.value }))}
            placeholder="Add quick notes for this vehicle inspection..."
          />
        </label>
        <div className="assetFormActions">
          <button className="primaryAction" type="button" onClick={handleCompleteDailyInspection}>
            Complete Inspection
          </button>
        </div>
      </section>
    </div>
  );
}
