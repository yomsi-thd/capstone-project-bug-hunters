import { describe, it, expect } from "vitest";
import { draftStorageKey, LEGACY_DRAFT_STORAGE_KEY } from "./draftStorageKey";

describe("draftStorageKey", () => {
  it("gives each account its own key", () => {
    // What this exists for: one shared key means a draft written by one account is
    // offered, pre-filled, to whoever signs in next on the same machine.
    expect(draftStorageKey(24)).not.toBe(draftStorageKey(22));
  });

  it("is stable for the same account", () => {
    expect(draftStorageKey(24)).toBe(draftStorageKey(24));
    // The id arrives as a number from the session and could be a string elsewhere, and
    // both have to land on the same key or a reload loses the draft.
    expect(draftStorageKey("24")).toBe(draftStorageKey(24));
  });

  it("returns null when nobody is signed in", () => {
    // No session means nothing to write to. The caller skips reading and writing rather
    // than falling back to a shared key.
    expect(draftStorageKey(null)).toBeNull();
    expect(draftStorageKey(undefined)).toBeNull();
    expect(draftStorageKey("")).toBeNull();
  });

  it("never collides with the old shared key", () => {
    // A draft under the old shared key is never read again: it belongs to an account
    // nothing can identify.
    expect(draftStorageKey(24)).not.toBe(LEGACY_DRAFT_STORAGE_KEY);
    expect(draftStorageKey(24).startsWith(LEGACY_DRAFT_STORAGE_KEY)).toBe(true);
  });
});
