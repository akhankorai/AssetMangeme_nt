import { useState, useEffect, useMemo } from "react";
import { ChevronRight, Fuel, Search, Plus, Trash2, Printer } from "lucide-react";
import { formatDate, formatCurrency, formatQuantity } from "../../utils/formatting";
import SearchableDropdown from "../../components/SearchableDropdown";
import { printEntry } from "../../utils/printUtils";

export default function FuelDemandWorkspace({
  assets,
  allocationDrafts,
  fuelDemandDraft,
  fuelDemands,
  fuelItems,
  fuelMetrics,
  locations,
  onAllocateFuelDemand,
  onDenyFuelDemand,
  onDraftChange,
  onAddDraftRow,
  onRemoveDraftRow,
  onSaveFuelDemand,
  onTabChange,
  onSetInspectionDecision,
  fuelTab,
  canViewFuelDemand,
  canCreateFuelDemand,
  canInspectFuelDemand,
  canAllocateFuelDemand,
  canDenyFuelDemand,
}) {
  const [activeFuelTab, setActiveFuelTab] = useState("request");
  const [selectedDemands, setSelectedDemands] = useState(new Set());
  const FUEL_HISTORY_PAGE_SIZE = 10;
  const [fuelHistorySearch, setFuelHistorySearch] = useState("");
  const [fuelHistoryPage, setFuelHistoryPage] = useState(1);
  const inspectorQueueDemands = fuelDemands.filter((entry) => entry.status === "requested");
  const providerQueueDemands = fuelDemands.filter((entry) => entry.status === "approved");
  const historyDemands = fuelDemands.filter((entry) => ["rejected", "fulfilled"].includes(entry.status));
  const [pendingDemandsColSearch, setPendingDemandsColSearch] = useState({ asset: "", fuelItem: "", station: "" });
  const [historyDemandsColSearch, setHistoryDemandsColSearch] = useState({ vehicle: "", status: "", fuelItem: "", dateStart: "", dateEnd: "", liters: "" });

  const filteredHistoryDemands = useMemo(() => {
    let filtered = historyDemands;

    const vehicleQ = historyDemandsColSearch.vehicle.toLowerCase();
    const statusQ = historyDemandsColSearch.status.toLowerCase();
    const fuelItemQ = historyDemandsColSearch.fuelItem.toLowerCase();
    const litersQ = historyDemandsColSearch.liters.toLowerCase();
    const dateStartQ = historyDemandsColSearch.dateStart;
    const dateEndQ = historyDemandsColSearch.dateEnd;

    filtered = filtered.filter(entry => {
      if (vehicleQ && !entry.assetTag.toLowerCase().includes(vehicleQ) && !(entry.assetName || "").toLowerCase().includes(vehicleQ)) return false;
      if (statusQ && !entry.status.toLowerCase().includes(statusQ)) return false;
      if (fuelItemQ && !(entry.fuelItemName || "").toLowerCase().includes(fuelItemQ)) return false;
      if (litersQ && !String(entry.liters || "").toLowerCase().includes(litersQ)) return false;

      if (dateStartQ || dateEndQ) {
        const entryDateStr = String(entry.requestDate || "").split("T")[0];
        if (dateStartQ && entryDateStr < dateStartQ) return false;
        if (dateEndQ && entryDateStr > dateEndQ) return false;
      }
      return true;
    });

    const term = fuelHistorySearch.trim().toLowerCase();
    if (!term) return filtered;

    return filtered.filter((entry) =>
      [
        entry.assetTag,
        entry.assetName,
        entry.status === "rejected" ? "Rejected" : "Fulfilled",
        entry.fuelItemName || "Fuel item removed",
        formatDate(entry.requestDate),
        formatQuantity(entry.liters),
        formatQuantity(entry.meterReading),
        entry.distanceTravelled == null ? "-" : formatQuantity(entry.distanceTravelled),
        entry.averageDistancePerLiter == null ? "-" : formatQuantity(entry.averageDistancePerLiter),
        formatCurrency(entry.totalCost),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term)),
    );
  }, [fuelHistorySearch, historyDemandsColSearch, historyDemands]);

  const fuelHistoryTotalPages = Math.max(1, Math.ceil(filteredHistoryDemands.length / FUEL_HISTORY_PAGE_SIZE));
  const fuelHistoryCurrentPage = Math.min(fuelHistoryPage, fuelHistoryTotalPages);
  const fuelHistoryStartIndex = (fuelHistoryCurrentPage - 1) * FUEL_HISTORY_PAGE_SIZE;
  const currentFuelHistoryDemands = filteredHistoryDemands.slice(
    fuelHistoryStartIndex,
    fuelHistoryStartIndex + FUEL_HISTORY_PAGE_SIZE,
  );

  const rawPendingDemands = [...inspectorQueueDemands, ...providerQueueDemands];
  const pendingDemands = rawPendingDemands.filter(entry => {
    const assetQ = pendingDemandsColSearch.asset.toLowerCase();
    const fuelItemQ = pendingDemandsColSearch.fuelItem.toLowerCase();
    const stationQ = pendingDemandsColSearch.station.toLowerCase();

    if (assetQ && !entry.assetTag.toLowerCase().includes(assetQ) && !(entry.assetName || "").toLowerCase().includes(assetQ)) return false;
    if (fuelItemQ && !(entry.fuelItemName || "").toLowerCase().includes(fuelItemQ)) return false;
    if (stationQ && !(entry.station || "").toLowerCase().includes(stationQ)) return false;
    return true;
  });

  function toggleSelection(id) {
    setSelectedDemands(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedDemands.size === pendingDemands.length && pendingDemands.length > 0) {
      setSelectedDemands(new Set());
    } else {
      setSelectedDemands(new Set(pendingDemands.map(d => d.id)));
    }
  }

  function handleBulkAccept() {
    selectedDemands.forEach(id => onSetInspectionDecision(id, "accepted"));
    setSelectedDemands(new Set());
  }

  function handleBulkDeny() {
    selectedDemands.forEach(id => {
      const entry = fuelDemands.find(d => d.id === id);
      if (entry) onDenyFuelDemand(entry);
    });
    setSelectedDemands(new Set());
  }

  function handleBulkApprove() {
    selectedDemands.forEach(id => {
      const entry = fuelDemands.find(d => d.id === id);
      if (entry && allocationDrafts[id]?.inspectionDecision === "accepted") {
        onAllocateFuelDemand({ ...entry, _mode: "approve" });
      }
    });
    setSelectedDemands(new Set());
  }

  function handleBulkFulfill() {
    selectedDemands.forEach(id => {
      const entry = fuelDemands.find(d => d.id === id);
      const selectedItem = fuelItems.find((item) => item.id === entry?.fuelItemId);
      const availableLiters = Number(selectedItem?.inventory_quantity || 0);
      const hasInventory = availableLiters >= Number(entry?.liters || 0);

      if (entry && entry.status === "approved" && hasInventory) {
        onAllocateFuelDemand({ ...entry, _mode: "fulfill" });
      }
    });
    setSelectedDemands(new Set());
  }
  const fuelHistoryPageRows = filteredHistoryDemands.slice(
    (fuelHistoryCurrentPage - 1) * FUEL_HISTORY_PAGE_SIZE,
    fuelHistoryCurrentPage * FUEL_HISTORY_PAGE_SIZE,
  );

  useEffect(() => {
    setFuelHistoryPage(1);
  }, [fuelHistorySearch, historyDemands.length]);

  if (!canViewFuelDemand) {
    return (
      <section className="reportsWorkspace">
        <section className="panel reportControlPanel">
          <div className="emptyState">You do not have access to view Fuel Demand.</div>
        </section>
      </section>
    );
  }

  return (
    <section className="reportsWorkspace">
      <section className="panel reportsHeroPanel">
        <div className="reportsHeroCopy">
          <span className="reportsEyebrow">Fuel Control</span>
          <h2>Fuel Demand</h2>
        </div>
        <div className="reportsHeroMeta" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'stretch' }}>
          <div className="reportsHeroMetaCard" style={{ flex: '1 1 auto' }}>
            <span>Total demands</span>
            <strong>{fuelDemands.length}</strong>
          </div>
          <div className="reportsHeroMetaCard" style={{ flex: '1 1 auto' }}>
            <span>Total liters</span>
            <strong>{formatQuantity(fuelMetrics.totalLiters)} L</strong>
          </div>
          <div className="reportsHeroMetaCard" style={{ flex: '1 1 auto' }}>
            <span>Avg mileage</span>
            <strong>{fuelMetrics.averageMileage ? `${formatQuantity(fuelMetrics.averageMileage)} km/l` : "Not enough data"}</strong>
          </div>
        </div>
      </section>

      <div className="workspaceTabs">
        <button
          className={`workspaceTab ${activeFuelTab === "request" ? "active blue" : ""}`}
          onClick={() => setActiveFuelTab("request")}
          disabled={!canCreateFuelDemand}
        >
          Create Demand
        </button>
        <button
          className={`workspaceTab ${activeFuelTab === "allocate" ? "active red" : ""}`}
          onClick={() => setActiveFuelTab("allocate")}
          disabled={!canInspectFuelDemand && !canAllocateFuelDemand && !canDenyFuelDemand}
        >
          Pending Allocations
        </button>
        <button
          className={`workspaceTab ${activeFuelTab === "history" ? "active green" : ""}`}
          onClick={() => setActiveFuelTab("history")}
        >
          Fuel History
        </button>
      </div>

      {activeFuelTab === "request" && (
        <section className="panel" style={{ padding: '24px' }}>
          <div className="panelHeader" style={{ marginBottom: '20px' }}>
            <h2>Create Fuel Demand</h2>
          </div>
          <>
            {/* <p className="reportPanelLead">
              Fuel price and available liters come from Settings Items. Save the demand first, then allocate it after
              inventory and inspection checks.
            </p> */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {(Array.isArray(fuelDemandDraft) ? fuelDemandDraft : [fuelDemandDraft]).map((draftRow, index) => (
              <div key={draftRow._id || index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', background: '#ffffff', overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#00376eff', padding: '12px 20px', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ececedff', color: '#475569', borderRadius: '6px', width: '28px', height: '28px', fontSize: '0.85rem', fontWeight: 700 }}>{index + 1}</div>
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: '#334155' }}>Demand Entry</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveDraftRow(index)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#ef4444', background: '#fee2e2', border: 'none', cursor: 'pointer', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s' }}
                    title="Remove demand entry"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
                <div className="assetFormGrid fuelDemandFormGrid" style={{ padding: '24px' }}>
                  <label className="assetField">
                    <span>Vehicle Asset</span>
                    <SearchableDropdown
                      isMulti={false}
                      label="Vehicle Asset"
                      onChange={(nextValue) => onDraftChange(index, "assetTag", nextValue)}
                      options={assets.map((asset) => ({
                        value: asset.asset_tag,
                        label: `${asset.asset_tag} - ${asset.name}`,
                      }))}
                      placeholder="Select vehicle asset"
                      value={draftRow.assetTag || ""}
                    />
                  </label>
                  <label className="assetField">
                    <span>Fuel Item</span>
                    <select value={draftRow.fuelItemId || ""} onChange={(event) => onDraftChange(index, "fuelItemId", event.target.value)}>
                      <option value="">Select settings item</option>
                      {fuelItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} | {formatQuantity(item.inventory_quantity)} L | {formatCurrency(item.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="assetField">
                    <span>Liters</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftRow.liters}
                      onChange={(event) => onDraftChange(index, "liters", event.target.value)}
                      placeholder="0.00"
                    />
                  </label>
                  <label className="assetField">
                    <span>Meter Reading</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={draftRow.meterReading}
                      onChange={(event) => onDraftChange(index, "meterReading", event.target.value)}
                      placeholder="Enter current meter"
                    />
                  </label>
                  <label className="assetField">
                    <span>Request Date</span>
                    <input type="date" value={draftRow.requestDate} onChange={(event) => onDraftChange(index, "requestDate", event.target.value)} />
                  </label>
                  <label className="assetField">
                    <span>Station</span>
                    <select value={draftRow.station} onChange={(event) => onDraftChange(index, "station", event.target.value)}>
                      <option value="">Select station</option>
                      {locations.map((location) => (
                        <option key={location.id} value={location.name}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="assetField assetFieldWide">
                    <span>Notes</span>
                    <input
                      type="text"
                      value={draftRow.notes}
                      onChange={(event) => onDraftChange(index, "notes", event.target.value)}
                      placeholder="Optional trip or allocation notes"
                    />
                  </label>
                </div>
              </div>
            ))}
            </div>

          <div className="assetFormActions fuelDemandFormActions" style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              type="button"
              onClick={onAddDraftRow}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'transparent', color: 'var(--primary)', border: '1px solid var(--primary)', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              <Plus size={18} /> Add Demand
            </button>
            <button className="primaryAction" type="button" onClick={onSaveFuelDemand} disabled={!canCreateFuelDemand}>
              Save Fuel Demands
            </button>
          </div>
        </>
        </section>
  )
}

{
  activeFuelTab === "allocate" && (
    <section>
      <article className="panel reportControlPanel fuelDemandControlPanel">
        <div className="panelHeader">
          <h2>Approve & Fulfill Fuel Demand</h2>
        </div>
        <>
          <p className="reportPanelLead">Inspector approves/rejects demands first. Fuel Provider fulfills only approved demands.</p>

          {pendingDemands.length > 0 && selectedDemands.size > 0 && (
            <div style={{ marginBottom: '16px', padding: '12px 16px', background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: '#334155' }}>{selectedDemands.size} selected</span>
              <div style={{ width: '1px', height: '24px', background: '#cbd5e1', margin: '0 8px' }}></div>

              {canInspectFuelDemand && (
                <>
                  <button className="settingsSecondaryButton" type="button" onClick={handleBulkAccept}>Accept All</button>
                  <button className="settingsSecondaryButton danger" type="button" onClick={handleBulkDeny}>Reject All</button>
                </>
              )}
              {canInspectFuelDemand && (
                <button className="primaryAction" type="button" onClick={handleBulkApprove}>Approve All Accepted</button>
              )}
              {canAllocateFuelDemand && (
                <button className="primaryAction" type="button" onClick={handleBulkFulfill}>Fulfill All</button>
              )}
            </div>
          )}

          <div className="fuelAllocationList" style={{ overflowX: 'auto' }}>
            <table className="dataTable" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', width: '40px' }}>
                    <input
                      type="checkbox"
                      checked={selectedDemands.size === pendingDemands.length && pendingDemands.length > 0}
                      onChange={toggleAll}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Asset</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Fuel Item</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Requested</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Available</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>Station</th>
                  <th style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', minWidth: '220px' }}>Action</th>
                </tr>
                <tr>
                  <th style={{ padding: '8px 16px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}></th>
                  <th style={{ padding: '8px 16px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search asset..." value={pendingDemandsColSearch.asset} onChange={e => setPendingDemandsColSearch({ ...pendingDemandsColSearch, asset: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search fuel..." value={pendingDemandsColSearch.fuelItem} onChange={e => setPendingDemandsColSearch({ ...pendingDemandsColSearch, fuelItem: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}></th>
                  <th style={{ padding: '8px 16px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}></th>
                  <th style={{ padding: '8px 16px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}>
                    <input type="text" placeholder="Search station..." value={pendingDemandsColSearch.station} onChange={e => setPendingDemandsColSearch({ ...pendingDemandsColSearch, station: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '2px solid #e2e8f0', background: '#f8fafc' }}></th>
                </tr>
              </thead>
              <tbody>
                {pendingDemands.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                      <div className="emptyState">No pending fuel demands are waiting for review or fulfillment.</div>
                    </td>
                  </tr>
                ) : (
                  pendingDemands.map((entry) => {
                    const selectedItem = fuelItems.find((item) => item.id === entry.fuelItemId);
                    const availableLiters = Number(selectedItem?.inventory_quantity || 0);
                    const hasInventory = availableLiters >= Number(entry.liters || 0);
                    const inspectionDecision = allocationDrafts[entry.id]?.inspectionDecision || "";
                    const isApproved = entry.status === "approved";

                    return (
                      <tr key={entry.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '12px 16px' }}>
                          <input
                            type="checkbox"
                            checked={selectedDemands.has(entry.id)}
                            onChange={() => toggleSelection(entry.id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ fontWeight: 600 }}>{entry.assetTag}</div>
                          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{entry.assetName || "Vehicle asset"}</div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{entry.fuelItemName}</td>
                        <td style={{ padding: '12px 16px' }}>{formatQuantity(entry.liters)} L</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: hasInventory ? '#10b981' : '#ef4444', fontWeight: 500 }}>
                            {formatQuantity(availableLiters)} L
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{entry.station || "Not set"}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {!inspectionDecision && !isApproved && canInspectFuelDemand && (
                              <>
                                <button className="settingsSecondaryButton" type="button" onClick={() => onSetInspectionDecision(entry.id, "accepted")} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Accept</button>
                                <button className="settingsSecondaryButton danger" type="button" onClick={() => onSetInspectionDecision(entry.id, "denied")} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Deny</button>
                              </>
                            )}
                            {inspectionDecision === "accepted" && !isApproved && canInspectFuelDemand && (
                              <button className="primaryAction" type="button" onClick={() => onAllocateFuelDemand({ ...entry, _mode: "approve" })} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Approve</button>
                            )}
                            {inspectionDecision === "denied" && !isApproved && canDenyFuelDemand && (
                              <button className="ghostAction" type="button" onClick={() => onDenyFuelDemand(entry)} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>Reject</button>
                            )}
                            {isApproved && canAllocateFuelDemand && (
                              <button className="primaryAction" type="button" disabled={!hasInventory} onClick={() => onAllocateFuelDemand({ ...entry, _mode: "fulfill" })} style={{ padding: '4px 8px', fontSize: '0.8rem' }}>
                                {hasInventory ? "Fulfill" : "Low Inventory"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      </article>
    </section>
  )
}

{
  activeFuelTab === "history" && (
    <section className="panel reportPreviewPanel fuelHistoryPanel">
      <div className="panelHeader">
        <div className="reportPreviewHeading">
          <h2>Fuel History</h2>
          {/* <span>Historic consumption by vehicle asset</span> */}
        </div>
      </div>
      <div className="nativeTableWrap">
        <table className="dataTable fuelHistoryTable" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', marginTop: '12px' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Vehicle</th>
              <th>Status</th>
              <th>Fuel Item</th>
              <th>Date</th>
              <th>Liters</th>
              <th>Meter</th>
              <th>Distance</th>
              <th>Avg km/l</th>
              <th>Cost</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
            <tr>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <input type="text" placeholder="Search ID..." value={fuelHistorySearch} onChange={e => setFuelHistorySearch(e.target.value)} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
              </th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <input type="text" placeholder="Search vehicle..." value={historyDemandsColSearch.vehicle} onChange={e => setHistoryDemandsColSearch({ ...historyDemandsColSearch, vehicle: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
              </th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <input type="text" placeholder="Search status..." value={historyDemandsColSearch.status} onChange={e => setHistoryDemandsColSearch({ ...historyDemandsColSearch, status: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
              </th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <input type="text" placeholder="Search fuel..." value={historyDemandsColSearch.fuelItem} onChange={e => setHistoryDemandsColSearch({ ...historyDemandsColSearch, fuelItem: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
              </th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '4px' }}>
                  <input type="date" value={historyDemandsColSearch.dateStart} onChange={e => setHistoryDemandsColSearch({ ...historyDemandsColSearch, dateStart: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                  <span style={{ color: '#64748b' }}>-</span>
                  <input type="date" value={historyDemandsColSearch.dateEnd} onChange={e => setHistoryDemandsColSearch({ ...historyDemandsColSearch, dateEnd: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                </div>
              </th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                <input type="text" placeholder="Search liters..." value={historyDemandsColSearch.liters} onChange={e => setHistoryDemandsColSearch({ ...historyDemandsColSearch, liters: e.target.value })} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
              </th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
              <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
            </tr>
          </thead>
          <tbody>
            {filteredHistoryDemands.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
                  <div className="emptyState">No reviewed fuel requests have been recorded yet for this workspace.</div>
                </td>
              </tr>
            ) : (
              currentFuelHistoryDemands.map((entry) => (
                <tr key={entry.id} className="nativeTableRow">
                  <td style={{ fontWeight: 600, color: '#334155' }}>{entry.formatted_id || `#${entry.id}`}</td>
                  <td>{entry.assetTag}{entry.assetName ? ` - ${entry.assetName}` : ""}</td>
                  <td>{entry.status === "rejected" ? "Rejected" : "Fulfilled"}</td>
                  <td>{entry.fuelItemName || "Fuel item removed"}</td>
                  <td className="inventoryCellText">{formatDate(entry.requestDate)}</td>
                  <td className="inventoryCellText">{formatQuantity(entry.liters)}</td>
                  <td className="inventoryCellText">{formatQuantity(entry.meterReading)}</td>
                  <td className="inventoryCellText">{entry.distanceTravelled == null ? "-" : formatQuantity(entry.distanceTravelled)}</td>
                  <td className="inventoryCellText">{entry.averageDistancePerLiter == null ? "-" : formatQuantity(entry.averageDistancePerLiter)}</td>
                  <td>{formatCurrency(entry.totalCost)}</td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="settingsSecondaryButton"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => printEntry(entry, "Fuel Demand Record")}
                    >
                      <Printer size={14} /> Print
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="inventoryFooter">
        <span>
          Showing {(fuelHistoryCurrentPage - 1) * FUEL_HISTORY_PAGE_SIZE + 1}-
          {Math.min(fuelHistoryCurrentPage * FUEL_HISTORY_PAGE_SIZE, filteredHistoryDemands.length)} of{" "}
          {filteredHistoryDemands.length}
        </span>
        <div className="inventoryPagination">
          <button
            type="button"
            disabled={fuelHistoryCurrentPage === 1}
            onClick={() => setFuelHistoryPage((current) => Math.max(1, current - 1))}
          >
            Prev
          </button>
          <span className="active">{fuelHistoryCurrentPage}</span>
          <span>/</span>
          <span>{fuelHistoryTotalPages}</span>
          <button
            type="button"
            disabled={fuelHistoryCurrentPage === fuelHistoryTotalPages}
            onClick={() => setFuelHistoryPage((current) => Math.min(fuelHistoryTotalPages, current + 1))}
          >
            Next
          </button>
        </div>
      </div>
    </section>
  )
}
    </section >
  );
}

