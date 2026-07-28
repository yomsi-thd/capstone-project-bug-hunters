// Vitest setup: jest-dom matchers + automatic RTL cleanup between tests.
// Referenced from vite.config.js `test.setupFiles`.
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
