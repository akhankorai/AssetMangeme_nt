import sys

def fix_schedule_workspace(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the start of the 'else' branch (emergency mode)
    s_idx = content.find('      ) : (\n        <>\n')
    if s_idx == -1:
        # Maybe it's missing the <>
        s_idx = content.find('      ) : (')
        if s_idx == -1:
             print("Could not find ') : ('")
             return
             
    # Find the end of the emergency mode (start of modal)
    e_idx = content.find('      {showPendingCreationsModal && (', s_idx)
    if e_idx == -1:
         print("Could not find showPendingCreationsModal")
         return

    emergency_block = """      ) : (
        <>
          <div className="scheduleTabsWrap settingsCategoryActions" style={{ display: 'flex', gap: '10px', width: '100%', marginBottom: '16px' }}>
            {scheduleStages.filter((stage) => !["planned", "completed"].includes(stage.key)).map((stage) => {
              const count = emergencyRepairTasks.filter((task) => task.stage === stage.key).length;
              return (
                <button 
                  key={`emergency-${stage.key}`}
                  className={`settingsToggleButton ${activeEmergencyTab === stage.key ? 'active' : 'inactive'}`}
                  style={{ 
                    flex: 1, 
                    padding: '12px 10px', 
                    textAlign: 'center', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '4px',
                    backgroundColor: activeEmergencyTab === stage.key ? '#fef2f2' : '#ffffff',
                    color: activeEmergencyTab === stage.key ? '#b91c1c' : '#64748b',
                    border: `1px solid ${activeEmergencyTab === stage.key ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: '8px',
                    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => setActiveEmergencyTab(stage.key)}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{stage.label}</span> 
                  <span style={{ fontSize: '1.1rem', opacity: 0.8 }}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="scheduleTaskCardsContainer" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px', marginBottom: '24px' }}>
            {emergencyRepairTasks.filter(task => task.stage === activeEmergencyTab).length === 0 ? (
              <div className="emptyState scheduleEmpty" style={{ textAlign: 'center', padding: '40px 20px', background: '#ffffff', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
                <p style={{ color: '#64748b', fontSize: '0.95rem' }}>No emergency tasks in this stage.</p>
              </div>
            ) : (
              emergencyRepairTasks.filter(task => task.stage === activeEmergencyTab).map((task) => (
                <div key={task.id} className="scheduleTaskCard" style={{ background: '#ffffff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', transition: 'all 0.3s ease', position: 'relative', overflow: 'hidden' }}>
                  
                  <div style={{ flex: '1 1 300px' }}>
                    <div className="scheduleTaskMeta" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#3b82f6', background: '#eff6ff', padding: '4px 8px', borderRadius: '6px' }}>{task.assetTag}</span>
                      <strong className={`riskBadge ${getScheduleRiskTone(task.risk)}`}>{task.risk}</strong>
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>{task.title}</h3>
                  </div>

                  <div style={{ flex: '1 1 250px' }}>
                    {task.stage === "inspection" ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div className="scheduleTaskInlineControl">
                          <span style={{fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px'}}>Inspection Decision</span>
                          <select
                            disabled={!canInspectTaskForUser(task)}
                            value={task.inspectionRequired === false ? "Not Need" : "Need"}
                            onChange={(event) =>
                              onUpdateTask(task.id, {
                                inspectionRequired: event.target.value !== "Not Need",
                              })
                            }
                            style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                          >
                            <option value="Need">Needs Inspection</option>
                            <option value="Not Need">Not Needed</option>
                          </select>
                        </div>
                        {task.inspectionRequired === false ? (
                          <div className="scheduleTaskInlineControl">
                            <input
                              type="text"
                              disabled={!canInspectTaskForUser(task)}
                              value={task.inspectionComment || ""}
                              placeholder="Enter reason/comment"
                              onChange={(event) =>
                                onUpdateTask(task.id, {
                                  inspectionComment: event.target.value,
                                })
                              }
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : ["awaiting_parts", "in_progress"].includes(task.stage) ? (
                      <div className="scheduleTaskInlineControl">
                        <span style={{fontSize: '0.75rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px'}}>Current Meter Reading</span>
                        <input
                          type="text"
                          disabled={!canPerformTaskForUser(task)}
                          value={task.meterReading || ""}
                          placeholder="Enter current meter reading"
                          onChange={(event) =>
                            onUpdateTask(task.id, {
                              meterReading: event.target.value,
                            })
                          }
                          style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                        />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>No pending readings</span>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'flex-end', borderLeft: '1px solid #f1f5f9', paddingLeft: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Assigned To</span>
                      <strong style={{ fontSize: '0.95rem', color: '#1e293b' }}>{task.assignee}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{task.dueDate ? formatDate(task.dueDate) : "No due date"}</span>
                    </div>
                    
                    <div className="settingsCategoryActions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {canEditTaskForUser(task) ? (
                        <button className="iconActionBtn" title="Edit" type="button" onClick={() => onEditTask(task)} style={{ padding: '6px', borderRadius: '6px', background: '#f1f5f9', color: '#64748b' }}>
                          <Edit2 size={16} />
                        </button>
                      ) : null}
                      {isSuperuser && task.stage === "planned" ? (
                        <button className="iconActionBtn deleteBtn" title="Delete" type="button" style={{ padding: '6px', borderRadius: '6px', background: '#fef2f2', color: '#dc2626'}} onClick={() => onDeleteTask(task)}>
                          <Trash2 size={16} />
                        </button>
                      ) : null}
                      {canAdvanceTaskStageForUser(task) ? (
                        <button className="schedulePrimaryButton" type="button" style={{minHeight: '32px', padding: '6px 16px', fontSize: '0.85rem', borderRadius: '6px', fontWeight: 600, boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'}} onClick={() => onMoveTask(task.id, nextStage(task.stage, task))}>
                          {stageActionLabel(task.stage, task)}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

"""

    content = content[:s_idx] + emergency_block + content[e_idx:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Successfully restored emergency tabs and updated the table to sleek cards!")

fix_schedule_workspace('C:/omega/Asset Management/Asset Management/Asset Management/frontend/src/pages/ScheduleWorkspace/ScheduleWorkspace.jsx')
