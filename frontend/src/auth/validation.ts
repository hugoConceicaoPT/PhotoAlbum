// Client-side form validation for Login/Registar. Convenience only: Stack Auth and the backend
// enforce the real rules (never treat these checks as a security boundary).

export const PASSWORD_MIN_LENGTH = 8; // design placeholder: "Mínimo 8 caracteres"
export const NAME_MAX_LENGTH = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (email === "") return "Indica o teu email.";
  if (!EMAIL_PATTERN.test(email)) return "Introduz um email válido, por exemplo o.teu@email.com.";
  return null;
}

/** Login only checks presence: the length rule applies to new passwords, not existing ones. */
export function validateLoginPassword(value: string): string | null {
  return value === "" ? "Indica a tua palavra-passe." : null;
}

export function validateNewPassword(value: string): string | null {
  if (value === "") return "Indica uma palavra-passe.";
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `A palavra-passe deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  return null;
}

export function validateName(value: string): string | null {
  const name = value.trim();
  if (name === "") return "Indica o teu nome.";
  if (name.length > NAME_MAX_LENGTH) return `O nome não pode ter mais de ${NAME_MAX_LENGTH} caracteres.`;
  return null;
}

export function validateTerms(accepted: boolean): string | null {
  return accepted ? null : "Tens de aceitar os Termos de Utilização e a Política de Privacidade.";
}
