import { initials } from "./initials";

// The round initials circle used across the app.
//
// It does not force one look. The circles come in five diameters and three colour
// schemes: grey on the public pages, blue for team members in the approvals panel, brand
// red for creator requests. What is shared is the part that kept drifting, namely how
// the initials are worked out and how the circle is built.
//
// `tone` names the meaning the way Badge does, so no caller writes a hex here.
const TONES = {
  neutral: "bg-neutral-200 border border-neutral-300 text-neutral-600",
  blue: "bg-blue-600 text-white",
  brand: "bg-brand text-white",
};

/**
 * @param {object} props
 * @param {string} props.name
 * @param {number} [props.size]     diameter in px, a per-site design value
 * @param {number} [props.fontSize] px; derived from size when omitted
 * @param {number} [props.max]      how many letters (1 for the small circles)
 * @param {string} [props.fallback] shown when the name yields nothing, e.g. "U" or "?"
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
  // initials() returns "" when there is nothing to take, so each screen supplies its
  // own fallback character.
  const text = initials(name, { max }) || fallback;

  // 0.35 reproduces four of the five sizes in use exactly. The fifth is passed
  // explicitly by its one caller rather than bending the ratio to fit it.
  const derivedFontSize = fontSize ?? Math.round(size * 0.35);

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-bold ${TONES[tone] ?? TONES.neutral} ${className}`}
      // Diameter and text size are runtime values, so inline style is right here.
      style={{ width: `${size}px`, height: `${size}px`, fontSize: `${derivedFontSize}px` }}
    >
      {text}
    </div>
  );
}
