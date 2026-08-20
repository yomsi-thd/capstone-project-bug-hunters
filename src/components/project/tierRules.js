// Validation for Support Levels, kept in a plain-function module next to videoUrl.js
// and for the same two reasons: the rules can be tested without rendering the five-step
// wizard, and CreateProject and EditProject share ONE implementation instead of each
// checking a slightly different set.
//
// The backend runs the same rules in projectService — this copy exists so a creator
// learns them from the form rather than from a rejected request, not because the server
// side is optional. UI is not a security boundary.
//
// "Support Level" on screen, `tier` in the code and the database (`project_tiers`,
// `tier_id`). The wording can still change; the column names should not.

export const MAX_TIERS = 5;

/**
 * A level from either form (or the API) -> the one shape everything else here uses.
 *
 * Both forms hold the amount as a string, the API returns a number, and blank bullet
 * rows are normal while the creator is still typing — so all three are absorbed here.
 */
export function normaliseTier(tier = {}) {
  const raw = tier ?? {};

  return {
    name: String(raw.name ?? "").trim(),
    // NaN rather than 0 for junk: 0 reads as a deliberate "free" level and would slip
    // past a check written as `!amount`, while NaN fails every comparison below.
    minAmount: Number(raw.minAmount ?? raw.min_amount ?? raw.amount),
    bullets: (Array.isArray(raw.bullets) ? raw.bullets : [])
      .map((line) => String(line ?? "").trim())
      .filter(Boolean),
  };
}

/**
 * The whole list at once -> the first problem as a sentence, or null when it is fine.
 *
 * One message at a time, because that is what both forms display. An empty list is
 * valid: support levels are optional.
 */
export function validateTiers(tiers) {
  const list = (Array.isArray(tiers) ? tiers : []).map(normaliseTier);

  if (list.length > MAX_TIERS) {
    return `A project can have at most ${MAX_TIERS} support levels.`;
  }

  const seen = new Set();

  for (const tier of list) {
    if (!tier.name) {
      return "A level needs a name.";
    }

    if (tier.name.length > 100) {
      return "A level name must be 100 characters or fewer.";
    }

    // Integer, not just positive: min_amount is an INTEGER column, so 25.5 would be
    // rounded by Postgres into a number the creator never typed.
    if (!Number.isInteger(tier.minAmount) || tier.minAmount <= 0) {
      return "A level needs a minimum above 0 CC — a whole number of Class Coins.";
    }

    if (tier.bullets.length === 0) {
      return "Add at least one line describing what this level signals.";
    }

    if (seen.has(tier.minAmount)) {
      return `Another level already starts at ${tier.minAmount} CC.`;
    }

    seen.add(tier.minAmount);
  }

  return null;
}

/**
 * Is this amount enough for the selected level? True when nothing is selected —
 * "No level — just support" has no floor.
 *
 * The boundary matters: a level advertised as "250 CC or more" must accept exactly 250.
 */
export function meetsMinimum(amount, tier) {
  if (!tier) return true;

  const min = Number(tier.minAmount ?? tier.min_amount);

  if (!Number.isFinite(min)) return true;

  return Number(amount) >= min;
}
