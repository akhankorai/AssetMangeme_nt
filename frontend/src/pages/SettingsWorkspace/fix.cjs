const fs = require('fs');
let c = fs.readFileSync('SettingsWorkspace.jsx', 'utf8');

c = c.replace(/<div className="tableWrap nativeTableWrap">[\s\S]*?<\/table>\s*<\/div>/g, (match) => {
  if (match.includes('<th>Category</th>')) {
    return `<div className="reportPreviewTable" style={{ margin: '0' }}>
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
                  <span className={\`inventoryStatusBadge \${category.is_active ? 'low' : 'critical'}\`}>
                    {category.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                  <span className="inventoryCellText">
                    {category.description || 'No description added yet.'}
                  </span>
                  <div className="inventoryActions">
                    <button
                      className={\`settingsToggleButton \${category.is_active ? 'inactive' : 'active'}\`}
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
            </div>`;
  } else if (match.includes('<th>Station</th>')) {
    return `<div className="reportPreviewTable" style={{ margin: '0' }}>
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
            </div>`;
  } else if (match.includes('<th>Item</th>')) {
    return `<div className="reportPreviewTable" style={{ margin: '0' }}>
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
                  <span className="inventoryCellText">{\`PKR \${Number(item.price || 0).toFixed(2)}\`}</span>
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
            </div>`;
  } else if (match.includes('"CheckUp Type" : "Service Type"')) {
    return `<div className="reportPreviewTable" style={{ margin: '0' }}>
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
                    {serviceType.interval_days ? \`\${serviceType.interval_days} days\` : 'No interval set'}
                  </span>
                  <span className={\`inventoryStatusBadge \${serviceType.is_active ? 'low' : 'critical'}\`}>
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
            </div>`;
  } else if (match.includes('<th>Check Item</th>')) {
    return `<div className="reportPreviewTable" style={{ margin: '0' }}>
              <div className="reportPreviewHeader" style={{ gridTemplateColumns: '60px minmax(150px, 1fr) minmax(200px, 1.2fr) minmax(150px, 1fr) 100px' }}>
                <span>#</span>
                <span>Category</span>
                <span>Check Item</span>
                <span>Standard</span>
                <span>Actions</span>
              </div>
              {regularInspectionList.map((entry, index) => (
                <div
                  key={entry.id || \`\${entry.category}-\${entry.check_item}-\${index}\`}
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
            </div>`;
  }
  return match;
});

fs.writeFileSync('SettingsWorkspace.jsx', c, 'utf8');
console.log('Replaced to daily inspection css!');
