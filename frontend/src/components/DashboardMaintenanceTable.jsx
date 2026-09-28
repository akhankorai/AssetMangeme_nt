import { useState } from "react";
import { Wrench, MoreVertical } from "lucide-react";

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function DashboardMaintenanceTable({ filteredMaintenanceRows, selectedAsset, setSelectedAssetId, setActiveView, setActionMessage }) {
  const [colSearch, setColSearch] = useState({ equipment: "", priority: "", date: "", tech: "" });

  if (!filteredMaintenanceRows || filteredMaintenanceRows.length === 0) {
    return <div className="maintenanceTable empty">No upcoming maintenance.</div>;
  }

  const finalRows = filteredMaintenanceRows.filter(row => {
    const equipQ = colSearch.equipment.toLowerCase();
    const priQ = colSearch.priority.toLowerCase();
    const dateQ = colSearch.date.toLowerCase();
    const techQ = colSearch.tech.toLowerCase();

    if (equipQ && !row.asset.toLowerCase().includes(equipQ) && !(row.location_name || "").toLowerCase().includes(equipQ)) return false;
    if (priQ && !(row.priority || "Medium").toLowerCase().includes(priQ)) return false;
    if (dateQ && !formatDate(row.date).toLowerCase().includes(dateQ)) return false;
    if (techQ && !(row.tech || "Unassigned").toLowerCase().includes(techQ)) return false;
    return true;
  });

  return (
    <div className="nativeTableWrap">
      <table className="inventoryTable">
        <thead>
          <tr>
            <th>Equipment / Asset Name</th>
            <th>Priority Level</th>
            <th>Scheduled Date</th>
            <th>Assigned Technician</th>
            <th className="actionsCol"></th>
          </tr>
          <tr>
            <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <input
                type="text"
                placeholder="Search equipment..."
                value={colSearch.equipment}
                onChange={(e) => setColSearch({ ...colSearch, equipment: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </th>
            <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <input
                type="text"
                placeholder="Search priority..."
                value={colSearch.priority}
                onChange={(e) => setColSearch({ ...colSearch, priority: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </th>
            <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <input
                type="text"
                placeholder="Search date..."
                value={colSearch.date}
                onChange={(e) => setColSearch({ ...colSearch, date: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </th>
            <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <input
                type="text"
                placeholder="Search tech..."
                value={colSearch.tech}
                onChange={(e) => setColSearch({ ...colSearch, tech: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
              />
            </th>
            <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
          </tr>
        </thead>
        <tbody>
          {finalRows.length === 0 ? (
            <tr>
              <td colSpan="5" className="emptyState" style={{ textAlign: 'center', padding: '24px' }}>
                No maintenance tasks match your search.
              </td>
            </tr>
          ) : (
            finalRows.map((row) => (
        <tr
          key={`${row.id}-${row.asset}`}
          className={`nativeTableRow tableRowInteractive ${selectedAsset?.id === row.id ? "selected" : ""}`}
          onClick={() => {
            setSelectedAssetId(row.id);
            setActiveView("Assets");
            setActionMessage(`${row.asset} selected.`);
          }}
        >
          <td>
            <div className="assetCell">
              <div className="assetGlyph">
                <Wrench size={16} />
              </div>
              <div className="assetTextStack">
                <strong>{row.asset}</strong>
                <span>{row.location_name || "Routine service window"}</span>
              </div>
            </div>
          </td>
          <td>
            <span className={`priorityTag ${row.priority?.toLowerCase() || 'medium'}`}>{row.priority || 'Medium'}</span>
          </td>
          <td className="inventoryCellText">{formatDate(row.date)}</td>
          <td className="inventoryCellText">{row.tech || 'Unassigned'}</td>
          <td className="inventoryActions">
            <button
              className="ghostIcon"
              type="button"
              aria-label={`Select ${row.asset}`}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedAssetId(row.id);
                setActiveView("Assets");
              }}
            >
              <MoreVertical size={16} />
            </button>
          </td>
        </tr>
      )))}
        </tbody>
      </table>
    </div>
  );
}
