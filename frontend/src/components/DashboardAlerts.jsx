import { AlertTriangle } from "lucide-react";

export default function DashboardAlerts({ filteredAlerts, setAlertsDismissed, handleAlertAction }) {
  if (!filteredAlerts || filteredAlerts.length === 0) return null;

  return (
    <>
      <section className="sectionHead">
        <h2>Critical Action Required</h2>
        <button type="button" onClick={() => setAlertsDismissed(true)}>
          Acknowledge All Alerts
        </button>
      </section>

      <section className="alertGrid dashboardAlertGrid">
        {filteredAlerts.map((alert) => (
          <article key={`${alert.title}-${alert.asset_id}`} className={`alertPanel ${alert.tone}`}>
            <div className="alertHead">
              <div className="alertBadge">
                <AlertTriangle size={16} />
              </div>
              <h3>{alert.title}</h3>
              <span>{alert.age}</span>
            </div>
            <p>{alert.text}</p>
            <div className="buttonRow">
              {alert.actions &&
                alert.actions.map((action) => (
                  <button key={action} type="button" onClick={() => handleAlertAction(alert, action)}>
                    {action}
                  </button>
                ))}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
