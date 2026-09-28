export function printEntry(entry, type, title = "Record Details") {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow popups to print records.");
    return;
  }

  let metaItems = [];
  let checklistHtml = "";

  for (const [key, value] of Object.entries(entry)) {
    if (
      key === "formatted_id" || 
      key === "id" || 
      key.endsWith("_id") || 
      key === "created_at" || 
      key === "updated_at" || 
      key === "isGrouped" || 
      key === "groupedTasks" ||
      key === "companyId"
    ) continue;
    
    // Formatting the key for display
    const displayKey = key
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());

    const displayValue = value === null || value === undefined || value === "" ? "-" : String(value);

    // If it's the title, we extract it for the checklist section
    if (key === "title") {
      const services = displayValue === "-" ? [] : displayValue.split(" + ");
      checklistHtml = `
        <div class="section-title">Service Checklist</div>
        <table class="checklist-table">
          <thead>
            <tr>
              <th class="task-desc">Task / Service Description</th>
              <th class="task-check">Completed</th>
            </tr>
          </thead>
          <tbody>
            ${services.length > 0 ? services.map((v, i) => `
              <tr>
                <td class="task-desc">${i + 1}. ${v}</td>
                <td class="task-check"><div class="checkbox"></div></td>
              </tr>
            `).join("") : `
              <tr>
                <td class="task-desc">-</td>
                <td class="task-check"><div class="checkbox"></div></td>
              </tr>
            `}
          </tbody>
        </table>
      `;
      continue;
    }

    metaItems.push({ label: displayKey, value: displayValue });
  }

  let metaGridHtml = `<table class="meta-table"><tbody>`;
  for (let i = 0; i < metaItems.length; i += 2) {
    const item1 = metaItems[i];
    const item2 = metaItems[i + 1] || { label: "", value: "" };
    metaGridHtml += `
      <tr>
        <td class="meta-label">${item1.label}</td>
        <td class="meta-value">${item1.value}</td>
        <td class="meta-label">${item2.label ? item2.label : ""}</td>
        <td class="meta-value">${item2.label ? item2.value : ""}</td>
      </tr>
    `;
  }
  metaGridHtml += `</tbody></table>`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print - ${entry.formatted_id || entry.id || "Record"}</title>
        <style>
          body {
            font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
            color: #1e293b;
            margin: 0;
            padding: 40px;
            background: #ffffff;
          }
          .page-container {
            max-width: 850px;
            margin: 0 auto;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 3px solid #0f172a;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo-section {
            display: flex;
            align-items: center;
            gap: 12px;
          }
          .logo-icon {
            width: 44px;
            height: 44px;
            background: #0f172a;
            color: #fff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 24px;
          }
          .company-name {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin: 0;
          }
          .doc-type {
            font-size: 13px;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 4px 0 0 0;
            font-weight: 600;
          }
          .header-right {
            text-align: right;
          }
          .doc-id {
            font-size: 24px;
            font-weight: 800;
            color: #2563eb;
            margin: 0 0 4px 0;
          }
          .doc-date {
            font-size: 13px;
            color: #64748b;
            margin: 0;
          }
          
          .section-title {
            font-size: 13px;
            font-weight: 800;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            border-bottom: 2px solid #cbd5e1;
            padding-bottom: 8px;
            margin: 35px 0 15px 0;
          }

          .meta-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #cbd5e1;
          }
          .meta-table td {
            border: 1px solid #cbd5e1;
            padding: 12px 14px;
            font-size: 13px;
          }
          .meta-label {
            background: #f8fafc;
            font-weight: 700;
            color: #475569;
            width: 20%;
            text-transform: uppercase;
            font-size: 11px !important;
            letter-spacing: 0.5px;
          }
          .meta-value {
            color: #0f172a;
            width: 30%;
            word-break: break-word;
            font-weight: 500;
          }

          .checklist-table {
            width: 100%;
            border-collapse: collapse;
          }
          .checklist-table th {
            background: #f8fafc;
            text-align: left;
            padding: 12px 14px;
            font-size: 12px;
            font-weight: 700;
            color: #475569;
            border: 1px solid #cbd5e1;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .checklist-table td {
            padding: 14px;
            border: 1px solid #cbd5e1;
            font-size: 14px;
            color: #0f172a;
            font-weight: 500;
          }
          .task-desc {
            width: 85%;
          }
          .task-check {
            width: 15%;
            text-align: center;
          }
          .checkbox {
            width: 20px;
            height: 20px;
            border: 2px solid #64748b;
            border-radius: 4px;
            margin: 0 auto;
          }

          .signatures {
            display: flex;
            justify-content: space-between;
            margin-top: 70px;
            padding-top: 20px;
          }
          .sig-block {
            width: 28%;
          }
          .sig-line {
            border-bottom: 1px solid #0f172a;
            margin-bottom: 8px;
            height: 40px;
          }
          .sig-label {
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
          }

          .footer {
            margin-top: 60px;
            text-align: center;
            color: #94a3b8;
            font-size: 11px;
            border-top: 1px solid #e2e8f0;
            padding-top: 20px;
            font-weight: 500;
          }
          
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
            .page-container { max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 24px; background: #0f172a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600; letter-spacing: 0.5px;">Print Document</button>
        </div>
        
        <div class="page-container">
          <div class="header">
            <div class="logo-section">
              <div class="logo-icon">P</div>
              <div>
                <h1 class="company-name">Precision Assets Suite</h1>
                <p class="doc-type">${type}</p>
              </div>
            </div>
            <div class="header-right">
              <h2 class="doc-id">${entry.formatted_id || `#${entry.id || ""}`}</h2>
              <p class="doc-date">Date Generated: ${new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div class="section-title">${title}</div>
          ${metaGridHtml}

          ${checklistHtml}

          <div class="signatures">
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">Assigned Technician</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">Quality Inspector / Supervisor</div>
            </div>
            <div class="sig-block">
              <div class="sig-line"></div>
              <div class="sig-label">Date Completed</div>
            </div>
          </div>

          <div class="footer">
            Generated by Precision Assets Suite &mdash; ${new Date().toLocaleString()}
          </div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Give it a tiny bit of time to render before triggering print
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

