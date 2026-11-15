import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderAt } from "../test/renderWithRouter";
import { makeUser, session } from "../test/sessionMock";
import Home from "./Home";

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);
vi.mock("../auth/session", async () => (await import("../test/sessionMock")).sessionMock);

describe("Home", () => {
  beforeEach(() => {
    session.user = null;
  });

  it("renders the hero heading and call-to-action links", () => {
    renderAt(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Organiza as tuas memórias com facilidade" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cria o teu álbum de fotos" })).toHaveAttribute("href", "/Albums");
    expect(screen.getByRole("link", { name: "Ver como funciona" })).toHaveAttribute("href", "#funcionalidades");
  });

  it("renders the three features as h2 headings inside the anchored section", () => {
    renderAt(<Home />);
    const section = screen.getByRole("region", { name: "Funcionalidades" });
    expect(section).toHaveAttribute("id", "funcionalidades");
    for (const title of ["Álbuns automáticos", "Arrastar & largar", "Folhear como um livro"]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
  });

  it("renders the footer columns, with Funcionalidades as the only footer link", () => {
    renderAt(<Home />);
    const footer = screen.getByRole("contentinfo");
    for (const title of ["Produto", "Empresa", "Legal"]) {
      expect(screen.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
    }
    expect(footer.querySelectorAll("a.pm-footer-link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Funcionalidades" })).toHaveAttribute("href", "#funcionalidades");
  });

  it("includes the header navigation", () => {
    renderAt(<Home />);
    expect(screen.getByRole("navigation", { name: "Principal" })).toBeInTheDocument();
  });

  it("signed out: the header offers Entrar and Registar and the mobile hero repeats Entrar", () => {
    renderAt(<Home />);
    expect(screen.getAllByRole("link", { name: "Entrar" })).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Registar" })).toBeInTheDocument();
  });

  it("signed in (post-login landing page): authenticated header with the account controls, no Entrar/Registar", () => {
    session.user = makeUser();
    renderAt(<Home />);
    expect(screen.getByRole("banner")).toHaveClass("is-signed-in");
    expect(screen.queryByRole("link", { name: "Entrar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Registar" })).not.toBeInTheDocument();
    // Desktop account menu and the mobile avatar control (each shown by CSS at its own breakpoint).
    expect(screen.getByRole("button", { name: /^Ana Silva/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Conta de Ana Silva" })).toBeInTheDocument();
  });
});
