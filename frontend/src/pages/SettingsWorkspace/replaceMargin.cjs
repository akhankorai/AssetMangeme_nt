const fs = require('fs');
let c = fs.readFileSync('SettingsWorkspace.jsx', 'utf8');
c = c.replaceAll('<div className="reportPreviewTable" style={{ margin: \\'0\\' }}>', '<div className="reportPreviewTable settingsGridTable">');
fs.writeFileSync('SettingsWorkspace.jsx', c, 'utf8');
console.log('Replaced margins');
