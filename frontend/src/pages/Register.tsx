import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { stackClientApp } from "../stack";
import AuthLayout from "../auth/AuthLayout";
import { PasswordField, TextField } from "../auth/FormFields";
import ResponsiveText from "../components/ResponsiveText";
import { clearConsentHint, setConsentHint } from "../auth/consentHint";
import { useGoogleEnabled } from "../auth/useGoogleEnabled";
import {
  PASSWORD_MIN_LENGTH,
  validateEmail,
  validateName,
  validateNewPassword,
  validateTerms,
} from "../auth/validation";

const CREATE_FAILED = "Não foi possível criar a conta com estes dados. Se já tens conta, tenta entrar.";
const GENERIC_FAILURE = "Não foi possível criar a conta. Tenta novamente daqui a pouco.";
const GOOGLE_FAILURE = "Não foi possível continuar com o Google. Tenta novamente.";
const WEAK_PASSWORD = `A palavra-passe não cumpre os requisitos. Usa pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;

type Errors = {
  name?: string | null;
  email?: string | null;
  password?: string | null;
  terms?: string | null;
};

/**
 * Custom Registar ("Registar – proposed", 9:60). Stack Auth creates the account.
 * Terms acceptance is required by the UI. The server records it: a short-lived hint is left for the consent
 * gate (auth/ConsentGate.tsx), which reads the current terms version from GET /me/consent and records
 * the acceptance with POST /me/consent after the account exists (credentials and Google alike).
 */
export default function Register() {
  const navigate = useNavigate();
  const googleEnabled = useGoogleEnabled();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const termsRef = useRef<HTMLInputElement>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);

    const next: Errors = {
      name: validateName(name),
      email: validateEmail(email),
      password: validateNewPassword(password),
      terms: validateTerms(terms),
    };
    setErrors(next);
    if (next.name) return nameRef.current?.focus();
    if (next.email) return emailRef.current?.focus();
    if (next.password) return passwordRef.current?.focus();
    if (next.terms) return termsRef.current?.focus();

    setSubmitting(true);
    setConsentHint(); // the terms checkbox is ticked (validated above)
    try {
      const result = await stackClientApp.signUpWithCredential({
        email: email.trim(),
        password,
        noRedirect: true,
      });
      if (result.status === "error") {
        clearConsentHint();
        if (result.error.errorCode === "PASSWORD_REQUIREMENTS_NOT_MET") {
          setErrors({ password: WEAK_PASSWORD });
          passwordRef.current?.focus();
        } else {
          // Includes "email already registered": deliberately worded without confirming it.
          setFormError(CREATE_FAILED);
        }
        setSubmitting(false);
        return;
      }

      // The design collects "Nome": store it as the Stack display name. Failure here must not
      // block the new account; the header falls back to the email.
      try {
        const user = await stackClientApp.getUser();
        await user?.setDisplayName(name.trim());
      } catch {
        /* display name is cosmetic */
      }
      navigate("/", { replace: true }); // owner decision: landing page is Home
    } catch {
      clearConsentHint();
      setFormError(GENERIC_FAILURE);
      setSubmitting(false);
    }
  };

  const onGoogle = async () => {
    setFormError(null);
    const termsError = validateTerms(terms);
    if (termsError) {
      setErrors((prev) => ({ ...prev, terms: termsError }));
      termsRef.current?.focus();
      return;
    }
    setConsentHint(); // survives the OAuth round trip (same tab); see ConsentGate
    try {
      await stackClientApp.signInWithOAuth("google");
    } catch {
      clearConsentHint();
      setFormError(GOOGLE_FAILURE);
    }
  };

  return (
    <AuthLayout>
      <h1 className="pm-auth-title">Cria a tua conta</h1>
      <p className="pm-auth-sub">
        <ResponsiveText
          desktop="Começa a organizar as tuas memórias em minutos."
          mobile="Começa a organizar as tuas memórias."
        />
      </p>

      <form className="pm-form" onSubmit={onSubmit} noValidate aria-busy={submitting}>
        {formError && (
          <p className="pm-form-error" role="alert">
            {formError}
          </p>
        )}
        <TextField
          id="register-name"
          label="Nome"
          value={name}
          onChange={setName}
          error={errors.name}
          placeholder="O teu nome"
          autoComplete="name"
          inputRef={nameRef}
          disabled={submitting}
        />
        <TextField
          id="register-email"
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
          id="register-password"
          label="Palavra-passe"
          value={password}
          onChange={setPassword}
          error={errors.password}
          placeholder={`Mínimo ${PASSWORD_MIN_LENGTH} caracteres`}
          autoComplete="new-password"
          inputRef={passwordRef}
          disabled={submitting}
        />

        <div className="pm-form-group">
          <div className="pm-check">
            <input
              id="register-terms"
              ref={termsRef}
              type="checkbox"
              checked={terms}
              required
              aria-invalid={errors.terms ? true : undefined}
              aria-describedby={errors.terms ? "register-terms-error" : undefined}
              disabled={submitting}
              onChange={(e) => setTerms(e.target.checked)}
            />
            {/* The Termos and Privacidade pages do not exist yet: plain text, not links. */}
            <label htmlFor="register-terms">Aceito os Termos de Utilização e a Política de Privacidade.</label>
          </div>
          {errors.terms && (
            <p id="register-terms-error" className="pm-field-error">
              {errors.terms}
            </p>
          )}
        </div>

        <button type="submit" className="pm-btn pm-btn-teal pm-btn-block" disabled={submitting}>
          {submitting ? "A criar conta..." : "Criar conta"}
        </button>
      </form>

      {/* Shown only when Stack reports Google as an enabled provider (hidden while unknown, on error, or disabled). */}
      {googleEnabled && (
        <>
          <p className="pm-divider">
            <span>ou</span>
          </p>
          <button type="button" className="pm-btn pm-btn-outline pm-btn-block" onClick={onGoogle} disabled={submitting}>
            Registar com Google
          </button>
        </>
      )}

      <p className="pm-auth-switch">
        Já tens conta?{" "}
        <Link className="pm-link" to={stackClientApp.urls.signIn}>
          Entrar
        </Link>
      </p>
    </AuthLayout>
  );
}
