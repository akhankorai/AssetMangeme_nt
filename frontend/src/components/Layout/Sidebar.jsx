import React from 'react';
import { Wrench, ChevronRight } from 'lucide-react';
import { navigation, globalNavigation } from '../../constants';
export default function Sidebar({ 
  visibleAssetModules, 
  canAccessMonthlyMaintenance, 
  handleSidebarSectionToggle, 
  handleNavClick,
  activeView,
  expandedSidebarSection,
  canAccessApprovals
}) {

  return (
    <aside className="sidebar">
      <div>
        <div className="brand">
          <div className="brandMark">
            <Wrench size={18} />
          </div>
          <div>
            <strong>Precision Assets</strong>
            <span>Enterprise Suite</span>
          </div>
        </div>

        {(visibleAssetModules && visibleAssetModules.length > 0 ? visibleAssetModules : [{ key: 'vehicle-assets', label: 'Vehicle Assets' }]).map((section) => {
          const isExpanded = expandedSidebarSection === section.key || (!expandedSidebarSection && section.key === 'vehicle-assets');
          return (
            <div key={section.key} className="sidebarGroup">
              <button
                className="sidebarGroupToggle"
                type="button"
                onClick={() => handleSidebarSectionToggle(section.key)}
                aria-expanded={isExpanded}
              >
                <span>{section.label}</span>
                <ChevronRight size={18} className={isExpanded ? "rotated" : ""} />
              </button>

              {isExpanded ? (
                <nav className="sideNav" aria-label={section.label}>
                  {navigation.map((item) => {
                    if (item.label === "Schedule Monthly Maintenance Task" && !canAccessMonthlyMaintenance) {
                      return null;
                    }
                    if (item.label === "Approvals" && !canAccessApprovals) {
                      return null;
                    }
                    const Icon = item.icon;
                    const isActive = activeView === item.label;
                    return (
                      <button
                        key={item.label}
                        className={`navItem ${isActive ? "active" : ""}`}
                        type="button"
                        onClick={() => handleNavClick(item.label, { view: item.view, settingsTab: item.settingsTab })}
                      >
                        <Icon size={18} />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </nav>
              ) : null}
            </div>
          );
        })}

        <div className="sidebarGroup">
          <button
            className="sidebarGroupToggle"
            type="button"
            onClick={() => handleSidebarSectionToggle('system')}
            aria-expanded={expandedSidebarSection === 'system'}
          >
            <span>System Operations</span>
            <ChevronRight size={18} className={expandedSidebarSection === 'system' ? "rotated" : ""} />
          </button>

          {expandedSidebarSection === 'system' ? (
            <nav className="sideNav" aria-label="System Operations">
              {globalNavigation.map((item) => {
                if (item.label === "Approvals" && !canAccessApprovals) {
                  return null;
                }
                const Icon = item.icon;
                const isActive = activeView === item.label;
                return (
                  <button
                    key={item.label}
                    className={`navItem ${isActive ? "active" : ""}`}
                    type="button"
                    onClick={() => handleNavClick(item.label, { view: item.view, settingsTab: item.settingsTab })}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
