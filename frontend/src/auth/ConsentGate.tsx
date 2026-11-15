import { useCallback, useEffect, useState, type ReactNode } from "react";
import Logo from "../components/Logo";
import { ApiError } from "../lib/apiClient";
import { getConsent, isCurrent, recordConsent, type TermsVersion } from "../lib/consent";
import { consentCache, consentTiming } from "./consentCache";
import { clearConsentHint, hasConsentHint } from "./consentHint";
import { useCurrentUser, type SessionUser } from "./session";
import { useSignOut } from "./useSignOut";
import { validateTerms } from "./validation";

type State =
  | { kind: "loading" }
  | { kind: "ready" }
  | { kind: "needs"; version: TermsVersion }
  | { kind: "recording"; version: TermsVersion }
  | { kind: "loadError" }
  | { kind: "recordError"; version: TermsVersion; reason: RecordFailure };

/** setup = 409 (profile not synced yet), rate = 429, other = anything else. Never shows server text. */
type RecordFailure = "setup" | "rate" | "other";

function failureReason(error: unknown): RecordFailure {
  if (error instanceof ApiError && error.status === 409) return "setup";
  if (error instanceof ApiError && error.status === 429) return "rate";
  return "other";
}

const FAILURE_TEXT: Record<RecordFailure, string> = {
  setup: "A tua conta ainda está a ser configurada. Tenta novamente daqui a instantes.",
  rate: "Foram feitos demasiados pedidos. Tenta novamente daqui a alguns minutos.",
  other: "Tenta novamente para continuares.",
};

/**
 * Wraps the app pages. For a signed-in user it checks the server (GET /me/consent) and holds the page back
 * until the CURRENT terms version has been accepted:
 * - accepted: renders the page;
 * - not accepted and the user just ticked the terms on Registar (consent hint): records it automatically
 *   (credentials and Google sign-up), with a retry state if that fails;
 * - not accepted otherwise (e.g. accounts created before this feature): asks the user to accept.
 * Signed-out visitors see the page unchanged. ENGINEER PROPOSAL: the gate screen is not in Figma.
 * Frontend only: the backend must still enforce consent where it matters.
 */
export default function ConsentGate({ children }: { children: ReactNode }) {
  const user = useCurrentUser();
  if (!user) return <>{children}</>;
  return (
    <Gate key={user.id} user={user}>
      {children}
    </Gate>
  );
}

