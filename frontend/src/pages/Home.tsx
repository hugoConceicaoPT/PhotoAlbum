import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { stackClientApp } from "../stack";
import { useCurrentUser } from "../auth/session";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import ResponsiveText from "../components/ResponsiveText";
import { GridIcon, ImageIcon, MoveIcon } from "../components/icons";

interface Feature {
  title: string;
  desktop: string;
  mobile: string;
  icon: ReactNode;
  tone: "teal" | "orange" | "lavender";
}

// Copy differs between the desktop and mobile designs.
const FEATURES: Feature[] = [
  {
    title: "Álbuns automáticos",
    desktop: "Os teus álbuns são criados automaticamente com base nas coleções que adicionas.",
    mobile: "Criados a partir das coleções que adicionas.",
    icon: <GridIcon size={20} />,
    tone: "teal",
  },
  {
    title: "Arrastar & largar",
    desktop: "Editar os teus álbuns é simples e intuitivo. Arrasta e larga fotos para mudar o layout.",
    mobile: "Muda o layout das páginas com um toque.",
    icon: <MoveIcon size={20} />,
    tone: "orange",
  },
  {
    title: "Folhear como um livro",
    desktop: "Vê o teu álbum em página dupla e partilha-o com quem quiseres.",
    mobile: "Desliza para virar a página e partilha.",
    icon: <ImageIcon size={20} />,
    tone: "lavender",
  },
];

export default function Home() {
  const user = useCurrentUser();
  return (
    <>
      <Navbar />
      <main>
        <section className="pm-wrap pm-hero" aria-labelledby="hero-title">
          <div className="pm-hero-copy">
            <p className="pm-eyebrow">Álbuns de fotos digitais</p>
            <h1 id="hero-title" className="pm-hero-title">
              Organiza as tuas memórias com facilidade
            </h1>
            <p className="pm-lead">
              <ResponsiveText
                desktop="Junta as tuas fotos em coleções e deixa o PhotoMemory transformá-las em álbuns bonitos, prontos a folhear."
                mobile="Junta as tuas fotos em coleções e deixa o PhotoMemory criar álbuns prontos a folhear."
              />
            </p>
            <div className="pm-hero-actions">
              <Link to="/Albums" className="pm-btn pm-btn-navy pm-btn-lg">
                Cria o teu álbum de fotos
              </Link>
              {/* "Ver como funciona" has no defined target: scrolls to the features section. */}
              <a href="#funcionalidades" className="pm-btn pm-btn-outline pm-btn-lg d-none d-lg-inline-flex">
                Ver como funciona
              </a>
              {/* On mobile the header hides Entrar, so the design repeats it here. */}
              {!user && (
                <Link to={stackClientApp.urls.signIn} className="pm-btn pm-btn-outline pm-btn-lg d-lg-none">
                  Entrar
                </Link>
              )}
            </div>
          </div>

          <div className="pm-hero-visual" aria-hidden="true">
            <div className="pm-hero-panel">
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
              <span className="pm-mock-pill d-none d-lg-inline-block">Álbum criado automaticamente</span>
            </div>
          </div>
        </section>

        <section id="funcionalidades" className="pm-wrap pm-features" aria-label="Funcionalidades">
          {FEATURES.map((f) => (
            <article key={f.title} className="pm-feature">
              <span className={`pm-feature-icon is-${f.tone}`} aria-hidden="true">
                {f.icon}
              </span>
              <div>
                <h2 className="pm-feature-title">{f.title}</h2>
                <p className="pm-feature-text">
                  <ResponsiveText desktop={f.desktop} mobile={f.mobile} />
                </p>
              </div>
            </article>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
