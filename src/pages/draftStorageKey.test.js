import { describe, it, expect } from "vitest";
import { draftStorageKey, LEGACY_DRAFT_STORAGE_KEY } from "./draftStorageKey";

describe("draftStorageKey", () => {
  it("gives each account its own key", () => {
    // The bug this exists for: one shared key meant a draft written by one account was
    // offered, pre-filled, to whoever signed in next on the same machine — and on a demo
    // laptop where roles are switched constantly, that is every session.
    expect(draftStorageKey(24)).not.toBe(draftStorageKey(22));
  });

  it("is stable for the same account", () => {
    expect(draftStorageKey(24)).toBe(draftStorageKey(24));
    // The id arrives as a number from the session and could be a string elsewhere;
    // both must land on the same drawer or a reload would lose the draft.
    expect(draftStorageKey("24")).toBe(draftStorageKey(24));
  });

  it("returns null when nobody is signed in", () => {
    // No session means no drawer to write to. The caller skips reading and writing
    // rather than falling back to a shared key, which is what caused the leak.
    expect(draftStorageKey(null)).toBeNull();
    expect(draftStorageKey(undefined)).toBeNull();
    expect(draftStorageKey("")).toBeNull();
  });

  it("never collides with the old shared key", () => {
    // A draft left over from before 2026-08-18 stays under the legacy key and is simply
    // never read again — it belongs to an account we can no longer identify.
    expect(draftStorageKey(24)).not.toBe(LEGACY_DRAFT_STORAGE_KEY);
    expect(draftStorageKey(24).startsWith(LEGACY_DRAFT_STORAGE_KEY)).toBe(true);
  });
});
