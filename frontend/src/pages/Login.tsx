import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { stackClientApp } from "../stack";
import AuthLayout from "../auth/AuthLayout";
import { PasswordField, TextField } from "../auth/FormFields";
import { clearConsentHint } from "../auth/consentHint";
import { useGoogleEnabled } from "../auth/useGoogleEnabled";
import { validateEmail, validateLoginPassword } from "../auth/validation";

// Neutral on purpose: never says whether the email exists.
const BAD_CREDENTIALS = "Email ou palavra-passe incorretos.";
const GENERIC_FAILURE = "Não foi possível entrar. Tenta novamente daqui a pouco.";
const GOOGLE_FAILURE = "Não foi possível continuar com o Google. Tenta novamente.";

/** Custom Login ("Login – proposed", 9:2). Stack Auth does the authentication behind it. */
export default function Login() {
  const navigate = useNavigate();
  const googleEnabled = useGoogleEnabled();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string | null; password?: string | null }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Logging in is not the sign-up flow: drop any leftover "terms were ticked" hint.
  useEffect(() => clearConsentHint(), []);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const next = { email: validateEmail(email), password: validateLoginPassword(password) };
    setErrors(next);
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();

    setSubmitting(true);
    try {
      // noRedirect: we navigate ourselves. Owner decision: the landing page after login is Home ("/").
      const result = await stackClientApp.signInWithCredential({
        email: email.trim(),
        password,
        noRedirect: true,
      });
      if (result.status === "error") {
        setFormError(BAD_CREDENTIALS);
        setSubmitting(false);
        return;
      }
      navigate("/", { replace: true });
    } catch {
      setFormError(GENERIC_FAILURE);
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setFormError(null);
    try {
      await stackClientApp.signInWithOAuth("google");
    } catch {
      setFormError(GOOGLE_FAILURE);
    }
  };

  return (
    <AuthLayout>
      <h1 className="pm-auth-title">Bem-vindo de volta</h1>
      <p className="pm-auth-sub">Entra para ver os teus álbuns e coleções.</p>

      <form className="pm-form" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        {formError && (
          <p className="pm-form-error" role="alert">
            {formError}
          </p>
        )}
        <TextField
          id="login-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.email}
          placeholder="o.teu@email.com"
          autoComplete="email"
          inputRef={emailRef}
          disabled={submitting}
        />
        <PasswordField
          id="login-password"
          label="Palavra-passe"
          value={password}
          onChange={setPassword}
          error={errors.password}
          autoComplete="current-password"
          inputRef={passwordRef}
          disabled={submitting}
        />
        {/* Interim target: Stack's own hosted page. The recovery UI is not built (owner has not approved the proposal). */}
        <Link className="pm-link" to={stackClientApp.urls.forgotPassword}>
          Esqueceste-te da palavra-passe?
        </Link>
        <button type="submit" className="pm-btn pm-btn-teal pm-btn-block" disabled={submitting}>
          {submitting ? "A entrar..." : "Entrar"}
        </button>
      </form>

      {/* Shown only when Stack reports Google as an enabled provider (hidden while unknown, on error, or disabled). */}
      {googleEnabled && (
        <>
          <p className="pm-divider">
            <span>ou</span>
          </p>
          <button type="button" className="pm-btn pm-btn-outline pm-btn-block" onClick={onGoogle} disabled={submitting}>
            Continuar com Google
          </button>
        </>
      )}

      <p className="pm-auth-switch">
        Ainda não tens conta?{" "}
        <Link className="pm-link" to={stackClientApp.urls.signUp}>
          Regista-te
        </Link>
      </p>
    </AuthLayout>
  );
}
