import { TAG_COLORS } from "../../mock";

export default function Tag({ label }) {
  // Not built on ui/Badge, and the colours stay inline.
  //
  // Every other chip picks from a fixed set of tones. This one is coloured by data:
  // TAG_COLORS maps a category to its own pair, with a grey fallback for unknown ones.
  // Tailwind can only generate classes for colours it finds in the source, so a class
  // here would come out unstyled for exactly the categories the fallback is for.
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
