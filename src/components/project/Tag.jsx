import { TAG_COLORS } from "../../mock";

export default function Tag({ label }) {
  // ⚠️ Deliberately NOT built on ui/Badge, and the colours stay inline.
  //
  // Every other chip in the app picks from a fixed set of tones. This one is coloured by
  // DATA: TAG_COLORS maps a project's category to its own pair, and an unknown category
  // falls back to dark grey rather than breaking. Tailwind cannot generate a class for a
  // colour it has never seen in the source, so a class here would silently produce no
  // colour for exactly the categories the fallback exists for.
  const colors = TAG_COLORS[label] || { bg: "#333", text: "#fff" };
  return (
    <span
      className="inline-block rounded-sm px-2 py-0.5 text-[10px] font-bold tracking-[0.1em]"
      style={{ background: colors.bg, color: colors.text }}
    >
      {label}
    </span>
  );
}
