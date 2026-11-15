import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { SessionUser } from "../auth/session";
import { useSignOut } from "../auth/useSignOut";
import { userLabel } from "../auth/userLabel";
import { ChevronDownIcon, UserIcon } from "./icons";

/**
 * Account menu of the signed-in header. ENGINEER PROPOSAL: not in Figma (the design only shows the
 * signed-out header). Built in the existing language: pill trigger, white card, pm tokens.
 * Disclosure pattern: button with aria-expanded; Escape and outside click close it and return focus.
 * Items: "Os meus álbuns" (existing route) and "Terminar sessão". It does not depend on Perfil (deferred).
 */
export default function AccountMenu({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const { busy, failed, signOut } = useSignOut(user);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const label = userLabel(user);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <div className="pm-account" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="pm-account-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="pm-account-avatar" aria-hidden="true">
          <UserIcon size={16} />
        </span>
        <span className="pm-account-name">{label}</span>
        <ChevronDownIcon size={16} />
        <span className="visually-hidden">Menu da conta</span>
      </button>

      {open && (
        <div id={menuId} className="pm-account-menu" role="group" aria-label="Conta">
          <p className="pm-account-id">
            {user.displayName && <strong>{user.displayName}</strong>}
            {user.email && <span>{user.email}</span>}
          </p>
          <Link className="pm-account-item" to="/Albums" onClick={() => setOpen(false)}>
            Os meus álbuns
          </Link>
          <button type="button" className="pm-account-item" onClick={signOut} disabled={busy}>
            {busy ? "A terminar sessão..." : "Terminar sessão"}
          </button>
          {failed && (
            <p className="pm-account-error" role="alert">
              Não foi possível terminar a sessão. Tenta novamente.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
