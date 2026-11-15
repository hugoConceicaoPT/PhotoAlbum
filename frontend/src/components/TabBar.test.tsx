import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderAt } from "../test/renderWithRouter";
import TabBar from "./TabBar";

describe("TabBar", () => {
  it("renders the four tabs, with Início and Álbuns as links", () => {
    renderAt(<TabBar />);
    const nav = screen.getByRole("navigation", { name: "Navegação principal" });
    expect(nav).toHaveClass("d-lg-none");
    expect(screen.getByRole("link", { name: "Início" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Álbuns" })).toHaveAttribute("href", "/Albums");
    expect(screen.queryByRole("link", { name: "Coleções" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Perfil" })).not.toBeInTheDocument();
  });

  it("marks Álbuns active on /Albums", () => {
    renderAt(<TabBar />, "/Albums");
    expect(screen.getByRole("link", { name: "Álbuns" })).toHaveClass("is-active");
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveClass("is-active");
  });

  it("keeps Coleções and Perfil as disabled placeholders", () => {
    renderAt(<TabBar />);
    for (const label of ["Coleções", "Perfil"]) {
      const tab = screen.getByText(label).closest(".pm-tab");
      expect(tab).toHaveAttribute("aria-disabled", "true");
      expect(tab).toHaveAttribute("title", "Brevemente");
    }
  });
});
