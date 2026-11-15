import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { renderAt } from "../test/renderWithRouter";
import { makeUser, session } from "../test/sessionMock";
import Navbar from "./Navbar";

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);
vi.mock("../auth/session", async () => (await import("../test/sessionMock")).sessionMock);

describe("signed-in header and account menu", () => {
  beforeEach(() => {
    session.user = makeUser();
  });

  it("replaces Entrar/Registar by an account menu button named after the user", () => {
    renderAt(<Navbar />);
    expect(screen.queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Registar" })).not.toBeInTheDocument();
    const trigger = screen.getByRole("button", { name: /^Ana Silva/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("banner")).toHaveClass("is-signed-in");
  });

  it("falls back to the email when there is no display name", () => {
    session.user = makeUser({ displayName: null });
    renderAt(<Navbar />);
    expect(screen.getByRole("button", { name: /^ana@example\.com/ })).toBeInTheDocument();
  });

  it("opens with name, email, the albums link and Terminar sessão; Escape closes and refocuses", () => {
    renderAt(<Navbar />);
    const trigger = screen.getByRole("button", { name: /^Ana Silva/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = screen.getByRole("group", { name: "Conta" });
    expect(menu).toHaveTextContent("ana@example.com");
    expect(screen.getByRole("link", { name: "Os meus álbuns" })).toHaveAttribute("href", "/Albums");
    expect(screen.getByRole("button", { name: "Terminar sessão" })).toBeInTheDocument();
    // The menu does not depend on the deferred Perfil screen.
    expect(screen.queryByText("Perfil")).not.toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Conta" })).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on an outside click", () => {
    renderAt(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: /^Ana Silva/ }));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("group", { name: "Conta" })).not.toBeInTheDocument();
  });

  it("signs out through the session user", async () => {
    renderAt(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: /^Ana Silva/ }));
    fireEvent.click(screen.getByRole("button", { name: "Terminar sessão" }));
    await waitFor(() => expect(session.user?.signOut).toHaveBeenCalledTimes(1));
  });

  it("shows an alert and re-enables the button when sign-out fails", async () => {
    session.user = makeUser({ signOut: vi.fn().mockRejectedValue(new Error("network")) });
    renderAt(<Navbar />);
    fireEvent.click(screen.getByRole("button", { name: /^Ana Silva/ }));
    fireEvent.click(screen.getByRole("button", { name: "Terminar sessão" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível terminar a sessão");
    expect(screen.getByRole("button", { name: "Terminar sessão" })).toBeEnabled();
  });

  it("keeps the public header (Entrar/Registar) for signed-out visitors", () => {
    session.user = null;
    renderAt(<Navbar />);
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Registar" })).toHaveAttribute("href", "/registar");
    expect(screen.getByRole("banner")).not.toHaveClass("is-signed-in");
  });
});
