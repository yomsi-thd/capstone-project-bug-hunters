// The small pill label used across the app for roles, statuses and categories.
//
// `tone` names the meaning rather than the colour: callers say "danger", not "red", so
// the palette lives here instead of in dozens of hex literals and changing what
// "warning" looks like is one edit.
//
// Every tone is a soft pill, with a tinted background, matching text and matching
// border. Admin is the only non-grey role in the table, which is all its old solid-red
// chip was there to say.
const TONES = {
  neutral: "bg-neutral-100 text-neutral-600 border-neutral-200",
  success: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  brand: "bg-brand/8 text-brand border-brand/20",
};

const SIZES = {
  sm: "text-[10px] px-2 py-0.5",
  md: "text-[11px] px-2.5 py-1",
};

export default function Badge({ tone = "neutral", size = "md", className = "", children }) {
  // An unknown tone renders a neutral pill rather than an unstyled one. Tones often come
  // from server data, so unknown is a data case rather than a typo, and a badge with no
  // background reads as a broken render.
  const toneClass = TONES[tone] ?? TONES.neutral;
  const sizeClass = SIZES[size] ?? SIZES.md;

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border font-bold tracking-[0.04em] ${toneClass} ${sizeClass} ${className}`}
    >
      {children}
    </span>
  );
}
