import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useUI } from '../../contexts/UIContext';

export default function AppLayout({ 
  children,
  showDashboardOverview,
  sidebarProps,
  headerProps
}) {
  const { notification } = useUI();

  return (
    <div className={`dashboardShell ${showDashboardOverview ? "dashboardReferenceShell" : ""}`}>
      {notification ? (
        <div className={`notificationToast ${notification.tone}`}>{notification.message}</div>
      ) : null}
      
      <Sidebar {...sidebarProps} />
      
      <main className="mainContent">
        <Header {...headerProps} />
        {children}
      </main>
    </div>
  );
}
