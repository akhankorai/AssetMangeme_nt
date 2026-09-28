import React from "react";
import { formatDate } from "../../utils/formatting";

export default function TaskModal({ viewedTask, isTaskModalClosing, onClose }) {
  if (!viewedTask) return null;

  return (
    <div
      className={`assetModalBackdrop ${isTaskModalClosing ? "closing" : "open"}`}
      role="presentation"
      onClick={onClose}
    >
      <section
        className={`panel assetModal ${isTaskModalClosing ? "closing" : "open"}`}
        role="dialog"
        aria-modal="true"
        aria-label="Task Details"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panelHeader">
          <h2>Task Details</h2>
          <div className="assetModalActions">
            <button type="button" onClick={onClose}>
              Close
            </button>
          </div>
        </div>
        <dl className="detailGrid">
          <div>
            <dt>Task</dt>
            <dd>{viewedTask.title}</dd>
          </div>
          <div>
            <dt>Asset Tag</dt>
            <dd>{viewedTask.assetTag || "Not assigned"}</dd>
          </div>
          <div>
            <dt>Service Type</dt>
            <dd>{viewedTask.serviceType || "Not set"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{viewedTask.stage === "declined" ? "Declined" : "Completed"}</dd>
          </div>
          <div>
            <dt>Completed On</dt>
            <dd>{formatDate(viewedTask.completedAt || viewedTask.assignedAt || viewedTask.dueDate)}</dd>
          </div>
          <div>
            <dt>Assignee</dt>
            <dd>{viewedTask.assignee || "Unassigned"}</dd>
          </div>
          <div>
            <dt>Consumed Item</dt>
            <dd>
              {viewedTask.consumedItemName
                ? `${viewedTask.consumedItemName} x${Math.max(1, Number(viewedTask.consumedQuantity) || 1)}`
                : "No inventory item assigned"}
            </dd>
          </div>
          <div>
            <dt>Meter Reading</dt>
            <dd>{viewedTask.meterReading || "Not recorded"}</dd>
          </div>
          <div>
            <dt>Inspection</dt>
            <dd>{viewedTask.inspectionRequired === false ? "Not Needed" : "Needed"}</dd>
          </div>
          <div>
            <dt>Inspection Comment</dt>
            <dd>{viewedTask.inspectionComment || "None"}</dd>
          </div>
          <div>
            <dt>Progress</dt>
            <dd>{Number(viewedTask.progress) || 0}%</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
