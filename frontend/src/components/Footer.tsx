import Logo from "./Logo";

// Link targets are undefined in the design: labels are rendered as plain text
// (placeholders) except "Funcionalidades", which scrolls to the features section.
// `mobileHidden` items are omitted in the 390 px design.
interface FooterItem {
  label: string;
  mobileHidden?: boolean;
  href?: string;
}

const COLUMNS: { title: string; items: FooterItem[] }[] = [
  {
    title: "Produto",
    items: [
      { label: "Funcionalidades", href: "#funcionalidades" },
      { label: "Preços" },
      { label: "Visita guiada", mobileHidden: true },
    ],
  },
  {
    title: "Empresa",
    items: [{ label: "Sobre nós" }, { label: "Blog" }, { label: "Contactos", mobileHidden: true }],
  },
  {
    title: "Legal",
    items: [{ label: "Privacidade" }, { label: "Termos" }, { label: "Ajuda", mobileHidden: true }],
  },
];

export default function Footer() {
  return (
    <footer className="pm-footer">
      <div className="pm-wrap pm-wrap-nav pm-footer-inner">
        <div className="pm-footer-brand d-none d-lg-block">
          <Logo />
          <p className="pm-footer-tagline">Guarda e revive as tuas memórias.</p>
        </div>
        <div className="pm-footer-cols">
          {COLUMNS.map((col) => (
            <div key={col.title} className="pm-footer-col">
              <h2 className="pm-footer-title">{col.title}</h2>
              <ul className="list-unstyled m-0">
                {col.items.map((item) => (
                  <li key={item.label} className={item.mobileHidden ? "d-none d-lg-block" : undefined}>
                    {item.href ? (
                      <a className="pm-footer-link" href={item.href}>
                        {item.label}
                      </a>
                    ) : (
                      <span className="pm-footer-link">{item.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
}
