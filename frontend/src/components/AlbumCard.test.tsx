import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import AlbumCard from "./AlbumCard";

describe("AlbumCard", () => {
  it("shows the album name as an h2 and a singular photo count", () => {
    render(<AlbumCard album={{ id: 1, name: "Férias", images: ["a.jpg"] }} />);
    expect(screen.getByRole("heading", { level: 2, name: "Férias" })).toBeInTheDocument();
    expect(screen.getByText("1 foto")).toBeInTheDocument();
  });

  it("pluralises the photo count and shows 0 for an empty album", () => {
    const { rerender } = render(<AlbumCard album={{ id: 1, name: "A", images: ["a", "b", "c"] }} />);
    expect(screen.getByText("3 fotos")).toBeInTheDocument();
    rerender(<AlbumCard album={{ id: 1, name: "A", images: [] }} />);
    expect(screen.getByText("0 fotos")).toBeInTheDocument();
  });

  it("renders one decorative image per available photo (max 4) and fills the rest", () => {
    const { container } = render(
      <AlbumCard album={{ id: 1, name: "A", images: ["1", "2", "3", "4", "5"] }} />,
    );
    expect(container.querySelectorAll("img")).toHaveLength(4);
    expect(container.querySelector(".pm-mosaic")).toHaveAttribute("aria-hidden", "true");

    const sparse = render(<AlbumCard album={{ id: 2, name: "B", images: ["1"] }} />);
    expect(sparse.container.querySelectorAll("img")).toHaveLength(1);
    expect(sparse.container.querySelectorAll(".pm-mosaic-empty")).toHaveLength(3);
  });

  it("keeps the edit button as an accessible, disabled placeholder", () => {
    render(<AlbumCard album={{ id: 1, name: "Férias", images: [] }} />);
    const edit = screen.getByRole("button", { name: "Editar álbum Férias" });
    expect(edit).toHaveAttribute("aria-disabled", "true");
    expect(edit).toHaveAttribute("title", "Brevemente");
  });
});
