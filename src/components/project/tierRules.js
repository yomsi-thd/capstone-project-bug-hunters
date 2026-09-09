// Validation for Support Levels. Kept as plain functions in their own module so the
// rules can be tested without rendering the five-step wizard, and so CreateProject and
// EditProject share one implementation rather than each checking a slightly different
// set.
//
// The backend runs the same rules. This copy is here so a creator learns them from the
// form instead of from a rejected request; it is not the security boundary.
//
// "Support Level" on screen, `tier` in the code and in the columns.

import { MAX_CONTRIBUTION } from "./investmentRules";

export const MAX_TIERS = 5;

/**
 * A level from either form, or from the API, into the one shape the rules below use.
 *
 * The forms hold the amount as a string, the API returns a number, and blank bullet rows
 * are normal while the creator is still typing.
 */
export function normaliseTier(tier = {}) {
  const raw = tier ?? {};

  return {
    name: String(raw.name ?? "").trim(),
    // Junk becomes NaN rather than 0, since 0 reads as a deliberate free level and
    // would slip past a `!amount` check. NaN fails every comparison below.
    minAmount: Number(raw.minAmount ?? raw.min_amount ?? raw.amount),
    bullets: (Array.isArray(raw.bullets) ? raw.bullets : [])
      .map((line) => String(line ?? "").trim())
      .filter(Boolean),
  };
}

/**
 * Checks the whole list and returns the first problem as a sentence, or null when there
 * is none. One message at a time, because that is what both forms show. An empty list is
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

    // Integer, not merely positive: min_amount is an INTEGER column, so Postgres would
    // round 25.5 into a number the creator never typed.
    if (!Number.isInteger(tier.minAmount) || tier.minAmount <= 0) {
      return "A level needs a minimum above 0 CC — a whole number of Class Coins.";
    }

    // A level above the contribution cap could never be chosen, since a person gets one
    // contribution of at most MAX_CONTRIBUTION CC. Allowing it would put a button on the
    // project page that leads nowhere. Worded to match TIER_ABOVE_CAP on the backend.
    if (tier.minAmount > MAX_CONTRIBUTION) {
      return "A support level cannot ask for more than 500 CC.";
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
 * Is the amount enough for the chosen level? True when no level is selected, since
 * "just support" has no floor. The boundary is inclusive: a level advertised as
 * "250 CC or more" has to accept exactly 250.
 */
export function meetsMinimum(amount, tier) {
  if (!tier) return true;

  const min = Number(tier.minAmount ?? tier.min_amount);

  if (!Number.isFinite(min)) return true;

  return Number(amount) >= min;
}