function Gate({ user, children }: { user: SessionUser; children: ReactNode }) {
  const [state, setState] = useState<State>(() =>
    consentCache.has(user.id) ? { kind: "ready" } : { kind: "loading" },
  );
  const [attempt, setAttempt] = useState(0);

  const record = useCallback(
    async (version: TermsVersion, isCancelled: () => boolean = () => false) => {
      setState({ kind: "recording", version });
      for (let retry = 0; ; retry++) {
        try {
          await recordConsent(version);
          if (isCancelled()) return;
          consentCache.add(user.id);
          clearConsentHint();
          setState({ kind: "ready" });
          return;
        } catch (error) {
          if (isCancelled()) return;
          // Right after sign-up the profile row may not be synced yet (409): retry a few times automatically.
          if (failureReason(error) === "setup" && retry < consentTiming.maxAutoRetries) {
            await new Promise((resolve) => setTimeout(resolve, consentTiming.retryDelayMs));
            if (isCancelled()) return;
            continue;
          }
          handleFailure(error);
          return;
        }
      }

      function handleFailure(error: unknown) {
        if (error instanceof ApiError && error.status === 400) {
          // The terms version changed under us: start over with the new one, asking the user.
          clearConsentHint();
          setAttempt((n) => n + 1);
          return;
        }
        setState({ kind: "recordError", version, reason: failureReason(error) });
      }
    },
    [user.id],
  );

  useEffect(() => {
    if (consentCache.has(user.id)) return;
    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      try {
        const status = await getConsent();
        if (cancelled) return;
        if (isCurrent(status)) {
          consentCache.add(user.id);
          clearConsentHint();
          setState({ kind: "ready" });
        } else if (hasConsentHint() && attempt === 0) {
          await record(status.currentTermsVersion, () => cancelled);
        } else {
          clearConsentHint();
          setState({ kind: "needs", version: status.currentTermsVersion });
        }
      } catch {
        // Details are never shown or logged: only that the check failed.
        if (!cancelled) setState({ kind: "loadError" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user.id, attempt, record]);

  if (state.kind === "ready") return <>{children}</>;

  return (
    <main className="pm-wrap pm-consent" aria-labelledby="consent-title">
      <Logo />
      <GatePanel
        key={"version" in state ? `${state.kind}-${state.version}` : state.kind}
        user={user}
        state={state}
        onRetryLoad={() => setAttempt((n) => n + 1)}
        onRecord={(version) => void record(version)}
      />
    </main>
  );
}

function GatePanel({
  user,
  state,
  onRetryLoad,
  onRecord,
}: {
  user: SessionUser;
  state: Exclude<State, { kind: "ready" }>;
  onRetryLoad: () => void;
  onRecord: (version: TermsVersion) => void;
}) {
  const { busy, failed, signOut } = useSignOut(user);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signOutButton = (
    <button type="button" className="pm-btn pm-btn-outline" onClick={signOut} disabled={busy}>
      {busy ? "A terminar sessão..." : "Terminar sessão"}
    </button>
  );
  const signOutFailed = failed && (
    <p className="pm-field-error" role="alert">
      Não foi possível terminar a sessão. Tenta novamente.
    </p>
  );

  if (state.kind === "loading" || state.kind === "recording") {
    return (
      <div className="pm-state" role="status" aria-busy="true">
        <h1 id="consent-title" className="pm-state-title">
          {state.kind === "loading" ? "A verificar a tua conta..." : "A guardar a tua aceitação..."}
        </h1>
      </div>
    );
  }

  if (state.kind === "loadError") {
    return (
      <div className="pm-state" role="alert">
        <h1 id="consent-title" className="pm-state-title">
          Não foi possível verificar a tua conta.
        </h1>
        <p className="pm-state-text">Tenta novamente daqui a pouco.</p>
        <div className="pm-consent-actions">
          <button type="button" className="pm-btn pm-btn-teal" onClick={onRetryLoad}>
            Tentar novamente
          </button>
          {signOutButton}
        </div>
        {signOutFailed}
      </div>
    );
  }

  if (state.kind === "recordError") {
    return (
      <div className="pm-state" role="alert">
        <h1 id="consent-title" className="pm-state-title">
          A tua conta está criada, mas não foi possível guardar a aceitação dos termos.
        </h1>
        <p className="pm-state-text">{FAILURE_TEXT[state.reason]}</p>
        <div className="pm-consent-actions">
          <button type="button" className="pm-btn pm-btn-teal" onClick={() => onRecord(state.version)}>
            Tentar novamente
          </button>
          {signOutButton}
        </div>
        {signOutFailed}
      </div>
    );
  }

  const accept = () => {
    const termsError = validateTerms(checked);
    setError(termsError);
    if (!termsError) onRecord(state.version);
  };

  return (
    <div className="pm-state">
      <h1 id="consent-title" className="pm-state-title">
        Antes de continuares
      </h1>
      <p className="pm-state-text">Precisamos que aceites os termos em vigor para usares o PhotoMemory.</p>
      <div className="pm-form-group">
        <div className="pm-check">
          <input
            id="consent-terms"
            type="checkbox"
            checked={checked}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? "consent-terms-error" : undefined}
            onChange={(e) => setChecked(e.target.checked)}
          />
          {/* The Termos and Privacidade pages do not exist yet: plain text, not links. */}
          <label htmlFor="consent-terms">Aceito os Termos de Utilização e a Política de Privacidade.</label>
        </div>
        {error && (
          <p id="consent-terms-error" className="pm-field-error">
            {error}
          </p>
        )}
      </div>
      <div className="pm-consent-actions">
        <button type="button" className="pm-btn pm-btn-teal" onClick={accept}>
          Aceitar e continuar
        </button>
        {signOutButton}
      </div>
      {signOutFailed}
    </div>
  );
}
