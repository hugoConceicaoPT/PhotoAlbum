import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { stackClientApp } from "../test/stackMock";
import { session } from "../test/sessionMock";
import Register from "./Register";

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);
vi.mock("../auth/session", async () => (await import("../test/sessionMock")).sessionMock);

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={["/registar"]}>
      <Routes>
        <Route path="/registar" element={<Register />} />
        <Route path="/" element={<p>Página inicial</p>} />
        <Route path="/Albums" element={<p>Página de álbuns</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const name = () => screen.getByLabelText("Nome");
const email = () => screen.getByLabelText("Email");
const password = () => screen.getByLabelText("Palavra-passe");
const terms = () => screen.getByRole("checkbox", { name: /Aceito os Termos de Utilização/ });
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Criar conta" }));

function fillValid() {
  fireEvent.change(name(), { target: { value: "  Ana Silva " } });
  fireEvent.change(email(), { target: { value: "ana@example.com" } });
  fireEvent.change(password(), { target: { value: "segredo-123" } });
  fireEvent.click(terms());
}

describe("Register", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    session.user = null;
    stackClientApp.getProject.mockResolvedValue({ config: { oauthProviders: [{ id: "google" }] } });
    sessionStorage.clear();
  });

  it("renders the designed copy and fields", async () => {
    renderRegister();
    expect(screen.getByRole("heading", { level: 1, name: "Cria a tua conta" })).toBeInTheDocument();
    // Desktop and mobile designs use different subtitles: both strings are present, CSS shows one.
    expect(screen.getByText("Começa a organizar as tuas memórias em minutos.")).toHaveClass("d-none", "d-lg-inline");
    expect(screen.getByText("Começa a organizar as tuas memórias.")).toHaveClass("d-lg-none");
    expect(name()).toHaveAttribute("placeholder", "O teu nome");
    expect(password()).toHaveAttribute("placeholder", "Mínimo 8 caracteres");
    expect(password()).toHaveAttribute("autocomplete", "new-password");
    expect(terms()).not.toBeChecked();
    expect(await screen.findByRole("button", { name: "Registar com Google" })).toBeInTheDocument();
    // The header also has an Entrar link: the switch link is the one inside <main>.
    expect(within(screen.getByRole("main")).getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login");
  });

  it("validates every field, focuses the first invalid one and requires the terms", () => {
    renderRegister();
    submit();
    expect(name()).toHaveAccessibleDescription(/Indica o teu nome/);
    expect(email()).toHaveAccessibleDescription(/Indica o teu email/);
    expect(password()).toHaveAccessibleDescription(/Indica uma palavra-passe/);
    expect(terms()).toHaveAccessibleDescription(/Tens de aceitar os Termos/);
    expect(name()).toHaveFocus();
    expect(stackClientApp.signUpWithCredential).not.toHaveBeenCalled();
  });

  it("enforces the 8 character minimum", () => {
    renderRegister();
    fillValid();
    fireEvent.change(password(), { target: { value: "1234567" } });
    submit();
    expect(password()).toHaveAccessibleDescription(/pelo menos 8 caracteres/);
    expect(password()).toHaveFocus();
    expect(stackClientApp.signUpWithCredential).not.toHaveBeenCalled();
  });

  it("creates the account, sets the display name from Nome and lands on Home", async () => {
    const setDisplayName = vi.fn().mockResolvedValue(undefined);
    stackClientApp.signUpWithCredential.mockResolvedValue({ status: "ok", data: undefined });
    stackClientApp.getUser.mockResolvedValue({ setDisplayName });
    renderRegister();
    fillValid();
    submit();
    expect(await screen.findByText("Página inicial")).toBeInTheDocument();
    expect(screen.queryByText("Página de álbuns")).not.toBeInTheDocument();
    expect(stackClientApp.signUpWithCredential).toHaveBeenCalledWith({
      email: "ana@example.com",
      password: "segredo-123",
      noRedirect: true,
    });
    expect(setDisplayName).toHaveBeenCalledWith("Ana Silva");
  });

  it("still lands on Home when setting the display name fails", async () => {
    stackClientApp.signUpWithCredential.mockResolvedValue({ status: "ok", data: undefined });
    stackClientApp.getUser.mockResolvedValue({ setDisplayName: vi.fn().mockRejectedValue(new Error("x")) });
    renderRegister();
    fillValid();
    submit();
    expect(await screen.findByText("Página inicial")).toBeInTheDocument();
  });

  it("does not confirm that an email is already registered", async () => {
    stackClientApp.signUpWithCredential.mockResolvedValue({
      status: "error",
      error: { errorCode: "USER_EMAIL_ALREADY_EXISTS" },
    });
    renderRegister();
    fillValid();
    submit();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível criar a conta com estes dados");
    expect(alert).not.toHaveTextContent(/já existe|já está registado/i);
  });

  it("maps Stack's password-requirements error onto the password field", async () => {
    stackClientApp.signUpWithCredential.mockResolvedValue({
      status: "error",
      error: { errorCode: "PASSWORD_REQUIREMENTS_NOT_MET" },
    });
    renderRegister();
    fillValid();
    submit();
    expect(await screen.findByText(/não cumpre os requisitos/)).toBeInTheDocument();
    expect(password()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("button", { name: "Criar conta" })).toBeEnabled();
  });

  it("shows a busy label while creating the account", async () => {
    stackClientApp.signUpWithCredential.mockReturnValue(new Promise(() => {}));
    renderRegister();
    fillValid();
    submit();
    expect(await screen.findByRole("button", { name: "A criar conta..." })).toBeDisabled();
  });

  it("requires the terms before Registar com Google, then starts OAuth", async () => {
    renderRegister();
    fireEvent.click(await screen.findByRole("button", { name: "Registar com Google" }));
    expect(terms()).toHaveAccessibleDescription(/Tens de aceitar os Termos/);
    expect(stackClientApp.signInWithOAuth).not.toHaveBeenCalled();

    fireEvent.click(terms());
    fireEvent.click(screen.getByRole("button", { name: "Registar com Google" }));
    expect(stackClientApp.signInWithOAuth).toHaveBeenCalledWith("google");
  });

  it("hides Registar com Google unless Stack reports Google as enabled", async () => {
    stackClientApp.getProject.mockResolvedValue({ config: { oauthProviders: [] } });
    renderRegister();
    await waitFor(() => expect(stackClientApp.getProject).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Registar com Google" })).not.toBeInTheDocument();
    expect(screen.queryByText("ou")).not.toBeInTheDocument();
  });

  it("leaves a consent hint when the credentials sign-up succeeds (the gate records it server-side)", async () => {
    stackClientApp.signUpWithCredential.mockResolvedValue({ status: "ok", data: undefined });
    stackClientApp.getUser.mockResolvedValue({ setDisplayName: vi.fn() });
    renderRegister();
    fillValid();
    submit();
    expect(await screen.findByText("Página inicial")).toBeInTheDocument();
    expect(sessionStorage.getItem("pm.consentHint")).not.toBeNull();
  });

  it("leaves no consent hint when the terms are not accepted or the sign-up fails", async () => {
    renderRegister();
    submit(); // invalid: nothing ticked
    expect(sessionStorage.getItem("pm.consentHint")).toBeNull();

    stackClientApp.signUpWithCredential.mockResolvedValue({
      status: "error",
      error: { errorCode: "USER_EMAIL_ALREADY_EXISTS" },
    });
    fillValid();
    submit();
    await screen.findByRole("alert");
    expect(sessionStorage.getItem("pm.consentHint")).toBeNull();
  });

  it("leaves a consent hint before the Google OAuth round trip, and clears it if OAuth fails to start", async () => {
    stackClientApp.signInWithOAuth.mockRejectedValueOnce(new Error("blocked"));
    renderRegister();
    fireEvent.click(terms());
    fireEvent.click(await screen.findByRole("button", { name: "Registar com Google" }));
    await screen.findByRole("alert");
    expect(sessionStorage.getItem("pm.consentHint")).toBeNull();

    stackClientApp.signInWithOAuth.mockImplementationOnce(() => new Promise(() => {}));
    fireEvent.click(screen.getByRole("button", { name: "Registar com Google" }));
    await waitFor(() => expect(sessionStorage.getItem("pm.consentHint")).not.toBeNull());
  });

  it("has the mobile header with a back link to Home", () => {
    renderRegister();
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute("href", "/");
  });
});
