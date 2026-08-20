import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Modal from "./Modal";

describe("Modal", () => {
  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose}>body</Modal>);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  // Three dialogs pass closable={false}: two success screens whose only way out is their
  // call to action, EditProject because it holds unsaved edits, and AdminUserManagement
  // while it is writing a role change. A keyboard shortcut that ignored that would reopen
  // exactly the hole the prop exists to close.
  it("ignores Escape while locked", () => {
    const onClose = vi.fn();
    render(
      <Modal onClose={onClose} closable={false}>
        body
      </Modal>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("does not close on other keys", () => {
    const onClose = vi.fn();
    render(<Modal onClose={onClose}>body</Modal>);
    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  // The listener is global, so it has to come off when the dialog unmounts — otherwise
  // every dialog opened in a session leaves one behind and a later Escape calls a stale
  // onClose.
  it("removes its listener when unmounted", () => {
    const onClose = vi.fn();
    const { unmount } = render(<Modal onClose={onClose}>body</Modal>);
    unmount();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("still renders its children", () => {
    render(<Modal onClose={() => {}}>hello</Modal>);
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
