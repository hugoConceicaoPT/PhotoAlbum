export default function Navbar() {
    return (
        <>
            <nav className="navbar navbar-expand-lg pt-5" style= {{ backgroundColor: "#FDF6EC"}} data-bs-theme="light">
                <div className="container-fluid ms-5">
                    <a className="navbar-brand" href="#">PhotoMemory</a>

                    <button
                        className="navbar-toggler"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target="#navbarNav"
                        aria-controls="navbarNav"
                        aria-expanded="false"
                        aria-label="Toggle navigation"
                    >
                        <span className="navbar-toggler-icon"></span>
                    </button>

                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav center-links">
                            <li className="nav-item mx-2">
                                <a className="nav-link" aria-current="page" href="#">Álbuns de Fotos</a>
                            </li>
                            <li className="nav-item mx-2">
                                <a className="nav-link" href="#">Coleções</a>
                            </li>
                        </ul>

                        <ul className="navbar-nav right-links me-4" style={{ zIndex: 1}}>
                            <li className="nav-item mx-2">
                                <a className="nav-link" href="#">Entrar</a>
                            </li>
                            <li className="nav-item mx-2">
                                <button type="button" className="btn btn-primary btn-register px-3 rounded-pill">Registar</button>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </>
    );
}
