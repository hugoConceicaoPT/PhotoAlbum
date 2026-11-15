import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AlbumCard from "../components/AlbumCard";
import { AlbumSkeletons, StatePanel } from "../components/AlbumStates";
import MobileTopBar from "../components/MobileTopBar";
import Navbar from "../components/Navbar";
import ResponsiveText from "../components/ResponsiveText";
import TabBar from "../components/TabBar";
import { ChevronDownIcon, PlusIcon, SearchIcon } from "../components/icons";
import { useCurrentUser } from "../auth/session";
import { ApiError } from "../lib/apiClient";
import { WorkerAlbum } from "../Album";
import { WorkerCollection } from "../Collection";
import { WorkerImage } from "../Image";
import {
  albumsFoundMessage,
  albumsSubtitle,
  filterAlbumsByName,
  sortMostRecent,
  type AlbumSummary,
} from "../lib/albums";
import { loadAlbumSummaries, type AlbumSources } from "../lib/loadAlbums";

const workerAlbum = new WorkerAlbum();
const workerCollection = new WorkerCollection();
const workerImage = new WorkerImage();

const sources: AlbumSources = {
  // GET /albums: the backend derives the owner from the access token (no user id is sent).
  getAlbums: () => workerAlbum.getMyAlbums(),
  getCollectionIds: async (albumId) =>
    (await workerCollection.getCollectionsByAlbumId(albumId)).map((c) => c.id),
  getImageUrls: async (collectionId) =>
    (await workerImage.getImagesByCollection(collectionId)).map((img) => img.image_url),
};

type Status = "loading" | "error" | "ready";

const PLACEHOLDER_PROPS = {
  "aria-disabled": true,
  title: "Brevemente",
  onClick: (e: { preventDefault: () => void }) => e.preventDefault(),
} as const;

export default function Album() {
  const [albums, setAlbums] = useState<AlbumSummary[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [attempt, setAttempt] = useState(0);
  const [term, setTerm] = useState("");
  const user = useCurrentUser();
  const navigate = useNavigate();
  // Only used to reload when the signed-in account changes; the API call itself carries no user id.
  const userId = user?.id;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadAlbumSummaries(sources);
        if (cancelled) return;
        setAlbums(sortMostRecent(data));
        setStatus("ready");
      } catch (error) {
        // Session expired or rejected: back to Login. Otherwise details go to the console only.
        if (error instanceof ApiError && error.status === 401) {
          if (!cancelled) navigate("/login", { replace: true });
          return;
        }
        console.error("Failed to load albums", error);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, attempt, navigate]);

  const visible = useMemo(() => filterAlbumsByName(albums, term), [albums, term]);
  const searching = term.trim() !== "";
  const noResults = status === "ready" && searching && visible.length === 0;
  const isEmpty = status === "ready" && !searching && albums.length === 0;

  const retry = () => {
    setStatus("loading");
    setAttempt((n) => n + 1);
  };

  let liveMessage = "";
  if (status === "loading") liveMessage = "A carregar álbuns...";
  else if (status === "ready" && searching) liveMessage = albumsFoundMessage(visible.length);

  return (
    <>
      <Navbar hideOnMobile />
      {/* Mobile Álbuns has no header in the design; signed-in account control is an engineer proposal. */}
      <MobileTopBar />
      <main className="pm-wrap pm-albums">
        <div className="pm-page-head">
          <div>
            <h1 className="pm-page-title">Álbuns</h1>
            <p className="pm-page-sub">
              {status === "loading" ? (
                "A carregar..."
              ) : status === "error" ? (
                "Álbuns indisponíveis"
              ) : (
                <ResponsiveText
                  desktop={albumsSubtitle(visible.length)}
                  mobile={albumsSubtitle(visible.length, true)}
                />
              )}
            </p>
          </div>

          <div className="pm-toolbar">
            <label className="pm-field pm-search">
              <span className="visually-hidden">Pesquisar álbuns</span>
              <SearchIcon size={18} />
              <input
                type="search"
                placeholder="Pesquisar álbuns"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                disabled={status !== "ready"}
                autoComplete="off"
              />
            </label>

            <label className="pm-field pm-select d-none d-lg-flex">
              <span className="visually-hidden">Ordenar álbuns</span>
              {/* Only "Mais recentes" is designed; other options are an open question. */}
              <select defaultValue="recent">
                <option value="recent">Mais recentes</option>
              </select>
              <ChevronDownIcon size={18} />
            </label>

            {/* Placeholder: album creation is not implemented. */}
            <button
              type="button"
              className="pm-btn pm-btn-teal d-none d-lg-inline-flex"
              {...PLACEHOLDER_PROPS}
            >
              + Adicionar álbum
            </button>
          </div>
        </div>

        <p className="visually-hidden" role="status">
          {liveMessage}
        </p>

        {status === "error" && (
          <StatePanel
            role="alert"
            title="Não foi possível carregar os teus álbuns."
            text="Tenta novamente daqui a pouco."
            actionLabel="Tentar novamente"
            onAction={retry}
          />
        )}

        {noResults && (
          <StatePanel
            role="status"
            title={`Nenhum álbum encontrado para “${term.trim()}”`}
            text="Verifica a pesquisa ou limpa-a para ver todos os álbuns."
            actionLabel="Limpar pesquisa"
            onAction={() => setTerm("")}
          />
        )}

        {isEmpty && (
          <StatePanel
            title="Ainda não tens álbuns"
            text="Cria o primeiro para começares a guardar as tuas memórias."
          />
        )}

        {status !== "error" && !noResults && (
          <ul className="pm-album-grid list-unstyled" aria-busy={status === "loading"} aria-label="Os teus álbuns">
            {status === "loading" ? (
              <AlbumSkeletons count={4} />
            ) : (
              <>
                {visible.map((album) => (
                  <li key={album.id}>
                    <AlbumCard album={album} />
                  </li>
                ))}
                <li>
                  {/* Placeholder: album creation is not implemented. */}
                  <button type="button" className="pm-new-tile" {...PLACEHOLDER_PROPS}>
                    <span className="pm-new-tile-plus">
                      <PlusIcon size={24} />
                    </span>
                    <span className="pm-new-tile-label">Novo álbum</span>
                  </button>
                </li>
              </>
            )}
          </ul>
        )}
      </main>

      {/* Placeholder FAB (mobile): album creation is not implemented. */}
      <button
        type="button"
        className="pm-fab d-lg-none"
        aria-label="Adicionar álbum"
        {...PLACEHOLDER_PROPS}
      >
        <PlusIcon size={26} />
      </button>
      <TabBar />
    </>
  );
}
