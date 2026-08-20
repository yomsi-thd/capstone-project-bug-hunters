import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Avatar from "./Avatar";

describe("Avatar", () => {
  it("shows the initials of the name", () => {
    render(<Avatar name="An Nguyen" />);
    expect(screen.getByText("AN")).toBeInTheDocument();
  });

  it("shows one letter when asked", () => {
    render(<Avatar name="An Nguyen" max={1} />);
    expect(screen.getByText("A")).toBeInTheDocument();
  });

  // project_updates.author_id is ON DELETE SET NULL and comment rows can arrive without a
  // name, so an empty name is real data rather than a hypothetical.
  it("falls back rather than rendering an empty circle", () => {
    render(<Avatar name="" fallback="?" />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("renders nothing visible when there is no name and no fallback", () => {
    const { container } = render(<Avatar name={null} />);
    expect(container.firstChild.textContent).toBe("");
  });
});
