export default function DashboardTeamList({ filteredTeamSnapshot, setSearch, setActionMessage }) {
  if (!filteredTeamSnapshot || filteredTeamSnapshot.length === 0) {
    return <div className="teamList empty">No active team workload.</div>;
  }

  return (
    <div className="teamList">
      {filteredTeamSnapshot.map(([owner, count]) => (
        <button
          key={owner}
          className="teamRow"
          type="button"
          onClick={() => {
            setSearch(owner === "Unassigned" ? "" : owner);
            setActionMessage(`${owner} workload loaded.`);
          }}
        >
          <strong>{owner}</strong>
          <span>{count} active tasks</span>
        </button>
      ))}
    </div>
  );
}
