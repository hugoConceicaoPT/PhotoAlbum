import { NavLink } from "react-router-dom";
import { FolderIcon, HomeIcon, ImageIcon, UserIcon } from "./icons";

/** Mobile bottom tab bar (Álbuns design). Coleções and Perfil have no screen yet: disabled placeholders. */
export default function TabBar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `pm-tab${isActive ? " is-active" : ""}`;

  return (
    <nav className="pm-tabbar d-lg-none" aria-label="Navegação principal">
      <NavLink to="/" end className={linkClass}>
        <HomeIcon size={22} />
        <span>Início</span>
      </NavLink>
      <NavLink to="/Albums" className={linkClass}>
        <ImageIcon size={22} />
        <span>Álbuns</span>
      </NavLink>
      <span className="pm-tab is-disabled" aria-disabled="true" title="Brevemente">
        <FolderIcon size={22} />
        <span>Coleções</span>
      </span>
      <span className="pm-tab is-disabled" aria-disabled="true" title="Brevemente">
        <UserIcon size={22} />
        <span>Perfil</span>
      </span>
    </nav>
  );
}
