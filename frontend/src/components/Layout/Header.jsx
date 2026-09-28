import React from 'react';
import { Search, Bell } from 'lucide-react';
export default function Header({ 
  search, setSearch, 
  notificationCount, 
  headerDisplayName, 
  headerIdentity, 
  headerRole, 
  avatarInitials, 
  userMenuOpen, 
  setUserMenuOpen, 
  userMenuRef, 
  handleProfileClick, 
  handleUserManagementClick, 
  handleAdminLogoutClick,
  notificationsOpen,
  setNotificationsOpen,
  canAccessUserManagement
}) {
  return (
    <header className="topbar">
      <label className="searchBar">
        <Search size={16} />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search assets, locations, serials, or assignees..."
        />
      </label>

      <div className="topbarActions">
        <button
          className={`iconCircle ${notificationsOpen ? "active" : ""}`}
          type="button"
          aria-label="Notifications"
          onClick={() => setNotificationsOpen((current) => !current)}
        >
          <Bell size={18} />
          {notificationCount > 0 ? <span className="iconBadge">{notificationCount}</span> : null}
        </button>
        <div className="profileBlock" ref={userMenuRef}>
          <div className="profileMeta">
            <strong>{headerDisplayName}</strong>
            <span>{headerIdentity ? `${headerIdentity} | ${headerRole}` : headerRole}</span>
          </div>
          <button
            className="avatar profileActionButton"
            type="button"
            onClick={() => setUserMenuOpen((current) => !current)}
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            aria-label="Open user menu"
          >
            {avatarInitials}
          </button>
          {userMenuOpen ? (
            <div className="userMenu" role="menu" aria-label="User Menu">
              <button type="button" role="menuitem" onClick={handleProfileClick}>
                Profile
              </button>
              {canAccessUserManagement ? (
                <button type="button" role="menuitem" onClick={handleUserManagementClick}>
                  User Management
                </button>
              ) : null}
              <button type="button" role="menuitem" onClick={handleAdminLogoutClick}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
