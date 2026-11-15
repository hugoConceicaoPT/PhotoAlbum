import { useCurrentUser } from "../auth/session";
import Logo from "./Logo";
import MobileAccount from "./MobileAccount";

/**
 * Compact signed-in top bar for mobile pages whose design has no header (Álbuns). ENGINEER PROPOSAL:
 * not in Figma. Logo on the left, account avatar on the right. Hidden from lg up (the desktop header is used).
 */
export default function MobileTopBar() {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <header className="pm-topbar d-lg-none">
      <Logo />
      <MobileAccount user={user} />
    </header>
  );
}
