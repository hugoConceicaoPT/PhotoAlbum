import { useState, type Ref } from "react";

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | null;
  placeholder?: string;
  autoComplete?: string;
  type?: "text" | "email";
  inputRef?: Ref<HTMLInputElement>;
  disabled?: boolean;
}

/** Visible label above, input in the shared .pm-field box, error linked through aria-describedby. */
export function TextField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  type = "text",
  inputRef,
  disabled,
}: FieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className="pm-form-group">
      <label htmlFor={id} className="pm-label">
        {label}
      </label>
      <div className={`pm-field pm-field-lg${error ? " is-invalid" : ""}`}>
        <input
          id={id}
          ref={inputRef}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          required
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
      {error && (
        <p id={errorId} className="pm-field-error">
          {error}
        </p>
      )}
    </div>
  );
}

/** Password input with the design's "Mostrar" toggle (text becomes "Ocultar" while shown). */
export function PasswordField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
  inputRef,
  disabled,
}: Omit<FieldProps, "type">) {
  const [shown, setShown] = useState(false);
  const errorId = `${id}-error`;
  return (
    <div className="pm-form-group">
      <label htmlFor={id} className="pm-label">
        {label}
      </label>
      <div className={`pm-field pm-field-lg${error ? " is-invalid" : ""}`}>
        <input
          id={id}
          ref={inputRef}
          type={shown ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={disabled}
          required
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="pm-field-toggle"
          aria-controls={id}
          aria-label={shown ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
          onClick={() => setShown((s) => !s)}
        >
          {shown ? "Ocultar" : "Mostrar"}
        </button>
      </div>
      {error && (
        <p id={errorId} className="pm-field-error">
          {error}
        </p>
      )}
    </div>
  );
}
