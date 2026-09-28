import { Folder, ChevronRight, User, Shield, Search } from "lucide-react";
import "./AdminWorkspace.css";

export default function AdminWorkspace({
  adminSection,
  setAdminSection,
  authUser,
  canAccessUserManagement,
  profileDraft,
  setProfileDraft,
  passwordDraft,
  setPasswordDraft,
  handleSaveProfile,
  handleChangePassword,
  managedUserDraft,
  setManagedUserDraft,
  handleCreateManagedUser,
  handleLoadManagedUsers,
  managedUsers,
  editingManagedUserId,
  managedUserEditDraft,
  setManagedUserEditDraft,
  handleToggleManagedUser,
  handleSaveManagedUser,
  cancelEditManagedUser,
  startEditManagedUser,
  roles,
  userRoleDrafts,
  toggleManagedUserRoleDraft,
  handleSaveManagedUserRoles,
  handleDeleteManagedUser,
  setActiveView,
  handleLogout,
  authLoading,
  editingRoleId,
  roleEditorTab,
  setRoleEditorTab,
  roleDraft,
  setRoleDraft,
  rolePermissionSearch,
  setRolePermissionSearch,
  isAllVisibleSelected,
  toggleSelectAllVisible,
  filteredRoleTree,
  roleTreeOpen,
  setRoleTreeOpen,
  isSubtypeSelected,
  toggleModulePermissions,
  toggleSubtypePermissions,
  isSubtypeOpen,
  setRoleSubtypeOpen,
  getSubtypeActions,
  isRolePermissionChecked,
  toggleRolePermission,
  handleCreateRole,
  handleLoadRoles,
  setEditingRoleId,
  updateAdminRole,
  handleDeleteRole
}) {
  return (
    <section className="panel sidePanel adminPanel adminWorkspaceContainer">
      {adminSection === "Profile" ? (
        <>
          <div className="adminSectionHeader">
            <h2>Profile</h2>
            <p>Manage your account details and credentials</p>
          </div>
          <div className="premiumFormGrid">
            <div className="floatingLabelInput">
              <input
                type="text"
                placeholder=" "
                value={profileDraft.first_name}
                onChange={(event) => setProfileDraft((current) => ({ ...current, first_name: event.target.value }))}
              />
              <label>First Name</label>
            </div>
            <div className="floatingLabelInput">
              <input
                type="text"
                placeholder=" "
                value={profileDraft.last_name}
                onChange={(event) => setProfileDraft((current) => ({ ...current, last_name: event.target.value }))}
              />
              <label>Last Name</label>
            </div>
            <div className="floatingLabelInput premiumFormFull">
              <input
                type="email"
                placeholder=" "
                value={profileDraft.email}
                onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
              />
              <label>Email</label>
            </div>
            <div className="buttonRow adminActionRow premiumFormFull">
              <button type="button" onClick={handleSaveProfile} className="primaryButton">
                Save Profile
              </button>
            </div>
            <div className="floatingLabelInput">
              <input
                type="password"
                placeholder=" "
                value={passwordDraft.current_password}
                onChange={(event) => setPasswordDraft((current) => ({ ...current, current_password: event.target.value }))}
              />
              <label>Current Password</label>
            </div>
            <div className="floatingLabelInput">
              <input
                type="password"
                placeholder=" "
                value={passwordDraft.new_password}
                onChange={(event) => setPasswordDraft((current) => ({ ...current, new_password: event.target.value }))}
              />
              <label>New Password</label>
            </div>
            <div className="buttonRow adminActionRow premiumFormFull">
              <button type="button" onClick={handleChangePassword} className="primaryButton">
                Change Password
              </button>
            </div>
          </div>
        </>
      ) : null}

      {adminSection === "User Management" && canAccessUserManagement ? (
        <div className="userManagementContainer">
          <div className="adminSectionHeader">
            <h2>User Management</h2>
            <p>Create users and assign access permissions</p>
          </div>
          <div className="premiumFormGrid ">
            <div className="floatingLabelInput">
              <input
                type="text"
                placeholder=" "
                value={managedUserDraft.username}
                onChange={(event) => setManagedUserDraft((current) => ({ ...current, username: event.target.value }))}
              />
              <label>Username</label>
            </div>
            <div className="floatingLabelInput">
              <input
                type="password"
                placeholder=" "
                value={managedUserDraft.password}
                onChange={(event) => setManagedUserDraft((current) => ({ ...current, password: event.target.value }))}
              />
              <label>Password</label>
            </div>
            <div className="floatingLabelInput">
              <input
                type="text"
                placeholder=" "
                value={managedUserDraft.first_name}
                onChange={(event) => setManagedUserDraft((current) => ({ ...current, first_name: event.target.value }))}
              />
              <label>First Name</label>
            </div>
            <div className="floatingLabelInput">
              <input
                type="text"
                placeholder=" "
                value={managedUserDraft.last_name}
                onChange={(event) => setManagedUserDraft((current) => ({ ...current, last_name: event.target.value }))}
              />
              <label>Last Name</label>
            </div>
            <div className="floatingLabelInput premiumFormFull">
              <input
                type="email"
                placeholder=" "
                value={managedUserDraft.email}
                onChange={(event) => setManagedUserDraft((current) => ({ ...current, email: event.target.value }))}
              />
              <label>Email</label>
            </div>
            <div className="premiumFormFull">
              <span style={{ fontSize: '0.85rem', color: '#a0aec0', marginBottom: '8px', display: 'block' }}>Roles (Multi-select)</span>
              <details className="customMultiSelect">
                <summary className={`customMultiSelectTrigger ${(managedUserDraft.assigned_role_ids || []).length > 0 ? 'active' : ''}`}>
                  {(managedUserDraft.assigned_role_ids || []).length > 0
                    ? roles
                      .filter((role) => (managedUserDraft.assigned_role_ids || []).includes(role.id))
                      .map((role) => (
                        <span key={role.id} className="roleChip">{role.name}</span>
                      ))
                    : <span style={{ color: '#a0aec0' }}>Select Roles...</span>}
                </summary>
                <div className="customMultiSelectMenu">
                  {roles.map((role) => {
                    const checked = (managedUserDraft.assigned_role_ids || []).includes(role.id);
                    return (
                      <label key={role.id} className={`customMultiSelectOption ${checked ? 'selected' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          style={{ display: 'none' }}
                          onChange={(event) => {
                            setManagedUserDraft((current) => {
                              const currentIds = current.assigned_role_ids || [];
                              const nextIds = event.target.checked
                                ? [...new Set([...currentIds, role.id])]
                                : currentIds.filter((id) => id !== role.id);
                              return { ...current, assigned_role_ids: nextIds };
                            });
                          }}
                        />
                        <div style={{ width: '18px', height: '18px', border: '2px solid #cbd5e0', borderRadius: '4px', background: checked ? '#3182ce' : 'white', display: 'grid', placeItems: 'center' }}>
                          {checked && <div style={{ width: '10px', height: '10px', background: 'white', borderRadius: '2px' }}></div>}
                        </div>
                        {role.name}
                      </label>
                    );
                  })}
                </div>
              </details>
            </div>
            <div className="buttonRow adminActionRow premiumFormFull">
              <button type="button" onClick={handleCreateManagedUser} className="primaryButton">
                Create User
              </button>
              <button type="button" onClick={handleLoadManagedUsers} className="secondaryButton">
                Refresh List
              </button>
            </div>
          </div>

          <div className="adminUserGrid">
            {managedUsers.map((user) => (
              <div key={user.id} className="adminUserCard">
                <div className="adminUserCardHeader">
                  <h3>{user.username}</h3>
                  <User size={20} color="#a0aec0" />
                </div>

                {editingManagedUserId === user.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="floatingLabelInput">
                      <input
                        type="text"
                        placeholder=" "
                        value={managedUserEditDraft.first_name}
                        onChange={(event) => setManagedUserEditDraft((current) => ({ ...current, first_name: event.target.value }))}
                      />
                      <label>First Name</label>
                    </div>
                    <div className="floatingLabelInput">
                      <input
                        type="text"
                        placeholder=" "
                        value={managedUserEditDraft.last_name}
                        onChange={(event) => setManagedUserEditDraft((current) => ({ ...current, last_name: event.target.value }))}
                      />
                      <label>Last Name</label>
                    </div>
                    <div className="floatingLabelInput">
                      <input
                        type="email"
                        placeholder=" "
                        value={managedUserEditDraft.email}
                        onChange={(event) => setManagedUserEditDraft((current) => ({ ...current, email: event.target.value }))}
                      />
                      <label>Email</label>
                    </div>
                    <div className="floatingLabelInput">
                      <input
                        type="password"
                        placeholder=" "
                        value={managedUserEditDraft.new_password}
                        onChange={(event) => setManagedUserEditDraft((current) => ({ ...current, new_password: event.target.value }))}
                      />
                      <label>New Password</label>
                    </div>
                    <label className="switchLabel" style={{ marginTop: '8px' }}>
                      <input
                        type="checkbox"
                        className="switchInput"
                        checked={managedUserEditDraft.is_superuser}
                        onChange={(event) => setManagedUserEditDraft((current) => ({ ...current, is_superuser: event.target.checked }))}
                      />
                      <div className="switchToggle"></div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Superuser Access</span>
                    </label>
                  </div>
                ) : (
                  <div className="adminUserCardMeta">
                    <div className="metaField">
                      <span className="metaFieldLabel">Name</span>
                      <span className="metaFieldValue">{user.first_name} {user.last_name}</span>
                    </div>

                    <div className="metaField">
                      <span className="metaFieldLabel">Roles</span>
                      <div className="customMultiSelect hoverDropdown" style={{width: 'max-content'}}>
                        <div className="roleChip" style={{cursor: 'pointer', background: '#e2e8f0', color: '#1e293b'}}>
                          {user.is_superuser ? "Superuser" : ((user.assigned_role_ids || []).length > 0 ? `${(user.assigned_role_ids || []).length} Roles ▼` : "No Roles ▼")}
                        </div>
                        <div className="customMultiSelectMenu hoverDropdownContent" style={{left: 0, width: '250px', padding: '12px'}}>
                          <div style={{marginBottom: '12px', fontSize: '0.9rem', fontWeight: 700}}>Manage Roles</div>
                          {roles.map((role) => {
                            const selected = (userRoleDrafts[user.id] || user.assigned_role_ids || []).includes(role.id);
                            return (
                              <label key={`${user.id}-${role.id}`} className={`customMultiSelectOption ${selected ? 'selected' : ''}`} style={{display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px'}}>
                                <input
                                  type="checkbox"
                                  checked={selected}
                                  onChange={(event) => toggleManagedUserRoleDraft(user.id, role.id, event.target.checked)}
                                />
                                <span style={{fontSize: '0.9rem'}}>{role.name}</span>
                              </label>
                            );
                          })}
                          <button type="button" onClick={() => handleSaveManagedUserRoles(user.id)} className="primary" style={{ marginTop: '12px', width: '100%', padding: '8px' }}>
                            Save Roles
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="metaField">
                      <span className="metaFieldLabel">Modules</span>
                      <div className="customMultiSelect hoverDropdown" style={{width: 'max-content'}}>
                        <div className="roleChip" style={{cursor: 'pointer', background: '#e2e8f0', color: '#1e293b'}}>
                          {user.is_superuser ? "All Modules" : ((user.allowed_modules && user.allowed_modules.length > 0) ? `${user.allowed_modules.length} Modules ▼` : "None ▼")}
                        </div>
                        <div className="customMultiSelectMenu hoverDropdownContent" style={{left: 0, width: '200px', padding: '12px'}}>
                          <div style={{marginBottom: '12px', fontSize: '0.9rem', fontWeight: 700}}>Assigned Modules</div>
                          {user.is_superuser ? <div style={{fontSize: '0.85rem', color: '#64748b'}}>Superusers have access to all modules.</div> : (
                            (user.allowed_modules && user.allowed_modules.length > 0) ? user.allowed_modules.map((m) => (
                              <div key={m} style={{padding: '4px 8px', fontSize: '0.9rem', background: '#f1f5f9', marginBottom: '4px', borderRadius: '4px'}}>{m}</div>
                            )) : <div style={{fontSize: '0.85rem', color: '#64748b'}}>No modules assigned.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="adminUserCardActions" style={{display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '16px'}}>
                  <button type="button" className="secondary" onClick={() => handleToggleManagedUser(user, "is_active")} style={{flex: 1}}>
                    {user.is_active ? "Disable" : "Enable"}
                  </button>
                  {editingManagedUserId === user.id ? (
                    <>
                      <button type="button" className="primary" onClick={() => handleSaveManagedUser(user.id)} style={{flex: 1}}>Save</button>
                      <button type="button" className="secondary" onClick={cancelEditManagedUser} style={{flex: 1}}>Cancel</button>
                    </>
                  ) : (
                    <button type="button" className="primary" onClick={() => startEditManagedUser(user)} style={{flex: 1}}>Edit</button>
                  )}
                  <button type="button" className="danger" onClick={() => handleDeleteManagedUser(user)} style={{flex: 1, background: '#ef4444', color: 'white', border: 'none'}}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null
      }

      {
        adminSection === "Roles" ? (
          <>
            <div className="adminSectionHeader">
              <h2>{editingRoleId ? "Edit Role" : "Create Role"}</h2>
              <p>Define permissions and access levels across modules</p>
            </div>

            <div className="roleEditorPanel">
              <div className="roleEditorTabs" style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '2px solid #edf2f7', paddingBottom: '8px' }}>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 600, color: roleEditorTab === "details" ? '#3182ce' : '#a0aec0', borderBottom: roleEditorTab === "details" ? '2px solid #3182ce' : 'none', paddingBottom: '8px', marginBottom: '-10px' }}
                  onClick={() => setRoleEditorTab("details")}
                >
                  Role Details
                </button>
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', fontSize: '1.1rem', fontWeight: 600, color: roleEditorTab === "permissions" ? '#3182ce' : '#a0aec0', borderBottom: roleEditorTab === "permissions" ? '2px solid #3182ce' : 'none', paddingBottom: '8px', marginBottom: '-10px' }}
                  onClick={() => setRoleEditorTab("permissions")}
                >
                  Permissions Matrix
                </button>
              </div>

              {roleEditorTab === "details" ? (
                <div className="premiumFormGrid">
                  <div className="floatingLabelInput">
                    <input
                      type="text"
                      placeholder=" "
                      value={roleDraft.name}
                      onChange={(event) => setRoleDraft((current) => ({ ...current, name: event.target.value }))}
                    />
                    <label>Role Name</label>
                  </div>
                  <div className="floatingLabelInput">
                    <input
                      type="text"
                      placeholder=" "
                      value={roleDraft.description}
                      onChange={(event) => setRoleDraft((current) => ({ ...current, description: event.target.value }))}
                    />
                    <label>Description</label>
                  </div>
                </div>
              ) : null}

              {roleEditorTab === "permissions" ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="floatingLabelInput" style={{ width: '300px' }}>
                    <input
                      type="text"
                      placeholder=" "
                      value={rolePermissionSearch}
                      onChange={(event) => setRolePermissionSearch(event.target.value)}
                    />
                    <label>Search permissions...</label>
                  </div>

                  <label className="switchLabel" style={{ background: '#f8fafc', padding: '12px 20px', borderRadius: '8px', width: 'fit-content', border: '1px solid #e2e8f0' }}>
                    <input
                      type="checkbox"
                      className="switchInput"
                      checked={isAllVisibleSelected}
                      onChange={(event) => toggleSelectAllVisible(event.target.checked)}
                    />
                    <div className="switchToggle"></div>
                    <span style={{ fontWeight: 700, color: '#2d3748' }}>Select All Listed Permissions</span>
                  </label>

                  <div className="premiumRoleTree">
                    {filteredRoleTree.map(({ moduleDefinition, visibleSubtypes }) => {
                      if (visibleSubtypes.length === 0) return null;
                      const isOpen = roleTreeOpen[moduleDefinition.key] !== false;
                      const moduleChecked = visibleSubtypes.every((subtype) =>
                        isSubtypeSelected(moduleDefinition.key, subtype),
                      );

                      return (
                        <div key={moduleDefinition.key} className="premiumRoleModule">
                          <div className="premiumRoleHeader">
                            <button
                              type="button"
                              style={{ background: 'none', border: 'none', padding: '4px', cursor: 'pointer', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                              onClick={() => setRoleTreeOpen((current) => ({ ...current, [moduleDefinition.key]: !isOpen }))}
                            >
                              <ChevronRight size={18} color="#718096" />
                            </button>

                            <label className="switchLabel" style={{ marginLeft: '12px' }} onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                className="switchInput"
                                checked={moduleChecked}
                                onChange={(event) => toggleModulePermissions(moduleDefinition.key, event.target.checked)}
                              />
                              <div className="switchToggle"></div>
                            </label>

                            <span className="premiumRoleTitle">
                              <Folder size={18} color="#4299e1" />
                              {moduleDefinition.label}
                            </span>
                          </div>

                          {isOpen ? (
                            <div className="premiumSubtypeList">
                              {visibleSubtypes.map((subtype) => {
                                const subtypeChecked = isSubtypeSelected(moduleDefinition.key, subtype);
                                const subIsOpen = isSubtypeOpen(moduleDefinition.key, subtype);

                                return (
                                  <div key={`${moduleDefinition.key}-${subtype}`} className="premiumSubtypeRow">
                                    <div className="premiumSubtypeRowHeader">
                                      <button
                                        type="button"
                                        style={{ background: 'none', border: 'none', padding: '0', cursor: 'pointer', transform: subIsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }}
                                        onClick={() => setRoleSubtypeOpen((current) => ({
                                          ...current,
                                          [`${moduleDefinition.key}:${subtype}`]: !subIsOpen,
                                        }))}
                                      >
                                        <ChevronRight size={16} color="#a0aec0" />
                                      </button>

                                      <label className="switchLabel">
                                        <input
                                          type="checkbox"
                                          className="switchInput"
                                          checked={subtypeChecked}
                                          onChange={(event) => toggleSubtypePermissions(moduleDefinition.key, subtype, event.target.checked)}
                                        />
                                        <div className="switchToggle" style={{ width: '36px', height: '20px' }}></div>
                                      </label>

                                      <span style={{ textTransform: 'capitalize' }}>{subtype.replaceAll("_", " ")}</span>
                                    </div>

                                    {subIsOpen ? (
                                      <div className="premiumActionList">
                                        {getSubtypeActions(subtype).map((action) => {
                                          const isChecked = isRolePermissionChecked(moduleDefinition.key, subtype, action);
                                          return (
                                            <label key={`${moduleDefinition.key}-${subtype}-${action}`} className={`premiumActionChip ${isChecked ? 'active' : ''}`}>
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => toggleRolePermission(moduleDefinition.key, subtype, action)}
                                              />
                                              {action.replaceAll("_", " ")}
                                            </label>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div className="buttonRow adminActionRow" style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #edf2f7' }}>
                <button type="button" onClick={handleCreateRole} className="primaryButton">
                  {editingRoleId ? "Update Role" : "Save Role"}
                </button>
                <button type="button" onClick={handleLoadRoles} className="secondaryButton">
                  Refresh
                </button>
                {editingRoleId ? (
                  <button
                    type="button"
                    style={{ background: 'transparent', color: '#c53030', padding: '10px 24px', borderRadius: '8px', border: '1px solid #feb2b2', fontWeight: 600 }}
                    onClick={() => {
                      setEditingRoleId(null);
                      setRoleDraft({ name: "", description: "", permissions: {} });
                    }}
                  >
                    Cancel Edit
                  </button>
                ) : null}
              </div>
            </div>

            <div className="adminUserGrid" style={{ marginTop: '40px' }}>
              {roles.map((role) => (
                <div key={role.id} className="adminUserCard">
                  <div className="adminUserCardHeader">
                    <h3>{role.name}</h3>
                    <Shield size={20} color="#3182ce" />
                  </div>
                  <div className="adminUserCardMeta">
                    <p style={{ margin: '0 0 12px 0' }}>{role.description || "No description provided."}</p>
                    <div className="roleChipGroup">
                      <span className="roleChip" style={{ background: '#e6fffa', color: '#319795', borderColor: '#b2f5ea' }}>{Object.keys(role.permissions || {}).length} Permissions</span>
                      {role.is_active ? <span className="roleChip" style={{ background: '#ebf4ff', color: '#3182ce', borderColor: '#bee3f8' }}>Active</span> : <span className="roleChip" style={{ background: '#fff5f5', color: '#c53030', borderColor: '#fed7d7' }}>Disabled</span>}
                    </div>
                    <span style={{ marginTop: '12px', fontSize: '0.8rem', color: '#a0aec0' }}>
                      Modules: {(role.allowed_modules || []).join(", ") || "none"}
                    </span>
                  </div>

                  <div className="adminUserCardActions">
                    <button
                      type="button"
                      className="primary"
                      onClick={() => {
                        setEditingRoleId(role.id);
                        setRoleEditorTab("permissions");
                        setRolePermissionSearch("");
                        setRoleDraft({
                          name: role.name || "",
                          description: role.description || "",
                          permissions: role.permissions || {},
                        });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={async () => {
                        await updateAdminRole(role.id, { is_active: !role.is_active });
                        await handleLoadRoles();
                      }}
                    >
                      {role.is_active ? "Disable" : "Enable"}
                    </button>
                    <button type="button" className="danger" onClick={() => handleDeleteRole(role)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : null
      }

      {
        adminSection === "Logout" ? (
          <div style={{ background: 'white', padding: '32px', borderRadius: '16px', border: '1px solid #e2e8f0', maxWidth: '400px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '1.5rem', color: '#1a365d' }}>Logout</h2>
            <p style={{ color: '#4a5568', marginBottom: '24px' }}>Sign out of the Operations Console securely.</p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={authLoading}
              className="dangerButton"
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}
            >
              {authLoading ? "Signing out..." : "Confirm Logout"}
            </button>
          </div>
        ) : null
      }
    </section >
  );
}
