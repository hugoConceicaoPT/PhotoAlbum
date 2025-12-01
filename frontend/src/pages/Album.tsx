import AlbumCard from "../components/AlbumCard";
import Navbar from "../components/Navbar";

export default function Album() {
    return (
        <>
            <Navbar />
            <div className="container mt-5">
                <div className="d-flex justify-content-between align-items-center mb-0">
                    <h2 className="AlbumHeading ms-4 mb-0">Álbuns</h2>
                    <div className="d-flex align-items-center mb-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#283618" className="bi bi-plus-circle me-2 mt-1" viewBox="0 0 16 16">
                            <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
                        </svg>
                        <p className="mb-0 addAlbum me-4">Adicionar Álbum</p>
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#283618" className="bi bi-filter me-1 mt-1" viewBox="0 0 16 16">
                            <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5m-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5" />
                        </svg>
                        <p className="mb-0 mostRecents me-4">Mais Recentes</p>
                    </div>
                </div>
                <hr className="divisorAlbum mt-2" />
                <AlbumCard />
            </div>
        </>
    )
}