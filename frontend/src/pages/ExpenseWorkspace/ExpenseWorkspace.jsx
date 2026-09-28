import { useState, useMemo } from "react";
import { ChevronRight, Printer } from "lucide-react";
import { formatCurrency } from "../../utils/formatting";
import { printEntry } from "../../utils/printUtils";

export default function ExpenseWorkspace({ costMetrics, expenseRows, onOpenSchedule }) {
  const [filters, setFilters] = useState({
    task: "",
    date: "",
    asset: "",
  });

  const [activeTab, setActiveTab] = useState("consumption");

  const filteredExpenseRows = useMemo(() => {
    const taskQuery = filters.task.toLowerCase();
    const dateQuery = filters.date.toLowerCase();
    const assetQuery = filters.asset.toLowerCase();

    return expenseRows.filter((row) => {
      const taskMatch = !taskQuery || String(row.taskTitle || "").toLowerCase().includes(taskQuery);
      const dateMatch = !dateQuery || String(row.assignedDate || "").toLowerCase().includes(dateQuery);
      const assetMatch = !assetQuery || String(row.assetTitle || "").toLowerCase().includes(assetQuery) || String(row.itemSubtitle || "").toLowerCase().includes(assetQuery);
      return taskMatch && dateMatch && assetMatch;
    });
  }, [expenseRows, filters]);

  return (
    <section className="expenseWorkspace" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="scheduleTabsWrap settingsCategoryActions" style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '0px' }}>
        <button
          type="button"
          className={`settingsToggleButton ${activeTab === "consumption" ? 'active' : 'inactive'}`}
          onClick={() => setActiveTab("consumption")}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '10px',
            background: activeTab === "consumption" ? '#eff6ff' : '#ffffff',
            color: activeTab === "consumption" ? '#1d4ed8' : '#64748b',
            border: `1px solid ${activeTab === "consumption" ? '#bfdbfe' : '#e2e8f0'}`,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Assigned Task Consumption
        </button>
        <button
          type="button"
          className={`settingsToggleButton ${activeTab === "costRate" ? 'active' : 'inactive'}`}
          onClick={() => setActiveTab("costRate")}
          style={{
            flex: 1,
            padding: '12px 16px',
            borderRadius: '10px',
            background: activeTab === "costRate" ? '#eff6ff' : '#ffffff',
            color: activeTab === "costRate" ? '#1d4ed8' : '#64748b',
            border: `1px solid ${activeTab === "costRate" ? '#bfdbfe' : '#e2e8f0'}`,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          Cost Rate
        </button>
      </div>

      {activeTab === "consumption" ? (
        <section className="panel expenseTaskPanel" style={{ width: '100%', flex: 1 }}>
          <div className="panelHeader">
            <h2>Assigned Task Consumption</h2>
            <button type="button" onClick={onOpenSchedule}>
              Full Schedule
              <ChevronRight size={15} />
            </button>
          </div>
          <div className="nativeTableWrap">
            <table className="inventoryTable">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Assigned Task</th>
                  <th>Date Of Assignment</th>
                  <th>Due Asset</th>
                  <th>Projected Cost</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
                <tr>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input
                      type="text"
                      placeholder="Search ID..."
                      value={filters.id}
                      onChange={(e) => setFilters({ ...filters, id: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input
                      type="text"
                      placeholder="Search task..."
                      value={filters.task}
                      onChange={(e) => setFilters({ ...filters, task: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input
                      type="text"
                      placeholder="Search date..."
                      value={filters.date}
                      onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <input
                      type="text"
                      placeholder="Search asset..."
                      value={filters.asset}
                      onChange={(e) => setFilters({ ...filters, asset: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }}
                    />
                  </th>
                  <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                </tr>
              </thead>
              <tbody>
            {filteredExpenseRows.length === 0 ? (
              <tr>
                <td colSpan="4" className="emptyState expenseEmptyState">No assigned tasks match your filter.</td>
              </tr>
            ) : (
              filteredExpenseRows.map((row) => (
                <tr key={row.id} className="nativeTableRow">
                  <td style={{ fontWeight: 600, color: '#334155' }}>{row.formatted_id || `#${row.id}`}</td>
                  <td>
                    <div className="expensePrimaryCell">
                      <strong>{row.taskTitle}</strong>
                      <span>{row.assignee}</span>
                    </div>
                  </td>
                  <td className="expenseCellText">{row.assignedDate}</td>
                  <td>
                    <div className="expensePrimaryCell">
                      <strong>{row.assetTitle}</strong>
                      <span>{row.itemSubtitle}</span>
                    </div>
                  </td>
                  <td>
                    <strong className="expenseCostValue">{formatCurrency(row.projectedCost)}</strong>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button
                      className="settingsSecondaryButton"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => printEntry(row, "Expense Record")}
                    >
                      <Printer size={14} /> Print
                    </button>
                  </td>
                </tr>
              ))
            )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <aside className="panel expenseRatePanel" style={{ width: '100%', maxWidth: 'none', flex: 1 }}>
          <div className="panelHeader">
            <h2>Cost Rate</h2>
          </div>
          <div className="expenseMetricStack">
            <article className="expenseMetricCard">
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Future Consumption Cost</span>
              <strong style={{ color: '#ffffff' }}>{formatCurrency(costMetrics.futureConsumptionCost)}</strong>
            </article>
            <article className="expenseMetricCard">
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Net Consumed Cost</span>
              <strong style={{ color: '#ffffff' }}>{formatCurrency(costMetrics.netConsumedCost)}</strong>
            </article>
            <article className="expenseMetricCard">
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Remaining Inventory Value</span>
              <strong style={{ color: '#ffffff' }}>{formatCurrency(costMetrics.remainingInventoryValue)}</strong>
            </article>
            <article className="expenseMetricCard">
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Reserved Units</span>
              <strong style={{ color: '#ffffff' }}>{costMetrics.reservedUnits}</strong>
            </article>
            <article className="expenseMetricCard">
              <span style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Coverage Rate</span>
              <strong style={{ color: '#ffffff' }}>{costMetrics.coverageRate}%</strong>
            </article>
          </div>

          <div className="expenseBreakdownsContainer" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '30px', padding: '24px' }}>
            <div className="expenseBreakdown">
              <h3>Inventory Outlook</h3>
              {costMetrics.itemBreakdown.length === 0 ? (
                <div className="expenseBreakdownEmpty">No future item consumption scheduled.</div>
              ) : (
                <div className="nativeTableWrap" style={{ marginTop: '12px' }}>
                  <table className="inventoryTable" style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Item Name</th>
                        <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Projected Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costMetrics.itemBreakdown.map((item) => (
                        <tr key={item.id || item.name}>
                          <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{item.name}</td>
                          <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>Scheduled {item.scheduledQuantity} | Remaining {item.remainingQuantity}</td>
                          <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{formatCurrency(item.projectedCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="expenseBreakdown">
              <h3>Net Consumed</h3>
              {costMetrics.consumedBreakdown.length === 0 ? (
                <div className="expenseBreakdownEmpty">No completed item consumption recorded yet.</div>
              ) : (
                <div className="nativeTableWrap" style={{ marginTop: '12px' }}>
                  <table className="inventoryTable" style={{ width: '100%', borderCollapse: 'collapse', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Item Name</th>
                        <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'left', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', textAlign: 'right', fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Consumed Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {costMetrics.consumedBreakdown.map((item) => (
                        <tr key={`consumed-${item.id || item.name}`}>
                          <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>{item.name}</td>
                          <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>Consumed {item.consumedQuantity} | Remaining {item.remainingQuantity}</td>
                          <td style={{ padding: '10px 14px', borderBottom: '1px solid #e2e8f0', fontSize: '0.85rem', fontWeight: 600, color: '#0f172a', textAlign: 'right' }}>{formatCurrency(item.consumedCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </aside>
      )}
    </section>
  );
}

