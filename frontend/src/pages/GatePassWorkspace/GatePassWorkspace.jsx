import { useState, useMemo, useRef } from "react";
import { Printer, FileSpreadsheet, LogOut, LogIn, RefreshCw, X, Upload, Banknote } from "lucide-react";
import { escapeHtml } from "../../utils/csvExport";
import { todayInputValue } from "../../utils/dateHelpers";

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleString("en-PK", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function printGatePass(record, type) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) { alert("Please allow popups to print."); return; }

  const rows = [
    ["Gate Pass No.", record.formatted_id || `OUTM-${record.id}`],
    ["Status", record.status === "outside_gate" ? "Outward (Outside Gate)" : "Inward (Returned)"],
    ["Asset Name", record.asset_name || "-"],
    ["Asset Tag", record.asset_tag || "-"],
    ["Category", record.category || "-"],
    ["Meter Reading", record.meter_reading || "-"],
    ["Vendor", record.vendor || "-"],
    ["Notes", record.notes || "-"],
    ["Out Time", formatDateTime(record.out_time)],
    ["In Time", formatDateTime(record.in_time)],
    ...(record.payment_amount ? [
      ["Payment Amount", `Rs. ${record.payment_amount}`],
      ["Payment Method", record.payment_method || "-"],
      ["Payment Notes", record.payment_notes || "-"],
    ] : []),
  ];

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Gate Pass - ${record.formatted_id || record.id}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 40px; color: #0f172a; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #1d4ed8; padding-bottom: 20px; margin-bottom: 30px; }
    .org-title { font-size: 22px; font-weight: 800; color: #1d4ed8; }
    .org-sub { font-size: 12px; color: #64748b; margin-top: 4px; }
    .pass-id { font-size: 28px; font-weight: 800; color: ${record.status === "outside_gate" ? "#b91c1c" : "#15803d"}; }
    .pass-type { font-size: 13px; text-transform: uppercase; font-weight: 700; letter-spacing: .05em; color: #64748b; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { border: 1px solid #e2e8f0; padding: 12px 16px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; color: #475569; width: 35%; }
    td { color: #1e293b; }
    .status-badge { display: inline-block; padding: 4px 14px; border-radius: 999px; font-weight: 700; font-size: 13px;
      background: ${record.status === "outside_gate" ? "#fee2e2" : "#dcfce7"};
      color: ${record.status === "outside_gate" ? "#b91c1c" : "#15803d"};
    }
    .section-heading { margin-top: 24px; font-size: 15px; font-weight: 700; color: #1d4ed8; border-left: 3px solid #1d4ed8; padding-left: 10px; }
    .footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    .sig-block { margin-top: 60px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; }
    .sig-line { border-top: 1px solid #334155; padding-top: 8px; font-size: 12px; color: #475569; text-align: center; }
    .no-print button { padding: 10px 20px; background: #1d4ed8; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 15px; margin-bottom: 20px; }
    @media print { .no-print { display: none; } }
  </style>
</head>
<body>
  <div class="no-print"><button onclick="window.print()">🖨️ Print Gate Pass</button></div>
  <div class="header">
    <div>
      <div class="org-title">Asset Management System</div>
      <div class="org-sub">Gate Pass Document &mdash; ${type}</div>
      <div class="org-sub">Generated: ${new Date().toLocaleString()}</div>
    </div>
    <div style="text-align:right;">
      <div class="pass-id">${escapeHtml(record.formatted_id || `OUTM-${record.id}`)}</div>
      <div class="pass-type">${record.status === "outside_gate" ? "Outward Gate Pass" : "Inward Gate Pass"}</div>
    </div>
  </div>
  <div class="section-heading">Asset Details</div>
  <table>
    <tbody>
      ${rows.map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${k === "Status" ? `<span class="status-badge">${escapeHtml(v)}</span>` : escapeHtml(v)}</td></tr>`).join("")}
    </tbody>
  </table>
  <div class="sig-block">
    <div class="sig-line">Driver / In-charge Signature</div>
    <div class="sig-line">Security Guard Signature</div>
    <div class="sig-line">Manager Approval</div>
  </div>
  <div class="footer">
    <span>Asset Management System &mdash; Gate Pass Control</span>
    <span>Printed: ${new Date().toLocaleString()}</span>
  </div>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
}

function downloadGatePassExcel(records, tab) {
  const generatedAt = new Date().toLocaleString();
  const title = tab === "outward" ? "Outward Gate Pass Register" : "Inward Gate Pass Register";
  const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<style>
  body { font-family: Calibri, 'Segoe UI', Arial, sans-serif; margin: 24px; color: #1f2937; }
  .title { font-size: 20px; font-weight: 700; margin-bottom: 4px; color: #124b8a; }
  .meta { font-size: 12px; color: #64748b; margin-bottom: 14px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #dbe5f0; padding: 10px 12px; text-align: left; vertical-align: middle; }
  th { background: #124b8a; color: #ffffff; font-weight: 700; letter-spacing: .02em; }
  tr:nth-child(even) td { background: #f8fbff; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; }
  .out { background: #fee2e2; color: #b91c1c; }
  .in  { background: #dcfce7; color: #15803d; }
</style></head>
<body>
  <div class="title">${escapeHtml(title)}</div>
  <div class="meta">Generated: ${escapeHtml(generatedAt)} | Total: ${records.length} records</div>
  <table>
    <thead>
      <tr>
        <th>#</th><th>Gate Pass No.</th><th>Asset Name</th><th>Asset Tag</th>
        <th>Category</th><th>Meter Reading</th><th>Vendor</th><th>Notes</th>
        <th>Out Time</th><th>In Time</th><th>Payment (Rs.)</th><th>Pay Method</th><th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${records.map((r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.formatted_id || `OUTM-${r.id}`)}</td>
        <td>${escapeHtml(r.asset_name || "-")}</td>
        <td>${escapeHtml(r.asset_tag || "-")}</td>
        <td>${escapeHtml(r.category || "-")}</td>
        <td>${escapeHtml(r.meter_reading || "-")}</td>
        <td>${escapeHtml(r.vendor || "-")}</td>
        <td>${escapeHtml(r.notes || "-")}</td>
        <td>${escapeHtml(formatDateTime(r.out_time))}</td>
        <td>${escapeHtml(formatDateTime(r.in_time))}</td>
        <td>${escapeHtml(r.payment_amount ? `Rs. ${r.payment_amount}` : "-")}</td>
        <td>${escapeHtml(r.payment_method || "-")}</td>
        <td><span class="pill ${r.status === "outside_gate" ? "out" : "in"}">${r.status === "outside_gate" ? "Outward" : "Inward"}</span></td>
      </tr>`).join("")}
    </tbody>
  </table>
</body></html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gate-pass-${tab}-${todayInputValue()}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ─────────────────────────── Payment Dialog ─────────────────────────── */
function PaymentDialog({ record, onClose, onConfirm, loading }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [proofFiles, setProofFiles] = useState([]);
  const fileRef = useRef(null);

  function handleFiles(files) {
    const accepted = Array.from(files).filter(f =>
      f.type.startsWith("image/") || f.type === "application/pdf"
    );
    setProofFiles(prev => [...prev, ...accepted].slice(0, 5));
  }

  function removeFile(idx) {
    setProofFiles(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    await onConfirm({ amount, method, notes, proofFiles });
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{ background: "#fff", borderRadius: "16px", width: "min(520px, 95vw)", boxShadow: "0 25px 60px rgba(0,0,0,0.25)", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: "#0f172a", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#fff", display: "flex", alignItems: "center", gap: "10px" }}>
              <Banknote size={18} color="#34d399" />
              Mark Inward + Payment
            </div>
            <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginTop: 4 }}>
              {record.formatted_id} — {record.asset_name}
            </div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Amount */}
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b" }}>
              Payment Amount (Rs.)
            </span>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="e.g. 15000 (Optional)"
              style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "1rem", outline: "none" }}
            />
          </label>

          {/* Method */}
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b" }}>
              Payment Method
            </span>
            <select
              value={method}
              onChange={e => setMethod(e.target.value)}
              style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.93rem", outline: "none" }}
            >
              <option>Cash</option>
              <option>Bank Transfer</option>
              <option>Cheque</option>
              <option>Online Payment</option>
              <option>Credit Card</option>
            </select>
          </label>

          {/* Notes */}
          <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b" }}>
              Payment Notes / Invoice Ref.
            </span>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Invoice number, reference, or any additional notes..."
              style={{ padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "0.93rem", minHeight: "72px", resize: "vertical", outline: "none" }}
            />
          </label>

          {/* File Upload */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span style={{ fontWeight: 700, fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.07em", color: "#64748b" }}>
              Proof of Payment (PDF / Images, max 5)
            </span>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              style={{
                border: "2px dashed #bfdbfe", borderRadius: "10px", padding: "20px",
                textAlign: "center", cursor: "pointer", background: "#f8fafc",
                transition: "border-color 0.2s ease",
              }}
            >
              <Upload size={22} color="#3b82f6" style={{ marginBottom: 6 }} />
              <div style={{ fontSize: "0.88rem", color: "#475569", fontWeight: 600 }}>Click to upload or drag & drop</div>
              <div style={{ fontSize: "0.76rem", color: "#94a3b8" }}>PDF, JPG, PNG (max 5 files)</div>
              <input ref={fileRef} type="file" multiple accept="image/*,application/pdf"
                style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
            </div>

            {proofFiles.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {proofFiles.map((f, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "#f1f5f9", borderRadius: "7px", fontSize: "0.85rem" }}>
                    <span style={{ color: "#1e293b", fontWeight: 600 }}>📎 {f.name}</span>
                    <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#f8fafc", fontWeight: 600, cursor: "pointer" }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              padding: "10px 24px", borderRadius: "8px", border: "none",
              background: loading ? "#94a3b8" : "#15803d",
              color: "#fff", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", gap: "7px",
            }}
          >
            <LogIn size={15} />
            {loading ? "Saving..." : "Confirm Inward & Save Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Main Component ─────────────────────────── */
export default function GatePassWorkspace({ records = [], onMarkReturned, onRefresh, loading }) {
  const [activeTab, setActiveTab] = useState("outward");
  const [search, setSearch] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(null); // record or null
  const [paymentLoading, setPaymentLoading] = useState(false);

  const [colSearch, setColSearch] = useState({
    id: "",
    asset_name: "",
    asset_tag: "",
    category: "",
    vendor: "",
    out_time: "",
    in_time: "",
    payment: "",
    status: "",
  });

  const outwardRecords = useMemo(() =>
    records.filter(r => r.status === "outside_gate"), [records]);
  const inwardRecords = useMemo(() =>
    records.filter(r => r.status === "inside_gate"), [records]);

  const currentRecords = useMemo(() => {
    const list = activeTab === "outward" ? outwardRecords : inwardRecords;
    return list.filter(r => {
      // Global Search
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const globalMatch = [r.asset_name, r.asset_tag, r.category, r.vendor, r.formatted_id, `OUTM-${r.id}`]
          .filter(Boolean).some(v => String(v).toLowerCase().includes(q));
        if (!globalMatch) return false;
      }

      // Column Specific Searches
      if (colSearch.id.trim()) {
        const val = String(r.formatted_id || `OUTM-${r.id}`).toLowerCase();
        if (!val.includes(colSearch.id.trim().toLowerCase())) return false;
      }
      if (colSearch.asset_name.trim()) {
        const val = String(r.asset_name || "").toLowerCase();
        if (!val.includes(colSearch.asset_name.trim().toLowerCase())) return false;
      }
      if (colSearch.asset_tag.trim()) {
        const val = String(r.asset_tag || "").toLowerCase();
        if (!val.includes(colSearch.asset_tag.trim().toLowerCase())) return false;
      }
      if (colSearch.category.trim()) {
        const val = String(r.category || "").toLowerCase();
        if (!val.includes(colSearch.category.trim().toLowerCase())) return false;
      }
      if (colSearch.vendor.trim()) {
        const val = String(r.vendor || "").toLowerCase();
        if (!val.includes(colSearch.vendor.trim().toLowerCase())) return false;
      }
      if (colSearch.out_time.trim()) {
        const val = String(formatDateTime(r.out_time) || "").toLowerCase();
        if (!val.includes(colSearch.out_time.trim().toLowerCase())) return false;
      }
      if (colSearch.in_time.trim()) {
        const val = String(formatDateTime(r.in_time) || "").toLowerCase();
        if (!val.includes(colSearch.in_time.trim().toLowerCase())) return false;
      }
      if (colSearch.payment.trim()) {
        const val = String(r.payment_amount || "").toLowerCase();
        if (!val.includes(colSearch.payment.trim().toLowerCase())) return false;
      }
      if (colSearch.status.trim()) {
        const statusLabel = r.status === "outside_gate" ? "outside" : "returned";
        if (!statusLabel.includes(colSearch.status.trim().toLowerCase())) return false;
      }

      return true;
    });
  }, [activeTab, outwardRecords, inwardRecords, search, colSearch]);

  async function handlePaymentConfirm({ amount, method, notes, proofFiles }) {
    if (!paymentDialog) return;
    setPaymentLoading(true);
    try {
      await onMarkReturned(paymentDialog.id, { amount, method, notes });
      setPaymentDialog(null);
      setActiveTab("inward"); // switch to inward to show result
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setPaymentLoading(false);
    }
  }

  const tabStyle = (tab) => ({
    flex: 1, padding: "12px 20px", borderRadius: "10px", fontWeight: 700, fontSize: "1rem",
    cursor: "pointer",
    border: `1px solid ${activeTab === tab ? (tab === "outward" ? "#fecaca" : "#86efac") : "#e2e8f0"}`,
    background: activeTab === tab ? (tab === "outward" ? "#fef2f2" : "#f0fdf4") : "#ffffff",
    color: activeTab === tab ? (tab === "outward" ? "#b91c1c" : "#15803d") : "#64748b",
    transition: "all 0.2s ease",
    display: "flex", alignItems: "center", gap: "8px", justifyContent: "center",
  });

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Payment Dialog */}
      {paymentDialog && (
        <PaymentDialog
          record={paymentDialog}
          onClose={() => setPaymentDialog(null)}
          onConfirm={handlePaymentConfirm}
          loading={paymentLoading}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#64748b" }}>
            Gate Pass Control
          </span>
          <h1 style={{ margin: "4px 0 0", fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
            Outward / Inward Register
          </h1>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button type="button" onClick={onRefresh}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "8px", background: "#f8fafc", border: "1px solid #e2e8f0", color: "#475569", fontWeight: 600, cursor: "pointer" }}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button type="button" onClick={() => downloadGatePassExcel(currentRecords, activeTab)}
            style={{ display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", borderRadius: "8px", background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", fontWeight: 600, cursor: "pointer" }}>
            <FileSpreadsheet size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "12px" }}>
        <button type="button" style={tabStyle("outward")} onClick={() => setActiveTab("outward")}>
          <LogOut size={16} />
          Outward
          <span style={{ background: "#fee2e2", color: "#b91c1c", borderRadius: "999px", padding: "1px 10px", fontSize: "0.8rem" }}>
            {outwardRecords.length}
          </span>
        </button>
        <button type="button" style={tabStyle("inward")} onClick={() => setActiveTab("inward")}>
          <LogIn size={16} />
          Inward
          <span style={{ background: "#dcfce7", color: "#15803d", borderRadius: "999px", padding: "1px 10px", fontSize: "0.8rem" }}>
            {inwardRecords.length}
          </span>
        </button>
      </div>

      {/* Search Bar with Clear Button */}
      {/* <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search by asset name, tag, vendor, category, gate pass #..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.93rem", boxSizing: "border-box", outline: "none" }}
        />
        {(search || Object.values(colSearch).some(Boolean)) && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setColSearch({ id: "", asset_name: "", asset_tag: "", category: "", vendor: "", out_time: "", in_time: "", payment: "", status: "" });
            }}
            style={{ padding: "10px 16px", borderRadius: "8px", background: "#f1f5f9", border: "1px solid #cbd5e1", color: "#475569", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Clear Filters
          </button>
        )}
      </div> */}

      {/* Table */}
      <section className="panel" style={{ overflow: "hidden" }}>
        <div className="panelHeader">
          {/* <h2>{activeTab === "outward" ? "Outward Gate Passes — Assets Outside" : "Inward Gate Passes — Assets Returned"}</h2> */}
          <span style={{ fontSize: "0.85rem", color: "#64748b" }}>{currentRecords.length} records</span>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Loading records...</div>
        ) : (
          <div className="nativeTableWrap" style={{ overflowX: "auto" }}>
            <table className="inventoryTable" style={{ width: "100%", minWidth: "960px" }}>
              <thead>
                <tr>
                  <th>Gate Pass #</th>
                  <th>Asset Name</th>
                  <th>Asset Tag</th>
                  <th>Category</th>
                  <th>Vendor</th>
                  <th>Out Time</th>
                  <th>In Time</th>
                  {activeTab === "inward" && <th>Payment</th>}
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
                <tr>
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                    <input type="text" placeholder="Search ID..." value={colSearch.id} onChange={e => setColSearch({ ...colSearch, id: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </th>
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                    <input type="text" placeholder="Search name..." value={colSearch.asset_name} onChange={e => setColSearch({ ...colSearch, asset_name: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </th>
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                    <input type="text" placeholder="Search tag..." value={colSearch.asset_tag} onChange={e => setColSearch({ ...colSearch, asset_tag: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </th>
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                    <input type="text" placeholder="Search category..." value={colSearch.category} onChange={e => setColSearch({ ...colSearch, category: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </th>
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                    <input type="text" placeholder="Search vendor..." value={colSearch.vendor} onChange={e => setColSearch({ ...colSearch, vendor: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </th>
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                    <input type="text" placeholder="Search date..." value={colSearch.out_time} onChange={e => setColSearch({ ...colSearch, out_time: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </th>
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                    <input type="text" placeholder="Search date..." value={colSearch.in_time} onChange={e => setColSearch({ ...colSearch, in_time: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </th>
                  {activeTab === "inward" && (
                    <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                      <input type="text" placeholder="Search payment..." value={colSearch.payment} onChange={e => setColSearch({ ...colSearch, payment: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                    </th>
                  )}
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}>
                    <input type="text" placeholder="Search status..." value={colSearch.status} onChange={e => setColSearch({ ...colSearch, status: e.target.value })} style={{ width: "100%", padding: "5px 8px", borderRadius: "4px", border: "1px solid #cbd5e1", fontSize: "0.8rem", boxSizing: "border-box" }} />
                  </th>
                  <th style={{ padding: "6px 10px", background: "#f8fafc" }}></th>
                </tr>
              </thead>
              <tbody>
                {currentRecords.length === 0 ? (
                  <tr>
                    <td colSpan={activeTab === "inward" ? 10 : 9} style={{ textAlign: "center", padding: "40px 20px", color: "#64748b", fontSize: "0.95rem" }}>
                      <div style={{ background: "#ffffff", borderRadius: "12px", border: "1px dashed #cbd5e1", padding: "30px 20px" }}>
                        {activeTab === "outward"
                          ? "No assets currently outside the gate or matching current search filters."
                          : "No assets have been returned yet or matching current search filters."}
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentRecords.map(record => (
                    <tr key={record.id}>
                      <td><span style={{ fontWeight: 700, color: "#1d4ed8" }}>{record.formatted_id || `OUTM-${record.id}`}</span></td>
                      <td style={{ fontWeight: 600 }}>{record.asset_name || "-"}</td>
                      <td>
                        <span style={{ fontFamily: "monospace", background: "#f1f5f9", padding: "2px 8px", borderRadius: "4px" }}>
                          {record.asset_tag || "-"}
                        </span>
                      </td>
                      <td>{record.category || "-"}</td>
                      <td>{record.vendor || "-"}</td>
                      <td style={{ fontSize: "0.85rem", color: "#475569" }}>{formatDateTime(record.out_time)}</td>
                      <td style={{ fontSize: "0.85rem", color: "#475569" }}>{formatDateTime(record.in_time)}</td>
                      {activeTab === "inward" && (
                        <td>
                          {record.payment_amount
                            ? <span style={{ fontWeight: 700, color: "#15803d" }}>Rs. {record.payment_amount}</span>
                            : <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>No payment</span>}
                        </td>
                      )}
                      <td>
                        <span style={{
                          display: "inline-block", padding: "3px 12px", borderRadius: "999px", fontWeight: 700, fontSize: "0.8rem",
                          background: record.status === "outside_gate" ? "#fee2e2" : "#dcfce7",
                          color: record.status === "outside_gate" ? "#b91c1c" : "#15803d",
                        }}>
                          {record.status === "outside_gate" ? "Outside" : "Returned"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button type="button" title="Print Gate Pass"
                            onClick={() => printGatePass(record, activeTab === "outward" ? "Outward" : "Inward")}
                            style={{ padding: "6px 10px", borderRadius: "6px", background: "#eff6ff", border: "1px solid #bfdbfe", color: "#1d4ed8", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, fontSize: "0.8rem" }}>
                            <Printer size={13} /> Print
                          </button>
                          {record.status === "outside_gate" && (
                            <button type="button" title="Mark as Returned — Enter Payment"
                              onClick={() => setPaymentDialog(record)}
                              style={{ padding: "6px 10px", borderRadius: "6px", background: "#f0fdf4", border: "1px solid #86efac", color: "#15803d", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontWeight: 600, fontSize: "0.8rem" }}>
                              <LogIn size={13} /> Mark Inward
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
