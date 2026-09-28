import React from 'react';

export default function AssetModal({ isOpen, onClose, asset, onSave }) {
  if (!isOpen) return null;

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalContent" onClick={e => e.stopPropagation()}>
        <h2>{asset ? 'Edit Asset' : 'New Asset'}</h2>
        <p>Asset Modal extracted from App.jsx</p>
        <div className="modalActions">
          <button onClick={onClose}>Cancel</button>
          <button onClick={() => onSave(asset)}>Save</button>
        </div>
      </div>
    </div>
  );
}
