import { initials } from "./initials";

// The round initials circle. Eight places drew one by hand before 20/08, including two
// full local components (Header's `Avatar` and CommentItem's `AuthorAvatar`).
//
// ⚠️ The circles were never uniform, and this component deliberately does NOT make them
// so. They come in five diameters (30 · 32 · 34 · 36 · 38px) and three colour schemes —
// grey on the public pages, blue for team members in the approvals panel, brand red for
// creator requests. Flattening that would repaint two of Khoi's screens for no reason
// beyond tidiness. What is actually shared is the part that was drifting: how the initials
// are computed and how the circle is built.
//
// `tone` names the meaning the same way Badge does, so a caller never writes a hex here.
const TONES = {
  neutral: "bg-neutral-200 border border-neutral-300 text-neutral-600",
  blue: "bg-blue-600 text-white",
  brand: "bg-brand text-white",
};

/**
 * @param {object} props
 * @param {string} props.name
 * @param {number} [props.size]     diameter in px — a per-site design value, not a scale
 * @param {number} [props.fontSize] px; derived from size when omitted
 * @param {number} [props.max]      how many letters (1 for the small circles)
 * @param {string} [props.fallback] shown when the name yields nothing — "U", "?"
 */
export default function Avatar({
  name,
  size = 34,
  fontSize,
  max = 2,
  tone = "neutral",
  fallback = "",
  className = "",
}) {
  // initials() returns "" when there is nothing to take, so each screen keeps its own
  // fallback character: Header shows "U", ProjectDetail shows "?".
  const text = initials(name, { max }) || fallback;

  // 0.35 reproduces four of the five sizes in use exactly (30→11, 32→11, 34→12, 38→13).
  // The fifth, 36→12, is passed explicitly by its one caller rather than bending the
  // ratio for it.
  const derivedFontSize = fontSize ?? Math.round(size * 0.35);

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${TONES[tone] ?? TONES.neutral} ${className}`}
      // Diameter and text size are runtime values here, which is one of the three cases
      // where inline style is still correct (CODE-GUIDE §7.1).
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${derivedFontSize}px` }}
    >
      {text}
    </div>
  );
}
