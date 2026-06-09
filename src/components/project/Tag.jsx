import { TAG_COLORS } from "../../mock";

export default function Tag({ label }) {
  const colors = TAG_COLORS[label] || { bg: "#333", text: "#fff" };
  return (
    <span
      style={{
        background: colors.bg,
        color: colors.text,
        fontSize: "10px",
        fontWeight: 700,
        letterSpacing: "0.1em",
        padding: "2px 8px",
        borderRadius: "2px",
        display: "inline-block",
      }}
    >
      {label}
    </span>
  );
}
