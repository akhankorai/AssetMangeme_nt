export default function StatBlock({ active, label, note, onClick, progress, value }) {
  return (
    <button className={`statBlock ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <div className="statValue">{value}</div>
      <div className="statLabel">{label}</div>
      {note ? <div className="statNote">{note}</div> : null}
      {progress !== undefined ? (
        <div className="statProgress">
          <div className="statProgressFill" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </button>
  );
}
