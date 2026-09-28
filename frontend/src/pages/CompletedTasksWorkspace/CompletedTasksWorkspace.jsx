import { useState, useMemo } from "react";
import { CheckCheck, Printer } from "lucide-react";
import { printEntry } from "../../utils/printUtils";
import { formatDate } from "../../utils/formatting";

export default function CompletedTasksWorkspace({ completedTasks, onOpenTask }) {
  const [taskFilters, setTaskFilters] = useState({
    task: "",
    asset: "",
    meter: "",
    completedOn: "",
    consumedItem: "",
  });

  const filteredCompletedTasks = useMemo(() => {
    const taskQuery = taskFilters.task.trim().toLowerCase();
    const assetQuery = taskFilters.asset.trim().toLowerCase();
    const meterQuery = taskFilters.meter.trim().toLowerCase();
    const completedOnQuery = taskFilters.completedOn.trim().toLowerCase();
    const consumedItemQuery = taskFilters.consumedItem.trim().toLowerCase();

    return completedTasks.filter((task) => {
      const completedOnValue = formatDate(task.completedAt || task.dueDate || "");
      const consumedItemText = task.consumedItemName
        ? `${task.consumedItemName} x${Math.max(1, Number(task.consumedQuantity) || 1)}`
        : "No inventory item assigned";

      const matchesTask = !taskQuery || String(task.title || "").toLowerCase().includes(taskQuery);
      const matchesAsset = !assetQuery || String(task.assetTag || "").toLowerCase().includes(assetQuery);
      const matchesMeter = !meterQuery || String(task.meterReading || "").toLowerCase().includes(meterQuery);
      const matchesCompletedOn =
        !completedOnQuery ||
        completedOnValue.toLowerCase().includes(completedOnQuery) ||
        String(task.completedAt || task.dueDate || "").toLowerCase().includes(completedOnQuery);
      const matchesConsumedItem = !consumedItemQuery || consumedItemText.toLowerCase().includes(consumedItemQuery);

      return matchesTask && matchesAsset && matchesMeter && matchesCompletedOn && matchesConsumedItem;
    });
  }, [completedTasks, taskFilters]);

  return (
    <section className="tasksWorkspace">
      <div className="scheduleHeader">
        <div>
          <span className="eyebrow">Completed Workflow</span>
          <h1>Completed Tasks</h1>
        </div>
      </div>

      <section className="panel completedTasksPanel">
        <div className="panelHeader">
          <h2>Task Archive</h2>
          <span className="settingsCount">{filteredCompletedTasks.length} completed tasks</span>
        </div>

        {completedTasks.length === 0 ? (
          <div className="emptyState">No completed tasks yet.</div>
        ) : (
          <>
            <div className="nativeTableWrap">
              <table className="inventoryTable">
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Asset</th>
                    <th>Meter Reading</th>
                    <th>Completed On</th>
                    <th>Consumed Item</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                  <tr>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        value={taskFilters.task}
                        onChange={(event) => setTaskFilters((prev) => ({ ...prev, task: event.target.value }))}
                        placeholder="Search task..."
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        value={taskFilters.asset}
                        onChange={(event) => setTaskFilters((prev) => ({ ...prev, asset: event.target.value }))}
                        placeholder="Search asset..."
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        value={taskFilters.meter}
                        onChange={(event) => setTaskFilters((prev) => ({ ...prev, meter: event.target.value }))}
                        placeholder="Search meter..."
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        value={taskFilters.completedOn}
                        onChange={(event) => setTaskFilters((prev) => ({ ...prev, completedOn: event.target.value }))}
                        placeholder="Search date..."
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        value={taskFilters.consumedItem}
                        onChange={(event) => setTaskFilters((prev) => ({ ...prev, consumedItem: event.target.value }))}
                        placeholder="Search item..."
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                  </tr>
                </thead>
              <tbody>
              {filteredCompletedTasks.length === 0 ? (
                <tr>
                  <td colSpan="6" className="emptyState">No completed tasks match your search.</td>
                </tr>
              ) : null}
              {filteredCompletedTasks.map((task) => (
                <tr key={task.id} className="nativeTableRow completedTaskRow" onClick={() => onOpenTask(task)}>
                  <td>
                    <div className="settingsCategoryNameCell">
                      <span className="settingsCategoryIcon">
                        <CheckCheck size={16} />
                      </span>
                      <div className="assetTextStack completedTaskStack">
                        <strong>{task.title}</strong>
                        {task.stage === "declined" ? <span className="completedTaskStatus declined">Declined</span> : null}
                      </div>
                    </div>
                  </td>
                  <td className="inventoryCellText" style={{ fontWeight: 500, color: '#3b82f6' }}>
                    {task.assetTag || "No asset"}
                  </td>
                  <td className="inventoryCellText">
                    {task.meterReading || "-"}
                  </td>
                  <td className="inventoryCellText">{formatDate(task.completedAt || task.dueDate)}</td>
                  <td className="inventoryCellText">
                    {task.consumedItemName
                      ? `${task.consumedItemName} x${Math.max(1, Number(task.consumedQuantity) || 1)}`
                      : "No inventory item assigned"}
                  </td>
                  <td className="inventoryActions" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <button
                      className="iconActionBtn"
                      title="Print Task"
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        printEntry(task, "Completed Task");
                      }}
                    >
                      <Printer size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </section>
    </section>
  );
}

