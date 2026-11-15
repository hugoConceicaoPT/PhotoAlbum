import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { stackClientApp } from "../stack";
import { useCurrentUser } from "../auth/session";
import AccountMenu from "./AccountMenu";
import MobileAccount from "./MobileAccount";
import Logo from "./Logo";
import { MenuIcon } from "./icons";

interface NavbarProps {
  /** Hide the header below lg (the Álbuns mobile design uses a bottom tab bar instead). */
  hideOnMobile?: boolean;
}

export default function Navbar({ hideOnMobile = false }: NavbarProps) {
  const user = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const togglerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // The menu is Bootstrap collapse markup. Mirror its real state (events fire when a show/hide starts) so
  // aria-expanded is always right, and never let focus fall to <body> when the menu closes around it.
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const onShow = (e: Event) => {
      if (e.target === menu) setMenuOpen(true);
    };
    const onHide = (e: Event) => {
      if (e.target !== menu) return;
      setMenuOpen(false);
      if (menu.contains(document.activeElement)) togglerRef.current?.focus();
    };
    menu.addEventListener("show.bs.collapse", onShow);
    menu.addEventListener("hide.bs.collapse", onHide);
    return () => {
      menu.removeEventListener("show.bs.collapse", onShow);
      menu.removeEventListener("hide.bs.collapse", onHide);
    };
  }, []);

  // Escape closes the open menu. Closing goes through the toggler so Bootstrap runs its normal hide
  // (the hide handler above returns focus to the toggler when it was inside the menu).
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) togglerRef.current?.click();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `pm-nav-link${isActive ? " is-active" : ""}`;

  return (
    <header className={`pm-header${user ? " is-signed-in" : ""}${hideOnMobile ? " d-none d-lg-block" : ""}`}>
      <nav className="navbar navbar-expand-lg pm-nav" aria-label="Principal">
        <div className="pm-wrap pm-wrap-nav d-flex flex-wrap align-items-center">
          <Logo />

          {/* Mobile account control (engineer proposal, not in Figma): avatar in the header bar. */}
          {user && !hideOnMobile && <MobileAccount user={user} />}

          <button
            className="navbar-toggler pm-nav-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#pm-navbar"
            aria-controls="pm-navbar"
            aria-expanded={menuOpen}
            aria-label="Abrir menu"
            ref={togglerRef}
          >
            <MenuIcon />
          </button>

          <div className="collapse navbar-collapse" id="pm-navbar" ref={menuRef}>
            <ul className="navbar-nav pm-nav-center">
              <li className="nav-item">
                <NavLink to="/" end className={linkClass}>
                  Início
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/Albums" className={linkClass}>
                  Álbuns de Fotos
                </NavLink>
              </li>
              <li className="nav-item">
                {/* Coleções screen is not implemented yet: placeholder, not a link. */}
                <span className="pm-nav-link is-disabled" aria-disabled="true" title="Brevemente">
                  Coleções
                </span>
              </li>
            </ul>

            <div className="pm-nav-actions">
              {user ? (
                // Signed-in header (engineer proposal, not in Figma): account menu instead of Entrar/Registar.
                // Desktop only: below lg the avatar button in the header bar opens the account sheet.
                <div className="d-none d-lg-block">
                  <AccountMenu user={user} />
                </div>
              ) : (
                <>
                  <Link className="pm-btn pm-btn-outline" to={stackClientApp.urls.signIn}>
                    Entrar
                  </Link>
                  <Link className="pm-btn pm-btn-navy" to={stackClientApp.urls.signUp}>
                    Registar
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
