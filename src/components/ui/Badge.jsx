// The small pill label used across the app for roles, statuses and categories.
//
// Before 20/08 this was drawn inline in roughly 60 places — 57 with Tailwind classes and
// 6 with inline styles. (CODE-GUIDE §8.3 said 101; that count matched
// `text-[10|11]px font-bold`, which also catches section labels, table headers and avatar
// circles. Corrected here after counting only elements that actually render a pill.)
//
// `tone` names the MEANING, not the colour. Callers say "danger", not "red", so the
// palette lives in this file instead of in sixty hex literals — and a future change to
// what "warning" looks like is one edit.
//
// ⚠️ Every tone is a SOFT pill: tinted background, matching text, matching border. The one
// exception in the old code was AdminUserManagement's ADMIN chip, drawn as solid brand red
// on white text. It is folded into `brand` here, which is softer. Losing a little of its
// shout is the cost of having one badge; admin still reads as the only non-grey role in
// the table, which is what that chip was for.
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
  // An unknown tone still renders a neutral pill rather than an unstyled one. Tones often
  // come from server data (a project status, a role name), so "unknown" is a data case,
  // not a typo — and a badge with no background reads as a broken render.
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
