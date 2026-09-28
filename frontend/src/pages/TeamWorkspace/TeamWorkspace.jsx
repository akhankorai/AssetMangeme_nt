import { useState } from "react";
import { ChevronRight, Plus, Search, Users, Edit2, Trash2, ListTree } from "lucide-react";

export default function TeamWorkspace({
  employeeCategories,
  employeeCategoryOptions,
  employeeCategoryDraft,
  employeeCategoryModalOpen,
  employeeCategorySearch,
  onDeleteEmployeeCategory,
  onDeleteTeamMember,
  onEmployeeCategoryDraftChange,
  onEmployeeCategorySearchChange,
  onCloseEmployeeCategoryModal,
  onCloseTeamMemberModal,
  onEditEmployeeCategory,
  onEditTeamMember,
  onOpenEmployeeCategoryModal,
  onOpenTeamMemberModal,
  onSaveEmployeeCategory,
  onSaveTeamMember,
  onTeamMemberDraftChange,
  onTeamMemberSearchChange,
  onToggleEmployeeCategory,
  onToggleTeamMember,
  teamMemberDraft,
  teamMemberModalOpen,
  teamMemberSearch,
  teamMembers,
  teamTab,
  onTabChange,
}) {
  const [teamMemberColSearch, setTeamMemberColSearch] = useState({ member: "", serial: "", category: "", designation: "" });
  const [categoryColSearch, setCategoryColSearch] = useState({ name: "", description: "" });

  const filteredEmployeeCategories = employeeCategories.filter((category) => {
    const nameQ = categoryColSearch.name.toLowerCase();
    const descQ = categoryColSearch.description.toLowerCase();
    if (nameQ && !String(category.name || "").toLowerCase().includes(nameQ)) return false;
    if (descQ && !String(category.description || "").toLowerCase().includes(descQ)) return false;

    const term = employeeCategorySearch.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [category.name, category.description, category.is_active ? "active" : "inactive"]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  const teamMembersWithCategory = teamMembers.map((member) => ({
    ...member,
    employee_category_name: employeeCategories.find((c) => c.id === member.employee_category)?.name || "",
  }));

  const filteredTeamMembers = teamMembersWithCategory.filter((member) => {
    const memberQ = teamMemberColSearch.member.toLowerCase();
    const serialQ = teamMemberColSearch.serial.toLowerCase();
    const categoryQ = teamMemberColSearch.category.toLowerCase();
    const designationQ = teamMemberColSearch.designation.toLowerCase();

    if (memberQ && !String(member.name || "").toLowerCase().includes(memberQ)) return false;
    if (serialQ && !String(member.serial_number || "").toLowerCase().includes(serialQ)) return false;
    if (categoryQ && !String(member.employee_category_name || "").toLowerCase().includes(categoryQ)) return false;
    if (designationQ && !String(member.designation || "").toLowerCase().includes(designationQ)) return false;

    const term = teamMemberSearch.trim().toLowerCase();
    if (!term) {
      return true;
    }

    return [
      member.name,
      member.serial_number,
      member.designation,
      member.employee_category_name,
      member.is_active ? "active" : "inactive",
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(term));
  });

  return (
    <section className="settingsWorkspace teamWorkspace">
      <div className="settingsHeader">
        <div>
          <span className="eyebrow">Workspace Team</span>
          <h1>Team</h1>
          {/* <p>Manage employees, serial numbers, and employee categories that support the workspace roster.</p> */}
        </div>
      </div>

      <div className="settingsTabs">
        <button
          className={`settingsTab ${teamTab === "Members" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange(teamTab === "Members" ? "" : "Members")}
        >
          <ChevronRight size={16} />
          Team Members
        </button>
        <button
          className={`settingsTab ${teamTab === "Employee Categories" ? "active" : ""}`}
          type="button"
          onClick={() => onTabChange(teamTab === "Employee Categories" ? "" : "Employee Categories")}
        >
          <ChevronRight size={16} />
          Employee Categories
        </button>
      </div>

      {teamTab === "Members" ? (
        <section className="panel settingsPanel">
          <div className="panelHeader settingsPanelHeader">
            <div>
              <h2>Team Members</h2>
              <span className="settingsCount">{teamMembers.length} total members</span>
            </div>
            <div className="settingsHeaderActions">
              <label className="settingsSearchField">
                <Search size={16} />
                <input
                  type="search"
                  value={teamMemberSearch}
                  onChange={(event) => onTeamMemberSearchChange(event.target.value)}
                  placeholder="Search members..."
                />
              </label>
              <button className="schedulePrimaryButton" type="button" onClick={onOpenTeamMemberModal}>
                <Plus size={16} />
                Add Member
              </button>
            </div>
          </div>

          <div className="nativeTableWrap">
            <table className="inventoryTable">
              <thead>
                <tr>
                    <th>Member</th>
                    <th>Serial Number</th>
                    <th>Employee Category</th>
                    <th>Designation</th>
                    <th>Status</th>
                    <th className="actionsCol">Actions</th>
                  </tr>
                  <tr>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search member..." value={teamMemberColSearch.member} onChange={e => setTeamMemberColSearch({...teamMemberColSearch, member: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search serial..." value={teamMemberColSearch.serial} onChange={e => setTeamMemberColSearch({...teamMemberColSearch, serial: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search category..." value={teamMemberColSearch.category} onChange={e => setTeamMemberColSearch({...teamMemberColSearch, category: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search designation..." value={teamMemberColSearch.designation} onChange={e => setTeamMemberColSearch({...teamMemberColSearch, designation: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeamMembers.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.95rem' }}>
                        <div className="emptyState settingsEmptyState">No team members match the current search.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredTeamMembers.map((member) => (
                      <tr key={member.id} className="nativeTableRow">
                        <td>
                        <div className="settingsCategoryNameCell">
                          <span className="settingsCategoryIcon">
                            <Users size={16} />
                          </span>
                          <div className="teamMemberNameStack">
                            <strong>{member.name}</strong>
                            <span>{member.employee_category_name || "Unassigned category"}</span>
                          </div>
                        </div>
                      </td>
                      <td>{member.serial_number}</td>
                      <td>{member.employee_category_name || "Not set"}</td>
                      <td>{member.designation || "No designation"}</td>
                      <td>
                        <span className={`settingsStatusPill ${member.is_active ? "active" : "inactive"}`}>
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="inventoryActions">
                        <div className="settingsCategoryActions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', alignItems: 'center' }}>
                          <button
                            className={`settingsToggleButton ${member.is_active ? "inactive" : "active"}`}
                            type="button"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px' }}
                            onClick={() => onToggleTeamMember(member)}
                          >
                            {member.is_active ? "Set Inactive" : "Set Active"}
                          </button>
                          <button className="iconActionBtn" title="Edit" type="button" onClick={() => onEditTeamMember(member)}>
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="iconActionBtn deleteBtn"
                            title="Delete"
                            type="button"
                            onClick={() => onDeleteTeamMember(member)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
        </section>
      ) : null}

      {teamTab === "Employee Categories" ? (
        <section className="panel settingsPanel">
          <div className="panelHeader settingsPanelHeader">
            <div>
              <h2>Employee Categories</h2>
              <span className="settingsCount">{employeeCategories.length} total employee categories</span>
            </div>
            <div className="settingsHeaderActions">
              <label className="settingsSearchField">
                <Search size={16} />
                <input
                  type="search"
                  value={employeeCategorySearch}
                  onChange={(event) => onEmployeeCategorySearchChange(event.target.value)}
                  placeholder="Search employee categories..."
                />
              </label>
              <button className="schedulePrimaryButton" type="button" onClick={onOpenEmployeeCategoryModal}>
                <Plus size={16} />
                Add Employee Category
              </button>
            </div>
          </div>

          <div className="nativeTableWrap">
            <table className="inventoryTable">
              <thead>
                <tr>
                    <th>Category Name</th>
                    <th>Status</th>
                    <th>Description</th>
                    <th className="actionsCol">Actions</th>
                  </tr>
                  <tr>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search name..." value={categoryColSearch.name} onChange={e => setCategoryColSearch({...categoryColSearch, name: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <input type="text" placeholder="Search description..." value={categoryColSearch.description} onChange={e => setCategoryColSearch({...categoryColSearch, description: e.target.value})} style={{ width: '100%', padding: '6px 10px', borderRadius: '4px', border: '1px solid #cbd5e1', fontSize: '0.8rem' }} />
                    </th>
                    <th style={{ padding: '8px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployeeCategories.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.95rem' }}>
                        <div className="emptyState settingsEmptyState">No employee categories match the current search.</div>
                      </td>
                    </tr>
                  ) : (
                    filteredEmployeeCategories.map((category) => (
                      <tr key={category.id} className="nativeTableRow">
                        <td>
                        <div className="settingsCategoryNameCell">
                          <span className="settingsCategoryIcon">
                            <ListTree size={16} />
                          </span>
                          <strong>{category.name}</strong>
                        </div>
                      </td>
                      <td>
                        <span className={`settingsStatusPill ${category.is_active ? "active" : "inactive"}`}>
                          {category.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <span className="settingsCategoryDescription">
                          {category.description || "No description"}
                        </span>
                      </td>
                      <td className="inventoryActions">
                        <div className="settingsCategoryActions" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start', alignItems: 'center' }}>
                          <button
                            className={`settingsToggleButton ${category.is_active ? "inactive" : "active"}`}
                            type="button"
                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '4px' }}
                            onClick={() => onToggleEmployeeCategory(category)}
                          >
                            {category.is_active ? "Set Inactive" : "Set Active"}
                          </button>
                          <button
                            className="iconActionBtn"
                            title="Edit"
                            type="button"
                            onClick={() => onEditEmployeeCategory(category)}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="iconActionBtn deleteBtn"
                            title="Delete"
                            type="button"
                            onClick={() => onDeleteEmployeeCategory(category)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                </tbody>
              </table>
            </div>
        </section>
      ) : null}

      {teamMemberModalOpen ? (
        <div className="assetModalBackdrop open" role="presentation" onClick={onCloseTeamMemberModal}>
          <section
            className="panel assetModal open settingsModal"
            role="dialog"
            aria-modal="true"
            aria-label={teamMemberDraft.id ? "Edit Team Member" : "Add Team Member"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panelHeader">
              <h2>{teamMemberDraft.id ? "Edit Team Member" : "Add Team Member"}</h2>
              <div className="assetModalActions">
                <button type="button" onClick={onCloseTeamMemberModal}>
                  Close
                </button>
              </div>
            </div>
            <div className="scheduleModalGrid">
              <label className="assetField">
                <span>Member Name</span>
                <input
                  type="text"
                  value={teamMemberDraft.name}
                  onChange={(event) => onTeamMemberDraftChange("name", event.target.value)}
                  placeholder="Enter member name"
                />
              </label>
              <label className="assetField">
                <span>Serial Number</span>
                <input
                  type="text"
                  value={teamMemberDraft.serial_number}
                  onChange={(event) => onTeamMemberDraftChange("serial_number", event.target.value)}
                  placeholder="Enter serial number"
                />
              </label>
              <label className="assetField">
                <span>Employee Category</span>
                <select
                  value={teamMemberDraft.employee_category}
                  onChange={(event) => onTeamMemberDraftChange("employee_category", event.target.value)}
                >
                  <option value="">Select employee category</option>
                  {employeeCategoryOptions.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="assetField">
                <span>Designation</span>
                <input
                  type="text"
                  value={teamMemberDraft.designation}
                  onChange={(event) => onTeamMemberDraftChange("designation", event.target.value)}
                  placeholder="Enter designation"
                />
              </label>
            </div>
            <div className="teamMemberFooter">
              <label className="teamCheckbox">
                <input
                  type="checkbox"
                  checked={teamMemberDraft.is_active}
                  onChange={(event) => onTeamMemberDraftChange("is_active", event.target.checked)}
                />
                <span>Active</span>
              </label>
            </div>
            <div className="assetFormActions">
              <button className="ghostAction" type="button" onClick={onCloseTeamMemberModal}>
                Cancel
              </button>
              <button className="primaryAction" type="button" onClick={onSaveTeamMember}>
                {teamMemberDraft.id ? "Update Member" : "Save Member"}
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {employeeCategoryModalOpen ? (
        <div className="assetModalBackdrop open" role="presentation" onClick={onCloseEmployeeCategoryModal}>
          <section
            className="panel assetModal open settingsModal"
            role="dialog"
            aria-modal="true"
            aria-label={employeeCategoryDraft.id ? "Edit Employee Category" : "Add Employee Category"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panelHeader">
              <h2>{employeeCategoryDraft.id ? "Edit Employee Category" : "Add Employee Category"}</h2>
              <div className="assetModalActions">
                <button type="button" onClick={onCloseEmployeeCategoryModal}>
                  Close
                </button>
              </div>
            </div>
            <div className="scheduleModalGrid">
              <label className="assetField">
                <span>Category Name</span>
                <input
                  type="text"
                  value={employeeCategoryDraft.name}
                  onChange={(event) => onEmployeeCategoryDraftChange("name", event.target.value)}
                  placeholder="Enter employee category"
                />
              </label>
              <label className="assetField">
                <span>Description</span>
                <input
                  type="text"
                  value={employeeCategoryDraft.description}
                  onChange={(event) => onEmployeeCategoryDraftChange("description", event.target.value)}
                  placeholder="Describe this employee category"
                />
              </label>
            </div>
            <div className="teamMemberFooter">
              <label className="teamCheckbox">
                <input
                  type="checkbox"
                  checked={employeeCategoryDraft.is_active}
                  onChange={(event) => onEmployeeCategoryDraftChange("is_active", event.target.checked)}
                />
                <span>Active</span>
              </label>
            </div>
            <div className="assetFormActions">
              <button className="ghostAction" type="button" onClick={onCloseEmployeeCategoryModal}>
                Cancel
              </button>
              <button className="primaryAction" type="button" onClick={onSaveEmployeeCategory}>
                {employeeCategoryDraft.id ? "Update Category" : "Save Category"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

