/**
 * The ONE place in the frontend that knows what an API error looks like.
 *
 * Before this file, 36 places across the pages read `err.response?.data?.message`
 * inline. That is not a style problem — it means the backend's error shape was nailed
 * into 36 files, so changing it was a 36-file edit, and one that fails SILENTLY: every
 * read uses optional chaining, so a wrapped or renamed field renders `undefined`
 * everywhere instead of throwing anywhere.
 *
 * The shape today is:
 *
 *     { "message": "Project not found", "code": "NOT_FOUND", "details": null }
 *
 * `message` is a sentence for a person. `code` is machine-readable. `details` is only
 * ever set for a validation failure, where it is [{ field, message }] naming the field
 * that is wrong.
 *
 * The team deliberately did NOT adopt RFC 9457 (Problem Details), whose value is
 * interoperability between organisations — this API has one consumer. This file is what
 * pays for that decision: if the shape ever does change, it changes here and nowhere
 * else.
 */

/**
 * Only what the API itself said, or null.
 *
 * Use this when a specific fallback must win over axios's own message. `login()` is the
 * case that matters: axios's `err.message` for a 401 is "Request failed with status code
 * 401", which is worse than "Invalid email or password" for the person reading it.
 */
export function serverMessage(err) {
    return err?.response?.data?.message || null;
}

/**
 * The sentence to show a person: what the API said, else what axios said, else the
 * caller's fallback.
 *
 * The middle step is load-bearing rather than decorative — when the backend is
 * unreachable there is no response at all, and `err.message` ("Network Error") is the
 * only description of what happened.
 */
export function errorMessage(err, fallback = "Something went wrong.") {
    return serverMessage(err) || err?.message || fallback;
}

/**
 * The machine-readable code, or null when the error did not come from our API.
 *
 * Nothing branches on this yet, and that is deliberate: the point of the code is that a
 * page CAN distinguish "you may not do that" from "the server broke" without matching on
 * message text, which silently changes meaning the day somebody rewords a sentence.
 */
export function errorCode(err) {
    return err?.response?.data?.code || null;
}

/**
 * The per-field problems behind a VALIDATION_FAILED, as [{ field, message }].
 *
 * Always an array, so a caller can map over it without a null check. Empty for every
 * other kind of error.
 */
export function errorDetails(err) {
    const details = err?.response?.data?.details;

    return Array.isArray(details) ? details : [];
}
