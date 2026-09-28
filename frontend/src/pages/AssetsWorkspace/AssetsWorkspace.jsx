import { useState } from "react";
import { AlertTriangle, ClipboardList, FileUp, HardDrive, Plus, ShieldCheck, SlidersHorizontal, Wrench, Eye, Edit2, Trash2, Printer } from "lucide-react";
import { formatDate } from "../../utils/formatting";
import { printEntry } from "../../utils/printUtils";
import { buildPriority, statusLabel, parseAssetNotes } from "../../utils/assetHelpers";
import SearchableDropdown from "../../components/SearchableDropdown";
import './AssetsWorkspace.css';

export default function AssetsWorkspace({
  assetDirectory,
  assetDraft,
  assetFormTab,
  assetNameOptions,
  assetTypeOptions,
  filteredAssets,
  isAssetModalClosing,
  locations,
  viewedAsset,
  viewedAssetId,
  onAssetView,
  onAssetDelete,
  onAssetEdit,
  onCloseAssetView,
  onDraftChange,
  onFormTabChange,
  onFileSelect,
  onSaveDraft,
  onProceedNext,
  selectedAsset,
  uploadError,
  uploadedFileName,
}) {
  const [assetColSearch, setAssetColSearch] = useState({ name: "", id: "", category: "", status: "" });

  const finalAssetDirectory = assetDirectory.filter(asset => {
    const nameQ = assetColSearch.name.toLowerCase();
    const idQ = assetColSearch.id.toLowerCase();
    const categoryQ = assetColSearch.category.toLowerCase();
    const statusQ = assetColSearch.status.toLowerCase();

    if (nameQ && !asset.name.toLowerCase().includes(nameQ)) return false;
    if (idQ && !(asset.asset_tag || "").toLowerCase().includes(idQ)) return false;
    if (categoryQ && !(asset.category_name || "").toLowerCase().includes(categoryQ)) return false;
    if (statusQ && !(statusLabel(asset.status) || "").toLowerCase().includes(statusQ)) return false;
    return true;
  });

  const currentStatus = selectedAsset?.status === "maintenance" ? "Needs Attention" : "Operational";
  const locationOptions = [
    ...new Set([assetDraft.location_name, ...locations.map((location) => location.name), ...filteredAssets.map((asset) => asset.location_name)].filter(Boolean)),
  ].sort((left, right) => left.localeCompare(right));
  const incidentCount = filteredAssets.filter((asset) => asset.status === "maintenance").length;
  const availableCount = filteredAssets.filter((asset) => asset.status === "available").length;
  const assignedCount = filteredAssets.filter((asset) => asset.status === "assigned").length;
  const complianceRate = filteredAssets.length ? ((availableCount / filteredAssets.length) * 100).toFixed(1) : "0.0";
  const maintenanceLog = [
    {
      date: formatDate(selectedAsset?.updated_at),
      title: selectedAsset ? `${selectedAsset.name} inspection synced` : "Asset inspection synced",
      text: `Latest record pulled from the asset directory for ${selectedAsset?.location_name || "the active location"}.`,
    },
    {
      date: formatDate(selectedAsset?.created_at),
      title: "Software optimization",
      text: "Configuration baseline refreshed and integrity metrics recalculated for this unit.",
    },
  ];

  return (
    <section className="assetsWorkspace">
      <div className="assetsTabs">
        {/* Registration tab kept for future use; intentionally hidden so Assets opens with Global Directory only.
        <button
          className={`assetsTab ${assetFormTab === "registration" ? "active" : ""}`}
          type="button"
          onClick={() => onFormTabChange("registration")}
        >
          Registration
        </button>
        */}
        <button
          className={`assetsTab ${assetFormTab === "directory" ? "active" : ""}`}
          type="button"
          onClick={() => onFormTabChange("directory")}
        >
          Global Directory
        </button>
      </div>

      {assetFormTab === "directory" || assetFormTab === "registration" || true ? (
        <section className="directoryWorkspace">
          <div className="directorySummaryGrid">
            <article className="directorySummaryCard">
              <div className="directorySummaryTop">
                <span className="directorySummaryIcon">
                  <ClipboardList size={16} />
                </span>
                <span className="directoryMetricPill positive">+Live</span>
              </div>
              <span className="eyebrow">Total Assets</span>
              <strong>{filteredAssets.length}</strong>
            </article>
            <article className="directorySummaryCard">
              <div className="directorySummaryTop">
                <span className="directorySummaryIcon warning">
                  <Wrench size={16} />
                </span>
                <span className="directoryMetricPill warning">Critical</span>
              </div>
              <span className="eyebrow">Maintenance Required</span>
              <strong>{incidentCount}</strong>
            </article>
            <article className="directorySummaryCard">
              <div className="directorySummaryTop">
                <span className="directorySummaryIcon danger">
                  <AlertTriangle size={16} />
                </span>
                <span className="directoryMetricPill neutral">Active</span>
              </div>
              <span className="eyebrow">Assigned Assets</span>
              <strong>{assignedCount}</strong>
            </article>
            <article className="directorySummaryCard">
              <div className="directorySummaryTop">
                <span className="directorySummaryIcon success">
                  <ShieldCheck size={16} />
                </span>
                <span className="directoryMetricPill success">Target: 98%</span>
              </div>
              <span className="eyebrow">Compliance Rate</span>
              <strong>{complianceRate}%</strong>
            </article>
          </div>

          <section className="panel assetsDirectoryPanel inventoryPanel">
            <div className="panelHeader inventoryPanelHeader">
              <div>
                <h2>Asset Inventory List</h2>
                <span className="inventorySubtitle"></span>
              </div>
              <div className="inventoryHeaderActions">
                <button className="inventoryIconButton" type="button" aria-label="Directory filters">
                  <SlidersHorizontal size={16} />
                </button>
                {/* Kept for future registration flow; hidden to keep Assets on Global Directory only.
                <button className="inventoryPrimaryButton" type="button" onClick={() => onFormTabChange("registration")}>
                  <Plus size={16} />
                  Add New Asset
                </button>
                */}
              </div>
            </div>

            <div className="nativeTableWrap asset_inventory_list">
              <table className="inventoryTable">
                <thead>
                  <tr>
                    <th>System ID</th>
                    <th>Asset Name</th>
                    <th>Asset Tag</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Last Maintenance</th>
                    <th className="actionsCol">Actions</th>
                  </tr>
                  <tr>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        placeholder="Search system ID..."
                        value={assetColSearch.systemId || ""}
                        onChange={(e) => setAssetColSearch({ ...assetColSearch, systemId: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        placeholder="Search name..."
                        value={assetColSearch.name}
                        onChange={(e) => setAssetColSearch({ ...assetColSearch, name: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        placeholder="Search ID..."
                        value={assetColSearch.id}
                        onChange={(e) => setAssetColSearch({ ...assetColSearch, id: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        placeholder="Search category..."
                        value={assetColSearch.category}
                        onChange={(e) => setAssetColSearch({ ...assetColSearch, category: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input
                        type="text"
                        placeholder="Search status..."
                        value={assetColSearch.status}
                        onChange={(e) => setAssetColSearch({ ...assetColSearch, status: e.target.value })}
                        style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                      />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {finalAssetDirectory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="emptyState inventoryEmptyState">
                        No assets available in the global directory yet.
                      </td>
                    </tr>
                  ) : (
                    finalAssetDirectory.map((asset) => (
                      <tr
                        key={asset.id}
                        className={`nativeTableRow ${viewedAssetId === asset.id ? "active" : ""}`}
                      >
                        <td style={{ fontWeight: 600, color: '#334155' }}>{asset.formatted_id || `#${asset.id}`}</td>
                        <td className="assetNameCell">
                          <button className="inventoryAssetCellBtn" type="button" onClick={() => onAssetView(asset.id)}>
                            <span className="inventoryAssetIcon">
                              <HardDrive size={16} />
                            </span>
                            <strong>{asset.name}</strong>
                          </button>
                        </td>
                        <td className="inventoryCellText">{asset.asset_tag}</td>
                        <td className="inventoryCellText">{asset.category_name || "No category"}</td>
                        <td>
                          <span className={`inventoryStatusBadge ${buildPriority(asset.status).toLowerCase()}`}>
                            {statusLabel(asset.status)}
                          </span>
                        </td>
                        <td className="inventoryCellText">{formatDate(asset.updated_at)}</td>
                        <td className="inventoryActions">
                          <button className="iconActionBtn" title="View" type="button" onClick={() => onAssetView(asset.id)}>
                            <Eye size={18} />
                          </button>
                          <button className="iconActionBtn" title="Print Asset" type="button" onClick={() => printEntry(asset, "Asset Record")}>
                            <Printer size={18} />
                          </button>
                          <button className="iconActionBtn" title="Edit" type="button" onClick={() => onAssetEdit(asset.id)}>
                            <Edit2 size={18} />
                          </button>
                          <button className="iconActionBtn deleteBtn" title="Delete" type="button" onClick={() => onAssetDelete(asset.id)}>
                            <Trash2 size={18} />
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
                Showing {finalAssetDirectory.length} of {filteredAssets.length} entries
              </span>
              <div className="inventoryPagination">
                <button type="button">Prev</button>
                <span className="active">1</span>
                <button type="button">Next</button>
              </div>
            </div>
          </section>
        </section>
      ) : (
        <div className="assetsCanvas">
          <section className="panel assetFormPanel">
            <div className="assetFormHeader">
              <div>
                <strong>New Entry</strong>
                <span>General Information</span>
              </div>
            </div>

            <div className="assetFormGrid">
              <label className="assetField assetFieldWide">
                <span>Asset Name</span>
                <input
                  type="text"
                  value={assetDraft.name}
                  onChange={(event) => onDraftChange("name", event.target.value)}
                  placeholder="e.g. Industrial Server Node R-42"
                />
              </label>

              <label className="assetField">
                <span>Asset Type</span>
                <SearchableDropdown
                  label="Asset Type"
                  onChange={(nextValue) => onDraftChange("category_name", nextValue)}
                  options={assetTypeOptions}
                  placeholder="Select type"
                  value={assetDraft.category_name}
                />
              </label>

              <label className="assetField">
                <span>Location Code</span>
                <select
                  value={assetDraft.location_name}
                  onChange={(event) => onDraftChange("location_name", event.target.value)}
                >
                  <option value="">Select station</option>
                  {locationOptions.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>

              <label className="assetField">
                <span>Purchase Date</span>
                <input
                  type="date"
                  value={assetDraft.purchase_date}
                  onChange={(event) => onDraftChange("purchase_date", event.target.value)}
                />
              </label>

              <label className="assetField">
                <span>Warranty Expiry</span>
                <input
                  type="date"
                  value={assetDraft.warranty_expiry}
                  onChange={(event) => onDraftChange("warranty_expiry", event.target.value)}
                />
              </label>

              {["Tractor", "Bike"].includes(assetDraft.category_name) ? (
                <label className="assetField assetFieldWide">
                  <span>Meter Reading</span>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={assetDraft.meter_reading}
                    onChange={(event) => onDraftChange("meter_reading", event.target.value)}
                    placeholder="Enter current meter reading"
                  />
                </label>
              ) : null}
            </div>

            <button className="uploadDropzone" type="button" onClick={onFileSelect}>
              <FileUp size={22} />
              <strong>Upload Technical Documentation</strong>
              <span>{uploadedFileName || "PDF, JPG up to 10MB"}</span>
            </button>
            {uploadError ? <div className="uploadError">{uploadError}</div> : null}

            <div className="assetFormActions">
              <button className="ghostAction" type="button" onClick={onSaveDraft}>
                Save Draft
              </button>
              <button className="primaryAction" type="button" onClick={onProceedNext}>
                {assetDraft.id ? "Update Entry" : "Proceed to Next Step"}
              </button>
            </div>
          </section>

          <aside className="assetInsightStack">
            <section className="panel assetProfilePanel">
              <div className="assetProfileHeader">
                <div>
                  <strong>{selectedAsset?.name || "Precision Milling Unit"}</strong>
                  <span>ID: {selectedAsset?.asset_tag || "#ASSET-9902-X"}</span>
                </div>
                <div className="assetQrPlaceholder">
                  <div className="assetQrInner" />
                </div>
              </div>

              <div className="assetProfileRows">
                <div className="assetProfileRow">
                  <span>Current Status</span>
                  <strong className="statusPill">
                    <i />
                    {currentStatus}
                  </strong>
                </div>
                <div className="assetProfileRow">
                  <span>Last Inspection</span>
                  <strong>{formatDate(selectedAsset?.updated_at)}</strong>
                </div>
              </div>
            </section>
            <section className="panel maintenanceLogPanel">
              <div className="panelHeader">
                <h2>Maintenance Log</h2>
                <button type="button">Export PDF</button>
              </div>
              <div className="maintenanceTimeline">
                {maintenanceLog.map((entry) => (
                  <article key={`${entry.date}-${entry.title}`} className="timelineEntry">
                    <div className="timelineDot" />
                    <div>
                      <span>{entry.date}</span>
                      <strong>{entry.title}</strong>
                      <p>{entry.text}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <button className="wideButton historyButton" type="button" onClick={() => onFormTabChange("directory")}>
              View Complete History
            </button>
          </aside>
        </div>
      )
      }

      {
        assetFormTab === "directory" && viewedAsset ? (
          <div
            className={`assetModalBackdrop ${isAssetModalClosing ? "closing" : "open"}`}
            role="presentation"
            onClick={onCloseAssetView}
          >
            <section
              className={`panel assetModal ${isAssetModalClosing ? "closing" : "open"}`}
              role="dialog"
              aria-modal="true"
              aria-label="Entry Details"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="panelHeader">
                <h2>Entry Details</h2>
                <div className="assetModalActions">
                  <button type="button" onClick={() => onAssetEdit(selectedAsset.id)}>
                    Edit Entry
                  </button>
                  <button type="button" onClick={onCloseAssetView}>
                    Close
                  </button>
                </div>
              </div>
              <dl className="detailGrid">
                <div>
                  <dt>Asset Name</dt>
                  <dd>{viewedAsset.name}</dd>
                </div>
                <div>
                  <dt>Asset Tag</dt>
                  <dd>{viewedAsset.asset_tag}</dd>
                </div>
                <div>
                  <dt>Type</dt>
                  <dd>{viewedAsset.category_name || "Tractor"}</dd>
                </div>
                <div>
                  <dt>Location</dt>
                  <dd>{viewedAsset.location_name || "Not set"}</dd>
                </div>
                <div>
                  <dt>Purchase Date</dt>
                  <dd>{formatDate(viewedAsset.purchase_date)}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{statusLabel(viewedAsset.status)}</dd>
                </div>
                {parseAssetNotes(viewedAsset.notes).warranty_expiry ? (
                  <div>
                    <dt>Warranty Expiry</dt>
                    <dd>{parseAssetNotes(viewedAsset.notes).warranty_expiry}</dd>
                  </div>
                ) : null}
                {parseAssetNotes(viewedAsset.notes).meter_reading ? (
                  <div>
                    <dt>Meter Reading</dt>
                    <dd>{parseAssetNotes(viewedAsset.notes).meter_reading}</dd>
                  </div>
                ) : null}
              </dl>
            </section>
          </div>
        ) : null
      }

    </section >
  );
}

