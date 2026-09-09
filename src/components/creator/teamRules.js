/**
 * The rules for one row of a project's team list, kept out of the two forms that collect
 * it so both apply the same ones and so they can be tested without rendering a wizard.
 *
 * What is deliberately NOT here: any check that the address belongs to a real account.
 * Telling a creator "no such user" would turn this field into a way of discovering which
 * addresses are registered, which is why the team list is typed rather than picked from a
 * list of accounts in the first place. A mistyped address simply matches nobody.
 */

// Deliberately loose. It catches a missing @ or a missing dot, which is the mistake worth
// catching, and refuses nothing a real address could look like.
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Returns a sentence to show the creator, or null when the row is fine.
 *
 * The email stays optional. A member with no account has nothing to stop, so demanding an
 * address would only teach people to invent one.
 */
export function validateTeamMember({ name, email } = {}) {
  if (!String(name ?? "").trim()) {
    return "Enter the member's name.";
  }

  const address = String(email ?? "").trim();

  if (address && !EMAIL_RE.test(address)) {
    return "Enter a valid email address, or leave it blank.";
  }

  return null;
}
