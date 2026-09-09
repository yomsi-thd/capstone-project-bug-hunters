/**
 * Reads errors coming back from the API.
 *
 * The backend answers failures with { message, code, details }: `message` is a sentence
 * for the user, `code` is machine-readable, and `details` is [{ field, message }] on
 * validation failures only.
 *
 * Pages should call these helpers rather than digging into err.response themselves, so
 * that a change to the error shape stays in this file.
 */

/** What the API said, or null. Use when a caller's own fallback should beat axios. */
export function serverMessage(err) {
    return err?.response?.data?.message || null;
}

/**
 * A sentence to show the user. Falls back to axios's message, which is all we get when
 * the backend is unreachable and there is no response at all ("Network Error").
 */
export function errorMessage(err, fallback = "Something went wrong.") {
    return serverMessage(err) || err?.message || fallback;
}

/**
 * The error code, or null when the error did not come from our API. Branch on this
 * rather than on message text, which changes whenever someone rewords a sentence.
 */
export function errorCode(err) {
    return err?.response?.data?.code || null;
}

/** Field errors behind a VALIDATION_FAILED. Always an array, empty for other errors. */
export function errorDetails(err) {
    const details = err?.response?.data?.details;

    return Array.isArray(details) ? details : [];
}
