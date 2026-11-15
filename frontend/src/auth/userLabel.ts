/** Name shown in the header: display name, else the email, else a neutral label. */
export function userLabel(user: { displayName: string | null; email: string | null }): string {
  return user.displayName?.trim() || user.email || "A minha conta";
}
