export default function FundingBar({ percent }) {
  const clamped = Math.min(percent, 100);
  return (
    <div style={{ marginTop: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#cc0000" }}>{percent}%</span>
        <span style={{ fontSize: "11px", color: "#888" }}>Funded</span>
      </div>
      <div style={{ height: "3px", background: "#e5e5e5", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${clamped}%`, background: "#cc0000", borderRadius: "2px" }} />
      </div>
    </div>
  );
}
