import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ApiError } from "../lib/apiClient";
import { renderAt } from "../test/renderWithRouter";
import { makeUser, session } from "../test/sessionMock";
import Album from "./Album";

const api = vi.hoisted(() => ({
  getAlbums: vi.fn(),
  getCollections: vi.fn(),
  getImages: vi.fn(),
}));

vi.mock("../stack", async () => (await import("../test/stackMock")).stackMock);
vi.mock("../auth/session", async () => (await import("../test/sessionMock")).sessionMock);
vi.mock("../Album", () => ({
  WorkerAlbum: class {
    getMyAlbums = api.getAlbums;
  },
}));
vi.mock("../Collection", () => ({
  WorkerCollection: class {
    getCollectionsByAlbumId = api.getCollections;
  },
}));
vi.mock("../Image", () => ({
  WorkerImage: class {
    getImagesByCollection = api.getImages;
  },
}));

const ALBUMS = [
  { id: 1, name: "Férias", user_id: "1" },
  { id: 2, name: "Casamento", user_id: "1" },
  { id: 3, name: "Gym", user_id: "1" },
];

function resolveAlbums(list: unknown[] = ALBUMS) {
  api.getAlbums.mockResolvedValue(list);
  api.getCollections.mockResolvedValue([{ id: 10 }]);
  api.getImages.mockResolvedValue([{ image_url: "a.jpg" }, { image_url: "b.jpg" }]);
}

const albumTitles = () => screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);

describe("Album page", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    session.user = null;
  });

  it("mobile has no designed header, so a signed-in top bar offers the account control (engineer proposal)", () => {
    session.user = makeUser();
    api.getAlbums.mockReturnValue(new Promise(() => {}));
    renderAt(<Album />, "/Albums");
    expect(screen.getByRole("button", { name: "Conta de Ana Silva" })).toBeInTheDocument();
    // The desktop header stays hidden below lg.
    expect(document.querySelector("header.pm-header")).toHaveClass("d-none", "d-lg-block");
  });

  it("shows the loading state first (busy list, skeletons, disabled search)", () => {
    api.getAlbums.mockReturnValue(new Promise(() => {}));
    renderAt(<Album />, "/Albums");
    expect(screen.getByRole("heading", { level: 1, name: "Álbuns" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Os teus álbuns" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("searchbox", { name: "Pesquisar álbuns" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("A carregar álbuns...");
  });

  it("lists albums most recent first with counts, and the Novo álbum placeholder", async () => {
    resolveAlbums();
    renderAt(<Album />, "/Albums");
    expect(await screen.findByRole("heading", { level: 2, name: "Gym" })).toBeInTheDocument();
    expect(albumTitles()).toEqual(["Gym", "Casamento", "Férias"]);
    expect(screen.getAllByText("2 fotos")).toHaveLength(3);
    expect(screen.getByText("3 álbuns · ordenados por mais recentes")).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Os teus álbuns" })).toHaveAttribute("aria-busy", "false");
    expect(screen.getByRole("button", { name: "Novo álbum" })).toHaveAttribute("aria-disabled", "true");
  });

  it("keeps the add controls as aria-disabled placeholders", async () => {
    resolveAlbums();
    renderAt(<Album />, "/Albums");
    await screen.findByText("Gym");
    expect(screen.getByRole("button", { name: "+ Adicionar álbum" })).toHaveAttribute("aria-disabled", "true");
    const fab = screen.getByRole("button", { name: "Adicionar álbum" });
    expect(fab).toHaveAttribute("aria-disabled", "true");
    expect(fab).toHaveAttribute("title", "Brevemente");
  });

  it("shows the empty state when the user has no albums", async () => {
    resolveAlbums([]);
    renderAt(<Album />, "/Albums");
    expect(await screen.findByRole("heading", { name: "Ainda não tens álbuns" })).toBeInTheDocument();
    expect(screen.getByText("0 álbuns · ordenados por mais recentes")).toBeInTheDocument();
  });

  it("shows an alert on failure and recovers through Tentar novamente", async () => {
    api.getAlbums.mockRejectedValueOnce(new Error("boom"));
    renderAt(<Album />, "/Albums");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Não foi possível carregar os teus álbuns.");
    expect(screen.queryByRole("list", { name: "Os teus álbuns" })).not.toBeInTheDocument();
    // Internal details are not leaked to the UI.
    expect(alert).not.toHaveTextContent("boom");

    resolveAlbums();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { level: 2, name: "Gym" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(api.getAlbums).toHaveBeenCalledTimes(2);
  });

  it("filters by name ignoring case and accents and announces the count", async () => {
    resolveAlbums();
    renderAt(<Album />, "/Albums");
    await screen.findByText("Gym");
    fireEvent.change(screen.getByRole("searchbox", { name: "Pesquisar álbuns" }), {
      target: { value: "FERIAS" },
    });
    expect(albumTitles()).toEqual(["Férias"]);
    // Singular live-region text (QA finding F1).
    expect(screen.getByText("1 álbum encontrado")).toBeInTheDocument();
    expect(screen.queryByText(/1 álbuns/)).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "a" } });
    expect(screen.getByText("2 álbuns encontrados")).toBeInTheDocument();
  });

  it("shows the no-results state and clears the search", async () => {
    resolveAlbums();
    renderAt(<Album />, "/Albums");
    await screen.findByText("Gym");
    const search = screen.getByRole("searchbox", { name: "Pesquisar álbuns" });
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByRole("heading", { name: "Nenhum álbum encontrado para “zzz”" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Os teus álbuns" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Limpar pesquisa" }));
    await waitFor(() => expect(albumTitles()).toContain("Gym"));
    expect(search).toHaveValue("");
  });

  it("loads the signed-in user's albums without sending any user id", async () => {
    resolveAlbums();
    renderAt(<Album />, "/Albums");
    await screen.findByText("Gym");
    expect(api.getAlbums).toHaveBeenCalledWith();
  });

  it("sends the user back to /login when the API answers 401", async () => {
    api.getAlbums.mockRejectedValue(new ApiError(401));
    render(
      <MemoryRouter initialEntries={["/Albums"]}>
        <Routes>
          <Route path="/Albums" element={<Album />} />
          <Route path="/login" element={<p>Ecrã de login</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText("Ecrã de login")).toBeInTheDocument();
  });

  it("still lists an album whose images fail to load", async () => {
    api.getAlbums.mockResolvedValue([ALBUMS[0]]);
    api.getCollections.mockResolvedValue([{ id: 10 }]);
    api.getImages.mockRejectedValue(new Error("img"));
    renderAt(<Album />, "/Albums");
    expect(await screen.findByRole("heading", { level: 2, name: "Férias" })).toBeInTheDocument();
    expect(screen.getByText("0 fotos")).toBeInTheDocument();
  });
});
