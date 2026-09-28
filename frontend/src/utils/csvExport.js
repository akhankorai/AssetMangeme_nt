import { formatDate } from "./formatting";
import { todayInputValue, dateToInputValue } from "./dateHelpers";

export function escapeCsvCell(value) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replaceAll("\"", "\"\"")}"`;
  }
  return text;
}

export function buildTasksCsv(tasks) {
  const header = ["Task", "Asset Tag", "Service Type", "Assignee", "Due Date", "Stage", "Priority"];
  const rows = tasks.map((task) => [
    task.title || "",
    task.assetTag || "",
    task.serviceType || "",
    task.assignee || "",
    task.dueDate ? formatDate(task.dueDate) : "",
    String(task.stage || "").replaceAll("_", " "),
    task.risk || "",
  ]);
  return [header, ...rows].map((row) => row.map((cell) => escapeCsvCell(cell)).join(",")).join("\n");
}

export function downloadExcelCompatibleCsv(tasks, filenamePrefix = "task-sheet") {
  const csvText = buildTasksCsv(tasks);
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${todayInputValue()}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

export function downloadModernNotificationExcel(tasks, filenamePrefix = "task-notifications") {
  const rows = (tasks || []).map((task) => ({
    title: task.title || "",
    assetTag: task.assetTag || "",
    serviceType: task.serviceType || "",
    assignee: task.assignee || "Unassigned",
    dueDate: task.dueDate ? formatDate(task.dueDate) : "",
    stage: String(task.stage || "").replaceAll("_", " "),
    priority: task.risk || "",
    window: task.windowKey === "tomorrow" ? "Pre-informed (Tomorrow)" : "Today",
  }));

  const generatedAt = new Date().toLocaleString();
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: Calibri, Segoe UI, Arial, sans-serif; margin: 24px; color: #1f2937; }
    .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #124b8a; }
    .meta { font-size: 12px; color: #64748b; margin-bottom: 14px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #dbe5f0; padding: 10px 12px; text-align: left; vertical-align: middle; }
    th { background: #124b8a; color: #ffffff; font-weight: 700; letter-spacing: .02em; }
    tr:nth-child(even) td { background: #f8fbff; }
    .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
    .stage { background: #e7f1ff; color: #124b8a; }
    .risk { background: #eef2ff; color: #2f4c8f; }
  </style>
</head>
<body>
  <div class="title">Task Notification Sheet</div>
  <div class="meta">Generated: ${escapeHtml(generatedAt)} | Total tasks: ${rows.length}</div>
  <table>
    <thead>
      <tr>
        <th>Task</th>
        <th>Asset Tag</th>
        <th>Service Type</th>
        <th>Assignee</th>
        <th>Due Date</th>
        <th>Type</th>
        <th>Stage</th>
        <th>Priority</th>
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>
            <td>${escapeHtml(row.title)}</td>
            <td>${escapeHtml(row.assetTag)}</td>
            <td>${escapeHtml(row.serviceType)}</td>
            <td>${escapeHtml(row.assignee)}</td>
            <td>${escapeHtml(row.dueDate)}</td>
            <td>${escapeHtml(row.window)}</td>
            <td><span class="pill stage">${escapeHtml(row.stage || "planned")}</span></td>
            <td><span class="pill risk">${escapeHtml(row.priority || "Medium")}</span></td>
          </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filenamePrefix}-${todayInputValue()}.xls`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
