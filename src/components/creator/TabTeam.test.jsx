import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";

import TabTeam from "./TabTeam";

/**
 * TabTeam keeps no list of its own, so a harness holds the state the editor would.
 */
function Harness({ initial = [] }) {
  const [team, setTeam] = useState(initial);
  return <TabTeam team={team} setTeam={setTeam} />;
}

describe("TabTeam", () => {
  it("adds a member with the name, role and email that were typed", () => {
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText("Enter member name"), { target: { value: "Mai" } });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "Student Developer" } });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "mai@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(screen.getByText("Mai")).toBeInTheDocument();
    expect(screen.getByText("mai@example.com")).toBeInTheDocument();
  });

  it("clears the form after adding, so the next member starts empty", () => {
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText("Enter member name"), { target: { value: "Mai" } });
    fireEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(screen.getByPlaceholderText("Enter member name")).toHaveValue("");
  });

  // The email is what stops that person supporting the project. Leaving it blank simply
  // does not, which is a real choice for a member who has no account.
  it("adds a member with no email rather than refusing", () => {
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText("Enter member name"), { target: { value: "Mai" } });
    fireEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(screen.getByText("No email")).toBeInTheDocument();
  });

  it("does not add a member with no name, and says why", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/name/i);
  });

  // A mistyped address matches nobody and blocks nobody, silently. Catching the shape of
  // the mistake is the only warning that can be given without also revealing which
  // addresses are registered.
  it("refuses an address that is not an address", () => {
    render(<Harness />);

    fireEvent.change(screen.getByPlaceholderText("Enter member name"), { target: { value: "Mai" } });
    fireEvent.change(screen.getByPlaceholderText("name@example.com"), { target: { value: "mai@example" } });
    fireEvent.click(screen.getByRole("button", { name: /add member/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/valid email/i);
    expect(screen.queryByRole("button", { name: "Remove" })).not.toBeInTheDocument();
  });

  it("clears the message once the creator starts fixing the row", () => {
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: /add member/i }));
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Enter member name"), { target: { value: "M" } });

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("removes a member", () => {
    render(<Harness initial={[{ id: 1, name: "Mai", role: "Student Developer", email: "mai@example.com" }]} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    expect(screen.queryByText("Mai")).not.toBeInTheDocument();
  });
});
