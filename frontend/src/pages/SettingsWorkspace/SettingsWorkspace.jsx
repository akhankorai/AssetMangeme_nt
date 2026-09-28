import { ChevronRight, ClipboardList, Cog, HardDrive, MapPinned, Plus, Search, Edit2, Trash2 } from "lucide-react";
import { formatQuantity } from "../../utils/formatting";

export default function SettingsWorkspace({
  categories,
  categoryDraft,
  categoryModalOpen,
  categorySearch,
  itemDraft,
  itemModalOpen,
  itemSearch,
  locationDraft,
  locationModalOpen,
  locationSearch,
  locations,
  serviceTypeDraft,
  serviceTypeModalOpen,
  serviceTypeSearch,
  onDeleteCategory,
  onDeleteItem,
  onDeleteLocation,
  onDeleteServiceType,
  onCategoryDraftChange,
  onCategorySearchChange,
  onCloseCategoryModal,
  onCloseItemModal,
  onCloseLocationModal,
  onCloseServiceTypeModal,
  onEditCategory,
  onEditItem,
  onEditLocation,
  onEditServiceType,
  onOpenCategoryModal,
  onOpenItemModal,
  onOpenLocationModal,
  onOpenServiceTypeModal,
  onAddRegularInspectionRow,
  onDeleteRegularInspectionRow,
  onSaveCategory,
  onSaveItem,
  onSaveLocation,
  onItemDraftChange,
  onItemSearchChange,
  onLocationDraftChange,
  onLocationSearchChange,
  onSaveServiceType,
  onServiceTypeDraftChange,
  onServiceTypeSearchChange,
  onUpdateRegularInspectionRow,
  onToggleCategory,
  onTabChange,
  items,
  regularInspectionList,
  serviceTypes,
  settingsTab,
}) {
  const filteredCategories = categories.filter((category) => {
    const term = categorySearch.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [category.name, category.description, category.is_active ? "active" : "inactive"]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });

  const filteredItems = items.filter((item) => {
    const term = itemSearch.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [item.name, String(item.price), String(item.inventory_quantity)]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });

  const filteredLocations = locations.filter((location) => {
    const term = locationSearch.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [location.name, location.description, location.site, location.room]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });

  const filteredServiceTypes = serviceTypes.filter((serviceType) => {
    const term = serviceTypeSearch.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [serviceType.name, serviceType.description, String(serviceType.interval_days || 0), serviceType.is_active ? "active" : "inactive"]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(term));
  });

  return (
    <section className="settingsWorkspace">
      <div className="settingsHeader">
        <div>
          <span className="eyebrow">Workspace Settings</span>
          <h1>Settings</h1>
          <p>Manage the asset categories, stations, service types, and inventory items that feed the workspace dropdowns.</p>
        </div>
      </div>

      <div className="settingsTabs">
        <button
          className={`settingsTab ${settingsTab === "Category" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange(settingsTab === "Category" ? "" : "Category")}
        >
          <ChevronRight size={16} />
          Asset Categories
        </button>
        <button
          className={`settingsTab ${settingsTab === "Stations" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange(settingsTab === "Stations" ? "" : "Stations")}
        >
          <ChevronRight size={16} />
          Stations
        </button>
        <button
          className={`settingsTab ${settingsTab === "Items" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange(settingsTab === "Items" ? "" : "Items")}
        >
          <ChevronRight size={16} />
          Items
        </button>
        <button
          className={`settingsTab ${settingsTab === "Service Types" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange(settingsTab === "Service Types" ? "" : "Service Types")}
        >
          <ChevronRight size={16} />
          Service Types
        </button>
        <button
          className={`settingsTab ${settingsTab === "CheckUp Type Intervals" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange(settingsTab === "CheckUp Type Intervals" ? "" : "CheckUp Type Intervals")}
        >
          <ChevronRight size={16} />
          CheckUp Type Intervals
        </button>
        <button
          className={`settingsTab ${settingsTab === "Regular Inspection List" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange(settingsTab === "Regular Inspection List" ? "" : "Regular Inspection List")}
        >
          <ChevronRight size={16} />
          Regular Inspection List
        </button>
      </div>

      {settingsTab === "Category" ? (
        <section className="panel settingsPanel">
          <div className="panelHeader settingsPanelHeader">
            <div>
              <h2>Asset Categories</h2>
              <span className="settingsCount">{categories.length} total categories</span>
            </div>
            <div className="settingsHeaderActions">
              <label className="settingsSearchField">
                <Search size={16} />
                <input
                  type="search"
                  value={categorySearch}
                  onChange={(event) => onCategorySearchChange(event.target.value)}
                  placeholder="Search categories..."
                />
              </label>
              <button className="schedulePrimaryButton" type="button" onClick={onOpenCategoryModal}>
                <Plus size={16} />
                Add Category
              </button>
            </div>
          </div>

          {filteredCategories.length === 0 ? (
            <div className="emptyState settingsEmptyState">No categories match the current search.</div>
          ) : (
            <div className="reportPreviewTable settingsGridTable">
              <div className="reportPreviewHeader" style={{ gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(120px, 0.8fr) minmax(250px, 1.5fr) minmax(200px, 1fr)' }}>
                <span>Category</span>
                <span>Status</span>
                <span>Description</span>
                <span>Actions</span>
              </div>
              {filteredCategories.map((category) => (
                <div key={category.id} className="reportPreviewRow" style={{ gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(120px, 0.8fr) minmax(250px, 1.5fr) minmax(200px, 1fr)' }}>
                  <div className="inventoryAssetCell">
                    <span className="inventoryAssetIcon">
                      <ClipboardList size={16} />
                    </span>
                    <strong>{category.name}</strong>
                  </div>
                  <span className={`inventoryStatusBadge ${category.is_active ? 'low' : 'critical'}`}>
                    {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="inventoryCellText">
                    {category.description || 'No description added yet.'}
                  </span>
                  <div className="inventoryActions">
                    <button
                      className={`settingsToggleButton ${category.is_active ? 'inactive' : 'active'}`}
                      type="button"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px' }}
                      onClick={() => onToggleCategory(category)}
                    >
                      {category.is_active ? 'Set Inactive' : 'Set Active'}
                    </button>
                    <button className="iconActionBtn" title="Edit" type="button" onClick={() => onEditCategory(category)}>
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="iconActionBtn deleteBtn"
                      title="Delete"
                      type="button"
                      onClick={() => onDeleteCategory(category)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {settingsTab === "Stations" ? (
        <section className="panel settingsPanel">
          <div className="panelHeader settingsPanelHeader">
            <div>
              <h2>Stations</h2>
              <span className="settingsCount">{locations.length} total stations</span>
            </div>
            <div className="settingsHeaderActions">
              <label className="settingsSearchField">
                <Search size={16} />
                <input
                  type="search"
                  value={locationSearch}
                  onChange={(event) => onLocationSearchChange(event.target.value)}
                  placeholder="Search stations..."
                />
              </label>
              <button className="schedulePrimaryButton" type="button" onClick={onOpenLocationModal}>
                <Plus size={16} />
                Add Station
              </button>
            </div>
          </div>

          {filteredLocations.length === 0 ? (
            <div className="emptyState settingsEmptyState">No stations match the current search.</div>
          ) : (
            <div className="reportPreviewTable settingsGridTable">
              <div className="reportPreviewHeader" style={{ gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(250px, 1.5fr) minmax(200px, 1.2fr) minmax(150px, 1fr)' }}>
                <span>Station</span>
                <span>Description</span>
                <span>Location</span>
                <span>Actions</span>
              </div>
              {filteredLocations.map((location) => (
                <div key={location.id} className="reportPreviewRow" style={{ gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(250px, 1.5fr) minmax(200px, 1.2fr) minmax(150px, 1fr)' }}>
                  <div className="inventoryAssetCell">
                    <span className="inventoryAssetIcon">
                      <MapPinned size={16} />
                    </span>
                    <strong>{location.name}</strong>
                  </div>
                  <span className="inventoryCellText">
                    {location.description || 'No description added yet.'}
                  </span>
                  <span className="inventoryCellText">
                    {[location.site, location.room].filter(Boolean).join(' / ') || 'Not specified'}
                  </span>
                  <div className="inventoryActions">
                    <button className="iconActionBtn" title="Edit" type="button" onClick={() => onEditLocation(location)}>
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="iconActionBtn deleteBtn"
                      title="Delete"
                      type="button"
                      onClick={() => onDeleteLocation(location)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {settingsTab === "Items" ? (
        <section className="panel settingsPanel">
          <div className="panelHeader settingsPanelHeader">
            <div>
              <h2>Items</h2>
              <span className="settingsCount">{items.length} total items</span>
            </div>
            <div className="settingsHeaderActions">
              <label className="settingsSearchField">
                <Search size={16} />
                <input
                  type="search"
                  value={itemSearch}
                  onChange={(event) => onItemSearchChange(event.target.value)}
                  placeholder="Search items..."
                />
              </label>
              <button className="schedulePrimaryButton" type="button" onClick={onOpenItemModal}>
                <Plus size={16} />
                Add Item
              </button>
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="emptyState settingsEmptyState">No items match the current search.</div>
          ) : (
            <div className="reportPreviewTable settingsGridTable">
              <div className="reportPreviewHeader" style={{ gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(150px, 1fr)' }}>
                <span>Item</span>
                <span>Price</span>
                <span>Inventory Quantity</span>
                <span>Actions</span>
              </div>
              {filteredItems.map((item) => (
                <div key={item.id} className="reportPreviewRow" style={{ gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(150px, 1fr) minmax(150px, 1fr) minmax(150px, 1fr)' }}>
                  <div className="inventoryAssetCell">
                    <span className="inventoryAssetIcon">
                      <HardDrive size={16} />
                    </span>
                    <strong>{item.name}</strong>
                  </div>
                  <span className="inventoryCellText">{`PKR ${Number(item.price || 0).toFixed(2)}`}</span>
                  <span className="inventoryCellText">{item.inventory_quantity}</span>
                  <div className="inventoryActions">
                    <button className="iconActionBtn" title="Edit" type="button" onClick={() => onEditItem(item)}>
                      <Edit2 size={16} />
                    </button>
                    <button className="iconActionBtn deleteBtn" title="Delete" type="button" onClick={() => onDeleteItem(item)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {settingsTab === "Service Types" || settingsTab === "CheckUp Type Intervals" ? (
        <section className="panel settingsPanel">
          <div className="panelHeader settingsPanelHeader">
            <div>
              <h2>{settingsTab === "CheckUp Type Intervals" ? "CheckUp Type Intervals" : "Service Types"}</h2>
              <span className="settingsCount">
                {serviceTypes.length} total {settingsTab === "CheckUp Type Intervals" ? "checkup types" : "service types"}
              </span>
            </div>
            <div className="settingsHeaderActions">
              <label className="settingsSearchField">
                <Search size={16} />
                <input
                  type="search"
                  value={serviceTypeSearch}
                  onChange={(event) => onServiceTypeSearchChange(event.target.value)}
                  placeholder={settingsTab === "CheckUp Type Intervals" ? "Search checkup types..." : "Search service types..."}
                />
              </label>
              <button className="schedulePrimaryButton" type="button" onClick={onOpenServiceTypeModal}>
                <Plus size={16} />
                {settingsTab === "CheckUp Type Intervals" ? "Add CheckUp Type" : "Add Service Type"}
              </button>
            </div>
          </div>

          {filteredServiceTypes.length === 0 ? (
            <div className="emptyState settingsEmptyState">
              {settingsTab === "CheckUp Type Intervals"
                ? "No checkup types match the current search."
                : "No service types match the current search."}
            </div>
          ) : (
            <div className="reportPreviewTable settingsGridTable">
              <div className="reportPreviewHeader" style={{ gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(250px, 1.5fr) minmax(150px, 1fr)' }}>
                <span>{settingsTab === 'CheckUp Type Intervals' ? 'CheckUp Type' : 'Service Type'}</span>
                <span>Interval</span>
                <span>Status</span>
                <span>Description</span>
                <span>Actions</span>
              </div>
              {filteredServiceTypes.map((serviceType) => (
                <div key={serviceType.id} className="reportPreviewRow" style={{ gridTemplateColumns: 'minmax(200px, 1.2fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(250px, 1.5fr) minmax(150px, 1fr)' }}>
                  <div className="inventoryAssetCell">
                    <span className="inventoryAssetIcon">
                      <Cog size={16} />
                    </span>
                    <strong>{serviceType.name}</strong>
                  </div>
                  <span className="inventoryCellText">
                    {serviceType.interval_days ? `${serviceType.interval_days} days` : 'No interval set'}
                  </span>
                  <span className={`inventoryStatusBadge ${serviceType.is_active ? 'low' : 'critical'}`}>
                    {serviceType.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="inventoryCellText">
                    {serviceType.description || 'No description added yet.'}
                  </span>
                  <div className="inventoryActions">
                    <button className="iconActionBtn" title="Edit" type="button" onClick={() => onEditServiceType(serviceType)}>
                      <Edit2 size={16} />
                    </button>
                    <button
                      className="iconActionBtn deleteBtn"
                      title="Delete"
                      type="button"
                      onClick={() => onDeleteServiceType(serviceType)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {settingsTab === "Regular Inspection List" ? (
        <section className="panel settingsPanel">
          <div className="panelHeader settingsPanelHeader">
            <div>
              <h2>Regular Inspection List</h2>
              <span className="settingsCount">{regularInspectionList.length} checklist rows</span>
            </div>
            <div className="settingsHeaderActions">
              <button className="schedulePrimaryButton" type="button" onClick={onAddRegularInspectionRow}>
                <Plus size={16} />
                Add Row
              </button>
            </div>
          </div>

          {regularInspectionList.length === 0 ? (
            <div className="emptyState settingsEmptyState">No regular inspection rows configured yet.</div>
          ) : (
            <div className="reportPreviewTable settingsGridTable">
              <div className="reportPreviewHeader" style={{ gridTemplateColumns: '60px minmax(150px, 1fr) minmax(200px, 1.2fr) minmax(150px, 1fr) 100px' }}>
                <span>#</span>
                <span>Category</span>
                <span>Check Item</span>
                <span>Standard</span>
                <span>Actions</span>
              </div>
              {regularInspectionList.map((entry, index) => (
                <div
                  key={entry.id || `${entry.category}-${entry.check_item}-${index}`}
                  className="reportPreviewRow"
                  style={{ gridTemplateColumns: '60px minmax(150px, 1fr) minmax(200px, 1.2fr) minmax(150px, 1fr) 100px' }}
                >
                  <span className="inventoryCellText">{index + 1}</span>
                  <input
                    className="settingsInlineInput"
                    type="text"
                    value={entry.category || ''}
                    onChange={(event) => onUpdateRegularInspectionRow(entry.id, 'category', event.target.value)}
                    placeholder="Category"
                  />
                  <input
                    className="settingsInlineInput"
                    type="text"
                    value={entry.check_item || ''}
                    onChange={(event) => onUpdateRegularInspectionRow(entry.id, 'check_item', event.target.value)}
                    placeholder="Check Item"
                  />
                  <input
                    className="settingsInlineInput"
                    type="text"
                    value={entry.standard || ''}
                    onChange={(event) => onUpdateRegularInspectionRow(entry.id, 'standard', event.target.value)}
                    placeholder="Standard"
                  />
                  <div className="inventoryActions">
                    <button
                      className="settingsSecondaryButton danger"
                      type="button"
                      onClick={() => onDeleteRegularInspectionRow(entry.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {categoryModalOpen ? (
        <div className="assetModalBackdrop open" role="presentation" onClick={onCloseCategoryModal}>
          <section
            className="panel assetModal open settingsModal"
            role="dialog"
            aria-modal="true"
            aria-label={categoryDraft.id ? "Edit Category" : "Add Category"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panelHeader">
              <h2>{categoryDraft.id ? "Edit Category" : "Add Category"}</h2>
              <div className="assetModalActions">
                <button type="button" onClick={onCloseCategoryModal}>
                  Close
                </button>
              </div>
            </div>
            <div className="scheduleModalGrid">
              <label className="assetField">
                <span>Category Name</span>
                <input
                  type="text"
                  value={categoryDraft.name}
                  onChange={(event) => onCategoryDraftChange("name", event.target.value)}
                  placeholder="Enter category name"
                />
              </label>
              <label className="assetField">
                <span>Description</span>
                <input
                  type="text"
                  value={categoryDraft.description}
                  onChange={(event) => onCategoryDraftChange("description", event.target.value)}
                  placeholder="Describe this asset category"
                />
              </label>
            </div>
            <div className="assetFormActions">
              <button className="ghostAction" type="button" onClick={onCloseCategoryModal}>
                Cancel
              </button>
              <button className="primaryAction" type="button" onClick={onSaveCategory}>
                {categoryDraft.id ? "Update Category" : "Save Category"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {itemModalOpen ? (
        <div className="assetModalBackdrop open" role="presentation" onClick={onCloseItemModal}>
          <section
            className="panel assetModal open settingsModal"
            role="dialog"
            aria-modal="true"
            aria-label={itemDraft.id ? "Edit Item" : "Add Item"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panelHeader">
              <h2>{itemDraft.id ? "Edit Item" : "Add Item"}</h2>
              <div className="assetModalActions">
                <button type="button" onClick={onCloseItemModal}>
                  Close
                </button>
              </div>
            </div>
            <div className="scheduleModalGrid">
              <label className="assetField">
                <span>Item Name</span>
                <input
                  type="text"
                  value={itemDraft.name}
                  onChange={(event) => onItemDraftChange("name", event.target.value)}
                  placeholder="Enter item name"
                />
              </label>
              <label className="assetField">
                <span>Price</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDraft.price}
                  onChange={(event) => onItemDraftChange("price", event.target.value)}
                  placeholder="0.00"
                />
              </label>
              <label className="assetField">
                <span>Inventory Quantity</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={itemDraft.inventory_quantity}
                  onChange={(event) => onItemDraftChange("inventory_quantity", event.target.value)}
                  placeholder="0"
                />
              </label>
            </div>
            <div className="assetFormActions">
              <button className="ghostAction" type="button" onClick={onCloseItemModal}>
                Cancel
              </button>
              <button className="primaryAction" type="button" onClick={onSaveItem}>
                {itemDraft.id ? "Update Item" : "Save Item"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {locationModalOpen ? (
        <div className="assetModalBackdrop open" role="presentation" onClick={onCloseLocationModal}>
          <section
            className="panel assetModal open settingsModal"
            role="dialog"
            aria-modal="true"
            aria-label={locationDraft.id ? "Edit Station" : "Add Station"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panelHeader">
              <h2>{locationDraft.id ? "Edit Station" : "Add Station"}</h2>
              <div className="assetModalActions">
                <button type="button" onClick={onCloseLocationModal}>
                  Close
                </button>
              </div>
            </div>
            <div className="scheduleModalGrid">
              <label className="assetField">
                <span>Station Name</span>
                <input
                  type="text"
                  value={locationDraft.name}
                  onChange={(event) => onLocationDraftChange("name", event.target.value)}
                  placeholder="Enter station name"
                />
              </label>
              <label className="assetField">
                <span>Description</span>
                <input
                  type="text"
                  value={locationDraft.description}
                  onChange={(event) => onLocationDraftChange("description", event.target.value)}
                  placeholder="Describe this station"
                />
              </label>
              <label className="assetField">
                <span>Site</span>
                <input
                  type="text"
                  value={locationDraft.site}
                  onChange={(event) => onLocationDraftChange("site", event.target.value)}
                  placeholder="Optional site"
                />
              </label>
              <label className="assetField">
                <span>Room</span>
                <input
                  type="text"
                  value={locationDraft.room}
                  onChange={(event) => onLocationDraftChange("room", event.target.value)}
                  placeholder="Optional room"
                />
              </label>
            </div>
            <div className="assetFormActions">
              <button className="ghostAction" type="button" onClick={onCloseLocationModal}>
                Cancel
              </button>
              <button className="primaryAction" type="button" onClick={onSaveLocation}>
                {locationDraft.id ? "Update Station" : "Save Station"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {serviceTypeModalOpen ? (
        <div className="assetModalBackdrop open" role="presentation" onClick={onCloseServiceTypeModal}>
          <section
            className="panel assetModal open settingsModal"
            role="dialog"
            aria-modal="true"
            aria-label={serviceTypeDraft.id ? "Edit Service Type" : "Add Service Type"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panelHeader">
              <h2>{serviceTypeDraft.id ? "Edit Service Type" : "Add Service Type"}</h2>
              <div className="assetModalActions">
                <button type="button" onClick={onCloseServiceTypeModal}>
                  Close
                </button>
              </div>
            </div>
            <div className="scheduleModalGrid">
              <label className="assetField">
                <span>Service Type Name</span>
                <input
                  type="text"
                  value={serviceTypeDraft.name}
                  onChange={(event) => onServiceTypeDraftChange("name", event.target.value)}
                  placeholder="Enter service type name"
                />
              </label>
              <label className="assetField">
                <span>Description</span>
                <input
                  type="text"
                  value={serviceTypeDraft.description}
                  onChange={(event) => onServiceTypeDraftChange("description", event.target.value)}
                  placeholder="Describe this service type"
                />
              </label>
              <label className="assetField">
                <span>Interval Days</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={serviceTypeDraft.interval_days}
                  onChange={(event) => onServiceTypeDraftChange("interval_days", event.target.value)}
                  placeholder="0"
                />
              </label>
            </div>
            <div className="assetFormActions">
              <button className="ghostAction" type="button" onClick={onCloseServiceTypeModal}>
                Cancel
              </button>
              <button className="primaryAction" type="button" onClick={onSaveServiceType}>
                {serviceTypeDraft.id ? "Update Service Type" : "Save Service Type"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

