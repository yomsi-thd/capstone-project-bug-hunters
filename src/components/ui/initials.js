// A name's initials, for an avatar circle. One implementation, because hand-written
// copies had drifted into five variants that disagreed on letter count and casing.
//
// `max` is a parameter because one and two letters are both real choices: the 34px
// circles in Header and CommentItem don't fit two.

/**
 * @param {string} name
 * @param {{ max?: number }} [options]
 * @returns {string} Uppercased initials, or "" when there is nothing to take. The
 *   fallback character belongs to the screen, so callers supply their own.
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
