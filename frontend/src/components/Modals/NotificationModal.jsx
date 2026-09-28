import React from "react";

export default function NotificationModal({
  notificationsOpen,
  setNotificationsOpen,
  unreadNotificationTasks,
  markAllNotificationsRead,
  notificationInbox,
  unreadNotificationsByDate,
  readNotificationsByDate,
  getNotificationTimingLabel,
  downloadModernNotificationExcel,
  markNotificationAsRead,
}) {
  if (!notificationsOpen) return null;

  return (
    <div className="assetModalBackdrop open" role="presentation" onClick={() => setNotificationsOpen(false)}>
      <section
        className="panel assetModal open notificationPopupModal"
        role="dialog"
        aria-modal="true"
        aria-label="Task Notifications"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panelHeader">
          <h2>Task Notifications</h2>
          <div className="assetModalActions">
            {unreadNotificationTasks?.length > 0 ? (
              <button type="button" onClick={markAllNotificationsRead}>
                Mark All Read
              </button>
            ) : null}
            <button type="button" onClick={() => setNotificationsOpen(false)}>
              Close
            </button>
          </div>
        </div>
        {!notificationInbox || notificationInbox.length === 0 ? (
          <div className="emptyState">No task notifications available yet.</div>
        ) : (
          <>
            <div className="notificationList">
              <div className="notificationGroupTitle">Unread</div>
              {!unreadNotificationsByDate || unreadNotificationsByDate.length === 0 ? (
                <div className="emptyState">No unread notifications.</div>
              ) : null}
              {unreadNotificationsByDate?.map(([dueDate, entries]) => (
                <div key={`unread-${dueDate}`} className="notificationDateGroup">
                  <div className="notificationDateHeader">
                    <strong>{getNotificationTimingLabel(dueDate)}</strong>
                    <button
                      type="button"
                      onClick={() => downloadModernNotificationExcel(entries, `task-notifications-${dueDate}`)}
                    >
                      Download Excel
                    </button>
                  </div>
                  {entries.map((task) => (
                    <article
                      key={`unread-${task.id}`}
                      className="notificationItem"
                      onClick={() => markNotificationAsRead(task.id)}
                    >
                      <strong>{task.title}</strong>
                      <span>
                        {task.assetTag || "No asset"} | {task.serviceType || "No service"} |{" "}
                        {getNotificationTimingLabel(task.dueDate)}
                      </span>
                    </article>
                  ))}
                </div>
              ))}

              <div className="notificationGroupTitle">Read</div>
              {!readNotificationsByDate || readNotificationsByDate.length === 0 ? (
                <div className="emptyState">No read notifications.</div>
              ) : null}
              {readNotificationsByDate?.map(([dueDate, entries]) => (
                <div key={`read-${dueDate}`} className="notificationDateGroup">
                  <div className="notificationDateHeader">
                    <strong>{getNotificationTimingLabel(dueDate)}</strong>
                    <button
                      type="button"
                      onClick={() => downloadModernNotificationExcel(entries, `task-notifications-${dueDate}`)}
                    >
                      Download Excel
                    </button>
                  </div>
                  {entries.map((task) => (
                    <article key={`read-${task.id}`} className="notificationItem read">
                      <strong>{task.title}</strong>
                      <span>
                        {task.assetTag || "No asset"} | {task.serviceType || "No service"} |{" "}
                        {getNotificationTimingLabel(task.dueDate)}
                      </span>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
