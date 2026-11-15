import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConsentGate from "./ConsentGate";
import { consentCache, consentTiming } from "./consentCache";
import { ApiError } from "../lib/apiClient";
import { makeUser, session } from "../test/sessionMock";
import { clearConsentHint, setConsentHint } from "./consentHint";

const api = vi.hoisted(() => ({ getConsent: vi.fn(), recordConsent: vi.fn() }));

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);
vi.mock("./session", async () => (await import("../test/sessionMock")).sessionMock);
vi.mock("../lib/consent", async (orig) => ({
  ...(await orig<typeof import("../lib/consent")>()),
  getConsent: api.getConsent,
  recordConsent: api.recordConsent,
}));

const NOT_ACCEPTED = { currentTermsVersion: "v2", accepted: false, acceptedVersion: null, acceptedAt: null };
const ACCEPTED = { currentTermsVersion: "v2", accepted: true, acceptedVersion: "v2", acceptedAt: "2026-11-01T00:00:00Z" };
const CONTENT = "Conteúdo da aplicação";

function renderGate() {
  return render(
    <MemoryRouter>
      <ConsentGate>
        <p>{CONTENT}</p>
      </ConsentGate>
    </MemoryRouter>,
  );
}

describe("ConsentGate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    consentCache.reset();
    consentTiming.retryDelayMs = 0;
    clearConsentHint();
    session.user = makeUser();
  });

  it("does nothing for signed-out visitors (no request, page shown)", () => {
    session.user = null;
    renderGate();
    expect(screen.getByText(CONTENT)).toBeInTheDocument();
    expect(api.getConsent).not.toHaveBeenCalled();
  });

  it("holds the page back while checking, then renders it when the current version is accepted", async () => {
    api.getConsent.mockResolvedValue(ACCEPTED);
    renderGate();
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("A verificar a tua conta");
    expect(await screen.findByText(CONTENT)).toBeInTheDocument();
    expect(api.recordConsent).not.toHaveBeenCalled();
  });

  it("asks existing accounts without current consent, requires the checkbox, then records the server's version", async () => {
    api.getConsent.mockResolvedValue(NOT_ACCEPTED);
    api.recordConsent.mockResolvedValue({ termsVersion: "v2", acceptedAt: "now" });
    renderGate();
    expect(await screen.findByRole("heading", { name: "Antes de continuares" })).toBeInTheDocument();
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));
    expect(screen.getByRole("checkbox")).toHaveAccessibleDescription(/Tens de aceitar os Termos/);
    expect(api.recordConsent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("checkbox", { name: /Aceito os Termos de Utilização/ }));
    fireEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));
    expect(await screen.findByText(CONTENT)).toBeInTheDocument();
    expect(api.recordConsent).toHaveBeenCalledWith("v2");
  });

  it("treats acceptance of an older version as missing", async () => {
    api.getConsent.mockResolvedValue({ ...ACCEPTED, acceptedVersion: "v1" });
    renderGate();
    expect(await screen.findByRole("heading", { name: "Antes de continuares" })).toBeInTheDocument();
  });

  it("records automatically after a sign-up (hint present), without asking again", async () => {
    setConsentHint();
    api.getConsent.mockResolvedValue(NOT_ACCEPTED);
    api.recordConsent.mockResolvedValue({ termsVersion: "v2", acceptedAt: "now" });
    renderGate();
    expect(await screen.findByText(CONTENT)).toBeInTheDocument();
    expect(api.recordConsent).toHaveBeenCalledWith("v2");
    expect(sessionStorage.getItem("pm.consentHint")).toBeNull();
  });

  it("ignores an expired hint and asks instead", async () => {
    sessionStorage.setItem("pm.consentHint", String(Date.now() - 60 * 60 * 1000));
    api.getConsent.mockResolvedValue(NOT_ACCEPTED);
    renderGate();
    expect(await screen.findByRole("heading", { name: "Antes de continuares" })).toBeInTheDocument();
    expect(api.recordConsent).not.toHaveBeenCalled();
  });

  it("shows a clear retry state when recording fails after sign-up, and does not continue silently", async () => {
    setConsentHint();
    api.getConsent.mockResolvedValue(NOT_ACCEPTED);
    api.recordConsent.mockRejectedValueOnce(new ApiError(500));
    renderGate();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("A tua conta está criada, mas não foi possível guardar a aceitação dos termos");
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();

    api.recordConsent.mockResolvedValueOnce({ termsVersion: "v2", acceptedAt: "now" });
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText(CONTENT)).toBeInTheDocument();
    expect(api.recordConsent).toHaveBeenCalledTimes(2);
    expect(api.recordConsent).toHaveBeenLastCalledWith("v2");
  });

  it("shows a retry state when the consent status cannot be loaded, and offers sign-out", async () => {
    api.getConsent.mockRejectedValueOnce(new ApiError(503));
    renderGate();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível verificar a tua conta");
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Terminar sessão" })).toBeInTheDocument();

    api.getConsent.mockResolvedValueOnce(ACCEPTED);
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByText(CONTENT)).toBeInTheDocument();
  });

  it("restarts with the new version when the server answers 400 (version changed)", async () => {
    api.getConsent
      .mockResolvedValueOnce(NOT_ACCEPTED)
      .mockResolvedValueOnce({ ...NOT_ACCEPTED, currentTermsVersion: "v3" });
    api.recordConsent.mockRejectedValueOnce(new ApiError(400));
    renderGate();
    await screen.findByRole("heading", { name: "Antes de continuares" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));
    await waitFor(() => expect(api.getConsent).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("heading", { name: "Antes de continuares" })).toBeInTheDocument();
    api.recordConsent.mockResolvedValueOnce({ termsVersion: "v3", acceptedAt: "now" });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Aceitar e continuar" }));
    await screen.findByText(CONTENT);
    expect(api.recordConsent).toHaveBeenLastCalledWith("v3");
  });

  it("retries a 409 (account still being set up) automatically after sign-up, then continues", async () => {
    setConsentHint();
    api.getConsent.mockResolvedValue(NOT_ACCEPTED);
    api.recordConsent
      .mockRejectedValueOnce(new ApiError(409))
      .mockRejectedValueOnce(new ApiError(409))
      .mockResolvedValueOnce({ termsVersion: "v2", acceptedAt: "now" });
    renderGate();
    expect(await screen.findByText(CONTENT)).toBeInTheDocument();
    expect(api.recordConsent).toHaveBeenCalledTimes(3);
  });

  it("after the automatic retries a persistent 409 shows the 'still being set up' retry state", async () => {
    setConsentHint();
    api.getConsent.mockResolvedValue(NOT_ACCEPTED);
    api.recordConsent.mockRejectedValue(new ApiError(409));
    renderGate();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("ainda está a ser configurada");
    expect(api.recordConsent).toHaveBeenCalledTimes(1 + consentTiming.maxAutoRetries);
    expect(screen.queryByText(CONTENT)).not.toBeInTheDocument();
  });

  it("shows a distinct message for a 429 and sends exactly the version read from the server", async () => {
    setConsentHint();
    api.getConsent.mockResolvedValue({ ...NOT_ACCEPTED, currentTermsVersion: "placeholder-0" });
    api.recordConsent.mockRejectedValueOnce(new ApiError(429));
    renderGate();
    expect(await screen.findByRole("alert")).toHaveTextContent("demasiados pedidos");
    expect(api.recordConsent).toHaveBeenCalledWith("placeholder-0");
  });

  it("signs the user out from the gate", async () => {
    api.getConsent.mockResolvedValue(NOT_ACCEPTED);
    renderGate();
    await screen.findByRole("heading", { name: "Antes de continuares" });
    fireEvent.click(screen.getByRole("button", { name: "Terminar sessão" }));
    await waitFor(() => expect(session.user?.signOut).toHaveBeenCalledTimes(1));
  });

  it("does not ask again on later visits in the same page session", async () => {
    api.getConsent.mockResolvedValue(ACCEPTED);
    const first = renderGate();
    await screen.findByText(CONTENT);
    first.unmount();
    renderGate();
    expect(screen.getByText(CONTENT)).toBeInTheDocument();
    expect(api.getConsent).toHaveBeenCalledTimes(1);
  });
});
