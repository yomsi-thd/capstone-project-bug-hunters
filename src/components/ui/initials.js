// A name's initials, for an avatar circle.
//
// Before 20/08 this was hand-written in EIGHT places with FIVE variants: three took one
// letter, three took two, and three of them forgot to uppercase. The visible result was
// that "an nguyen" rendered as "an" on the approvals list and the edit form, and as "AN"
// in user management and the creator dashboard. AdminApprovals used two different rules
// in the same file, at lines 152 and 461 — the clearest sign this was copying rather
// than deciding.
//
// `max` is a parameter because one and two letters are both real visual choices: the
// 34px circles in Header and CommentItem do not fit two.

/**
 * @param {string} name
 * @param {{ max?: number }} [options]
 * @returns {string} Uppercased initials, or "" when there is nothing to take.
 *   Callers pick their own fallback character — Header uses "U", ProjectDetail "?" —
 *   because that choice belongs to the screen, not to this function.
 */
export function initials(name, { max = 2 } = {}) {
  const words = String(name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return words
    .slice(0, max)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}
