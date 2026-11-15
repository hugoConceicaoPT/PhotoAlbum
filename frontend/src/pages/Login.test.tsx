import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stackClientApp } from "../test/stackMock";
import { session } from "../test/sessionMock";
import Login from "./Login";

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);
vi.mock("../auth/session", async () => (await import("../test/sessionMock")).sessionMock);

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<p>Página inicial</p>} />
        <Route path="/Albums" element={<p>Página de álbuns</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const email = () => screen.getByLabelText("Email");
const password = () => screen.getByLabelText("Palavra-passe");
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

function fill(e: string, p: string) {
  fireEvent.change(email(), { target: { value: e } });
  fireEvent.change(password(), { target: { value: p } });
}

describe("Login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    session.user = null;
    stackClientApp.getProject.mockResolvedValue({ config: { oauthProviders: [{ id: "google" }] } });
    sessionStorage.clear();
  });

  it("renders the designed copy, labelled fields and links", async () => {
    renderLogin();
    expect(screen.getByRole("heading", { level: 1, name: "Bem-vindo de volta" })).toBeInTheDocument();
    expect(screen.getByText("Entra para ver os teus álbuns e coleções.")).toBeInTheDocument();
    expect(email()).toHaveAttribute("placeholder", "o.teu@email.com");
    expect(email()).toHaveAttribute("autocomplete", "email");
    expect(password()).toHaveAttribute("autocomplete", "current-password");
    expect(screen.getByRole("link", { name: "Esqueceste-te da palavra-passe?" })).toHaveAttribute(
      "href",
      "/handler/forgot-password",
    );
    expect(screen.getByRole("link", { name: "Regista-te" })).toHaveAttribute("href", "/registar");
    expect(await screen.findByRole("button", { name: "Continuar com Google" })).toBeInTheDocument();
    expect(screen.getByText("As tuas memórias, sempre à mão.")).toBeInTheDocument();
  });

  it("toggles password visibility with Mostrar/Ocultar", () => {
    renderLogin();
    expect(password()).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar palavra-passe" }));
    expect(password()).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar palavra-passe" }));
    expect(password()).toHaveAttribute("type", "password");
  });

  it("renders Mostrar as a native, non-submitting button controlling the password input (44 px size is checked in the browser run: jsdom has no layout)", () => {
    renderLogin();
    const toggle = screen.getByRole("button", { name: "Mostrar palavra-passe" });
    expect(toggle).toHaveClass("pm-field-toggle");
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-controls", "login-password");
    expect(toggle).toHaveTextContent("Mostrar");
  });

  it("shows linked inline errors, focuses the first invalid field and does not call Stack", () => {
    renderLogin();
    submit();
    expect(email()).toHaveAttribute("aria-invalid", "true");
    expect(email()).toHaveAccessibleDescription(/Indica o teu email/);
    expect(password()).toHaveAccessibleDescription(/Indica a tua palavra-passe/);
    expect(email()).toHaveFocus();
    expect(stackClientApp.signInWithCredential).not.toHaveBeenCalled();

    fill("sem-arroba", "x");
    submit();
    expect(email()).toHaveAccessibleDescription(/email válido/);
  });

  it("signs in without Stack redirect and lands on Home", async () => {
    stackClientApp.signInWithCredential.mockResolvedValue({ status: "ok", data: undefined });
    renderLogin();
    fill(" ana@example.com ", "segredo-123");
    submit();
    expect(await screen.findByText("Página inicial")).toBeInTheDocument();
    expect(screen.queryByText("Página de álbuns")).not.toBeInTheDocument();
    expect(stackClientApp.signInWithCredential).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "segredo-123",
      noRedirect: true,
    });
  });

  it("shows the busy state while signing in and blocks double submit", async () => {
    let resolve: (v: unknown) => void = () => {};
    stackClientApp.signInWithCredential.mockReturnValue(new Promise((r) => (resolve = r)));
    renderLogin();
    fill("ana@example.com", "segredo-123");
    submit();
    const busy = await screen.findByRole("button", { name: "A entrar..." });
    expect(busy).toBeDisabled();
    expect(email()).toBeDisabled();
    fireEvent.submit(busy.closest("form")!);
    expect(stackClientApp.signInWithCredential).toHaveBeenCalledTimes(1);
    resolve({ status: "ok", data: undefined });
    expect(await screen.findByText("Página inicial")).toBeInTheDocument();
  });

  it("shows one neutral alert for wrong credentials (no account enumeration)", async () => {
    stackClientApp.signInWithCredential.mockResolvedValue({
      status: "error",
      error: { errorCode: "EMAIL_PASSWORD_MISMATCH" },
    });
    renderLogin();
    fill("ana@example.com", "errada");
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Email ou palavra-passe incorretos.");
    expect(alert).not.toHaveTextContent(/não existe|não registado|encontrad/i);
    expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
  });

  it("shows a generic alert when the call throws, without leaking details", async () => {
    stackClientApp.signInWithCredential.mockRejectedValue(new Error("ECONNREFUSED 10.0.0.1"));
    renderLogin();
    fill("ana@example.com", "segredo-123");
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível entrar");
    expect(alert).not.toHaveTextContent("ECONNREFUSED");
  });

  it("starts Google OAuth, and reports a failure", async () => {
    stackClientApp.signInWithOAuth.mockRejectedValueOnce(new Error("popup blocked"));
    renderLogin();
    fireEvent.click(await screen.findByRole("button", { name: "Continuar com Google" }));
    expect(stackClientApp.signInWithOAuth).toHaveBeenCalledWith("google");
    expect(await screen.findByRole("alert")).toHaveTextContent("Google");
    await waitFor(() => expect(screen.getByRole("button", { name: "Continuar com Google" })).toBeEnabled());
  });

  describe("Google button gating (reads the enabled providers from Stack)", () => {
    const googleButton = () => screen.queryByRole("button", { name: "Continuar com Google" });
    const settle = () => waitFor(() => expect(stackClientApp.getProject).toHaveBeenCalled());

    it("hides the button and the \"ou\" divider while the provider list is unknown (loading)", async () => {
      stackClientApp.getProject.mockReturnValue(new Promise(() => {}));
      renderLogin();
      await settle();
      expect(googleButton()).not.toBeInTheDocument();
      expect(screen.queryByText("ou")).not.toBeInTheDocument();
    });

    it("shows the button and divider when Google is enabled", async () => {
      renderLogin();
      expect(await screen.findByRole("button", { name: "Continuar com Google" })).toBeInTheDocument();
      expect(screen.getByText("ou")).toBeInTheDocument();
    });

    it("hides the button when Google is not among the enabled providers", async () => {
      stackClientApp.getProject.mockResolvedValue({ config: { oauthProviders: [{ id: "github" }] } });
      renderLogin();
      await settle();
      await waitFor(() => expect(googleButton()).not.toBeInTheDocument());
      expect(screen.queryByText("ou")).not.toBeInTheDocument();
    });

    it("hides the button when no provider is enabled", async () => {
      stackClientApp.getProject.mockResolvedValue({ config: { oauthProviders: [] } });
      renderLogin();
      await settle();
      expect(googleButton()).not.toBeInTheDocument();
    });

    it("hides the button when reading the project fails, and the form still works", async () => {
      stackClientApp.getProject.mockRejectedValue(new Error("network"));
      renderLogin();
      await settle();
      expect(googleButton()).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Entrar" })).toBeEnabled();
    });

    it("hides the button on an unexpected project shape", async () => {
      stackClientApp.getProject.mockResolvedValue({});
      renderLogin();
      await settle();
      expect(googleButton()).not.toBeInTheDocument();
    });
  });

  it("clears a leftover consent hint (logging in is not the sign-up flow)", () => {
    sessionStorage.setItem("pm.consentHint", String(Date.now()));
    renderLogin();
    expect(sessionStorage.getItem("pm.consentHint")).toBeNull();
  });

  it("shows the mobile header with a back link to Home and the logo", () => {
    renderLogin();
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute("href", "/");
    // Mobile design: no main navigation inside the mobile bar; only the logo link.
    const bars = document.querySelectorAll("header.pm-auth-top");
    expect(bars).toHaveLength(1);
    expect(bars[0]).toHaveClass("d-lg-none");
    expect(bars[0].querySelector(".pm-logo")).not.toBeNull();
    expect(bars[0].querySelector("nav")).toBeNull();
  });
});
