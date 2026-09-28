import { useState } from "react";
import { ChevronRight, ShieldCheck, MoreVertical, Wrench } from "lucide-react";
import StatBlock from "./StatBlock";
import DashboardAlerts from "./DashboardAlerts";
import DashboardMaintenanceTable from "./DashboardMaintenanceTable";
import DashboardTeamList from "./DashboardTeamList";

function statusLabel(status) {
  switch (status) {
    case "assigned":
      return "Assigned";
    case "maintenance":
      return "In Maintenance";
    case "retired":
      return "Retired";
    default:
      return "All";
  }
}

function formatDate(dateString) {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function DashboardOverview({
  activeModuleLabel,
  uptime,
  selectedStatus,
  setSelectedStatus,
  selectedLocation,
  setSelectedLocation,
  clearFilters,
  overview,
  filteredAssets,
  activeView,
  setActiveView,
  setActionMessage,
  assignedTasks,
  scheduleTasks,
  handleStatusFilter,
  alerts,
  setAlertsDismissed,
  handleAlertAction,
  teamSnapshot,
  setSearch,
  maintenanceRows,
  selectedAsset,
  setSelectedAssetId,
  locations,
}) {
  const filteredAlerts = alerts?.filter(alert => 
    filteredAssets?.some(a => a.id === alert.asset_id)
  ) || [];


  const [dashboardSection, setDashboardSection] = useState("maintenance");

  return (
    <>
      <section className="heroPanel dashboardHeroPanel">
        <div className="heroIcon">
          <ShieldCheck size={28} />
        </div>
        <div className="heroBody">
          <div className="heroTitleRow">
            <h1>{activeModuleLabel ? `${activeModuleLabel} Dashboard` : "Fleet Dashboard"}</h1>
            <span className="heroPill">{selectedStatus ? statusLabel(selectedStatus) : "All"}</span>
          </div>
          <p>Real-time tracking and metrics.</p>
          <div className="filterChips">
            <div className="filterDropdownWrap">
              <label htmlFor="dashboardStatusFilter">Filter by Status:</label>
              <select
                id="dashboardStatusFilter"
                className="filterDropdown"
                value={selectedStatus || ""}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="assigned">Assigned</option>
                <option value="maintenance">In Maintenance</option>
                <option value="retired">Retired</option>
              </select>
            </div>

            <div className="filterDropdownWrap">
              <label htmlFor="dashboardLocationFilter">Filter by Location:</label>
              <select
                id="dashboardLocationFilter"
                className="filterDropdown"
                value={selectedLocation || ""}
                onChange={(e) => setSelectedLocation(e.target.value)}
              >
                <option value="">All Locations</option>
                {locations &&
                  locations.map((loc) => (
                    <option key={loc.id || loc.name} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
              </select>
            </div>

            <button className="filterChip" type="button" onClick={clearFilters}>
              Reset Dashboard
            </button>
          </div>
        </div>
        <div className="heroMetric">
          <strong>{uptime}%</strong>
          <span>System Uptime</span>
        </div>
      </section>

      <section className="statsGrid dashboardStatsGrid">
        <StatBlock
          active={selectedStatus === ""}
          label="Total Assets"
          value={filteredAssets?.length || 0}
          note={`${filteredAssets?.length || 0} visible`}
          progress={100}
          onClick={() => {
            setSelectedStatus("");
            setActiveView("Assets");
            setActionMessage("Showing all assets.");
          }}
        />
        <StatBlock
          active={selectedStatus === "assigned" || dashboardSection === "team"}
          label="Active Schedules"
          value={assignedTasks?.length || 0}
          note="Active scheduled tasks"
          progress={(scheduleTasks?.length || 0) > 0 ? 50 : 0}
          onClick={() => {
            setDashboardSection("team");
          }}
        />
        <StatBlock
          active={selectedStatus === "maintenance" || dashboardSection === "maintenance"}
          label="In Maintenance"
          value={filteredAssets?.filter(a => a.status === 'maintenance').length || 0}
          note="Critical repair queue"
          progress={filteredAssets?.length > 0 ? (filteredAssets.filter(a => a.status === 'maintenance').length / filteredAssets.length) * 100 : 0}
          onClick={() => {
            handleStatusFilter("maintenance");
            setDashboardSection("maintenance");
          }}
        />
        <StatBlock
          active={selectedStatus === "retired"}
          label="Retired Equipment"
          value={filteredAssets?.filter(a => a.status === 'retired').length || 0}
          note="Retired fleet items"
          progress={filteredAssets?.length > 0 ? (filteredAssets.filter(a => a.status === 'retired').length / filteredAssets.length) * 100 : 0}
          onClick={() => handleStatusFilter("retired")}
        />
      </section>

      <DashboardAlerts 
        filteredAlerts={filteredAlerts} 
        setAlertsDismissed={setAlertsDismissed} 
        handleAlertAction={handleAlertAction} 
      />

      <section className="dashboardContentGrid">
        <section className="panel largePanel dashboardUpcomingPanel">
          <div className="panelHeader">
            <h2>
              {dashboardSection === "team"
                ? "Current Team Workload"
                : "Upcoming Priority Maintenance"}
            </h2>
            <button
              type="button"
              onClick={() => {
                setDashboardSection(dashboardSection === "team" ? "maintenance" : "team");
              }}
            >
              Show {dashboardSection === "team" ? "Maintenance" : "Team Workload"}
              <ChevronRight size={15} />
            </button>
          </div>

          {dashboardSection === "team" ? (
            <DashboardTeamList 
              filteredTeamSnapshot={teamSnapshot}
              setSearch={setSearch}
              setActionMessage={setActionMessage}
            />
          ) : (
            <DashboardMaintenanceTable 
              filteredMaintenanceRows={maintenanceRows}
              selectedAsset={selectedAsset}
              setSelectedAssetId={setSelectedAssetId}
              setActiveView={setActiveView}
              setActionMessage={setActionMessage}
            />
          )}
        </section>
      </section>
    </>
  );
}
