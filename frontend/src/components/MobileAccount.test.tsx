import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderAt } from "../test/renderWithRouter";
import { makeUser, session } from "../test/sessionMock";
import MobileAccount from "./MobileAccount";
import MobileTopBar from "./MobileTopBar";

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);
vi.mock("../auth/session", async () => (await import("../test/sessionMock")).sessionMock);

const trigger = () => screen.getByRole("button", { name: "Conta de Ana Silva" });

describe("mobile account control", () => {
  beforeEach(() => {
    session.user = makeUser();
  });

  it("is an avatar button with an accessible name, haspopup and aria-expanded, hidden from lg up", () => {
    renderAt(<MobileAccount user={session.user!} />);
    expect(trigger()).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(trigger().closest(".pm-mobile-account")).toHaveClass("d-lg-none");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens a modal sheet with the account details, the albums link and Terminar sessão, and moves focus into it", () => {
    renderAt(<MobileAccount user={session.user!} />);
    fireEvent.click(trigger());
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    const sheet = screen.getByRole("dialog", { name: "A tua conta" });
    expect(sheet).toHaveAttribute("aria-modal", "true");
    expect(sheet).toHaveFocus();
    expect(within(sheet).getByText("Ana Silva")).toBeInTheDocument();
    expect(within(sheet).getByText("ana@example.com")).toBeInTheDocument();
    expect(within(sheet).getByRole("link", { name: "Os meus álbuns" })).toHaveAttribute("href", "/Albums");
    expect(within(sheet).getByRole("button", { name: "Terminar sessão" })).toBeInTheDocument();
    expect(within(sheet).queryByText("Perfil")).not.toBeInTheDocument();
  });

  it("closes with Escape and returns focus to the avatar button", () => {
    renderAt(<MobileAccount user={session.user!} />);
    fireEvent.click(trigger());
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a tap outside the sheet (backdrop) and with Fechar, returning focus", () => {
    renderAt(<MobileAccount user={session.user!} />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByTestId("account-backdrop"));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();

    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("traps Tab inside the sheet in both directions", () => {
    renderAt(<MobileAccount user={session.user!} />);
    fireEvent.click(trigger());
    const sheet = screen.getByRole("dialog");
    const first = within(sheet).getByRole("link", { name: "Os meus álbuns" });
    const last = within(sheet).getByRole("button", { name: "Fechar" });

    last.focus();
    fireEvent.keyDown(last, { key: "Tab" });
    expect(first).toHaveFocus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();

    // Shift+Tab from the dialog container itself (initial focus) also wraps to the last control.
    sheet.focus();
    fireEvent.keyDown(sheet, { key: "Tab", shiftKey: true });
    expect(last).toHaveFocus();
  });

  it("signs out through the session user", async () => {
    renderAt(<MobileAccount user={session.user!} />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Terminar sessão" }));
    await waitFor(() => expect(session.user?.signOut).toHaveBeenCalledTimes(1));
  });

  it("shows an alert and re-enables the button when sign-out fails", async () => {
    session.user = makeUser({ signOut: vi.fn().mockRejectedValue(new Error("network")) });
    renderAt(<MobileAccount user={session.user} />);
    fireEvent.click(trigger());
    fireEvent.click(screen.getByRole("button", { name: "Terminar sessão" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível terminar a sessão");
    expect(screen.getByRole("button", { name: "Terminar sessão" })).toBeEnabled();
  });

  it("falls back to the email in the accessible name when there is no display name", () => {
    session.user = makeUser({ displayName: null });
    renderAt(<MobileAccount user={session.user} />);
    expect(screen.getByRole("button", { name: "Conta de ana@example.com" })).toBeInTheDocument();
  });

  it("the top bar (pages without a mobile header) shows logo and avatar only when signed in", () => {
    const { unmount } = renderAt(<MobileTopBar />);
    expect(trigger()).toBeInTheDocument();
    expect(screen.getByRole("banner")).toHaveClass("d-lg-none");
    unmount();
    session.user = null;
    renderAt(<MobileTopBar />);
    expect(screen.queryByRole("banner")).not.toBeInTheDocument();
  });
});
