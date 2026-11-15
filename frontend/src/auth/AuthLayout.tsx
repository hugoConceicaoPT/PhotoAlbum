import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import Logo from "../components/Logo";
import Navbar from "../components/Navbar";
import { ChevronLeftIcon } from "../components/icons";

/**
 * Login/Registar shell.
 * - Desktop (lg and up, 1280 px design): header, form column on the left, amber panel with the
 *   album-spread mock and the caption on the right.
 * - Mobile (390 px design, frames 9:124 and 9:157): a bar with a back chevron and the logo (no main
 *   navigation, no amber panel), then the full-width single-column form.
 * The back chevron goes to Home: the design does not say where it leads (open owner question).
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar hideOnMobile />
      <header className="pm-auth-top d-lg-none">
        <Link to="/" className="pm-back" aria-label="Voltar">
          <ChevronLeftIcon size={24} />
        </Link>
        <Logo />
      </header>
      <main className="pm-auth">
        <div className="pm-auth-col">{children}</div>
        <aside className="pm-auth-panel d-none d-lg-flex" aria-hidden="true">
          <div className="pm-mock">
            <div className="pm-mock-thumbs">
              <span className="pm-grad-sunset" />
              <span className="pm-grad-ocean" />
              <span className="pm-grad-dusk" />
            </div>
            <div className="pm-mock-page">
              <span className="pm-grad-candy" />
              <p>Verão em Lisboa</p>
            </div>
          </div>
          <p className="pm-auth-caption">As tuas memórias, sempre à mão.</p>
        </aside>
      </main>
    </>
  );
}
