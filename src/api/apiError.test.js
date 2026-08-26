import { describe, it, expect } from "vitest";
import { errorMessage, serverMessage, errorCode, errorDetails } from "./apiError";

/** An axios-shaped error: the API answered, with a body. */
const fromApi = (data, status = 400) => ({
    message: `Request failed with status code ${status}`,
    response: { status, data },
});

/** An axios-shaped error with no response at all: the backend was unreachable. */
const networkError = () => ({ message: "Network Error" });

describe("serverMessage", () => {
    it("returns what the API said", () => {
        expect(serverMessage(fromApi({ message: "Project not found" }))).toBe("Project not found");
    });

    it("returns null when the API said nothing, so a caller's own sentence can win", () => {
        expect(serverMessage(fromApi({}))).toBeNull();
        expect(serverMessage(networkError())).toBeNull();
        expect(serverMessage(undefined)).toBeNull();
    });
});

describe("errorMessage", () => {
    it("prefers the API's message", () => {
        expect(errorMessage(fromApi({ message: "Only an archived project can be deleted." }), "fallback"))
            .toBe("Only an archived project can be deleted.");
    });

    // The middle step is load-bearing: with the backend unreachable there is no response
    // at all, and "Network Error" is the only description of what happened.
    it("falls back to the axios message when the API said nothing", () => {
        expect(errorMessage(networkError(), "Could not load projects")).toBe("Network Error");
    });

    it("falls back to the caller's sentence when there is nothing else", () => {
        expect(errorMessage({}, "Could not load projects")).toBe("Could not load projects");
        expect(errorMessage(null, "Could not load projects")).toBe("Could not load projects");
    });

    it("has a fallback of its own, so it can never return undefined", () => {
        expect(errorMessage(null)).toBe("Something went wrong.");
    });

    // An empty string is not a usable sentence, and `||` is what steps over it — onto
    // the axios message, since that is the next thing in line. Written down because a
    // "tidy-up" to `??` would start rendering a blank error box instead.
    it("steps over an empty message rather than showing a blank box", () => {
        const err = fromApi({ message: "" });

        expect(errorMessage(err, "Could not save changes")).toBe(err.message);
        expect(errorMessage({ response: { data: { message: "" } } }, "Could not save changes"))
            .toBe("Could not save changes");
    });
});

describe("errorCode", () => {
    it("returns the machine-readable code, or null when there is none", () => {
        expect(errorCode(fromApi({ message: "x", code: "NOT_FOUND" }, 404))).toBe("NOT_FOUND");
        expect(errorCode(fromApi({ message: "x" }))).toBeNull();
        expect(errorCode(networkError())).toBeNull();
    });
});

describe("errorDetails", () => {
    it("returns the per-field problems behind a validation failure", () => {
        const err = fromApi(
            {
                message: "Some fields need attention.",
                code: "VALIDATION_FAILED",
                details: [{ field: "title", message: "A title is required." }],
            },
            422
        );

        expect(errorDetails(err)).toEqual([{ field: "title", message: "A title is required." }]);
    });

    // Always an array, so a caller can map over it with no null check.
    it("is an empty array for every other kind of error", () => {
        expect(errorDetails(fromApi({ message: "x", details: null }))).toEqual([]);
        expect(errorDetails(networkError())).toEqual([]);
        expect(errorDetails(undefined)).toEqual([]);
    });
});

describe("the old inline expression and the new function agree", () => {
    /**
     * This is what all 35 call sites read before the change. Keeping it here means the
     * migration is proved equivalent rather than eyeballed — the whole point of doing
     * this commit BEFORE the backend starts changing its error shape.
     */
    const oldWay = (err, fallback) => err?.response?.data?.message || err?.message || fallback;

    const cases = [
        fromApi({ message: "Project not found" }, 404),
        fromApi({ message: "" }),
        fromApi({}),
        networkError(),
        {},
        null,
        undefined,
    ];

    it.each(cases.map((err, i) => [i, err]))("case %i", (_i, err) => {
        expect(errorMessage(err, "Could not load projects")).toBe(oldWay(err, "Could not load projects"));
    });
});
