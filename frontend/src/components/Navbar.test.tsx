import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { renderAt } from "../test/renderWithRouter";
import Navbar from "./Navbar";

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);
vi.mock("../auth/session", async () => (await import("../test/sessionMock")).sessionMock);

describe("Navbar", () => {
  beforeAll(async () => {
    // The app loads Bootstrap's JS in main.tsx; load it here so the collapse toggle works.
    await import("bootstrap/dist/js/bootstrap.bundle.min.js");
  });

  it("renders the logo, primary links and auth actions with in-app hrefs", () => {
    renderAt(<Navbar />);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getByRole("link", { name: /PhotoMemory/ })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Início" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Álbuns de Fotos" })).toHaveAttribute("href", "/Albums");
    expect(within(nav).getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
    expect(within(nav).getByRole("link", { name: "Registar" })).toHaveAttribute("href", "/registar");
  });

  it("renders the primary links with the shared .pm-nav-link class that carries the 44 px target (size checked in the browser run)", () => {
    renderAt(<Navbar />);
    for (const name of ["Início", "Álbuns de Fotos"]) {
      expect(screen.getByRole("link", { name })).toHaveClass("pm-nav-link");
    }
  });

  it("keeps Coleções as a non-navigating placeholder", () => {
    renderAt(<Navbar />);
    expect(screen.queryByRole("link", { name: "Coleções" })).not.toBeInTheDocument();
    const placeholder = screen.getByText("Coleções");
    expect(placeholder).toHaveAttribute("aria-disabled", "true");
    expect(placeholder).toHaveAttribute("title", "Brevemente");
  });

  it("marks Início active only on the home route", () => {
    renderAt(<Navbar />, "/");
    expect(screen.getByRole("link", { name: "Início" })).toHaveClass("is-active");
    expect(screen.getByRole("link", { name: "Álbuns de Fotos" })).not.toHaveClass("is-active");
  });

  it("marks Álbuns de Fotos active on /Albums", () => {
    renderAt(<Navbar />, "/Albums");
    expect(screen.getByRole("link", { name: "Álbuns de Fotos" })).toHaveClass("is-active");
    expect(screen.getByRole("link", { name: "Início" })).not.toHaveClass("is-active");
  });

  it("exposes the mobile menu toggle and updates aria-expanded when clicked", () => {
    renderAt(<Navbar />);
    const toggle = screen.getByRole("button", { name: "Abrir menu" });
    expect(toggle).toHaveAttribute("aria-controls", "pm-navbar");
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(document.getElementById("pm-navbar")).toBeInTheDocument();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    // Closing is not asserted: Bootstrap waits for a CSS transitionend that jsdom never fires.
  });

  describe("mobile menu keyboard behavior", () => {
    const menu = () => document.getElementById("pm-navbar") as HTMLElement;
    const toggler = () => screen.getByRole("button", { name: "Abrir menu" });

    it("closes on Escape and reflects the state in aria-expanded", async () => {
      renderAt(<Navbar />);
      fireEvent.click(toggler());
      expect(toggler()).toHaveAttribute("aria-expanded", "true");
      await waitFor(() => expect(menu()).toHaveClass("show"));

      fireEvent.keyDown(document, { key: "Escape" });
      expect(toggler()).toHaveAttribute("aria-expanded", "false");
      await waitFor(() => expect(menu()).not.toHaveClass("show"));
    });

    it("returns focus to the toggler when Escape closes the menu while focus is inside it", async () => {
      renderAt(<Navbar />);
      fireEvent.click(toggler());
      await waitFor(() => expect(menu()).toHaveClass("show"));
      const link = within(menu()).getByRole("link", { name: "Início" });
      link.focus();
      expect(link).toHaveFocus();

      fireEvent.keyDown(link, { key: "Escape" });
      expect(toggler()).toHaveFocus();
      expect(toggler()).toHaveAttribute("aria-expanded", "false");
    });

    it("keeps focus on the toggler when Escape is pressed on it", async () => {
      renderAt(<Navbar />);
      fireEvent.click(toggler());
      await waitFor(() => expect(menu()).toHaveClass("show"));
      toggler().focus();
      fireEvent.keyDown(toggler(), { key: "Escape" });
      expect(toggler()).toHaveFocus();
      expect(toggler()).toHaveAttribute("aria-expanded", "false");
    });

    it("uses a native button so Enter and Space open it (key activation itself is checked in the browser run)", () => {
      renderAt(<Navbar />);
      expect(toggler().tagName).toBe("BUTTON");
      expect(toggler()).toHaveAttribute("type", "button");
      expect(toggler()).not.toHaveAttribute("tabindex");
    });

    it("ignores Escape while the menu is closed and has an accessible name and aria-controls", () => {
      renderAt(<Navbar />);
      fireEvent.keyDown(document, { key: "Escape" });
      expect(toggler()).toHaveAttribute("aria-expanded", "false");
      expect(toggler()).toHaveAttribute("aria-controls", "pm-navbar");
      expect(toggler().querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    });
  });

  it("hides the header below lg when hideOnMobile is set", () => {
    renderAt(<Navbar hideOnMobile />);
    expect(screen.getByRole("banner")).toHaveClass("d-none", "d-lg-block");
  });
});
