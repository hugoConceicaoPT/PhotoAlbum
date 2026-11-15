import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router-dom";
import type { SessionUser } from "../auth/session";
import { useSignOut } from "../auth/useSignOut";
import { userLabel } from "../auth/userLabel";
import { UserIcon } from "./icons";

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Mobile account control (below lg). ENGINEER PROPOSAL: not in Figma, which shows no signed-in mobile
 * header. An avatar button (44 px target) opens a bottom sheet with the account details, "Os meus álbuns"
 * and "Terminar sessão". Modal dialog behaviour: focus moves into the sheet, Tab is trapped, Escape and a
 * tap on the backdrop close it, and focus returns to the avatar button. It does not depend on Perfil (deferred).
 */
export default function MobileAccount({ user }: { user: SessionUser }) {
  const [open, setOpen] = useState(false);
  const { busy, failed, signOut } = useSignOut(user);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const sheetId = useId();
  const titleId = useId();
  const label = userLabel(user);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (open) sheetRef.current?.focus();
  }, [open]);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== "Tab") return;
    const items = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && (active === first || active === sheetRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="pm-mobile-account d-lg-none">
      <button
        ref={triggerRef}
        type="button"
        className="pm-avatar-btn"
        aria-label={`Conta de ${label}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={sheetId}
        onClick={() => setOpen(true)}
      >
        <UserIcon size={20} />
      </button>

      {open && (
        <>
          <div className="pm-sheet-backdrop" data-testid="account-backdrop" onClick={close} />
          <div
            id={sheetId}
            ref={sheetRef}
            className="pm-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={onKeyDown}
          >
            <h2 id={titleId} className="pm-sheet-title">
              A tua conta
            </h2>
            <p className="pm-account-id">
              {user.displayName && <strong>{user.displayName}</strong>}
              {user.email && <span>{user.email}</span>}
            </p>
            <Link className="pm-account-item pm-sheet-item" to="/Albums" onClick={() => setOpen(false)}>
              Os meus álbuns
            </Link>
            <button type="button" className="pm-account-item pm-sheet-item" onClick={signOut} disabled={busy}>
              {busy ? "A terminar sessão..." : "Terminar sessão"}
            </button>
            {failed && (
              <p className="pm-account-error" role="alert">
                Não foi possível terminar a sessão. Tenta novamente.
              </p>
            )}
            <button type="button" className="pm-btn pm-btn-outline pm-btn-block" onClick={close}>
              Fechar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
