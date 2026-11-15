import { Link } from "react-router-dom";

export default function Logo() {
  return (
    <Link to="/" className="pm-logo" aria-label="PhotoMemory, página inicial">
      <span className="pm-logo-mark" aria-hidden="true" />
      <span className="pm-logo-text">PhotoMemory</span>
    </Link>
  );
}
