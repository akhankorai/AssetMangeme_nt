import React, { useState } from 'react';
import { Fuel, Wrench, CheckCircle2, PlusCircle, XCircle, FileUp, FileText } from 'lucide-react';
import SearchableDropdown from '../../components/SearchableDropdown';
import { todayInputValue } from '../../utils/dateHelpers';
import './UserPortalWorkspace.css';

export default function UserPortalWorkspace({
  assets = [],
  fuelItems = [],
  locations = [],
  categories = [],
  serviceTypes = [],
  items = [],
  teamMembers = [],
  fuelDemandDraft = [],
  onFuelDraftChange,
  onSaveFuelDemand,
  onSaveTask,
  showNotification,
  currentUser = null,
  onAddDraftRow,
  onRemoveDraftRow
}) {
  const [activeTab, setActiveTab] = useState('fuel');
  
  // Local state for Maintenance Bill
  const [billDraft, setBillDraft] = useState({
    title: '',
    assetTag: '',
    assetName: '',
    category: '',
    serviceType: '',
    consumedItemId: '',
    consumedItemName: '',
    consumedQuantity: 1,
    unitPrice: 0,
    vendor: '',
    notes: '',
  });

  const handleBillSave = () => {
    if (!billDraft.assetTag || !billDraft.title || !billDraft.serviceType) {
      showNotification('Please fill all required fields (Asset, Title, Service Type).', 'error');
      return;
    }

    // Submit as a ScheduleTask in awaiting_parts stage so it goes to Approvals
    onSaveTask({
      title: `Maintenance Bill: ${billDraft.title}`,
      assetTag: billDraft.assetTag,
      assetName: billDraft.assetName,
      category: billDraft.category,
      serviceType: billDraft.serviceType,
      stage: 'awaiting_parts',
      processType: 'maintenance',
      inspectionRequired: false,
      inspectionComment: `Vendor/Bill: ${billDraft.vendor} | Notes: ${billDraft.notes}`,
      consumedItemId: billDraft.consumedItemId || null,
      consumedItemName: billDraft.consumedItemName || billDraft.vendor || 'External Bill',
      consumedQuantity: Number(billDraft.consumedQuantity) || 1,
      assignee: currentUser?.name || 'User Request',
      approvalStatus: 'pending'
    });
    
    showNotification('Maintenance bill submitted for approval.');
    setBillDraft({
      title: '',
      assetTag: '',
      assetName: '',
      category: '',
      serviceType: '',
      consumedItemId: '',
      consumedItemName: '',
      consumedQuantity: 1,
      unitPrice: 0,
      vendor: '',
      notes: '',
    });
  };

  const assetTagOptions = assets.map(a => a.asset_tag || a.assetTag).filter(Boolean);
  const fuelDrafts = Array.isArray(fuelDemandDraft) ? fuelDemandDraft : [fuelDemandDraft].filter(Boolean);

  return (
    <div className="portal-workspace">
      <div className="portal-header-card">
        <div>
          <h2 className="portal-header-title">User Request Portal</h2>
          <p className="portal-header-subtitle">Submit fuel allocations and maintenance repair bills for administrative approval.</p>
        </div>
        <div className="portal-tab-bar">
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "fuel" ? "active fuel" : ""}`}
            onClick={() => setActiveTab("fuel")}
          >
            <Fuel size={16} /> Fuel Demands
          </button>
          <button
            type="button"
            className={`portal-tab-btn ${activeTab === "bill" ? "active bill" : ""}`}
            onClick={() => setActiveTab("bill")}
          >
            <Wrench size={16} /> Maintenance Bills
          </button>
        </div>
      </div>

      {activeTab === 'fuel' ? (
        <div className="portal-form-container">
          <div className="portal-form">
            <div className="portal-form-title-row">
              <h3><Fuel size={20} style={{ color: '#2563eb' }} /> Fuel Demand Request</h3>
            </div>
              
              {fuelDrafts.map((draftRow, index) => (
                <div key={index} className="portal-form-grid" style={{ marginBottom: fuelDrafts.length > 1 ? '30px' : '0' }}>
                  {fuelDrafts.length > 1 && (
                    <div className="portal-row-header">
                      <h4>Request #{index + 1}</h4>
                      <button 
                        type="button" 
                        className="portal-row-remove"
                        onClick={() => onRemoveDraftRow && onRemoveDraftRow(index)}
                      >
                        <XCircle size={14} /> Remove
                      </button>
                    </div>
                  )}

                  <label className="scheduleField">
                    <span>Date <span className="req">*</span></span>
                    <input
                      type="date"
                      value={draftRow?.requestDate || todayInputValue()}
                      onChange={(e) => onFuelDraftChange(index, "requestDate", e.target.value)}
                    />
                  </label>
                  <label className="scheduleField">
                    <span>Vehicle (Asset Tag) <span className="req">*</span></span>
                    <SearchableDropdown
                      options={assetTagOptions}
                      value={draftRow?.assetTag || ""}
                      onChange={(val) => {
                        const matchedAsset = assets.find(a => a.asset_tag === val || a.assetTag === val);
                        onFuelDraftChange(index, "assetTag", val);
                        if (matchedAsset) {
                          onFuelDraftChange(index, "station", matchedAsset.location_name || matchedAsset.location || matchedAsset.station || "");
                        }
                      }}
                      placeholder="Select vehicle"
                    />
                  </label>
                  <label className="scheduleField">
                    <span>Station</span>
                    <select
                      value={draftRow?.station || ""}
                      onChange={(e) => onFuelDraftChange(index, "station", e.target.value)}
                    >
                      <option value="">Select station</option>
                      {locations.map((loc, i) => (
                        <option key={i} value={loc.name || loc.station || loc}>{loc.name || loc.station || loc}</option>
                      ))}
                    </select>
                  </label>
                  <label className="scheduleField">
                    <span>Fuel Type <span className="req">*</span></span>
                    <select
                      value={draftRow?.fuelItemId || ""}
                      onChange={(e) => onFuelDraftChange(index, "fuelItemId", e.target.value)}
                    >
                      <option value="">Select fuel type</option>
                      {fuelItems.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </label>
                  <label className="scheduleField">
                    <span>Liters Requested <span className="req">*</span></span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draftRow?.requestedLiters || ""}
                      onChange={(e) => onFuelDraftChange(index, "requestedLiters", e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <label className="scheduleField">
                    <span>Current Meter Reading</span>
                    <input
                      type="number"
                      min="0"
                      value={draftRow?.meterReading || ""}
                      onChange={(e) => onFuelDraftChange(index, "meterReading", e.target.value)}
                      placeholder="Odometer/Hours"
                    />
                  </label>
                  <label className="scheduleField">
                    <span>Submit PDF / Meter Receipt</span>
                    <div className="portal-file-input-wrapper">
                      <input
                        type="file"
                        accept=".pdf,application/pdf,image/*"
                        id={`meter-pdf-${index}`}
                        className="portal-file-input"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            onFuelDraftChange(index, "attachmentName", file.name);
                            onFuelDraftChange(index, "attachmentFile", file);
                          }
                        }}
                      />
                      <label htmlFor={`meter-pdf-${index}`} className={`portal-file-label ${draftRow?.attachmentName ? 'attached' : ''}`}>
                        {draftRow?.attachmentName ? <FileText size={16} /> : <FileUp size={16} />}
                        <span className="portal-file-text">{draftRow?.attachmentName || "Upload PDF or Slip"}</span>
                      </label>
                    </div>
                  </label>
                  <label className="scheduleField scheduleFieldFull">
                    <span>Notes / Reason</span>
                    <textarea
                      rows="2"
                      value={draftRow?.notes || ""}
                      onChange={(e) => onFuelDraftChange(index, "notes", e.target.value)}
                      placeholder="Why is this fuel needed?"
                    />
                  </label>

                  {index < fuelDrafts.length - 1 && <div className="portal-row-separator"></div>}
                </div>
              ))}
              
              <div style={{ marginTop: '20px' }}>
                <button 
                  type="button" 
                  className="portal-add-row-btn"
                  onClick={() => onAddDraftRow && onAddDraftRow()}
                >
                  <PlusCircle size={16} /> Add Another Fuel Request
                </button>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                <button className="schedulePrimaryButton" onClick={onSaveFuelDemand} style={{ padding: '12px 24px' }}>
                  <CheckCircle2 size={16} /> Submit {fuelDrafts.length > 1 ? `${fuelDrafts.length} Requests` : 'Fuel Demand'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="portal-form-container">
            <div className="portal-form">
              <div className="portal-form-title-row">
                <h3><Wrench size={20} style={{ color: '#dc2626' }} /> Maintenance Bill Submission</h3>
              </div>
              <div className="portal-form-grid" style={{ marginTop: '20px' }}>
                <label className="scheduleField scheduleFieldFull">
                  <span>Bill Title <span className="req">*</span></span>
                  <input
                    type="text"
                    value={billDraft.title}
                    onChange={(e) => setBillDraft({ ...billDraft, title: e.target.value })}
                    placeholder="e.g. Engine Repair Bill"
                  />
                </label>
                <label className="scheduleField">
                  <span>Vehicle (Asset Tag) <span className="req">*</span></span>
                  <SearchableDropdown
                    options={assetTagOptions}
                    value={billDraft.assetTag}
                    onChange={(val) => {
                      const matchedAsset = assets.find(a => a.asset_tag === val || a.assetTag === val);
                      setBillDraft({ 
                        ...billDraft, 
                        assetTag: val,
                        assetName: matchedAsset?.name || '',
                        category: matchedAsset?.category_name || matchedAsset?.category || ''
                      });
                    }}
                    placeholder="Select vehicle"
                  />
                </label>
                <label className="scheduleField">
                  <span>Service Type <span className="req">*</span></span>
                  <select
                    value={billDraft.serviceType}
                    onChange={(e) => setBillDraft({ ...billDraft, serviceType: e.target.value })}
                  >
                    <option value="">Select Service Type</option>
                    {serviceTypes.map((st, i) => (
                      <option key={i} value={st.name || st}>{st.name || st}</option>
                    ))}
                  </select>
                </label>
                <label className="scheduleField">
                  <span>Consumed Item / Part</span>
                  <SearchableDropdown
                    options={items.map((item) => typeof item === 'object' ? item.name : item).filter(Boolean)}
                    value={billDraft.consumedItemName}
                    onChange={(val) => {
                      const matchedItem = items.find((i) => (typeof i === 'object' ? i.name : i) === val);
                      const price = matchedItem?.price || matchedItem?.unitPrice || 0;
                      setBillDraft({
                        ...billDraft,
                        consumedItemName: val,
                        consumedItemId: matchedItem?.id || '',
                        unitPrice: price ? price * (billDraft.consumedQuantity || 1) : billDraft.unitPrice
                      });
                    }}
                    placeholder="Select item from inventory"
                  />
                </label>
                <label className="scheduleField">
                  <span>Part Quantity</span>
                  <input
                    type="number"
                    min="1"
                    value={billDraft.consumedQuantity}
                    onChange={(e) => {
                      const qty = Math.max(1, Number(e.target.value) || 1);
                      const matchedItem = items.find((i) => (typeof i === 'object' ? i.name : i) === billDraft.consumedItemName);
                      const price = matchedItem?.price || matchedItem?.unitPrice || 0;
                      setBillDraft({
                        ...billDraft,
                        consumedQuantity: qty,
                        unitPrice: price ? price * qty : billDraft.unitPrice
                      });
                    }}
                    placeholder="1"
                  />
                </label>
                <label className="scheduleField">
                  <span>Vendor / Shop Name</span>
                  <input
                    type="text"
                    value={billDraft.vendor}
                    onChange={(e) => setBillDraft({ ...billDraft, vendor: e.target.value })}
                    placeholder="Who did the repair?"
                  />
                </label>
                <label className="scheduleField">
                  <span>Bill Amount (Total)</span>
                  <input
                    type="number"
                    min="0"
                    value={billDraft.unitPrice}
                    onChange={(e) => setBillDraft({ ...billDraft, unitPrice: e.target.value })}
                    placeholder="Total cost"
                  />
                </label>
                <label className="scheduleField">
                  <span>Submit PDF / Bill Attachment</span>
                  <div className="portal-file-input-wrapper">
                    <input
                      type="file"
                      accept=".pdf,application/pdf,image/*"
                      id="bill-pdf-upload"
                      className="portal-file-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setBillDraft({ ...billDraft, attachmentName: file.name, attachmentFile: file });
                        }
                      }}
                    />
                    <label htmlFor="bill-pdf-upload" className={`portal-file-label ${billDraft.attachmentName ? 'attached' : ''}`}>
                      {billDraft.attachmentName ? <FileText size={16} /> : <FileUp size={16} />}
                      <span className="portal-file-text">{billDraft.attachmentName || "Upload PDF or Receipt"}</span>
                    </label>
                  </div>
                </label>
                <label className="scheduleField scheduleFieldFull">
                  <span>Description / Parts Changed</span>
                  <textarea
                    rows="3"
                    value={billDraft.notes}
                    onChange={(e) => setBillDraft({ ...billDraft, notes: e.target.value })}
                    placeholder="Details of the bill..."
                  />
                </label>
              </div>
              <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '2px solid #e2e8f0', paddingTop: '16px' }}>
                <button className="schedulePrimaryButton" onClick={handleBillSave} style={{ padding: '12px 24px', background: '#dc2626' }}>
                  <CheckCircle2 size={16} /> Submit Bill
                </button>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}
